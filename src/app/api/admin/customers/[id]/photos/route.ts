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

const ALLOWED = ['image/png', 'image/jpeg', 'image/webp']
const MAX = 2 * 1024 * 1024 // 2MB · pós-compressão browser-side · folga 4x sobre o preset

// POST · upload de foto · multipart/form-data
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id: customerId } = await params

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file') as File | null
  const caption = (formData?.get('caption') as string | null)?.trim() || null

  if (!file) return NextResponse.json({ error: 'no_file' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'invalid_type' }, { status: 400 })
  if (file.size > MAX) return NextResponse.json({ error: 'too_large' }, { status: 400 })

  const admin = getAdmin()

  // Valida customer pertence ao business
  const { data: cust } = await admin.from('customers').select('id, business_id').eq('id', customerId).maybeSingle()
  if (!cust || cust.business_id !== businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // Upload no Storage
  const ext = file.type.split('/')[1]
  const filename = `${businessId}/${customerId}/${crypto.randomUUID()}.${ext}`
  const buffer = await file.arrayBuffer()
  const { error: uploadErr } = await admin.storage
    .from('customer-photos')
    .upload(filename, buffer, { contentType: file.type, upsert: false })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: pub } = admin.storage.from('customer-photos').getPublicUrl(filename)
  const url = pub.publicUrl

  // Salva row
  const { data: photo, error: insErr } = await admin
    .from('customer_photos')
    .insert({
      business_id: businessId,
      customer_id: customerId,
      url,
      caption,
    })
    .select()
    .single()

  if (insErr) {
    // Rollback storage
    await admin.storage.from('customer-photos').remove([filename])
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, photo })
}

// DELETE ?photoId=...
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id: customerId } = await params
  const url = new URL(request.url)
  const photoId = url.searchParams.get('photoId')
  if (!photoId) return NextResponse.json({ error: 'photo_id_required' }, { status: 400 })

  const admin = getAdmin()
  const { data: photo } = await admin
    .from('customer_photos')
    .select('id, business_id, customer_id, url')
    .eq('id', photoId)
    .maybeSingle()

  if (!photo || photo.business_id !== businessId || photo.customer_id !== customerId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Extrai filename da URL pra deletar do storage
  const path = photo.url.split('/customer-photos/')[1]
  if (path) {
    await admin.storage.from('customer-photos').remove([path])
  }
  await admin.from('customer_photos').delete().eq('id', photoId)
  return NextResponse.json({ ok: true })
}
