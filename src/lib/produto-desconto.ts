import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Valor de venda do PRODUTO dentro da comanda = o que foi cobrado dele.
 * Auditoria de produtos (28/09/2026).
 *
 * Dois furos com a mesma raiz — `sales.total` (que Hub, Início, Vendas e
 * comissão somam) ficava com o valor de quando o produto entrou na comanda:
 *  1. o "Desconto geral" (invoices.manual_discount) era rateado só entre os
 *     SERVIÇOS (getApptDiscountMap). Serviço R$100 + produto R$100 com R$20 de
 *     desconto: cliente pagou 180, o Hub somava 90 + 100 = 190.
 *  2. editar o preço do produto na comanda mudava invoice_items, não sales.
 *
 * Aqui: sales.total = invoice_items.total (o cobrado, já com desconto da linha
 * e preço editado) − parte proporcional do desconto geral. Mesma régua de
 * rateio do getApptDiscountMap (peso = total do item / soma dos itens).
 * Idempotente: recalcula do zero, pode rodar a cada fechamento.
 *
 * Chamar quando a comanda FECHA (pagamento), depois de gravar o desconto.
 */
export async function acertarValorDosProdutosDaComanda(
  admin: SupabaseClient,
  invoiceId: string,
): Promise<void> {
  const { data: inv } = await admin
    .from('invoices')
    .select('manual_discount')
    .eq('id', invoiceId)
    .maybeSingle()
  const descontoGeral = Number(inv?.manual_discount ?? 0)

  const { data: itens } = await admin
    .from('invoice_items')
    .select('item_type, reference_id, total')
    .eq('invoice_id', invoiceId)
  const lista = itens ?? []
  const soma = lista.reduce((s, i) => s + Number(i.total ?? 0), 0)

  for (const it of lista) {
    if (it.item_type !== 'product' || !it.reference_id) continue
    const cobrado = Number(it.total ?? 0)
    const parte = soma > 0 && descontoGeral > 0
      ? Math.round(((descontoGeral * cobrado) / soma) * 100) / 100
      : 0
    await admin
      .from('sales')
      .update({ total: Math.max(0, Math.round((cobrado - parte) * 100) / 100), discount: parte })
      .eq('id', it.reference_id)
  }
}

/**
 * Base da comissão PERCENTUAL de produto = valor líquido da venda
 * (Eduardo 28/09: igual ao serviço, decidido em 04/07). Distribui
 * `sales.total` (já líquido de desconto da linha, desconto geral e preço
 * editado) entre as linhas na proporção do bruto de cada uma.
 * Sem total confiável (0 ou bruto 0) cai no bruto da linha.
 */
export function baseLiquidaDaLinha(
  vendaTotal: number | null | undefined,
  linhas: { quantity: number | null; unit_price: number | null }[],
  linha: { quantity: number | null; unit_price: number | null },
): number {
  const bruto = (l: { quantity: number | null; unit_price: number | null }) =>
    Number(l.quantity ?? 0) * Number(l.unit_price ?? 0)
  const brutoLinha = bruto(linha)
  const brutoVenda = linhas.reduce((s, l) => s + bruto(l), 0)
  const total = Number(vendaTotal ?? 0)
  if (!(brutoVenda > 0) || !(total > 0)) return brutoLinha
  return (brutoLinha * total) / brutoVenda
}
