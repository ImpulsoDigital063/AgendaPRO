import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkRateLimit } from '@/lib/rate-limit-api'

const VALID_CATEGORIES = new Set([
  'rent', 'products', 'salary', 'utilities', 'marketing', 'taxes', 'other',
])

async function verifyOwner(req: Request, id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthenticated', status: 401 as const, supabase }
  const { data: expense } = await supabase
    .from('expenses')
    .select('id, business_id, status, due_date')
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
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(req, { key: 'admin-expense-edit', limit: 30, windowSeconds: 60 })
  if (rl) return rl

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

  // v104 · marcar conta programada como paga (ou voltar pra programada).
  // due_date NÃO é limpo ao pagar: guardar o vencimento junto com a data real
  // do pagamento é o que permite ver depois que a conta saiu atrasada.
  if (body.status === 'paid' || body.status === 'scheduled') updates.status = body.status
  if (typeof body.due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.due_date)) {
    updates.due_date = body.due_date
  }
  // Voltar pra programada sem vencimento viola o CHECK do banco — barra antes
  // de bater lá, pra devolver erro legível em vez de 500.
  if (updates.status === 'scheduled') {
    const venc = updates.due_date ?? verified.expense?.due_date
    if (!venc) {
      return NextResponse.json(
        { error: 'Conta programada precisa da data de vencimento' },
        { status: 400 }
      )
    }
  }

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
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(req, { key: 'admin-expense-delete', limit: 20, windowSeconds: 60 })
  if (rl) return rl

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
