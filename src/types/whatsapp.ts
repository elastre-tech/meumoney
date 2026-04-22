// WhatsApp Cloud API webhook payload types

export interface WhatsAppWebhookPayload {
  object: string
  entry: WhatsAppEntry[]
}

export interface WhatsAppEntry {
  id: string
  changes: WhatsAppChange[]
}

export interface WhatsAppChange {
  value: WhatsAppValue
  field: string
}

export interface WhatsAppValue {
  messaging_product: string
  metadata: {
    display_phone_number: string
    phone_number_id: string
  }
  contacts?: WhatsAppContact[]
  messages?: WhatsAppMessage[]
  statuses?: WhatsAppStatus[]
}

export interface WhatsAppContact {
  profile: { name: string }
  wa_id: string
}

export interface WhatsAppMessage {
  from: string
  id: string
  timestamp: string
  type: 'text' | 'image' | 'audio' | 'document' | 'interactive'
  text?: WhatsAppText
  image?: WhatsAppMedia
  audio?: WhatsAppMedia
  interactive?: WhatsAppInteractive
}

export interface WhatsAppInteractive {
  type: 'button_reply' | 'list_reply' | string
  button_reply?: {
    id: string
    title: string
  }
  list_reply?: {
    id: string
    title: string
    description?: string
  }
}

export interface WhatsAppText {
  body: string
}

export interface WhatsAppMedia {
  mime_type: string
  sha256: string
  id: string
  caption?: string
}

export interface WhatsAppStatus {
  id: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  recipient_id: string
}
