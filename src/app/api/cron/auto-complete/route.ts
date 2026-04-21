import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Fecha agendamentos passados automaticamente (presuncao de presenca).
// Se o barbeiro nao marcou "Nao veio", assumimos que o cliente foi atendido.
// O trigger credit_points_on_confirm credita os pontos quando status vira 'completed'.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getAdminClient()

  // Vercel roda em UTC — converte pra BRT (UTC-3)
  const nowUTC = new Date()
  const nowBRT = new Date(nowUTC.getTime() - 3 * 60 * 60 * 1000)
  const today = nowBRT.toISOString().split('T')[0]
  const nowTime = nowBRT.toISOString().slice(11, 19) // "HH:MM:SS"

  // Busca confirmed com horario passado
  const { data: toComplete, error: selErr } = await supabase
    .from('appointments')
    .select('id, appointment_date, end_time')
    .eq('status', 'confirmed')
    .or(`appointment_date.lt.${today},and(appointment_date.eq.${today},end_time.lt.${nowTime})`)

  if (selErr) {
    return NextResponse.json({ error: selErr.message }, { status: 500 })
  }

  if (!toComplete || toComplete.length === 0) {
    return NextResponse.json({ ok: true, completed: 0 })
  }

  const ids = toComplete.map((a) => a.id)

  const { error: updErr } = await supabase
    .from('appointments')
    .update({ status: 'completed' })
    .in('id', ids)

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, completed: ids.length })
}
