import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fichasDisponiveis } from '@/lib/fichas/disponiveis'
import { negocioDoPainel } from '@/lib/admin-data'
import { MARCA_COLS, type FichaRodape } from '@/lib/fichas/marca'

async function getOwnerBusiness(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  /* slug entra porque a visibilidade agora também pode ser por negócio
     (fichas exclusivas de um cliente) — ver lib/fichas/disponiveis.ts */
  const { data } = await supabase.from('businesses').select(`id, slug, description, category, enabled_niche_fichas, fichas_oferecer, ${MARCA_COLS}`).eq('id', await negocioDoPainel(user.id)).maybeSingle()
  return data
}

// GET · fichas de nicho disponíveis pro segmento + quais estão ativas
export async function GET() {
  const supabase = await createClient()
  const biz = await getOwnerBusiness(supabase)
  if (!biz) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return NextResponse.json({
    available: fichasDisponiveis({ categoria: biz.category ?? biz.description, slug: biz.slug })
      .map((nf) => ({ slug: nf.slug, name: nf.name, clientePreenche: Boolean(nf.clientePreenche) })),
    // v159 · fichas oferecidas pra cliente nova (vazio = desligado)
    oferecer: (biz.fichas_oferecer as string[] | null) ?? [],
    // null = todas ativas (default); array = seleção explícita
    enabled: (biz.enabled_niche_fichas as string[] | null) ?? null,
    /* Marca do PDF, pra prévia do modelo sair com o mesmo cabeçalho do
       documento real (lib/fichas/marca.ts). */
    businessId: biz.id,
    marca: {
      name: biz.name, phone: biz.phone, address: biz.address, brand_primary: biz.brand_primary,
      brand_logo_url: biz.brand_logo_url, ficha_rodape: biz.ficha_rodape,
    },
  })
}

// POST · salva a seleção { enabled: string[] }
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const biz = await getOwnerBusiness(supabase)
  if (!biz) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  /* v159 · { oferecer: string[] } liga/desliga "Oferecer pra cliente nova".
     Só entra ficha que o negócio enxerga E que a cliente preenche sozinha. */
  if (body && Array.isArray(body.oferecer)) {
    const podem = new Set(
      fichasDisponiveis({ categoria: biz.category ?? biz.description, slug: biz.slug })
        .filter((f) => f.clientePreenche).map((f) => f.slug),
    )
    const oferecer = [...new Set(body.oferecer.filter((s: unknown): s is string => typeof s === 'string' && podem.has(s)))]
    const { error } = await supabase.from('businesses').update({ fichas_oferecer: oferecer }).eq('id', biz.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const { data: depois } = await supabase.from('businesses').select('fichas_oferecer').eq('id', biz.id).maybeSingle()
    return NextResponse.json({ ok: true, oferecer: depois?.fichas_oferecer ?? [] })
  }
  if (!body || !Array.isArray(body.enabled)) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  /* Só deixa ligar o que o negócio pode ver. Sem isso, um dono conseguiria
     ligar por payload uma ficha exclusiva de outro cliente. */
  const valid = new Set(
    fichasDisponiveis({ categoria: biz.category ?? biz.description, slug: biz.slug }).map((f) => f.slug),
  )
  const enabled = body.enabled.filter((s: unknown): s is string => typeof s === 'string' && valid.has(s))
  const { error } = await supabase.from('businesses').update({ enabled_niche_fichas: enabled }).eq('id', biz.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, enabled })
}

/* PATCH · logo do cabeçalho das fichas { logo: string | null }.
   O arquivo sobe direto do navegador pro bucket business-covers (mesma trava
   de dono da capa, v33b); aqui só grava o link em ficha_rodape.logo.

   Trocar a logo APAGA a cor da faixa: a faixa passa a nascer do fundo da logo
   nova (lib/fichas/marca.ts). Manter a cor antiga com uma logo de outro fundo
   é o retângulo colado que essa regra existe pra evitar. Linha e nota do
   rodapé ficam. */
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const biz = await getOwnerBusiness(supabase)
  if (!biz) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const logo = body?.logo
  if (logo !== null && typeof logo !== 'string') return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  // Só aceita arquivo da pasta do PRÓPRIO negócio no bucket.
  const prefixo = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/business-covers/${biz.id}/`
  if (typeof logo === 'string' && !logo.startsWith(prefixo)) {
    return NextResponse.json({ error: 'logo_fora_do_bucket' }, { status: 400 })
  }
  const atual = { ...((biz.ficha_rodape as FichaRodape) ?? {}) }
  delete atual.cor
  if (logo) atual.logo = logo
  else delete atual.logo
  const ficha_rodape = Object.keys(atual).length ? atual : null
  const { error } = await supabase.from('businesses').update({ ficha_rodape }).eq('id', biz.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, ficha_rodape })
}
