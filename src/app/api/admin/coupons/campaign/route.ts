import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

// 40 dias — alinhado com ClientesView. Barbearia/nail tem ciclo
// curto (15-30d), 60 era tarde demais.
const SUMIDO_DAYS = 40

/**
 * POST /api/admin/coupons/campaign
 * Body: {
 *   discount_type: 'fixed' | 'percent',
 *   discount_value: number,
 *   validity_days: number,
 *   message_template: string,  // template com placeholders
 *   target?: 'sumidos' (default)
 * }
 *
 * Cria uma campanha gerando 1 cupom por cliente sumido (≥60 dias
 * sem agendamento). Retorna campaign_id + lista de cupons criados
 * com o customer_id e a mensagem pronta pra enviar via WhatsApp.
 *
 * Performance: 1 query pra pegar customers com ultimo agendamento,
 * 1 INSERT em batch pros cupons. Sem N+1.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id, slug, name, description')
    .eq('owner_id', user.id)
    .single()
  if (!business) return NextResponse.json({ error: 'business_not_found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const discount_type = body.discount_type === 'percent' ? 'percent' : 'fixed'
  const discount_value = Number(body.discount_value)
  const validity_days = Number(body.validity_days)
  const message_template = typeof body.message_template === 'string' ? body.message_template : ''

  if (!Number.isFinite(discount_value) || discount_value <= 0) {
    return NextResponse.json({ error: 'desconto inválido' }, { status: 400 })
  }
  if (discount_type === 'percent' && discount_value > 100) {
    return NextResponse.json({ error: 'percentual máximo 100%' }, { status: 400 })
  }
  if (!Number.isFinite(validity_days) || validity_days < 1 || validity_days > 365) {
    return NextResponse.json({ error: 'validade deve ser entre 1 e 365 dias' }, { status: 400 })
  }
  if (!message_template.trim()) {
    return NextResponse.json({ error: 'mensagem obrigatória' }, { status: 400 })
  }

  // 1. Customers do business com ultimo agendamento >= SUMIDO_DAYS
  // Estrategia: traz todos customers + último appointment_date via JOIN.
  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, phone, email')
    .eq('business_id', business.id)

  if (!customers || customers.length === 0) {
    return NextResponse.json({ error: 'sem clientes' }, { status: 400 })
  }

  // Pega ultimo agendamento de cada client (joinado por phone)
  const { data: clients } = await supabase
    .from('clients')
    .select('id, phone')
    .in('phone', customers.map((c) => c.phone))

  const clientByPhone = new Map((clients || []).map((c) => [c.phone, c.id]))
  const clientIds = Array.from(clientByPhone.values())

  // Ultimo appointment de cada client_id
  const { data: lastAppts } = clientIds.length > 0
    ? await supabase
        .from('appointments')
        .select('client_id, appointment_date')
        .eq('business_id', business.id)
        .in('client_id', clientIds)
        .order('appointment_date', { ascending: false })
    : { data: [] }

  const lastByClient = new Map<string, string>()
  for (const a of lastAppts || []) {
    if (!a.client_id) continue
    if (!lastByClient.has(a.client_id)) {
      lastByClient.set(a.client_id, a.appointment_date)
    }
  }

  const today = new Date()
  const sumidoCutoff = new Date(today)
  sumidoCutoff.setDate(sumidoCutoff.getDate() - SUMIDO_DAYS)
  const sumidoCutoffStr = sumidoCutoff.toISOString().split('T')[0]

  // Customers sumidos (lastDate antes do cutoff)
  const sumidoCustomersAll = customers.filter((c) => {
    const clientId = clientByPhone.get(c.phone)
    if (!clientId) return false // customer sem agendamento na vida
    const lastDate = lastByClient.get(clientId)
    if (!lastDate) return false
    return lastDate < sumidoCutoffStr
  })

  // Filtra os que JA tem cupom ativo — não regera (evita spam ao
  // cliente final + protege admin de queimar 2 cupons pra mesma
  // pessoa). Defense-in-depth: UI ja oculta o card, mas API tambem
  // valida.
  const nowIso = new Date().toISOString()
  const { data: activeCoupons } = await supabase
    .from('coupons')
    .select('customer_id')
    .eq('business_id', business.id)
    .is('used_at', null)
    .gt('expires_at', nowIso)

  const activeCustomerIds = new Set(
    (activeCoupons || []).map((c: { customer_id: string | null }) => c.customer_id).filter(Boolean) as string[]
  )

  const sumidoCustomers = sumidoCustomersAll.filter((c) => !activeCustomerIds.has(c.id))

  if (sumidoCustomers.length === 0) {
    const reason = sumidoCustomersAll.length > 0
      ? `todos os ${sumidoCustomersAll.length} sumido(s) já têm cupom ativo. Aguarde expirar ou usar.`
      : `nenhum cliente sumido (sem agendamento há ${SUMIDO_DAYS}+ dias)`
    return NextResponse.json({ error: reason, sumidoDays: SUMIDO_DAYS }, { status: 400 })
  }

  // 2. Gerar cupons. Code via DB function (gera unico).
  const campaign_id = randomUUID()
  const expires_at = new Date()
  expires_at.setDate(expires_at.getDate() + validity_days)

  // Pra cada customer sumido, gera 1 cupom. Faz batch insert.
  // Codigo: gera client-side com retry pra colisao (raro, alphabet 32^6).
  const codes = new Set<string>()
  function genCode() {
    // Prefixo "PRO" reforça branding AgendaPRO no link enviado por
    // WhatsApp (cliente vê "?cupom=PROXX99" e absorve a marca).
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let c = 'PRO'
    for (let i = 0; i < 5; i++) c += alphabet[Math.floor(Math.random() * alphabet.length)]
    return c
  }

  const couponsToInsert = sumidoCustomers.map((cust) => {
    let code = genCode()
    while (codes.has(code)) code = genCode()
    codes.add(code)
    return {
      business_id: business.id,
      customer_id: cust.id,
      code,
      discount_type,
      discount_value,
      expires_at: expires_at.toISOString(),
      campaign_id,
      whatsapp_message: message_template, // template original; client-side substitui placeholders ao enviar
    }
  })

  const { data: insertedCoupons, error: insertErr } = await supabase
    .from('coupons')
    .insert(couponsToInsert)
    .select('*')

  if (insertErr) {
    console.error('coupons insert error:', insertErr)
    return NextResponse.json({ error: 'falha ao criar cupons' }, { status: 500 })
  }

  // 3. Monta retorno: customer + cupom
  const customerById = new Map(sumidoCustomers.map((c) => [c.id, c]))
  const enriched = (insertedCoupons || []).map((cp) => ({
    coupon: cp,
    customer: customerById.get(cp.customer_id || ''),
  }))

  revalidatePath('/admin/clientes')
  revalidatePath('/admin/clientes/cupons')

  return NextResponse.json({
    ok: true,
    campaign_id,
    coupons: enriched,
    business: {
      slug: business.slug,
      name: business.name,
      description: business.description,
    },
  })
}
