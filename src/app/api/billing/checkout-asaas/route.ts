import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { calcularPreco, type ModalidadeKey, type PlanoTipo } from '@/config/pricing'
import { checkRateLimit } from '@/lib/rate-limit-api'
import {
  createCustomer,
  findCustomerByExternalReference,
  createSubscription,
  createPayment,
  getPixQrCode,
  toAsaasParams,
  getNextDueDate,
} from '@/lib/asaas'

// =====================================================================
// POST /api/billing/checkout-asaas
//
// Variante Asaas do /api/billing/checkout.
//
// Body: { plan: 'solo' | 'equipe', modalidade, customer: { name, cpfCnpj, email? } }
//
// Fluxo:
//   1. Garante que existe customer no Asaas (cria se não existe)
//   2. Salva asaas_customer_id em subscriptions
//   3. Se cartão recorrente → cria subscription Asaas
//      Se PIX (mensal/semestral/anual) → cria payment avulso
//   4. Retorna { url: invoiceUrl } pra frontend redirecionar
// =====================================================================

const MODALIDADES_VALIDAS: ModalidadeKey[] = [
  'mensal_cartao',
  'mensal_pix',
  'semestral_pix',
  'anual_pix',
]

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, {
    key: 'billing-checkout-asaas',
    limit: 10,
    windowSeconds: 3600,
  })
  if (rl) return rl

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    plan?: string
    modalidade?: string
    customer?: { name?: string; cpfCnpj?: string; email?: string; mobilePhone?: string }
  }
  const { plan, modalidade, customer: customerInput } = body

  if (!plan || !['solo', 'equipe'].includes(plan)) {
    return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
  }

  const modalidadeKey = (modalidade ?? 'mensal_cartao') as ModalidadeKey
  if (!MODALIDADES_VALIDAS.includes(modalidadeKey)) {
    return NextResponse.json({ error: 'Modalidade inválida' }, { status: 400 })
  }

  const admin = getAdminClient()

  // Buscar negócio + subscription atual
  const { data: business } = await admin
    .from('businesses')
    .select('id, name, slug')
    .eq('owner_id', user.id)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'Negócio não encontrado' }, { status: 404 })
  }

  const { data: subscription } = await admin
    .from('subscriptions')
    .select('id, asaas_customer_id, asaas_subscription_id, status')
    .eq('business_id', business.id)
    .single()

  if (!subscription) {
    return NextResponse.json(
      { error: 'Subscription não encontrada' },
      { status: 404 }
    )
  }

  // ── 1. Garantir customer no Asaas ──────────────────────────────────
  let asaasCustomerId = subscription.asaas_customer_id as string | null

  if (!asaasCustomerId) {
    // Tenta achar via externalReference (caso já criado em tentativa anterior)
    const findRes = await findCustomerByExternalReference(business.id)
    if (findRes.ok && findRes.data?.data?.[0]?.id) {
      asaasCustomerId = findRes.data.data[0].id
    }
  }

  if (!asaasCustomerId) {
    // Cria customer novo
    if (!customerInput?.name || !customerInput?.cpfCnpj) {
      return NextResponse.json(
        {
          error:
            'Pra primeiro pagamento via Asaas, precisamos de nome completo e CPF/CNPJ.',
          needs_customer_data: true,
        },
        { status: 400 }
      )
    }

    const createRes = await createCustomer({
      name: customerInput.name,
      cpfCnpj: customerInput.cpfCnpj.replace(/\D/g, ''),
      email: customerInput.email ?? user.email,
      mobilePhone: customerInput.mobilePhone,
      externalReference: business.id,
    })

    if (!createRes.ok || !createRes.data?.id) {
      console.error('[checkout-asaas] createCustomer failed', createRes.error)
      return NextResponse.json(
        { error: `Asaas rejeitou criação do cliente: ${createRes.error}` },
        { status: 502 }
      )
    }

    asaasCustomerId = createRes.data.id

    await admin
      .from('subscriptions')
      .update({ asaas_customer_id: asaasCustomerId })
      .eq('id', subscription.id)
  }

  // ── 2. Calcular preço e parâmetros Asaas ───────────────────────────
  const preco = calcularPreco(plan as PlanoTipo, modalidadeKey)
  const params = toAsaasParams(
    plan as PlanoTipo,
    modalidadeKey,
    preco.valorReais
  )

  // ── 3. Criar subscription (cartão) ou payment (PIX) ────────────────
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.agendapro.net.br'
  const description = `AgendaPRO ${plan === 'solo' ? 'Solo' : 'Equipe'} — ${
    modalidadeKey === 'mensal_cartao'
      ? 'Mensalidade cartão'
      : modalidadeKey === 'mensal_pix'
      ? 'Mensalidade PIX'
      : modalidadeKey === 'semestral_pix'
      ? 'Semestral PIX'
      : 'Anual PIX'
  }`

  if (modalidadeKey === 'mensal_cartao' && params.cycle) {
    // Cartão recorrente → subscription Asaas
    const subRes = await createSubscription({
      customer: asaasCustomerId,
      billingType: 'CREDIT_CARD',
      value: params.value,
      nextDueDate: getNextDueDate(1),
      cycle: params.cycle,
      description,
      externalReference: business.id,
    })

    if (!subRes.ok || !subRes.data?.id) {
      console.error('[checkout-asaas] createSubscription failed', subRes.error)
      return NextResponse.json(
        { error: `Asaas rejeitou assinatura: ${subRes.error}` },
        { status: 502 }
      )
    }

    // Buscar 1ª cobrança da assinatura pra pegar invoiceUrl
    // (Asaas cria automaticamente ao criar subscription)
    const { listSubscriptionPayments } = await import('@/lib/asaas')
    const paysRes = await listSubscriptionPayments(subRes.data.id)
    const firstPayment = paysRes.data?.data?.[0]

    await admin
      .from('subscriptions')
      .update({
        asaas_subscription_id: subRes.data.id,
        asaas_payment_id_atual: firstPayment?.id ?? null,
        provider: 'asaas',
        plan,
        plan_modalidade: modalidadeKey,
        price_cents: preco.valorCentavos,
        // Reusa pix_link_atual como "checkout em aberto" tambem pra cartao —
        // permite /admin/bloqueado mostrar "Continuar pagamento iniciado".
        pix_link_atual: firstPayment?.invoiceUrl ?? null,
      })
      .eq('id', subscription.id)

    if (!firstPayment?.invoiceUrl) {
      // Sem invoice ainda — devolve o painel do Asaas como fallback (raro)
      return NextResponse.json({
        url: `${APP_URL}/admin?payment=pending`,
        subscription_id: subRes.data.id,
        modalidade: modalidadeKey,
        warning: 'Asaas criou subscription mas sem invoice imediato',
      })
    }

    return NextResponse.json({
      url: firstPayment.invoiceUrl,
      subscription_id: subRes.data.id,
      payment_id: firstPayment.id,
      modalidade: modalidadeKey,
    })
  }

  // PIX (mensal_pix / semestral_pix / anual_pix) → payment avulso
  const payRes = await createPayment({
    customer: asaasCustomerId,
    billingType: 'PIX',
    value: params.value,
    dueDate: getNextDueDate(1),
    description,
    externalReference: `${business.id}|${modalidadeKey}|${preco.coberturaMeses}`,
  })

  if (!payRes.ok || !payRes.data?.id || !payRes.data?.invoiceUrl) {
    console.error('[checkout-asaas] createPayment PIX failed', payRes.error)
    return NextResponse.json(
      { error: `Asaas rejeitou cobrança PIX: ${payRes.error}` },
      { status: 502 }
    )
  }

  // Puxa QR Code direto pra renderizar dentro do AgendaPRO (sem cliente sair)
  const qrRes = await getPixQrCode(payRes.data.id)

  await admin
    .from('subscriptions')
    .update({
      provider: 'asaas',
      plan,
      plan_modalidade: modalidadeKey,
      price_cents: preco.valorCentavos,
      pix_link_atual: payRes.data.invoiceUrl,
      asaas_payment_id_atual: payRes.data.id,
    })
    .eq('id', subscription.id)

  return NextResponse.json({
    // inline=true sinaliza pro front: renderiza QR no AgendaPRO, NAO redireciona
    inline: true,
    payment_id: payRes.data.id,
    modalidade: modalidadeKey,
    cobertura_meses: preco.coberturaMeses,
    valor_reais: preco.valorReais,
    qr_image: qrRes.data?.encodedImage ?? null,
    qr_payload: qrRes.data?.payload ?? null,
    qr_expiration: qrRes.data?.expirationDate ?? null,
    // fallback se cliente preferir abrir checkout Asaas (raro)
    invoice_url: payRes.data.invoiceUrl,
  })
}
