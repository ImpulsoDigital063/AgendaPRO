import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// POST /api/admin/invoices
// Cria uma comanda fechando atendimentos selecionados.
// Body: { customerId: string, appointmentIds: string[], notes?: string }
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Resolve business_id pelo owner OU pela recep
  const { data: ownerBusiness } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  let businessId = ownerBusiness?.id ?? null
  if (!businessId) {
    const { data: profRow } = await supabase
      .from('professionals')
      .select('business_id, is_receptionist, active')
      .eq('auth_user_id', user.id)
      .eq('active', true)
      .eq('is_receptionist', true)
      .maybeSingle()
    businessId = profRow?.business_id ?? null
  }
  if (!businessId) return NextResponse.json({ error: 'no_business' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.appointmentIds) || body.appointmentIds.length === 0) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  // Service client pra criar invoice (bypassa RLS pra escrever consistente)
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // 1. Busca atendimentos · valida que pertencem ao business e não estão já faturados
  const { data: appts, error: apptsErr } = await admin
    .from('appointments')
    .select('id, business_id, client_name, service_name, total_price, invoice_item_id, status, professional_id, customer_id')
    .in('id', body.appointmentIds)

  if (apptsErr) return NextResponse.json({ error: apptsErr.message }, { status: 500 })
  if (!appts || appts.length === 0) return NextResponse.json({ error: 'no_appointments' }, { status: 404 })

  const invalid = appts.find(
    (a) => a.business_id !== businessId || a.invoice_item_id !== null || a.status === 'cancelled',
  )
  if (invalid) {
    return NextResponse.json(
      { error: 'invalid_appointment', appointment_id: invalid.id, reason: invalid.invoice_item_id ? 'already_invoiced' : invalid.business_id !== businessId ? 'wrong_business' : 'cancelled' },
      { status: 400 },
    )
  }

  // 2. Calcula totais
  const subtotal = appts.reduce((s, a) => s + (a.total_price ?? 0), 0)
  const total = subtotal // sem desconto neste MVP
  const customerId = body.customerId ?? appts[0].customer_id ?? null

  // 3. Pega próximo invoice_number
  const { data: nextNumData, error: nextNumErr } = await admin.rpc('next_invoice_number', { p_business_id: businessId })
  if (nextNumErr) return NextResponse.json({ error: nextNumErr.message }, { status: 500 })
  const invoiceNumber = nextNumData as number

  // 4. Cria invoice
  const { data: invoice, error: invErr } = await admin
    .from('invoices')
    .insert({
      business_id: businessId,
      customer_id: customerId,
      invoice_number: invoiceNumber,
      status: 'closed',
      subtotal,
      discount: 0,
      total,
      notes: body.notes ?? null,
      closed_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (invErr || !invoice) return NextResponse.json({ error: invErr?.message ?? 'invoice_creation_failed' }, { status: 500 })

  // 5. Cria invoice_items pra cada appointment + atualiza appointments com invoice_item_id
  const items = appts.map((a) => ({
    invoice_id: invoice.id,
    item_type: 'appointment',
    reference_id: a.id,
    description: a.service_name ?? 'Atendimento',
    professional_id: a.professional_id,
    quantity: 1,
    unit_price: a.total_price ?? 0,
    discount: 0,
    total: a.total_price ?? 0,
  }))

  const { data: insertedItems, error: itemsErr } = await admin
    .from('invoice_items')
    .insert(items)
    .select('id, reference_id')

  if (itemsErr || !insertedItems) {
    // Rollback: deleta invoice
    await admin.from('invoices').delete().eq('id', invoice.id)
    return NextResponse.json({ error: itemsErr?.message ?? 'items_creation_failed' }, { status: 500 })
  }

  // 6. Atualiza appointments com invoice_item_id correspondente
  const updatePromises = insertedItems.map((item) =>
    admin
      .from('appointments')
      .update({
        invoice_item_id: item.id,
        status: 'completed',
        paid_at: new Date().toISOString(),
      })
      .eq('id', item.reference_id),
  )
  await Promise.all(updatePromises)

  return NextResponse.json({
    ok: true,
    invoice: {
      id: invoice.id,
      invoice_number: invoiceNumber,
      total,
      items_count: insertedItems.length,
    },
  })
}
