import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

async function getBusinessId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: owner } = await supabase.from('businesses').select('id').eq('owner_id', user.id).maybeSingle()
  if (owner) return owner.id
  const { data: prof } = await supabase
    .from('professionals')
    .select('business_id')
    .eq('auth_user_id', user.id)
    .eq('active', true)
    .eq('is_receptionist', true)
    .maybeSingle()
  return prof?.business_id ?? null
}

function getAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

/**
 * GET /api/admin/packages/consume?customer_id=&service_id=
 * Retorna pacotes ativos do cliente que cobrem aquele serviço (com saldo > 0)
 * Usado pra mostrar opções no momento de adicionar serviço à comanda.
 *
 * Response: { options: [{ balance_id, customer_package_id, package_name, sessions_remaining, expires_at }] }
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const customerId = url.searchParams.get('customer_id')
  const serviceId = url.searchParams.get('service_id')
  if (!customerId || !serviceId) {
    return NextResponse.json({ error: 'customer_id_and_service_id_required' }, { status: 400 })
  }

  const admin = getAdmin()

  // Busca balances ativos do cliente pra esse serviço
  const { data: balances } = await admin
    .from('customer_package_balances')
    .select(`
      id, sessions_total, sessions_used, service_id,
      customer_packages!inner (
        id, business_id, customer_id, package_name, expires_at, status
      )
    `)
    .eq('service_id', serviceId)

  const now = new Date()
  type BalanceRow = {
    id: string
    sessions_total: number
    sessions_used: number
    customer_packages: {
      id: string
      business_id: string
      customer_id: string
      package_name: string
      expires_at: string | null
      status: string
    } | {
      id: string
      business_id: string
      customer_id: string
      package_name: string
      expires_at: string | null
      status: string
    }[] | null
  }

  const options: Array<{
    balance_id: string
    customer_package_id: string
    package_name: string
    sessions_remaining: number
    expires_at: string | null
  }> = []

  for (const row of (balances ?? []) as BalanceRow[]) {
    const cp = Array.isArray(row.customer_packages) ? row.customer_packages[0] : row.customer_packages
    if (!cp) continue
    if (cp.business_id !== businessId) continue
    if (cp.customer_id !== customerId) continue
    if (cp.status !== 'active') continue
    if (cp.expires_at && new Date(cp.expires_at) < now) continue
    const remaining = row.sessions_total - row.sessions_used
    if (remaining <= 0) continue
    options.push({
      balance_id: row.id,
      customer_package_id: cp.id,
      package_name: cp.package_name,
      sessions_remaining: remaining,
      expires_at: cp.expires_at,
    })
  }

  return NextResponse.json({ options })
}

/**
 * POST /api/admin/packages/consume
 * Body: {
 *   balance_id: string         // qual saldo consumir (1 sessão)
 *   appointment_id?: string    // agendamento que consumiu (opcional)
 *   professional_id?: string
 *   invoice_item_id?: string   // o item da comanda que ficou R$0 graças ao pacote
 * }
 *
 * Efeitos:
 *  - Cria customer_package_sessions (1 row)
 *  - Incrementa sessions_used no balance
 *  - Se balance esgota OU todos os balances do customer_package esgotam:
 *      customer_packages.status = 'used_up'
 *
 * Read-after-write: confirma sessions_used incrementou.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  const balanceId = typeof body.balance_id === 'string' ? body.balance_id : null
  if (!balanceId) return NextResponse.json({ error: 'balance_id_required' }, { status: 400 })

  const appointmentId = typeof body.appointment_id === 'string' ? body.appointment_id : null
  const professionalId = typeof body.professional_id === 'string' ? body.professional_id : null

  const admin = getAdmin()

  // Valida balance + ownership via customer_package
  const { data: balance } = await admin
    .from('customer_package_balances')
    .select(`
      id, sessions_total, sessions_used, customer_package_id,
      customer_packages (id, business_id, status, expires_at)
    `)
    .eq('id', balanceId)
    .maybeSingle()

  if (!balance) return NextResponse.json({ error: 'balance_not_found' }, { status: 404 })
  const cp = Array.isArray(balance.customer_packages) ? balance.customer_packages[0] : balance.customer_packages
  if (!cp || cp.business_id !== businessId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (cp.status !== 'active') {
    return NextResponse.json({ error: 'package_not_active', detail: cp.status }, { status: 400 })
  }
  if (cp.expires_at && new Date(cp.expires_at) < new Date()) {
    return NextResponse.json({ error: 'package_expired' }, { status: 400 })
  }
  if (balance.sessions_used >= balance.sessions_total) {
    return NextResponse.json({ error: 'no_sessions_left' }, { status: 400 })
  }

  // Registra sessão
  const { error: sessErr } = await admin
    .from('customer_package_sessions')
    .insert({
      customer_package_id: balance.customer_package_id,
      balance_id: balance.id,
      appointment_id: appointmentId,
      professional_id: professionalId,
    })
  if (sessErr) return NextResponse.json({ error: sessErr.message }, { status: 500 })

  // Incrementa sessions_used
  const newUsed = balance.sessions_used + 1
  await admin
    .from('customer_package_balances')
    .update({ sessions_used: newUsed })
    .eq('id', balance.id)

  // Verifica se todos os balances do package esgotaram → marca como used_up
  const { data: allBalances } = await admin
    .from('customer_package_balances')
    .select('sessions_total, sessions_used')
    .eq('customer_package_id', balance.customer_package_id)
  const totalRemaining = (allBalances ?? []).reduce(
    (s, b) => s + (Number(b.sessions_total) - Number(b.sessions_used)),
    0,
  )
  if (totalRemaining <= 0) {
    await admin
      .from('customer_packages')
      .update({ status: 'used_up' })
      .eq('id', balance.customer_package_id)
  }

  // Read-after-write
  const { data: verify } = await admin
    .from('customer_package_balances')
    .select('sessions_used')
    .eq('id', balance.id)
    .maybeSingle()
  if (!verify || Number(verify.sessions_used) !== newUsed) {
    return NextResponse.json({ error: 'verify_failed' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    sessions_used: newUsed,
    sessions_total: balance.sessions_total,
    package_status: totalRemaining <= 0 ? 'used_up' : 'active',
  })
}

/**
 * DELETE /api/admin/packages/consume?session_id=
 * Reverte uma consumo (ex: cancelou atendimento que tinha consumido sessão).
 * Decrementa sessions_used + remove a session row + se status era 'used_up' volta pra 'active'.
 */
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const sessionId = url.searchParams.get('session_id')
  if (!sessionId) return NextResponse.json({ error: 'session_id_required' }, { status: 400 })

  const admin = getAdmin()

  const { data: session } = await admin
    .from('customer_package_sessions')
    .select(`
      id, balance_id, customer_package_id,
      customer_packages (business_id, status)
    `)
    .eq('id', sessionId)
    .maybeSingle()
  if (!session) return NextResponse.json({ error: 'session_not_found' }, { status: 404 })
  const cp = Array.isArray(session.customer_packages) ? session.customer_packages[0] : session.customer_packages
  if (!cp || cp.business_id !== businessId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // Decrementa balance
  const { data: bal } = await admin
    .from('customer_package_balances')
    .select('sessions_used')
    .eq('id', session.balance_id)
    .maybeSingle()
  const newUsed = Math.max(0, Number(bal?.sessions_used ?? 0) - 1)
  await admin.from('customer_package_balances').update({ sessions_used: newUsed }).eq('id', session.balance_id)

  // Remove session row
  await admin.from('customer_package_sessions').delete().eq('id', sessionId)

  // Se status era used_up · volta pra active
  if (cp.status === 'used_up') {
    await admin
      .from('customer_packages')
      .update({ status: 'active' })
      .eq('id', session.customer_package_id)
  }

  return NextResponse.json({ ok: true })
}
