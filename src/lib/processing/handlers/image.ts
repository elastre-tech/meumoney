import type { ParsedMessage } from '@/lib/whatsapp/receive'
import { sendWhatsAppMessage, sendInteractiveButtons } from '@/lib/whatsapp/send-message'
import { ocrConfirmationMessage } from '@/lib/whatsapp/templates'
import { createAdminClient } from '@/lib/supabase/admin'
import { downloadWhatsAppMedia } from '@/lib/whatsapp/download-media'
import { extractReceiptData } from '@/lib/ai/ocr'
import { classifyMessage } from '@/lib/ai/classify'
import { ERROR_MESSAGES } from '@/lib/utils/constants'
import { maskId } from './utils'

export async function handleImage(
  message: ParsedMessage,
  userId: string,
  userName: string | null
): Promise<void> {
  if (!message.mediaId) {
    await sendWhatsAppMessage(message.from, ERROR_MESSAGES.OCR_FAILED)
    return
  }

  await sendWhatsAppMessage(message.from, `📸 Recebi a foto! Analisando o recibo...`)

  const media = await downloadWhatsAppMedia(message.mediaId)
  if (!media) {
    await sendWhatsAppMessage(message.from, ERROR_MESSAGES.OCR_FAILED)
    return
  }

  const ocrResult = await extractReceiptData(media.buffer, media.mimeType)
  if (!ocrResult || !ocrResult.amount) {
    await sendWhatsAppMessage(message.from,
      '❌ Não consegui ler o recibo. Tente tirar uma foto mais nítida ou digite manualmente: "gastei 45 no mercado"')
    return
  }

  const description = ocrResult.establishment ?? ocrResult.items[0] ?? 'Recibo'
  const supabase = createAdminClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, type, keywords')
    .or(`user_id.eq.${userId},user_id.is.null`)

  let categoryName = 'Outros'
  if (categories && categories.length > 0) {
    const classification = await classifyMessage(
      `${description} ${ocrResult.items.join(' ')}`,
      categories.map(c => ({ id: c.id, name: c.name, type: c.type, keywords: c.keywords ?? [] }))
    )
    if (classification) {
      categoryName = classification.categoryName
    }
  }

  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('name', categoryName)
    .eq('type', 'expense')
    .limit(1)
    .single()

  await supabase.from('transactions').insert({
    user_id: userId,
    type: 'expense' as const,
    amount: ocrResult.amount,
    description,
    category_id: category?.id ?? null,
    source: 'image' as const,
    date: new Date().toISOString().split('T')[0],
    ai_confidence: 0.85,
  })

  const confirmation = ocrConfirmationMessage(
    ocrResult.amount,
    description,
    categoryName,
    new Date(),
    ocrResult.items,
    userName
  )
  const sentOcr = await sendInteractiveButtons(message.from, confirmation, [
    { id: 'edit_transaction', title: 'Editar' },
    { id: 'cancel_transaction', title: 'Cancelar' },
  ])
  if (!sentOcr) {
    console.error(`[FALHA ENVIO] Confirmação OCR não entregue para ${maskId(message.from)}`)
  }
}
