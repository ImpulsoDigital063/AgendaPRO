/* Semana de atendimento (working_hours) — helpers compartilhados entre a
   tela de Horários do desktop (HorariosTab) e a do celular (HorariosMobile).
   Saíram de dentro do HorariosTab sem mudar uma linha de lógica. */

import type { WorkingHours } from '@/lib/types'

export const DAYS = [
  { id: 0, label: 'Dom', full: 'Domingo', short: 'D' },
  { id: 1, label: 'Seg', full: 'Segunda', short: 'S' },
  { id: 2, label: 'Ter', full: 'Terça', short: 'T' },
  { id: 3, label: 'Qua', full: 'Quarta', short: 'Q' },
  { id: 4, label: 'Qui', full: 'Quinta', short: 'Q' },
  { id: 5, label: 'Sex', full: 'Sexta', short: 'S' },
  { id: 6, label: 'Sáb', full: 'Sábado', short: 'S' },
]

export const DURATIONS = [5, 10, 15, 20, 30, 40, 45, 60, 75, 90, 120]
export const COMMERCIAL_DAYS = [1, 2, 3, 4, 5]
export const COMMERCIAL_PLUS_SAT_DAYS = [1, 2, 3, 4, 5, 6]
// Default 04/05/2026: abrir 08:00 / fechar 18:00 com pausa 12-13.
// Antes: 09:00-18:00 corrido (forçava admin adicionar pausa manualmente).
// Agora: já entrega 2 períodos prontos cobrindo 90% dos casos
// (barbearia/salão/estética/nail). Admin edita se quiser diferente.
export const COMMERCIAL_START = '08:00'
export const COMMERCIAL_LUNCH_START = '12:00'
export const COMMERCIAL_LUNCH_END = '13:00'
export const COMMERCIAL_END = '18:00'
export const COMMERCIAL_SLOT = 30

export function formatDuration(min: number) {
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

export function toMin(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** Soma das horas de TODOS os períodos abertos da semana */
export function diffHoursPerWeek(schedule: Schedule) {
  let total = 0
  for (const d of DAYS) {
    const c = schedule[d.id]
    if (!c.active) continue
    for (const p of c.periods) {
      const minutes = toMin(p.end_time) - toMin(p.start_time)
      if (minutes > 0) total += minutes
    }
  }
  return total / 60
}

/**
 * Períodos de atendimento dentro de um dia. Antes do v31 só havia 1
 * período contínuo por dia. Agora pode ter N (manhã + tarde com pausa
 * de almoço, por exemplo).
 */
export type Period = {
  start_time: string
  end_time: string
  /** ID da row em working_hours — undefined se ainda não foi salvo */
  existingId?: string
}

export type DayConfig = {
  active: boolean
  periods: Period[]
  /** slot_duration é por DIA — todos os períodos do dia compartilham */
  slot_duration: number
}

export type Schedule = Record<number, DayConfig>

export function buildSchedule(hours: WorkingHours[], professionalId: string): Schedule {
  const schedule: Schedule = {}
  DAYS.forEach(({ id }) => {
    const dayHours = hours
      .filter((h) => h.professional_id === professionalId && h.day_of_week === id)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))

    if (dayHours.length === 0) {
      schedule[id] = {
        active: false,
        periods: [
          { start_time: COMMERCIAL_START, end_time: COMMERCIAL_LUNCH_START },
          { start_time: COMMERCIAL_LUNCH_END, end_time: COMMERCIAL_END },
        ],
        slot_duration: COMMERCIAL_SLOT,
      }
    } else {
      schedule[id] = {
        active: true,
        periods: dayHours.map((h) => ({
          start_time: h.start_time.slice(0, 5),
          end_time: h.end_time.slice(0, 5),
          existingId: h.id,
        })),
        // Todos os períodos do dia têm o mesmo slot_duration por contrato.
        // Pega do primeiro pra refletir.
        slot_duration: dayHours[0].slot_duration,
      }
    }
  })
  return schedule
}

export function snapshot(s: Schedule): string {
  return DAYS.map((d) => {
    const cfg = s[d.id]
    if (!cfg.active) return `${d.id}:off`
    const ps = cfg.periods.map((p) => `${p.start_time}-${p.end_time}`).join(',')
    return `${d.id}:${ps}/${cfg.slot_duration}`
  }).join('|')
}

/**
 * Calcula um split sugerido pra "Adicionar pausa". Pega o último
 * período e tenta cortar ao meio com 1h de pausa. Ex: 9-18 → 9-12 + 13-18.
 * Se o último período for muito curto pra cortar, adiciona um período
 * novo após o último.
 */
export function suggestNewPeriodFromExisting(periods: Period[]): Period[] {
  if (periods.length === 0) {
    return [
      { start_time: COMMERCIAL_START, end_time: COMMERCIAL_LUNCH_START },
      { start_time: COMMERCIAL_LUNCH_END, end_time: COMMERCIAL_END },
    ]
  }
  const last = periods[periods.length - 1]
  const startM = toMin(last.start_time)
  const endM = toMin(last.end_time)
  const span = endM - startM

  if (span >= 240) {
    // Período de 4h+ — corta no meio com 1h de pausa
    const middle = startM + Math.floor(span / 2)
    const pauseEnd = middle + 60
    const fmt = (m: number) =>
      `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
    const newPeriods = [...periods.slice(0, -1)]
    newPeriods.push({ start_time: last.start_time, end_time: fmt(middle) })
    newPeriods.push({ start_time: fmt(pauseEnd), end_time: last.end_time })
    return newPeriods
  }

  // Período curto — adiciona novo bloco após o atual com 1h de pausa
  const nextStartM = endM + 60
  const nextEndM = Math.min(nextStartM + 240, 22 * 60)
  const fmt = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  return [...periods, { start_time: fmt(nextStartM), end_time: fmt(nextEndM) }]
}

/** Detecta sobreposição entre períodos do mesmo dia (avisar usuário) */
export function periodsOverlap(periods: Period[]): boolean {
  if (periods.length < 2) return false
  const sorted = [...periods].sort((a, b) => a.start_time.localeCompare(b.start_time))
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start_time < sorted[i - 1].end_time) return true
  }
  return false
}
