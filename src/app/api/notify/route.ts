import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendBarberNotification, sendClientBookingConfirmation } from '@/lib/email'
import { sendWebPush } from '@/lib/notify-push'
import { generateCancelToken } from '@/lib/token'
import { checkRateLimit } from '@/lib/rate-limit-api'

// web-push (Node) — força runtime Node neste route handler.
export const runtime = 'nodejs'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Endpoint publico — chamado pelo BookingFlow apos o cliente criar o agendamento.
// Usa service role pra buscar o appointment e disparar emails (barbeiro + cliente).
// Idempotencia: so envia pra agendamentos criados ha menos de 10 min (anti-spam).
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'notify', limit: 30, windowSeconds: 60 })
  if (rl) return rl

  const { appointmentId } = await req.json()

  if (!appointmentId) {
    return NextResponse.json({ error: 'appointmentId obrigatório' }, { status: 400 })
  }

  const admin = getAdminClient()

  const { data: appointment } = await admin
    .from('appointments')
    .select(`*, business:businesses(name, slug, owner_id), professional:professionals(name, email, auth_user_id), service:services(name), appointment_services(service_name, price)`)
    .eq('id', appointmentId)
    .single()

  if (!appointment?.business) {
    return NextResponse.json({ ok: false, reason: 'negócio não encontrado' })
  }

  // cancelUrl SEMPRE vai no retorno — independente de email dar certo
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://agendapro.net.br'
  const cancelUrl = `${appUrl}/cancelar?id=${appointmentId}&token=${generateCancelToken(appointmentId)}`

  // Anti-spam: so notifica agendamentos criados ha menos de 10 min
  const createdAt = new Date(appointment.created_at).getTime()
  const age = Date.now() - createdAt
  if (age > 10 * 60 * 1000) {
    return NextResponse.json({ ok: false, reason: 'agendamento antigo', cancelUrl })
  }

  /* Idempotência de verdade (v114) · antes a única trava era a janela de 10
     min acima, o que deixava dois POSTs seguidos mandarem dois emails. Isso
     impedia o servidor de avisar também — e o aviso dependia do navegador da
     cliente sobreviver ao pós-agendamento, que em 4G ruim não sobrevive.

     Agora quem chega primeiro (servidor ou navegador) marca e envia; o outro
     só devolve o cancelUrl. A marcação vem ANTES dos envios de propósito: em
     empate, prefiro não avisar duas vezes a avisar duas. */
  const { data: marcou, error: marcaErr } = await admin
    .from('appointments')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', appointmentId)
    .is('notified_at', null)
    .select('id')

  /* Se a v114 ainda não rodou, a coluna não existe e o update dá erro. Nesse
     caso segue e envia: sem a coluna o comportamento volta a ser o de antes
     (janela de 10 min), o que é ruim mas não é ficar mudo. Deploy chegando
     antes da migration não pode calar a notificação do salão. */
  if (!marcaErr && (!marcou || marcou.length === 0)) {
    return NextResponse.json({ ok: true, reason: 'ja notificado', cancelUrl })
  }
  if (marcaErr) console.warn('[notify] sem coluna notified_at (rodar v114?) · enviando assim mesmo')

  // Notificação vai pro PROFISSIONAL designado (pedido Olímpio 05/06 — antes
  // ia sempre pro dono). Resolve o email: coluna professionals.email →
  // email do auth user do profissional → (fallback) dono, pra notificação
  // nunca se perder caso o profissional não tenha email cadastrado.
  const prof = appointment.professional as { name?: string; email?: string | null; auth_user_id?: string | null } | null
  let recipientEmail: string | null = prof?.email ?? null
  if (!recipientEmail && prof?.auth_user_id) {
    const { data: profUser } = await admin.auth.admin.getUserById(prof.auth_user_id)
    recipientEmail = profUser?.user?.email ?? null
  }
  if (!recipientEmail) {
    const { data: ownerData } = await admin.auth.admin.getUserById(appointment.business.owner_id)
    recipientEmail = ownerData?.user?.email ?? null // fallback: dono
  }
  const barberEmail =
    process.env.NODE_ENV === 'development'
      ? process.env.TEST_EMAIL
      : recipientEmail

  const apptServices: { service_name: string; price: number | null }[] = appointment.appointment_services || []
  const serviceNames = apptServices.length > 0
    ? apptServices.map((s: { service_name: string }) => s.service_name)
    : appointment.service_name ? [appointment.service_name] : []

  // Email pro barbeiro (tolerante a falha)
  if (barberEmail) {
    try {
      await sendBarberNotification({
        barberEmail,
        barberName: appointment.professional?.name || 'Profissional',
        businessName: appointment.business.name,
        clientName: appointment.client_name,
        clientPhone: appointment.client_phone,
        date: appointment.appointment_date,
        startTime: appointment.start_time.slice(0, 5),
        endTime: appointment.end_time.slice(0, 5),
        appointmentId,
        serviceName: serviceNames.join(', ') || null,
      })
    } catch (err) {
      console.error('[notify] falha ao enviar email pro barbeiro:', err)
    }
  }

  // Web Push pro dono/profissional (tolerante a falha, do lado do email).
  // Destinatário = mesma lógica do email: profissional designado → dono.
  // As assinaturas ficam em push_subscriptions (uma por device); envia pra
  // todas e limpa as mortas (404/410). No-op se ninguém ativou / sem VAPID.
  const recipientUserId = prof?.auth_user_id ?? appointment.business.owner_id
  if (recipientUserId) {
    try {
      const { data: subs } = await admin
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', recipientUserId)

      if (subs && subs.length > 0) {
        const hora = appointment.start_time.slice(0, 5)
        const svc = serviceNames.length ? ` · ${serviceNames.join(', ')}` : ''
        // Dia + data do agendamento. appointment_date é DATE puro (YYYY-MM-DD);
        // monto o Date com os componentes ao meio-dia local pra pegar o dia da
        // semana certo sem shift de fuso (nada de new Date(iso) cru).
        let quando = `às ${hora}`
        try {
          const [yy, mm, dd] = String(appointment.appointment_date).split('-')
          const dt = new Date(Number(yy), Number(mm) - 1, Number(dd), 12, 0, 0)
          const semana = dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
          quando = `${semana} ${dd}/${mm} às ${hora}`
        } catch {}
        const payload = {
          titulo: 'Novo agendamento',
          corpo: `${appointment.client_name || 'Cliente'} · ${quando}${svc}`,
          url: '/admin',
        }
        const results = await Promise.all(
          subs.map((s: { endpoint: string; p256dh: string; auth: string }) => sendWebPush(s, payload))
        )
        const mortas = subs.filter((_, i) => results[i]?.gone).map((s) => s.endpoint)
        if (mortas.length > 0) {
          await admin.from('push_subscriptions').delete().in('endpoint', mortas)
        }
      }
    } catch (err) {
      console.error('[notify] falha ao enviar web push:', err)
    }
  }

  // Email de confirmação pro cliente (tolerante a falha)
  if (appointment.client_email) {
    try {
      await sendClientBookingConfirmation({
        clientEmail: appointment.client_email,
        clientName: appointment.client_name,
        businessName: appointment.business.name,
        date: appointment.appointment_date,
        startTime: appointment.start_time.slice(0, 5),
        endTime: appointment.end_time.slice(0, 5),
        services: serviceNames,
        totalPrice: appointment.total_price,
        appointmentId,
        businessSlug: appointment.business.slug,
      })
    } catch (err) {
      console.error('[notify] falha ao enviar email pro cliente:', err)
    }
  }

  return NextResponse.json({ ok: true, cancelUrl })
}
