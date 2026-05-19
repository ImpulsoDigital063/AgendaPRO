/**
 * PATCH /api/admin/appointments/[id]/services
 *
 * Edita a lista de serviços de um agendamento existente.
 *
 * Body: { serviceIds: string[] }
 *
 * Decisões (cravadas em 14/05/2026 com Eduardo):
 *  1. Status editáveis: pending · confirmed · completed · no_show
 *     (NÃO permite editar cancelled — agendamento abortado não muda mais).
 *  2. NÃO mexe em pontos · dono ajusta manual no perfil do cliente
 *     (preserva fluxo existente · evita double-spend ou estorno errado).
 *  3. Recalcula end_time com nova duração somada (libera slot residual
 *     pra agenda se duração diminuir).
 *  4. Se nova duração CAUSA SOBREPOSIÇÃO com outro appointment do mesmo
 *     profissional · bloqueia 409 com mensagem clara (constraint v40
 *     no_overlap também pega como defesa em profundidade).
 *  5. Mínimo 1 serviço (zero serviços = use status=cancelled).
 *  6. paid_at preservado (refund é problema operacional fora do app).
 *  7. Cupom permanece atrelado (caso raro · não trava operação).
 *  8. Permissão: owner do business OU professional do próprio appointment.
 *
 * Idempotência: rodar 2x com mesmos serviceIds resulta em estado igual
 * (DELETE+INSERT é determinístico).
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit-api'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const EDITABLE_STATUSES = new Set(['pending', 'confirmed', 'completed', 'no_show'])

/**
 * GET /api/admin/appointments/[id]/services
 *
 * Retorna lista completa de serviços ATIVOS do business + ids dos serviços
 * ATUAIS do appointment (pra montar UI de edição com checkboxes
 * pré-marcados). Mesma checagem de permissão do PATCH.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(req, { key: 'admin-appt-services-get', limit: 60, windowSeconds: 60 })
  if (rl) return rl

  const { id: appointmentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const admin = getAdminClient()

  const { data: appointment } = await admin
    .from('appointments')
    .select('id, business_id, professional_id, status, start_time, end_time')
    .eq('id', appointmentId)
    .single()

  if (!appointment) {
    return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 })
  }

  const [ownerRes, profRes] = await Promise.all([
    admin
      .from('businesses')
      .select('id')
      .eq('id', appointment.business_id)
      .eq('owner_id', user.id)
      .maybeSingle(),
    admin
      .from('professionals')
      .select('id, business_id, is_receptionist')
      .eq('auth_user_id', user.id)
      .maybeSingle(),
  ])
  const isOwner = !!ownerRes.data
  const isProfOfAppt =
    !!profRes.data &&
    profRes.data.business_id === appointment.business_id &&
    profRes.data.id === appointment.professional_id
  const isRecepOfBiz =
    !!profRes.data &&
    profRes.data.business_id === appointment.business_id &&
    profRes.data.is_receptionist === true
  if (!isOwner && !isProfOfAppt && !isRecepOfBiz) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  const [{ data: allServices }, { data: currentRows }] = await Promise.all([
    admin
      .from('services')
      .select('id, name, price, duration_minutes, points, active')
      .eq('business_id', appointment.business_id)
      .eq('active', true)
      .order('name'),
    admin
      .from('appointment_services')
      .select('service_id')
      .eq('appointment_id', appointmentId),
  ])

  const currentServiceIds = (currentRows || [])
    .map((r) => r.service_id)
    .filter(Boolean) as string[]

  return NextResponse.json({
    appointment: {
      id: appointment.id,
      status: appointment.status,
      start_time: appointment.start_time,
      end_time: appointment.end_time,
      editable: EDITABLE_STATUSES.has(appointment.status),
    },
    services: allServices ?? [],
    currentServiceIds,
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(req, { key: 'admin-appt-services', limit: 30, windowSeconds: 60 })
  if (rl) return rl

  const { id: appointmentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  // Body
  const body = await req.json().catch(() => ({}))
  const serviceIds: unknown = body.serviceIds
  if (
    !Array.isArray(serviceIds) ||
    serviceIds.length === 0 ||
    serviceIds.some((s) => typeof s !== 'string')
  ) {
    return NextResponse.json(
      { error: 'serviceIds obrigatório · array com pelo menos 1 id' },
      { status: 400 },
    )
  }
  const uniqueServiceIds = Array.from(new Set(serviceIds as string[]))
  // force=true: profissional confirmou que aceita overlap mesmo com aviso.
  // API pula pre-check e seta manual_overlap_accepted=true · constraint
  // v60 nao bloqueia mais o par (semantica EXCLUDE simetrica).
  const force = body.force === true

  const admin = getAdminClient()

  // Carrega o appointment
  const { data: appointment } = await admin
    .from('appointments')
    .select('id, business_id, professional_id, appointment_date, start_time, end_time, status')
    .eq('id', appointmentId)
    .single()

  if (!appointment) {
    return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 })
  }

  if (!EDITABLE_STATUSES.has(appointment.status)) {
    return NextResponse.json(
      { error: `Não é possível editar agendamento com status '${appointment.status}'.` },
      { status: 400 },
    )
  }

  // Permissão: owner OR professional do appointment
  const [ownerRes, profRes] = await Promise.all([
    admin
      .from('businesses')
      .select('id')
      .eq('id', appointment.business_id)
      .eq('owner_id', user.id)
      .maybeSingle(),
    admin
      .from('professionals')
      .select('id, business_id, is_receptionist')
      .eq('auth_user_id', user.id)
      .maybeSingle(),
  ])
  const isOwner = !!ownerRes.data
  const isProfOfAppt =
    !!profRes.data &&
    profRes.data.business_id === appointment.business_id &&
    profRes.data.id === appointment.professional_id
  const isRecepOfBiz =
    !!profRes.data &&
    profRes.data.business_id === appointment.business_id &&
    profRes.data.is_receptionist === true
  if (!isOwner && !isProfOfAppt && !isRecepOfBiz) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  // Valida serviços: devem pertencer ao mesmo business e estarem ativos
  const { data: services } = await admin
    .from('services')
    .select('id, name, price, duration_minutes, points, active, business_id')
    .in('id', uniqueServiceIds)

  if (!services || services.length !== uniqueServiceIds.length) {
    return NextResponse.json({ error: 'Um ou mais serviços não encontrados.' }, { status: 400 })
  }
  for (const s of services) {
    if (s.business_id !== appointment.business_id) {
      return NextResponse.json(
        { error: 'Serviço não pertence ao mesmo negócio do agendamento.' },
        { status: 400 },
      )
    }
    if (!s.active) {
      return NextResponse.json(
        { error: `Serviço "${s.name}" está inativo.` },
        { status: 400 },
      )
    }
  }

  // Calcula nova duração total + total_price + novo end_time
  const totalDurationMin = services.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0)
  if (totalDurationMin <= 0) {
    return NextResponse.json(
      { error: 'Duração total inválida (serviços sem duração configurada).' },
      { status: 400 },
    )
  }
  const totalPrice = services.reduce((sum, s) => sum + (s.price ?? 0), 0)

  // start_time vem como 'HH:MM' ou 'HH:MM:SS'. Calcula novo end_time.
  const [sh, sm] = appointment.start_time.split(':').map(Number)
  const startMinutes = sh * 60 + sm
  const endMinutes = startMinutes + totalDurationMin
  const eh = Math.floor(endMinutes / 60).toString().padStart(2, '0')
  const em = (endMinutes % 60).toString().padStart(2, '0')
  const newEndTime = `${eh}:${em}:00`

  // Pre-check de sobreposição: outros appointments do mesmo professional
  // no mesmo dia que entrariam em conflito com o novo intervalo.
  // Pulado quando force=true (profissional ja confirmou no modal).
  if (!force && newEndTime !== appointment.end_time) {
    const { data: conflicts } = await admin
      .from('appointments')
      .select('id, start_time, end_time, status, client_name')
      .eq('business_id', appointment.business_id)
      .eq('professional_id', appointment.professional_id)
      .eq('appointment_date', appointment.appointment_date)
      .neq('id', appointmentId)
      .not('status', 'in', '(cancelled,no_show)')
      .lt('start_time', newEndTime)
      .gt('end_time', appointment.start_time)
      .limit(1)

    if (conflicts && conflicts.length > 0) {
      const c = conflicts[0]
      return NextResponse.json(
        {
          error: `Conflita com agendamento de ${c.client_name} às ${c.start_time.slice(0, 5)}. Você pode salvar mesmo assim ou diminuir serviços.`,
          conflict: { id: c.id, start_time: c.start_time, client_name: c.client_name },
          canForce: true,
        },
        { status: 409 },
      )
    }
  }

  // Aplica mudanças. Não há transação client-side no supabase-js — fazemos
  // sequencial e retornamos erro se qualquer etapa falhar. Em caso de
  // falha após DELETE mas antes de INSERT/UPDATE, o appointment ficaria
  // sem services — o cron auto-complete não falha por isso e o admin
  // re-edita. Trade-off aceito pra evitar RPC só pra essa transação.

  const { error: delErr } = await admin
    .from('appointment_services')
    .delete()
    .eq('appointment_id', appointmentId)
  if (delErr) {
    return NextResponse.json({ error: 'Erro ao limpar serviços antigos.' }, { status: 500 })
  }

  const newRows = services.map((s) => ({
    appointment_id: appointmentId,
    service_id: s.id,
    service_name: s.name,
    price: s.price,
    duration_minutes: s.duration_minutes,
  }))
  const { error: insErr } = await admin.from('appointment_services').insert(newRows)
  if (insErr) {
    return NextResponse.json({ error: 'Erro ao gravar novos serviços.' }, { status: 500 })
  }

  // Atualiza os campos denormalizados em appointments (primeiro serviço
  // vira service_id/service_name pra retrocompat com card simples).
  // Quando force=true, marca manual_overlap_accepted=true · constraint v60
  // nao bloqueia o par com o appointment conflitante.
  const first = services[0]
  const updatePayload: Record<string, unknown> = {
    service_id: first.id,
    service_name: services.length === 1 ? first.name : `${first.name} +${services.length - 1}`,
    total_price: totalPrice,
    end_time: newEndTime,
  }
  if (force) {
    updatePayload.manual_overlap_accepted = true
  }
  const { error: updErr } = await admin
    .from('appointments')
    .update(updatePayload)
    .eq('id', appointmentId)

  if (updErr) {
    // 23P01 = no_overlap_appointments (defesa em profundidade)
    const code = (updErr as { code?: string }).code
    if (code === '23P01') {
      return NextResponse.json(
        { error: 'Sobreposição com outro agendamento — diminua a duração.' },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: 'Erro ao atualizar agendamento.' }, { status: 500 })
  }

  // Activity log (rastreio · usa professional_id existente do appointment)
  await admin.from('activity_log').insert({
    business_id: appointment.business_id,
    professional_id: appointment.professional_id,
    action: 'edit_services',
    target_type: 'appointment',
    target_id: appointmentId,
    description: `Serviços atualizados: ${services.map((s) => s.name).join(' + ')} · R$ ${totalPrice.toFixed(2).replace('.', ',')} · ${totalDurationMin}min`,
  })

  // Invalida cache server-side de getAppointmentsToday/Upcoming (unstable_cache
  // com revalidate 15s). Sem isso, router.refresh() no client iria buscar
  // server component que ainda lê do cache · UI mostraria dados antigos
  // por até 15s.
  revalidatePath('/admin')
  revalidatePath('/profissional')

  return NextResponse.json({
    ok: true,
    appointment: {
      id: appointmentId,
      service_name: services.length === 1 ? first.name : `${first.name} +${services.length - 1}`,
      total_price: totalPrice,
      end_time: newEndTime,
      duration_minutes: totalDurationMin,
    },
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      duration_minutes: s.duration_minutes,
      points: s.points,
    })),
  })
}
