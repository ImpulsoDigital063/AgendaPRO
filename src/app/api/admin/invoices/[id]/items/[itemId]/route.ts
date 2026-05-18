import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

async function getBusinessId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: owner } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
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

async function validateAccess(invoiceId: string, businessId: string) {
  const admin = getAdmin()
  const { data: invoice } = await admin
    .from('invoices')
    .select('id, business_id, status')
    .eq('id', invoiceId)
    .maybeSingle()
  const inv = invoice as { id: string; business_id: string; status: string } | null
  if (!inv) return { admin, error: NextResponse.json({ error: 'invoice_not_found' }, { status: 404 }) }
  if (inv.business_id !== businessId) return { admin, error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  return { admin, invoice: inv }
}

async function recalculateInvoice(invoiceId: string) {
  const admin = getAdmin()
  const { data } = await admin.from('invoice_items').select('total, discount').eq('invoice_id', invoiceId)
  const rows = (data ?? []) as Array<{ total: number | string; discount: number | string }>
  const itemsDiscount = rows.reduce((s, it) => s + Number(it.discount ?? 0), 0)
  const total = rows.reduce((s, it) => s + Number(it.total ?? 0), 0)
  const subtotal = total + itemsDiscount
  await admin
    .from('invoices')
    .update({ subtotal, discount: itemsDiscount, total })
    .eq('id', invoiceId)
}

// PATCH /api/admin/invoices/[id]/items/[itemId]
// Body: { quantity?, unit_price?, discount? }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id, itemId } = await params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  const { admin, error } = await validateAccess(id, businessId)
  if (error) return error

  // Lê item atual
  const { data: item, error: itemErr } = await admin
    .from('invoice_items')
    .select('id, invoice_id, quantity, unit_price, discount, total')
    .eq('id', itemId)
    .maybeSingle()
  if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 })
  if (!item || item.invoice_id !== id) return NextResponse.json({ error: 'item_not_found' }, { status: 404 })

  const quantity = typeof body.quantity === 'number' ? Math.max(1, body.quantity) : item.quantity
  const unit_price = typeof body.unit_price === 'number' ? Math.max(0, body.unit_price) : Number(item.unit_price)
  const discount = typeof body.discount === 'number' ? Math.max(0, body.discount) : Number(item.discount)
  const total = Math.max(0, unit_price * quantity - discount)

  const { error: updErr } = await admin
    .from('invoice_items')
    .update({ quantity, unit_price, discount, total })
    .eq('id', itemId)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  await recalculateInvoice(id)
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/invoices/[id]/items/[itemId]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id, itemId } = await params
  const { admin, error } = await validateAccess(id, businessId)
  if (error) return error

  // Pega reference_id pra desvincular appointment
  const { data: item } = await admin
    .from('invoice_items')
    .select('id, invoice_id, reference_id, item_type')
    .eq('id', itemId)
    .maybeSingle()
  if (!item || item.invoice_id !== id) return NextResponse.json({ error: 'item_not_found' }, { status: 404 })

  // Desvincula appointment se for type=appointment
  if (item.item_type === 'appointment' && item.reference_id) {
    await admin
      .from('appointments')
      .update({ invoice_item_id: null, paid_at: null })
      .eq('id', item.reference_id)
  }

  const { error: delErr } = await admin.from('invoice_items').delete().eq('id', itemId)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  await recalculateInvoice(id)
  return NextResponse.json({ ok: true })
}
