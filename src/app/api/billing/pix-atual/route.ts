import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit-api'
import { calcularPreco, type ModalidadeKey, type PlanoTipo } from '@/config/pricing'
import {
  getPixQrCode,
  createPayment,
  findCustomerByExternalReference,
  listPaymentsByCustomer,
  getNextDueDate,
} from '@/lib/asaas'

// =====================================================================
// GET /api/billing/pix-atual
//
// Devolve o PIX da cobrança em aberto pro cliente pagar dentro do painel,
// sem sair pro checkout do Asaas. Espinha do "pagar pela tela do app"
// (decisão Eduardo 18/07): o painel é o canal de cobrança, email é reforço.
//
// FONTE DA VERDADE = a lista de cobranças do customer no Asaas, NÃO o campo
// asaas_payment_id_atual gravado. Descoberto no teste do Olímpio (18/07): o
// webhook grava esse campo com a última cobrança PAGA e o cron antigo não o
// atualizava, então ele apontava pra um ciclo velho já quitado → a rota
// respondia "já pago" no lugar de mostrar o PIX vencido. Por isso aqui a gente
// pergunta ao Asaas qual cobrança está de fato PENDING/OVERDUE.
//
// Só faz sentido pra modalidades PIX — cartão automático o Asaas retenta só.
// =====================================================================

const PIX_MODALIDADES: ModalidadeKey[] = ['mensal_pix', 'semestral_pix', 'anual_pix']
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
    .select('id, plan, plan_modalidade, status, pago_ate, asaas_customer_id, asaas_payment_id_atual')
    .eq('business_id', business.id)
    .single()

  if (!sub) {
    return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 })
  }

  const modalidade = sub.plan_modalidade as ModalidadeKey | null
  if (!modalidade || !PIX_MODALIDADES.includes(modalidade)) {
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

  // Garante customer id (recorrente sempre tem; senão tenta achar por ref)
  let asaasCustomerId = sub.asaas_customer_id as string | null
  if (!asaasCustomerId) {
    const findRes = await findCustomerByExternalReference(business.id)
    if (findRes.ok && findRes.data?.data?.[0]?.id) {
      asaasCustomerId = findRes.data.data[0].id
      await admin.from('subscriptions').update({ asaas_customer_id: asaasCustomerId }).eq('id', sub.id)
    }
  }
  if (!asaasCustomerId) {
    // Sem cadastro no Asaas — manda pro fluxo completo (coleta CPF/CNPJ).
    return NextResponse.json({ error: 'need_full_checkout' }, { status: 409 })
  }

  // Sincroniza o asaas_payment_id_atual se a cobrança escolhida for outra —
  // o webhook casa por esse campo, então tem que apontar pra cobrança que o
  // cliente vai pagar AGORA pra o pagamento ativar a conta.
  async function sincroniza(paymentId: string, invoiceUrl?: string | null) {
    const payload: Record<string, unknown> = { asaas_payment_id_atual: paymentId }
    if (invoiceUrl) payload.pix_link_atual = invoiceUrl
    await admin.from('subscriptions').update(payload).eq('id', sub!.id)
  }

  // ── 1. Achar a cobrança REALMENTE em aberto no Asaas ─────────────────
  const listRes = await listPaymentsByCustomer(asaasCustomerId, 15)
  if (listRes.ok && listRes.data?.data) {
    // order=desc → a mais recente pagável é a cobrança do ciclo atual
    const emAberto = listRes.data.data.find((p) => STATUS_PAGAVEL.includes(p.status))
    if (emAberto) {
      const qrRes = await getPixQrCode(emAberto.id)
      if (qrRes.ok && qrRes.data?.payload) {
        if (emAberto.id !== sub.asaas_payment_id_atual) {
          await sincroniza(emAberto.id, emAberto.invoiceUrl)
        }
        return qrResponse(emAberto.id, qrRes.data)
      }
      // QR não voltou (cobrança em aberto sem PIX renderizável) → gera nova abaixo.
    } else {
      // Nenhuma cobrança pagável. Se a assinatura está coberta (em dia), então
      // realmente não há nada a pagar agora — webhook já ativou.
      const coberta = sub.status === 'active' && sub.pago_ate && new Date(sub.pago_ate) > new Date()
      if (coberta) {
        return NextResponse.json({ paid: true })
      }
      // Não coberta e sem cobrança em aberto → cron ainda não gerou; gera abaixo.
    }
  }

  // ── 2. Gerar cobrança nova (sem cobrança em aberto reaproveitável) ───
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
  await sincroniza(payRes.data.id, payRes.data.invoiceUrl)
  return qrResponse(payRes.data.id, qrRes.data)
}
