import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const VALID_CATEGORIES = new Set([
  'rent', 'products', 'salary', 'utilities', 'marketing', 'taxes', 'other',
])

async function verifyOwner(req: Request, id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthenticated', status: 401 as const, supabase }
  const { data: expense } = await supabase
    .from('expenses')
    .select('id, business_id')
    .eq('id', id)
    .single()
  if (!expense) return { error: 'not_found', status: 404 as const, supabase }
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', expense.business_id)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!business) return { error: 'forbidden', status: 403 as const, supabase }
  return { supabase, expense }
}

/**
 * PATCH /api/admin/expenses/[id]
 * Edita campos da despesa
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const verified = await verifyOwner(req, id)
  if ('error' in verified) {
    return NextResponse.json({ error: verified.error }, { status: verified.status })
  }
  const { supabase } = verified

  const body = await req.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}

  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim()
  if (Number.isFinite(Number(body.amount)) && Number(body.amount) > 0) {
    updates.amount = Number(body.amount)
  }
  if (typeof body.category === 'string' && VALID_CATEGORIES.has(body.category)) {
    updates.category = body.category
  }
  if (typeof body.occurred_at === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.occurred_at)) {
    updates.occurred_at = body.occurred_at
  }
  if (typeof body.recurring === 'boolean') updates.recurring = body.recurring
  if ('notes' in body) updates.notes = typeof body.notes === 'string' ? body.notes.trim() || null : null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no_changes' }, { status: 400 })
  }

  const { error } = await supabase.from('expenses').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 })

  revalidatePath('/admin/financeiro')
  revalidatePath('/admin/financeiro/despesas')
  return NextResponse.json({ ok: true })
}

/**
 * DELETE /api/admin/expenses/[id]
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const verified = await verifyOwner(req, id)
  if ('error' in verified) {
    return NextResponse.json({ error: verified.error }, { status: verified.status })
  }
  const { supabase } = verified

  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'delete_failed' }, { status: 500 })

  revalidatePath('/admin/financeiro')
  revalidatePath('/admin/financeiro/despesas')
  return NextResponse.json({ ok: true })
}
