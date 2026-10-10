import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { negocioDoPainel } from '@/lib/admin-data'

/**
 * GET /api/admin/agenda/mes?mes=YYYY-MM[&only=profId][&exclude=id,id]
 *
 * Quantos atendimentos tem em cada dia do mês · alimenta o calendário da
 * agenda. Wanessa (28/09/2026): "queria visualizar a agenda de forma
 * ampliada, o mês todo, e nos dias de agendamento a quantidade. Pra eu não
 * ter que entrar dia por dia pra ver se tem agendamento."
 *
 * Mesma régua da grade (GradeTimeline): não conta cancelado nem falta, e
 * os filtros `only`/`exclude` repetem os de coluna da grade — o número do
 * calendário tem que bater com o que aparece ao abrir o dia.
 *
 * Leitura com o cliente da sessão (RLS decide o que cada papel vê). Aceita
 * dono e qualquer profissional ativa do negócio, porque as três áreas
 * (/admin, /recepcao, /profissional) mostram a mesma grade.
 *
 * Resposta: { dias: { 'YYYY-MM-DD': n } } · dia sem atendimento não vem.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const mes = req.nextUrl.searchParams.get('mes') ?? ''
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
    return NextResponse.json({ error: 'mes inválido (use YYYY-MM)' }, { status: 400 })
  }

  const { data: owner } = await supabase.from('businesses').select('id').eq('id', await negocioDoPainel(user.id)).maybeSingle()
  let businessId = owner?.id ?? null
  if (!businessId) {
    const { data: prof } = await supabase
      .from('professionals')
      .select('business_id')
      .eq('auth_user_id', user.id)
      .eq('active', true)
      .maybeSingle()
    businessId = prof?.business_id ?? null
  }
  if (!businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // Último dia do mês sem Date/fuso: dia 0 do mês seguinte em UTC.
  const [ano, m] = mes.split('-').map(Number)
  const ultimoDia = new Date(Date.UTC(ano, m, 0)).getUTCDate()
  const de = `${mes}-01`
  const ate = `${mes}-${String(ultimoDia).padStart(2, '0')}`

  const only = req.nextUrl.searchParams.get('only')
  const exclude = new Set((req.nextUrl.searchParams.get('exclude') ?? '').split(',').filter(Boolean))

  const { data, error } = await supabase
    .from('appointments')
    .select('appointment_date, professional_id, status')
    .eq('business_id', businessId)
    .gte('appointment_date', de)
    .lte('appointment_date', ate)
    .not('status', 'in', '(cancelled,no_show)')
    // Padrão do PostgREST corta em 1000 linhas; negócio cheio passa disso no mês.
    .range(0, 4999)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const dias: Record<string, number> = {}
  for (const a of data ?? []) {
    if (only && a.professional_id !== only) continue
    if (exclude.has(a.professional_id as string)) continue
    const d = a.appointment_date as string
    dias[d] = (dias[d] ?? 0) + 1
  }
  return NextResponse.json({ dias })
}
