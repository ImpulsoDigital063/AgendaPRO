import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { gerarPixPreference } from '@/lib/billing'
import type { ModalidadeKey, PlanoTipo } from '@/config/pricing'
import { checkRateLimit } from '@/lib/rate-limit-api'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * POST /api/billing/regenerate-pix
 *
 * Cliente clica no banner amarelo "Pagar agora" no painel admin →
 * gera novo PIX (ou retorna o vigente se ainda válido).
 *
 * Atualiza pix_link_atual na subscription.
 * Só funciona pra modalidades PIX (mensal_pix, semestral_pix, anual_pix).
 */
export async function POST(req: NextRequest) {
  // Rate limit baixo — gera link MP (custo de API); abuse cara
  const rl = checkRateLimit(req, { key: 'regenerate-pix', limit: 10, windowSeconds: 3600 })
  if (rl) return rl

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const admin = getAdminClient()

  const { data: business } = await admin
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'Negócio não encontrado' }, { status: 404 })
  }

  const { data: sub } = await admin
    .from('subscriptions')
    .select('plan, plan_modalidade, pix_link_atual')
    .eq('business_id', business.id)
    .single()

  if (!sub) {
    return NextResponse.json({ error: 'Subscription não encontrada' }, { status: 404 })
  }

  if (!sub.plan_modalidade || sub.plan_modalidade === 'mensal_cartao') {
    return NextResponse.json({
      error: 'Esta modalidade não usa PIX (regenerar PIX só pra modalidades PIX)',
    }, { status: 400 })
  }

  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) {
    return NextResponse.json({ error: 'Mercado Pago não configurado' }, { status: 500 })
  }

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agendapro.net.br'

  const pix = await gerarPixPreference({
    businessId: business.id,
    payerEmail: user.email!,
    plan: sub.plan as PlanoTipo,
    modalidade: sub.plan_modalidade as Exclude<ModalidadeKey, 'mensal_cartao'>,
    appUrl: APP_URL,
    accessToken,
  })

  if (!pix.ok) {
    return NextResponse.json({
      error: pix.error,
      mp_status: pix.mp_status,
      mp_details: pix.mp_details,
    }, { status: 500 })
  }

  await admin
    .from('subscriptions')
    .update({ pix_link_atual: pix.init_point })
    .eq('business_id', business.id)

  return NextResponse.json({
    ok: true,
    url: pix.init_point,
    preference_id: pix.preference_id,
    valor_reais: pix.valor_reais,
    cobertura_meses: pix.cobertura_meses,
  })
}
