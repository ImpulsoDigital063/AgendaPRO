/* ═══════════════════════════════════════════════════════════════
   Abate o crédito da cliente no sinal de um agendamento que o DONO marcou.

   Achado da auditoria (05/08): o link público já abatia crédito no sinal,
   mas o AgendarModal — o caminho de ~90% dos agendamentos — não. Uma
   cliente que cancelou com folga e ficou com crédito seria cobrada de
   novo, cheio, quando a dona marcasse o próximo horário pra ela. O
   sistema prometeu na tela de cancelamento que o crédito abate o próximo
   sinal; a promessa tem que valer pelos dois caminhos.

   Mesma regra do público: FIFO por validade, vencido não entra, sobra
   volta como crédito novo com a MESMA validade (zerar seria confisco), e
   se o crédito cobre tudo o horário já nasce confirmado.

   Idempotente: se o sinal já foi pago ou já tem crédito amarrado neste
   agendamento, não faz nada e devolve o que já aconteceu.
   ═══════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveBusinessIdOperacao } from '@/lib/api-business-access'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const businessId = await resolveBusinessIdOperacao(supabase)
  if (!businessId) return NextResponse.json({ error: 'sem_acesso' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const appointmentId = body?.appointmentId as string | undefined
  if (!appointmentId) return NextResponse.json({ error: 'sem_id' }, { status: 400 })

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: appt } = await db
    .from('appointments')
    .select('id, business_id, customer_id, appointment_date, sinal_valor, sinal_pago_at, status')
    .eq('id', appointmentId)
    .maybeSingle()

  if (!appt) return NextResponse.json({ error: 'nao_encontrado' }, { status: 404 })
  if (appt.business_id !== businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const sinalCheio = Number(appt.sinal_valor ?? 0)
  if (!appt.customer_id || sinalCheio <= 0 || appt.sinal_pago_at) {
    return NextResponse.json({ ok: true, aplicado: 0, quitado: !!appt.sinal_pago_at })
  }

  // Já rodou pra este agendamento? Não abate de novo.
  const { data: jaUsados } = await db
    .from('customer_credits')
    .select('id')
    .eq('used_in_appointment_id', appointmentId)
    .limit(1)
  if ((jaUsados ?? []).length > 0) {
    return NextResponse.json({ ok: true, aplicado: 0, quitado: false, jaAplicado: true })
  }

  const { data: disponiveis } = await db
    .from('customer_credits')
    .select('id, amount, expires_at')
    .eq('business_id', businessId)
    .eq('customer_id', appt.customer_id)
    .is('used_in_invoice_id', null)
    .is('used_in_appointment_id', null)
    .order('expires_at', { ascending: true, nullsFirst: false })

  let aplicado = 0
  const usados: string[] = []
  let sobra: { valor: number; expira: string | null } | null = null
  const agora = new Date()

  for (const c of disponiveis ?? []) {
    if (aplicado >= sinalCheio) break
    if (c.expires_at && new Date(c.expires_at) < agora) continue
    const valor = Number(c.amount ?? 0)
    if (valor <= 0) continue
    const falta = sinalCheio - aplicado
    usados.push(c.id as string)
    if (valor <= falta) {
      aplicado += valor
    } else {
      aplicado += falta
      sobra = { valor: Math.round((valor - falta) * 100) / 100, expira: (c.expires_at as string) ?? null }
    }
  }

  if (usados.length === 0) return NextResponse.json({ ok: true, aplicado: 0, quitado: false })

  const quitado = aplicado >= sinalCheio - 0.01

  const { error: usoErr } = await db
    .from('customer_credits')
    .update({ used_in_appointment_id: appointmentId })
    .in('id', usados)
  if (usoErr) return NextResponse.json({ error: usoErr.message }, { status: 500 })

  /* Se a sobra não gravar, a cliente perde a diferença — o crédito original
     já saiu como usado. Desfaz e avisa, em vez de deixar sumir. */
  if (sobra && sobra.valor > 0) {
    const { error: sobraErr } = await db.from('customer_credits').insert({
      business_id: businessId,
      customer_id: appt.customer_id,
      amount: sobra.valor,
      origin: 'sinal',
      date: appt.appointment_date,
      expires_at: sobra.expira,
      notes: `Sobra de crédito usado no sinal ${appointmentId}`,
    })
    if (sobraErr) {
      await db.from('customer_credits').update({ used_in_appointment_id: null }).in('id', usados)
      return NextResponse.json(
        { error: 'sobra_nao_gravou', detail: sobraErr.message, aplicado: 0 },
        { status: 500 },
      )
    }
  }

  // Crédito cobriu o sinal inteiro: nada de PIX, o horário nasce confirmado.
  if (quitado) {
    await db
      .from('appointments')
      .update({ sinal_pago_at: new Date().toISOString(), status: 'confirmed' })
      .eq('id', appointmentId)
  }

  // λ.prova-na-fonte · confere na row, não no res.ok
  const { data: conf } = await db
    .from('appointments')
    .select('sinal_pago_at')
    .eq('id', appointmentId)
    .maybeSingle()

  return NextResponse.json({
    ok: true,
    aplicado: Math.round(aplicado * 100) / 100,
    quitado: quitado && !!conf?.sinal_pago_at,
    sobra: sobra?.valor ?? 0,
  })
}
