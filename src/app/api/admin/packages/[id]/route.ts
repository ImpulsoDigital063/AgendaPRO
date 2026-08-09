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

  // Itens: substitui se vier · cada item é serviço OU produto (XOR · v84)
  if (Array.isArray(body.items)) {
    type Item = { service_id: string | null; product_id: string | null; quantity: number; unit_price?: number | null; option_group?: string | null }
    const items = body.items as Array<Record<string, unknown>>
    if (items.length === 0) {
      return NextResponse.json({ error: 'items_empty', detail: 'Pacote precisa de ao menos 1 item' }, { status: 400 })
    }
    const validated: Item[] = []
    for (const it of items) {
      const svc = typeof it.service_id === 'string' && it.service_id ? it.service_id : null
      const prod = typeof it.product_id === 'string' && it.product_id ? it.product_id : null
      const qty = Number(it.quantity)
      if ((svc && prod) || (!svc && !prod) || !(qty > 0)) {
        return NextResponse.json({ error: 'item_invalid' }, { status: 400 })
      }
      let unit: number | null = null
      if (it.unit_price != null) {
        const u = Number(it.unit_price)
        if (!Number.isFinite(u) || u < 0) return NextResponse.json({ error: 'unit_price_invalid' }, { status: 400 })
        unit = u
      }
      // v120 · alternativas do combo: itens com o mesmo grupo são opções entre
      // si (escolhe 1 ao aplicar). Só em produto.
      let optionGroup: string | null = null
      if (it.option_group != null) {
        if (typeof it.option_group !== 'string' || !it.option_group || !prod) {
          return NextResponse.json({ error: 'option_group_invalid' }, { status: 400 })
        }
        optionGroup = it.option_group
      }
      validated.push({ service_id: svc, product_id: prod, quantity: qty, unit_price: unit, option_group: optionGroup })
    }
    // Valida services + products do business
    const svcIds = [...new Set(validated.map((i) => i.service_id).filter((x): x is string => !!x))]
    const prodIds = [...new Set(validated.map((i) => i.product_id).filter((x): x is string => !!x))]
    if (svcIds.length) {
      const { data: svcs } = await admin
        .from('services').select('id').in('id', svcIds).eq('business_id', businessId)
      if (!svcs || svcs.length !== svcIds.length) {
        return NextResponse.json({ error: 'service_not_found' }, { status: 400 })
      }
    }
    if (prodIds.length) {
      const { data: prods } = await admin
        .from('products').select('id').in('id', prodIds).eq('business_id', businessId)
      if (!prods || prods.length !== prodIds.length) {
        return NextResponse.json({ error: 'product_not_found' }, { status: 400 })
      }
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
