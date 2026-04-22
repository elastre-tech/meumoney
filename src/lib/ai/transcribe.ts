import { convertTextToNumber, extractAmountFromText } from '@/lib/processing/text-handler'

export interface TranscriptionResult {
  text: string
  amount: number | null
  description: string | null
  type: 'income' | 'expense' | null
}

/**
 * Transcribe audio using OpenAI Whisper API.
 * Requires OPENAI_API_KEY env var.
 * Falls back gracefully if not configured.
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string
): Promise<TranscriptionResult | null> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.error('[AI Transcribe] Missing OPENAI_API_KEY env var')
    return null
  }

  try {
    const extMap: Record<string, string> = {
      'audio/ogg': 'ogg',
      'audio/ogg; codecs=opus': 'ogg',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'mp4',
      'audio/wav': 'wav',
      'audio/webm': 'webm',
    }
    const ext = extMap[mimeType] ?? 'ogg'

    const formData = new FormData()
    const arrayBuf = audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength) as ArrayBuffer
    const blob = new Blob([arrayBuf], { type: mimeType })
    formData.append('file', blob, `audio.${ext}`)
    formData.append('model', 'whisper-1')
    formData.append('language', 'pt')
    formData.append('response_format', 'text')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[AI Transcribe] Whisper API error:', error)
      return null
    }

    const transcribedText = await response.text()

    if (!transcribedText.trim()) {
      console.error('[AI Transcribe] Empty transcription result')
      return null
    }

    console.log(`[AI Transcribe] Transcribed, length: ${transcribedText.trim().length}`)

    // Converter valores por extenso ("mil", "duzentos") pra dígitos
    const processedText = convertTextToNumber(transcribedText)

    const result: TranscriptionResult = {
      text: transcribedText.trim(),
      amount: null,
      description: null,
      type: null,
    }

    result.amount = extractAmountFromText(processedText)

    const lowerText = processedText.toLowerCase()
    if (/recebi|ganhei|entrou|salario|salário|pagamento/.test(lowerText)) {
      result.type = 'income'
    } else if (/gastei|paguei|comprei|pago|custa|custou/.test(lowerText)) {
      result.type = 'expense'
    }

    result.description = transcribedText.trim()

    return result
  } catch (err) {
    console.error('[AI Transcribe] Transcription failed:', err)
    return null
  }
}
