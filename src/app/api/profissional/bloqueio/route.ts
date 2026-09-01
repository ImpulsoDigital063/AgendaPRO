import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit-api'
import type { NextRequest } from 'next/server'

/**
 * Bloqueio de horário da PRÓPRIA profissional (30/07/2026).
 *
 * Por que rota e não insert direto: a policy da v53 só deixa o DONO gravar em
 * business_blocks (profissional tem SELECT). Em vez de afrouxar a policy pro
 * negócio inteiro, o servidor confere que o bloqueio é da agenda dela e grava
 * com service-role. Ela nunca bloqueia a agenda de outra pessoa: o
 * professional_id vem de quem está logado, não do corpo da requisição.
 *
 * Eduardo 30/07: "deve estar aí, pra quando elas precisam bloquear a sua agenda"
 * (almoço, folga, compromisso).
 */

function getAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

async function profissionalLogada(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: prof } = await supabase
    .from('professionals')
    .select('id, business_id, name, is_receptionist, business:businesses(prof_edita_horario)')
    .eq('auth_user_id', user.id)
    .eq('active', true)
    .maybeSingle()
  if (!prof || prof.is_receptionist) return null
  return prof
}

/**
 * v146 · bloquear a própria agenda É decidir horário.
 *
 * A v131/v132 tirou a aba Horários de quem o negócio não autoriza e trancou
 * `working_hours` na policy. Só que bloqueio mora em `business_blocks`, outra
 * tabela, e esta rota grava com service-role justamente pra contornar a policy
 * da v53 — então passava por fora do gate. No Studio Isis Melo, que pagou pra
 * horário ser decisão da dona e da recepção, a profissional se bloqueava e a
 * recepção não conseguia mais encaixar ninguém ali.
 *
 * Uma decisão, duas portas: agora as duas pedem a mesma chave. Default `true`
 * no banco → negócio que não pediu nada segue como sempre.
 */
function podeMexerNoHorario(prof: { business?: unknown } | null): boolean {
  const biz = prof?.business as { prof_edita_horario?: boolean | null } | null | undefined
  return biz?.prof_edita_horario !== false
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'prof-bloqueio', limit: 30, windowSeconds: 60 })
  if (rl) return rl

  const supabase = await createClient()
  const prof = await profissionalLogada(supabase)
  if (!prof) return NextResponse.json({ error: 'nao_autorizado' }, { status: 403 })
  if (!podeMexerNoHorario(prof)) {
    return NextResponse.json({ error: 'horario_reservado_a_administracao' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const tipo = body?.block_type === 'recurring' ? 'recurring' : 'specific'
  const date = typeof body?.date === 'string' ? body.date : ''
  const diaSemana = Number(body?.day_of_week)
  const start = typeof body?.start_time === 'string' ? body.start_time : ''
  const end = typeof body?.end_time === 'string' ? body.end_time : ''
  const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 80) : null

  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
    return NextResponse.json({ error: 'horario_invalido' }, { status: 400 })
  }
  if (end <= start) return NextResponse.json({ error: 'fim_antes_do_inicio' }, { status: 400 })
  if (tipo === 'specific' && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'data_invalida' }, { status: 400 })
  }
  if (tipo === 'recurring' && !(diaSemana >= 0 && diaSemana <= 6)) {
    return NextResponse.json({ error: 'dia_da_semana_invalido' }, { status: 400 })
  }

  const admin = getAdmin()

  // Não deixa bloquear em cima de atendimento ativo — a cliente ficaria com
  // horário marcado num período "indisponível" e ninguém entenderia depois.
  // Pontual: confere o dia. Recorrente: confere as próximas 8 semanas naquele
  // dia da semana (janela suficiente pra pegar o que já está marcado sem varrer
  // a agenda inteira).
  let q = admin
    .from('appointments')
    .select('id, appointment_date, start_time, end_time, client_name')
    .eq('professional_id', prof.id)
    .not('status', 'in', '(cancelled,no_show)')
  if (tipo === 'specific') {
    q = q.eq('appointment_date', date)
  } else {
    const hoje = new Date().toISOString().slice(0, 10)
    const limite = new Date(Date.now() + 56 * 86_400_000).toISOString().slice(0, 10)
    q = q.gte('appointment_date', hoje).lte('appointment_date', limite)
  }
  const { data: candidatos } = await q
  const bate = (candidatos ?? []).find((a) => {
    if (tipo === 'recurring') {
      const dow = new Date(String(a.appointment_date) + 'T12:00:00Z').getUTCDay()
      if (dow !== diaSemana) return false
    }
    const s = String(a.start_time).slice(0, 5)
    const e = String(a.end_time).slice(0, 5)
    return s < end && e > start
  })
  if (bate) {
    const quando = tipo === 'recurring'
      ? ` em ${String(bate.appointment_date).slice(8, 10)}/${String(bate.appointment_date).slice(5, 7)}`
      : ''
    return NextResponse.json({
      error: 'conflito',
      detail: `Você tem ${bate.client_name ?? 'um atendimento'}${quando} das ${String(bate.start_time).slice(0, 5)} às ${String(bate.end_time).slice(0, 5)}. Cancele ou remarque antes de bloquear.`,
    }, { status: 409 })
  }

  const { data: criado, error } = await admin
    .from('business_blocks')
    .insert({
      business_id: prof.business_id,
      professional_id: prof.id, // sempre a própria · nunca vem do body
      block_type: tipo,
      block_date: tipo === 'specific' ? date : null,
      day_of_week: tipo === 'recurring' ? diaSemana : null,
      start_time: `${start}:00`,
      end_time: `${end}:00`,
      reason: reason || 'Indisponível',
      active: true,
    })
    .select('id, block_type, block_date, day_of_week, start_time, end_time, reason')
    .single()

  if (error) {
    console.error('[prof-bloqueio] insert falhou:', error.message)
    return NextResponse.json({ error: 'falha_ao_gravar', detail: error.message }, { status: 500 })
  }

  // λ.prova-na-fonte · relê antes de dizer que deu certo
  const { data: conferido } = await admin
    .from('business_blocks')
    .select('id, active')
    .eq('id', criado.id)
    .maybeSingle()
  if (!conferido?.active) {
    return NextResponse.json({ error: 'nao_confirmado' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, bloqueio: criado })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const prof = await profissionalLogada(supabase)
  if (!prof) return NextResponse.json({ error: 'nao_autorizado' }, { status: 403 })
  if (!podeMexerNoHorario(prof)) {
    return NextResponse.json({ error: 'horario_reservado_a_administracao' }, { status: 403 })
  }

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id_obrigatorio' }, { status: 400 })

  const admin = getAdmin()
  // Só apaga bloqueio DELA — o filtro por professional_id é a trava
  const { error } = await admin
    .from('business_blocks')
    .delete()
    .eq('id', id)
    .eq('professional_id', prof.id)
  if (error) return NextResponse.json({ error: 'falha_ao_remover' }, { status: 500 })

  const { data: aindaExiste } = await admin
    .from('business_blocks').select('id').eq('id', id).maybeSingle()
  return NextResponse.json({ ok: !aindaExiste })
}
