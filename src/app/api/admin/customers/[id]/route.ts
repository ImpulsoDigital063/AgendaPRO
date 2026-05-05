import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit-api'

/**
 * GET /api/admin/customers/[id]
 *
 * Retorna detalhes do customer + últimos 20 agendamentos.
 *
 * Performance:
 *   - Query única: customer + business validation pelo owner_id
 *   - Histórico limitado a 20 (paginação client-side se precisar mais)
 *   - Index aproveitado: (business_id, appointment_date DESC)
 *   - 1 lookup adicional em clients pra match por phone (UNIQUE)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(req, { key: 'admin-customer-detail', limit: 60, windowSeconds: 60 })
  if (rl) return rl

  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  // Customer + business filtrado pelo owner — RLS garante seguranca
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .select('id, business_id, name, phone, email, total_points, referral_code, created_at')
    .eq('id', id)
    .single()

  if (custErr || !customer) {
    return NextResponse.json({ error: 'customer_not_found' }, { status: 404 })
  }

  // Valida que o user é dono do business deste customer
  const { data: business } = await supabase
    .from('businesses')
    .select('id, slug')
    .eq('id', customer.business_id)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!business) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // Match com client universal pelo phone (pra puxar appointments)
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('phone', customer.phone)
    .maybeSingle()

  // Histórico de agendamentos — limit 20 últimos, ordenado desc
  const { data: appointments } = client
    ? await supabase
        .from('appointments')
        .select('id, appointment_date, start_time, service_name, total_price, status, professional_id')
        .eq('business_id', customer.business_id)
        .eq('client_id', client.id)
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(20)
    : { data: [] }

  // Pega nomes dos profissionais distintos pra display (1 query)
  const profIds = Array.from(
    new Set((appointments || []).map((a) => a.professional_id).filter(Boolean) as string[])
  )
  const { data: profs } = profIds.length > 0
    ? await supabase
        .from('professionals')
        .select('id, name')
        .in('id', profIds)
    : { data: [] }

  const profMap = new Map<string, string>()
  for (const p of profs || []) profMap.set(p.id, p.name)

  const history = (appointments || []).map((a) => ({
    id: a.id,
    date: a.appointment_date,
    time: a.start_time,
    service: a.service_name,
    price: a.total_price,
    status: a.status,
    professional: a.professional_id ? profMap.get(a.professional_id) ?? null : null,
  }))

  // Historico de pontos — extrato auditavel de cada delta + reason.
  // CIC rodada 4 reportou bug #3: cliente tinha saldo +40pts inexplicaveis.
  // Sem extrato, dono nao consegue auditar. Agora cada transacao
  // (servico/referral/review/manual) aparece listada.
  const { data: pointsTx } = await supabase
    .from('points_transactions')
    .select('id, points, reason, created_at, appointment_id')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const pointsHistory = (pointsTx || []).map((t) => ({
    id: t.id,
    points: t.points,
    reason: t.reason as 'service' | 'referral' | 'review' | 'manual' | 'punctuality' | 'redemption',
    created_at: t.created_at,
    appointment_id: t.appointment_id,
  }))

  // Cupom ativo do cliente (CIC NB-5: badge so aparecia no card externo,
  // dentro do modal sumia). Pega o primeiro nao-usado e nao-expirado.
  const nowIso = new Date().toISOString()
  const { data: activeCoupon } = await supabase
    .from('coupons')
    .select('code, discount_type, discount_value, expires_at')
    .eq('customer_id', customer.id)
    .eq('business_id', customer.business_id)
    .is('used_at', null)
    .gt('expires_at', nowIso)
    .order('expires_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  // Recompensas ativas do business (pra dropdown "Resgatar" no modal).
  // Cliente pode resgatar qualquer uma cujo saldo cubra.
  const { data: rewards } = await supabase
    .from('rewards')
    .select('id, name, points_required')
    .eq('business_id', customer.business_id)
    .eq('active', true)
    .order('points_required', { ascending: true })

  return NextResponse.json({
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      total_points: customer.total_points ?? 0,
      referral_code: customer.referral_code,
      created_at: customer.created_at,
    },
    history,
    pointsHistory,
    activeCoupon: activeCoupon ?? null,
    rewards: rewards ?? [],
  })
}

/**
 * PATCH /api/admin/customers/[id]
 *
 * Edita dados do customer (nome, email). Não permite trocar phone
 * (chave de match com clients universal).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(req, { key: 'admin-customer-edit', limit: 30, windowSeconds: 60 })
  if (rl) return rl

  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const updates: { name?: string; email?: string | null } = {}

  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim()
  if ('email' in body) updates.email = body.email?.trim?.() || null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no_changes' }, { status: 400 })
  }

  // Validacao via business+owner (mesma logica do GET)
  const { data: customer } = await supabase
    .from('customers')
    .select('id, business_id, phone')
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

  const { error: custErr } = await supabase.from('customers').update(updates).eq('id', id)
  if (custErr) return NextResponse.json({ error: 'update_failed' }, { status: 500 })

  // Espelha em `clients` (universal) — mesmo phone
  if (updates.name || 'email' in updates) {
    await supabase.from('clients').update(updates).eq('phone', customer.phone)
  }

  return NextResponse.json({ ok: true })
}
