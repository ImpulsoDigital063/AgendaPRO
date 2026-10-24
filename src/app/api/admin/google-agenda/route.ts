/**
 * /api/admin/google-agenda — cartão "Google Agenda" das configurações.
 *   GET    → status da conexão + profissionais (pro filtro)
 *   PATCH  → { professional_id: uuid | null } troca quais atendimentos vão pro Google
 *   DELETE → desconecta (revoga no Google e apaga o token)
 * Só a dona de negócio liberado (GOOGLE_AGENDA_LIBERADOS).
 */
import { NextRequest, NextResponse } from 'next/server'
import { decifrar, revogar, sincronizarFuturos } from '@/lib/google-agenda'
import { donaDoNegocioLiberado } from '@/lib/google-agenda-acesso'
import { todayBR } from '@/lib/date-br'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  const acesso = await donaDoNegocioLiberado()
  if (!acesso) return NextResponse.json({ liberado: false })
  const { db, businessId } = acesso
  const [{ data: c }, { data: profs }, { count: comErro }] = await Promise.all([
    db
      .from('google_agenda_conexoes')
      .select('google_email, professional_id, conectado_em, erro')
      .eq('business_id', businessId)
      .maybeSingle(),
    db.from('professionals').select('id, name').eq('business_id', businessId).eq('active', true).order('name'),
    db
      .from('google_agenda_eventos')
      .select('appointment_id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .not('erro', 'is', null),
  ])
  return NextResponse.json({
    liberado: true,
    conectado: !!c,
    email: c?.google_email ?? null,
    professional_id: c?.professional_id ?? null,
    conectado_em: c?.conectado_em ?? null,
    erro: c?.erro ?? null,
    pendentes: comErro ?? 0,
    profissionais: profs ?? [],
  })
}

export async function PATCH(req: NextRequest) {
  const acesso = await donaDoNegocioLiberado()
  if (!acesso) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { db, businessId } = acesso
  const body = await req.json().catch(() => ({}))
  const profId = body.professional_id === null ? null : String(body.professional_id ?? '')

  if (profId) {
    const { data: p } = await db.from('professionals').select('id').eq('id', profId).eq('business_id', businessId).maybeSingle()
    if (!p) return NextResponse.json({ error: 'profissional' }, { status: 400 })
  }
  const { data: gravado, error } = await db
    .from('google_agenda_conexoes')
    .update({ professional_id: profId })
    .eq('business_id', businessId)
    .select('professional_id')
    .maybeSingle()
  if (error || !gravado) return NextResponse.json({ error: 'nao-conectado' }, { status: 400 })

  // reenvia de hoje em diante: entra quem passou a valer, sai quem ficou de fora
  const r = await sincronizarFuturos(db, businessId, todayBR())
  return NextResponse.json({ ok: true, professional_id: gravado.professional_id, ...r })
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
  // os eventos já criados ficam na agenda dela (são dela); só para de mandar
  await db.from('google_agenda_conexoes').delete().eq('business_id', businessId)
  await db.from('google_agenda_eventos').delete().eq('business_id', businessId)
  const { data: sobrou } = await db.from('google_agenda_conexoes').select('business_id').eq('business_id', businessId).maybeSingle()
  return NextResponse.json({ ok: !sobrou })
}
