import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkRateLimit } from '@/lib/rate-limit-api'

async function resolveBusinessId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data: business } = await supabase
    .from('businesses').select('id').eq('owner_id', userId).maybeSingle()
  if (business?.id) return business.id
  const { data: prof } = await supabase
    .from('professionals').select('business_id, is_receptionist')
    .eq('auth_user_id', userId).eq('is_receptionist', true).maybeSingle()
  return prof?.business_id ?? null
}

/** GET /api/admin/product-categories · lista categorias ativas */
export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'admin-categories-list', limit: 60, windowSeconds: 60 })
  if (rl) return rl
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const businessId = await resolveBusinessId(supabase, user.id)
  if (!businessId) return NextResponse.json({ error: 'business_not_found' }, { status: 404 })

  const { data, error } = await supabase
    .from('product_categories')
    .select('id, name')
    .eq('business_id', businessId)
    .eq('active', true)
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ categories: data ?? [] })
}

/** POST /api/admin/product-categories · cria · idempotente por nome */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'admin-categories-create', limit: 30, windowSeconds: 60 })
  if (rl) return rl
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const businessId = await resolveBusinessId(supabase, user.id)
  if (!businessId) return NextResponse.json({ error: 'business_not_found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
  if (name.length > 80) return NextResponse.json({ error: 'Nome muito longo (max 80)' }, { status: 400 })

  const { data: existing } = await supabase
    .from('product_categories')
    .select('id, active')
    .eq('business_id', businessId)
    .eq('name', name)
    .maybeSingle()
  if (existing) {
    if (!existing.active) {
      await supabase.from('product_categories').update({ active: true }).eq('id', existing.id)
    }
    return NextResponse.json({ ok: true, category: { id: existing.id, name } })
  }

  const { data: created, error } = await supabase
    .from('product_categories')
    .insert({ business_id: businessId, name })
    .select('id, name')
    .single()
  if (error || !created) return NextResponse.json({ error: error?.message ?? 'erro' }, { status: 500 })

  revalidatePath('/admin/produtos')
  return NextResponse.json({ ok: true, category: created })
}
