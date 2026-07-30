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
    .select('id, business_id, name, is_receptionist')
    .eq('auth_user_id', user.id)
    .eq('active', true)
    .maybeSingle()
  if (!prof || prof.is_receptionist) return null
  return prof
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'prof-bloqueio', limit: 30, windowSeconds: 60 })
  if (rl) return rl

  const supabase = await createClient()
  const prof = await profissionalLogada(supabase)
  if (!prof) return NextResponse.json({ error: 'nao_autorizado' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const date = typeof body?.date === 'string' ? body.date : ''
  const start = typeof body?.start_time === 'string' ? body.start_time : ''
  const end = typeof body?.end_time === 'string' ? body.end_time : ''
  const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 80) : null

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: 'data_invalida' }, { status: 400 })
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
    return NextResponse.json({ error: 'horario_invalido' }, { status: 400 })
  }
  if (end <= start) return NextResponse.json({ error: 'fim_antes_do_inicio' }, { status: 400 })

  const admin = getAdmin()

  // Não deixa bloquear em cima de atendimento ativo — a cliente ficaria com
  // horário marcado num período "indisponível" e ninguém entenderia depois.
  const { data: conflitos } = await admin
    .from('appointments')
    .select('id, start_time, end_time, client_name')
    .eq('professional_id', prof.id)
    .eq('appointment_date', date)
    .not('status', 'in', '(cancelled,no_show)')
  const bate = (conflitos ?? []).find((a) => {
    const s = String(a.start_time).slice(0, 5)
    const e = String(a.end_time).slice(0, 5)
    return s < end && e > start
  })
  if (bate) {
    return NextResponse.json({
      error: 'conflito',
      detail: `Você tem ${bate.client_name ?? 'um atendimento'} das ${String(bate.start_time).slice(0, 5)} às ${String(bate.end_time).slice(0, 5)}. Cancele ou remarque antes de bloquear.`,
    }, { status: 409 })
  }

  const { data: criado, error } = await admin
    .from('business_blocks')
    .insert({
      business_id: prof.business_id,
      professional_id: prof.id, // sempre a própria · nunca vem do body
      block_type: 'specific',
      block_date: date,
      start_time: `${start}:00`,
      end_time: `${end}:00`,
      reason: reason || 'Indisponível',
      active: true,
    })
    .select('id, block_date, start_time, end_time, reason')
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
