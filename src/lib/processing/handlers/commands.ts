import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp/send-message'
import { dashboardLinkMessage, helpMessage, monthSummaryMessage } from '@/lib/whatsapp/templates'
import { ERROR_MESSAGES } from '@/lib/utils/constants'
import { formatCurrency } from '@/lib/utils/format'
import { maskId } from './utils'

export async function handleAjuda(to: string): Promise<void> {
  await sendWhatsAppMessage(to, helpMessage(process.env.NEXT_PUBLIC_APP_URL))
}

export async function handleDashboard(to: string): Promise<void> {
  await sendWhatsAppMessage(to, dashboardLinkMessage(process.env.NEXT_PUBLIC_APP_URL))
}

export async function handleResumo(to: string, userId: string, userName?: string | null): Promise<void> {
  const supabase = createAdminClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const { data: transactions } = await supabase
    .from('transactions')
    .select('type, amount, category_id, categories(name)')
    .eq('user_id', userId)
    .gte('date', startOfMonth)
    .lte('date', endOfMonth)

  if (!transactions || transactions.length === 0) {
    await sendWhatsAppMessage(to, `📊 Nenhuma transação registrada este mês. Comece enviando: "gastei 45 no mercado"`)
    return
  }

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  const catMap = new Map<string, number>()
  for (const t of transactions.filter(t => t.type === 'expense')) {
    const catName = (t.categories as { name: string } | null)?.name ?? 'Outros'
    catMap.set(catName, (catMap.get(catName) ?? 0) + Number(t.amount))
  }
  const topEntry = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1])[0]

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

  await sendWhatsAppMessage(to, monthSummaryMessage(
    `${monthNames[now.getMonth()]}/${now.getFullYear()}`,
    totalIncome,
    totalExpense,
    topEntry?.[0] ?? 'N/A',
    topEntry?.[1] ?? 0,
    userName
  ))
}

export async function handleCategorias(to: string, userId: string): Promise<void> {
  const supabase = createAdminClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('name, type, icon')
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order('type')
    .order('name')

  if (!categories || categories.length === 0) {
    await sendWhatsAppMessage(to, 'Nenhuma categoria encontrada.')
    return
  }

  const expenses = categories.filter(c => c.type === 'expense')
  const incomes = categories.filter(c => c.type === 'income')

  const lines = [
    `📋 *Suas categorias:*`,
    '',
    `💸 *Despesas:*`,
    ...expenses.map(c => `  ${c.icon ?? `📦`} ${c.name}`),
    '',
    `💰 *Receitas:*`,
    ...incomes.map(c => `  ${c.icon ?? `💰`} ${c.name}`),
  ]

  await sendWhatsAppMessage(to, lines.join('\n'))
}

export async function handleCancelar(to: string, userId: string): Promise<void> {
  const supabase = createAdminClient()
  const { data: last } = await supabase
    .from('transactions')
    .select('id, description, amount, type')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!last) {
    await sendWhatsAppMessage(to, 'Nenhuma transação encontrada para cancelar.')
    return
  }

  await supabase.from('transactions').delete().eq('id', last.id)

  const label = last.type === 'income' ? 'Receita' : 'Despesa'
  await sendWhatsAppMessage(to,
    `❌ ${label} cancelada: ${formatCurrency(Number(last.amount))} — ${last.description ?? 'sem descrição'}`)
}

/**
 * Cancel one or more specific transactions by id, scoped to the user.
 * Used by the ID-aware Cancelar button so users can cancel an older transaction
 * (not just the most recent one).
 */
export async function handleCancelarById(to: string, userId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) {
    await handleCancelar(to, userId)
    return
  }

  const supabase = createAdminClient()
  const { data: txs } = await supabase
    .from('transactions')
    .select('id, description, amount, type')
    .eq('user_id', userId)
    .in('id', ids)

  if (!txs || txs.length === 0) {
    await sendWhatsAppMessage(to, 'Essa transação já foi cancelada ou não existe mais.')
    return
  }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', userId)
    .in('id', ids)

  if (error) {
    console.error('[Cancelar by id] Erro ao deletar transações:', error)
    await sendWhatsAppMessage(to, ERROR_MESSAGES.GENERIC_ERROR)
    return
  }

  if (txs.length === 1) {
    const t = txs[0]
    const label = t.type === 'income' ? 'Receita' : 'Despesa'
    await sendWhatsAppMessage(to,
      `❌ ${label} cancelada: ${formatCurrency(Number(t.amount))} — ${t.description ?? 'sem descrição'}`)
    return
  }

  const total = txs.reduce((s, t) => s + Number(t.amount), 0)
  await sendWhatsAppMessage(to,
    `❌ Cancelei ${txs.length} transações (total ${formatCurrency(total)}).`)
}

