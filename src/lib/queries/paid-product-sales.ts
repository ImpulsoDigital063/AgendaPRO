import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Vendas de produto AVULSAS pagas no período (sales · type=product_sale · status=paid).
 *
 * Por que existe: várias telas financeiras agregam receita lendo só de
 * `appointments.paid_at`. Quando a Comanda V1 introduziu vendas de produto
 * (via tabela `sales`), todos esses agregadores ficaram subestimando a
 * receita. Esse helper centraliza a leitura pra que cada tela some no
 * mesmo padrão e nada mais fique desalinhado.
 *
 * Sempre que adicionar nova tela que mostre receita, importe daqui.
 * Sempre que mudar a estrutura de sales, mude AQUI.
 */
export type PaidProductSale = {
  id: string
  sale_date: string
  paid_at: string | null
  total: number
  payment_method: string | null
  professional_id: string | null
  professional_name: string | null
  customer_id: string | null
  client_name: string | null
  invoice_id: string | null
  items: { product_name: string; quantity: number; unit_price: number; commission_type: string | null; commission_value: number | null }[]
}

type ProfRel = { id: string; name: string } | { id: string; name: string }[] | null

export async function fetchPaidProductSales(
  sb: SupabaseClient,
  businessId: string,
  fromDate: string,
  toDate: string,
): Promise<PaidProductSale[]> {
  const { data } = await sb
    .from('sales')
    .select(`
      id, sale_date, paid_at, total, payment_method,
      professional_id, customer_id, client_name, invoice_id,
      professional:professionals(id, name),
      sale_items(product_name, quantity, unit_price, commission_type, commission_value)
    `)
    .eq('business_id', businessId)
    .eq('type', 'product_sale')
    .eq('status', 'paid')
    .gte('sale_date', fromDate)
    .lte('sale_date', toDate)

  return (data ?? []).map((s) => {
    const prof = s.professional as ProfRel
    const profObj = Array.isArray(prof) ? prof[0] : prof
    return {
      id: s.id as string,
      sale_date: s.sale_date as string,
      paid_at: s.paid_at as string | null,
      total: Number(s.total ?? 0),
      payment_method: s.payment_method as string | null,
      professional_id: s.professional_id as string | null,
      professional_name: profObj?.name ?? null,
      customer_id: s.customer_id as string | null,
      client_name: s.client_name as string | null,
      invoice_id: s.invoice_id as string | null,
      items: (s.sale_items as PaidProductSale['items'] | null) ?? [],
    }
  })
}

/** Soma simples do total pago no período · usado em KPIs de receita */
export function sumProductSales(sales: PaidProductSale[]): number {
  return sales.reduce((s, x) => s + x.total, 0)
}
