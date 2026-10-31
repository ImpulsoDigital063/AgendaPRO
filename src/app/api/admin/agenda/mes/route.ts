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
 * Resposta: { dias: { 'YYYY-MM-DD': n }, itens, bloqueios } · dia sem atendimento
 * não vem. Izanara (31/10): só largaria o Google Agenda vendo o mês inteiro com
 * o serviço de cada dia e as folgas, sem abrir dia por dia.
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
    .select('appointment_date, professional_id, status, service_name, start_time')
    .order('start_time')
    .eq('business_id', businessId)
    .gte('appointment_date', de)
    .lte('appointment_date', ate)
    .not('status', 'in', '(cancelled,no_show)')
    // Padrão do PostgREST corta em 1000 linhas; negócio cheio passa disso no mês.
    .range(0, 4999)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const dias: Record<string, number> = {}
  const itens: Record<string, string[]> = {}
  for (const a of data ?? []) {
    if (only && a.professional_id !== only) continue
    if (exclude.has(a.professional_id as string)) continue
    const d = a.appointment_date as string
    dias[d] = (dias[d] ?? 0) + 1
    ;(itens[d] ??= []).push((a.service_name as string | null) ?? 'Atendimento')
  }

  // Bloqueios do mês: recorrente vale em todo aquele dia da semana.
  const [{ data: blocos }, { data: equipe }] = await Promise.all([
    supabase
      .from('business_blocks')
      .select('professional_id, block_type, day_of_week, block_date, reason')
      .eq('business_id', businessId)
      .eq('active', true),
    supabase.from('professionals').select('id, name').eq('business_id', businessId),
  ])
  const nomes = new Map((equipe ?? []).map((p) => [p.id as string, (p.name as string).split(' ')[0]]))
  const bloqueios: Record<string, string[]> = {}
  for (const b of blocos ?? []) {
    const prof = b.professional_id as string | null
    if (prof && ((only && prof !== only) || exclude.has(prof))) continue
    const rotulo = [(b.reason as string | null)?.trim() || 'Bloqueio', prof ? nomes.get(prof) : null].filter(Boolean).join(': ')
    for (let dia = 1; dia <= ultimoDia; dia++) {
      const iso = `${mes}-${String(dia).padStart(2, '0')}`
      const dow = new Date(Date.UTC(ano, m - 1, dia)).getUTCDay()
      const vale = b.block_type === 'recurring' ? b.day_of_week === dow : b.block_date === iso
      if (vale && !bloqueios[iso]?.includes(rotulo)) (bloqueios[iso] ??= []).push(rotulo)
    }
  }
  return NextResponse.json({ dias, itens, bloqueios })
}
