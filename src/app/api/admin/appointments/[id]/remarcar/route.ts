import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit-api'
import { blockAppliesTo, blockTimeToMinutes, type BlockRow } from '@/lib/blocks'

/**
 * POST /api/admin/appointments/[id]/remarcar
 *
 * Move um atendimento pra outra data/hora. Criado em 30/07/2026 — até então
 * REMARCAR não existia no produto, nem pra dona: o jeito era cancelar e criar
 * de novo, o que apaga o histórico da cliente, mata a comanda e faz o
 * atendimento sumir da agenda como se ela tivesse desistido. Em salão, cliente
 * ligando pra mudar horário é rotina diária.
 *
 * REGRAS (cravadas com Eduardo 30/07):
 *  · muda data e hora · NÃO muda de profissional (isso é transferir, outro caso)
 *  · dona e recepção remarcam qualquer um
 *  · profissional remarca o DELA sempre; o da colega só com a flag de equipe
 *    (professionals_can_book_others) — mesma régua de marcar e receber
 *  · atendimento JÁ PAGO só a administração remarca (mesma régua do cancelar:
 *    mexer em algo pago é desfazer dinheiro)
 *  · a duração é preservada (fim = início novo + duração antiga)
 *  · recusa se bater em outro atendimento ou em bloqueio, dizendo com quem/qual
 */

function getAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

function minutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function paraHHMM(min: number): string {
  const m = ((min % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = checkRateLimit(req, { key: 'appt-remarcar', limit: 60, windowSeconds: 60 })
  if (rl) return rl

  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const admin = getAdmin()

  const { data: appt } = await admin
    .from('appointments')
    .select('id, business_id, professional_id, appointment_date, start_time, end_time, status, paid_at, client_name')
    .eq('id', id)
    .maybeSingle()
  if (!appt) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  if (appt.status === 'cancelled' || appt.status === 'no_show') {
    return NextResponse.json({
      error: 'cancelado',
      detail: 'Esse atendimento está cancelado. Marque um novo em vez de remarcar.',
    }, { status: 400 })
  }

  // ─── Autorização ────────────────────────────────────────────────────────
  const [{ data: dono }, { data: prof }, { data: biz }] = await Promise.all([
    supabase.from('businesses').select('id').eq('id', appt.business_id).eq('owner_id', user.id).maybeSingle(),
    supabase.from('professionals').select('id, is_receptionist').eq('business_id', appt.business_id).eq('auth_user_id', user.id).eq('active', true).maybeSingle(),
    supabase.from('businesses').select('professionals_can_book_others').eq('id', appt.business_id).maybeSingle(),
  ])
  const isOwner = !!dono
  const isRecep = prof?.is_receptionist === true
  const ehDela = !!prof && !prof.is_receptionist && prof.id === appt.professional_id
  const equipeLiberada = biz?.professionals_can_book_others === true
  const isProfAutorizada = !!prof && !prof.is_receptionist && (ehDela || equipeLiberada)
  if (!isOwner && !isRecep && !isProfAutorizada) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (!isOwner && !isRecep && appt.paid_at) {
    return NextResponse.json({
      error: 'ja_pago',
      detail: 'Atendimento já pago. Só a administração pode remarcar depois do pagamento.',
    }, { status: 403 })
  }

  // ─── Entrada ────────────────────────────────────────────────────────────
  const body = await req.json().catch(() => null)
  const novaData = typeof body?.date === 'string' ? body.date : ''
  const novoInicio = typeof body?.start_time === 'string' ? body.start_time : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(novaData)) return NextResponse.json({ error: 'data_invalida' }, { status: 400 })
  if (!/^\d{2}:\d{2}$/.test(novoInicio)) return NextResponse.json({ error: 'horario_invalido' }, { status: 400 })

  // Duração preservada — o serviço é o mesmo, só mudou quando
  const duracao = minutos(String(appt.end_time).slice(0, 5)) - minutos(String(appt.start_time).slice(0, 5))
  const novoFim = paraHHMM(minutos(novoInicio) + (duracao > 0 ? duracao : 60))

  const igual = appt.appointment_date === novaData && String(appt.start_time).slice(0, 5) === novoInicio
  if (igual) return NextResponse.json({ ok: true, semMudanca: true })

  // ─── Conflito com outro atendimento da mesma profissional ───────────────
  const { data: doDia } = await admin
    .from('appointments')
    .select('id, start_time, end_time, client_name')
    .eq('professional_id', appt.professional_id)
    .eq('appointment_date', novaData)
    .neq('id', id)
    .not('status', 'in', '(cancelled,no_show)')
  const choque = (doDia ?? []).find((a) => {
    const s = String(a.start_time).slice(0, 5)
    const e = String(a.end_time).slice(0, 5)
    return s < novoFim && e > novoInicio
  })
  if (choque) {
    return NextResponse.json({
      error: 'conflito',
      detail: `Nesse horário já tem ${choque.client_name ?? 'um atendimento'} (${String(choque.start_time).slice(0, 5)}–${String(choque.end_time).slice(0, 5)}).`,
    }, { status: 409 })
  }

  // ─── Conflito com bloqueio (almoço, folga, feriado) ─────────────────────
  const { data: blocos } = await admin
    .from('business_blocks')
    .select('id, professional_id, block_type, day_of_week, block_date, start_time, end_time, reason')
    .eq('business_id', appt.business_id)
    .eq('active', true)
  const bloqueio = (blocos ?? []).find((b) => {
    const row = b as unknown as BlockRow
    if (!blockAppliesTo(row, appt.professional_id as string, novaData)) return false
    const s = blockTimeToMinutes(String(row.start_time))
    const e = blockTimeToMinutes(String(row.end_time))
    return s < minutos(novoFim) && e > minutos(novoInicio)
  })
  if (bloqueio) {
    return NextResponse.json({
      error: 'bloqueado',
      detail: `Esse horário está bloqueado (${bloqueio.reason || 'indisponível'}).`,
    }, { status: 409 })
  }

  // ─── Move ───────────────────────────────────────────────────────────────
  const { error: upErr } = await admin
    .from('appointments')
    .update({
      appointment_date: novaData,
      start_time: `${novoInicio}:00`,
      end_time: `${novoFim}:00`,
      // Volta pra "confirmado": a cliente precisa saber do horário novo, então
      // não faz sentido manter "concluído" nem herdar lembrete já enviado.
      reminded_1d: false,
      reminded_1h: false,
    })
    .eq('id', id)
  if (upErr) {
    // A constraint no_overlap_appointments (v40b) é a última linha de defesa —
    // se ela disparar, traduz em vez de vazar erro de Postgres pra tela.
    const conflito = upErr.message.includes('no_overlap_appointments')
    return NextResponse.json({
      error: conflito ? 'conflito' : 'falha_ao_remarcar',
      detail: conflito
        ? 'Esse horário acabou de ser ocupado. Escolhe outro.'
        : upErr.message,
    }, { status: conflito ? 409 : 500 })
  }

  // λ.prova-na-fonte · relê antes de dizer que deu certo
  const { data: depois } = await admin
    .from('appointments')
    .select('appointment_date, start_time, end_time')
    .eq('id', id)
    .maybeSingle()
  if (depois?.appointment_date !== novaData || String(depois?.start_time).slice(0, 5) !== novoInicio) {
    return NextResponse.json({ error: 'nao_confirmado' }, { status: 500 })
  }

  // Rastro: quem moveu, de quando pra quando
  await admin.from('activity_log').insert({
    business_id: appt.business_id,
    professional_id: prof?.id ?? null,
    action: 'update_appointment',
    target_type: 'appointment',
    target_id: id,
    description: `Remarcou ${appt.client_name ?? 'atendimento'} de ${String(appt.appointment_date).slice(8, 10)}/${String(appt.appointment_date).slice(5, 7)} ${String(appt.start_time).slice(0, 5)} para ${novaData.slice(8, 10)}/${novaData.slice(5, 7)} ${novoInicio}`,
  })

  return NextResponse.json({
    ok: true,
    appointment: { date: novaData, start_time: novoInicio, end_time: novoFim },
  })
}
