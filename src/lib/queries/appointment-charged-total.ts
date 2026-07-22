import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Valor REALMENTE COBRADO por atendimento · 22/07/2026.
 *
 * PROBLEMA QUE ISSO RESOLVE
 * `appointments.total_price` guarda só a soma dos SERVIÇOS — de propósito, é a
 * base da comissão (a profissional não ganha sobre material). Produtos vendidos
 * junto e itens de combo vivem como `invoice_items` (item_type='product') na
 * MESMA comanda. Quem paga a conta paga os dois.
 *
 * Resultado: toda tela que exibia `total_price` como "valor do atendimento"
 * mostrava MENOS do que a cliente paga. Num combo de R$290 (serviço R$195 +
 * 0,5 pacote de cabelo R$95) as telas diziam R$195 — inclusive a de faturar,
 * onde o dinheiro é cobrado. A pessoa cobrava 195, o banco fechava 290, e o
 * caixa não batia por R$95.
 *
 * REGRA
 *   - `charged`  = o que a cliente paga  → use pra EXIBIR e pra COBRAR
 *   - `services` = só os serviços        → use pra COMISSÃO (não mudar!)
 *
 * NÃO substitui `getApptDiscountMap` (commission-discount.ts): aquele rateia
 * desconto pra base de comissão e continua sendo a fonte da remuneração.
 *
 * λ.entidade-financeira-varrer-agregadores — existe UMA função pra isso, e
 * todas as telas puxam daqui, senão o número diverge entre elas de novo.
 */

export type ChargedProduct = {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export type ApptCharged = {
  invoiceId: string
  /** invoices.total · o que a cliente paga (já líquido de desconto da comanda) */
  charged: number
  /** soma dos itens de serviço · base da comissão */
  services: number
  /** produtos lançados na comanda (combo ou vendidos junto) */
  produtos: ChargedProduct[]
}

/**
 * Mapa appointmentId → valor cobrado + composição.
 * Atendimento sem comanda (ou sem produto) simplesmente não entra no mapa —
 * quem chama faz fallback pro total_price.
 */
export async function getApptChargedMap(
  sb: SupabaseClient,
  appointmentIds: (string | null | undefined)[],
): Promise<Record<string, ApptCharged>> {
  const out: Record<string, ApptCharged> = {}
  const ids = [...new Set(appointmentIds.filter((x): x is string => !!x))]
  if (ids.length === 0) return out

  // 1) appointment → invoice
  const { data: apptItems } = await sb
    .from('invoice_items')
    .select('reference_id, invoice_id')
    .in('reference_id', ids)
    .eq('item_type', 'appointment')
  if (!apptItems?.length) return out

  const invoiceIds = [...new Set(apptItems.map((i) => i.invoice_id as string).filter(Boolean))]
  if (invoiceIds.length === 0) return out

  // 2) todos os itens dessas comandas + o total de cada uma
  const [{ data: allItems }, { data: invoices }] = await Promise.all([
    sb.from('invoice_items')
      .select('invoice_id, item_type, description, quantity, unit_price, total')
      .in('invoice_id', invoiceIds),
    sb.from('invoices').select('id, total').in('id', invoiceIds),
  ])

  const invTotal: Record<string, number> = {}
  for (const inv of invoices ?? []) invTotal[inv.id as string] = Number(inv.total ?? 0)

  const porInvoice: Record<string, { services: number; produtos: ChargedProduct[] }> = {}
  for (const it of allItems ?? []) {
    const invId = it.invoice_id as string
    const bucket = (porInvoice[invId] ??= { services: 0, produtos: [] })
    if (it.item_type === 'product') {
      bucket.produtos.push({
        description: (it.description as string) ?? 'Produto',
        quantity: Number(it.quantity ?? 0),
        unitPrice: Number(it.unit_price ?? 0),
        total: Number(it.total ?? 0),
      })
    } else {
      bucket.services += Number(it.total ?? 0)
    }
  }

  for (const ai of apptItems) {
    const apptId = ai.reference_id as string
    const invId = ai.invoice_id as string
    if (!apptId || !invId) continue
    const b = porInvoice[invId] ?? { services: 0, produtos: [] }
    out[apptId] = {
      invoiceId: invId,
      charged: invTotal[invId] ?? b.services + b.produtos.reduce((s, p) => s + p.total, 0),
      services: b.services,
      produtos: b.produtos,
    }
  }
  return out
}

/** Versão de 1 atendimento. Devolve null se não achou comanda. */
export async function getApptCharged(
  sb: SupabaseClient,
  appointmentId: string | null | undefined,
): Promise<ApptCharged | null> {
  if (!appointmentId) return null
  const map = await getApptChargedMap(sb, [appointmentId])
  return map[appointmentId] ?? null
}

/**
 * Valor a EXIBIR/COBRAR: o da comanda quando houver produto, senão o do
 * atendimento. Centraliza o fallback pra não repetir o `??` em cada tela.
 */
export function valorExibido(totalPrice: number | null | undefined, charged: ApptCharged | null | undefined): number {
  if (charged && charged.produtos.length > 0) return charged.charged
  return Number(totalPrice ?? 0)
}
