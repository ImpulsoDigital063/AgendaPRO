import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkRateLimit } from '@/lib/rate-limit-api'

/**
 * POST /api/admin/appointments/[id]/atendido
 *
 * Marca o atendimento como CONCLUÍDO sem tocar em dinheiro nenhum.
 *
 * Por que existe (Eduardo, 25/08/2026): em atendimento de convênio quem paga é
 * a empresa, no fim do mês, pelo extrato — nunca o paciente no balcão. Só que o
 * detalhe do atendimento oferecia "Faturar atendimento", o mesmo botão verde do
 * particular, e ele não sabia o que era convênio. Clicar ali abria comanda no
 * nome do paciente, jogava o valor no caixa do dia (dinheiro que ninguém pôs na
 * gaveta) e tirava a linha do "em aberto" do extrato — ou seja, a empresa
 * deixava de ser cobrada por aquele atendimento.
 *
 * Aqui a recepção registra que a paciente veio, e o dinheiro continua seguindo
 * o único caminho válido do convênio: extrato → fatura do mês → recebimento.
 *
 * Escopo de propósito estreito: SÓ atendimento com empresa vinculada. Fora do
 * convênio nada muda — o fluxo de sempre continua sendo o faturamento.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(req, { key: 'admin-appt-atendido', limit: 60, windowSeconds: 60 })
  if (rl) return rl

  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: appt } = await supabase
    .from('appointments')
    .select('id, business_id, professional_id, company_id, status, paid_at')
    .eq('id', id)
    .single()
  if (!appt) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Sem empresa vinculada não é convênio: quem fecha é o faturamento normal.
  if (!appt.company_id) {
    return NextResponse.json({ error: 'nao_e_convenio' }, { status: 400 })
  }
  if (appt.status === 'cancelled') {
    return NextResponse.json({ error: 'atendimento_cancelado' }, { status: 400 })
  }

  // Mesma régua de autorização do pagamento: dono, recepção, ou a profissional
  // no que é dela (no da colega só se o negócio liberou).
  const [{ data: business }, { data: prof }, { data: biz }] = await Promise.all([
    supabase.from('businesses').select('id').eq('id', appt.business_id).eq('owner_id', user.id).maybeSingle(),
    supabase
      .from('professionals')
      .select('id, is_receptionist')
      .eq('business_id', appt.business_id)
      .eq('auth_user_id', user.id)
      .eq('active', true)
      .maybeSingle(),
    supabase.from('businesses').select('professionals_can_book_others').eq('id', appt.business_id).maybeSingle(),
  ])
  const isOwner = !!business
  const isReceptionist = prof?.is_receptionist === true
  const ehDela = !!prof && prof.id === appt.professional_id
  const podeMexerNoDaColega = biz?.professionals_can_book_others === true
  const isProfissionalAutorizada = !!prof && !prof.is_receptionist && (ehDela || podeMexerNoDaColega)
  if (!isOwner && !isReceptionist && !isProfissionalAutorizada) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'completed' })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // λ.prova-na-fonte: quem responde "deu certo" é a row, não o update.
  const { data: depois } = await supabase
    .from('appointments')
    .select('status, paid_at')
    .eq('id', id)
    .single()
  if (depois?.status !== 'completed') {
    return NextResponse.json({ error: 'status_nao_gravou', atual: depois?.status ?? null }, { status: 500 })
  }

  revalidatePath('/admin')
  revalidatePath('/admin/convenios')
  return NextResponse.json({ ok: true, status: depois.status })
}
