import type { WhatsAppMessage } from '@/types/whatsapp'

export interface ParsedMessage {
  from: string
  messageId: string
  type: 'text' | 'image' | 'audio'
  text?: string
  mediaId?: string
}

/**
 * Convert a WhatsApp interactive button reply id into a text equivalent
 * that the router already knows how to handle. Unknown ids are passed
 * through so they don't get silently dropped.
 *
 * ID-aware action buttons (cancel_transaction:<payload>, edit_transaction:<payload>)
 * become internal tokens (__btn_cancel:<payload>__ / __btn_edit:<payload>__) that
 * the text handler dispatches before any other rule.
 */
function buttonIdToText(id: string | undefined): string {
  if (!id) return ''

  if (id.startsWith('cancel_transaction:')) {
    return `__btn_cancel:${id.slice('cancel_transaction:'.length)}__`
  }
  if (id.startsWith('edit_transaction:')) {
    return `__btn_edit:${id.slice('edit_transaction:'.length)}__`
  }

  switch (id) {
    case 'confirm_ok':
      return '__btn_confirm_ok__'
    case 'edit_transaction':
      return 'editar'
    case 'cancel_transaction':
      return 'cancelar'
    case 'lgpd_accept':
      return 'aceito'
    case 'lgpd_reject':
      return '__btn_lgpd_reject__'
    default:
      return id
  }
}

export function parseIncomingMessage(message: WhatsAppMessage): ParsedMessage {
  const base = {
    from: message.from,
    messageId: message.id,
  }

  switch (message.type) {
    case 'text':
      return { ...base, type: 'text', text: message.text?.body ?? '' }
    case 'image':
      return { ...base, type: 'image', mediaId: message.image?.id }
    case 'audio':
      return { ...base, type: 'audio', mediaId: message.audio?.id }
    case 'interactive': {
      const btnId = message.interactive?.button_reply?.id
      return { ...base, type: 'text', text: buttonIdToText(btnId) }
    }
    default:
      return { ...base, type: 'text', text: '' }
  }
}
