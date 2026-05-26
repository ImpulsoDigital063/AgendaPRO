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

// PATCH /api/admin/packages/[id] · atualiza pacote
// Body: { name?, price?, validity_kind?, validity_value?, description?, active?, items? }
// Se items vier, SUBSTITUI todos os itens (delete + insert)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  const admin = getAdmin()

  // Valida ownership
  const { data: existing } = await admin
    .from('packages')
    .select('id, business_id')
    .eq('id', id)
    .maybeSingle()
  if (!existing || existing.business_id !== businessId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const update: Record<string, unknown> = {}
  if (typeof body.name === 'string') update.name = body.name.trim()
  if (body.price != null) {
    const p = Number(body.price)
    if (!Number.isFinite(p) || p < 0) return NextResponse.json({ error: 'price_invalid' }, { status: 400 })
    update.price = p
  }
  if (typeof body.validity_kind === 'string') {
    if (!['none', 'days', 'weeks', 'months', 'years'].includes(body.validity_kind)) {
      return NextResponse.json({ error: 'validity_kind_invalid' }, { status: 400 })
    }
    update.validity_kind = body.validity_kind
    if (body.validity_kind === 'none') update.validity_value = null
  }
  if (body.validity_value !== undefined) {
    const v = body.validity_value === null ? null : Number(body.validity_value)
    if (v !== null && (!Number.isFinite(v) || v <= 0)) {
      return NextResponse.json({ error: 'validity_value_invalid' }, { status: 400 })
    }
    update.validity_value = v
  }
  if (body.description !== undefined) update.description = body.description ?? null
  if (typeof body.active === 'boolean') update.active = body.active

  if (Object.keys(update).length > 0) {
    const { error: updErr } = await admin.from('packages').update(update).eq('id', id)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  // Itens: substitui se vier
  if (Array.isArray(body.items)) {
    type Item = { service_id: string; quantity: number; unit_price?: number | null }
    const items = body.items as Item[]
    if (items.length === 0) {
      return NextResponse.json({ error: 'items_empty', detail: 'Pacote precisa de ao menos 1 item' }, { status: 400 })
    }
    // Valida e mapeia
    const validated: Item[] = []
    for (const it of items) {
      if (!it.service_id || !(it.quantity > 0)) {
        return NextResponse.json({ error: 'item_invalid' }, { status: 400 })
      }
      let unit: number | null = null
      if (it.unit_price != null) {
        const u = Number(it.unit_price)
        if (!Number.isFinite(u) || u < 0) return NextResponse.json({ error: 'unit_price_invalid' }, { status: 400 })
        unit = u
      }
      validated.push({ service_id: it.service_id, quantity: Number(it.quantity), unit_price: unit })
    }
    // Valida services do business
    const { data: svcs } = await admin
      .from('services').select('id').in('id', validated.map((i) => i.service_id)).eq('business_id', businessId)
    if (!svcs || svcs.length !== new Set(validated.map((i) => i.service_id)).size) {
      return NextResponse.json({ error: 'service_not_found' }, { status: 400 })
    }
    // Delete + insert (mais simples que diff)
    await admin.from('package_items').delete().eq('package_id', id)
    const { error: insErr } = await admin
      .from('package_items')
      .insert(validated.map((it) => ({ package_id: id, ...it })))
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/packages/[id] · soft delete (active=false) se já vendido · hard delete se nunca
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = getAdmin()

  const { data: existing } = await admin
    .from('packages')
    .select('id, business_id')
    .eq('id', id)
    .maybeSingle()
  if (!existing || existing.business_id !== businessId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Já foi vendido? (existe customer_package com FK)
  const { count } = await admin
    .from('customer_packages')
    .select('id', { count: 'exact', head: true })
    .eq('package_id', id)

  if ((count ?? 0) > 0) {
    // Soft delete: arquiva
    const { error } = await admin.from('packages').update({ active: false }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, action: 'archived', reason: 'has_sales' })
  }

  // Hard delete (cascade nos items)
  const { error } = await admin.from('packages').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, action: 'deleted' })
}
