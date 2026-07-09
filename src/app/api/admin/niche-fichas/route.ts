import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { NICHE_FICHAS } from '@/lib/fichas/registry'

async function getOwnerBusiness(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('businesses').select('id, description, category, enabled_niche_fichas').eq('owner_id', user.id).maybeSingle()
  return data
}

function availableFor(segment: string | null) {
  const seg = (segment ?? '').toLowerCase()
  return Object.values(NICHE_FICHAS)
    .filter((nf) => !nf.segments || nf.segments.length === 0 || nf.segments.some((s) => s.toLowerCase() === seg))
    .map((nf) => ({ slug: nf.slug, name: nf.name }))
}

// GET · fichas de nicho disponíveis pro segmento + quais estão ativas
export async function GET() {
  const supabase = await createClient()
  const biz = await getOwnerBusiness(supabase)
  if (!biz) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return NextResponse.json({
    available: availableFor(biz.category ?? biz.description),
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
  const valid = new Set(availableFor(biz.category ?? biz.description).map((a) => a.slug))
  const enabled = body.enabled.filter((s: unknown): s is string => typeof s === 'string' && valid.has(s))
  const { error } = await supabase.from('businesses').update({ enabled_niche_fichas: enabled }).eq('id', biz.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, enabled })
}
