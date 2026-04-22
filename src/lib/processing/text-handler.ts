import { categorize } from './categorizer'
import { hasStrongPetKeyword } from '@/lib/utils/categories'

export interface ParsedTransaction {
  type: 'expense' | 'income'
  amount: number
  description: string
  category: string
  date?: string // formato YYYY-MM-DD, opcional
  missingAmount?: boolean // true quando extraiu descrição/tipo mas não valor
}

// Patterns: "gastei 45 no mercado", "paguei 120 de luz", "recebi 3500 de salário"
const EXPENSE_PATTERNS = [
  /(?:gastei|paguei|comprei|pago)\s+(?:R?\$?\s*)?(\d+[.,]?\d*)\s+(?:no|na|de|em|pra|pro)\s+(.+)/i,
  /(?:R?\$?\s*)(\d+[.,]?\d*)\s+(?:no|na|de|em|pra|pro)\s+(.+)/i,
]

// Patterns sem preposição: "gastei 30", "recebi 1200"
const EXPENSE_PATTERNS_SHORT = [
  /(?:gastei|paguei|comprei|pago)\s+(?:R?\$?\s*)?(\d+[.,]?\d*)\s*$/i,
]

const INCOME_PATTERNS = [
  /(?:recebi|ganhei|entrou)\s+(?:R?\$?\s*)?(\d+[.,]?\d*)\s+(?:de|do|da)\s+(.+)/i,
]

const INCOME_PATTERNS_SHORT = [
  /(?:recebi|ganhei|entrou)\s+(?:R?\$?\s*)?(\d+[.,]?\d*)\s*$/i,
]

function categorizeWithPetPriority(text: string) {
  const result = categorize(text)

  if (hasStrongPetKeyword(text)) {
    return { category: 'Pets', isIncome: false }
  }

  return result
}

// Converte valores por extenso pra dígitos: "mil" → "1000", "dois mil e quinhentos" → "2500"
export function convertTextToNumber(text: string): string {
  const units: Record<string, number> = {
    cem: 100, cento: 100, duzentos: 200, trezentos: 300, quatrocentos: 400,
    quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900,
    mil: 1000,
  }
  const multipliers: Record<string, number> = {
    dois: 2, duas: 2, tres: 3, três: 3, quatro: 4, cinco: 5,
    seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
  }
  const tens: Record<string, number> = {
    vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50,
    sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
  }
  const smallNumbers: Record<string, number> = {
    um: 1, uma: 1, dois: 2, duas: 2, tres: 3, três: 3,
    quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9,
    dez: 10, onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14,
    quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19,
  }

  let result = text
  const hundredsPattern = 'cem|cento|duzentos|trezentos|quatrocentos|quinhentos|seiscentos|setecentos|oitocentos|novecentos'

  // "10 mil", "5mil", "10 mil e quinhentos" → 10000, 5000, 10500
  const digitMilPattern = new RegExp(`\\b(\\d+)\\s*mil(?:\\s+e\\s+(${hundredsPattern}))?\\b`, 'gi')
  result = result.replace(digitMilPattern, (_, raw, extra) => {
    let value = parseInt(raw, 10) * 1000
    if (extra) value += units[extra.toLowerCase()] ?? 0
    return String(value)
  })

  // "dois mil e quinhentos" → 2500
  const pattern = /(?:(dois|duas|tres|três|quatro|cinco|seis|sete|oito|nove|dez)\s+)?mil(?:\s+e\s+(cem|cento|duzentos|trezentos|quatrocentos|quinhentos|seiscentos|setecentos|oitocentos|novecentos))?/gi
  result = result.replace(pattern, (_, mult, extra) => {
    let value = 1000
    if (mult) value = (multipliers[mult.toLowerCase()] ?? 1) * 1000
    if (extra) value += units[extra.toLowerCase()] ?? 0
    return String(value)
  })

  // Standalone "cem", "duzentos", etc. (sem "mil")
  for (const [word, value] of Object.entries(units)) {
    if (word === 'mil') continue
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    result = result.replace(regex, String(value))
  }

  // "vinte e cinco" → 25, "trinta e dois" → 32
  const tensPattern = new RegExp(
    `\\b(${Object.keys(tens).join('|')})\\s+e\\s+(${Object.keys(smallNumbers).join('|')})\\b`, 'gi'
  )
  result = result.replace(tensPattern, (_, t, u) => {
    return String((tens[t.toLowerCase()] ?? 0) + (smallNumbers[u.toLowerCase()] ?? 0))
  })

  // Standalone "vinte", "trinta", etc.
  for (const [word, value] of Object.entries(tens)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    result = result.replace(regex, String(value))
  }

  // Standalone small numbers: "quinze", "doze", etc.
  for (const [word, value] of Object.entries(smallNumbers)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    result = result.replace(regex, String(value))
  }

  // "3k" → 3000, "1.5k" → 1500, "2,5k" → 2500
  result = result.replace(/(\d+(?:[.,]\d+)?)\s*k\b/gi, (_, num) => {
    const n = parseFloat(num.replace(',', '.'))
    return String(n * 1000)
  })

  return result
}

