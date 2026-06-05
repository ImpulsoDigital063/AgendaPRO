import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendAlert } from '@/lib/alert'
import { todayBR } from '@/lib/date-br'

/**
 * /api/cron/monitor — BLINDAGEM (detecção, não prevenção).
 *
 * Roda via agendador EXTERNO (cron-job.org / GitHub Action) a cada 15-30min,
 * porque Vercel Hobby só permite cron 1x/dia. Auth = Bearer CRON_SECRET.
 *
 * Faz duas coisas e avisa no Telegram (sendAlert) se achar problema:
 *  1. OPERAÇÃO PARADA: negócio que normalmente movimenta e hoje zerou.
 *     Pega falha SILENCIOSA (sem erro técnico) — tipo o modal ilegível do
 *     Olímpio: o cliente parou de agendar e nada estourava.
 *  2. HEALTH-CHECK: o caminho público de disponibilidade responde JSON válido.
 *
 * v1 conservador (thresholds abaixo) — vai precisar de tuning pra cortar ruído
 * (domingo/feriado/dia de folga geram zero natural). Marcado pra ajustar.
 */

const BASELINE_MIN_AVG = 3      // só vigia negócio com média >= 3 agendamentos/dia ativo
const BASELINE_MIN_DAYS = 5     // ...e com pelo menos 5 dias de atividade nos últimos 14
const ONLY_AFTER_HOUR_BRT = 12  // só alerta "zerou" depois do meio-dia (evita falso de manhã)

function getAdminClient() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function hourBRT(): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(new Date()))
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getAdminClient()
  const today = todayBR()
  const todayStartISO = `${today}T00:00:00-03:00`
  const since14 = `${new Date(Date.parse(today + 'T12:00:00-03:00') - 14 * 864e5).toISOString().slice(0, 10)}T00:00:00-03:00`
  const problems: string[] = []

  // ── 1. OPERAÇÃO PARADA ──────────────────────────────────────────
  const { data: recent, error: recErr } = await db
    .from('appointments')
    .select('business_id, created_at')
    .gte('created_at', since14)
  if (recErr) {
    problems.push(`⚠️ monitor: erro lendo appointments — ${recErr.message}`)
  } else {
    const { data: bizRows } = await db.from('businesses').select('id, name')
    const nameOf = new Map((bizRows ?? []).map((b) => [b.id, b.name]))

    // agrega por negócio: dias ativos distintos, total, count de hoje
    type Agg = { total: number; days: Set<string>; today: number }
    const byBiz = new Map<string, Agg>()
    for (const r of recent ?? []) {
      const a = byBiz.get(r.business_id) ?? { total: 0, days: new Set(), today: 0 }
      a.total += 1
      a.days.add(r.created_at.slice(0, 10))
      if (r.created_at >= todayStartISO) a.today += 1
      byBiz.set(r.business_id, a)
    }

    if (hourBRT() >= ONLY_AFTER_HOUR_BRT) {
      for (const [bizId, a] of byBiz) {
        const activeDays = a.days.size
        const avg = a.total / Math.max(activeDays, 1)
        const silentToday = a.today === 0
        if (avg >= BASELINE_MIN_AVG && activeDays >= BASELINE_MIN_DAYS && silentToday) {
          problems.push(`🔴 <b>${nameOf.get(bizId) ?? bizId}</b> sem nenhum agendamento hoje (média ${avg.toFixed(1)}/dia). Verificar se a operação travou.`)
        }
      }
    }
  }

  // ── 2. HEALTH-CHECK do caminho público ─────────────────────────
  const origin = req.nextUrl.origin
  try {
    const { data: anyBiz } = await db.from('businesses').select('id').limit(1).maybeSingle()
    const { data: anyProf } = anyBiz ? await db.from('professionals').select('id').eq('business_id', anyBiz.id).eq('active', true).limit(1).maybeSingle() : { data: null }
    if (anyBiz && anyProf) {
      const url = `${origin}/api/booking/availability?business=${anyBiz.id}&professional=${anyProf.id}&date=${today}`
      const res = await fetch(url)
      const body = await res.json().catch(() => null)
      if (!res.ok || !body || !Array.isArray(body.appointments)) {
        problems.push(`🔴 health-check: /api/booking/availability respondeu inválido (status ${res.status}).`)
      }
    }
  } catch (e) {
    problems.push(`🔴 health-check: caminho de disponibilidade caiu — ${String(e)}`)
  }

  // ── aviso ───────────────────────────────────────────────────────
  let alerted = false
  if (problems.length > 0) {
    const msg = `<b>AgendaPRO · monitor</b>\n${today}\n\n${problems.join('\n\n')}`
    const r = await sendAlert(msg)
    alerted = r.ok
    if (!r.ok) console.error('monitor: falha ao alertar —', r.error)
  }

  return NextResponse.json({ ok: true, problems: problems.length, alerted, hourBRT: hourBRT() })
}
