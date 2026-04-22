import { CATEGORY_KEYWORDS, INCOME_CATEGORIES } from '@/lib/utils/constants'

interface CategorizationResult {
  category: string
  isIncome: boolean
}

export function categorize(text: string): CategorizationResult {
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  for (const [keyword, category] of Object.entries(CATEGORY_KEYWORDS)) {
    const normalizedKeyword = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (normalized.includes(normalizedKeyword)) {
      return {
        category,
        isIncome: INCOME_CATEGORIES.includes(category),
      }
    }
  }

  return { category: 'Outros', isIncome: false }
}
