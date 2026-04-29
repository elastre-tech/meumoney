import type { ParsedMessage } from '@/lib/whatsapp/receive'
import { parseTextMessage, convertTextToNumber, extractAmountFromText } from '../text-handler'
import { validateTransaction } from '../validator'
import { sendWhatsAppMessage } from '@/lib/whatsapp/send-message'
import { createAdminClient } from '@/lib/supabase/admin'
import { classifyMessage } from '@/lib/ai/classify'
import { ERROR_MESSAGES } from '@/lib/utils/constants'
import { normalizeText } from '@/lib/utils/categories'
import { maskId, saveAndConfirmTransaction } from './utils'
import {
  handleAjuda,
  handleDashboard,
  handleResumo,
  handleCategorias,
  handleCancelar,
  handleCancelarById,
  handleEditar,
  handleEditarById,
  handleExportar,
  handleExcluirDados,
  handleReportar,
  handleBugReportDetail,
} from './commands'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const FATURA_INQUIRY_PHRASES = new Set<string>([
  'fatura',
  'fatura do cartao',
  'fatura cartao',
  'fatura do cartao de credito',
  'paguei a fatura',
  'paguei fatura',
  'paguei a fatura do cartao',
  'paguei fatura do cartao',
  'paguei a fatura do cartao de credito',
  'paguei fatura do cartao de credito',
  'minha fatura',
])

const CARTAO_INQUIRY_PHRASES = new Set<string>([
  'cartao',
  'cartao de credito',
  'meu cartao',
  'meu cartao de credito',
  'o cartao',
])

// Padrões já considerando que normalizeText remove acentos e baixa caixa.
// "Aberturas" são as saudações cabeça (oi, ola, bom dia...).
// "Extensões" são complementos tipo "tudo bem", "tudo joia".
const GREETING_OPENER = '(?:oi+e?|ol[ae]|opa+|hi+|hello|hey|salve|e ai|eai|bom dia|boa tarde|boa noite)'
const GREETING_EXTENSION = '(?:tudo bem|tudo bom|tudo certo|tudo joia|td bem|td bom)'
// Aceita: "oi", "oi tudo bem", "tudo bem" sozinho. Permite vírgula/exclamação
// entre as partes e pontuação no fim. Anchored.
const GREETING_RE = new RegExp(
  `^(?:${GREETING_OPENER}(?:[\\s,!.?]+${GREETING_EXTENSION})?|${GREETING_EXTENSION})[!.?]*$`
)
// Verbos transacionais — se aparecem, não é só saudação, é registro.
const TRANSACTION_VERBS_RE = /\b(?:gastei|paguei|comprei|pago|recebi|ganhei|entrou|caiu|tirei|saiu)\b/

/**
 * Detect a generic greeting that has no transactional content.
 * Returns 'with_question' when the user appended "tudo bem"/etc (so the response can
 * acknowledge the question), 'simple' for plain greetings, or null when not a greeting.
 * Rejects messages with digits or transaction verbs ("oi gastei 50" → null).
 */
export function detectGreeting(text: string): 'simple' | 'with_question' | null {
  const normalized = normalizeText(text).trim()
  if (!normalized) return null
  if (/\d/.test(normalized)) return null
  if (TRANSACTION_VERBS_RE.test(normalized)) return null
  if (!GREETING_RE.test(normalized)) return null
  return /tudo (?:bem|bom|certo|joia)|td (?:bem|bom)/.test(normalized) ? 'with_question' : 'simple'
}

const HELP_INQUIRY_PHRASES = new Set<string>([
  'duvida', 'duvidas', 'tutorial', 'tutoriais',
  'como funciona', 'como usar', 'como uso',
])

const ERROR_INQUIRY_PHRASES = new Set<string>([
  'erro',
  'deu erro',
  'da erro',
  'esta dando erro',
  'estou com erro',
  'to com erro',
  'estou com problema',
  'to com problema',
  'tem problema',
  'nao funciona',
  'nao ta funcionando',
  'nao esta funcionando',
])

/**
 * Detect a generic help inquiry (e.g. "duvida", "tutorial", "como funciona").
 * Match must be EXACT — these route to handleAjuda.
 */
