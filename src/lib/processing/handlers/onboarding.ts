import type { ParsedMessage } from '@/lib/whatsapp/receive'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage, sendInteractiveButtons } from '@/lib/whatsapp/send-message'
import { onboardingStep1Message, onboardingStep2Message, onboardingAcceptedMessage } from '@/lib/whatsapp/templates'
import { maskId } from './utils'

export async function handleOnboarding(
  message: ParsedMessage,
  userId: string,
  step: number,
  currentName: string | null
): Promise<void> {
  const supabase = createAdminClient()
  const text = (message.text ?? '').trim()

  if (step === 0) {
    const name = text || currentName || 'Usuário'
    await supabase.from('users').update({ name, onboarding_step: 1 }).eq('id', userId)

    const sent = await sendWhatsAppMessage(message.from, onboardingStep1Message(name))
    if (!sent) {
      console.error(`[FALHA ENVIO] Onboarding step 1 não entregue para ${maskId(message.from)}`)
    }
    return
  }

  if (step === 1) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(text)) {
      const sent = await sendWhatsAppMessage(message.from,
        'Hmm, isso não parece um email válido. Tenta de novo?')
      if (!sent) {
        console.error(`[FALHA ENVIO] Validação email não entregue para ${maskId(message.from)}`)
      }
      return
    }

    const email = text.toLowerCase()

    // Só avança se o auth.users aceitar o email (evita dessincronizar)
    const { error: authErr } = await supabase.auth.admin.updateUserById(userId, { email })
    if (authErr) {
      console.error('[Onboarding] Erro ao salvar email:', authErr.message)
      await sendWhatsAppMessage(message.from,
        'Não consegui salvar esse email. Tenta de novo?')
      return
    }

    await supabase.from('users').update({ onboarding_step: 2 }).eq('id', userId)

    const sent = await sendInteractiveButtons(message.from, onboardingStep2Message(), [
      { id: 'lgpd_accept', title: 'Aceito' },
      { id: 'lgpd_reject', title: 'Não aceito' },
    ])
    if (!sent) {
      console.error(`[FALHA ENVIO] Onboarding step 2 não entregue para ${maskId(message.from)}`)
    }
    return
  }

  if (step === 2) {
    const lower = text.toLowerCase()

    if (text === '__btn_lgpd_reject__') {
      const sent = await sendWhatsAppMessage(message.from,
        'Sem o seu consentimento LGPD, não posso processar seus dados financeiros. Quando quiser começar, toque em *Aceito* ou responda *aceito*.')
      if (!sent) {
        console.error(`[FALHA ENVIO] Rejeição LGPD não entregue para ${maskId(message.from)}`)
      }
      return
    }

    if (lower === 'aceito' || lower === 'aceitar' || lower === 'sim') {
      await supabase.from('users').update({
        onboarded_at: new Date().toISOString(),
        onboarding_step: 3,
      }).eq('id', userId)

      const name = currentName ?? 'Usuário'
      const sent = await sendWhatsAppMessage(message.from, onboardingAcceptedMessage(name))
      if (!sent) {
        console.error(`[FALHA ENVIO] Onboarding aceito não entregue para ${maskId(message.from)}`)
      }
      return
    }

    const sent = await sendInteractiveButtons(message.from,
      `📋 Pra continuar, preciso do seu consentimento LGPD. Toque em um botão:`,
      [
        { id: 'lgpd_accept', title: 'Aceito' },
        { id: 'lgpd_reject', title: 'Não aceito' },
      ])
    if (!sent) {
      console.error(`[FALHA ENVIO] Consentimento não entregue para ${maskId(message.from)}`)
    }
    return
  }
}
