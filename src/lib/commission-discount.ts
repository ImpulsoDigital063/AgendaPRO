import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizarAlvo, ratearDescontoGeral, type ItemRateio } from './desconto-geral'

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

  /* 28/09/2026 · o desconto do atendimento = desconto da PRÓPRIA linha +
     a parte do desconto geral que cabe a ele segundo invoices.discount_target
     (serviço / produto / proporcional · ratearDescontoGeral). Antes rateava
     invoices.discount inteiro (que soma o desconto das linhas de TODOS os
     itens) — desconto da linha de um produto vazava pro serviço. */
  const { data: items } = await sb
    .from('invoice_items')
    .select('id, invoice_id, reference_id, item_type, total, discount, invoices!inner(id, discount, manual_discount, discount_target)')
    .in('id', ids)

  const comDesconto = new Set<string>()
  const faturas: Record<string, { geral: number; alvo: ReturnType<typeof normalizarAlvo> }> = {}
  for (const it of items ?? []) {
    const inv = (Array.isArray(it.invoices) ? it.invoices[0] : it.invoices) as
      | { id: string; discount: number | null; manual_discount: number | null; discount_target?: string | null }
      | null
    if (!inv || Number(inv.discount ?? 0) <= 0) continue
    comDesconto.add(inv.id)
    faturas[inv.id] = { geral: Number(inv.manual_discount ?? 0), alvo: normalizarAlvo(inv.discount_target) }
  }
  if (comDesconto.size === 0) return out

  // Todos os itens dessas comandas (o rateio precisa do peso de cada um)
  const { data: allItems } = await sb
    .from('invoice_items')
    .select('id, invoice_id, item_type, total')
    .in('invoice_id', Array.from(comDesconto))
  const porFatura: Record<string, ItemRateio[]> = {}
  for (const it of allItems ?? []) {
    const k = it.invoice_id as string
    ;(porFatura[k] ??= []).push({ chave: it.id as string, tipo: it.item_type as string, total: Number(it.total ?? 0) })
  }
  const partes: Record<string, Map<string, number>> = {}
  for (const invId of comDesconto) {
    partes[invId] = ratearDescontoGeral(porFatura[invId] ?? [], faturas[invId].geral, faturas[invId].alvo)
  }

  for (const it of items ?? []) {
    if (it.item_type !== 'appointment' || !it.reference_id) continue
    const invId = it.invoice_id as string
    if (!comDesconto.has(invId)) continue
    const daLinha = Number(it.discount ?? 0)
    const doGeral = partes[invId]?.get(it.id as string) ?? 0
    const apptId = it.reference_id as string
    if (daLinha + doGeral > 0) out[apptId] = (out[apptId] ?? 0) + daLinha + doGeral
  }
  return out
}
