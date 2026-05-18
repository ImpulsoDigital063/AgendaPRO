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

// GET /api/admin/invoices/[id] · retorna invoice + items + payments
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: invoice, error: invErr } = await admin
    .from('invoices')
    .select(`
      id,
      invoice_number,
      status,
      subtotal,
      discount,
      total,
      notes,
      created_at,
      closed_at,
      cancelled_at,
      business_id,
      customer:customers(id, name, phone)
    `)
    .eq('id', id)
    .maybeSingle()

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })
  if (!invoice) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (invoice.business_id !== businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data: items } = await admin
    .from('invoice_items')
    .select(`
      id,
      item_type,
      description,
      quantity,
      unit_price,
      discount,
      total,
      professional:professionals(name)
    `)
    .eq('invoice_id', id)
    .order('created_at')

  const { data: payments } = await admin
    .from('invoice_payments')
    .select(`id, payment_method, amount, paid_at, installments, card_brand, card_type`)
    .eq('invoice_id', id)
    .order('paid_at')

  return NextResponse.json({
    invoice,
    items: items ?? [],
    payments: payments ?? [],
  })
}

// PATCH /api/admin/invoices/[id] · body { action: 'reopen' | 'cancel' }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => null)
  const action = body?.action

  if (action !== 'reopen' && action !== 'cancel') {
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: invoice } = await admin
    .from('invoices')
    .select('id, business_id, status')
    .eq('id', id)
    .maybeSingle()

  if (!invoice) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (invoice.business_id !== businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const update =
    action === 'reopen'
      ? { status: 'open' as const, closed_at: null, cancelled_at: null }
      : { status: 'cancelled' as const, cancelled_at: new Date().toISOString() }

  const { error: updErr } = await admin.from('invoices').update(update).eq('id', id)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, status: update.status })
}
