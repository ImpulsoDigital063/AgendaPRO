import type { SupabaseClient } from '@supabase/supabase-js'
import { composicaoDoSinal } from './sinal-cancelamento'

/**
 * Linhas de pagamento do SINAL já pago dos atendimentos de uma comanda.
 * Auditoria da comanda (29/09/2026).
 *
 * O sinal é dinheiro que já entrou — vira pagamento próprio, na DATA em que
 * caiu (decisão Eduardo 29/09: sinal conta no dia em que caiu). Duas correções
 * em relação ao que o Faturar fazia:
 *  - sinal pago COM CRÉDITO (aplicar-credito) entrava como 'pix' e virava
 *    faturamento; agora a parte em crédito entra como 'credit' (não é receita).
 *  - o "Receber pagamento" da comanda (/invoices/[id]/pay) não conhecia o
 *    sinal: cobrava o total cheio e, ao repagar, apagava a linha do sinal.
 *
 * Marca: notes = NOTA_SINAL. Quem apaga pagamentos pra repagar preserva essas.
 */
export const NOTA_SINAL = 'Sinal do agendamento'

export type LinhaSinal = { payment_method: 'pix' | 'credit'; amount: number; paid_at: string }

export async function linhasDoSinal(
  db: SupabaseClient,
  appointmentIds: string[],
): Promise<{ linhas: LinhaSinal[]; total: number }> {
  const linhas: LinhaSinal[] = []
  if (appointmentIds.length === 0) return { linhas, total: 0 }
  const { data: appts } = await db
    .from('appointments')
    .select('id, sinal_valor, sinal_pago_at')
    .in('id', appointmentIds)
  for (const a of appts ?? []) {
    if (!a.sinal_pago_at || !(Number(a.sinal_valor ?? 0) > 0)) continue
    const c = await composicaoDoSinal(db, a.id as string)
    if (c.emDinheiro > 0) linhas.push({ payment_method: 'pix', amount: c.emDinheiro, paid_at: a.sinal_pago_at as string })
    if (c.emCredito > 0) linhas.push({ payment_method: 'credit', amount: c.emCredito, paid_at: a.sinal_pago_at as string })
  }
  const total = Math.round(linhas.reduce((s, l) => s + l.amount, 0) * 100) / 100
  return { linhas, total }
}

/**
 * Pro CAIXA (decisão 29/09: sinal conta no dia em que caiu).
 * - sinalPorAtendimento: quanto de sinal cada atendimento já teve (total,
 *   dinheiro + crédito) — sai do valor do atendimento no dia em que ele é pago.
 * - sinaisRecebidos: sinais pagos no intervalo, só a parte em DINHEIRO (pix),
 *   que é o que entra na gaveta/extrato naquele dia.
 */
export async function sinalPorAtendimento(
  db: SupabaseClient,
  appointmentIds: string[],
): Promise<Record<string, number>> {
  const out: Record<string, number> = {}
  if (appointmentIds.length === 0) return out
  const { data } = await db
    .from('appointments')
    .select('id, sinal_valor, sinal_pago_at')
    .in('id', appointmentIds)
    .not('sinal_pago_at', 'is', null)
  for (const a of data ?? []) {
    const v = Number(a.sinal_valor ?? 0)
    if (v > 0) out[a.id as string] = v
  }
  return out
}

export async function sinaisRecebidos(
  db: SupabaseClient,
  businessId: string,
  inicioIso: string,
  fimIso: string,
): Promise<{ id: string; valor: number; paid_at: string; client_name: string }[]> {
  const { data } = await db
    .from('appointments')
    .select('id, client_name, sinal_valor, sinal_pago_at')
    .eq('business_id', businessId)
    .gt('sinal_valor', 0)
    .gte('sinal_pago_at', inicioIso)
    .lt('sinal_pago_at', fimIso)
  const out: { id: string; valor: number; paid_at: string; client_name: string }[] = []
  for (const a of data ?? []) {
    const c = await composicaoDoSinal(db, a.id as string)
    if (c.emDinheiro > 0) {
      out.push({ id: a.id as string, valor: c.emDinheiro, paid_at: a.sinal_pago_at as string, client_name: (a.client_name as string) ?? 'Cliente' })
    }
  }
  return out
}

/**
 * Pro HUB (receita do período · decisão 29/09: sinal conta no dia em que caiu).
 * - subtrair[apptId]: quanto tirar do atendimento pago do período — o sinal
 *   inteiro se caiu fora do período; só a parte em crédito se caiu dentro.
 * - somar: sinal em DINHEIRO recebido no período de atendimentos que NÃO
 *   estão em `apptIdsDoPeriodo` (atendimento em outro período ou ainda não pago).
 */
export async function ajusteSinalDoPeriodo(
  db: SupabaseClient,
  businessId: string,
  apptIdsDoPeriodo: string[],
  inicioIso: string,
  fimIso: string,
): Promise<{ subtrair: Record<string, number>; somar: number }> {
  const subtrair: Record<string, number> = {}
  const dentro = (iso: string) => iso >= inicioIso && iso < fimIso
  if (apptIdsDoPeriodo.length > 0) {
    const { data } = await db
      .from('appointments')
      .select('id, sinal_valor, sinal_pago_at')
      .in('id', apptIdsDoPeriodo)
      .gt('sinal_valor', 0)
      .not('sinal_pago_at', 'is', null)
    for (const a of data ?? []) {
      const c = await composicaoDoSinal(db, a.id as string)
      const v = dentro(new Date(a.sinal_pago_at as string).toISOString()) ? c.emCredito : c.total
      if (v > 0) subtrair[a.id as string] = v
    }
  }
  const periodo = new Set(apptIdsDoPeriodo)
  const recebidos = await sinaisRecebidos(db, businessId, inicioIso, fimIso)
  const somar = Math.round(recebidos.filter((r) => !periodo.has(r.id)).reduce((s, r) => s + r.valor, 0) * 100) / 100
  return { subtrair, somar }
}
