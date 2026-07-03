import { todayBR } from '@/lib/date-br'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'
import { generateCancelToken } from '@/lib/token'

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

  // Telefones na base podem ter sido salvos com ou sem máscara — normaliza pra dígitos-só.
  const phoneDigits = phone.replace(/\D/g, '')
  if (phoneDigits.length < 10) {
    return NextResponse.json({ error: 'Telefone inválido.' }, { status: 400 })
  }

  const adminClient = getAdminClient()

  const { data: business } = await adminClient
    .from('businesses')
    .select('id, slug, points_for_review, points_mode')
    .eq('id', businessId)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'Negócio não encontrado.' }, { status: 404 })
  }

  // Match tolerante: tenta exato primeiro (rápido), senão fetch + filtra por dígitos.
  let { data: customer } = await adminClient
    .from('customers')
    .select('id, name, phone, total_points, referral_code')
    .eq('business_id', businessId)
    .eq('phone', phoneDigits)
    .maybeSingle()

  if (!customer) {
    const { data: candidates } = await adminClient
      .from('customers')
      .select('id, name, phone, total_points, referral_code')
      .eq('business_id', businessId)
    customer =
      (candidates || []).find((c) => (c.phone || '').replace(/\D/g, '') === phoneDigits) || null
  }

  if (!customer) {
    return NextResponse.json({
      found: false,
      message: 'Telefone não encontrado. Faça um agendamento primeiro.',
    })
  }

  // Histórico de transações (últimas 50 pra dar conta de pares positivo+negativo)
  const { data: transactions } = await adminClient
    .from('points_transactions')
    .select('id, points, reason, created_at, appointment_id, professional_id')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Quando o modo eh 'professional', calcula saldo por profissional.
  // Agrupa por (appointment_id, reason, professional_id) e ignora pares revertidos.
  const pointsMode: 'business' | 'professional' = business.points_mode === 'professional' ? 'professional' : 'business'
  let pointsByProfessional: { professional_id: string; professional_name: string; total_points: number }[] = []

  if (pointsMode === 'professional' && transactions && transactions.length > 0) {
    type Row = { appointment_id: string | null; professional_id: string | null; reason: string; points: number }
    const rows = transactions as unknown as Row[]

    const groupSums = new Map<string, number>()
    for (const t of rows) {
      const key = `${t.appointment_id ?? 'null'}:${t.reason}:${t.professional_id ?? 'null'}`
      groupSums.set(key, (groupSums.get(key) ?? 0) + t.points)
    }

    const totalsByProf = new Map<string, number>()
    for (const t of rows) {
      const key = `${t.appointment_id ?? 'null'}:${t.reason}:${t.professional_id ?? 'null'}`
      const net = groupSums.get(key) ?? 0
      if (net <= 0) continue
      if (t.points <= 0) continue
      if (!t.professional_id) continue
      totalsByProf.set(t.professional_id, (totalsByProf.get(t.professional_id) ?? 0) + t.points)
    }

    if (totalsByProf.size > 0) {
      const profIds = Array.from(totalsByProf.keys())
      const { data: profs } = await adminClient
        .from('professionals')
        .select('id, name')
        .in('id', profIds)

      const nameById = new Map<string, string>()
      for (const p of profs || []) nameById.set(p.id as string, p.name as string)

      pointsByProfessional = profIds
        .map((pid) => ({
          professional_id: pid,
          professional_name: nameById.get(pid) ?? 'Profissional',
          total_points: totalsByProf.get(pid) ?? 0,
        }))
        .sort((a, b) => b.total_points - a.total_points)
    }
  }

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

  // Agendamentos futuros (confirmed) — busca tolerante por dígitos do telefone
  const today = todayBR()
  const { data: rawAppointmentsAll } = await adminClient
    .from('appointments')
    .select('id, appointment_date, start_time, end_time, service_name, status, client_phone, professional:professionals(name)')
    .eq('business_id', businessId)
    .eq('status', 'confirmed')
    .gte('appointment_date', today)
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(50)

  const rawAppointments = (rawAppointmentsAll || [])
    .filter((a) => (a.client_phone || '').replace(/\D/g, '') === phoneDigits)
    .slice(0, 10)

  const upcoming = (rawAppointments || []).map((a) => {
    const prof = a.professional as unknown as { name: string } | null
    return {
      id: a.id,
      appointment_date: a.appointment_date,
      start_time: a.start_time,
      end_time: a.end_time,
      service_name: a.service_name,
      professional_name: prof?.name || null,
      cancel_token: generateCancelToken(a.id),
    }
  })

  return NextResponse.json({
    found: true,
    customer: {
      name: customer.name,
      total_points: customer.total_points ?? 0,
      referral_link: `/${business.slug}?ref=${customer.referral_code}`,
    },
    transactions: transactions || [],
    review_claim: pendingReview || null,
    has_review_program: (business.points_for_review ?? 0) > 0,
    upcoming_appointments: upcoming,
    points_mode: pointsMode,
    points_by_professional: pointsByProfessional,
  })
}
