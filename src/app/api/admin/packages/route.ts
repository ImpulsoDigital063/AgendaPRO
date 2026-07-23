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

type ItemInput = {
  service_id: string | null
  product_id: string | null
  quantity: number
  unit_price?: number | null
}

// Cada item é serviço OU produto (exatamente um · XOR · espelha o CHECK do banco v84).
function validateItems(raw: unknown): ItemInput[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const out: ItemInput[] = []
  for (const it of raw) {
    if (!it || typeof it !== 'object') return null
    const obj = it as Record<string, unknown>
    const svc = typeof obj.service_id === 'string' && obj.service_id ? obj.service_id : null
    const prod = typeof obj.product_id === 'string' && obj.product_id ? obj.product_id : null
    if ((svc && prod) || (!svc && !prod)) return null // XOR
    const qty = Number(obj.quantity)
    if (!Number.isFinite(qty) || qty <= 0) return null
    let unit: number | null = null
    if (obj.unit_price != null) {
      const u = Number(obj.unit_price)
      if (!Number.isFinite(u) || u < 0) return null
      unit = u
    }
    out.push({ service_id: svc, product_id: prod, quantity: qty, unit_price: unit })
  }
  return out
}

// GET /api/admin/packages · lista pacotes do business (com items)
// ?kind=combo|pacote · filtra o tipo (combo=serviço+produto, pacote=multi-serviço)
export async function GET(request: Request) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const kindFilter = new URL(request.url).searchParams.get('kind')

  const admin = getAdmin()
  let q = admin
    .from('packages')
    .select(`
      id, name, price, kind, validity_kind, validity_value, active, description, created_at,
      package_items (id, service_id, product_id, quantity, unit_price, services(name, price), products(name, price))
    `)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (kindFilter === 'combo' || kindFilter === 'pacote') q = q.eq('kind', kindFilter)

  const { data: packages, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ packages: packages ?? [] })
}

// POST /api/admin/packages · cria pacote + itens
// Body: { name, price, validity_kind, validity_value?, description?, items: [{service_id, quantity, unit_price?}] }
export async function POST(request: Request) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const price = Number(body.price)
  // kind separa combo (serviço+produto, venda imediata) de pacote (multi-serviço
  // resgatável). Default 'combo' — é o que o form de Produtos cria.
  const kind = body.kind === 'pacote' ? 'pacote' : 'combo'
  const validityKind = typeof body.validity_kind === 'string' ? body.validity_kind : 'none'
  const validityValue = body.validity_value != null ? Number(body.validity_value) : null
  const description = typeof body.description === 'string' ? body.description.trim() : null
  const items = validateItems(body.items)

  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 })
  if (!Number.isFinite(price) || price < 0) return NextResponse.json({ error: 'price_invalid' }, { status: 400 })
  if (!['none', 'days', 'weeks', 'months', 'years'].includes(validityKind)) {
    return NextResponse.json({ error: 'validity_kind_invalid' }, { status: 400 })
  }
  if (validityKind !== 'none' && (!validityValue || validityValue <= 0)) {
    return NextResponse.json({ error: 'validity_value_required' }, { status: 400 })
  }
  if (!items) return NextResponse.json({ error: 'items_invalid', detail: 'Adicione ao menos 1 item (serviço ou produto) com quantidade > 0' }, { status: 400 })
  // Pacote é só serviço (resgatável); produto não tem "sessão" pra resgatar.
  if (kind === 'pacote' && items.some((it) => it.product_id)) {
    return NextResponse.json({ error: 'pacote_sem_produto', detail: 'Pacote é só de serviços. Pra vender serviço + produto junto, use um Combo (em Produtos).' }, { status: 400 })
  }

  const admin = getAdmin()

  // Valida que todos os serviços/produtos pertencem ao business
  const serviceIds = [...new Set(items.map((i) => i.service_id).filter((x): x is string => !!x))]
  const productIds = [...new Set(items.map((i) => i.product_id).filter((x): x is string => !!x))]
  if (serviceIds.length) {
    const { data: services } = await admin
      .from('services')
      .select('id')
      .in('id', serviceIds)
      .eq('business_id', businessId)
    if (!services || services.length !== serviceIds.length) {
      return NextResponse.json({ error: 'service_not_found' }, { status: 400 })
    }
  }
  if (productIds.length) {
    const { data: products } = await admin
      .from('products')
      .select('id')
      .in('id', productIds)
      .eq('business_id', businessId)
    if (!products || products.length !== productIds.length) {
      return NextResponse.json({ error: 'product_not_found' }, { status: 400 })
    }
  }

  // Cria pacote
  const { data: pkg, error: pkgErr } = await admin
    .from('packages')
    .insert({
      business_id: businessId,
      name,
      price,
      kind,
      validity_kind: validityKind,
      validity_value: validityKind === 'none' ? null : validityValue,
      description,
      active: true,
    })
    .select()
    .single()

  if (pkgErr || !pkg) return NextResponse.json({ error: pkgErr?.message ?? 'insert_failed' }, { status: 500 })

  // Cria itens
  const itemsToInsert = items.map((it) => ({
    package_id: pkg.id,
    service_id: it.service_id,
    product_id: it.product_id,
    quantity: it.quantity,
    unit_price: it.unit_price,
  }))
  const { error: itemsErr } = await admin.from('package_items').insert(itemsToInsert)
  if (itemsErr) {
    await admin.from('packages').delete().eq('id', pkg.id) // rollback manual
    return NextResponse.json({ error: itemsErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, package: pkg })
}
