import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseIncomingMessage } from '@/lib/whatsapp/receive'
import { routeMessage } from '@/lib/processing/router'
import { sendWhatsAppMessage } from '@/lib/whatsapp/send-message'
import { onboardingStep0Message } from '@/lib/whatsapp/templates'
import { verifyWebhookSignature } from '@/lib/whatsapp/verify'
import { maskId } from '@/lib/processing/handlers/utils'
import type { WhatsAppWebhookPayload } from '@/types/whatsapp'

// Força execução dinâmica: webhook não pode ser cacheado pela Vercel
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Max 5min no plano Pro da Vercel, 10s no Hobby
export const maxDuration = 30

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('[Webhook] Verificação bem-sucedida')
    return new NextResponse(challenge, { status: 200 })
  }

  console.warn('[Webhook] Verificação falhou - token inválido')
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// Processa ANTES de retornar: Vercel mata a função logo após o response
export async function POST(request: NextRequest) {
  const appSecret = process.env.WA_APP_SECRET
  const expectedPhoneNumberId = process.env.WA_PHONE_NUMBER_ID
  const isDev = process.env.NODE_ENV === 'development'

  // Fail-closed: em produção, secret ausente é erro de config, não relaxamento
  if (!appSecret && !isDev) {
    console.error('[Webhook] WA_APP_SECRET não configurado')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  if (!expectedPhoneNumberId) {
    console.error('[Webhook] WA_PHONE_NUMBER_ID não configurado')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // Body cru (string) é necessário pro HMAC; JSON.parse depois
  const rawBody = await request.text()

  if (appSecret) {
    const signature = request.headers.get('x-hub-signature-256') ?? ''
    if (!verifyWebhookSignature(rawBody, signature, appSecret)) {
      console.warn('[Webhook] HMAC inválido — rejeitando request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else {
    console.warn('[Webhook] Dev mode: WA_APP_SECRET ausente, HMAC não verificado')
  }

  const body = JSON.parse(rawBody) as WhatsAppWebhookPayload

  const phoneNumberId = body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id
  if (phoneNumberId && phoneNumberId !== expectedPhoneNumberId) {
    console.warn('[Webhook] phone_number_id não confere — rejeitando')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await processWebhook(body)
    console.log('[Webhook] Processamento concluído')
    return NextResponse.json({ status: 'received' }, { status: 200 })
  } catch (error) {
    // 500 faz a Meta retentar; dedup atômico no insert impede duplicação
    console.error('[Webhook] Erro:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

function isUniqueViolation(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  return error.code === '23505' || (error.message?.toLowerCase().includes('duplicate') ?? false)
}

async function processWebhook(body: WhatsAppWebhookPayload) {
  if (body.object !== 'whatsapp_business_account') {
    console.log('[Webhook] Ignorado: object não é whatsapp_business_account')
    return
  }

  const supabase = createAdminClient()

  for (const entry of body.entry) {
    for (const change of entry.changes) {
      if (change.field !== 'messages') continue
      const { messages, contacts } = change.value

      if (!messages || !contacts) {
        console.log('[Webhook] Ignorado: sem messages ou contacts no payload')
        continue
      }

      for (const message of messages) {
        const waId = message.from
        const contactName = contacts.find(c => c.wa_id === waId)?.profile.name

        console.log(`[Webhook] Received ${message.type} from ${maskId(waId)}`)

        let { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('wa_id', waId)
          .single()

        let justCreated = false

        if (!user) {
          console.log(`[Webhook] Usuário novo, criando: ${maskId(waId)}`)

          // Auth primeiro pra garantir que o id da public.users casa com auth.users
          const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: `${waId}@meumoney.whatsapp`,
            password: crypto.randomUUID(),
            email_confirm: true,
            user_metadata: { phone: `+${waId}`, wa_id: waId, name: contactName },
          })

          if (authError || !authUser.user) {
            console.error('[Webhook] Erro ao criar usuário auth:', authError)
            continue
          }

          const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert({
              id: authUser.user.id,
              phone: `+${waId}`,
              wa_id: waId,
              name: contactName ?? null,
            })
            .select('id')
            .single()

          if (userError || !newUser) {
            console.error('[Webhook] Erro ao criar usuário:', userError)
            continue
          }

          user = newUser
          justCreated = true
          console.log(`[Webhook] Novo usuário criado: ${maskId(waId)}`)
        }

        const content: Record<string, string | undefined> = {}
        if (message.type === 'text') {
          content.body = message.text?.body
        } else if (message.type === 'image') {
          content.media_id = message.image?.id
          content.mime_type = message.image?.mime_type
        } else if (message.type === 'audio') {
          content.media_id = message.audio?.id
          content.mime_type = message.audio?.mime_type
        } else if (message.type === 'interactive') {
          content.interactive_type = message.interactive?.type
          content.button_id = message.interactive?.button_reply?.id
          content.button_title = message.interactive?.button_reply?.title
        }

        // Dedup atômico: unique(wa_message_id) impede que retries dupliquem
        const { error: msgError } = await supabase.from('messages').insert({
          user_id: user.id,
          wa_message_id: message.id,
          direction: 'inbound' as const,
          type: message.type,
          content,
        })

        if (msgError) {
          if (isUniqueViolation(msgError)) {
            console.log(`[Webhook] Duplicada ignorada: ${message.id}`)
            continue
          }
          console.error('[Webhook] Erro ao salvar mensagem:', msgError)
          continue
        }

        if (justCreated) {
          // Primeira mensagem: manda boas-vindas (onboarding step 0), sem rotear
          const sent = await sendWhatsAppMessage(waId, onboardingStep0Message())
          if (!sent) {
            console.error(`[FALHA ENVIO] Mensagem de boas-vindas não entregue para ${maskId(waId)}`)
          }
          continue
        }

        const parsed = parseIncomingMessage(message)

        try {
          await routeMessage(parsed, user.id)

          await supabase
            .from('messages')
            .update({ processed_at: new Date().toISOString() })
            .eq('wa_message_id', message.id)

          console.log(`[Webhook] Mensagem ${message.id} processada com sucesso`)
        } catch (routeError) {
          console.error('[Webhook] Erro ao processar mensagem:', routeError)
          await supabase
            .from('messages')
            .update({ error: String(routeError) })
            .eq('wa_message_id', message.id)
        }
      }
    }
  }
}
