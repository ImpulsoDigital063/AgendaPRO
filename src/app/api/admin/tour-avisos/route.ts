/**
 * POST /api/admin/tour-avisos
 *
 * Marca que a dona viu (ou pulou) um dos tours da aba Avisos.
 * ?parte=1 (padrão) = apresentação · ?parte=2 = como editar um texto.
 * Espelha /api/admin/tour-sumidos: só o DONO grava — a recepção não decide
 * pelo negócio se o tour já foi visto.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit-api'

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'admin-tour-avisos', limit: 10, windowSeconds: 60 })
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
  const coluna = parte === 2 ? 'tour_avisos_2_em' : 'tour_avisos_em'

  const { data: salvo, error } = await supabase
    .from('businesses')
    .update({ [coluna]: new Date().toISOString() })
    .eq('id', biz.id)
    .select(coluna)
    .maybeSingle()

  /* λ.prova-na-fonte: sem a linha de volta, não diz que gravou. Se falhar, o
     tour aparece de novo na próxima visita — melhor que sumir sem ela ter
     visto. */
  const gravado = (salvo as Record<string, string | null> | null)?.[coluna]
  if (error || !gravado) {
    return NextResponse.json({ error: 'save_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
