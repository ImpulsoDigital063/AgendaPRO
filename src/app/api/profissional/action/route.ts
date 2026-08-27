import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendClientNotification } from '@/lib/email'
import { notifyWaitlistForCancelledSlot } from '@/lib/waitlist'
import { canCompleteAppointment } from '@/lib/appointment-status'
import { checkRateLimit } from '@/lib/rate-limit-api'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'prof-action', limit: 60, windowSeconds: 60 })
  if (rl) return rl

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  // Identifica o profissional logado
  const { data: professional } = await supabase
    .from('professionals')
    .select('id, name, business_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!professional) {
    return NextResponse.json({ error: 'Profissional não encontrado.' }, { status: 403 })
  }

  const { appointmentId, action, paymentMethod, cardDetails } = await req.json()

  if (!appointmentId || !['confirmed', 'cancelled', 'completed', 'no_show'].includes(action)) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  // paymentMethod só faz sentido quando concluindo o atendimento.
  // Quando vem, marca paid_at + payment_method no MESMO update (atômico).
  // Quando não vem, status muda mas pagamento fica pendente — admin
  // confirma depois no Financeiro.
  // 'courtesy' aceito como legacy (V34). UI nova produz 'points' no lugar.
  const VALID_METHODS = new Set(['pix', 'cash', 'card', 'courtesy', 'points'])
  const VALID_CARD_TYPES = new Set(['credit', 'debit'])
  if (paymentMethod != null && !VALID_METHODS.has(paymentMethod)) {
    return NextResponse.json(
      { error: 'método de pagamento inválido' },
      { status: 400 }
    )
  }
  if (paymentMethod != null && action !== 'completed') {
    return NextResponse.json(
      { error: 'paymentMethod só pode acompanhar action=completed' },
      { status: 400 }
    )
  }

  // cardDetails é opcional · usado pra registrar snapshot de taxa quando method='card'
  if (cardDetails) {
    if (paymentMethod !== 'card') {
      return NextResponse.json({ error: 'cardDetails só com paymentMethod=card' }, { status: 400 })
    }
    if (cardDetails.card_type && !VALID_CARD_TYPES.has(cardDetails.card_type)) {
      return NextResponse.json({ error: 'card_type inválido' }, { status: 400 })
    }
    if (
      cardDetails.fee_percent != null &&
      (typeof cardDetails.fee_percent !== 'number' || cardDetails.fee_percent < 0 || cardDetails.fee_percent >= 100)
    ) {
      return NextResponse.json({ error: 'fee_percent inválido' }, { status: 400 })
    }
  }

  const adminClient = getAdminClient()

  // Verifica se o agendamento pertence a este profissional
  const { data: appointment } = await adminClient
    .from('appointments')
    .select('*, business:businesses(name, slug, prof_registra_pagamento, prof_cancela_agendamento)')
    .eq('id', appointmentId)
    .eq('professional_id', professional.id)
    .single()

  if (!appointment) {
    return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 })
  }

  /* Negócio que tirou o recebimento da mão da profissional (CAF · decisão do
     Gustavo em 20/08): ela marca que atendeu, o dinheiro é registrado pelo Adm
     ou pela recepção. A UI já esconde a escolha, mas quem manda é o servidor —
     tela escondida não é regra, é sugestão. Default do campo é TRUE, então
     nenhum outro negócio sente. */
  if (paymentMethod != null && appointment.business?.prof_registra_pagamento === false) {
    return NextResponse.json(
      { error: 'Neste negócio o pagamento é registrado pelo Adm ou pela recepção.' },
      { status: 403 }
    )
  }

  /* v131 · negócio que reservou o cancelamento pra dona e recepção (Studio
     Isis Melo). Ela confirma e conclui, mas não desmarca — desmarcar mexe na
     agenda de todo mundo e na fila de espera. Mesmo raciocínio do campo acima:
     a UI esconde o botão, o servidor é quem recusa. Default TRUE, então
     nenhum outro negócio sente. */
  if (action === 'cancelled' && appointment.business?.prof_cancela_agendamento === false) {
    return NextResponse.json(
      { error: 'Neste negócio o cancelamento é feito pelo Adm ou pela recepção.' },
      { status: 403 }
    )
  }

  // Bloqueia "completed" antes da janela de 15min pré-agendamento.
  // Defesa em profundidade: o botão já fica disabled no card, mas
  // request adulterada (ou bot) podia marcar. Server diz a verdade.
  if (
    action === 'completed' &&
    !canCompleteAppointment(appointment.appointment_date, appointment.start_time)
  ) {
    return NextResponse.json(
      { error: 'Só é possível concluir a partir de 15min antes do horário agendado.' },
      { status: 400 }
    )
  }

  // Update atômico: status + (opcionalmente) paid_at/payment_method.
  // 1 round-trip em vez de 2 — evita estado intermediário inconsistente
  // (status=completed sem paid_at quando deveria ter).
  const updates: {
    status: string
    paid_at?: string
    payment_method?: string
    payment_device_id?: string | null
    payment_card_brand?: string | null
    payment_card_type?: string | null
    payment_fee_percent?: number | null
    payment_installments?: number
  } = {
    status: action,
  }
  if (paymentMethod != null) {
    updates.paid_at = new Date().toISOString()
    updates.payment_method = paymentMethod

    if (paymentMethod === 'card' && cardDetails) {
      // Validação cross-business: device tem que pertencer ao business do profissional
      if (cardDetails.device_id) {
        const { data: device } = await adminClient
          .from('merchant_devices')
          .select('id')
          .eq('id', cardDetails.device_id)
          .eq('business_id', professional.business_id)
          .maybeSingle()
        if (!device) {
          return NextResponse.json({ error: 'maquininha não pertence a este negócio' }, { status: 400 })
        }
      }
      updates.payment_device_id = cardDetails.device_id ?? null
      updates.payment_card_brand = cardDetails.card_brand ?? null
      updates.payment_card_type = cardDetails.card_type ?? null
      updates.payment_fee_percent = cardDetails.fee_percent ?? null
      updates.payment_installments =
        typeof cardDetails.installments === 'number' && cardDetails.installments >= 1 && cardDetails.installments <= 12
          ? cardDetails.installments
          : 1
    }
  }

  const { error: updateError } = await adminClient
    .from('appointments')
    .update(updates)
    .eq('id', appointmentId)

  if (updateError) {
    return NextResponse.json({ error: 'Erro ao atualizar.' }, { status: 500 })
  }

  // Registra no activity log
  const actionLabels: Record<string, { label: string; key: string }> = {
    confirmed: { label: 'confirmou', key: 'confirm' },
    cancelled: { label: 'cancelou', key: 'cancel' },
    completed: { label: 'concluiu', key: 'complete' },
    no_show: { label: 'marcou no-show de', key: 'no_show' },
  }
  const { label: actionLabel, key: actionKey } = actionLabels[action]
  await adminClient.from('activity_log').insert({
    business_id: professional.business_id,
    professional_id: professional.id,
    action: actionKey,
    target_type: 'appointment',
    target_id: appointmentId,
    description: `${professional.name} ${actionLabel} agendamento de ${appointment.client_name} (${appointment.appointment_date} às ${appointment.start_time.slice(0, 5)})`,
  })

  // Notifica cliente por email
  if (appointment.client_email) {
    sendClientNotification({
      clientEmail: appointment.client_email,
      clientName: appointment.client_name,
      businessName: appointment.business?.name || 'estabelecimento',
      date: appointment.appointment_date,
      startTime: appointment.start_time.slice(0, 5),
      confirmed: action === 'confirmed',
      serviceName: appointment.service_name ?? null,
    }).catch(() => {})
  }

  // Se cancelou, notifica TODOS da fila de espera (corrida pra reagendar)
  if (action === 'cancelled') {
    notifyWaitlistForCancelledSlot({
      professional_id: professional.id,
      appointment_date: appointment.appointment_date,
      start_time: appointment.start_time,
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true, action })
}
