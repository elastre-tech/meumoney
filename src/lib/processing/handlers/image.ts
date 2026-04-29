import type { ParsedMessage } from '@/lib/whatsapp/receive'
import { sendWhatsAppMessage, sendInteractiveButtons } from '@/lib/whatsapp/send-message'
import {
  ocrConfirmationMessage,
  batchConfirmationMessage,
  batchSummaryMessage,
} from '@/lib/whatsapp/templates'
import { createAdminClient } from '@/lib/supabase/admin'
import { downloadWhatsAppMedia } from '@/lib/whatsapp/download-media'
import { extractReceiptData, type OCRTransaction } from '@/lib/ai/ocr'
import { classifyMessage } from '@/lib/ai/classify'
import { normalizeText } from '@/lib/utils/categories'
import { ERROR_MESSAGES } from '@/lib/utils/constants'
import { maskId, buildActionButtonId } from './utils'

interface ResolvedTransaction {
  amount: number
  establishment: string | null
  description: string
  type: 'expense' | 'income'
  categoryId: string | null
  categoryName: string
  date: string
}

interface CategoryRow {
  id: string
  name: string
  type: string
  keywords: string[] | null
}

const LOW_CONFIDENCE_THRESHOLD = 0.5
const LOW_CONFIDENCE_WARNING = '⚠️ Tive dificuldade com alguns itens, confere se tá certinho.\n\n'

async function resolveCategory(
  ocrTx: OCRTransaction,
  categoryList: { id: string; name: string; type: string; keywords: string[] }[]
): Promise<{ categoryId: string | null; categoryName: string; type: 'expense' | 'income' }> {
  if (categoryList.length > 0) {
    const hint = normalizeText(ocrTx.category_hint ?? '')
    const hintMatch = hint
      ? categoryList.find((c) => normalizeText(c.name) === hint)
      : null

    if (hintMatch) {
      return {
        categoryId: hintMatch.id,
        categoryName: hintMatch.name,
        type: hintMatch.type === 'income' ? 'income' : 'expense',
      }
    }

    const fallbackText = `${ocrTx.description} ${ocrTx.establishment ?? ''}`.trim()
    const classification = await classifyMessage(fallbackText, categoryList)
    if (classification) {
      return {
        categoryId: classification.categoryId,
        categoryName: classification.categoryName,
        type: classification.type,
      }
    }
  }

  return { categoryId: null, categoryName: 'Outros', type: 'expense' }
}

export async function handleImage(
  message: ParsedMessage,
  userId: string,
  userName: string | null
): Promise<void> {
  if (!message.mediaId) {
    await sendWhatsAppMessage(message.from, ERROR_MESSAGES.OCR_FAILED)
    return
  }

  await sendWhatsAppMessage(message.from, `📸 Recebi a foto! Analisando...`)

  const media = await downloadWhatsAppMedia(message.mediaId)
  if (!media) {
    await sendWhatsAppMessage(message.from, ERROR_MESSAGES.OCR_FAILED)
    return
  }

  const ocrResult = await extractReceiptData(media.buffer, media.mimeType)
  if (!ocrResult || ocrResult.transactions.length === 0) {
    await sendWhatsAppMessage(
      message.from,
      '❌ Não consegui ler o recibo. Tente tirar uma foto mais nítida ou digite manualmente: "gastei 45 no mercado"'
    )
    return
  }

  const supabase = createAdminClient()
  const { data: categoriesRaw } = await supabase
    .from('categories')
    .select('id, name, type, keywords')
    .or(`user_id.eq.${userId},user_id.is.null`)

  const categoryList = ((categoriesRaw ?? []) as CategoryRow[]).map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    keywords: c.keywords ?? [],
  }))

  const today = new Date().toISOString().split('T')[0]
  const resolved: ResolvedTransaction[] = []

  for (const tx of ocrResult.transactions) {
    const { categoryId, categoryName, type } = await resolveCategory(tx, categoryList)
    resolved.push({
      amount: tx.amount,
      establishment: tx.establishment,
      description: tx.description,
      type,
      categoryId,
      categoryName,
      date: tx.date ?? today,
    })
  }

  const insertRows = resolved.map((r) => ({
    user_id: userId,
    type: r.type,
    amount: r.amount,
    description: r.establishment ?? r.description,
    category_id: r.categoryId,
    source: 'image' as const,
    date: r.date,
    ai_confidence: ocrResult.confidence,
  }))

  const { data: insertedRows, error: insertError } = await supabase
    .from('transactions')
    .insert(insertRows)
    .select('id')
  if (insertError) {
    console.error(`[FALHA INSERT] OCR batch para ${maskId(message.from)}:`, insertError)
    await sendWhatsAppMessage(message.from, ERROR_MESSAGES.GENERIC_ERROR)
    return
  }

  const insertedIds = (insertedRows ?? []).map((r) => r.id).filter((id): id is string => typeof id === 'string')

  const warningPrefix = ocrResult.confidence < LOW_CONFIDENCE_THRESHOLD ? LOW_CONFIDENCE_WARNING : ''
  const count = resolved.length
  let body: string

  if (count === 1) {
    const r = resolved[0]
    body = ocrConfirmationMessage(
      r.amount,
      r.establishment,
      r.description,
      r.categoryName,
      r.date,
      userName
    )
  } else if (count <= 5) {
    body = batchConfirmationMessage(
      resolved.map((r) => ({
        amount: r.amount,
        category: r.categoryName,
        description: r.establishment ?? r.description,
      })),
      userName
    )
  } else {
    const total = resolved.reduce((sum, r) => sum + r.amount, 0)
    const breakdownMap = new Map<string, number>()
    for (const r of resolved) {
      breakdownMap.set(r.categoryName, (breakdownMap.get(r.categoryName) ?? 0) + 1)
    }
    const breakdown = Array.from(breakdownMap.entries()).map(([category, c]) => ({
      category,
      count: c,
    }))
    body = batchSummaryMessage(total, count, breakdown, userName)
  }

  const editBtn = buildActionButtonId('edit_transaction', insertedIds)
  const cancelBtn = buildActionButtonId('cancel_transaction', insertedIds)
  if (editBtn.usesPendingFallback || cancelBtn.usesPendingFallback) {
    // Batch too large to fit ids inline in the 256-char button payload — stash them.
    await supabase
      .from('users')
      .update({ pending_transaction: { kind: 'last_batch', ids: insertedIds } })
      .eq('id', userId)
  }

  const confirmation = warningPrefix + body
  const sent = await sendInteractiveButtons(message.from, confirmation, [
    { id: editBtn.id, title: 'Editar' },
    { id: cancelBtn.id, title: 'Cancelar' },
  ])
  if (!sent) {
    console.error(`[FALHA ENVIO] Confirmação OCR não entregue para ${maskId(message.from)}`)
  }
}
