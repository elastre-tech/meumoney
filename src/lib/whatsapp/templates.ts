import { formatCurrency, formatDate } from '@/lib/utils/format'

const DEFAULT_APP_URL = 'https://conta.meumoney.app'

export function confirmationMessage(
  type: 'expense' | 'income',
  amount: number,
  description: string,
  category: string,
  date: string | Date,
  isToday = true,
  userName: string | null = null,
  source: 'text' | 'image' | 'audio' = 'text'
): string {
  const greeting = type === 'income'
    ? (userName ? `Boa, ${userName}!` : 'Boa!')
    : (userName ? `Anotado, ${userName}!` : 'Anotado!')
  const kind = type === 'expense' ? 'Despesa' : 'Receita'
  const dateStr = isToday ? 'Hoje' : formatDate(date)
  const footer = source === 'audio'
    ? '⚠️ Confira os valores — transcrições de áudio podem ter erros. Se algo estiver errado, toque em um botão abaixo.'
    : 'Errou algo? Toque em um botão abaixo.'
  return [
    greeting,
    '',
    `✅ ${kind} salva:`,
    `💰 Valor: ${formatCurrency(amount)}`,
    `📅 Data: ${dateStr}`,
    `📁 Categoria: ${category}`,
    `📝 Descrição: ${description}`,
    '',
    footer,
  ].join('\n')
}

export function ocrConfirmationMessage(
  amount: number,
  establishment: string,
  category: string,
  date: string | Date,
  items: string[],
  userName: string | null = null
): string {
  const greeting = userName ? `Anotado, ${userName}!` : 'Anotado!'
  const itemsStr = items.length > 0 ? items.slice(0, 3).join(', ') : '—'
  const today = new Date().toISOString().split('T')[0]
  const dateVal = typeof date === 'string' ? date : date.toISOString().split('T')[0]
  const dateStr = dateVal === today ? 'Hoje' : formatDate(date)
  return [
    `📸 ${greeting}`,
    '',
    `✅ Despesa salva:`,
    `💰 Valor: ${formatCurrency(amount)}`,
    `📅 Data: ${dateStr}`,
    `🏪 Estabelecimento: ${establishment}`,
    `📁 Categoria: ${category}`,
    `🛒 Itens: ${itemsStr}`,
    '',
    '⚠️ Confira os valores — fotos de recibo podem ter erros de leitura. Se algo estiver errado, toque em um botão abaixo.',
  ].join('\n')
}

export function batchConfirmationMessage(
  items: { amount: number; category: string; description?: string | null }[],
  userName: string | null = null
): string {
  const greeting = userName ? `Anotado, ${userName}!` : 'Anotado!'
  const total = items.reduce((sum, i) => sum + i.amount, 0)
  const lines = items.map((i) => {
    const desc = i.description ? ` — ${i.description}` : ''
    return `• ${formatCurrency(i.amount)} (${i.category})${desc}`
  })
  return [
    `📸 ${greeting}`,
    '',
    `✅ Salvei ${items.length} transações (total ${formatCurrency(total)}):`,
    ...lines,
    '',
    '⚠️ Confira os valores — fotos de recibo podem ter erros de leitura. Se algo estiver errado, toque em um botão abaixo.',
  ].join('\n')
}

export function batchSummaryMessage(
  total: number,
  count: number,
  categoryBreakdown: { category: string; count: number }[],
  userName: string | null = null
): string {
  const greeting = userName ? `Anotado, ${userName}!` : 'Anotado!'
  const top = [...categoryBreakdown]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((c) => `${c.category} (${c.count})`)
    .join(', ')
  return [
    `📸 ${greeting}`,
    '',
    `✅ Salvei ${count} transações, total ${formatCurrency(total)}.`,
    `🏆 Top categorias: ${top}`,
    '',
    '⚠️ Confira os valores — fotos de recibo podem ter erros de leitura. Se algo estiver errado, toque em um botão abaixo.',
  ].join('\n')
}

export function onboardingStep0Message(): string {
  return [
    `👋 Olá! Eu sou o *MeuMoney*, seu assistente financeiro no WhatsApp.`,
    '',
    'Comigo você registra gastos e receitas de forma simples — texto, foto de recibo ou áudio.',
    '',
    'Pra gente começar, *qual é o seu nome?*',
  ].join('\n')
}

