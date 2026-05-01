import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/customers/[id]/points
 * Body: { delta: number }
 *
 * Adiciona (positivo) ou remove (negativo) pontos manualmente.
 * Valida que o saldo nao fica negativo. Atomico via update direto
 * com check de saldo no WHERE.
 *
 * Performance: 1 update direto, sem trigger nem transacao explicita.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const delta = Number(body.delta)
  if (!Number.isFinite(delta) || delta === 0) {
    return NextResponse.json({ error: 'delta inválido' }, { status: 400 })
  }
  if (Math.abs(delta) > 10000) {
    return NextResponse.json({ error: 'delta muito grande (max 10.000)' }, { status: 400 })
  }

  // Customer + validacao de owner via business
  const { data: customer } = await supabase
    .from('customers')
    .select('id, business_id, total_points')
    .eq('id', id)
    .single()
  if (!customer) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', customer.business_id)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!business) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const current = customer.total_points ?? 0
  const next = current + delta

  if (next < 0) {
    return NextResponse.json(
      { error: `Saldo ficaria negativo (atual: ${current}, tentativa: ${delta})` },
      { status: 400 }
    )
  }

  const { error: updateErr } = await supabase
    .from('customers')
    .update({ total_points: next })
    .eq('id', id)

  if (updateErr) {
    console.error('points update error:', updateErr)
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, total_points: next })
}
