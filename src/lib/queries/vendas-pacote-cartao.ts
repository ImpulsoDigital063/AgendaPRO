import type { SupabaseClient } from '@supabase/supabase-js'
import type { PaymentShare } from './appointment-payment-split'

/**
 * Venda de PACOTE e de CARTÃO PRESENTE que já foi paga (auditoria 29/09).
 * Elas só geram comanda + invoice_payments (sem atendimento e sem `sales`),
 * então Caixa e Hub — que somam atendimentos + vendas de produto — não as
 * viam: vendido em dinheiro, o Caixa acusava sobra. O Fluxo já contava.
 *
 * Entra no dia em que a comanda fechou, pelo valor do item, repartido entre
 * as formas de pagamento da comanda (sem a linha do sinal). Cortesia, crédito
 * e pontos não são dinheiro na gaveta nem receita (decisão 29/09): a fatia
 * paga assim fica de fora.
 */
export type VendaPacoteCartao = {
  id: string
  valor: number
  paid_at: string
  descricao: string
  payment_method: string | null
  payment_split?: PaymentShare[]
}

const FORA = new Set(['courtesy', 'credit', 'points'])

export async function vendasPacoteCartao(
  db: SupabaseClient,
  businessId: string,
  inicioIso: string,
  fimIso: string,
): Promise<VendaPacoteCartao[]> {
  const { data: itens } = await db
    .from('invoice_items')
    .select('id, item_type, description, total, invoice_id, invoices!inner(business_id, status, closed_at)')
    .in('item_type', ['package', 'gift_card'])
    .eq('invoices.business_id', businessId)
    .eq('invoices.status', 'closed')
    .gte('invoices.closed_at', inicioIso)
    .lt('invoices.closed_at', fimIso)
  if (!itens?.length) return []

  const invIds = [...new Set(itens.map((i) => i.invoice_id as string))]
  const { data: pagamentos } = await db
    .from('invoice_payments')
    .select('invoice_id, payment_method, amount, card_type, fee_percent')
    .in('invoice_id', invIds)
    .or('notes.is.null,notes.neq.Sinal do agendamento')

  const porInv: Record<string, { method: string; cardType: string | null; feePercent: number | null; amount: number }[]> = {}
  for (const p of pagamentos ?? []) {
    const a = Number(p.amount ?? 0)
    if (!(a > 0)) continue
    ;(porInv[p.invoice_id as string] ??= []).push({
      method: (p.payment_method as string) ?? '',
      cardType: (p.card_type as string | null) ?? null,
      feePercent: p.fee_percent == null ? null : Number(p.fee_percent),
      amount: a,
    })
  }

  const out: VendaPacoteCartao[] = []
  for (const it of itens) {
    const inv = (Array.isArray(it.invoices) ? it.invoices[0] : it.invoices) as { closed_at: string } | null
    const pags = porInv[it.invoice_id as string] ?? []
    const somaTotal = pags.reduce((s, p) => s + p.amount, 0)
    const validos = pags.filter((p) => !FORA.has(p.method))
    const somaValida = validos.reduce((s, p) => s + p.amount, 0)
    if (!(somaTotal > 0) || !(somaValida > 0) || !inv?.closed_at) continue
    // Só a fatia paga em dinheiro/pix/cartão
    const valor = Math.round(Number(it.total ?? 0) * (somaValida / somaTotal) * 100) / 100
    if (!(valor > 0)) continue
    const maior = [...validos].sort((a, b) => b.amount - a.amount)[0]
    out.push({
      id: `${it.item_type}-${it.id}`,
      valor,
      paid_at: inv.closed_at,
      descricao: `${it.item_type === 'package' ? 'Pacote' : 'Cartão presente'} · ${(it.description as string) ?? ''}`.trim(),
      payment_method: maior.method,
      payment_split: validos.length > 1
        ? validos.map((p) => ({ method: p.method, cardType: p.cardType, feePercent: p.feePercent, ratio: p.amount / somaValida }))
        : undefined,
    })
  }
  return out
}
