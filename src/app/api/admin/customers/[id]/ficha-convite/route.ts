import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NICHE_FICHAS } from '@/lib/fichas/registry'
import { fichaVisivelPara } from '@/lib/fichas/disponiveis'
import { criarConvite, fichasParaOferecer, ONDE_OFERECER, type OndeOferecer } from '@/lib/fichas/oferta'
import { negocioDoPainel } from '@/lib/admin-data'
import { textoFichaCliente } from '@/lib/textos-manuais'
import { telefoneCanonico } from '@/lib/phone-variants'

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
  const { data: biz } = await admin.from('businesses').select('slug, category, description, name, whatsapp_ficha_template').eq('id', businessId).maybeSingle()
  if (!fichaVisivelPara(ficha, { categoria: biz?.category ?? biz?.description ?? null, slug: biz?.slug ?? null })) {
    return NextResponse.json({ error: 'niche_not_available' }, { status: 403 })
  }
  const { data: cust } = await admin.from('customers').select('id, business_id, name, phone').eq('id', customerId).maybeSingle()
  if (!cust || cust.business_id !== businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const criado = await criarConvite(admin, {
    businessId, customerId, nicheSlug, criadoPor: user.id, origem: 'painel', baseUrl: new URL(request.url).origin,
  })
  if ('erro' in criado) return NextResponse.json({ error: criado.erro }, { status: 500 })
  const { url, expiresAt } = criado
  /* A mensagem sai montada daqui, com o texto que a DONA salvou em Avisos
     manuais (v158). Assim profissional e recepção mandam o mesmo texto, sem
     precisar ler a coluna do negócio pelo navegador. */
  const mensagem = textoFichaCliente(biz?.whatsapp_ficha_template, {
    nome: cust.name ?? '',
    negocio: biz?.name ?? '',
    ficha: ficha.name,
    link: url,
  })
  /* Link do WhatsApp montado aqui também (v159): os três lugares que mandam
     a ficha (aba Fichas, cadastro, agendamento) só abrem o que vem pronto. */
  const fone = telefoneCanonico(cust.phone ?? '')
  const whatsapp = fone ? `https://wa.me/55${fone}?text=${encodeURIComponent(mensagem)}` : null
  return NextResponse.json({ ok: true, url, mensagem, whatsapp, expiresAt })
}

// GET → convites ainda abertos dessa cliente (pra tela mostrar "aguardando")
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const businessId = await getBusinessId(supabase, user.id)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id: customerId } = await params
  const admin = getAdmin()
  const { data: cust } = await admin.from('customers').select('business_id').eq('id', customerId).maybeSingle()
  if (!cust || cust.business_id !== businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const [{ data }, oferta] = await Promise.all([
    admin
      .from('ficha_convites')
      .select('id, niche_slug, created_at, expires_at, origem')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .is('used_at', null)
      .is('cancelado_em', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),
    /* ?onde=cadastro|agendamento (v160): cada atalho só oferece se a dona
       ligou aquele lugar. Sem `onde` (aba Fichas), não oferece nada. */
    (() => {
      const onde = new URL(request.url).searchParams.get('onde') as OndeOferecer | null
      return onde && ONDE_OFERECER.includes(onde) ? fichasParaOferecer(admin, businessId, customerId, onde) : Promise.resolve([])
    })(),
  ])
  /* `oferecer` (v159): o que os atalhos do painel (cadastro e agendamento)
     mostram — fichas que o negócio oferece e a cliente ainda não respondeu. */
  return NextResponse.json({ convites: data ?? [], oferecer: oferta.map((f) => ({ slug: f.slug, name: f.name })) })
}

// DELETE ?conviteId= → cancela um link que ainda espera a cliente (o link
// morre: a página passa a dizer "expirou"). Usado no "Cancelar" e no
// "Reenviar" da aba Fichas, que gera um novo e derruba o antigo.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const businessId = await getBusinessId(supabase, user.id)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id: customerId } = await params
  const conviteId = new URL(request.url).searchParams.get('conviteId') ?? ''
  const { data, error } = await getAdmin()
    .from('ficha_convites')
    .update({ cancelado_em: new Date().toISOString() })
    .eq('id', conviteId)
    .eq('business_id', businessId)
    .eq('customer_id', customerId)
    .is('used_at', null)
    .select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
