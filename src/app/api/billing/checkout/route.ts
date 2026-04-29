import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { calcularPreco, type ModalidadeKey, type PlanoTipo } from '@/config/pricing'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const MODALIDADES_VALIDAS: ModalidadeKey[] = [
  'mensal_cartao',
  'mensal_pix',
  'semestral_pix',
  'anual_pix',
]

/**
 * POST /api/billing/checkout
 *
 * Body: { plan: 'solo' | 'equipe', modalidade: 'mensal_cartao' | 'mensal_pix' | 'semestral_pix' | 'anual_pix' }
 *
 * Retorna:
 *   - mensal_cartao: { url } — init_point do preapproval (assinatura recorrente)
 *   - mensal_pix / semestral_pix / anual_pix: { url, expires_at } — init_point do PIX único
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await req.json() as { plan?: string; modalidade?: string }
  const { plan, modalidade } = body

  if (!plan || !['solo', 'equipe'].includes(plan)) {
    return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
  }

  // Default mensal_cartao pra retrocompatibilidade (clientes que não enviam modalidade)
  const modalidadeKey = (modalidade ?? 'mensal_cartao') as ModalidadeKey
  if (!MODALIDADES_VALIDAS.includes(modalidadeKey)) {
    return NextResponse.json({ error: 'Modalidade inválida' }, { status: 400 })
  }

  const admin = getAdminClient()

  // Buscar o negócio do usuário
  const { data: business } = await admin
    .from('businesses')
    .select('id, name, slug')
    .eq('owner_id', user.id)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'Negócio não encontrado' }, { status: 404 })
  }

  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) {
    return NextResponse.json({ error: 'Mercado Pago não configurado' }, { status: 500 })
  }

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agendapro.net.br'
  const preco = calcularPreco(plan as PlanoTipo, modalidadeKey)

  // ── ROUTE 1: mensal_cartao → preapproval (assinatura recorrente) ────────────
  if (preco.metodoMP === 'preapproval') {
    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        reason: `AgendaPRO — Plano ${plan === 'solo' ? 'Solo' : 'Equipe'}`,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: preco.valorReais,
          currency_id: 'BRL',
        },
        payer_email: user.email,
        back_url: `${APP_URL}/admin`,
        external_reference: business.id,
        notification_url: `${APP_URL}/api/webhooks/mercadopago`,
      }),
    })

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text()
      console.error('[Billing] MP rejeitou preapproval:', mpResponse.status, errorText)
      let mpError: unknown = errorText
      try { mpError = JSON.parse(errorText) } catch {}
      const mpMessage =
        (mpError as { message?: string; error?: string })?.message ||
        (mpError as { message?: string; error?: string })?.error ||
        errorText
      return NextResponse.json({
        error: `MP rejeitou (${mpResponse.status}): ${mpMessage}`,
        mp_status: mpResponse.status,
        mp_details: mpError,
      }, { status: 500 })
    }

    const mpData = await mpResponse.json()

    await admin
      .from('subscriptions')
      .update({
        mp_subscription_id: mpData.id,
        plan,
        plan_modalidade: modalidadeKey,
        price_cents: preco.valorCentavos,
      })
      .eq('business_id', business.id)

    return NextResponse.json({
      url: mpData.init_point,
      subscription_id: mpData.id,
      modalidade: modalidadeKey,
    })
  }

  // ── ROUTE 2: PIX único (mensal_pix / semestral_pix / anual_pix) ────────────
  // Cria preference (não preapproval) — pagamento único via PIX
  // Cobertura: define quanto tempo o pagamento cobre (1, 6 ou 12 meses)

  const titulo =
    modalidadeKey === 'mensal_pix'    ? `AgendaPRO ${plan === 'solo' ? 'Solo' : 'Equipe'} — Mensalidade ${plan === 'solo' ? 'R$ 67' : 'R$ 97'} (PIX)` :
    modalidadeKey === 'semestral_pix' ? `AgendaPRO ${plan === 'solo' ? 'Solo' : 'Equipe'} — Semestral à vista (PIX)` :
                                         `AgendaPRO ${plan === 'solo' ? 'Solo' : 'Equipe'} — Anual à vista (PIX)`

  const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      items: [{
        id: `agendapro-${plan}-${modalidadeKey}`,
        title: titulo,
        description: `Cobre ${preco.coberturaMeses} ${preco.coberturaMeses === 1 ? 'mês' : 'meses'} de uso da plataforma AgendaPRO`,
        quantity: 1,
        unit_price: preco.valorReais,
        currency_id: 'BRL',
      }],
      payer: {
        email: user.email,
      },
      payment_methods: {
        // Forçar SOMENTE PIX nessa rota — cliente já escolheu PIX na UI
        excluded_payment_types: [
          { id: 'credit_card' },
          { id: 'debit_card' },
          { id: 'ticket' }, // boleto
          { id: 'atm' },
        ],
        installments: 1,
      },
      back_urls: {
        success: `${APP_URL}/admin?payment=success`,
        pending: `${APP_URL}/admin?payment=pending`,
        failure: `${APP_URL}/admin/bloqueado?payment=failure`,
      },
      auto_return: 'approved',
      external_reference: `${business.id}|${modalidadeKey}|${preco.coberturaMeses}`,
      notification_url: `${APP_URL}/api/webhooks/mercadopago`,
      // Expira em 30 minutos — depois disso o link fica inválido
      expires: true,
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    }),
  })

  if (!mpResponse.ok) {
    const errorText = await mpResponse.text()
    console.error('[Billing] MP rejeitou preference PIX:', mpResponse.status, errorText)
    let mpError: unknown = errorText
    try { mpError = JSON.parse(errorText) } catch {}
    const mpMessage =
      (mpError as { message?: string; error?: string })?.message ||
      (mpError as { message?: string; error?: string })?.error ||
      errorText
    return NextResponse.json({
      error: `MP rejeitou (${mpResponse.status}): ${mpMessage}`,
      mp_status: mpResponse.status,
      mp_details: mpError,
    }, { status: 500 })
  }

  const mpData = await mpResponse.json()

  await admin
    .from('subscriptions')
    .update({
      plan,
      plan_modalidade: modalidadeKey,
      price_cents: preco.valorCentavos,
      pix_link_atual: mpData.init_point,
    })
    .eq('business_id', business.id)

  return NextResponse.json({
    url: mpData.init_point,
    preference_id: mpData.id,
    modalidade: modalidadeKey,
    cobertura_meses: preco.coberturaMeses,
    valor_reais: preco.valorReais,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  })
}
