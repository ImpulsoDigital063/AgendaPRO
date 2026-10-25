/**
 * /api/admin/google-agenda — cartão "Google Agenda" das configurações.
 *   GET    → status da conexão + profissionais (pros filtros)
 *   PATCH  → { professional_id?: uuid | null } quais atendimentos vão pro Google (ida)
 *            { bloqueio_professional_id?: uuid | null } de quem é a agenda que
 *            bloqueia horário (volta, v176; null = desligada; só negócio liberado)
 *   DELETE → desconecta (revoga no Google, apaga o token e os bloqueios vindos do Google)
 * Só a dona de negócio liberado (GOOGLE_AGENDA_LIBERADOS).
 */
import { NextRequest, NextResponse } from 'next/server'
import { apagarBloqueiosDoGoogle, decifrar, puxarDoGoogle, revogar, sincronizarFuturos } from '@/lib/google-agenda'
import { donaDoNegocioLiberado } from '@/lib/google-agenda-acesso'
import { todayBR } from '@/lib/date-br'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  const acesso = await donaDoNegocioLiberado()
  if (!acesso) return NextResponse.json({ liberado: false })
  const { db, businessId, bloqueioLiberado } = acesso
  const [{ data: c }, { data: profs }, { count: comErro }, { count: bloqueios }] = await Promise.all([
    db
      .from('google_agenda_conexoes')
      .select('google_email, professional_id, bloqueio_professional_id, puxado_em, conectado_em, erro')
      .eq('business_id', businessId)
      .maybeSingle(),
    db.from('professionals').select('id, name').eq('business_id', businessId).eq('active', true).or('is_receptionist.eq.false,does_appointments.eq.true').order('name'),
    db
      .from('google_agenda_eventos')
      .select('appointment_id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .not('erro', 'is', null),
    db
      .from('business_blocks')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .not('google_event_id', 'is', null)
      .gte('block_date', todayBR()),
  ])
  return NextResponse.json({
    liberado: true,
    bloqueio_liberado: bloqueioLiberado,
    conectado: !!c,
    email: c?.google_email ?? null,
    professional_id: c?.professional_id ?? null,
    bloqueio_professional_id: c?.bloqueio_professional_id ?? null,
    puxado_em: c?.puxado_em ?? null,
    bloqueios: bloqueios ?? 0,
    conectado_em: c?.conectado_em ?? null,
    erro: c?.erro ?? null,
    pendentes: comErro ?? 0,
    profissionais: profs ?? [],
  })
}

export async function PATCH(req: NextRequest) {
  const acesso = await donaDoNegocioLiberado()
  if (!acesso) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { db, businessId, bloqueioLiberado } = acesso
  const body = await req.json().catch(() => ({}))

  const campo = 'bloqueio_professional_id' in body ? 'bloqueio_professional_id' : 'professional_id'
  if (campo === 'bloqueio_professional_id' && !bloqueioLiberado) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const profId = body[campo] === null ? null : String(body[campo] ?? '')

  if (profId) {
    const { data: p } = await db.from('professionals').select('id').eq('id', profId).eq('business_id', businessId).or('is_receptionist.eq.false,does_appointments.eq.true').maybeSingle()
    if (!p) return NextResponse.json({ error: 'profissional' }, { status: 400 })
  }
  const { data: gravado, error } = await db
    .from('google_agenda_conexoes')
    .update({ [campo]: profId })
    .eq('business_id', businessId)
    .select('professional_id, bloqueio_professional_id')
    .maybeSingle()
  if (error || !gravado) return NextResponse.json({ error: 'nao-conectado' }, { status: 400 })

  const hoje = todayBR()
  if (campo === 'bloqueio_professional_id') {
    if (!profId) {
      await apagarBloqueiosDoGoogle(db, businessId)
      return NextResponse.json({ ok: true, ...gravado })
    }
    try {
      const r = await puxarDoGoogle(db, businessId, hoje, true)
      return NextResponse.json({ ok: true, ...gravado, leitura: r })
    } catch (e) {
      console.error('google-agenda · ligar volta:', e)
      return NextResponse.json({ ok: false, ...gravado, error: 'google' }, { status: 502 })
    }
  }

  // ida: reenvia de hoje em diante (entra quem passou a valer, sai quem ficou de fora)
  const r = await sincronizarFuturos(db, businessId, hoje)
  return NextResponse.json({ ok: true, ...gravado, envio: r })
}

export async function DELETE() {
  const acesso = await donaDoNegocioLiberado()
  if (!acesso) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { db, businessId } = acesso
  const { data: c } = await db
    .from('google_agenda_conexoes')
    .select('refresh_token_cifrado')
    .eq('business_id', businessId)
    .maybeSingle()
  if (c) {
    try {
      await revogar(decifrar(c.refresh_token_cifrado))
    } catch {}
  }
  // os eventos já criados ficam na agenda dela (são dela); só para de mandar.
  // Os bloqueios vindos do Google saem: sem conexão, ninguém mais os mantém em dia.
  await apagarBloqueiosDoGoogle(db, businessId)
  await db.from('google_agenda_conexoes').delete().eq('business_id', businessId)
  await db.from('google_agenda_eventos').delete().eq('business_id', businessId)
  const { data: sobrou } = await db.from('google_agenda_conexoes').select('business_id').eq('business_id', businessId).maybeSingle()
  return NextResponse.json({ ok: !sobrou })
}
