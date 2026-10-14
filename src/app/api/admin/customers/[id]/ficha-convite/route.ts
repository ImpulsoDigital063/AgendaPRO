import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NICHE_FICHAS } from '@/lib/fichas/registry'
import { fichaVisivelPara } from '@/lib/fichas/disponiveis'
import { gerarToken, hashToken, VALIDADE_DIAS } from '@/lib/fichas/convite'
import { negocioDoPainel } from '@/lib/admin-data'

/* LINK PRA CLIENTE PREENCHER A FICHA (v157). Quem gera: dono, recepção ou
   profissional ativa — o mesmo grupo que preenche a ficha no balcão
   (niche-ficha/route.ts). O token sai UMA vez, nesta resposta; o banco só
   guarda o hash. */

async function getBusinessId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data: owner } = await supabase.from('businesses').select('id').eq('id', await negocioDoPainel(userId)).maybeSingle()
  if (owner) return owner.id
  const { data: prof } = await supabase
    .from('professionals').select('business_id').eq('auth_user_id', userId).eq('active', true).maybeSingle()
  return prof?.business_id ?? null
}

function getAdmin() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

// POST { nicheSlug } → { url, expiresAt }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const businessId = await getBusinessId(supabase, user.id)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id: customerId } = await params

  const body = await request.json().catch(() => null)
  const nicheSlug = typeof body?.nicheSlug === 'string' ? body.nicheSlug : ''
  const ficha = NICHE_FICHAS[nicheSlug]
  if (!ficha) return NextResponse.json({ error: 'invalid_niche' }, { status: 400 })
  if (!ficha.clientePreenche) return NextResponse.json({ error: 'ficha_nao_e_da_cliente' }, { status: 400 })

  const admin = getAdmin()
  const { data: biz } = await admin.from('businesses').select('slug, category, description').eq('id', businessId).maybeSingle()
  if (!fichaVisivelPara(ficha, { categoria: biz?.category ?? biz?.description ?? null, slug: biz?.slug ?? null })) {
    return NextResponse.json({ error: 'niche_not_available' }, { status: 403 })
  }
  const { data: cust } = await admin.from('customers').select('id, business_id').eq('id', customerId).maybeSingle()
  if (!cust || cust.business_id !== businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const token = gerarToken()
  const expiresAt = new Date(Date.now() + VALIDADE_DIAS * 86_400_000).toISOString()
  const { error } = await admin.from('ficha_convites').insert({
    business_id: businessId,
    customer_id: customerId,
    niche_slug: nicheSlug,
    token_hash: hashToken(token),
    criado_por: user.id,
    expires_at: expiresAt,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const origem = new URL(request.url).origin
  return NextResponse.json({ ok: true, url: `${origem}/ficha/${token}`, expiresAt })
}

// GET → convites ainda abertos dessa cliente (pra tela mostrar "aguardando")
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const businessId = await getBusinessId(supabase, user.id)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id: customerId } = await params
  const { data } = await getAdmin()
    .from('ficha_convites')
    .select('id, niche_slug, created_at, expires_at')
    .eq('business_id', businessId)
    .eq('customer_id', customerId)
    .is('used_at', null)
    .is('cancelado_em', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  return NextResponse.json({ convites: data ?? [] })
}
