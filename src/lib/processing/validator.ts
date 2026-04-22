import type { ParsedTransaction } from './text-handler'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateTransaction(data: ParsedTransaction): ValidationResult {
  const errors: string[] = []

  if (!data.amount || isNaN(data.amount) || data.amount <= 0) {
    errors.push('Valor inválido')
  }

  if (data.amount > 999999.99) {
    errors.push('Valor muito alto')
  }

  if (!data.description || data.description.trim().length === 0) {
    errors.push('Descrição não encontrada')
  }

  if (!data.type || !['expense', 'income'].includes(data.type)) {
    errors.push('Tipo inválido')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
