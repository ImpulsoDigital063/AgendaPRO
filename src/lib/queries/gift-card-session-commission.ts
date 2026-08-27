import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Comissão do RESGATE de cartão presente, por profissional (v140 · 27/08/2026).
 *
 * Irmã de `package-session-commission`, e existe pelo mesmo motivo: o
 * atendimento do resgate nasce com `total_price = 0` (a cliente já pagou na
 * VENDA do vale, e re-somar no resgate dobraria o faturamento). Só que, se a
 * comissão saísse do `total_price`, a profissional atenderia de graça.
 *
 * Base por modo do cartão:
 *   · 'services' — valor pago ÷ nº total de sessões do cartão
 *   · 'value'    — o valor efetivamente abatido naquele atendimento
 *                  (gift_card_sessions.amount)
 *
 * Reconhecida por `consumed_at` (momento do resgate), igual as telas filtram
 * atendimento por `paid_at`. Quem chama aplica o % da profissional sobre a
 * `base` — e, com comissão por serviço ligada, o % daquele serviço.
 *
 * @returns byProf[professionalId] = { base, lines[] }
 */
export type GiftCardSessionLine = {
  date: string
  cardCode: string
  serviceName: string
  base: number
}

export async function getGiftCardSessionCommission(
  sb: SupabaseClient,
  businessId: string,
  fromISO: string,
  toISO: string,
): Promise<Record<string, { base: number; lines: GiftCardSessionLine[] }>> {
  const out: Record<string, { base: number; lines: GiftCardSessionLine[] }> = {}

  const { data: sessions } = await sb
    .from('gift_card_sessions')
    .select(`
      id, professional_id, consumed_at, amount, gift_card_id, gift_card_service_id,
      gift_cards!inner(business_id, price_paid, code, mode),
      gift_card_services(service_name)
    `)
    .eq('gift_cards.business_id', businessId)
    .eq('status', 'consumed')
    .not('professional_id', 'is', null)
    .gte('consumed_at', fromISO)
    .lt('consumed_at', toISO)

  if (!sessions || sessions.length === 0) return out

  // Modo 'services': a base é o valor pago dividido pelo total de sessões do
  // cartão. Busca os totais em lote pros cartões envolvidos.
  const cardIds = Array.from(new Set(sessions.map((s) => s.gift_card_id as string)))
  const { data: servicos } = await sb
    .from('gift_card_services')
    .select('gift_card_id, sessions_total')
    .in('gift_card_id', cardIds)

  const totalSessionsByCard: Record<string, number> = {}
  for (const g of servicos ?? []) {
    const k = g.gift_card_id as string
    totalSessionsByCard[k] = (totalSessionsByCard[k] ?? 0) + Number(g.sessions_total ?? 0)
  }

  for (const s of sessions) {
    const profId = s.professional_id as string
    const card = Array.isArray(s.gift_cards) ? s.gift_cards[0] : s.gift_cards
    const svc = Array.isArray(s.gift_card_services) ? s.gift_card_services[0] : s.gift_card_services

    let base = 0
    if (card?.mode === 'value') {
      // Crédito em R$: comissiona sobre o que foi abatido neste atendimento.
      base = Number(s.amount ?? 0)
    } else {
      const totalSessions = totalSessionsByCard[s.gift_card_id as string] ?? 0
      if (totalSessions <= 0) continue
      base = Number(card?.price_paid ?? 0) / totalSessions
    }

    if (!(base > 0)) continue
    if (!out[profId]) out[profId] = { base: 0, lines: [] }
    out[profId].base += base
    out[profId].lines.push({
      date: String(s.consumed_at),
      cardCode: card?.code ?? 'Cartão presente',
      serviceName: svc?.service_name ?? 'Serviço',
      base,
    })
  }

  return out
}
