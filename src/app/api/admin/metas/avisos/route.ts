/**
 * /api/admin/metas/avisos — liga/desliga os avisos (push) da aba Metas (v187).
 *
 * GET               → { ok, ligado }   dona e gerente com financeiro liberado
 * POST { ligado }   → { ok, ligado }   SÓ a dona (os avisos vão pro aparelho dela)
 *
 * Coluna businesses.metas_avisos (padrão true). Lida e gravada pelas funções
 * metas_avisos_ligados / metas_avisos_definir (v187, SECURITY DEFINER, conferem
 * pode_ver_metas / owner_id = auth.uid() no banco). Read-after-write: a resposta
 * do POST é o valor LIDO do banco depois de gravar.
 * O cron (/api/cron/metas) pula quem está com false.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { negocioDoPainel, NEGOCIO_NENHUM } from '@/lib/admin-data'
import { checkRateLimit } from '@/lib/rate-limit-api'

async function contexto() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: NextResponse.json({ error: 'unauthenticated' }, { status: 401 }) } as const
  const bid = await negocioDoPainel(user.id)
  if (!bid || bid === NEGOCIO_NENHUM) return { erro: NextResponse.json({ error: 'forbidden' }, { status: 403 }) } as const
  return { supabase, bid } as const
}

export async function GET() {
  const c = await contexto()
  if ('erro' in c) return c.erro
  const { data, error } = await c.supabase.rpc('metas_avisos_ligados', { p_business_id: c.bid })
  if (error) return NextResponse.json({ error: error.message }, { status: error.code === '42501' ? 403 : 500 })
  return NextResponse.json({ ok: true, ligado: data !== false })
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'admin-metas-avisos', limit: 20, windowSeconds: 60 })
  if (rl) return rl
  const c = await contexto()
  if ('erro' in c) return c.erro
  const body = (await req.json().catch(() => null)) as { ligado?: unknown } | null
  if (!body || typeof body.ligado !== 'boolean') return NextResponse.json({ error: 'ligado: true|false' }, { status: 400 })
  const { error } = await c.supabase.rpc('metas_avisos_definir', { p_business_id: c.bid, p_ligado: body.ligado })
  if (error) return NextResponse.json({ error: error.message }, { status: error.code === '42501' ? 403 : 500 })
  const { data: lido, error: e2 } = await c.supabase.rpc('metas_avisos_ligados', { p_business_id: c.bid })
  if (e2 || lido !== body.ligado) return NextResponse.json({ error: 'não confirmou no banco' }, { status: 500 })
  return NextResponse.json({ ok: true, ligado: lido })
}
