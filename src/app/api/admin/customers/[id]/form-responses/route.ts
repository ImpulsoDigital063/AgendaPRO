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

// POST · cria resposta de ficha pro cliente
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id: customerId } = await params
  const body = await request.json().catch(() => null)
  if (!body?.templateId || typeof body.data !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const admin = getAdmin()
  const { data: cust } = await admin.from('customers').select('id, business_id').eq('id', customerId).maybeSingle()
  if (!cust || cust.business_id !== businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data, error } = await admin
    .from('client_form_responses')
    .insert({
      business_id: businessId,
      customer_id: customerId,
      template_id: body.templateId,
      data: body.data,
      filled_by_user_id: user.id,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, response: data })
}

// DELETE ?responseId=...
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id: customerId } = await params
  const url = new URL(request.url)
  const responseId = url.searchParams.get('responseId')
  if (!responseId) return NextResponse.json({ error: 'response_id_required' }, { status: 400 })
  const admin = getAdmin()
  const { data: r } = await admin.from('client_form_responses').select('id, business_id, customer_id').eq('id', responseId).maybeSingle()
  if (!r || r.business_id !== businessId || r.customer_id !== customerId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  await admin.from('client_form_responses').delete().eq('id', responseId)
  return NextResponse.json({ ok: true })
}
