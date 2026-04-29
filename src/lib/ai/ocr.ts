import Anthropic from '@anthropic-ai/sdk'

export type OCRSourceType = 'receipt' | 'spreadsheet' | 'bank_statement' | 'other'

export interface OCRTransaction {
  amount: number
  amount_text: string | null
  description: string
  establishment: string | null
  category_hint: string
  date: string | null
}

export interface OCRResult {
  transactions: OCRTransaction[]
  source_type: OCRSourceType
  confidence: number
  error?: string
}

const VALID_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
type MediaType = (typeof VALID_MEDIA_TYPES)[number]

const ALLOWED_CATEGORIES = [
  'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação', 'Lazer',
  'Compras', 'Pets', 'Vestuário', 'Serviços', 'Outros',
  'Salário', 'Freelance', 'Investimentos', 'Vendas', 'Comissão',
]

const VALID_SOURCE_TYPES: OCRSourceType[] = ['receipt', 'spreadsheet', 'bank_statement', 'other']

const PROMPT = `Você é um extrator de transações financeiras a partir de imagens.

Identifique TODAS as transações financeiras na imagem.

Tipos possíveis:
- Nota fiscal/cupom: retorne 1 transação com o valor TOTAL da compra
- Planilha/extrato bancário/lista de despesas: cada linha vira uma transação separada

Categorias permitidas (use APENAS uma destas em category_hint):
${ALLOWED_CATEGORIES.join(', ')}

Responda APENAS em JSON neste formato exato (NÃO copie nenhum texto deste bloco como valor — preencha cada campo com o dado real extraído da imagem):
{
  "transactions": [
    {
      "amount": number,
      "amount_text": string | null,
      "description": string,
      "establishment": string | null,
      "category_hint": string,
      "date": string | null
    }
  ],
  "source_type": "receipt" | "spreadsheet" | "bank_statement" | "other",
  "confidence": 0.0-1.0
}

Regras dos campos:
- amount: número em reais (ex: 45.90). NUNCA string como "R$ 45,90".
- amount: em nota fiscal/cupom, use SEMPRE o VALOR TOTAL FINAL da nota (última linha de "TOTAL" / "VALOR A PAGAR" / "TOTAL R$"). NÃO use subtotais, somatórios parciais, descontos, troco, nem o valor de itens individuais.
- amount: valores escritos com "mil"/"milhão"/"milhões" DEVEM ser convertidos para o número total:
  • "10 mil" → 10000
  • "5mil" → 5000
  • "1,5 mil" → 1500
  • "duzentos mil" → 200000
  • "2 milhões" → 2000000
- amount_text: copie o trecho EXATO do valor como aparece na imagem (ex: "10 mil", "R$ 1.234,56", "5mil"). null se não conseguir identificar o trecho.
- description: trecho curto extraído LITERALMENTE da imagem (nome do item, linha do extrato, primeira linha legível do recibo). NUNCA invente sínteses ou interpretações como "Compra de alimentos e bebidas variadas", "Itens diversos", "Despesas gerais", "Vários produtos". Se não conseguir ler nada específico, use uma descrição factual curta baseada no tipo do estabelecimento: "Compra em mercado", "Compra em farmácia", "Compra em posto", "Compra em padaria". Sem adjetivos, sem inventar conteúdo, sem listar categorias de produtos.
- establishment: o nome EXATO do estabelecimento como impresso no recibo (razão social ou nome fantasia, ex: "Supermercado Pão de Açúcar", "Posto Shell Ibirapuera", "Drogaria São Paulo"). NUNCA retorne palavras genéricas como "Supermercado", "Loja", "Estabelecimento", "Comércio", "Mercado", "Padaria" sozinhas — essas são tipos, não nomes. Se não conseguir ler o nome real impresso, retorne null.
- category_hint: OBRIGATÓRIO. Use APENAS uma das categorias listadas acima, sem parênteses, sem explicação.
- date: formato yyyy-mm-dd. Datas ambíguas em dd/mm (padrão Brasil). null se não houver data.
- source_type: classifique a imagem.
- confidence: sua confiança na extração entre 0.0 e 1.0.

Casos especiais:
- Imagem ilegível ou sem transações: { "transactions": [], "source_type": "other", "confidence": 0, "error": "image_too_dense" }
- Receitas (entradas de dinheiro): use categorias income (Salário, Freelance, Investimentos, Vendas, Comissão).`

