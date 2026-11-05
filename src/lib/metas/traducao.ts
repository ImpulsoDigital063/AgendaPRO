/* ═══════════════════════════════════════════════════════════════
   R$ → ATENDIMENTOS (Eduardo, 04/11/2026)
   "R$ 6.000 = 27 atendimentos no seu ticket médio de R$ 220 · uns 6 por
   semana · 1 por dia de trabalho · 8 já agendados → faltam 19"
   Função pura: roda no navegador a cada tecla (o ticket e a agenda vêm
   calculados UMA vez do servidor). Atendimentos sempre inteiros, pra cima.
   ═══════════════════════════════════════════════════════════════ */

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0, minimumFractionDigits: 0 })
const atend = (n: number) => `${n} ${n === 1 ? 'atendimento' : 'atendimentos'}`

export function atendimentosPara(valor: number, ticket: number | null | undefined): number | null {
  if (!ticket || ticket <= 0 || valor <= 0) return null
  return Math.ceil(valor / ticket)
}

export function traduzirMeta(e: {
  valor: number
  ticket: number | null
  ticketOrigem: 'historico' | 'servicos' | null
  /** já faturado no mês (0 pra mês que ainda não começou) */
  faturado: number
  /** marcados de hoje ao fim do mês, não pagos */
  agendados: number
  /** dias de trabalho no mês inteiro */
  diasTrabalhoMes: number
  /** dias corridos do mês */
  diasNoMes: number
}): string | null {
  const total = atendimentosPara(e.valor, e.ticket)
  if (!total || !e.ticket) return null
  const partes: string[] = []
  partes.push(
    e.ticketOrigem === 'servicos'
      ? `${brl(e.valor)} = ${atend(total)} pela média dos seus serviços (${brl(e.ticket)})`
      : `${brl(e.valor)} = ${atend(total)} no seu ticket médio de ${brl(e.ticket)}`,
  )
  const semanas = Math.max(1, e.diasNoMes / 7)
  partes.push(`uns ${Math.max(1, Math.round(total / semanas))} por semana`)
  if (e.diasTrabalhoMes > 0) partes.push(`${Math.max(1, Math.round(total / e.diasTrabalhoMes))} por dia de trabalho`)
  const restante = e.faturado > 0 ? Math.ceil(Math.max(0, e.valor - e.faturado) / e.ticket) : total
  const faltam = Math.max(0, restante - e.agendados)
  if (e.faturado > 0) partes.push(`já entrou ${brl(e.faturado)}`)
  if (e.agendados > 0) partes.push(`${e.agendados} já ${e.agendados === 1 ? 'agendado' : 'agendados'} → faltam ${faltam}`)
  else if (e.faturado > 0) partes.push(`faltam ${atend(faltam)}`)
  return partes.join(' · ')
}

/* ─── Cofrinho: quanto guardar por mês ─────────────────────────────
   "pra ter R$ 4.000 até março, guarde R$ 800 por mês"
   (custo − guardado) ÷ meses restantes, contando o mês atual e o do prazo. */
export function mesesAte(mesAtual: string, ateMes: string): number {
  const a = Number(mesAtual.slice(0, 4)) * 12 + Number(mesAtual.slice(5, 7))
  const b = Number(ateMes.slice(0, 4)) * 12 + Number(ateMes.slice(5, 7))
  return b - a + 1
}

export function guardarPorMes(custo: number | null, guardado: number, ateMes: string | null, mesAtual: string): number | null {
  if (!custo || custo <= 0 || !ateMes) return null
  const falta = custo - guardado
  if (falta <= 0) return 0
  const meses = Math.max(1, mesesAte(mesAtual, ateMes))
  return Math.ceil(falta / meses / 10) * 10
}
