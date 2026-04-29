import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage, sendInteractiveButtons } from '@/lib/whatsapp/send-message'
import { confirmationMessage } from '@/lib/whatsapp/templates'
import { ERROR_MESSAGES } from '@/lib/utils/constants'

export interface TransactionData {
  type: 'expense' | 'income'
  amount: number
  description: string
  category: string
  source: 'text' | 'image' | 'audio'
  confidence: number
  date?: string
}

export function maskId(id: string): string {
  return id.length > 4 ? `***${id.slice(-4)}` : id
}

// WhatsApp Cloud API: button reply id is capped at 256 chars.
const MAX_BUTTON_ID_LENGTH = 256
export const BUTTON_PENDING_SENTINEL = '_pending'

export type TransactionActionPrefix = 'cancel_transaction' | 'edit_transaction'

/**
 * Build a button reply id that carries transaction ids inline ("cancel_transaction:uuid1,uuid2"),
 * falling back to a sentinel ("cancel_transaction:_pending") when the inline form would exceed the
 * WhatsApp 256-char button id limit. When the sentinel is used, the caller MUST persist the ids
 * elsewhere (see pending_transaction last_batch shape).
 */
export function buildActionButtonId(
  prefix: TransactionActionPrefix,
  ids: string[]
): { id: string; usesPendingFallback: boolean } {
  if (ids.length === 0) return { id: prefix, usesPendingFallback: false }
  const inline = `${prefix}:${ids.join(',')}`
  if (inline.length <= MAX_BUTTON_ID_LENGTH) return { id: inline, usesPendingFallback: false }
  return { id: `${prefix}:${BUTTON_PENDING_SENTINEL}`, usesPendingFallback: true }
}

export async function saveAndConfirmTransaction(
  to: string,
  userId: string,
  data: TransactionData,
  userName: string | null = null
): Promise<void> {
  const supabase = createAdminClient()

  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('name', data.category)
    .eq('type', data.type)
    .limit(1)
    .single()

  const { data: inserted, error } = await supabase.from('transactions').insert({
    user_id: userId,
    type: data.type,
    amount: data.amount,
    description: data.description,
    category_id: category?.id ?? null,
    source: data.source,
    date: data.date ?? new Date().toISOString().split('T')[0],
    ai_confidence: data.confidence,
  }).select('id').single()

  const transactionDate = data.date ?? new Date().toISOString().split('T')[0]
  const isToday = transactionDate === new Date().toISOString().split('T')[0]

  if (error) {
    console.error('[Router] Erro ao salvar transação:', error)
    const sentErr = await sendWhatsAppMessage(to, ERROR_MESSAGES.GENERIC_ERROR)
    if (!sentErr) {
      console.error(`[FALHA ENVIO] Mensagem de erro não entregue para ${maskId(to)}`)
    }
    return
  }

  const insertedIds = inserted?.id ? [inserted.id] : []
  const editBtn = buildActionButtonId('edit_transaction', insertedIds)
  const cancelBtn = buildActionButtonId('cancel_transaction', insertedIds)

  const confirmation = confirmationMessage(
    data.type,
    data.amount,
    data.description,
    data.category,
    transactionDate,
    isToday,
    userName,
    data.source
  )
  const sentConfirm = await sendInteractiveButtons(to, confirmation, [
    { id: editBtn.id, title: 'Editar' },
    { id: cancelBtn.id, title: 'Cancelar' },
  ])
  if (!sentConfirm) {
    console.error(`[FALHA ENVIO] Confirmação de transação não entregue para ${maskId(to)}`)
  }
}
