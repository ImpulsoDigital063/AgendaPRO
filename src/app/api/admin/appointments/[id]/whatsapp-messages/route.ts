/**
 * GET /api/admin/appointments/[id]/whatsapp-messages
 *
 * Devolve as mensagens de WhatsApp JÁ MONTADAS (confirmação + lembrete) pro
 * atendimento, usando os modelos do negócio (ou os padrões). Envio é manual
 * (o client abre o wa.me com o texto) · Z-API fica dormindo até 10 pagantes.
 *
 * Auth: dono do business OU profissional do appointment OU recepcionista.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit-api'
import {
  renderTemplate,
  defaultTemplate,
  type TemplateVars,
} from '@/lib/message-templates'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

function formatDateBR(d: string): string {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(req, { key: 'admin-appt-wa-msg', limit: 120, windowSeconds: 60 })
  if (rl) return rl

  const { id: appointmentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const admin = getAdminClient()

  const { data: appt } = await admin
    .from('appointments')
    .select(`
      id, business_id, professional_id, appointment_date, start_time,
      service_name, client_name, client_phone, customer_id,
      professional:professionals(name),
      customer:customers(name, phone)
    `)
    .eq('id', appointmentId)
    .maybeSingle()

  if (!appt) return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 })

  // Permissão: dono OU profissional do appointment OU recepcionista do business
  const [ownerRes, profRes] = await Promise.all([
    admin.from('businesses')
      .select('id, name, whatsapp_confirmation_template, whatsapp_reminder_template')
      .eq('id', appt.business_id).maybeSingle(),
    admin.from('professionals')
      .select('id, business_id, is_receptionist')
      .eq('auth_user_id', user.id).maybeSingle(),
  ])
  const business = ownerRes.data
  const isOwner = !!business && (await admin
    .from('businesses').select('id').eq('id', appt.business_id).eq('owner_id', user.id).maybeSingle()).data != null
  const isProfOfAppt = !!profRes.data && profRes.data.business_id === appt.business_id && profRes.data.id === appt.professional_id
  const isRecepOfBiz = !!profRes.data && profRes.data.business_id === appt.business_id && profRes.data.is_receptionist === true
  if (!isOwner && !isProfOfAppt && !isRecepOfBiz) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }
  if (!business) return NextResponse.json({ error: 'Negócio não encontrado.' }, { status: 404 })

  const prof = Array.isArray(appt.professional) ? appt.professional[0] : appt.professional
  const customer = Array.isArray(appt.customer) ? appt.customer[0] : appt.customer

  // {servico}: lista os serviços do atendimento (mais legível que "Nome +1").
  const { data: svcRows } = await admin
    .from('appointment_services')
    .select('service_name')
    .eq('appointment_id', appointmentId)
  const serviceNames = (svcRows ?? []).map((r) => r.service_name).filter(Boolean) as string[]
  const servico = serviceNames.length > 0
    ? serviceNames.join(' + ')
    : (appt.service_name ?? 'atendimento')

  const phone = (appt.client_phone || customer?.phone || '').replace(/\D/g, '')

  const vars: TemplateVars = {
    cliente: appt.client_name || customer?.name || 'Cliente',
    servico,
    data: formatDateBR(appt.appointment_date),
    hora: (appt.start_time as string).slice(0, 5),
    negocio: business.name || 'nosso espaço',
    profissional: prof?.name || '',
  }

  const confirmationTpl = business.whatsapp_confirmation_template?.trim() || defaultTemplate('confirmation')
  const reminderTpl = business.whatsapp_reminder_template?.trim() || defaultTemplate('reminder')

  return NextResponse.json({
    confirmation: renderTemplate(confirmationTpl, vars),
    reminder: renderTemplate(reminderTpl, vars),
    phone,
    hasPhone: phone.length >= 10,
  })
}
