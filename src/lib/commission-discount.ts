import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Desconto rateado por appointment · 01/06/2026 (regra Luana).
 *
 * A comissão da profissional incide sobre o valor FINAL pago pela cliente
 * (com desconto), não sobre o valor cheio. O desconto vive em
 * invoices.discount (por COMANDA · pode ter vários serviços + produtos).
 * Esta função rateia o desconto proporcional ao valor de cada item e
 * retorna, por appointmentId, quanto de desconto (R$) cabe àquele serviço.
 *
 * Base líquida do serviço = appointment.total_price − (retorno desta função).
 *
 * Usado por TODAS as telas de remuneração (lista, detalhe, histórico, API)
 * pra nunca divergir o número entre elas (λ.entidade-financeira-varrer-agregadores).
 *
 * @param apptInvoiceItemIds  invoice_item_id dos appointments em questão
 * @returns mapa appointmentId → desconto em R$ a abater do total_price
 */
export async function getApptDiscountMap(
  sb: SupabaseClient,
  apptInvoiceItemIds: (string | null | undefined)[],
): Promise<Record<string, number>> {
  const out: Record<string, number> = {}
  const ids = apptInvoiceItemIds.filter((x): x is string => !!x)
  if (ids.length === 0) return out

  // invoice_item dos appointments → invoice (com discount)
  const { data: items } = await sb
    .from('invoice_items')
    .select('id, reference_id, item_type, total, invoices!inner(id, discount)')
    .in('id', ids)

  const invDiscount: Record<string, number> = {}
  const invIdsComDesc = new Set<string>()
  for (const it of items ?? []) {
    const inv = Array.isArray(it.invoices) ? it.invoices[0] : it.invoices
    if (!inv || Number(inv.discount ?? 0) <= 0) continue
    invDiscount[inv.id] = Number(inv.discount ?? 0)
    invIdsComDesc.add(inv.id)
  }
  if (invIdsComDesc.size === 0) return out

  // subtotal real de cada invoice com desconto = soma de TODOS os seus items
  const { data: allItems } = await sb
    .from('invoice_items')
    .select('invoice_id, total')
    .in('invoice_id', Array.from(invIdsComDesc))
  const invSubtotal: Record<string, number> = {}
  for (const it of allItems ?? []) {
    invSubtotal[it.invoice_id as string] = (invSubtotal[it.invoice_id as string] ?? 0) + Number(it.total ?? 0)
  }

  // rateia: cada appointment-item pega (seu total / subtotal) × desconto da comanda
  for (const it of items ?? []) {
    const inv = Array.isArray(it.invoices) ? it.invoices[0] : it.invoices
    if (!inv || !invIdsComDesc.has(inv.id) || it.item_type !== 'appointment') continue
    const sub = invSubtotal[inv.id] ?? 0
    if (sub <= 0) continue
    const frac = Number(it.total ?? 0) / sub
    const apptId = it.reference_id as string
    if (apptId) out[apptId] = (out[apptId] ?? 0) + invDiscount[inv.id] * frac
  }
  return out
}
