import { createClient as createServiceClient } from '@supabase/supabase-js'
import { startOfDayBR, addDaysBR } from '@/lib/date-br'
import GradeTimelineHeader from './GradeTimelineHeader'
import TimelineGridInteractive from './TimelineGridInteractive'
import type { BlockRow } from '@/lib/blocks'

type Props = {
  businessId: string
  date: string
  /** Esconde mini-KPIs do header (Recebido/A receber/Pendentes). Útil quando
   *  o componente é embedado em página que já tem KPIs (ex: Início, Eu) */
  hideKpis?: boolean
  /** Quando setado, mostra só a coluna desse profissional (ex: aba "Eu" do
   *  dono que atende). Default: todos os profs ativos do negócio. */
  onlyProfessionalId?: string
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
  is_package?: boolean
}

const HOUR_START = 7 // 07:00 começa a grade (ajuste futuro: business_hours)
const HOUR_END = 22 // 22:00 termina

export default async function GradeTimeline({ businessId, date, hideKpis = false, onlyProfessionalId }: Props) {
  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const [{ data: profsData }, { data: apptsData }, { data: servicesData }, { data: blocksData }, { data: salesPaidDay }, { data: apptsPaidDay }, { data: salesPendingDay }] = await Promise.all([
    sb
      .from('professionals')
      .select('id, name, photo_url, is_receptionist, does_appointments')
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
    // Bloqueios ativos (almoço · folga · feriado) · a grade decide quais
    // aplicam nesta data via blockAppliesTo. Sem esta query a timeline
    // recebia blocks=undefined e nunca mostrava bloqueio.
    sb
      .from('business_blocks')
      .select('id, professional_id, block_type, day_of_week, block_date, start_time, end_time, reason')
      .eq('business_id', businessId)
      .eq('active', true),
    // Vendas de produto pagas no dia · entram no "Recebido" (exclui cortesia).
    // (Sem cutoff Palace — agendapro é multi-tenant, conta o dia inteiro.)
    sb
      .from('sales')
      .select('total, paid_at')
      .eq('business_id', businessId)
      .eq('type', 'product_sale')
      .eq('status', 'paid')
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('paid_at', startOfDayBR(date))
      .lt('paid_at', startOfDayBR(addDaysBR(date, 1))),
    // Atendimentos PAGOS no dia (por paid_at · não por appointment_date) ·
    // pro "Recebido" refletir o dinheiro que entrou HOJE, igual ao Fluxo de
    // Caixa. Serviço de ontem pago hoje entra no recebido de hoje. (Studio
    // Mood 09/06: trança de 08/06 paga em 09/06 estava sumindo do recebido.)
    sb
      .from('appointments')
      .select('total_price, professional_id')
      .eq('business_id', businessId)
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('paid_at', startOfDayBR(date))
      .lt('paid_at', startOfDayBR(addDaysBR(date, 1)))
      .not('paid_at', 'is', null),
    // Vendas de produto PENDENTES do dia · entram no "A receber" junto com os
    // serviços não pagos. Comanda aberta = serviço + produto a receber, por
    // inteiro (Eduardo 10/06). status=pending exclui pagas e canceladas.
    sb
      .from('sales')
      .select('total, professional_id')
      .eq('business_id', businessId)
      .eq('type', 'product_sale')
      .eq('status', 'pending')
      .eq('sale_date', date),
  ])

  // Grade só mostra QUEM ATENDE.
  // Filtros (defensivos, em ordem):
  //   - !is_receptionist     → recep não atende
  //   - does_appointments !== false → owner/manager puro com toggle OFF some
  //     (usa !== false em vez de === true pra não esconder registros antigos
  //      com null antes do backfill da v79)
  const profs = (profsData ?? [])
    .filter((p) => !p.is_receptionist)
    .filter((p) => p.does_appointments !== false)
    // Aba "Eu" do dono: só a coluna dele
    .filter((p) => !onlyProfessionalId || p.id === onlyProfessionalId)
    .map((p) => ({
      id: p.id,
      name: p.name,
      photo_url: p.photo_url ?? null,
    }))
  // Quando filtrado pra um profissional (aba "Eu"), contagem/KPIs/grade
  // refletem só os appts dele.
  const apptsBase = ((apptsData ?? []) as ApptRow[])
    .filter((a) => !onlyProfessionalId || a.professional_id === onlyProfessionalId)
  // Resgates de pacote · marca os atendimentos que consumiram uma sessão pra a
  // grade mostrar selo/cor (o valor não entra no caixa · já foi pago na venda).
  const apptIds = apptsBase.map((a) => a.id)
  const { data: pkgSessions } = apptIds.length
    ? await sb.from('customer_package_sessions').select('appointment_id').in('appointment_id', apptIds)
    : { data: [] as { appointment_id: string | null }[] }
  const pkgSet = new Set((pkgSessions ?? []).map((s) => s.appointment_id).filter(Boolean) as string[])
  const appts = apptsBase.map((a) => ({ ...a, is_package: pkgSet.has(a.id) }))
  const services = (servicesData ?? []) as { id: string; name: string; price: number | null; duration_minutes: number | null }[]
  const blocks = (blocksData ?? []) as BlockRow[]

  // KPIs do dia · só renderizam quando date === HOJE (header gateia internamente)
  // Recebido = dinheiro que ENTROU no dia (por data de pagamento), igual ao
  // Fluxo de Caixa. Conta atendimentos pagos hoje (apptsPaidDay · por paid_at,
  // não por appointment_date) + vendas pagas hoje. Cortesia/crédito já
  // excluídos na query. Respeita o filtro da aba "Eu" (onlyProfessionalId).
  const recebidoApptsHoje = ((apptsPaidDay ?? []) as { total_price: number | null; professional_id: string | null }[])
    .filter((a) => !onlyProfessionalId || a.professional_id === onlyProfessionalId)
    .reduce((s, a) => s + (Number(a.total_price) || 0), 0)
  const recebidoSalesHoje = (salesPaidDay ?? []).reduce((s, p) => s + Number(p.total ?? 0), 0)
  const recebidoHoje = recebidoApptsHoje + recebidoSalesHoje
  // A receber = serviços não pagos do dia + produtos pendentes do dia (comanda
  // aberta conta serviço E produto · Eduardo 10/06). Serviço e produto são linhas
  // distintas, sem risco de dupla contagem.
  const aReceberApptsHoje = appts
    .filter((a) => !a.paid_at && (a.status === 'confirmed' || a.status === 'completed') && (a.total_price ?? 0) > 0)
    .reduce((s, a) => s + (Number(a.total_price) || 0), 0)
  const aReceberSalesHoje = ((salesPendingDay ?? []) as { total: number | null; professional_id: string | null }[])
    .filter((p) => !onlyProfessionalId || p.professional_id === onlyProfessionalId)
    .reduce((s, p) => s + Number(p.total ?? 0), 0)
  const aReceberHoje = aReceberApptsHoje + aReceberSalesHoje
  const pendentesHoje = appts.filter((a) => a.status === 'pending').length

  return (
    <div className="grade-timeline">
      <GradeTimelineHeader
        date={date}
        totalAppts={appts.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show').length}
        recebidoHoje={recebidoHoje}
        aReceberHoje={aReceberHoje}
        pendentesHoje={pendentesHoje}
        hideKpis={true /* 28/05: KPIs migraram pra dentro da tabela */}
      />

      <TimelineGridInteractive
        businessId={businessId}
        profs={profs}
        appts={appts}
        blocks={blocks}
        services={services}
        hourStart={HOUR_START}
        hourEnd={HOUR_END}
        date={date}
        recebidoHoje={recebidoHoje}
        aReceberHoje={aReceberHoje}
        pendentesHoje={pendentesHoje}
        hideKpis={hideKpis}
      />
    </div>
  )
}
