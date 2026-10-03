import type { SupabaseClient } from '@supabase/supabase-js'
import { getApptDiscountMap } from './commission-discount'
import { getPackageSessionCommission } from './queries/package-session-commission'
import { getGiftCardSessionCommission } from './queries/gift-card-session-commission'
import { baseLiquidaDaLinha } from './produto-desconto'

/**
 * Comissão GERADA no período, linha a linha, com a data de cada uma.
 *
 * Mesmas regras de Remunerações (fonte da verdade da comissão): % da pessoa ou
 * a fotografada no atendimento, valor fixo (commission_amount), base líquida de
 * desconto, recepção que não atende não comissiona, produto só com regra
 * explícita, resgate de pacote / cartão presente pela base da sessão.
 * Diferença única: convênio entra pela data em que a empresa PAGOU (aqui o
 * assunto é dinheiro, não o mês trabalhado).
 *
 * Usado pelo Financeiro e pelo Fluxo de Caixa pra mostrar o que é da equipe
 * antes da dona registrar o pagamento (Izanara 02/10: "o que é o líquido que
 * fica para o Studio").
 */
export type ComissaoLinha = {
  professionalId: string
  nome: string
  /** ISO (pagamento) ou YYYY-MM-DD (sessão de pacote / cartão) */
  quando: string
  valor: number
  tipo: 'servico' | 'pacote' | 'produto'
}

type SaleItemAgg = { quantity: number; unit_price: number; commission_type: string | null; commission_value: number | null }

export async function comissoesGeradas(
  sb: SupabaseClient,
  businessId: string,
  fromIso: string,
  toIso: string,
): Promise<ComissaoLinha[]> {
  const [{ data: profs }, { data: appts }, { data: sales }] = await Promise.all([
    sb
      .from('professionals')
      .select('id, name, commission_percentage, is_receptionist, does_appointments')
      .eq('business_id', businessId)
      .eq('active', true),
    sb
      .from('appointments')
      .select('id, professional_id, paid_at, total_price, invoice_item_id, commission_amount, commission_percent')
      .eq('business_id', businessId)
      .not('payment_method', 'in', '(courtesy,credit,points)')
      .gte('paid_at', fromIso)
      .lt('paid_at', toIso)
      .not('paid_at', 'is', null),
    sb
      .from('sales')
      .select('professional_id, paid_at, total, sale_items(quantity, unit_price, commission_type, commission_value)')
      .eq('business_id', businessId)
      .eq('type', 'product_sale')
      .eq('status', 'paid')
      .not('payment_method', 'in', '(courtesy,credit,points)')
      .gte('paid_at', fromIso)
      .lt('paid_at', toIso)
      .not('paid_at', 'is', null),
  ])

  const comissionados = new Map(
    (profs ?? [])
      .filter((p) => !(p.is_receptionist === true && p.does_appointments !== true))
      .map((p) => [p.id as string, { nome: p.name as string, pct: Number(p.commission_percentage ?? 40) }]),
  )
  if (comissionados.size === 0) return []

  const [disc, sessoes, cartoes] = await Promise.all([
    getApptDiscountMap(sb, (appts ?? []).map((a) => a.invoice_item_id)),
    getPackageSessionCommission(sb, businessId, fromIso, toIso),
    getGiftCardSessionCommission(sb, businessId, fromIso, toIso),
  ])

  const out: ComissaoLinha[] = []
  const push = (profId: string, quando: string, valor: number, tipo: ComissaoLinha['tipo']) => {
    const p = comissionados.get(profId)
    if (!p || !(valor > 0)) return
    out.push({ professionalId: profId, nome: p.nome, quando, valor: Math.round(valor * 100) / 100, tipo })
  }

  for (const a of appts ?? []) {
    const p = a.professional_id ? comissionados.get(a.professional_id) : undefined
    if (!p || !a.paid_at) continue
    let valor: number
    if (a.commission_amount != null) valor = Number(a.commission_amount)
    else {
      const base = Math.max(0, Number(a.total_price ?? 0) - (disc[a.id] ?? 0))
      const pct = a.commission_percent != null ? Number(a.commission_percent) : p.pct
      valor = (base * pct) / 100
    }
    push(a.professional_id as string, a.paid_at, valor, 'servico')
  }

  for (const mapa of [sessoes, cartoes] as Record<string, { lines: { date: string; base: number }[] }>[]) {
    for (const [profId, { lines }] of Object.entries(mapa)) {
      const p = comissionados.get(profId)
      if (!p) continue
      for (const l of lines) push(profId, l.date, (Number(l.base ?? 0) * p.pct) / 100, 'pacote')
    }
  }

  for (const s of (sales ?? []) as { professional_id: string | null; paid_at: string; total: number | null; sale_items: SaleItemAgg[] | null }[]) {
    if (!s.professional_id || !comissionados.has(s.professional_id)) continue
    const items = s.sale_items ?? []
    let valor = 0
    for (const it of items) {
      // Produto é do estúdio: só comissiona com regra explícita (Izanara 10/06)
      if (it.commission_type === 'percent' && it.commission_value != null) {
        valor += (baseLiquidaDaLinha(s.total, items, it) * Number(it.commission_value)) / 100
      } else if (it.commission_type === 'fixed' && it.commission_value != null) {
        valor += Number(it.quantity ?? 0) * Number(it.commission_value)
      }
    }
    push(s.professional_id, s.paid_at, valor, 'produto')
  }

  return out
}

/** Soma por profissional, maior primeiro. */
export function comissaoPorProfissional(linhas: ComissaoLinha[]): { nome: string; valor: number }[] {
  const m = new Map<string, { nome: string; valor: number }>()
  for (const l of linhas) {
    const cur = m.get(l.professionalId) ?? { nome: l.nome, valor: 0 }
    cur.valor += l.valor
    m.set(l.professionalId, cur)
  }
  return [...m.values()]
    .map((x) => ({ ...x, valor: Math.round(x.valor * 100) / 100 }))
    .sort((a, b) => b.valor - a.valor)
}