// Hundreds written by extenso (cento/duzentos/...) used in patterns like "duzentos mil".
const EXTENSO_HUNDREDS: Record<string, number> = {
  cem: 100, cento: 100, duzentos: 200, trezentos: 300, quatrocentos: 400,
  quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900,
}

/**
 * Deterministic backstop for amounts written with magnitude words ("mil"/"milhão"/"milhões").
 * Returns the resolved amount or null if no magnitude pattern is found.
 *
 * Patterns covered:
 * - "10 mil" / "5mil" / "1,5 mil" / "1.5 mil"  → numeric × 1000
 * - "2 milhões" / "1,5 milhão" / "2 milhao"    → numeric × 1_000_000
 * - "duzentos mil" / "trezentos mil" / etc.    → extenso × 1000
 *
 * Word boundaries (\b) keep us from matching tokens like "milky" or "milhar".
 */
function extractTextualMagnitudeAmount(text: string): number | null {
  if (!text) return null
  const lower = text.toLowerCase()

  // milhão / milhões / milhao / milhoes (with or without accents)
  const milhao = lower.match(/(\d+(?:[.,]\d+)?)\s*milh(?:[ãa]o|[õo]es)\b/)
  if (milhao) {
    const num = parseFloat(milhao[1].replace(',', '.'))
    if (Number.isFinite(num) && num > 0) return Math.round(num * 1_000_000)
  }

  // mil (numeric multiplier)
  const mil = lower.match(/(\d+(?:[.,]\d+)?)\s*mil\b/)
  if (mil) {
    const num = parseFloat(mil[1].replace(',', '.'))
    if (Number.isFinite(num) && num > 0) return Math.round(num * 1000)
  }

  // extenso × mil ("duzentos mil", "trezentos mil", etc.)
  for (const word of Object.keys(EXTENSO_HUNDREDS)) {
    if (new RegExp(`\\b${word}\\s+mil\\b`).test(lower)) {
      return EXTENSO_HUNDREDS[word] * 1000
    }
  }

  return null
}

/**
 * Apply the textual-magnitude backstop to an OCR-extracted amount.
 * Only overrides when the OCR amount is missing or clearly too low (< 1000),
 * preventing false positives on already-correct amounts.
 */
function applyMagnitudeBackstop(
  ocrAmount: number | null,
  amountText: string | null,
  fallbackText: string
): number | null {
  const fromAmountText = amountText ? extractTextualMagnitudeAmount(amountText) : null
  const candidate = fromAmountText ?? extractTextualMagnitudeAmount(fallbackText)
  if (candidate === null || candidate <= 0) return ocrAmount
  if (ocrAmount === null || ocrAmount < 1000) return candidate
  return ocrAmount
}

async function callHaiku(imageBase64: string, mediaType: MediaType): Promise<string> {
  const anthropic = new Anthropic()
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          { type: 'text', text: PROMPT },
        ],
      },
    ],
  })
  return response.content[0].type === 'text' ? response.content[0].text : ''
}