export async function handleEditar(to: string, userId: string): Promise<void> {
  const supabase = createAdminClient()
  const { data: last } = await supabase
    .from('transactions')
    .select('id, description, amount')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!last) {
    await sendWhatsAppMessage(to, 'Nenhuma transação recente para editar.')
    return
  }

  await supabase.from('transactions').delete().eq('id', last.id)

  const sent = await sendWhatsAppMessage(to,
    `✏️ Cancelei: ${formatCurrency(Number(last.amount))} — ${last.description ?? 'sem descrição'}. Manda de novo com os dados certos!`)
  if (!sent) {
    console.error(`[FALHA ENVIO] Edição não entregue para ${maskId(to)}`)
  }
}

/**
 * Edit (cancel + ask user to resend) one or more specific transactions by id, scoped to the user.
 */
export async function handleEditarById(to: string, userId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) {
    await handleEditar(to, userId)
    return
  }

  const supabase = createAdminClient()
  const { data: txs } = await supabase
    .from('transactions')
    .select('id, description, amount')
    .eq('user_id', userId)
    .in('id', ids)

  if (!txs || txs.length === 0) {
    await sendWhatsAppMessage(to, 'Essa transação já foi cancelada ou não existe mais.')
    return
  }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', userId)
    .in('id', ids)

  if (error) {
    console.error('[Editar by id] Erro ao deletar transações:', error)
    await sendWhatsAppMessage(to, ERROR_MESSAGES.GENERIC_ERROR)
    return
  }

  if (txs.length === 1) {
    const t = txs[0]
    const sent = await sendWhatsAppMessage(to,
      `✏️ Cancelei: ${formatCurrency(Number(t.amount))} — ${t.description ?? 'sem descrição'}. Manda de novo com os dados certos!`)
    if (!sent) {
      console.error(`[FALHA ENVIO] Edição não entregue para ${maskId(to)}`)
    }
    return
  }

  const total = txs.reduce((s, t) => s + Number(t.amount), 0)
  await sendWhatsAppMessage(to,
    `✏️ Cancelei ${txs.length} transações (total ${formatCurrency(total)}). Manda de novo com os dados certos!`)
}

export async function handleExportar(to: string, userId: string): Promise<void> {
  const supabase = createAdminClient()

  await sendWhatsAppMessage(to, `📤 Gerando seu arquivo de exportação...`)

  const { data: transactions } = await supabase
    .from('transactions')
    .select('date, type, amount, description, source, ai_confidence, categories(name)')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (!transactions || transactions.length === 0) {
    await sendWhatsAppMessage(to, 'Você não tem transações para exportar.')
    return
  }

  const header = 'Data,Tipo,Valor,Descrição,Categoria,Fonte,Confiança IA'
  const rows = transactions.map(t => {
    const cat = (t.categories as { name: string } | null)?.name ?? ''
    const tipo = t.type === 'income' ? 'Receita' : 'Despesa'
    const desc = (t.description ?? '').replace(/"/g, '""')
    return `${t.date},${tipo},${t.amount},"${desc}",${cat},${t.source},${t.ai_confidence ?? ''}`
  })
  // BOM para Excel reconhecer UTF-8 corretamente
  const csv = '﻿' + header + '\n' + rows.join('\n')

  const fileName = `exports/${userId}/${Date.now()}.csv`
  const { error: uploadError } = await supabase.storage
    .from('exports')
    .upload(fileName, csv, {
      contentType: 'text/csv',
      upsert: true,
    })

  if (uploadError) {
    console.error('[Router] Erro ao fazer upload do CSV:', uploadError)
    await sendWhatsAppMessage(to, ERROR_MESSAGES.GENERIC_ERROR)
    return
  }

  const { data: signedUrl, error: urlError } = await supabase.storage
    .from('exports')
    .createSignedUrl(fileName, 60 * 60 * 24)

  if (urlError || !signedUrl) {
    console.error('[Router] Erro ao gerar URL assinada:', urlError)
    await sendWhatsAppMessage(to, ERROR_MESSAGES.GENERIC_ERROR)
    return
  }

  await sendWhatsAppMessage(to, [
    `📤 Exportação pronta! ${transactions.length} transações.`,
    '',
    `📎 Baixe aqui (link válido por 24h):`,
    signedUrl.signedUrl,
    '',
    'O arquivo é CSV e pode ser aberto no Excel ou Google Sheets.',
  ].join('\n'))
}

/**
 * Exclusão LGPD sem efeito colateral de mensagem.
 * Usado tanto pelo handleExcluirDados (WhatsApp) quanto pela rota /api/account/delete.
 */
export async function deleteUserData(userId: string): Promise<{ ok: boolean; errors: string[] }> {
  const supabase = createAdminClient()
  const errors: string[] = []

  // Ordem importa pelas FK constraints
  const tables = ['reports', 'monthly_reports', 'messages', 'transactions', 'categories'] as const
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId)
    if (error) {
      console.error(`[LGPD] Erro ao deletar ${table}:`, error.message)
      errors.push(table)
    }
  }

  try {
    const { data: files } = await supabase.storage.from('exports').list(`exports/${userId}`)
    if (files && files.length > 0) {
      const filePaths = files.map(f => `exports/${userId}/${f.name}`)
      await supabase.storage.from('exports').remove(filePaths)
    }
  } catch (storageErr) {
    console.error('[LGPD] Erro ao limpar storage:', storageErr)
    errors.push('storage')
  }

  const { error: userDeleteErr } = await supabase.from('users').delete().eq('id', userId)
  if (userDeleteErr) {
    console.error('[LGPD] Erro ao deletar users:', userDeleteErr.message)
    errors.push('users')
  }

  const { error: authDeleteErr } = await supabase.auth.admin.deleteUser(userId)
  if (authDeleteErr) {
    console.error('[LGPD] Erro ao deletar auth user:', authDeleteErr.message)
    errors.push('auth')
  }

  return { ok: errors.length === 0, errors }
}

