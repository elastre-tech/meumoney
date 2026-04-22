import type { ParsedMessage } from '@/lib/whatsapp/receive'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp/send-message'
import { handleText } from './handlers/text'
import { handleImage } from './handlers/image'
import { handleAudio } from './handlers/audio'
import { handleOnboarding } from './handlers/onboarding'

export async function routeMessage(message: ParsedMessage, userId: string): Promise<void> {
  const supabase = createAdminClient()

  const { data: user } = await supabase
    .from('users')
    .select('onboarded_at, onboarding_step, name, pending_transaction')
    .eq('id', userId)
    .single()

  if (!user?.onboarded_at) {
    await handleOnboarding(message, userId, user?.onboarding_step ?? 0, user?.name ?? null)
    return
  }

  const userName = user?.name ?? null
  const pendingTransaction = user?.pending_transaction ?? null

  switch (message.type) {
    case 'text':
      await handleText(message, userId, userName, pendingTransaction)
      break
    case 'image':
      await handleImage(message, userId, userName)
      break
    case 'audio':
      await handleAudio(message, userId, userName)
      break
    default:
      await sendWhatsAppMessage(message.from,
        `Por enquanto aceito apenas *texto*, *foto* ou *áudio*. Tenta mandar de uma dessas formas! 😉`)
      break
  }
}
