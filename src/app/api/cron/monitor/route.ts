import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendAlert } from '@/lib/alert'
import { todayBR } from '@/lib/date-br'

/**
 * /api/cron/monitor — BLINDAGEM (detecção, não prevenção).
 *
 * Roda via agendador EXTERNO (GitHub Action) 4x/dia (08/13/17/20 BRT · ver
 * monitor.yml), porque Vercel Hobby só permite cron 1x/dia. Auth = Bearer
 * CRON_SECRET. Cadência enxuta de propósito — não precisa mais (Eduardo 09/06).
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
const BASELINE_MIN_DAYS = 5     // ...e com pelo menos 5 dias de atividade nos últimos 28
const ONLY_AFTER_HOUR_BRT = 12  // só alerta "zerou" depois do meio-dia (evita falso de manhã)
const DOW_MIN_SAMPLES = 2       // só alerta se o negócio operou em >=2 dos últimos mesmos-dias-da-semana
                                // (corta o falso positivo de DIA DE FOLGA — ex: segunda no ramo de beleza.
                                //  Confirmado 20/07: Olímpio/Rosy/Viva alertados numa segunda de manhã
                                //  sendo que operavam normal à tarde. O baseline não entendia dia de folga.)
const MIN_DENSITY = 0.6         // só vigia negócio de operação DENSA (cria agendamento na maioria dos dias).
                                // O alerta mede agendamentos CRIADOS hoje; quem opera em RAJADA (não cria
                                // todo dia) tem "0 hoje" natural e NÃO é falha. Confirmado 21/07: Viva
                                // Cacheada (12/28 dias ativos = 43%) alertou falso estando em pleno uso.
                                // Olímpio (25/28 = 89%) é operação densa de verdade → esse sim se vigia.

function getAdminClient() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function hourBRT(): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(new Date()))
}

// Auditoria financeira roda 1x/semana (segunda de manhã BRT) · drift lento, não
// precisa rodar a cada 15min. Se não achar nada, fica silenciosa.
function isWeeklyAuditWindow(): boolean {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' }).format(new Date())
  return wd === 'Mon' && hourBRT() === 8
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
  // Janela de 28 dias → ~4 amostras de cada dia da semana pra o baseline por dow.
  const since28 = `${new Date(Date.parse(today + 'T12:00:00-03:00') - 28 * 864e5).toISOString().slice(0, 10)}T00:00:00-03:00`
  // Dia da semana de HOJE em horário BR (0=dom … 6=sáb).
  const todayDowBR = new Date(Date.parse(today + 'T12:00:00-03:00')).getUTCDay()
  const DOW_LABEL = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
  const problems: string[] = []

  const { data: bizRows } = await db.from('businesses').select('id, name')
  const nameOf = new Map((bizRows ?? []).map((b) => [b.id, b.name]))

  // ── 1. OPERAÇÃO PARADA ──────────────────────────────────────────
  const { data: recent, error: recErr } = await db
    .from('appointments')
    .select('business_id, created_at')
    .gte('created_at', since28)
  if (recErr) {
    problems.push(`⚠️ monitor: erro lendo appointments — ${recErr.message}`)
  } else {
    // agrega por negócio: dias ativos distintos, total, count de hoje, e —
    // NOVO — dias distintos com atividade POR dia-da-semana (baseline de dow).
    type Agg = { total: number; days: Set<string>; today: number; dowDays: Map<number, Set<string>> }
    const byBiz = new Map<string, Agg>()
    for (const r of recent ?? []) {
      const a = byBiz.get(r.business_id) ?? { total: 0, days: new Set(), today: 0, dowDays: new Map() }
      // created_at é UTC; converte pra BR (−3h) pra o dia e o dia-da-semana baterem
      // com a operação real (senão agendamento da noite cai no dia/dow seguinte).
      const brMs = new Date(r.created_at).getTime() - 3 * 3600e3
      const brDate = new Date(brMs).toISOString().slice(0, 10)
      const brDow = new Date(brMs).getUTCDay()
      a.total += 1
      a.days.add(brDate)
      if (r.created_at >= todayStartISO) a.today += 1
      if (!a.dowDays.has(brDow)) a.dowDays.set(brDow, new Set())
      a.dowDays.get(brDow)!.add(brDate)
      byBiz.set(r.business_id, a)
    }

    if (hourBRT() >= ONLY_AFTER_HOUR_BRT) {
      for (const [bizId, a] of byBiz) {
        const activeDays = a.days.size
        const avg = a.total / Math.max(activeDays, 1)
        const silentToday = a.today === 0
        // (1) operação DENSA: cria agendamento na maioria dos dias (senão "0 hoje"
        //     é rajada normal, não falha — caso Viva Cacheada).
        const densidade = activeDays / 28
        // (2) COSTUMA operar neste dia da semana (>= DOW_MIN_SAMPLES amostras) —
        //     senão dia de folga vira alerta falso.
        const operaNesseDia = (a.dowDays.get(todayDowBR)?.size ?? 0) >= DOW_MIN_SAMPLES
        if (
          avg >= BASELINE_MIN_AVG &&
          activeDays >= BASELINE_MIN_DAYS &&
          densidade >= MIN_DENSITY &&
          operaNesseDia &&
          silentToday
        ) {
          problems.push(`🔴 <b>${nameOf.get(bizId) ?? bizId}</b> sem nenhum agendamento hoje (média ${avg.toFixed(1)}/dia · opera quase todo dia, incl. ${DOW_LABEL[todayDowBR]}). Verificar se a operação travou.`)
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

  // ── 3. CONSISTÊNCIA FINANCEIRA (semanal · seg manhã) ────────────
  // Comanda ABERTA com atendimento PAGO e sem pagamento registrado = dinheiro
  // some do "Recebido" (bug Olímpio 09/06). O fix de fluxo previne novos; isto
  // é a rede de segurança que avisa se algum caminho voltar a criar o limbo.
  if (isWeeklyAuditWindow()) {
    try {
      const { data: openInvs } = await db
        .from('invoices').select('id, business_id, total').eq('status', 'open')
      const openIds = (openInvs ?? []).map((i) => i.id)
      if (openIds.length > 0) {
        const [{ data: items }, { data: openPays }] = await Promise.all([
          db.from('invoice_items').select('invoice_id, reference_id').eq('item_type', 'appointment').in('invoice_id', openIds),
          db.from('invoice_payments').select('invoice_id').in('invoice_id', openIds),
        ])
        const apptIds = [...new Set((items ?? []).map((i) => i.reference_id).filter(Boolean))] as string[]
        const paidAppt = new Set<string>()
        for (let i = 0; i < apptIds.length; i += 200) {
          const { data: appts } = await db.from('appointments').select('id, paid_at').in('id', apptIds.slice(i, i + 200))
          ;(appts ?? []).forEach((a) => { if (a.paid_at) paidAppt.add(a.id as string) })
        }
        const hasPay = new Set((openPays ?? []).map((p) => p.invoice_id))
        const invBiz = new Map((openInvs ?? []).map((i) => [i.id, i.business_id]))
        const limboByBiz: Record<string, number> = {}
        for (const it of items ?? []) {
          if (it.reference_id && paidAppt.has(it.reference_id as string) && !hasPay.has(it.invoice_id)) {
            const biz = invBiz.get(it.invoice_id) as string
            limboByBiz[biz] = (limboByBiz[biz] ?? 0) + 1
          }
        }
        for (const [biz, n] of Object.entries(limboByBiz)) {
          problems.push(`🟠 <b>${nameOf.get(biz) ?? biz}</b>: ${n} comanda(s) paga(s) sem fechar — valor pode estar sumindo do Recebido. Rodar reconciliação.`)
        }
      }
    } catch (e) {
      problems.push(`⚠️ monitor financeiro: ${String(e)}`)
    }
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
