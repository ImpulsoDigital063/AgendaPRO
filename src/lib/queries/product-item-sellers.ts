import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Pra ITENS DE PRODUTO de uma comanda: resolve QUEM VENDEU (created_by → nome
 * do professional logado) e se o produto comissiona.
 *
 * Por quê: produto é VENDA — vai pro nome de quem vendeu (Adm/recepção), não do
 * profissional que atende. Só quando o produto tem comissão configurada é que
 * faz sentido mostrar o profissional (quem ganha). Mesma regra da lista de
 * Vendas (Eduardo 10/06). Centralizado aqui pra admin e recepção não divergirem.
 *
 * Retorna mapa keyed por sale.id (= invoice_item.reference_id do item produto).
 */
export type ProductSellerInfo = { sellerName: string | null; hasCommission: boolean }

export async function resolveProductItemSellers(
  admin: SupabaseClient,
  businessId: string,
  productSaleIds: string[],
): Promise<Record<string, ProductSellerInfo>> {
  const out: Record<string, ProductSellerInfo> = {}
  if (productSaleIds.length === 0) return out

  // Mapa auth_user_id → nome (o dono costuma ser professional com login)
  const { data: profAuth } = await admin
    .from('professionals')
    .select('auth_user_id, name')
    .eq('business_id', businessId)
    .not('auth_user_id', 'is', null)
  const nameByAuthId = new Map<string, string>()
  for (const p of profAuth ?? []) {
    if (p.auth_user_id) nameByAuthId.set(p.auth_user_id as string, p.name as string)
  }

  const { data: sales } = await admin
    .from('sales')
    .select('id, created_by, sale_items(commission_value)')
    .in('id', productSaleIds)

  for (const s of (sales ?? []) as { id: string; created_by: string | null; sale_items: { commission_value: number | null }[] | null }[]) {
    const hasCommission = (s.sale_items ?? []).some((it) => Number(it.commission_value ?? 0) > 0)
    const sellerName = s.created_by ? nameByAuthId.get(s.created_by) ?? null : null
    out[s.id] = { sellerName, hasCommission }
  }
  return out
}
