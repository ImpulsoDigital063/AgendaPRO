import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit-api'
import { negocioDoPainel } from '@/lib/admin-data'
import { SEMANA_NEGOCIOS } from '@/lib/feature-flags'

/**
 * POST /api/admin/appointments/[id]/falta · "Não compareceu" pela gaveta da
 * grade (25/10/2026, "A semana").
 *
 * Até aqui só o cartão antigo marcava falta, e gravava direto do navegador
 * (RLS pode recusar sem erro: 0 linhas e a tela diz que deu certo). Aqui é no
 * servidor, com a mesma régua de quem pode do cancelamento: dona/gerente,
 * recepção, ou a profissional no atendimento DELA. A punição em pontos segue
 * nascendo no banco quando o status vira no_show (penalty-info lê, relevar
 * devolve), igual ao cartão.
 *
 * Só nos negócios de SEMANA_NEGOCIOS por enquanto (Ivna); os outros seguem
 * com o cartão antigo até a mudança ir pro sistema todo.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = checkRateLimit(req, { key: 'admin-appt-falta', limit: 60, windowSeconds: 60 })
  if (rl) return rl

  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: appt } = await supabase
    .from('appointments')
    .select('id, business_id, professional_id, status, paid_at')
    .eq('id', id)
    .single()
  if (!appt) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!SEMANA_NEGOCIOS.includes(appt.business_id)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const [{ data: business }, { data: prof }] = await Promise.all([
    supabase.from('businesses').select('id').eq('id', appt.business_id).eq('id', await negocioDoPainel(user.id)).maybeSingle(),
    supabase
      .from('professionals')
      .select('id, is_receptionist')
      .eq('business_id', appt.business_id)
      .eq('auth_user_id', user.id)
      .eq('active', true)
      .maybeSingle(),
  ])
  const ehDela = !!prof && !prof.is_receptionist && prof.id === appt.professional_id
  if (!business && prof?.is_receptionist !== true && !ehDela) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // Falta é de quem não veio: atendimento pago ou já concluído não vira falta.
  if (appt.paid_at || !['pending', 'confirmed'].includes(appt.status)) {
    return NextResponse.json({ error: 'status_invalido', status: appt.status }, { status: 409 })
  }

  const { error } = await supabase.from('appointments').update({ status: 'no_show' }).eq('id', id)
  if (error) return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 })

  // λ.prova-na-fonte · relê a linha
  const { data: depois } = await supabase.from('appointments').select('status').eq('id', id).single()
  if (depois?.status !== 'no_show') {
    return NextResponse.json({ error: 'verification_failed', actual_status: depois?.status ?? null }, { status: 500 })
  }

  revalidatePath('/admin')
  return NextResponse.json({ ok: true, status: 'no_show' })
}
