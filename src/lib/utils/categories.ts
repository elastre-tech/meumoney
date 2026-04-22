import { STRONG_PET_KEYWORDS } from '@/lib/utils/constants'

/**
 * Normalize text for keyword matching: lowercase and remove accents.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

interface CategoryEntry {
  id: string
  name: string
  type: string
  keywords: string[]
}

interface CategoryMatch {
  categoryId: string
  categoryName: string
  type: 'income' | 'expense'
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function hasStrongPetKeyword(text: string): boolean {
  const normalizedText = normalizeText(text)

  return STRONG_PET_KEYWORDS.some((keyword) => {
    const normalizedKeyword = normalizeText(keyword).trim()
    if (!normalizedKeyword) return false

    const keywordPattern = escapeRegExp(normalizedKeyword)
    return new RegExp(`(^|[^a-z0-9])${keywordPattern}([^a-z0-9]|$)`).test(normalizedText)
  })
}

/**
 * Find a matching category by scanning keywords against the input text.
 * Keywords and text are both normalized (lowercased, accents removed) before comparison.
 * Returns the first match, or null if no keyword matched.
 */
export function findCategoryByKeywords(
  text: string,
  categories: CategoryEntry[]
): CategoryMatch | null {
  const normalizedText = normalizeText(text)

  if (hasStrongPetKeyword(text)) {
    const petCategory = categories.find(
      (category) => normalizeText(category.name) === 'pets'
    )

    if (petCategory) {
      return {
        categoryId: petCategory.id,
        categoryName: petCategory.name,
        type: petCategory.type as 'income' | 'expense',
      }
    }
  }

  for (const category of categories) {
    for (const keyword of category.keywords) {
      const normalizedKeyword = normalizeText(keyword)
      if (normalizedKeyword && normalizedText.includes(normalizedKeyword)) {
        return {
          categoryId: category.id,
          categoryName: category.name,
          type: category.type as 'income' | 'expense',
        }
      }
    }
  }

  return null
}
