/**
 * Helpers de billing — utilitários genéricos.
 * Lógica específica de provider (Asaas) está em src/lib/asaas.ts.
 */

import { addDaysBR, addMonthsBR, dataBR, monthBoundsBR, startOfDayBR, todayBR } from './date-br'

/**
 * Calcula dias entre hoje e uma data — retorna negativo se data passada.
 * Ex: pago_ate = amanhã → retorna 1
 *     pago_ate = ontem  → retorna -1
 */
export function diasAteVencer(pagoAte: string | Date): number {
  const ate = pagoAte instanceof Date ? pagoAte : new Date(pagoAte)
  const agora = new Date()
  // Normaliza pra meia-noite pra não considerar horas
  ate.setHours(0, 0, 0, 0)
  agora.setHours(0, 0, 0, 0)
  return Math.ceil((ate.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Vencimento no DIA FIXO do cliente, `meses` depois do mês de `baseYmd`.
 * Mês sem esse dia (31 em setembro, 30 em fevereiro) gruda no último dia, e o
 * mês seguinte volta pro dia certo — por isso o dia vem de fora
 * (subscriptions.dia_vencimento) em vez de ser lido da data anterior.
 * Ex: vencimentoNoDia('2026-01-31', 1, 31) → '2026-02-28'
 *     vencimentoNoDia('2026-02-28', 1, 31) → '2026-03-31'
 */
export function vencimentoNoDia(baseYmd: string, meses: number, dia: number): string {
  const ym = addMonthsBR(baseYmd.slice(0, 7) + '-01', meses).slice(0, 7)
  const ultimo = Number(monthBoundsBR(ym).end.slice(8, 10))
  return `${ym}-${String(Math.min(dia, ultimo)).padStart(2, '0')}`
}

/**
 * Novo pago_ate depois de um pagamento confirmado (Eduardo, 15/10: "data fixa,
 * mesmo que seja paga em outra"; o banco guarda sempre o dia original).
 *
 * Base = vencimento atual, NUNCA o dia em que pagou: com "base = hoje" quem
 * pagava atrasado empurrava a data (Studio MOOD: 08 → 13 → 20 → 29).
 * - Primeiro pagamento depois do teste: base = hoje (ou o fim do teste, se ainda
 *   não acabou) e esse dia vira o dia fixo.
 * - Atraso tão grande que o vencimento seguinte também já passou: conta de hoje,
 *   mas no MESMO dia fixo — senão ela pagaria e continuaria bloqueada.
 *
 * Devolve o instante (meia-noite de Brasília) pra gravar em pago_ate e o dia
 * fixo a gravar em dia_vencimento.
 */
export function renovarVencimento(input: {
  pagoAte: string | null
  diaVencimento: number | null
  meses: number
  primeiroPagamento: boolean
}): { pagoAte: string; diaVencimento: number } {
  const hoje = todayBR()
  const atual = input.pagoAte ? dataBR(new Date(input.pagoAte)) : null
  const base = atual && (atual > hoje || !input.primeiroPagamento) ? atual : hoje
  const dia = input.diaVencimento ?? Number(base.slice(8, 10))
  let novo = vencimentoNoDia(base, input.meses, dia)
  if (novo <= hoje) novo = vencimentoNoDia(hoje, input.meses, dia)
  return { pagoAte: new Date(startOfDayBR(novo)).toISOString(), diaVencimento: dia }
}

/**
 * Data de vencimento (YYYY-MM-DD) da cobrança no Asaas: o próprio vencimento do
 * cliente, pra o PIX que chega bater com a data do painel. O Asaas não aceita
 * data no passado, então vencido → amanhã.
 */
export function dueDateDaCobranca(pagoAte: string | null): string {
  const amanha = addDaysBR(todayBR(), 1)
  if (!pagoAte) return amanha
  const venc = dataBR(new Date(pagoAte))
  return venc > todayBR() ? venc : amanha
}
