/* ═══════════════════════════════════════════════════════════════
   OS PERÍODOS DE UMA PROFISSIONAL NUMA DATA (v153)

   Wanessa, 30/09/2026: "não quero atender toda sexta, mas quero atender
   na sexta 09/10". working_hours é por dia da semana; working_hours_dates
   é por data. Regra (Eduardo, 02/10): se a data tem horário especial, ele
   SUBSTITUI o semanal daquele dia — não soma. Sem horário especial, vale
   o semanal como sempre.

   Fonte única: o link público (BookingFlow) e a grade da agenda chamam
   isto. Duas regras escritas em dois lugares é como a sexta aparece
   aberta no link e fechada no painel.

   Bloqueio (business_blocks) continua por cima — quem tira horário é ele,
   não este arquivo.
   ═══════════════════════════════════════════════════════════════ */

export type HorarioPorData = {
  id?: string
  professional_id: string
  date: string // AAAA-MM-DD
  start_time: string
  end_time: string
  slot_duration: number
}

type Semanal = {
  id?: string
  professional_id: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration: number
}

export type Periodo = {
  id: string
  professional_id: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration: number
  /** true = veio do horário especial da data */
  especial: boolean
}

/** Data local AAAA-MM-DD (sem fuso: o dia que a pessoa vê no calendário). */
export function ymdLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function periodosDoDia(
  semanal: Semanal[],
  datas: HorarioPorData[] | null | undefined,
  professionalId: string | null | undefined,
  dia: Date | string,
): Periodo[] {
  if (!professionalId) return []
  const ymd = typeof dia === 'string' ? dia : ymdLocal(dia)
  const dow = typeof dia === 'string' ? new Date(`${dia}T12:00:00`).getDay() : dia.getDay()

  const especiais = (datas ?? []).filter((d) => d.professional_id === professionalId && d.date === ymd)
  const fonte = especiais.length > 0
    ? especiais.map((d, i) => ({
        id: d.id ?? `data-${ymd}-${i}`,
        professional_id: d.professional_id,
        day_of_week: dow,
        start_time: d.start_time,
        end_time: d.end_time,
        slot_duration: d.slot_duration,
        especial: true,
      }))
    : semanal
        .filter((w) => w.professional_id === professionalId && w.day_of_week === dow)
        .map((w, i) => ({
          id: w.id ?? `sem-${dow}-${i}`,
          professional_id: w.professional_id,
          day_of_week: w.day_of_week,
          start_time: w.start_time,
          end_time: w.end_time,
          slot_duration: w.slot_duration,
          especial: false,
        }))
  return fonte.sort((a, b) => a.start_time.localeCompare(b.start_time))
}
