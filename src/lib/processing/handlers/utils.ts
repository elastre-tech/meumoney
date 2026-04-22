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

  const { error } = await supabase.from('transactions').insert({
    user_id: userId,
    type: data.type,
    amount: data.amount,
    description: data.description,
    category_id: category?.id ?? null,
    source: data.source,
    date: data.date ?? new Date().toISOString().split('T')[0],
    ai_confidence: data.confidence,
  })

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

  const confirmation = confirmationMessage(
    data.type,
    data.amount,
    data.description,
    data.category,
    transactionDate,
    isToday,
    userName
  )
  const sentConfirm = await sendInteractiveButtons(to, confirmation, [
    { id: 'edit_transaction', title: 'Editar' },
    { id: 'cancel_transaction', title: 'Cancelar' },
  ])
  if (!sentConfirm) {
    console.error(`[FALHA ENVIO] Confirmação de transação não entregue para ${maskId(to)}`)
  }
}
