import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// POST /api/admin/commission-payments
// Body: { professionalId, appointmentIds, periodStart, periodEnd, paidAmount, notes? }
// Cria 1 commission_payment + vincula appointments via commission_payment_id
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Business ID via owner ou recep
  const { data: ownerBusiness } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  let businessId = ownerBusiness?.id ?? null
  if (!businessId) {
    const { data: profRow } = await supabase
      .from('professionals')
      .select('business_id')
      .eq('auth_user_id', user.id)
      .eq('active', true)
      .eq('is_receptionist', true)
      .maybeSingle()
    businessId = profRow?.business_id ?? null
  }
  if (!businessId) return NextResponse.json({ error: 'no_business' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (
    !body ||
    !body.professionalId ||
    !Array.isArray(body.appointmentIds) ||
    body.appointmentIds.length === 0 ||
    !body.periodStart ||
    !body.periodEnd ||
    typeof body.paidAmount !== 'number'
  ) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Valida prof
  const { data: prof } = await admin
    .from('professionals')
    .select('id, business_id, default_commission_percent')
    .eq('id', body.professionalId)
    .maybeSingle()
  if (!prof || prof.business_id !== businessId) {
    return NextResponse.json({ error: 'professional_not_found' }, { status: 404 })
  }
  const pct = Number(prof.default_commission_percent ?? 40)

  // Valida appointments e calcula total
  const { data: appts } = await admin
    .from('appointments')
    .select('id, business_id, professional_id, total_price, commission_payment_id')
    .in('id', body.appointmentIds)

  if (!appts || appts.length === 0) {
    return NextResponse.json({ error: 'no_appointments' }, { status: 404 })
  }

  const invalid = appts.find(
    (a) => a.business_id !== businessId || a.professional_id !== body.professionalId || a.commission_payment_id !== null,
  )
  if (invalid) {
    return NextResponse.json(
      {
        error: 'invalid_appointment',
        appointment_id: invalid.id,
        reason: invalid.commission_payment_id ? 'already_paid' : invalid.professional_id !== body.professionalId ? 'wrong_professional' : 'wrong_business',
      },
      { status: 400 },
    )
  }

  const totalAmount = appts.reduce((s, a) => s + (Number(a.total_price ?? 0) * pct) / 100, 0)

  // Cria commission_payment
  const { data: payment, error: payErr } = await admin
    .from('commission_payments')
    .insert({
      business_id: businessId,
      professional_id: body.professionalId,
      period_start: body.periodStart,
      period_end: body.periodEnd,
      total_amount: totalAmount,
      paid_amount: body.paidAmount,
      notes: body.notes ?? null,
      paid_at: body.paidAt ?? new Date().toISOString(),
    })
    .select()
    .single()

  if (payErr || !payment) {
    return NextResponse.json({ error: payErr?.message ?? 'payment_creation_failed' }, { status: 500 })
  }

  // Vincula appointments ao pagamento
  const { error: linkErr } = await admin
    .from('appointments')
    .update({ commission_payment_id: payment.id })
    .in('id', body.appointmentIds)

  if (linkErr) {
    // Rollback
    await admin.from('commission_payments').delete().eq('id', payment.id)
    return NextResponse.json({ error: linkErr.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    payment: {
      id: payment.id,
      total_amount: totalAmount,
      paid_amount: body.paidAmount,
      items_count: appts.length,
    },
  })
}
