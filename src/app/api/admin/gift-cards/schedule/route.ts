import { NextResponse } from 'next/server'
import { confirmarAgendamento } from '@/lib/mensagens/confirmar'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { resolveBusinessIdOperacao as getBusinessId } from '@/lib/api-business-access'

function getAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  const eh = Math.floor(total / 60) % 24
  const em = total % 60
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
}

/**
 * POST /api/admin/gift-cards/schedule · agenda 1 sessão de um vale modo 'services'.
 * Igual a packages/schedule, porém pro cartão presente.
 * Body: {
 *   gift_card_id: string
 *   gift_card_service_id: string
 *   professional_id: string
 *   appointment_date: 'YYYY-MM-DD'
 *   start_time: 'HH:MM'
 *   notes?: string
 * }
 *
 * disponivel = gift_card_service.sessions_total − COUNT(gift_card_sessions
 *              do serviço com status IN ('reserved','consumed')).
 * A presenteada = recipient_customer_id do vale (client_name/customer_id);
 * se null, usa recipient_name como client_name e customer_id null.
 *
 * Cria appointment total_price = 0 (trigger cria comanda R$0 · aceitável) +
 * gift_card_sessions status 'reserved'. NÃO cria invoice/invoice_item aqui.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'no_business' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  const giftCardId = typeof body.gift_card_id === 'string' ? body.gift_card_id : null
  const giftCardServiceId = typeof body.gift_card_service_id === 'string' ? body.gift_card_service_id : null
  const professionalId = typeof body.professional_id === 'string' ? body.professional_id : null
  const appointmentDate = typeof body.appointment_date === 'string' ? body.appointment_date : null
  const startTime = typeof body.start_time === 'string' ? body.start_time : null
  const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null

  if (!giftCardId) return NextResponse.json({ error: 'gift_card_id_required' }, { status: 400 })
  if (!giftCardServiceId) return NextResponse.json({ error: 'gift_card_service_id_required' }, { status: 400 })
  if (!professionalId) return NextResponse.json({ error: 'professional_id_required' }, { status: 400 })
  if (!appointmentDate || !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) return NextResponse.json({ error: 'appointment_date_required' }, { status: 400 })
  if (!startTime || !/^\d{2}:\d{2}$/.test(startTime)) return NextResponse.json({ error: 'start_time_required' }, { status: 400 })

  const admin = getAdmin()

  // 1. Carrega o vale + valida ownership
  const { data: gift } = await admin
    .from('gift_cards')
    .select('id, business_id, mode, status, expires_at, recipient_customer_id, recipient_name')
    .eq('id', giftCardId)
    .maybeSingle()
  if (!gift) return NextResponse.json({ error: 'gift_card_not_found' }, { status: 404 })
  if (gift.business_id !== businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (gift.mode !== 'services') return NextResponse.json({ error: 'gift_card_not_services_mode' }, { status: 400 })
  if (gift.status !== 'active') return NextResponse.json({ error: 'gift_card_not_active', detail: gift.status }, { status: 400 })
  if (gift.expires_at && new Date(gift.expires_at) < new Date()) return NextResponse.json({ error: 'gift_card_expired' }, { status: 400 })

  // 2. Carrega o serviço do vale + valida que pertence ao vale
  const { data: gcs } = await admin
    .from('gift_card_services')
    .select('id, gift_card_id, service_id, service_name, sessions_total')
    .eq('id', giftCardServiceId)
    .maybeSingle()
  if (!gcs || gcs.gift_card_id !== gift.id) {
    return NextResponse.json({ error: 'gift_card_service_not_found' }, { status: 404 })
  }

  // 3. Saldo disponível = sessions_total − comprometidas (reserved + consumed)
  const { count: committed } = await admin
    .from('gift_card_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('gift_card_service_id', gcs.id)
    .in('status', ['reserved', 'consumed'])
  const disponivel = Number(gcs.sessions_total) - Number(committed ?? 0)
  if (disponivel <= 0) return NextResponse.json({ error: 'no_sessions_left' }, { status: 400 })

  // 4. Serviço → duração pra calcular end_time
  const { data: service } = await admin
    .from('services')
    .select('id, name, duration_minutes')
    .eq('id', gcs.service_id)
    .maybeSingle()
  const duration = Number(service?.duration_minutes ?? 0) || 30
  const serviceName = gcs.service_name ?? service?.name ?? 'Serviço'
  const endTime = addMinutesToTime(startTime, duration)

  // 5. Presenteada · se é customer, usa o cadastro; senão nome-snapshot avulso.
  let clientName = gift.recipient_name
  let clientPhone = ''
  let customerId: string | null = null
  if (gift.recipient_customer_id) {
    const { data: customer } = await admin
      .from('customers')
      .select('id, name, phone')
      .eq('id', gift.recipient_customer_id)
      .maybeSingle()
    if (customer) {
      customerId = customer.id
      clientName = customer.name
      clientPhone = customer.phone ?? ''
    }
  }

  // 6. Cria o appointment · MESMOS campos do AgendarModal, mas total_price = 0.
  const { data: appt, error: apptErr } = await admin
    .from('appointments')
    .insert({
      business_id: businessId,
      professional_id: professionalId,
      customer_id: customerId,
      client_name: clientName,
      client_phone: clientPhone,
      appointment_date: appointmentDate,
      start_time: `${startTime}:00`,
      end_time: `${endTime}:00`,
      service_id: gcs.service_id,
      service_name: serviceName,
      total_price: 0,
      status: 'confirmed',
      notes,
      recurring_group_id: null,
      recurring_index: null,
    })
    .select('id')
    .single()
  if (apptErr || !appt) return NextResponse.json({ error: `appointment_failed: ${apptErr?.message}` }, { status: 500 })

  // 7. Reserva a vaga · gift_card_sessions status 'reserved'
  //    (reserved_at tem DEFAULT now() na tabela; consumed_at fica null)
  const { data: session, error: sessErr } = await admin
    .from('gift_card_sessions')
    .insert({
      gift_card_id: gift.id,
      gift_card_service_id: gcs.id,
      appointment_id: appt.id,
      professional_id: professionalId,
      status: 'reserved',
    })
    .select('id')
    .single()
  if (sessErr || !session) {
    await admin.from('appointments').delete().eq('id', appt.id) // rollback
    return NextResponse.json({ error: `session_failed: ${sessErr?.message}` }, { status: 500 })
  }

  // 8. Read-after-write · confirma a reserva
  const { data: verify } = await admin
    .from('gift_card_sessions')
    .select('id, status, appointment_id')
    .eq('id', session.id)
    .maybeSingle()
  if (!verify || verify.status !== 'reserved' || verify.appointment_id !== appt.id) {
    return NextResponse.json({ error: 'verify_failed' }, { status: 500 })
  }

  /* Agendamento por cartão presente é agendamento futuro de verdade — "MESMOS
     campos do AgendarModal", diz o comentário da etapa 6. Era o único dos sete
     pontos de criação que não avisava a cliente.

     Com `await` e não `void`: em serverless a resposta encerra a invocação, e
     trabalho pendente pode ser congelado antes de a mensagem sair. É o mesmo
     jeito do `booking/submit`. O try/catch garante que falha de mensagem não
     derrube um agendamento que já está gravado e verificado. */
  try {
    await confirmarAgendamento(admin, appt.id as string)
  } catch {
    /* já gravado — a mensagem é o que falhou, não o agendamento */
  }

  return NextResponse.json({ ok: true, appointment_id: appt.id, session_id: session.id })
}
