import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit-api'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'admin-review-claim', limit: 30, windowSeconds: 60 })
  if (rl) return rl

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const { claimId, action } = await req.json()

  if (!claimId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  const adminClient = getAdminClient()

  // Busca o claim + valida que o user é dono do negócio
  const { data: claim } = await adminClient
    .from('review_claims')
    .select('id, business_id, customer_id, status, business:businesses(owner_id, points_for_review)')
    .eq('id', claimId)
    .single()

  if (!claim) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })
  }

  const business = claim.business as unknown as { owner_id: string; points_for_review: number | null } | null

  if (!business || business.owner_id !== user.id) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  if (claim.status !== 'pending') {
    return NextResponse.json({ error: 'Pedido já foi resolvido.' }, { status: 409 })
  }

  if (action === 'reject') {
    const { error } = await adminClient
      .from('review_claims')
      .update({
        status: 'rejected',
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .eq('id', claimId)

    if (error) {
      return NextResponse.json({ error: 'Erro ao rejeitar.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, status: 'rejected' })
  }

  // Approve: credita pontos + marca claim como approved
  const pts = business.points_for_review ?? 0
  if (pts <= 0) {
    return NextResponse.json({ error: 'Programa de pontos por avaliação não está ativo.' }, { status: 400 })
  }

  const { data: customer } = await adminClient
    .from('customers')
    .select('id, phone, total_points')
    .eq('id', claim.customer_id)
    .single()

  if (!customer) {
    return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
  }

  // Atribui ao profissional do ultimo atendimento completo do cliente
  // (usado quando o negocio esta no modo 'professional' — no modo 'business' fica registrado mas nao afeta a leitura).
  const { data: lastCompleted } = await adminClient
    .from('appointments')
    .select('professional_id')
    .eq('business_id', claim.business_id)
    .eq('client_phone', customer.phone)
    .eq('status', 'completed')
    .order('appointment_date', { ascending: false })
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle()

  const professionalId = lastCompleted?.professional_id ?? null

  // 1. Insert points_transactions
  const { error: ptError } = await adminClient.from('points_transactions').insert({
    customer_id: customer.id,
    business_id: claim.business_id,
    professional_id: professionalId,
    points: pts,
    reason: 'review',
    appointment_id: null,
  })

  if (ptError) {
    return NextResponse.json({ error: 'Erro ao creditar pontos.' }, { status: 500 })
  }

  // 2. Update customer total
  await adminClient
    .from('customers')
    .update({ total_points: (customer.total_points ?? 0) + pts })
    .eq('id', customer.id)

  // 3. Mark claim approved
  await adminClient
    .from('review_claims')
    .update({
      status: 'approved',
      points_awarded: pts,
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq('id', claimId)

  return NextResponse.json({ ok: true, status: 'approved', points: pts })
}
