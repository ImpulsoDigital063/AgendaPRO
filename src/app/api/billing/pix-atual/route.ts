import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit-api'
import { calcularPreco, type ModalidadeKey, type PlanoTipo } from '@/config/pricing'
import {
  getPaymentById,
  getPixQrCode,
  createPayment,
  findCustomerByExternalReference,
  getNextDueDate,
} from '@/lib/asaas'

// =====================================================================
// GET /api/billing/pix-atual
//
// Devolve o PIX da cobrança VIGENTE pro cliente pagar dentro do painel,
// sem sair pro checkout do Asaas. É a espinha do "pagar pela tela do app"
// (decisão Eduardo 18/07): o painel é o canal de cobrança, email é reforço.
//
// Opção A (reaproveitar, não duplicar): tenta usar a cobrança que o cron
// billing-check já criou (asaas_payment_id_atual). Só gera uma nova se não
// existir, se a antiga já foi paga, ou se o Asaas não devolver mais o QR.
// Assim o cliente nunca vê duas cobranças abertas pro mesmo mês.
//
// Só faz sentido pra modalidades PIX — cartão automático o Asaas retenta só.
// =====================================================================

const PIX_MODALIDADES: ModalidadeKey[] = ['mensal_pix', 'semestral_pix', 'anual_pix']
const STATUS_PAGO = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH']
const STATUS_PAGAVEL = ['PENDING', 'OVERDUE', 'AWAITING_RISK_ANALYSIS']

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'billing-pix-atual', limit: 20, windowSeconds: 60 })
  if (rl) return rl

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const admin = getAdminClient()

  const { data: business } = await admin
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'Negócio não encontrado' }, { status: 404 })
  }

  const { data: sub } = await admin
    .from('subscriptions')
    .select('id, plan, plan_modalidade, asaas_customer_id, asaas_payment_id_atual')
    .eq('business_id', business.id)
    .single()

  if (!sub) {
    return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 })
  }

  const modalidade = sub.plan_modalidade as ModalidadeKey | null
  if (!modalidade || !PIX_MODALIDADES.includes(modalidade)) {
    // Cartão automático (ou sem ciclo) não paga PIX manual pelo painel.
    return NextResponse.json({ error: 'Cobrança PIX indisponível pra esta assinatura' }, { status: 400 })
  }

  const plan = (sub.plan === 'equipe' ? 'equipe' : 'solo') as PlanoTipo
  const preco = calcularPreco(plan, modalidade)

  function qrResponse(paymentId: string, qr: { encodedImage?: string; payload?: string; expirationDate?: string } | null) {
    return NextResponse.json({
      payment_id: paymentId,
      modalidade,
      cobertura_meses: preco.coberturaMeses,
      valor_reais: preco.valorReais,
      qr_image: qr?.encodedImage ?? null,
      qr_payload: qr?.payload ?? null,
      qr_expiration: qr?.expirationDate ?? null,
    })
  }

  // ── 1. Tentar REAPROVEITAR a cobrança vigente (a do cron) ────────────
  if (sub.asaas_payment_id_atual) {
    const payRes = await getPaymentById(sub.asaas_payment_id_atual)
    if (payRes.ok && payRes.data) {
      const st = payRes.data.status
      if (STATUS_PAGO.includes(st)) {
        // Já paga — webhook deve ativar em segundos. Front trata como sucesso.
        return NextResponse.json({ paid: true })
      }
      if (STATUS_PAGAVEL.includes(st)) {
        const qrRes = await getPixQrCode(sub.asaas_payment_id_atual)
        if (qrRes.ok && qrRes.data?.payload) {
          return qrResponse(sub.asaas_payment_id_atual, qrRes.data)
        }
        // QR não voltou (expirou) → cai pra gerar nova cobrança abaixo.
      }
      // REFUNDED / cancelada / sem QR → gera nova abaixo.
    }
  }

  // ── 2. Gerar cobrança nova (só quando não deu pra reaproveitar) ──────
  let asaasCustomerId = sub.asaas_customer_id as string | null
  if (!asaasCustomerId) {
    const findRes = await findCustomerByExternalReference(business.id)
    if (findRes.ok && findRes.data?.data?.[0]?.id) {
      asaasCustomerId = findRes.data.data[0].id
      await admin.from('subscriptions').update({ asaas_customer_id: asaasCustomerId }).eq('id', sub.id)
    }
  }
  if (!asaasCustomerId) {
    // Sem cadastro no Asaas — recorrente sempre tem; se cair aqui, manda pro
    // fluxo completo de checkout (que coleta CPF/CNPJ).
    return NextResponse.json({ error: 'need_full_checkout' }, { status: 409 })
  }

  const payRes = await createPayment({
    customer: asaasCustomerId,
    billingType: 'PIX',
    value: preco.valorReais,
    dueDate: getNextDueDate(1),
    description: `AgendaPRO ${plan === 'solo' ? 'Solo' : 'Equipe'} — renovação ${modalidade}`,
    externalReference: `${business.id}|${modalidade}|${preco.coberturaMeses}`,
  })

  if (!payRes.ok || !payRes.data?.id) {
    console.error('[pix-atual] createPayment falhou', payRes.error)
    return NextResponse.json({ error: 'Não foi possível gerar o PIX agora. Tenta de novo em instantes.' }, { status: 502 })
  }

  const qrRes = await getPixQrCode(payRes.data.id)

  // Sincroniza a cobrança vigente: o webhook casa por asaas_payment_id_atual,
  // então tem que apontar pra ESTA cobrança pra o pagamento ativar a conta.
  await admin
    .from('subscriptions')
    .update({
      asaas_payment_id_atual: payRes.data.id,
      pix_link_atual: payRes.data.invoiceUrl ?? null,
    })
    .eq('id', sub.id)

  return qrResponse(payRes.data.id, qrRes.data)
}
