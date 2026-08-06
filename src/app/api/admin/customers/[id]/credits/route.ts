import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

async function getBusinessId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: owner } = await supabase.from('businesses').select('id').eq('owner_id', user.id).maybeSingle()
  if (owner) return owner.id
  const { data: prof } = await supabase
    .from('professionals')
    .select('business_id')
    .eq('auth_user_id', user.id)
    .eq('active', true)
    .eq('is_receptionist', true)
    .maybeSingle()
  return prof?.business_id ?? null
}

function getAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

// POST · adiciona crédito
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id: customerId } = await params
  const body = await request.json().catch(() => null)
  if (!body || typeof body.amount !== 'number' || body.amount <= 0 || !body.date) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const admin = getAdmin()
  const { data: cust } = await admin.from('customers').select('id, business_id').eq('id', customerId).maybeSingle()
  if (!cust || cust.business_id !== businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data, error } = await admin
    .from('customer_credits')
    .insert({
      business_id: businessId,
      customer_id: customerId,
      professional_id: body.professionalId ?? null,
      date: body.date,
      amount: body.amount,
      origin: body.origin === 'other' ? 'other' : 'advance',
      payment_method: body.paymentMethod ?? null,
      notes: body.notes ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, credit: data })
}

// DELETE ?creditId=...
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id: customerId } = await params
  const url = new URL(request.url)
  const creditId = url.searchParams.get('creditId')
  if (!creditId) return NextResponse.json({ error: 'credit_id_required' }, { status: 400 })
  const admin = getAdmin()
  const { data: c } = await admin
    .from('customer_credits')
    .select('id, business_id, customer_id, used_in_invoice_id, used_in_appointment_id')
    .eq('id', creditId)
    .maybeSingle()
  if (!c || c.business_id !== businessId || c.customer_id !== customerId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  // v113 · credito ja gasto no SINAL tambem nao pode ser apagado: apagar
  // desfaria o pagamento de um horario que esta reservado por causa dele.
  if (c.used_in_invoice_id || c.used_in_appointment_id) {
    return NextResponse.json({ error: 'credit_used' }, { status: 400 })
  }
  await admin.from('customer_credits').delete().eq('id', creditId)
  return NextResponse.json({ ok: true })
}
