import Anthropic from '@anthropic-ai/sdk'
import { normalizeText, findCategoryByKeywords } from '@/lib/utils/categories'

interface ClassificationResult {
  type: 'income' | 'expense'
  categoryId: string
  categoryName: string
  confidence: number
  description: string
}

interface CategoryInput {
  id: string
  name: string
  type: string
  keywords: string[]
}

interface HaikuClassificationResponse {
  type: 'income' | 'expense'
  category: string
  amount: number | null
  description: string
  confidence: number
}

/**
 * Classify a transaction message.
 * Tenta keyword matching primeiro (grátis); só chama Haiku se não casar.
 */
export async function classifyMessage(
  message: string,
  categories: CategoryInput[]
): Promise<ClassificationResult | null> {
  const keywordMatch = findCategoryByKeywords(message, categories)

  if (keywordMatch) {
    return {
      type: keywordMatch.type,
      categoryId: keywordMatch.categoryId,
      categoryName: keywordMatch.categoryName,
      confidence: 1.0,
      description: message.trim(),
    }
  }

  const expenseCategories = categories
    .filter((c) => c.type === 'expense')
    .map((c) => c.name)
    .join(', ')

  const incomeCategories = categories
    .filter((c) => c.type === 'income')
    .map((c) => c.name)
    .join(', ')

  const prompt = `Classifique esta transacao financeira.

Mensagem do usuario: "${message}"

Categorias disponiveis (tipo expense):
- ${expenseCategories}

Categorias disponiveis (tipo income):
- ${incomeCategories}

Responda APENAS em JSON:
{
  "type": "expense" ou "income",
  "category": "nome da categoria",
  "amount": numero ou null,
  "description": "descricao curta",
  "confidence": 0.0 a 1.0
}`

  try {
    const anthropic = new Anthropic()

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const text =
      response.content[0].type === 'text' ? response.content[0].text : ''

    // Haiku às vezes embrulha em ```json```; extrai só o objeto
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[AI Classify] No JSON found in response:', text)
      return null
    }

    const parsed: HaikuClassificationResponse = JSON.parse(jsonMatch[0])

    const normalizedCategoryName = normalizeText(parsed.category)
    const matchedCategory = categories.find(
      (c) => normalizeText(c.name) === normalizedCategoryName
    )

    if (!matchedCategory) {
      // Haiku pode inventar categoria — cai em "Outros" do tipo detectado
      const fallback = categories.find(
        (c) => normalizeText(c.name) === 'outros' && c.type === parsed.type
      )
      if (!fallback) {
        console.error('[AI Classify] Could not find matching category:', parsed.category)
        return null
      }
      return {
        type: parsed.type,
        categoryId: fallback.id,
        categoryName: fallback.name,
        confidence: parsed.confidence,
        description: parsed.description,
      }
    }

    return {
      type: parsed.type,
      categoryId: matchedCategory.id,
      categoryName: matchedCategory.name,
      confidence: parsed.confidence,
      description: parsed.description,
    }
  } catch (err) {
    console.error('[AI Classify] Haiku classification failed:', err)
    return null
  }
}
