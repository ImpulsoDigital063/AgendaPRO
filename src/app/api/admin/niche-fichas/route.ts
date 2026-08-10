import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fichasDisponiveis } from '@/lib/fichas/disponiveis'

async function getOwnerBusiness(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  /* slug entra porque a visibilidade agora também pode ser por negócio
     (fichas exclusivas de um cliente) — ver lib/fichas/disponiveis.ts */
  const { data } = await supabase.from('businesses').select('id, slug, description, category, enabled_niche_fichas').eq('owner_id', user.id).maybeSingle()
  return data
}

// GET · fichas de nicho disponíveis pro segmento + quais estão ativas
export async function GET() {
  const supabase = await createClient()
  const biz = await getOwnerBusiness(supabase)
  if (!biz) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return NextResponse.json({
    available: fichasDisponiveis({ categoria: biz.category ?? biz.description, slug: biz.slug })
      .map((nf) => ({ slug: nf.slug, name: nf.name })),
    // null = todas ativas (default); array = seleção explícita
    enabled: (biz.enabled_niche_fichas as string[] | null) ?? null,
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
