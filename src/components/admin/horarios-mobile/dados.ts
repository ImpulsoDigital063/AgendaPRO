/* Regras do dia pra tela de Horários do celular (v155).

   Ordem de quem manda num dia, igual ao link de agendamento:
   1. bloqueio do dia inteiro (folga)   — business_blocks, por cima de tudo
   2. horário especial daquela data     — working_hours_dates (v153)
   3. horário fixo da semana            — working_hours */

import { DAYS, toMin, type Schedule } from '@/lib/horarios-semana'

export type LinhaData = {
  id: string
  professional_id: string
  date: string
  start_time: string
  end_time: string
  slot_duration: number
}

export type Bloqueio = {
  id: string
  professional_id: string | null
  block_type: 'recurring' | 'specific'
  day_of_week: number | null
  block_date: string | null
  start_time: string
  end_time: string
  reason: string | null
}

export type Periodo = { start_time: string; end_time: string }

export type TipoDia = 'passado' | 'normal' | 'fechado' | 'especial' | 'folga'

export type StatusDia = {
  tipo: TipoDia
  periodos: Periodo[]
  slot: number
  /** Folga que dá pra tirar daqui: bloqueio de data, só desta profissional */
  folgaRemovivel: Bloqueio[]
  /** Folga que vem de outro lugar (salão inteiro ou toda semana) */
  folgaDeFora: Bloqueio | null
  /** Bloqueios de parte do dia (médico 14h–16h), só pra avisar */
  parciais: Bloqueio[]
}

export const NOMES_DIA = DAYS.map((d) => d.full)
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export function hhmm(t: string) {
  return t.slice(0, 5)
}

/** '08:00' → '8h' · '12:30' → '12h30' */
export function horaCurta(t: string) {
  const [h, m] = hhmm(t).split(':')
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`
}

export function resumoPeriodos(ps: Periodo[]) {
  return ps.map((p) => `${horaCurta(p.start_time)}–${horaCurta(p.end_time)}`).join(' · ')
}

export function diaDaSemana(ymd: string) {
  return new Date(`${ymd}T12:00:00`).getDay()
}

/** 'Sexta, 9 de outubro' */
export function dataPorExtenso(ymd: string) {
  const [, m, d] = ymd.split('-').map(Number)
  return `${NOMES_DIA[diaDaSemana(ymd)]}, ${d} de ${MESES[m - 1]}`
}

export function nomeDoMes(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const n = MESES[m - 1]
  return `${n.charAt(0).toUpperCase()}${n.slice(1)} ${y}`
}

function cobreODia(b: Bloqueio) {
  return hhmm(b.start_time) <= '00:00' && hhmm(b.end_time) >= '23:59'
}

export function statusDoDia(
  ymd: string,
  hoje: string,
  profId: string,
  semana: Schedule,
  datas: LinhaData[],
  bloqueios: Bloqueio[],
): StatusDia {
  const dow = diaDaSemana(ymd)
  const vazio = { folgaRemovivel: [], folgaDeFora: null, parciais: [] }
  if (ymd < hoje) return { tipo: 'passado', periodos: [], slot: 30, ...vazio }

  const doDia = bloqueios.filter(
    (b) =>
      (b.professional_id === profId || b.professional_id === null) &&
      ((b.block_type === 'specific' && b.block_date === ymd) || (b.block_type === 'recurring' && b.day_of_week === dow)),
  )
  const inteiros = doDia.filter(cobreODia)
  const parciais = doDia.filter((b) => !cobreODia(b))

  if (inteiros.length > 0) {
    const removivel = inteiros.filter((b) => b.block_type === 'specific' && b.professional_id === profId)
    const deFora = inteiros.find((b) => !removivel.includes(b)) ?? null
    return { tipo: 'folga', periodos: [], slot: 30, folgaRemovivel: removivel, folgaDeFora: deFora, parciais }
  }

  const especiais = datas
    .filter((l) => l.professional_id === profId && l.date === ymd)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
  if (especiais.length > 0) {
    return {
      tipo: 'especial',
      periodos: especiais.map((l) => ({ start_time: hhmm(l.start_time), end_time: hhmm(l.end_time) })),
      slot: especiais[0].slot_duration,
      folgaRemovivel: [], folgaDeFora: null, parciais,
    }
  }

  const cfg = semana[dow]
  if (cfg?.active) {
    return { tipo: 'normal', periodos: cfg.periods.map((p) => ({ start_time: p.start_time, end_time: p.end_time })), slot: cfg.slot_duration, folgaRemovivel: [], folgaDeFora: null, parciais }
  }
  return { tipo: 'fechado', periodos: [], slot: cfg?.slot_duration ?? 30, folgaRemovivel: [], folgaDeFora: null, parciais }
}

/** Horário de costume: o que mais se repete entre os dias abertos da semana.
    É o que "Abrir este dia" usa sem perguntar. Semana vazia → 9h–18h. */
export function horarioDeCostume(semana: Schedule): { periodos: Periodo[]; slot: number } {
  const conta = new Map<string, { n: number; periodos: Periodo[]; slot: number }>()
  for (const d of DAYS) {
    const c = semana[d.id]
    if (!c?.active || c.periods.length === 0) continue
    const k = c.periods.map((p) => `${p.start_time}-${p.end_time}`).join(',') + `/${c.slot_duration}`
    const atual = conta.get(k)
    conta.set(k, {
      n: (atual?.n ?? 0) + 1,
      periodos: c.periods.map((p) => ({ start_time: p.start_time, end_time: p.end_time })),
      slot: c.slot_duration,
    })
  }
  let melhor: { n: number; periodos: Periodo[]; slot: number } | null = null
  for (const v of conta.values()) if (!melhor || v.n > melhor.n) melhor = v
  return melhor ?? { periodos: [{ start_time: '09:00', end_time: '18:00' }], slot: 30 }
}

export function periodosValidos(ps: Periodo[]): string | null {
  for (const p of ps) if (p.end_time <= p.start_time) return 'O fechamento tem que ser depois da abertura.'
  const ord = [...ps].sort((a, b) => a.start_time.localeCompare(b.start_time))
  for (let i = 1; i < ord.length; i++) {
    if (toMin(ord[i].start_time) < toMin(ord[i - 1].end_time)) return 'Os horários estão se sobrepondo.'
  }
  return null
}

/* Domingo e sábado são masculinos ("os outros domingos", "todo sábado");
   o resto é feminino. Teste de 02/10 pegou "As outras domingos". */
const MASCULINO = [0, 6]
export function todo(dow: number) {
  return MASCULINO.includes(dow) ? 'todo' : 'toda'
}
export function osOutros(dow: number) {
  return `${MASCULINO.includes(dow) ? 'Os outros' : 'As outras'} ${NOMES_DIA[dow].toLowerCase()}s`
}
export function fechadosDe(dow: number) {
  return MASCULINO.includes(dow) ? 'fechados' : 'fechadas'
}
export function umDia(dow: number) {
  return `${MASCULINO.includes(dow) ? 'um' : 'uma'} ${NOMES_DIA[dow].toLowerCase()}`
}
