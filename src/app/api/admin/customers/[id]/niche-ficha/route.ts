import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NICHE_FICHAS } from '@/lib/fichas/cilios'

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

const BUCKET = 'fichas'

// POST · salva (ou edita) uma ficha de nicho. Imagens (data:image webp) sobem
// pro Storage; no banco fica só o link.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id: customerId } = await params

  const body = await request.json().catch(() => null)
  const nicheSlug = typeof body?.nicheSlug === 'string' ? body.nicheSlug : ''
  if (!NICHE_FICHAS[nicheSlug]) return NextResponse.json({ error: 'invalid_niche' }, { status: 400 })
  if (!body?.values || typeof body.values !== 'object') return NextResponse.json({ error: 'invalid_values' }, { status: 400 })
  const responseId = typeof body.responseId === 'string' ? body.responseId : null

  const admin = getAdmin()
  const { data: cust } = await admin.from('customers').select('id, business_id').eq('id', customerId).maybeSingle()
  if (!cust || cust.business_id !== businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // Sobe imagens (data:image) pro Storage, troca pelo link público
  const values: Record<string, unknown> = { ...body.values }
  try {
    for (const [k, v] of Object.entries(values)) {
      if (typeof v !== 'string' || !v.startsWith('data:image')) continue
      const m = /^data:(image\/[\w.+-]+);base64,(.+)$/.exec(v)
      if (!m) continue
      const ext = m[1].split('/')[1].replace('+xml', '')
      const buf = Buffer.from(m[2], 'base64')
      const path = `${businessId}/${customerId}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buf, { contentType: m[1], upsert: false })
      if (upErr) return NextResponse.json({ error: 'upload_failed: ' + upErr.message }, { status: 500 })
      values[k] = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    }
  } catch (e) {
    return NextResponse.json({ error: 'upload_error: ' + (e as Error).message }, { status: 500 })
  }

  let savedId = responseId
  if (responseId) {
    const { data: existing } = await admin.from('client_form_responses').select('id, business_id, customer_id').eq('id', responseId).maybeSingle()
    if (!existing || existing.business_id !== businessId || existing.customer_id !== customerId) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    const { error } = await admin.from('client_form_responses').update({ data: values }).eq('id', responseId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { data: ins, error } = await admin.from('client_form_responses').insert({
      business_id: businessId,
      customer_id: customerId,
      template_id: null,
      niche_slug: nicheSlug,
      data: values,
      filled_by_user_id: user.id,
    }).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    savedId = ins.id
  }

  // read-after-write (prova-na-fonte · dado cliente-facing e legal)
  const { data: check } = await admin.from('client_form_responses').select('id, niche_slug, data').eq('id', savedId!).single()
  return NextResponse.json({ ok: true, response: check })
}

// DELETE ?responseId=...
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id: customerId } = await params
  const responseId = new URL(request.url).searchParams.get('responseId')
  if (!responseId) return NextResponse.json({ error: 'response_id_required' }, { status: 400 })
  const admin = getAdmin()
  const { data: r } = await admin.from('client_form_responses').select('id, business_id, customer_id').eq('id', responseId).maybeSingle()
  if (!r || r.business_id !== businessId || r.customer_id !== customerId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  await admin.from('client_form_responses').delete().eq('id', responseId)
  return NextResponse.json({ ok: true })
}