export function detectHelpInquiry(text: string): boolean {
  const normalized = normalizeText(text).trim()
  if (!normalized) return false
  return HELP_INQUIRY_PHRASES.has(normalized)
}

/**
 * Detect when user is reporting that something doesn't work without using the
 * formal "reportar"/"bug"/"problema" command. Used to surface the tutorial link
 * + suggest the formal report flow.
 */
export function detectErrorInquiry(text: string): boolean {
  const normalized = normalizeText(text).trim()
  if (!normalized) return false
  return ERROR_INQUIRY_PHRASES.has(normalized)
}

/**
 * Append the tutorial URL line to a message body, if NEXT_PUBLIC_TUTORIAL_URL is set.
 * Returns the original text unchanged when the env var is missing.
 */
function withTutorialHint(body: string): string {
  const url = process.env.NEXT_PUBLIC_TUTORIAL_URL
  if (!url) return body
  return `${body}\n\n📚 Tem dúvida? Confere o tutorial: ${url}`
}

/**
 * Detect generic inquiries about cartão/fatura with no transactional context
 * (no value, no description). Match must be EXACT against the normalized text —
 * substrings like "gastei 50 no cartão" or "cartão de débito" do not match.
 */
export function detectCartaoFaturaInquiry(text: string): 'cartao' | 'fatura' | null {
  const normalized = normalizeText(text).trim()
  if (!normalized) return null
  if (FATURA_INQUIRY_PHRASES.has(normalized)) return 'fatura'
  if (CARTAO_INQUIRY_PHRASES.has(normalized)) return 'cartao'
  return null
}

function isLastBatchPending(p: unknown): p is { kind: 'last_batch'; ids: string[] } {
  return !!p
    && typeof p === 'object'
    && (p as { kind?: unknown }).kind === 'last_batch'
    && Array.isArray((p as { ids?: unknown }).ids)
}

const PENDING_REPORT_MAX_AGE_MS = 24 * 60 * 60 * 1000

function isPendingReport(p: unknown): p is { kind: 'pending_report'; report_id: string; created_at: string } {
  if (!p || typeof p !== 'object') return false
  const obj = p as { kind?: unknown; report_id?: unknown; created_at?: unknown }
  if (obj.kind !== 'pending_report') return false
  if (typeof obj.report_id !== 'string' || typeof obj.created_at !== 'string') return false
  const age = Date.now() - new Date(obj.created_at).getTime()
  if (!Number.isFinite(age) || age < 0 || age > PENDING_REPORT_MAX_AGE_MS) return false
  return true
}

// Comandos exatos que NUNCA viram detalhe de bug — se a usuária digitar um
// destes em estado pending_report, o pending é limpo e o comando é processado normal.
const PENDING_REPORT_SKIP_COMMANDS = new Set<string>([
  'editar', 'cancelar', 'ajuda', 'menu', 'duvida', 'duvidas',
  'tutorial', 'tutoriais', 'reportar', 'bug', 'problema',
  'conta', 'minha conta', 'painel', 'dashboard',
  'relatorio', 'relatório', 'resumo', 'categorias',
  'exportar', 'excluir meus dados',
  'confirmar exclusao', 'confirmar exclusão',
])

/**
 * Resolve the transaction ids encoded in a button payload.
 * - "_pending" → read pending_transaction last_batch and clear it.
 * - "uuid1,uuid2,..." → split and validate each as a UUID.
 */
async function resolveActionIds(
  payload: string,
  userId: string,
  supabase: ReturnType<typeof createAdminClient>
): Promise<string[]> {
  if (payload === '_pending') {
    const { data: user } = await supabase
      .from('users')
      .select('pending_transaction')
      .eq('id', userId)
      .single()
    const pending = user?.pending_transaction
    if (isLastBatchPending(pending)) {
      await supabase.from('users').update({ pending_transaction: null }).eq('id', userId)
      return pending.ids.filter((id): id is string => typeof id === 'string' && UUID_REGEX.test(id))
    }
    return []
  }

  return payload
    .split(',')
    .map((s) => s.trim())
    .filter((s) => UUID_REGEX.test(s))
}

export async function handleConfirmation(to: string): Promise<void> {
  await sendWhatsAppMessage(to, `👍`)
}

