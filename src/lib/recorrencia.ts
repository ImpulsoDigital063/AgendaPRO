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
