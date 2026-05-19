import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit-api'

// Valida que a string é uma data ISO REAL (não só "regex passa").
// "2024-02-30" passa no regex YYYY-MM-DD mas não existe — Date corrige
// pra 2024-03-01 silenciosamente. Checamos round-trip pra garantir
// equivalência exata.
function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const date = new Date(`${s}T00:00:00Z`)
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() + 1 === m &&
    date.getUTCDate() === d
  )
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NAME_MAX_LEN = 200

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
    .select('*')
    .eq('id', id)
    .single()

  if (custErr || !customer) {
    return NextResponse.json({ error: 'customer_not_found' }, { status: 404 })
  }

  // Autorização: dono OU recepcionista do business
  const [{ data: business }, { data: prof }] = await Promise.all([
    supabase
      .from('businesses')
      .select('id, slug')
      .eq('id', customer.business_id)
      .eq('owner_id', user.id)
      .maybeSingle(),
    supabase
      .from('professionals')
      .select('id, is_receptionist')
      .eq('business_id', customer.business_id)
      .eq('auth_user_id', user.id)
      .maybeSingle(),
  ])
  const isOwner = !!business
  const isReceptionist = prof?.is_receptionist === true
  if (!isOwner && !isReceptionist) {
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
      // v42 · 14/05/2026 — campos novos (todos nullable)
      birthday: customer.birthday ?? null,
      notes: customer.notes ?? null,
      import_source: customer.import_source ?? null,
      imported_at: customer.imported_at ?? null,
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
  const updates: Record<string, unknown> = {}

  if (typeof body.name === 'string' && body.name.trim()) {
    const trimmedName = body.name.trim()
    if (trimmedName.length > NAME_MAX_LEN) {
      return NextResponse.json({ error: 'name_too_long' }, { status: 400 })
    }
    updates.name = trimmedName
  }
  if ('email' in body) {
    const rawEmail = typeof body.email === 'string' ? body.email.trim() : ''
    if (!rawEmail) {
      updates.email = null
    } else if (!EMAIL_RE.test(rawEmail)) {
      return NextResponse.json({ error: 'email_invalid_format' }, { status: 400 })
    } else {
      updates.email = rawEmail.toLowerCase()
    }
  }
  if ('birthday' in body) {
    const v = body.birthday
    if (v === null || v === '' || v === undefined) {
      updates.birthday = null
    } else if (typeof v === 'string' && isValidIsoDate(v)) {
      updates.birthday = v
    } else {
      return NextResponse.json({ error: 'birthday_invalid_format' }, { status: 400 })
    }
  }
  if ('notes' in body) {
    const v = body.notes
    if (v === null || v === '' || v === undefined) {
      updates.notes = null
    } else if (typeof v === 'string') {
      updates.notes = v.trim().slice(0, 1000)
    }
  }

  // Campos novos v56 · todos texto livre (trim + cap 500 por campo) ou null
  const textFields = [
    'nickname', 'important_note', 'referral_source', 'instagram',
    'cpf', 'rg', 'profession', 'address', 'address_number',
    'address_complement', 'neighborhood', 'city', 'state', 'zip_code',
  ] as const
  for (const f of textFields) {
    if (f in body) {
      const v = body[f]
      if (v === null || v === '' || v === undefined) {
        updates[f] = null
      } else if (typeof v === 'string') {
        updates[f] = v.trim().slice(0, 500)
      }
    }
  }

  // customer_type · enum PF/PJ
  if ('customer_type' in body) {
    const v = body.customer_type
    if (v === 'pf' || v === 'pj') updates.customer_type = v
  }

  // preferred_contact · enum
  if ('preferred_contact' in body) {
    const v = body.preferred_contact
    if (v === null || v === '' || v === undefined) {
      updates.preferred_contact = null
    } else if (typeof v === 'string' && ['whatsapp', 'sms', 'email', 'none'].includes(v)) {
      updates.preferred_contact = v
    }
  }

  // marketing_consent · boolean
  if ('marketing_consent' in body && typeof body.marketing_consent === 'boolean') {
    updates.marketing_consent = body.marketing_consent
  }

  // blocked · boolean + reason
  if ('blocked' in body && typeof body.blocked === 'boolean') {
    updates.blocked = body.blocked
  }
  if ('blocked_reason' in body) {
    const v = body.blocked_reason
    if (v === null || v === '' || v === undefined) updates.blocked_reason = null
    else if (typeof v === 'string') updates.blocked_reason = v.trim().slice(0, 500)
  }

  // sex · enum
  if ('sex' in body) {
    const v = body.sex
    if (v === null || v === '' || v === undefined) {
      updates.sex = null
    } else if (typeof v === 'string' && ['f', 'm', 'other', 'na'].includes(v)) {
      updates.sex = v
    }
  }

  // Ajuste de pontos · soma/subtrai do total_points existente
  if (typeof body.pointsAdjustment === 'number' && body.pointsAdjustment !== 0) {
    // tratado abaixo via RPC ou direto após buscar customer
  }

  const hasPointsAdj = typeof body.pointsAdjustment === 'number' && body.pointsAdjustment !== 0
  if (Object.keys(updates).length === 0 && !hasPointsAdj) {
    return NextResponse.json({ error: 'no_changes' }, { status: 400 })
  }

  // Validacao via business+owner (mesma logica do GET).
  // Lê valores ATUAIS de name/email pra comparar antes de espelhar em
  // `clients` (legado v2 · global por phone) — evita disparar UPDATE em
  // outros businesses que compartilham telefone quando nada mudou.
  const { data: customer } = await supabase
    .from('customers')
    .select('id, business_id, phone, name, email')
    .eq('id', id)
    .single()
  if (!customer) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const [{ data: business }, { data: profPatch }] = await Promise.all([
    supabase
      .from('businesses')
      .select('id')
      .eq('id', customer.business_id)
      .eq('owner_id', user.id)
      .maybeSingle(),
    supabase
      .from('professionals')
      .select('id, is_receptionist')
      .eq('business_id', customer.business_id)
      .eq('auth_user_id', user.id)
      .maybeSingle(),
  ])
  if (!business && profPatch?.is_receptionist !== true) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  if (Object.keys(updates).length > 0) {
    const { error: custErr } = await supabase.from('customers').update(updates).eq('id', id)
    if (custErr) return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  // Ajuste de pontos · cria transaction + atualiza total
  if (hasPointsAdj) {
    const delta = body.pointsAdjustment as number
    const { data: cur } = await supabase
      .from('customers')
      .select('total_points')
      .eq('id', id)
      .maybeSingle()
    const newTotal = Math.max(0, (cur?.total_points ?? 0) + delta)
    await supabase.from('customers').update({ total_points: newTotal }).eq('id', id)
    await supabase.from('points_transactions').insert({
      customer_id: id,
      business_id: customer.business_id,
      points: delta,
      reason: 'manual',
    })
  }

  // Espelha em `clients` (universal v2) APENAS quando name ou email
  // efetivamente mudaram. `clients` é tabela global por phone — se
  // 2 businesses compartilham phone (cliente comum a 2 salões), um
  // UPDATE sem mudança real propagaria estado desnecessariamente.
  // Por isso comparamos com valores atuais antes de tocar.
  const clientsUpdate: { name?: string; email?: string | null } = {}
  if (typeof updates.name === 'string' && updates.name !== customer.name) {
    clientsUpdate.name = updates.name
  }
  if ('email' in updates) {
    const newEmail = (updates.email as string | null | undefined) ?? null
    if (newEmail !== customer.email) clientsUpdate.email = newEmail
  }
  if (Object.keys(clientsUpdate).length > 0) {
    await supabase.from('clients').update(clientsUpdate).eq('phone', customer.phone)
  }

  return NextResponse.json({ ok: true })
}
