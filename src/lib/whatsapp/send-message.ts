const GRAPH_API_URL = 'https://graph.facebook.com/v23.0'

export interface ReplyButton {
  id: string
  title: string
}

/**
 * Send a text message back to a WhatsApp user.
 * Uses WA_ACCESS_TOKEN and WA_PHONE_NUMBER_ID env vars.
 * Returns true on success, false on failure.
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<boolean> {
  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID
  const accessToken = process.env.WA_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    console.error('[WhatsApp Send] Missing WA_PHONE_NUMBER_ID or WA_ACCESS_TOKEN env vars')
    return false
  }

  try {
    const response = await fetch(
      `${GRAPH_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { body: message },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('[WhatsApp Send] API error:', JSON.stringify(error))
      return false
    }

    return true
  } catch (err) {
    console.error('[WhatsApp Send] Request failed:', err)
    return false
  }
}

/**
 * Send an interactive message with reply buttons (max 3).
 * Button ids must be unique (<=256 chars) and titles unique (<=20 chars).
 */
export async function sendInteractiveButtons(
  to: string,
  body: string,
  buttons: ReplyButton[]
): Promise<boolean> {
  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID
  const accessToken = process.env.WA_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    console.error('[WhatsApp Send] Missing WA_PHONE_NUMBER_ID or WA_ACCESS_TOKEN env vars')
    return false
  }

  if (buttons.length === 0 || buttons.length > 3) {
    console.error('[WhatsApp Send] Interactive buttons must be 1..3 items')
    return false
  }

  try {
    const response = await fetch(
      `${GRAPH_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: body },
            action: {
              buttons: buttons.map(btn => ({
                type: 'reply',
                reply: { id: btn.id, title: btn.title },
              })),
            },
          },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('[WhatsApp Send] Interactive API error:', JSON.stringify(error))
      return false
    }

    return true
  } catch (err) {
    console.error('[WhatsApp Send] Interactive request failed:', err)
    return false
  }
}
