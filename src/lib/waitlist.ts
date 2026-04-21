import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendWaitlistNotification } from '@/lib/email'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

type WaitlistRow = {
  id: string
  client_email: string | null
  client_name: string
  appointment_date: string
  start_time: string
  business: { name: string; slug: string } | null
}

/**
 * Quando um agendamento é cancelado, notifica TODOS da fila (não só o primeiro).
 * Primeiro a reagendar pega o horario. Marca notified_at pra nao reenviar.
 * Retorna a quantidade de notificacoes enviadas.
 */
export async function notifyWaitlistForCancelledSlot({
  professional_id,
  appointment_date,
  start_time,
}: {
  professional_id: string
  appointment_date: string
  start_time: string
}): Promise<number> {
  const admin = getAdminClient()

  const { data } = await admin
    .from('waitlist')
    .select('id, client_email, client_name, appointment_date, start_time, business:businesses(name, slug)')
    .eq('professional_id', professional_id)
    .eq('appointment_date', appointment_date)
    .eq('start_time', start_time)
    .is('notified_at', null)
    .order('created_at')

  const entries = (data || []) as unknown as WaitlistRow[]
  if (entries.length === 0) return 0

  const ids = entries.map((e) => e.id)
  await admin
    .from('waitlist')
    .update({ notified_at: new Date().toISOString() })
    .in('id', ids)

  let sent = 0
  await Promise.all(
    entries.map(async (entry) => {
      if (!entry.client_email) return
      try {
        await sendWaitlistNotification({
          clientEmail: entry.client_email,
          clientName: entry.client_name,
          businessName: entry.business?.name || 'estabelecimento',
          businessSlug: entry.business?.slug || '',
          date: entry.appointment_date,
          startTime: entry.start_time.slice(0, 5),
          professionalId: professional_id,
          waitlistId: entry.id,
        })
        sent++
      } catch (err) {
        console.error('[waitlist] erro ao enviar notificacao', err)
      }
    })
  )

  return sent
}