function sanitizeTransaction(raw: unknown): OCRTransaction | null {
  if (!raw || typeof raw !== 'object') return null
  const t = raw as Record<string, unknown>

  const description = typeof t.description === 'string' && t.description.trim()
    ? t.description.trim()
    : 'Item'
  const establishment = typeof t.establishment === 'string' && t.establishment.trim()
    ? t.establishment.trim()
    : null
  const categoryHint = typeof t.category_hint === 'string' && t.category_hint.trim()
    ? t.category_hint.trim()
    : 'Outros'
  const date = typeof t.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? t.date : null
  const amountText = typeof t.amount_text === 'string' && t.amount_text.trim()
    ? t.amount_text.trim()
    : null

  const ocrAmount = (typeof t.amount === 'number' && Number.isFinite(t.amount) && t.amount > 0)
    ? t.amount
    : null

  // Deterministic backstop. Prefers amount_text; falls back to description+establishment.
  const fallbackText = `${description} ${establishment ?? ''}`.trim()
  const amount = applyMagnitudeBackstop(ocrAmount, amountText, fallbackText)

  if (amount === null || amount <= 0) return null

  return {
    amount,
    amount_text: amountText,
    description,
    establishment,
    category_hint: categoryHint,
    date,
  }
}

function parseHaikuResponse(text: string): OCRResult | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>
  } catch {
    return null
  }

  // Backward compatibility: legacy single-receipt format (amount/establishment at top level)
  if (!Array.isArray(parsed.transactions) && (typeof parsed.amount === 'number' || typeof parsed.establishment === 'string')) {
    const legacyAmount = typeof parsed.amount === 'number' && Number.isFinite(parsed.amount) && parsed.amount > 0
      ? parsed.amount
      : null
    const legacyEst = typeof parsed.establishment === 'string' ? parsed.establishment : null
    const legacyItems = Array.isArray(parsed.items) ? (parsed.items as unknown[]) : []
    const firstItem = typeof legacyItems[0] === 'string' ? (legacyItems[0] as string) : null
    const itemsText = legacyItems.filter((x): x is string => typeof x === 'string').join(' ')
    const rawText = typeof parsed.rawText === 'string' ? parsed.rawText : ''

    // Backstop: legacy format had rawText, which is the richest source for textual magnitudes.
    const fallbackText = `${rawText} ${itemsText} ${legacyEst ?? ''}`.trim()
    const resolvedAmount = applyMagnitudeBackstop(legacyAmount, null, fallbackText)

    const transactions: OCRTransaction[] = resolvedAmount !== null && resolvedAmount > 0
      ? [{
          amount: resolvedAmount,
          amount_text: null,
          description: legacyEst ?? firstItem ?? 'Recibo',
          establishment: legacyEst,
          category_hint: 'Outros',
          date: null,
        }]
      : []
    return { transactions, source_type: 'receipt', confidence: 0.7 }
  }

  if (!Array.isArray(parsed.transactions)) return null

  const transactions: OCRTransaction[] = []
  for (const raw of parsed.transactions) {
    const t = sanitizeTransaction(raw)
    if (t) transactions.push(t)
  }

  const source_type: OCRSourceType = VALID_SOURCE_TYPES.includes(parsed.source_type as OCRSourceType)
    ? (parsed.source_type as OCRSourceType)
    : 'other'
  const confidence = typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence)
    ? Math.max(0, Math.min(1, parsed.confidence))
    : 0.5

  const result: OCRResult = { transactions, source_type, confidence }
  if (typeof parsed.error === 'string') result.error = parsed.error
  return result
}

/**
 * Extract one or more transactions from an image (receipt, spreadsheet, bank statement).
 * Retries the Haiku call once on parse failure before giving up.
 */
export async function extractReceiptData(
  imageBuffer: Buffer,
  mimeType: string
): Promise<OCRResult | null> {
  if (!VALID_MEDIA_TYPES.includes(mimeType as MediaType)) {
    console.error('[AI OCR] Unsupported media type:', mimeType)
    return null
  }

  const imageBase64 = imageBuffer.toString('base64')

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const text = await callHaiku(imageBase64, mimeType as MediaType)
      const parsed = parseHaikuResponse(text)
      if (parsed) return parsed
      console.error(`[AI OCR] Parse failed (attempt ${attempt}):`, text.slice(0, 300))
    } catch (err) {
      console.error(`[AI OCR] Haiku call failed (attempt ${attempt}):`, err)
    }
  }
  return null
}
