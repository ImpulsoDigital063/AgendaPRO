import { NextRequest, NextResponse } from 'next/server'
import { calcularSinal, gerarBRCode } from '@/lib/pix-brcode'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit-api'

/**
 * POST /api/booking/submit
 *
 * Endpoint PUBLICO (sem auth) — chamado pelo BookingFlow do cliente final.
 * Move pro server TODA a escrita que antes o navegador fazia direto como
 * anon (clients, customers, appointments, appointment_services), pra que
 * essas tabelas possam ter RLS ligado e travado (alerta Supabase 31/05/2026,
 * fix de segurança Fase 1). Mesmo padrão de /api/coupons/use.
 *
 * Espelha exatamente o antigo handleSubmit:
 *   1. upsert clients (cadastro global por telefone)
 *   2. upsert customers do business (+ birthday opcional + referral)
 *   3. checagem de conflito de horário
 *   4. insert appointment (constraint v40 23P01 = anti-overbooking)
 *   5. insert appointment_services
 *   6. marca referred_by quando cliente novo veio por link de indicação
 *
 * Retorna { appointmentId, referralCode, pointsEarned } pro client montar
 * o link de indicação (com window.location.origin) e a tela de sucesso.
 * Cupom e notificação seguem em rotas server próprias já existentes
 * (/api/coupons/use, /api/notify), chamadas pelo client após o sucesso.
 */

type ServiceInput = {
  id: string
  name: string
  price: number | null
  duration_minutes: number | null
  points: number | null
}

