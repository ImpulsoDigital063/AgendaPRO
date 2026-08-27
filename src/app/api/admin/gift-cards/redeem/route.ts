import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { resolveBusinessIdOperacao as getBusinessId } from '@/lib/api-business-access'

function getAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

/**
 * GET /api/admin/gift-cards/redeem?q=<termo>  · READ-ONLY.
 * Busca vales ATIVOS do business pela presenteada (recipient_name ILIKE %q%)
 * OU pelo código impresso (code = q.toUpperCase()).
 *
 * Retorna, por vale: id, code, mode, recipient_name, recipient_customer_id,
 * value_total, value_used, expires_at e — no modo 'services' — os
 * gift_card_services com { id, service_id, service_name, sessions_total,
 * sessions_used, disponivel }.
 *   disponivel = sessions_total − COUNT(gift_card_sessions do serviço com
 *                status IN ('reserved','consumed')).
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const qRaw = (url.searchParams.get('q') ?? '').trim()
  if (!qRaw) return NextResponse.json({ error: 'q_required' }, { status: 400 })

  // Sanitiza pra não quebrar a sintaxe do filtro .or() do PostgREST (vírgula/
  // parênteses são separadores) NEM injetar curingas ILIKE (% e _ casariam tudo).
  // Nome de cliente / código não têm esses chars → remover é seguro.
  const qSafe = qRaw.replace(/[(),%_]/g, ' ').trim()
  // Se sobrou vazio após a sanitização, NÃO consulta — senão o filtro vira
  // ilike.%% e listaria TODOS os vales ativos (vazamento).
  if (!qSafe) return NextResponse.json({ ok: true, gift_cards: [] })
  const qUpper = qSafe.toUpperCase()

  const admin = getAdmin()

  const { data: cards, error } = await admin
    .from('gift_cards')
    .select('id, code, mode, recipient_name, recipient_customer_id, value_total, value_used, expires_at')
    .eq('business_id', businessId)
    .eq('status', 'active')
    .or(`recipient_name.ilike.%${qSafe}%,code.eq.${qUpper}`)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const cardList = cards ?? []
  const serviceCardIds = cardList.filter((c) => c.mode === 'services').map((c) => c.id)

  // Carrega os serviços dos vales modo 'services' + as sessões (reserved/consumed)
  // pra computar disponível. Uma query por tabela (não por vale).
  let servicesByCard: Record<string, Array<{
    id: string; service_id: string; service_name: string; sessions_total: number; sessions_used: number; disponivel: number
  }>> = {}

  if (serviceCardIds.length > 0) {
    const [{ data: gcs }, { data: sessions }] = await Promise.all([
      admin
        .from('gift_card_services')
        .select('id, gift_card_id, service_id, service_name, sessions_total, sessions_used')
        .in('gift_card_id', serviceCardIds),
      admin
        .from('gift_card_sessions')
        .select('gift_card_service_id, status')
        .in('gift_card_id', serviceCardIds)
        .in('status', ['reserved', 'consumed']),
    ])

    // COUNT de comprometidas por gift_card_service_id
    const committedByService: Record<string, number> = {}
    for (const s of sessions ?? []) {
      if (!s.gift_card_service_id) continue
      committedByService[s.gift_card_service_id] = (committedByService[s.gift_card_service_id] ?? 0) + 1
    }

    for (const svc of gcs ?? []) {
      const committed = committedByService[svc.id] ?? 0
      const row = {
        id: svc.id,
        service_id: svc.service_id,
        service_name: svc.service_name,
        sessions_total: svc.sessions_total,
        sessions_used: svc.sessions_used,
        disponivel: svc.sessions_total - committed,
      }
      ;(servicesByCard[svc.gift_card_id] ??= []).push(row)
    }
  }

  const result = cardList.map((c) => ({
    id: c.id,
    code: c.code,
    mode: c.mode,
    recipient_name: c.recipient_name,
    recipient_customer_id: c.recipient_customer_id,
    value_total: c.value_total,
    value_used: c.value_used,
    expires_at: c.expires_at,
    ...(c.mode === 'services' ? { gift_card_services: servicesByCard[c.id] ?? [] } : {}),
  }))

  return NextResponse.json({ ok: true, gift_cards: result })
}
