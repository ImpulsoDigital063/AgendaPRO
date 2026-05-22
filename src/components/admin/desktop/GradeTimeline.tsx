import { createClient as createServiceClient } from '@supabase/supabase-js'
import GradeTimelineHeader from './GradeTimelineHeader'
import TimelineGridInteractive from './TimelineGridInteractive'

type Props = {
  businessId: string
  date: string
}

type ApptRow = {
  id: string
  professional_id: string
  start_time: string
  end_time: string
  status: string
  client_name: string | null
  service_name: string | null
  total_price: number | null
  paid_at: string | null
}

const HOUR_START = 7 // 07:00 começa a grade (ajuste futuro: business_hours)
const HOUR_END = 22 // 22:00 termina

export default async function GradeTimeline({ businessId, date }: Props) {
  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const [{ data: profsData }, { data: apptsData }, { data: servicesData }] = await Promise.all([
    sb
      .from('professionals')
      .select('id, name, photo_url, is_receptionist')
      .eq('business_id', businessId)
      .eq('active', true)
      .order('name'),
    sb
      .from('appointments')
      .select('id, professional_id, start_time, end_time, status, client_name, service_name, total_price, paid_at')
      .eq('business_id', businessId)
      .eq('appointment_date', date)
      .neq('status', 'cancelled')
      .order('start_time'),
    sb
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('business_id', businessId)
      .eq('active', true)
      .order('name'),
  ])

  const profs = (profsData ?? []).filter((p) => !p.is_receptionist).map((p) => ({
    id: p.id,
    name: p.name,
    photo_url: p.photo_url ?? null,
  }))
  const appts = (apptsData ?? []) as ApptRow[]
  const services = (servicesData ?? []) as { id: string; name: string; price: number | null; duration_minutes: number | null }[]

  // KPIs do dia · só renderizam quando date === HOJE (header gateia internamente)
  const recebidoHoje = appts
    .filter((a) => a.paid_at)
    .reduce((s, a) => s + (Number(a.total_price) || 0), 0)
  const aReceberHoje = appts
    .filter((a) => !a.paid_at && (a.status === 'confirmed' || a.status === 'completed') && (a.total_price ?? 0) > 0)
    .reduce((s, a) => s + (Number(a.total_price) || 0), 0)
  const pendentesHoje = appts.filter((a) => a.status === 'pending').length

  return (
    <div className="grade-timeline">
      <GradeTimelineHeader
        date={date}
        totalAppts={appts.length}
        recebidoHoje={recebidoHoje}
        aReceberHoje={aReceberHoje}
        pendentesHoje={pendentesHoje}
      />

      <TimelineGridInteractive
        businessId={businessId}
        profs={profs}
        appts={appts}
        services={services}
        hourStart={HOUR_START}
        hourEnd={HOUR_END}
        date={date}
      />
    </div>
  )
}
