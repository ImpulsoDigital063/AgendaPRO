import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * POST · lança um atendimento ANTIGO na ficha do cliente (v121 · 20/08/2026).
 *
 * É registro de histórico, não dinheiro. O insert é sempre:
 *   status='completed'  → o gatilho v70/v71 não cria comanda
 *   total_price=0       → fica fora de "Em aberto" no financeiro
 *   historical=true     → a tela consegue rotular como registro antigo
 *
 * A trava de data no passado vive AQUI também, não só no <input max>:
 * senão bastava mandar outra data no payload pra criar agendamento futuro
 * sem passar por disponibilidade, sinal ou conflito de horário.
 */

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

/** Data de hoje em São Paulo — o servidor da Vercel roda em UTC. */
function hojeBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id: customerId } = await params
  const body = await request.json().catch(() => null)
  if (!body || typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return NextResponse.json({ error: 'invalid_date' }, { status: 400 })
  }
  const serviceName = typeof body.serviceName === 'string' ? body.serviceName.trim() : ''
  if (!serviceName) return NextResponse.json({ error: 'service_required' }, { status: 400 })

  // Registro antigo é ANTIGO: hoje ainda vale (procedimento feito de manhã),
  // amanhã não. Data futura tem outro caminho — a agenda.
  if (body.date > hojeBR()) {
    return NextResponse.json({ error: 'date_must_be_past' }, { status: 400 })
  }

  const admin = getAdmin()
  const { data: cust } = await admin
    .from('customers')
    .select('id, business_id, name, phone')
    .eq('id', customerId)
    .maybeSingle()
  if (!cust || cust.business_id !== businessId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // Profissional é opcional, mas se vier tem que ser da casa.
  let professionalId: string | null = null
  if (body.professionalId) {
    const { data: prof } = await admin
      .from('professionals')
      .select('id, business_id')
      .eq('id', body.professionalId)
      .maybeSingle()
    if (!prof || prof.business_id !== businessId) {
      return NextResponse.json({ error: 'professional_not_found' }, { status: 400 })
    }
    professionalId = prof.id
  }

  // Serviço do catálogo é opcional — histórico antigo costuma ter nome que
  // não existe mais na lista de hoje, então o nome digitado é o que manda.
  let serviceId: string | null = null
  if (body.serviceId) {
    const { data: svc } = await admin
      .from('services')
      .select('id, business_id')
      .eq('id', body.serviceId)
      .maybeSingle()
    if (svc && svc.business_id === businessId) serviceId = svc.id
  }

  // Liga o cliente universal (clients), igual o AgendarModal faz: sem isso o
  // atendimento não aparece nas contagens de /admin/clientes.
  let clientId: string | null = null
  const phone = (cust.phone ?? '').trim()
  if (phone) {
    const { data: existing } = await admin.from('clients').select('id').eq('phone', phone).maybeSingle()
    if (existing) {
      clientId = existing.id
    } else {
      const { data: created } = await admin
        .from('clients')
        .insert({ name: cust.name || 'Cliente', phone, email: null })
        .select('id')
        .single()
      clientId = created?.id ?? null
    }
  }

  const { data, error } = await admin
    .from('appointments')
    .insert({
      business_id: businessId,
      professional_id: professionalId,
      customer_id: cust.id,
      client_id: clientId,
      client_name: cust.name,
      client_phone: phone, // client_phone é NOT NULL
      appointment_date: body.date,
      // Horário não é o ponto num registro antigo; grava um marcador estável
      // em vez de inventar hora que a dona não lembra.
      start_time: '00:00:00',
      end_time: '00:00:00',
      service_id: serviceId,
      service_name: serviceName,
      total_price: 0,
      status: 'completed',
      historical: true,
      notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
    })
    .select('id, appointment_date, service_name, historical, status, total_price')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // λ.prova-na-fonte — devolve a row lida do banco, não o payload que entrou.
  return NextResponse.json({ ok: true, appointment: data })
}
