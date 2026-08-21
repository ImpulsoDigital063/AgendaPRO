/**
 * Recorrência de agendamento — série "repete no mesmo dia da semana".
 *
 * Estava dentro do AgendarModal (só desktop). Extraído em 20/08/2026 pra o
 * formulário do mobile usar o MESMO cálculo: o Gustavo (CAF) agenda sessão de
 * fisioterapia 2 ou 3 vezes por semana e remarcar uma a uma come o dia dele.
 *
 * LIMITE conhecido: repete sempre no mesmo dia da semana. "Quarta e sexta"
 * são DUAS séries, não uma. Não prometer o contrário.
 */

export type FreqRecorrencia = 'weekly' | 'biweekly' | 'monthly'

/** Gera as N datas da série a partir da data inicial. Mensal usa mesmo dia
 *  do próximo mês (com clamp pra meses curtos: 31/01 → 28/02 ou 29/02). */
export function buildRecurringDates(
  startISO: string,
  freq: FreqRecorrencia,
  count: number,
): string[] {
  const out: string[] = [startISO]
  const base = new Date(startISO + 'T12:00:00') // meio-dia evita pulada de DST
  for (let i = 1; i < count; i++) {
    const d = new Date(base)
    if (freq === 'weekly') d.setDate(base.getDate() + 7 * i)
    else if (freq === 'biweekly') d.setDate(base.getDate() + 14 * i)
    else {
      const target = new Date(base)
      target.setMonth(base.getMonth() + i)
      // Se o mês destino tem menos dias, JavaScript faz overflow (ex 31/01 + 1m vira 02/03).
      // Clampamos pro último dia do mês quando isso acontece.
      if (target.getMonth() !== (base.getMonth() + i) % 12) {
        target.setDate(0) // último dia do mês anterior, que é o mês alvo
      }
      d.setTime(target.getTime())
    }
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    out.push(`${y}-${m}-${day}`)
  }
  return out
}

/**
 * Série em VÁRIOS dias da semana, mesmo horário — pedido do Gustavo (CAF,
 * 20/08/2026): "segunda, quarta e sexta às quatro, dez sessões, marco as dez
 * de uma vez".
 *
 * `weekdays` usa a convenção do JS: 0=domingo … 6=sábado.
 * A primeira sessão é SEMPRE a data que ele está agendando (mesmo que o dia
 * dela não esteja marcado — é o atendimento que ele está criando agora). As
 * seguintes caem nos dias escolhidos, em ordem, até fechar `count`.
 */
export function buildRecurringDatesByWeekdays(
  startISO: string,
  weekdays: number[],
  count: number,
): string[] {
  if (weekdays.length === 0) return [startISO]
  const alvo = new Set(weekdays)
  const out: string[] = [startISO]
  const cursor = new Date(startISO + 'T12:00:00') // meio-dia evita pulada de DST
  // Teto de segurança: no pior caso (1 dia por semana) são 7 voltas por sessão.
  const maxVoltas = Math.max(1, count) * 7 + 14
  let voltas = 0
  while (out.length < count && voltas < maxVoltas) {
    cursor.setDate(cursor.getDate() + 1)
    voltas++
    if (!alvo.has(cursor.getDay())) continue
    const y = cursor.getFullYear()
    const m = String(cursor.getMonth() + 1).padStart(2, '0')
    const d = String(cursor.getDate()).padStart(2, '0')
    out.push(`${y}-${m}-${d}`)
  }
  return out
}

/** Rótulos curtos na ordem do getDay() do JS. */
export const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const