export async function handleText(
  message: ParsedMessage,
  userId: string,
  userName: string | null,
  pendingTransaction: unknown
): Promise<void> {
  const supabase = createAdminClient()
  const text = message.text ?? ''
  const lower = text.toLowerCase().trim()

  if (lower === '__btn_confirm_ok__') {
    await handleConfirmation(message.from)
    return
  }

  // ID-aware buttons must dispatch before the missing-amount block, so the
  // pending_transaction last_batch isn't accidentally cleared first.
  const cancelMatch = text.match(/^__btn_cancel:(.+)__$/)
  if (cancelMatch) {
    const ids = await resolveActionIds(cancelMatch[1], userId, supabase)
    await handleCancelarById(message.from, userId, ids)
    return
  }

  const editMatch = text.match(/^__btn_edit:(.+)__$/)
  if (editMatch) {
    const ids = await resolveActionIds(editMatch[1], userId, supabase)
    await handleEditarById(message.from, userId, ids)
    return
  }

  // Pending bug report? A próxima mensagem que NÃO for comando/saudação/transação vira detalhe.
  // Tudo que tem intenção clara (transação, saudação, comando) limpa o pending e segue o fluxo normal —
  // evita capturar acidentalmente "gastei 50 no mercado" como detalhe de bug.
  if (isPendingReport(pendingTransaction)) {
    const isCommand = PENDING_REPORT_SKIP_COMMANDS.has(lower)
    const isGreetingMsg = detectGreeting(text) !== null
    const looksLikeTransaction = parseTextMessage(text) !== null

    if (isCommand || isGreetingMsg || looksLikeTransaction) {
      await supabase.from('users').update({ pending_transaction: null }).eq('id', userId)
      // segue o fluxo normal abaixo
    } else {
      await handleBugReportDetail(message.from, userId, userName, text, pendingTransaction.report_id)
      return
    }
  }

  if (lower === 'editar') {
    await handleEditar(message.from, userId)
    return
  }

  if (lower === 'reportar' || lower === 'bug' || lower === 'problema') {
    await handleReportar(message.from, userId, userName)
    return
  }

  // Skip the missing-amount flow if pending holds last_batch ids — those belong
  // to a batch confirmation still waiting on a button tap, not to this text message.
  if (pendingTransaction && typeof pendingTransaction === 'object' && !isLastBatchPending(pendingTransaction) && !isPendingReport(pendingTransaction)) {
    const pending = pendingTransaction as { type: string; description: string; category: string; source: string; date?: string }
    const processedReply = convertTextToNumber(text)
    const amountMatch = processedReply.match(/^R?\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*$/)
      || processedReply.match(/^(\d+(?:[.,]\d{2})?)\s*(?:reais|conto|real|pila)?\s*$/i)

    if (amountMatch) {
      const amount = parseFloat(amountMatch[1].replace(/\./g, '').replace(',', '.'))
      if (amount > 0) {
        await supabase.from('users').update({ pending_transaction: null }).eq('id', userId)
        await saveAndConfirmTransaction(message.from, userId, {
          type: pending.type as 'expense' | 'income',
          amount,
          description: pending.description,
          category: pending.category,
          source: (pending.source as 'text' | 'image' | 'audio') ?? 'text',
          confidence: 1.0,
          date: pending.date,
        }, userName)
        return
      }
    }

    await supabase.from('users').update({ pending_transaction: null }).eq('id', userId)
  }

  if (lower === 'ajuda' || lower === 'menu') {
    await handleAjuda(message.from)
    return
  }

  if (lower === 'conta' || lower === 'minha conta' || lower === 'dashboard' || lower === 'painel') {
    await handleDashboard(message.from)
    return
  }

  if (lower === 'relatorio' || lower === 'relatório' || lower === 'resumo') {
    await handleResumo(message.from, userId, userName)
    return
  }

  if (lower === 'categorias') {
    await handleCategorias(message.from, userId)
    return
  }

  if (lower === 'cancelar') {
    await handleCancelar(message.from, userId)
    return
  }

  if (lower === 'exportar') {
    await handleExportar(message.from, userId)
    return
  }

  if (lower === 'excluir meus dados') {
    await sendWhatsAppMessage(message.from,
      '⚠️ Tem certeza que deseja excluir TODOS os seus dados? Essa ação não pode ser desfeita.\n\nResponda "confirmar exclusão" para continuar.')
    return
  }

  if (lower === 'confirmar exclusao' || lower === 'confirmar exclusão') {
    await handleExcluirDados(message.from, userId)
    return
  }

  const cartaoInquiry = detectCartaoFaturaInquiry(text)
  if (cartaoInquiry === 'cartao') {
    await sendWhatsAppMessage(message.from,
      "💳 Pra registrar uma despesa do cartão, me diz o que foi e o valor! Exemplo: \"gastei 150 no mercado no cartão\" ou \"paguei 80 de uber no cartão\"")
    return
  }
  if (cartaoInquiry === 'fatura') {
    await sendWhatsAppMessage(message.from,
      "💳 Pra registrar a fatura, me manda o valor assim: \"paguei 1500 de fatura\". Se preferir item por item, manda cada um: \"gastei 50 no mercado e paguei no cartão\".")
    return
  }

  if (detectHelpInquiry(text)) {
    await handleAjuda(message.from)
    return
  }

  if (detectErrorInquiry(text)) {
    const body = userName
      ? `Que pena, ${userName}! 😕 Confere o tutorial pra ver se é algo que dá pra resolver. Se for um problema mesmo do bot, manda *reportar* que eu registro pra equipe.`
      : `Que pena! 😕 Confere o tutorial pra ver se é algo que dá pra resolver. Se for um problema mesmo do bot, manda *reportar* que eu registro pra equipe.`
    await sendWhatsAppMessage(message.from, withTutorialHint(body))
    return
  }

  const greetingKind = detectGreeting(text)
  if (greetingKind) {
    const hi = userName ? `Oi, ${userName}! 👋` : 'Oi! 👋'
    const opener = greetingKind === 'with_question'
      ? `${hi} Tudo ótimo por aqui, pronto pra te ajudar a registrar.`
      : hi
    await sendWhatsAppMessage(message.from,
      `${opener} Manda algo tipo "gastei 45 no mercado" ou "recebi 3500 de salário". Ou *ajuda* pra ver tudo que dá pra fazer.`)
    return
  }

  const parsed = parseTextMessage(text)

  if (parsed) {
    if (parsed.missingAmount) {
      const pendingData = {
        type: parsed.type,
        description: parsed.description,
        category: parsed.category,
        source: 'text',
        date: parsed.date ?? null,
      }
      await supabase.from('users').update({ pending_transaction: pendingData }).eq('id', userId)

      const label = parsed.type === 'income' ? 'receita' : 'gasto'
      const sent = await sendWhatsAppMessage(message.from,
        `Entendi, ${label} com *${parsed.description}* (${parsed.category}). Quanto foi?`)
      if (!sent) {
        console.error(`[FALHA ENVIO] Pergunta de valor não entregue para ${maskId(message.from)}`)
      }
      return
    }

    const validation = validateTransaction(parsed)
    if (validation.valid) {
      await saveAndConfirmTransaction(message.from, userId, {
        type: parsed.type,
        amount: parsed.amount,
        description: parsed.description,
        category: parsed.category,
        source: 'text',
        confidence: 1.0,
        date: parsed.date,
      }, userName)
      return
    }
  }

  // Regex falhou — fallback Haiku (paga) só quando keywords não bastam
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, type, keywords')
    .or(`user_id.eq.${userId},user_id.is.null`)

  if (categories && categories.length > 0) {
    const classification = await classifyMessage(text, categories.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      keywords: c.keywords ?? [],
    })))

    if (classification && classification.confidence >= 0.7) {
      const amount = extractAmountFromText(text)

      if (amount && amount > 0) {
        await saveAndConfirmTransaction(message.from, userId, {
          type: classification.type,
          amount,
          description: classification.description || text,
          category: classification.categoryName,
          source: 'text',
          confidence: classification.confidence,
        }, userName)
        return
      }
    }
  }

  const sentError = await sendWhatsAppMessage(message.from, withTutorialHint(ERROR_MESSAGES.PARSE_FAILED))
  if (!sentError) {
    console.error(`[FALHA ENVIO] Mensagem de erro não entregue para ${maskId(message.from)}`)
  }
}
