import { NextResponse } from 'next/server'
import { getPackageSessionCommission } from '@/lib/queries/package-session-commission'
import { getGiftCardSessionCommission } from '@/lib/queries/gift-card-session-commission'
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
    !body.periodStart ||
    !body.periodEnd
  ) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  /* v141 · BÔNUS (backport do Palace, nascido lá em 16/06).
     Duas formas de chegar aqui:
       · pagamento de comissão, com ou sem bônus junto
       · bônus AVULSO — nenhum atendimento vinculado, paid_amount 0.
     O avulso existe porque premiar não pode depender de ter comissão
     pendente fechada no período. */
  const appointmentIds: string[] = body.appointmentIds
  const bonusAmount =
    typeof body.bonusAmount === 'number' && body.bonusAmount > 0
      ? Math.round(body.bonusAmount * 100) / 100
      : 0
  const bonusReason =
    typeof body.bonusReason === 'string' && body.bonusReason.trim() ? body.bonusReason.trim() : null
  const hasCommission = appointmentIds.length > 0 && typeof body.paidAmount === 'number'
  const isStandaloneBonus = appointmentIds.length === 0 && bonusAmount > 0

  if (!hasCommission && !isStandaloneBonus) {
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
    .select('id, business_id, default_commission_percent:commission_percentage')
    .eq('id', body.professionalId)
    .maybeSingle()
  if (!prof || prof.business_id !== businessId) {
    return NextResponse.json({ error: 'professional_not_found' }, { status: 404 })
  }
  const pct = Number(prof.default_commission_percent ?? 40)

  // Valida appointments e calcula total · pulado no bônus avulso
  let totalAmount = 0
  let apptCount = 0
  if (hasCommission) {
  const { data: appts } = await admin
    .from('appointments')
    .select('id, business_id, professional_id, total_price, commission_payment_id, commission_amount, commission_percent')
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

  /* v134 · a comissão pode estar fotografada no atendimento:
       commission_amount (R$ · CAF) manda sobre tudo;
       commission_percent (% · Studio Isis Melo) manda sobre o % da pessoa;
       nenhum dos dois → porcentagem do cadastro, como sempre foi. */
  totalAmount = appts.reduce((s, a) => {
    const fixa = (a as { commission_amount?: number | null }).commission_amount
    if (fixa != null) return s + Number(fixa)
    const pctAppt = (a as { commission_percent?: number | null }).commission_percent
    const pctUsado = pctAppt != null ? Number(pctAppt) : pct
    return s + (Number(a.total_price ?? 0) * pctUsado) / 100
  }, 0)
  apptCount = appts.length

  /* v140 · o total registrado precisa bater com o que a tela de Remunerações
     mostra. Resgate de pacote e de cartão presente entram R$0 na comanda, então
     não vêm pela query de appointments acima — sem isto, o pagamento gravava um
     `total_amount` menor que o devido e o histórico marcava "parcial" à toa. */
  const [pkgComm, giftComm] = await Promise.all([
    getPackageSessionCommission(admin, businessId, body.periodStart, body.periodEnd),
    getGiftCardSessionCommission(admin, businessId, body.periodStart, body.periodEnd),
  ])
  const baseExtra =
    (pkgComm[body.professionalId]?.base ?? 0) + (giftComm[body.professionalId]?.base ?? 0)
  totalAmount += (baseExtra * pct) / 100
  }

  // Cria commission_payment
  const { data: payment, error: payErr } = await admin
    .from('commission_payments')
    .insert({
      business_id: businessId,
      professional_id: body.professionalId,
      period_start: body.periodStart,
      period_end: body.periodEnd,
      total_amount: totalAmount,
      paid_amount: hasCommission ? body.paidAmount : 0,
      bonus_amount: bonusAmount,
      bonus_reason: bonusReason,
      notes: body.notes ?? null,
      paid_at: body.paidAt ?? new Date().toISOString(),
    })
    .select()
    .single()

  if (payErr || !payment) {
    return NextResponse.json({ error: payErr?.message ?? 'payment_creation_failed' }, { status: 500 })
  }

  // Vincula appointments ao pagamento · bônus avulso não tem o que vincular
  if (appointmentIds.length > 0) {
    const { error: linkErr } = await admin
      .from('appointments')
      .update({ commission_payment_id: payment.id })
      .in('id', appointmentIds)

    if (linkErr) {
      // Rollback
      await admin.from('commission_payments').delete().eq('id', payment.id)
      return NextResponse.json({ error: linkErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({
    ok: true,
    payment: {
      id: payment.id,
      total_amount: totalAmount,
      paid_amount: hasCommission ? body.paidAmount : 0,
      bonus_amount: bonusAmount,
      items_count: apptCount,
    },
  })
}