function admin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// v42 · birthday opcional · round-trip pra rejeitar data irreal (30/02 etc)
function parseBirthday(raw: string): string | null {
  const input = (raw || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null
  const [by, bm, bd] = input.split('-').map(Number)
  const d = new Date(`${input}T00:00:00Z`)
  const isReal = d.getUTCFullYear() === by && d.getUTCMonth() + 1 === bm && d.getUTCDate() === bd
  const isPastOrToday = d.getTime() <= Date.now()
  return isReal && isPastOrToday ? input : null
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'booking-submit', limit: 20, windowSeconds: 60 })
  if (rl) return rl

  const body = await req.json().catch(() => ({}))
  const businessId = typeof body.businessId === 'string' ? body.businessId : ''
  const professionalId = typeof body.professionalId === 'string' ? body.professionalId : ''
  const returningClientId = typeof body.clientId === 'string' && body.clientId ? body.clientId : null
  const name = typeof body.clientName === 'string' ? body.clientName.trim() : ''
  const phone = typeof body.clientPhone === 'string' ? body.clientPhone.trim() : ''
  const email = typeof body.clientEmail === 'string' && body.clientEmail.trim() ? body.clientEmail.trim() : null
  const validBirthday = parseBirthday(typeof body.clientBirthday === 'string' ? body.clientBirthday : '')
  const services: ServiceInput[] = Array.isArray(body.services) ? body.services : []
  const appointmentDate = typeof body.date === 'string' ? body.date : ''
  const startTime = typeof body.startTime === 'string' ? body.startTime : ''
  const endTime = typeof body.endTime === 'string' ? body.endTime : ''
  const referralCode = typeof body.referralCode === 'string' && body.referralCode ? body.referralCode : null
  const totalPrice = typeof body.totalPrice === 'number' ? body.totalPrice : null
  const hasPrice = body.hasPrice === true

  if (!businessId || !professionalId || !name || !phone || !appointmentDate || !startTime || !endTime) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
  }

  const db = admin()

  // Valida que o professional pertence ao business e está ativo
  // (anti-cross-business / payload forjado — antes a anon key garantia
  // só pelo RLS inexistente; agora validamos explicitamente).
  const { data: prof } = await db
    .from('professionals')
    .select('id, business_id, active')
    .eq('id', professionalId)
    .maybeSingle()

  if (!prof || prof.business_id !== businessId || !prof.active) {
    return NextResponse.json({ error: 'invalid_professional' }, { status: 400 })
  }

  // 1. Criar ou recuperar cliente global (clients) — match por phone trim,
  //    igual ao handleSubmit original.
  let clientId: string | null = returningClientId
  if (!clientId) {
    const { data: existing } = await db.from('clients').select('id').eq('phone', phone).maybeSingle()
    if (existing) {
      clientId = existing.id
      await db.from('clients').update({ name, email }).eq('id', clientId)
    } else {
      const { data: created } = await db
        .from('clients')
        .insert({ name, phone, email })
        .select('id')
        .single()
      clientId = created?.id ?? null
    }
  }

  // 1b. Criar ou recuperar customer do business (pontos/fidelidade)
  const { data: existingCustomer } = await db
    .from('customers')
    .select('id, total_points, birthday')
    .eq('business_id', businessId)
    .eq('phone', phone)
    .maybeSingle()

  let customerId: string | null = existingCustomer?.id ?? null
  let referralCodeOut: string | null = null

  if (!customerId) {
    const insertData: Record<string, unknown> = { business_id: businessId, name, phone, email }
    if (validBirthday) insertData.birthday = validBirthday
    const { data: newCustomer } = await db
      .from('customers')
      .insert(insertData)
      .select('id, referral_code')
      .single()
    customerId = newCustomer?.id ?? null
    referralCodeOut = newCustomer?.referral_code ?? null
  } else {
    const { data: existingFull } = await db
      .from('customers')
      .select('referral_code')
      .eq('id', customerId)
      .single()
    referralCodeOut = existingFull?.referral_code ?? null
    // "preenche se faltar" — não sobrescreve birthday prévio
    if (validBirthday && !existingCustomer?.birthday) {
      await db.from('customers').update({ birthday: validBirthday }).eq('id', customerId)
    }
  }

  // 2. Conflito de horário (proteção pré-insert; a constraint v40 é a final)
  const { data: conflict } = await db
    .from('appointments')
    .select('id')
    .eq('professional_id', professionalId)
    .eq('appointment_date', appointmentDate)
    .in('status', ['pending', 'confirmed'])
    .lt('start_time', endTime)
    .gt('end_time', startTime)
    .limit(1)
    .maybeSingle()

  if (conflict) {
    return NextResponse.json({ error: 'overlap' }, { status: 409 })
  }

  /* SINAL (v112) · pedido da Wanessa Silva em 05/08.
     ───────────────────────────────────────────────────────────────
     Quando o negocio liga o sinal, o horario NAO nasce confirmado: fica
     pendente ate o dono ver o PIX cair e marcar. E o fluxo que ela
     descreveu e ja usa na academia dela.

     O valor e congelado aqui, no ato da marcacao: se o percentual do
     negocio mudar amanha, quem marcou hoje continua devendo o que foi
     combinado hoje.

     Servico sem preco (DN Diogo) nao gera sinal — nao da pra cobrar
     percentual de um valor que ainda nao existe. */
  const { data: negocio } = await db
    .from('businesses')
    .select('sinal_enabled, sinal_percent, pix_key, pix_receiver_name, pix_city')
    .eq('id', businessId)
    .maybeSingle()

  const exigeSinal =
    negocio?.sinal_enabled === true &&
    !!negocio?.pix_key &&
    hasPrice &&
    !!totalPrice &&
    totalPrice > 0
  const valorSinal = exigeSinal
    ? calcularSinal(totalPrice as number, Number(negocio?.sinal_percent ?? 0))
    : null

  // 3. Criar agendamento
  const firstService = services[0] ?? null
  const { data: appointment, error: apptErr } = await db
    .from('appointments')
    .insert({
      business_id: businessId,
      professional_id: professionalId,
      client_id: clientId,
      client_name: name,
      client_phone: phone,
      client_email: email,
      service_id: firstService?.id ?? null,
      service_name: firstService?.name ?? null,
      total_price: hasPrice ? totalPrice : null,
      appointment_date: appointmentDate,
      start_time: startTime,
      end_time: endTime,
      status: valorSinal ? 'pending' : 'confirmed',
      sinal_valor: valorSinal,
    })
    .select('id')
    .single()

  if (apptErr || !appointment) {
    // 23P01 = exclusion_violation (constraint no_overlap_appointments v40)
    const code = (apptErr as { code?: string } | null)?.code
    const isOverlap =
      code === '23P01' ||
      apptErr?.message?.includes('horário') ||
      apptErr?.message?.includes('no_overlap')
    if (isOverlap) return NextResponse.json({ error: 'overlap' }, { status: 409 })
    console.error('booking submit · appointment insert error:', apptErr)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }

  // 4. Serviços do agendamento
  if (services.length > 0) {
    await db.from('appointment_services').insert(
      services.map((s) => ({
        appointment_id: appointment.id,
        service_id: s.id,
        service_name: s.name,
        price: s.price,
        duration_minutes: s.duration_minutes,
      }))
    )
  }

  // 5. referred_by quando cliente NOVO veio por link de indicação
  if (referralCode && customerId && !existingCustomer) {
    const { data: referrer } = await db
      .from('customers')
      .select('id')
      .eq('referral_code', referralCode)
      .eq('business_id', businessId)
      .maybeSingle()
    if (referrer && referrer.id !== customerId) {
      await db.from('customers').update({ referred_by: referrer.id }).eq('id', customerId)
    }
  }

  // 6. Pontos que o cliente VAI ganhar (creditados pelo trigger SQL no completed)
  const pointsEarned = services.reduce((sum, s) => sum + (s.points ?? 0), 0)

  /* Devolve o PIX pronto quando há sinal. O BR Code é montado no servidor
     porque a chave e o nome do recebedor não devem trafegar antes da hora —
     e porque assim a cliente recebe o código exato que o banco espera, sem
     depender de nada rodar certo no celular dela. */
  const pix = valorSinal
    ? {
        valor: valorSinal,
        copiaECola: gerarBRCode({
          chave: negocio!.pix_key as string,
          nomeRecebedor: (negocio as { pix_receiver_name?: string })?.pix_receiver_name || 'RECEBEDOR',
          cidade: (negocio as { pix_city?: string })?.pix_city || 'BRASIL',
          valor: valorSinal,
          identificador: appointment.id.replace(/-/g, '').slice(0, 25),
        }),
      }
    : null

  return NextResponse.json({
    ok: true,
    appointmentId: appointment.id,
    referralCode: referralCodeOut,
    pointsEarned,
    pix,
  })
}
