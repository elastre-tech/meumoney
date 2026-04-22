import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { deleteUserData } from '@/lib/processing/handlers/commands'
import { maskId } from '@/lib/processing/handlers/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await deleteUserData(user.id)

  if (!result.ok) {
    console.error(`[LGPD] Exclusão parcial via dashboard para ${maskId(user.id)}: ${result.errors.join(', ')}`)
    return NextResponse.json({ error: 'Partial deletion', details: result.errors }, { status: 500 })
  }

  return NextResponse.json({ status: 'deleted' }, { status: 200 })
}
