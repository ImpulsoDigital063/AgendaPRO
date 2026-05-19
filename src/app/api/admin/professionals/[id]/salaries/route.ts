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

// POST · cria salário
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id: professionalId } = await params
  const body = await request.json().catch(() => null)
  if (!body || typeof body.amount !== 'number' || body.amount <= 0 || !body.date) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const admin = getAdmin()
  const { data: prof } = await admin.from('professionals').select('id, business_id').eq('id', professionalId).maybeSingle()
  if (!prof || prof.business_id !== businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data, error } = await admin
    .from('professional_salaries')
    .insert({
      business_id: businessId,
      professional_id: professionalId,
      description: body.description || 'Salário',
      date: body.date,
      amount: body.amount,
      paid: !!body.paid,
      paid_at: body.paid ? new Date().toISOString() : null,
      notes: body.notes ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, salary: data })
}

// PATCH · marca como pago
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id: professionalId } = await params
  const body = await request.json().catch(() => null)
  if (!body?.salaryId || typeof body.paid !== 'boolean') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const admin = getAdmin()
  const { data: s } = await admin
    .from('professional_salaries')
    .select('id, business_id, professional_id')
    .eq('id', body.salaryId)
    .maybeSingle()
  if (!s || s.business_id !== businessId || s.professional_id !== professionalId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  await admin
    .from('professional_salaries')
    .update({ paid: body.paid, paid_at: body.paid ? new Date().toISOString() : null })
    .eq('id', body.salaryId)
  return NextResponse.json({ ok: true })
}

// DELETE ?salaryId=...
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id: professionalId } = await params
  const url = new URL(request.url)
  const salaryId = url.searchParams.get('salaryId')
  if (!salaryId) return NextResponse.json({ error: 'salary_id_required' }, { status: 400 })
  const admin = getAdmin()
  const { data: s } = await admin
    .from('professional_salaries')
    .select('id, business_id, professional_id')
    .eq('id', salaryId)
    .maybeSingle()
  if (!s || s.business_id !== businessId || s.professional_id !== professionalId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  await admin.from('professional_salaries').delete().eq('id', salaryId)
  return NextResponse.json({ ok: true })
}