export function onboardingStep1Message(name: string): string {
  return [
    `Prazer, ${name}! 😊`,
    '',
    'Agora preciso do seu *email* pra você acessar sua *conta no MeuMoney* (onde vê seus relatórios e gráficos).',
    '',
    'Qual seu email?',
  ].join('\n')
}

export function onboardingStep2Message(): string {
  return [
    `📋 Último passo! Preciso do seu consentimento pra armazenar seus dados financeiros conforme a *LGPD* (Lei 13.709/2018).`,
    '',
    'Seus dados são usados apenas pro serviço e você pode excluir tudo a qualquer momento enviando "excluir meus dados".',
    '',
    `Toque em um botão abaixo pra continuar! 🚀`,
  ].join('\n')
}

export function onboardingAcceptedMessage(name: string): string {
  return [
    `🎉 Tudo pronto, ${name}! Sua conta está ativa.`,
    '',
    'Comece agora mesmo! Exemplos:',
    `💬 "gastei 45 no mercado"`,
    `💬 "recebi 3500 de salário"`,
    `💬 "ontem gastei mil no supermercado"`,
    `📸 Envie uma foto de recibo`,
    `🎤 Envie um áudio`,
    '',
    'Digite *ajuda* a qualquer momento pra ver todos os comandos.',
  ].join('\n')
}

export function helpMessage(appUrl?: string | null): string {
  const url = appUrl ?? DEFAULT_APP_URL
  const dashboardLine = `🖥️ *conta* (ou *dashboard*/*painel*) — acesse em ${url}`
  return [
    `📋 *Comandos do MeuMoney:*`,
    '',
    '*Registrar transações:*',
    `💬 "gastei 45 no mercado"`,
    `💰 "recebi 3500 de salário"`,
    `📅 "ontem gastei 30 no uber" (aceita datas)`,
    `🤔 Esqueceu o valor? Mande "gastei no mercado" que eu pergunto quanto foi`,
    `📸 Envie uma *foto de recibo* pra eu ler sozinho`,
    `🎤 Envie um *áudio* descrevendo a transação`,
    '',
    '*Errou algo?* Em cada confirmação aparecem botões de *Editar* e *Cancelar*.',
    '',
    '*Outros comandos:*',
    `📊 *relatório* (ou *resumo*) — resumo do mês`,
    `📁 *categorias* — listar categorias`,
    '✏️ *editar* — cancela a última e você reenvia',
    '❌ *cancelar* — cancela a última transação',
    `🐛 *reportar* (ou *bug*/*problema*) — reportar um problema`,
    `📤 *exportar* — baixar seus dados em CSV`,
    `🗑️ *excluir meus dados* — apagar tudo (LGPD)`,
    '',
    dashboardLine,
  ].join('\n')
}

export function dashboardLinkMessage(appUrl?: string | null): string {
  const url = appUrl ?? DEFAULT_APP_URL
  return [
    `🖥️ *Sua conta no MeuMoney:*`,
    url,
    '',
    'Lá você pode:',
    `📊 Ver gráficos e evolução mensal`,
    `🔎 Filtrar transações por período e categoria`,
    '✏️ Editar e reclassificar qualquer transação',
    `📤 Exportar o histórico completo`,
    '',
    'Faz login com o email cadastrado (magic link).',
  ].join('\n')
}

export function monthSummaryMessage(
  month: string,
  totalIncome: number,
  totalExpense: number,
  topCategory: string,
  topAmount: number,
  userName?: string | null
): string {
  const balance = totalIncome - totalExpense
  const balanceEmoji = balance >= 0 ? `📈` : `📉`
  const greeting = userName ? `${userName}, aqui` : 'Aqui'
  return [
    `📊 ${greeting} está o resumo de ${month}:`,
    '',
    `💰 Receitas: ${formatCurrency(totalIncome)}`,
    `💸 Despesas: ${formatCurrency(totalExpense)}`,
    `${balanceEmoji} Saldo: ${formatCurrency(balance)}`,
    '',
    `🏆 Maior gasto: ${topCategory} (${formatCurrency(topAmount)})`,
    '',
    'Acesse sua conta no MeuMoney para ver mais detalhes!',
  ].join('\n')
}
