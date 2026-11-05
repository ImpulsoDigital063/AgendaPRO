/* ═══════════════════════════════════════════════════════════════
   ABA METAS · CONTAS (04/11/2026)

   Régua do faturamento = COMPETÊNCIA, a mesma do Hub Financeiro: chama a
   própria receitaDoPeriodo (lib/financeiro/resumo-do-periodo). O número da
   meta bate com o Hub no mesmo período por construção. Mês corrente vai do
   dia 1º até HOJE, igual ao Hub (que não deixa o período passar de hoje).

   CPU da Vercel é sensível (alerta 90%): faturado e agenda ficam em
   unstable_cache (service role, chave = negócio + mês/dia), então abrir o
   Início ou a aba várias vezes não refaz a conta. A sugestão de meta (6
   meses de histórico) só roda na tela de definir a meta.

   Segurança do service role: quem chama já validou que a pessoa é dona ou
   gerente com financeiro liberado (lib/metas/acesso). Todas as queries
   filtram pelo business_id recebido.
   ═══════════════════════════════════════════════════════════════ */

import { unstable_cache } from 'next/cache'
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'
import { receitaDoPeriodo } from '@/lib/financeiro/resumo-do-periodo'
import { addDaysBR, addMonthsBR, monthBoundsBR, todayBR } from '@/lib/date-br'
import { periodosDoDia, type HorarioPorData } from '@/lib/horario-do-dia'

function svc(): SupabaseClient {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** 'AAAA-MM' do mês de hoje em Brasília. */
export function mesAtualBR(): string {
  return todayBR().slice(0, 7)
}

/** 'novembro' */
export function nomeMes(ym: string): string {
  return MESES[Number(ym.slice(5, 7)) - 1] ?? ''
}

export function brl(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0, minimumFractionDigits: 0 })
}

/* ─── Faturado do mês (régua do Hub) ─────────────────────────────── */

/** Sem cache: usada pelo cron, pelo script de prova e pela sugestão. */
export async function faturadoDoMesSemCache(db: SupabaseClient, businessId: string, ym: string, hoje = todayBR()): Promise<number> {
  const { start, end } = monthBoundsBR(ym)
  const ate = end > hoje ? hoje : end
  if (ate < start) return 0
  const r = await receitaDoPeriodo(db, businessId, start, ate)
  return Math.round(r.valorRecebido * 100) / 100
}

/** Com cache de 5 min por negócio + mês + dia (Início e aba Metas). */
export const faturadoDoMes = unstable_cache(
  async (businessId: string, ym: string, hoje: string) => faturadoDoMesSemCache(svc(), businessId, ym, hoje),
  ['metas-faturado-v1'],
  { revalidate: 300 },
)

/* ─── Agenda: dias de trabalho restantes e horários livres ───────── */

