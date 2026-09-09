/**
 * POST /api/admin/tour-sumidos
 *
 * Marca que a dona viu (ou pulou) um dos tours da aba Sumidos.
 * ?parte=1 (padrão) = apresentação · ?parte=2 = como montar o cupom.
 * Só o DONO — a recepção não decide isso pelo negócio.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit-api'

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'admin-tour-sumidos', limit: 10, windowSeconds: 60 })
  if (rl) return rl

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no_auth' }, { status: 401 })

  const { data: biz } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!biz) return NextResponse.json({ error: 'only_owner' }, { status: 403 })

  const parte = req.nextUrl.searchParams.get('parte') === '2' ? 2 : 1
  const coluna = parte === 2 ? 'tour_sumidos_2_em' : 'tour_sumidos_em'

  const { error } = await supabase
    .from('businesses')
    .update({ [coluna]: new Date().toISOString() })
    .eq('id', biz.id)
  if (error) return NextResponse.json({ error: 'save_failed' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
