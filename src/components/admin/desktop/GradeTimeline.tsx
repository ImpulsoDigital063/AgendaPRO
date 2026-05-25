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
  payment_method: string | null
}

const HOUR_START = 7 // 07:00 começa a grade (ajuste futuro: business_hours)
const HOUR_END = 22 // 22:00 termina

export default async function GradeTimeline({ businessId, date }: Props) {
  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const [{ data: profsData }, { data: apptsData }, { data: servicesData }, { data: salesPaidDay }] = await Promise.all([
    sb
      .from('professionals')
      .select('id, name, photo_url, is_receptionist')
      .eq('business_id', businessId)
      .eq('active', true)
      .order('name'),
    sb
      .from('appointments')
      .select('id, professional_id, start_time, end_time, status, client_name, service_name, total_price, paid_at, payment_method')
      .eq('business_id', businessId)
      .eq('appointment_date', date)
      // Cancelados aparecem visualmente diferentes (faixa diagonal/desbotado · vide TimelineGridInteractive)
      // pra preservar contexto histórico do slot (Salão99 pattern).
      .order('start_time'),
    sb
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('business_id', businessId)
      .eq('active', true)
      .order('name'),
    // Vendas de produto pagas no dia · entram no "Recebido" (exclui cortesia)
    sb
      .from('sales')
      .select('total, paid_at')
      .eq('business_id', businessId)
      .eq('type', 'product_sale')
      .eq('status', 'paid')
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('paid_at', `${date}T00:00:00`)
      .lt('paid_at', `${date}T23:59:59`),
  ])

  const profs = (profsData ?? []).filter((p) => !p.is_receptionist).map((p) => ({
    id: p.id,
    name: p.name,
    photo_url: p.photo_url ?? null,
  }))
  const appts = (apptsData ?? []) as ApptRow[]
  const services = (servicesData ?? []) as { id: string; name: string; price: number | null; duration_minutes: number | null }[]

  // KPIs do dia · só renderizam quando date === HOJE (header gateia internamente)
  // Cortesia NÃO conta como receita real (bonificação)
  const recebidoApptsHoje = appts
    .filter((a) => a.paid_at && a.payment_method !== 'courtesy' && a.payment_method !== 'credit')
    .reduce((s, a) => s + (Number(a.total_price) || 0), 0)
  const recebidoSalesHoje = (salesPaidDay ?? []).reduce((s, p) => s + Number(p.total ?? 0), 0)
  const recebidoHoje = recebidoApptsHoje + recebidoSalesHoje
  const aReceberHoje = appts
    .filter((a) => !a.paid_at && (a.status === 'confirmed' || a.status === 'completed') && (a.total_price ?? 0) > 0)
    .reduce((s, a) => s + (Number(a.total_price) || 0), 0)
  const pendentesHoje = appts.filter((a) => a.status === 'pending').length

  return (
    <div className="grade-timeline">
      <GradeTimelineHeader
        date={date}
        totalAppts={appts.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show').length}
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