const minutos = (t: string | null | undefined): number => {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
const hhmm = (min: number): string => {
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

export type AgendaRestante = {
  /** dias com atendimento possível, de hoje ao fim do mês (inclui hoje) */
  diasAbertos: string[]
  /** dias com atendimento possível no mês inteiro (1º ao último) */
  diasAbertosMes: number
  /** atendimentos marcados de hoje ao fim do mês, não pagos, não cancelados/falta, não importados */
  agendados: number
  /** próximo dia aberto DEPOIS de hoje, com os horários livres */
  proximoDia: { ymd: string; livres: string[] } | null
}

type Semanal = { professional_id: string; day_of_week: number; start_time: string; end_time: string; slot_duration: number }
type Bloco = { professional_id: string | null; block_type: string; day_of_week: number | null; block_date: string | null; start_time: string; end_time: string }
type Appt = { professional_id: string | null; appointment_date: string; start_time: string; end_time: string | null; paid_at: string | null; historical: boolean | null }

export async function agendaRestanteSemCache(db: SupabaseClient, businessId: string, hoje: string): Promise<AgendaRestante> {
  const { start: inicioMes, end: fimMes } = monthBoundsBR(hoje.slice(0, 7))
  // janela vai além do fim do mês pra achar o "próximo dia" no dia 30/31
  const semana = addDaysBR(hoje, 8)
  const ate = fimMes > semana ? fimMes : semana

  const { data: equipe } = await db
    .from('professionals')
    .select('id')
    .eq('business_id', businessId)
    .eq('active', true)
    .eq('does_appointments', true)
  const ids = (equipe ?? []).map((p) => p.id as string)
  if (ids.length === 0) return { diasAbertos: [], diasAbertosMes: 0, agendados: 0, proximoDia: null }

  const [{ data: wh }, { data: whd }, { data: blocos }, { data: appts }] = await Promise.all([
    db.from('working_hours').select('professional_id, day_of_week, start_time, end_time, slot_duration').in('professional_id', ids),
    db.from('working_hours_dates').select('professional_id, date, start_time, end_time, slot_duration').in('professional_id', ids).gte('date', inicioMes).lte('date', ate),
    db.from('business_blocks').select('professional_id, block_type, day_of_week, block_date, start_time, end_time').eq('business_id', businessId).eq('active', true),
    db.from('appointments')
      .select('professional_id, appointment_date, start_time, end_time, paid_at, historical')
      .eq('business_id', businessId)
      .gte('appointment_date', hoje)
      .lte('appointment_date', ate)
      .not('status', 'in', '(cancelled,no_show)')
      .range(0, 4999),
  ])
  const semanal = (wh ?? []) as Semanal[]
  const datas = (whd ?? []) as HorarioPorData[]
  const blocosL = (blocos ?? []) as Bloco[]
  const apptsL = (appts ?? []) as Appt[]

  const diasAbertos: string[] = []
  let diasAbertosMes = 0
  let proximoDia: AgendaRestante['proximoDia'] = null
  const agendados = apptsL.filter((a) => a.appointment_date <= fimMes && !a.paid_at && !a.historical).length

  for (let d = inicioMes; d <= ate; d = addDaysBR(d, 1)) {
    const dow = new Date(d + 'T12:00:00Z').getUTCDay()
    let aberto = false
    const livres = new Set<number>()
    for (const pid of ids) {
      const periodos = periodosDoDia(semanal, datas, pid, d)
      if (periodos.length === 0) continue
      const livre = new Uint8Array(1440)
      for (const p of periodos) livre.fill(1, minutos(p.start_time), Math.min(1440, minutos(p.end_time) || 1440))
      for (const b of blocosL) {
        if (b.professional_id && b.professional_id !== pid) continue
        const vale = b.block_type === 'recurring' ? b.day_of_week === dow : b.block_date === d
        if (vale) livre.fill(0, minutos(b.start_time), Math.min(1440, minutos(b.end_time) || 1440))
      }
      if (!livre.includes(1)) continue
      aberto = true
      if (proximoDia || d <= hoje) continue
      // horários livres do próximo dia: começo de cada vaga do período inteira livre
      for (const a of apptsL) {
        if (a.appointment_date !== d || (a.professional_id && a.professional_id !== pid)) continue
        const ini = minutos(a.start_time)
        livre.fill(0, ini, Math.min(1440, a.end_time ? minutos(a.end_time) : ini + 60))
      }
      for (const p of periodos) {
        const passo = p.slot_duration > 0 ? p.slot_duration : 60
        for (let t = minutos(p.start_time); t + passo <= minutos(p.end_time); t += passo) {
          let ok = true
          for (let i = t; i < t + passo; i++) if (!livre[i]) { ok = false; break }
          if (ok) livres.add(t)
        }
      }
    }
    if (aberto && d <= fimMes) diasAbertosMes++
    if (aberto && d >= hoje && d <= fimMes) diasAbertos.push(d)
    if (aberto && d > hoje && !proximoDia) {
      proximoDia = { ymd: d, livres: Array.from(livres).sort((a, b) => a - b).map(hhmm) }
    }
    if (proximoDia && d >= fimMes) break
  }
  return { diasAbertos, diasAbertosMes, agendados, proximoDia }
}

export const agendaRestante = unstable_cache(
  async (businessId: string, hoje: string) => agendaRestanteSemCache(svc(), businessId, hoje),
  ['metas-agenda-v2'],
  { revalidate: 600 },
)

/* ─── Faltam e por dia ───────────────────────────────────────────── */

export function porDia(faltam: number, dias: number): number {
  if (faltam <= 0) return 0
  const d = Math.max(1, dias)
  return Math.ceil(faltam / d / 10) * 10
}

/* ─── Sugestão de meta + ticket médio (só na tela de definir) ────── */

export type Sugestao = {
  valor: number | null
  /** 1 linha com a base da sugestão */
  base: string
  origem: 'historico' | 'agendado' | 'nenhuma'
  /** ticket médio pra traduzir R$ em atendimentos (null = sem base) */
  ticket: number | null
  /** de onde veio o ticket */
  ticketOrigem: 'historico' | 'servicos' | null
}

const arred100 = (v: number) => Math.round(v / 100) * 100

/** Faturado (régua do Hub) e ticket do mês. O ticket tira os atendimentos
 *  IMPORTADOS (appointments.historical) do numerador e do denominador; o
 *  faturado fica igual ao Hub. */
async function mesComTicket(db: SupabaseClient, businessId: string, ym: string, hoje: string) {
  const { start, end } = monthBoundsBR(ym)
  const ate = end > hoje ? hoje : end
  if (ate < start) return { faturado: 0, receitaTicket: 0, qtdTicket: 0 }
  const r = await receitaDoPeriodo(db, businessId, start, ate)
  const ids = r.paidAppts.map((a) => a.id)
  const hist = new Set<string>()
  for (let i = 0; i < ids.length; i += 150) {
    const { data } = await db.from('appointments').select('id').in('id', ids.slice(i, i + 150)).eq('historical', true)
    for (const h of data ?? []) hist.add(h.id as string)
  }
  const valorHist = r.paidAppts.filter((a) => hist.has(a.id)).reduce((s, a) => s + Number(a.total_price ?? 0), 0)
  return {
    faturado: Math.round(r.valorRecebido * 100) / 100,
    receitaTicket: r.valorRecebido - valorHist,
    qtdTicket: r.paidAppts.length - hist.size,
  }
}

/** Últimos 6 meses FECHADOS com faturamento > 0 → média × 1,1 (arredondada
 *  a R$ 100, nunca abaixo da média). Sem histórico: já faturado no mês +
 *  agendado até o fim do mês. Ticket = receita ÷ atendimentos pagos desses
 *  meses (sem importados); sem atendimento: média de preço dos serviços ativos. */
export async function sugestaoDeMeta(db: SupabaseClient, businessId: string, ym: string, hoje = todayBR()): Promise<Sugestao> {
  const meses = Array.from({ length: 6 }, (_, i) => addMonthsBR(`${ym}-01`, -(i + 1)).slice(0, 7))
  const dados = await Promise.all(meses.map((m) => mesComTicket(db, businessId, m, hoje)))
  const comDado = dados.filter((d) => d.faturado > 0)

  const receitaT = comDado.reduce((s, d) => s + d.receitaTicket, 0)
  const qtdT = comDado.reduce((s, d) => s + d.qtdTicket, 0)
  let ticket: number | null = qtdT > 0 && receitaT > 0 ? Math.round(receitaT / qtdT) : null
  let ticketOrigem: Sugestao['ticketOrigem'] = ticket ? 'historico' : null
  if (!ticket) {
    const { data: servicos } = await db.from('services').select('price').eq('business_id', businessId).eq('active', true)
    const precos = (servicos ?? []).map((s) => Number(s.price ?? 0)).filter((v) => v > 0)
    if (precos.length > 0) {
      ticket = Math.round(precos.reduce((s, v) => s + v, 0) / precos.length)
      ticketOrigem = 'servicos'
    }
  }

  if (comDado.length > 0) {
    const valores = comDado.map((d) => d.faturado)
    const media = valores.reduce((s, v) => s + v, 0) / valores.length
    const min = Math.min(...valores)
    const max = Math.max(...valores)
    const n = valores.length
    const base = n === 1
      ? `Seu último mês: ${brl(max)}`
      : `Seus últimos ${n} meses: ${brl(min)} a ${brl(max)} · média ${brl(media)}`
    return { valor: Math.max(arred100(media), arred100(media * 1.1)), base, origem: 'historico', ticket, ticketOrigem }
  }
  const { start, end } = monthBoundsBR(ym)
  const r = await receitaDoPeriodo(db, businessId, start, end)
  const total = r.valorRecebido + r.valorProgramado
  if (total > 0) {
    return { valor: Math.max(100, arred100(total)), base: `Já entrou ${brl(r.valorRecebido)} e tem ${brl(r.valorProgramado)} agendado neste mês`, origem: 'agendado', ticket, ticketOrigem }
  }
  return { valor: null, base: 'Ainda sem histórico aqui. Coloque o valor que faz sentido pra você.', origem: 'nenhuma', ticket, ticketOrigem }
}
