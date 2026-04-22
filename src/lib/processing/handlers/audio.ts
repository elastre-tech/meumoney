import type { ParsedMessage } from '@/lib/whatsapp/receive'
import { parseTextMessage } from '../text-handler'
import { validateTransaction } from '../validator'
import { sendWhatsAppMessage } from '@/lib/whatsapp/send-message'
import { createAdminClient } from '@/lib/supabase/admin'
import { downloadWhatsAppMedia } from '@/lib/whatsapp/download-media'
import { transcribeAudio } from '@/lib/ai/transcribe'
import { classifyMessage } from '@/lib/ai/classify'
import { ERROR_MESSAGES } from '@/lib/utils/constants'
import { saveAndConfirmTransaction } from './utils'
import { handleText } from './text'

const AUDIO_COMMANDS = [
  'ajuda', 'menu', 'relatório', 'relatorio', 'resumo', 'categorias',
  'cancelar', 'editar', 'exportar', 'conta', 'minha conta', 'dashboard', 'painel', 'excluir meus dados',
  'reportar', 'bug', 'problema',
]

export async function handleAudio(
  message: ParsedMessage,
  userId: string,
  userName: string | null
): Promise<void> {
  if (!message.mediaId) {
    await sendWhatsAppMessage(message.from, ERROR_MESSAGES.AUDIO_FAILED)
    return
  }

  await sendWhatsAppMessage(message.from, `🎤 Recebi o áudio! Transcrevendo...`)

  const media = await downloadWhatsAppMedia(message.mediaId)
  if (!media) {
    await sendWhatsAppMessage(message.from, ERROR_MESSAGES.AUDIO_FAILED)
    return
  }

  const transcription = await transcribeAudio(media.buffer, media.mimeType)
  if (!transcription) {
    await sendWhatsAppMessage(message.from,
      '❌ Não consegui transcrever o áudio. Tente falar mais claramente ou digite: "gastei 45 no mercado"')
    return
  }

  await sendWhatsAppMessage(message.from, `🗣️ Entendi: "${transcription.text}"`)

  const transcribedLower = transcription.text.toLowerCase().trim()
  if (AUDIO_COMMANDS.includes(transcribedLower)) {
    await handleText({ ...message, type: 'text', text: transcription.text }, userId, userName, null)
    return
  }

  const parsed = parseTextMessage(transcription.text)
  if (parsed) {
    const validation = validateTransaction(parsed)
    if (validation.valid) {
      await saveAndConfirmTransaction(message.from, userId, {
        type: parsed.type,
        amount: parsed.amount,
        description: parsed.description,
        category: parsed.category,
        source: 'audio',
        confidence: 0.9,
      }, userName)
      return
    }
  }

  if (transcription.amount && transcription.amount > 0) {
    const supabase = createAdminClient()
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, type, keywords')
      .or(`user_id.eq.${userId},user_id.is.null`)

    if (categories && categories.length > 0) {
      const classification = await classifyMessage(
        transcription.text,
        categories.map(c => ({ id: c.id, name: c.name, type: c.type, keywords: c.keywords ?? [] }))
      )

      if (classification) {
        await saveAndConfirmTransaction(message.from, userId, {
          type: transcription.type ?? classification.type,
          amount: transcription.amount,
          description: transcription.description ?? transcription.text,
          category: classification.categoryName,
          source: 'audio',
          confidence: classification.confidence * 0.9,
        }, userName)
        return
      }
    }
  }

  await sendWhatsAppMessage(message.from,
    '❌ Não consegui entender os dados financeiros do áudio. Tente digitar: "gastei 45 no mercado"')
}
