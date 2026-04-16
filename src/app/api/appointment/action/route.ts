import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendClientNotification, sendWaitlistNotification } from '@/lib/email'
import { verifyActionToken } from '@/lib/token'
import { rateLimit } from '@/lib/rate-limit'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { success } = rateLimit({ key: `action:${ip}`, limit: 20, windowSeconds: 600 })
  if (!success) {
    return new NextResponse('Muitas tentativas. Aguarde alguns minutos.', { status: 429 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const action = searchParams.get('action')
  const token = searchParams.get('token')

  if (!id || !action || !['confirmed', 'cancelled'].includes(action)) {
    return new NextResponse('Ação inválida.', { status: 400 })
  }

  // Verificação de token HMAC — impede ações por UUID aleatório
  if (!token || !verifyActionToken(id, action, token)) {
    return new NextResponse('Link inválido ou expirado.', { status: 403 })
  }

  const supabase = getAdminClient()

  const { error } = await supabase
    .from('appointments')
    .update({ status: action })
    .eq('id', id)

  if (error) {
    return new NextResponse('Erro ao atualizar agendamento.', { status: 500 })
  }

  // Busca dados para notificar o cliente
  const { data: rawAppt } = await supabase
    .from('appointments')
    .select('client_email, client_name, appointment_date, start_time, service_name, professional_id, business:businesses(name, slug)')
    .eq('id', id)
    .single()

  const appointment = rawAppt as typeof rawAppt & { business: { name: string; slug: string } | null }

  if (appointment?.client_email) {
    sendClientNotification({
      clientEmail: appointment.client_email,
      clientName: appointment.client_name,
      businessName: appointment.business?.name || 'estabelecimento',
      date: appointment.appointment_date,
      startTime: appointment.start_time.slice(0, 5),
      confirmed: action === 'confirmed',
      serviceName: appointment.service_name ?? null,
    }).catch(() => {})
  }

  // Se cancelou, notifica o primeiro da fila de espera
  if (action === 'cancelled' && appointment) {
    const { data: rawWaitlist } = await supabase
      .from('waitlist')
      .select('id, client_email, client_name, appointment_date, start_time, business:businesses(name, slug)')
      .eq('professional_id', appointment.professional_id)
      .eq('appointment_date', appointment.appointment_date)
      .eq('start_time', appointment.start_time)
      .is('notified_at', null)
      .order('created_at')
      .limit(1)
      .maybeSingle()

    const waitlistEntry = rawWaitlist as typeof rawWaitlist & { business: { name: string; slug: string } | null }

    if (waitlistEntry?.client_email) {
      await supabase
        .from('waitlist')
        .update({ notified_at: new Date().toISOString() })
        .eq('id', waitlistEntry.id)

      sendWaitlistNotification({
        clientEmail: waitlistEntry.client_email,
        clientName: waitlistEntry.client_name,
        businessName: waitlistEntry.business?.name || 'estabelecimento',
        businessSlug: waitlistEntry.business?.slug || '',
        date: waitlistEntry.appointment_date,
        startTime: waitlistEntry.start_time.slice(0, 5),
      }).catch(() => {})
    }
  }

  const label = action === 'confirmed' ? 'confirmado ✅' : 'cancelado ❌'

  return new NextResponse(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>AgendaPRO</title>
    </head>
    <body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f4f4f5;font-family:-apple-system,sans-serif;">
      <div style="text-align:center;background:#fff;padding:48px 40px;border-radius:16px;border:1px solid #e4e4e7;max-width:360px;">
        <p style="font-size:48px;margin:0 0 16px;">${action === 'confirmed' ? '✅' : '❌'}</p>
        <h2 style="margin:0 0 8px;color:#18181b;">Agendamento ${label}</h2>
        <p style="color:#71717a;margin:0;">Você já pode fechar essa janela.</p>
      </div>
    </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' },
  })
}
