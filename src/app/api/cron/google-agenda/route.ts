/**
 * GET /api/cron/google-agenda — faxina diária do Google Agenda (v175).
 *
 * O envio normal é na hora, pelo gatilho do banco. Isto só cobre o que
 * escapou: aviso que falhou (Google fora, rede) e agendamento futuro que
 * nunca chegou a ser enviado. A Vercel só roda cron 1x por dia, por isso
 * não dá pra ser o caminho principal.
 */
import { NextRequest, NextResponse } from 'next/server'
import { puxarDoGoogle, sincronizarAgendamento } from '@/lib/google-agenda'
import { dbServico } from '@/lib/google-agenda-acesso'
import { todayBR } from '@/lib/date-br'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const db = dbServico()
  const hoje = todayBR()
  // conexão com acesso revogado fica parada até ela reconectar
  const { data: conexoes } = await db.from('google_agenda_conexoes').select('business_id').is('erro', null)
  const resumo: Record<string, { reenviados: number; falhas: number }> = {}

  for (const { business_id } of conexoes ?? []) {
    const [{ data: comErro }, { data: futuros }, { data: enviados }] = await Promise.all([
      db.from('google_agenda_eventos').select('appointment_id').eq('business_id', business_id).not('erro', 'is', null).limit(200),
      db
        .from('appointments')
        .select('id')
        .eq('business_id', business_id)
        .gte('appointment_date', hoje)
        .neq('status', 'cancelled')
        .limit(500),
      db.from('google_agenda_eventos').select('appointment_id').eq('business_id', business_id).is('erro', null).limit(5000),
    ])
    const jaFoi = new Set((enviados ?? []).map((e) => e.appointment_id as string))
    const ids = new Set<string>((comErro ?? []).map((e) => e.appointment_id as string))
    for (const f of futuros ?? []) if (!jaFoi.has(f.id as string)) ids.add(f.id as string)

    let reenviados = 0
    let falhas = 0
    for (const id of ids) {
      try {
        await sincronizarAgendamento(db, business_id, id)
        reenviados++
      } catch {
        falhas++
      }
    }
    resumo[business_id] = { reenviados, falhas }

    // volta (v176): leitura forçada 1x por dia, mesmo sem ninguém abrir o link.
    // Também tira os bloqueios de dias que já passaram.
    try {
      await puxarDoGoogle(db, business_id, hoje, true)
    } catch (e) {
      console.error('cron google-agenda · volta:', business_id, e)
    }
  }
  return NextResponse.json({ ok: true, resumo })
}
