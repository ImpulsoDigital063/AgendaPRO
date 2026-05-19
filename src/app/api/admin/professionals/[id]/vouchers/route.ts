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

// POST · cria vale
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id: professionalId } = await params
  const body = await request.json().catch(() => null)
  if (!body || !body.description || typeof body.amount !== 'number' || body.amount <= 0 || !body.date) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const admin = getAdmin()
  // Valida prof pertence ao business
  const { data: prof } = await admin.from('professionals').select('id, business_id').eq('id', professionalId).maybeSingle()
  if (!prof || prof.business_id !== businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data, error } = await admin
    .from('professional_vouchers')
    .insert({
      business_id: businessId,
      professional_id: professionalId,
      description: body.description,
      date: body.date,
      amount: body.amount,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, voucher: data })
}

// DELETE via ?voucherId=...
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id: professionalId } = await params
  const url = new URL(request.url)
  const voucherId = url.searchParams.get('voucherId')
  if (!voucherId) return NextResponse.json({ error: 'voucher_id_required' }, { status: 400 })

  const admin = getAdmin()
  const { data: v } = await admin
    .from('professional_vouchers')
    .select('id, business_id, professional_id, used_in_payment_id')
    .eq('id', voucherId)
    .maybeSingle()
  if (!v || v.business_id !== businessId || v.professional_id !== professionalId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (v.used_in_payment_id) {
    return NextResponse.json({ error: 'voucher_used' }, { status: 400 })
  }
  await admin.from('professional_vouchers').delete().eq('id', voucherId)
  return NextResponse.json({ ok: true })
}
