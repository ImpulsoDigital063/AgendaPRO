import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'
import { sendWebPush } from '@/lib/notify-push'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { success } = rateLimit({ key: `claim:${ip}`, limit: 10, windowSeconds: 3600 })
  if (!success) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde 1 hora.' }, { status: 429 })
  }

  const { businessId, phone, googleReviewName } = await req.json()

  if (!businessId || !phone || typeof phone !== 'string') {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  const reviewName = typeof googleReviewName === 'string' ? googleReviewName.trim().slice(0, 80) : null

  const adminClient = getAdminClient()

  // Valida que o negócio existe + tem programa de pontos por review ativo
  const { data: business } = await adminClient
    .from('businesses')
    .select('id, points_for_review, owner_id')
    .eq('id', businessId)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'Negócio não encontrado.' }, { status: 404 })
  }

  if (!business.points_for_review || business.points_for_review <= 0) {
    return NextResponse.json({ error: 'Programa de pontos por avaliação não está ativo.' }, { status: 400 })
  }

  // Busca o customer; se não existir, CRIA (avaliação é vantagem pro negócio
  // mesmo de quem nunca agendou — Eduardo 05/06). Quem avalia já começa com
  // saldo; se agendar depois, o mesmo telefone reaproveita o cadastro.
  let { data: customer } = await adminClient
    .from('customers')
    .select('id, name, phone')
    .eq('business_id', businessId)
    .eq('phone', phone.trim())
    .maybeSingle()

  if (!customer) {
    const { data: created, error: createErr } = await adminClient
      .from('customers')
      .insert({ business_id: businessId, phone: phone.trim(), name: reviewName || 'Cliente (avaliação)' })
      .select('id, name, phone')
      .single()
    if (createErr || !created) {
      return NextResponse.json({ error: 'Erro ao registrar. Tente novamente.' }, { status: 500 })
    }
    customer = created
  }

  // Já tem claim approved? Não pode pedir de novo.
  const { data: existingApproved } = await adminClient
    .from('review_claims')
    .select('id')
    .eq('business_id', businessId)
    .eq('customer_id', customer.id)
    .eq('status', 'approved')
    .maybeSingle()

  if (existingApproved) {
    return NextResponse.json({ error: 'Você já recebeu pontos por avaliação neste estabelecimento.' }, { status: 409 })
  }

  // Já tem claim pending? Não duplica.
  const { data: existingPending } = await adminClient
    .from('review_claims')
    .select('id')
    .eq('business_id', businessId)
    .eq('customer_id', customer.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingPending) {
    return NextResponse.json({
      ok: true,
      pending: true,
      message: 'Pedido já registrado. Aguarde o estabelecimento aprovar.',
    })
  }

  // Cria claim pending
  const { error: insertError } = await adminClient.from('review_claims').insert({
    business_id: businessId,
    customer_id: customer.id,
    customer_phone: customer.phone,
    customer_name: customer.name,
    google_review_name: reviewName || null,
    status: 'pending',
  })

  if (insertError) {
    return NextResponse.json({ error: 'Erro ao registrar pedido. Tente novamente.' }, { status: 500 })
  }

  /* Push pra dona (16/09/2026) · antes disso NADA avisava: o pedido só
     aparecia no cartão da tela Início, e quem só abre o painel na sexta
     deixava a cliente 4 dias esperando os pontos que a tela prometeu na
     hora — logo na mecânica que existe pra trazer avaliação nova.
     Mesmo caminho do "Novo agendamento" em /api/notify.
     AWAIT obrigatório: a Vercel congela a invocação assim que a resposta
     sai, e fire-and-forget perde o envio (lição do /api/cadastro). */
  try {
    const { data: devices } = await adminClient
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', business.owner_id)

    if (devices && devices.length > 0) {
      const payload = {
        titulo: 'Novo pedido de pontos por avaliação',
        corpo: `${customer.name || 'Uma cliente'} avaliou no Google. Toque pra conferir e liberar os ${business.points_for_review} pts.`,
        url: '/admin/inicio',
      }
      const mortas: string[] = []
      for (const d of devices) {
        const res = await sendWebPush(
          { endpoint: d.endpoint as string, p256dh: d.p256dh as string, auth: d.auth as string },
          payload
        )
        if (res.gone) mortas.push(d.endpoint as string)
      }
      if (mortas.length > 0) {
        await adminClient.from('push_subscriptions').delete().in('endpoint', mortas)
      }
    }
  } catch {
    // Aviso é extra: falha aqui não pode derrubar o pedido, que já está salvo.
  }

  return NextResponse.json({
    ok: true,
    pending: true,
    message: 'Pedido enviado! O estabelecimento vai confirmar tua avaliação em breve.',
  })
}
