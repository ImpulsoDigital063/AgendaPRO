import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Como o valor de um atendimento se divide entre as formas de pagamento · 01/09/2026.
 *
 * PROBLEMA QUE ISSO RESOLVE
 * A comanda aceita pagamento dividido (Pix + dinheiro + cartão), e cada parte
 * vira uma linha em `invoice_payments`. Mas `appointments.payment_method` é UM
 * campo só: a rota de pagamento grava ali o método do MAIOR pagamento e diz, no
 * próprio comentário, que o detalhe fica em `invoice_payments`
 * (api/admin/invoices/[id]/pay/route.ts:174-180). Isso é de propósito.
 *
 * O erro estava na LEITURA. O Caixa somava a conferência por método a partir
 * desse campo único: uma comanda de R$270 paga com R$170 no Pix e R$100 em
 * dinheiro aparecia como R$270 de Pix e R$0 de dinheiro. A pessoa conta a
 * gaveta no fim do dia, acha R$100 que o sistema jura que não existe, e o
 * fechamento não bate. Todo dia com pagamento dividido.
 *
 * O Fluxo de Caixa já tinha tropeçado nisso e resolveu lendo `invoice_payments`
 * (financeiro/fluxo-caixa/page.tsx:15 — "perdia o cartão em split"). As duas
 * telas de Caixa ficaram de fora daquela varredura.
 *
 * POR QUE RATEIO, E NÃO SOMAR invoice_payments DIRETO
 * O Caixa monta o bruto a partir dos ATENDIMENTOS, já líquido de desconto e com
 * produto da comanda embutido (getApptChargedMap). Trocar a fonte do total pela
 * soma dos pagamentos mudaria o número exibido e abriria divergência com o resto
 * da tela. Aqui só devolvemos a PROPORÇÃO de cada método: quem chama continua
 * dono do valor, e distribui esse mesmo valor entre os métodos. O total não se
 * mexe — só a divisão passa a ser a verdadeira.
 *
 * Atendimento pago direto (sem comanda) não entra no mapa: o `payment_method`
 * dele é a verdade, e quem chama faz o fallback.
 *
 * λ.entidade-financeira-varrer-agregadores — existe UMA função pra isso.
 */

export type PaymentShare = {
  /** 'pix' | 'cash' | 'card' | 'courtesy' | 'points' | 'credit' */
  method: string
  /** 'credit' | 'debit' · só faz sentido em cartão */
  cardType: string | null
  feePercent: number | null
  /** fração do valor do atendimento nesse método · as frações somam 1 */
  ratio: number
}

/**
 * Mapa appointmentId → como o valor dele se reparte entre os métodos.
 * Só entra atendimento que está numa comanda COM pagamento registrado.
 */
export async function getApptPaymentSplitMap(
  sb: SupabaseClient,
  appointmentIds: (string | null | undefined)[],
): Promise<Record<string, PaymentShare[]>> {
  const out: Record<string, PaymentShare[]> = {}
  const ids = [...new Set(appointmentIds.filter((x): x is string => !!x))]
  if (ids.length === 0) return out

  // 1) atendimento → comanda
  const { data: apptItems } = await sb
    .from('invoice_items')
    .select('reference_id, invoice_id')
    .in('reference_id', ids)
    .eq('item_type', 'appointment')
  if (!apptItems?.length) return out

  const invoiceIds = [...new Set(apptItems.map((i) => i.invoice_id as string).filter(Boolean))]
  if (invoiceIds.length === 0) return out

  // 2) os pagamentos de cada comanda
  const { data: pagamentos } = await sb
    .from('invoice_payments')
    .select('invoice_id, payment_method, card_type, fee_percent, amount')
    .in('invoice_id', invoiceIds)
  if (!pagamentos?.length) return out

  // 3) proporção por comanda · linhas do mesmo método+bandeira+taxa viram uma só
  const porInvoice: Record<string, Map<string, PaymentShare & { amount: number }>> = {}
  const somaInvoice: Record<string, number> = {}
  for (const p of pagamentos) {
    const invId = p.invoice_id as string
    const amount = Number(p.amount ?? 0)
    if (!invId || !(amount > 0)) continue
    const method = (p.payment_method as string) ?? ''
    const cardType = (p.card_type as string | null) ?? null
    const feePercent = p.fee_percent == null ? null : Number(p.fee_percent)
    const chave = `${method}|${cardType ?? ''}|${feePercent ?? ''}`
    const bucket = (porInvoice[invId] ??= new Map())
    const atual = bucket.get(chave)
    if (atual) atual.amount += amount
    else bucket.set(chave, { method, cardType, feePercent, ratio: 0, amount })
    somaInvoice[invId] = (somaInvoice[invId] ?? 0) + amount
  }

  const sharesPorInvoice: Record<string, PaymentShare[]> = {}
  for (const [invId, bucket] of Object.entries(porInvoice)) {
    const soma = somaInvoice[invId] ?? 0
    if (!(soma > 0)) continue
    sharesPorInvoice[invId] = [...bucket.values()].map((s) => ({
      method: s.method,
      cardType: s.cardType,
      feePercent: s.feePercent,
      ratio: s.amount / soma,
    }))
  }

  for (const ai of apptItems) {
    const apptId = ai.reference_id as string
    const invId = ai.invoice_id as string
    const shares = invId ? sharesPorInvoice[invId] : undefined
    if (apptId && shares?.length) out[apptId] = shares
  }
  return out
}

/**
 * Reparte um valor em centavos entre as formas de pagamento, sem perder centavo:
 * a última fatia leva a sobra do arredondamento. Sem `shares`, devolve o valor
 * inteiro no método que veio do próprio atendimento (pagamento direto).
 */
export function repartirCentavos(
  cents: number,
  shares: PaymentShare[] | undefined,
  fallback: { method: string | null; cardType: string | null; feePercent: number | null },
): Array<PaymentShare & { cents: number }> {
  if (!shares?.length) {
    return [{
      method: fallback.method ?? '',
      cardType: fallback.cardType,
      feePercent: fallback.feePercent,
      ratio: 1,
      cents,
    }]
  }
  const out: Array<PaymentShare & { cents: number }> = []
  let acumulado = 0
  shares.forEach((s, i) => {
    const valor = i === shares.length - 1 ? cents - acumulado : Math.round(cents * s.ratio)
    acumulado += valor
    out.push({ ...s, cents: valor })
  })
  return out
}
