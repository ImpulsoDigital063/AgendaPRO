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