export async function handleExcluirDados(to: string, userId: string): Promise<void> {
  const result = await deleteUserData(userId)

  if (!result.ok) {
    await sendWhatsAppMessage(to,
      '⚠️ Seus dados foram parcialmente excluídos, mas houve erro em algumas etapas. Nossa equipe vai finalizar manualmente. Desculpe o transtorno.')
    console.error(`[LGPD] Exclusão parcial para ${maskId(userId)}, falhas em: ${result.errors.join(', ')}`)
  } else {
    await sendWhatsAppMessage(to,
      '✅ Todos os seus dados foram excluídos. Se quiser usar o MeuMoney novamente, basta mandar uma mensagem.')
  }
}

export async function handleReportar(to: string, userId: string, userName: string | null): Promise<void> {
  const supabase = createAdminClient()

  const { data: recentMsgs } = await supabase
    .from('messages')
    .select('content, direction, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(3)

  await supabase.from('reports').insert({
    user_id: userId,
    type: 'bug',
    status: 'open',
    context: {
      user_name: userName,
      recent_messages: recentMsgs ?? [],
      reported_at: new Date().toISOString(),
    },
  })

  await notifySupportOfBugReport({ from: to, userName, recentMsgs: recentMsgs ?? [] })

  const sent = await sendWhatsAppMessage(to,
    `🐛 Problema registrado! Nossa equipe vai analisar. Se quiser detalhar, mande a próxima mensagem descrevendo o que houve.`)
  if (!sent) {
    console.error(`[FALHA ENVIO] Confirmação de report não entregue para ${maskId(to)}`)
  }
}

type RecentMsg = { content: unknown; direction: string | null; created_at: string | null }

async function notifySupportOfBugReport(args: {
  from: string
  userName: string | null
  recentMsgs: RecentMsg[]
}): Promise<void> {
  const notifyTo = process.env.BUG_REPORT_NOTIFY_TO
  if (!notifyTo) {
    console.warn('[BUG REPORT] BUG_REPORT_NOTIFY_TO não configurado — notificação ao suporte não enviada')
    return
  }

  const who = args.userName ? `${args.userName} (${args.from})` : args.from
  const lines = ['🐛 Novo bug report no MeuMoney', '', `De: ${who}`, '']

  if (args.recentMsgs.length > 0) {
    lines.push('Últimas mensagens:')
    for (const msg of [...args.recentMsgs].reverse()) {
      const arrow = msg.direction === 'outbound' ? '←' : '→'
      const raw = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content ?? '')
      lines.push(`${arrow} ${raw.slice(0, 200)}`)
    }
  } else {
    lines.push('(sem histórico recente de mensagens)')
  }

  const sent = await sendWhatsAppMessage(notifyTo, lines.join('\n'))
  if (!sent) {
    console.error(`[BUG REPORT] Falha ao notificar suporte ${maskId(notifyTo)} — ver tabela reports`)
  }
}