export function extractTextualThousandsAmount(text: string): number | null {
  const match = text.match(/\b\d+\s*mil(?:\s+e\s+(?:cem|cento|duzentos|trezentos|quatrocentos|quinhentos|seiscentos|setecentos|oitocentos|novecentos))?\b/i)
  if (!match) return null

  return extractAmountFromText(match[0])
}

export function extractAmountFromText(text: string): number | null {
  const processedText = convertTextToNumber(text)
  const amountPatterns = [
    /R\$\s*(\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d+(?:,\d{2})?)(?=$|\s|[^\d.,])/i,
    /(\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d+(?:,\d{2})?)\s*(?:reais|conto|pila|real)/i,
    /(?:^|\s)(\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d+(?:,\d{2})?)(?=$|\s|[^\d.,])/i,
  ]

  for (const pattern of amountPatterns) {
    const match = processedText.match(pattern)
    if (match) {
      const amount = parseAmount(match[1])
      return Number.isFinite(amount) ? amount : null
    }
  }

  return null
}

// Extrai data do texto: "dia 4/4", "04/04/2026", "ontem", "anteontem"
function extractDate(text: string): { date: string | null; cleanText: string } {
  const today = new Date()

  // "ontem"
  if (/\bontem\b/i.test(text)) {
    const d = new Date(today)
    d.setDate(d.getDate() - 1)
    return { date: d.toISOString().split('T')[0], cleanText: text.replace(/\bontem\b/i, '').trim() }
  }

  // "anteontem"
  if (/\banteontem\b/i.test(text)) {
    const d = new Date(today)
    d.setDate(d.getDate() - 2)
    return { date: d.toISOString().split('T')[0], cleanText: text.replace(/\banteontem\b/i, '').trim() }
  }

  // "dia DD/MM/YYYY" ou "DD/MM/YYYY" ou "DD/MM/YY" ou "dia DD/MM"
  const datePattern = /(?:(?:no\s+)?dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/i
  const match = text.match(datePattern)
  if (match) {
    const day = parseInt(match[1])
    const month = parseInt(match[2]) - 1
    let year = match[3] ? parseInt(match[3]) : today.getFullYear()
    if (year < 100) year += 2000
    const d = new Date(year, month, day)
    return { date: d.toISOString().split('T')[0], cleanText: text.replace(datePattern, '').trim() }
  }

  return { date: null, cleanText: text }
}

export function parseTextMessage(text: string): ParsedTransaction | null {
  // Extrair data antes de processar
  const { date, cleanText } = extractDate(text)
  // Converter valores por extenso antes de aplicar regex
  const processedText = convertTextToNumber(cleanText)

  for (const pattern of INCOME_PATTERNS) {
    const match = processedText.match(pattern)
    if (match) {
      const amount = parseAmount(match[1])
      const description = match[2].trim()
      const { category } = categorizeWithPetPriority(description)
      return { type: 'income', amount, description, category, date: date ?? undefined }
    }
  }

  for (const pattern of EXPENSE_PATTERNS) {
    const match = processedText.match(pattern)
    if (match) {
      const amount = parseAmount(match[1])
      const description = match[2].trim()
      const { category, isIncome } = categorizeWithPetPriority(description)
      return {
        type: isIncome ? 'income' : 'expense',
        amount,
        description,
        category,
        date: date ?? undefined,
      }
    }
  }

  // Sem preposição (só valor): "recebi 1200"
  for (const pattern of INCOME_PATTERNS_SHORT) {
    const match = processedText.match(pattern)
    if (match) {
      const amount = parseAmount(match[1])
      return { type: 'income', amount, description: 'Receita', category: 'Outros', date: date ?? undefined }
    }
  }

  for (const pattern of EXPENSE_PATTERNS_SHORT) {
    const match = processedText.match(pattern)
    if (match) {
      const amount = parseAmount(match[1])
      return { type: 'expense', amount, description: 'Despesa', category: 'Outros', date: date ?? undefined }
    }
  }

  // Patterns SEM valor: "gastei no mercado", "paguei a luz", "recebi do freelance"
  const expenseNoAmount = processedText.match(/(?:gastei|paguei|comprei|pago)\s+(?:no|na|de|em|pra|pro|a|o)\s+(.+)/i)
  if (expenseNoAmount) {
    const description = expenseNoAmount[1].trim()
    const { category, isIncome } = categorizeWithPetPriority(description)
    return {
      type: isIncome ? 'income' : 'expense',
      amount: 0,
      description,
      category,
      date: date ?? undefined,
      missingAmount: true,
    }
  }

  const incomeNoAmount = processedText.match(/(?:recebi|ganhei|entrou)\s+(?:de|do|da)\s+(.+)/i)
  if (incomeNoAmount) {
    const description = incomeNoAmount[1].trim()
    const { category } = categorizeWithPetPriority(description)
    return {
      type: 'income',
      amount: 0,
      description,
      category,
      date: date ?? undefined,
      missingAmount: true,
    }
  }

  return null
}

function parseAmount(raw: string): number {
  // Formato BR: "1.500,50" → ponto é milhar, vírgula é decimal
  const cleaned = raw.replace(/\./g, '').replace(',', '.')
  return parseFloat(cleaned)
}
