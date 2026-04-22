import type { ParsedMessage } from '@/lib/whatsapp/receive'
import { parseTextMessage, convertTextToNumber, extractAmountFromText } from '../text-handler'
import { validateTransaction } from '../validator'
import { sendWhatsAppMessage } from '@/lib/whatsapp/send-message'
import { createAdminClient } from '@/lib/supabase/admin'
import { classifyMessage } from '@/lib/ai/classify'
import { ERROR_MESSAGES } from '@/lib/utils/constants'
import { maskId, saveAndConfirmTransaction } from './utils'
import {
  handleAjuda,
  handleDashboard,
  handleResumo,
  handleCategorias,
  handleCancelar,
  handleEditar,
  handleExportar,
  handleExcluirDados,
  handleReportar,
} from './commands'

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

  if (lower === 'editar') {
    await handleEditar(message.from, userId)
    return
  }

  if (lower === 'reportar' || lower === 'bug' || lower === 'problema') {
    await handleReportar(message.from, userId, userName)
    return
  }

  if (pendingTransaction && typeof pendingTransaction === 'object') {
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

  const sentError = await sendWhatsAppMessage(message.from, ERROR_MESSAGES.PARSE_FAILED)
  if (!sentError) {
    console.error(`[FALHA ENVIO] Mensagem de erro não entregue para ${maskId(message.from)}`)
  }
}
