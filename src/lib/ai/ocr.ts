import Anthropic from '@anthropic-ai/sdk'
import { extractTextualThousandsAmount } from '@/lib/processing/text-handler'

export interface OCRResult {
  amount: number | null
  establishment: string | null
  date: string | null
  items: string[]
  rawText: string
}

/**
 * Extract data from a receipt image using Claude Haiku Vision.
 * Sends the image as base64 and asks Haiku to extract structured data.
 * Returns OCRResult or null on failure.
 */
export async function extractReceiptData(
  imageBuffer: Buffer,
  mimeType: string
): Promise<OCRResult | null> {
  const validMediaTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
  type MediaType = (typeof validMediaTypes)[number]

  if (!validMediaTypes.includes(mimeType as MediaType)) {
    console.error('[AI OCR] Unsupported media type:', mimeType)
    return null
  }

  const imageBase64 = imageBuffer.toString('base64')

  try {
    const anthropic = new Anthropic()

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as MediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `Extraia do recibo: valor total, nome do estabelecimento, data, e itens principais.
Responda APENAS em JSON:
{
  "amount": number ou null,
  "establishment": string ou null,
  "date": string ou null (formato DD/MM/YYYY),
  "items": ["item1", "item2", ...],
  "rawText": "texto completo legivel do recibo"
}

Regras:
- amount deve ser um numero (ex: 45.90, nao "R$ 45,90")
- Se nao conseguir identificar algum campo, use null
- items deve ser um array de strings com os itens principais
- rawText deve conter o texto completo que voce conseguiu ler`,
            },
          ],
        },
      ],
    })

    const text =
      response.content[0].type === 'text' ? response.content[0].text : ''

    // Haiku às vezes embrulha em ```json```; extrai só o objeto
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[AI OCR] No JSON found in response:', text)
      return null
    }

    const parsed = JSON.parse(jsonMatch[0]) as OCRResult

    if (!Array.isArray(parsed.items)) {
      parsed.items = []
    }

    if (typeof parsed.rawText !== 'string') {
      parsed.rawText = ''
    }

    const textualThousandsAmount = extractTextualThousandsAmount(parsed.rawText)
    if (textualThousandsAmount !== null && (parsed.amount === null || parsed.amount < 1000)) {
      parsed.amount = textualThousandsAmount
    }

    return parsed
  } catch (err) {
    console.error('[AI OCR] Receipt extraction failed:', err)
    return null
  }
}
