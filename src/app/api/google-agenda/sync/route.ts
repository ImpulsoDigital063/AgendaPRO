/**
 * POST /api/google-agenda/sync — chamada pelo GATILHO do banco (v175) a cada
 * insert/update/delete em appointments de negócio conectado. Não é chamada
 * por tela nenhuma.
 *
 * Corpo: { appointment_id, business_id }. Cabeçalho x-sync-secret =
 * google_agenda_config.sync_secret = env GOOGLE_AGENDA_SYNC_SECRET.
 * A rota relê o agendamento no banco: o aviso só diz "esse mudou".
 */
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { sincronizarAgendamento } from '@/lib/google-agenda'
import { dbServico } from '@/lib/google-agenda-acesso'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function segredoConfere(recebido: string | null) {
  const esperado = process.env.GOOGLE_AGENDA_SYNC_SECRET
  if (!esperado || !recebido) return false
  const a = Buffer.from(recebido)
  const b = Buffer.from(esperado)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  if (!segredoConfere(req.headers.get('x-sync-secret'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const appointmentId = String(body.appointment_id ?? '')
  const businessId = String(body.business_id ?? '')
  if (!UUID.test(appointmentId) || !UUID.test(businessId)) {
    return NextResponse.json({ error: 'payload' }, { status: 400 })
  }

  try {
    const r = await sincronizarAgendamento(dbServico(), businessId, appointmentId)
    return NextResponse.json({ ok: true, resultado: r })
  } catch (e) {
    // o erro já ficou gravado em google_agenda_eventos: a faxina diária reenvia
    console.error('google-agenda sync:', appointmentId, e)
    return NextResponse.json({ ok: false }, { status: 502 })
  }
}
