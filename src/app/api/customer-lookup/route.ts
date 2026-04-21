import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { success } = rateLimit({ key: `lookup:${ip}`, limit: 30, windowSeconds: 600 })
  if (!success) {
    return NextResponse.json({ error: 'Muitas consultas. Aguarde alguns minutos.' }, { status: 429 })
  }

  const { businessId, phone } = await req.json()

  if (!businessId || !phone || typeof phone !== 'string') {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  const adminClient = getAdminClient()

  const { data: business } = await adminClient
    .from('businesses')
    .select('id, slug, points_for_review')
    .eq('id', businessId)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'Negócio não encontrado.' }, { status: 404 })
  }

  const { data: customer } = await adminClient
    .from('customers')
    .select('id, name, phone, total_points, referral_code')
    .eq('business_id', businessId)
    .eq('phone', phone.trim())
    .maybeSingle()

  if (!customer) {
    return NextResponse.json({
      found: false,
      message: 'Telefone não encontrado. Faça um agendamento primeiro.',
    })
  }

  // Histórico de transações (últimas 20)
  const { data: transactions } = await adminClient
    .from('points_transactions')
    .select('id, points, reason, created_at')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Status de review claim pendente (se houver)
  const { data: pendingReview } = await adminClient
    .from('review_claims')
    .select('status, requested_at, resolved_at')
    .eq('customer_id', customer.id)
    .eq('business_id', businessId)
    .in('status', ['pending', 'approved', 'rejected'])
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    found: true,
    customer: {
      name: customer.name,
      total_points: customer.total_points ?? 0,
      referral_link: `/${business.slug}/agendar?ref=${customer.referral_code}`,
    },
    transactions: transactions || [],
    review_claim: pendingReview || null,
    has_review_program: (business.points_for_review ?? 0) > 0,
  })
}
