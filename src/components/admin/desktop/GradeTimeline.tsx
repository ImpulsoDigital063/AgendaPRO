import { createClient as createServiceClient } from '@supabase/supabase-js'
import { startOfDayBR, addDaysBR } from '@/lib/date-br'
import GradeTimelineHeader from './GradeTimelineHeader'
import TimelineGridInteractive from './TimelineGridInteractive'
import { blockAppliesTo, type BlockRow } from '@/lib/blocks'

type Props = {
  businessId: string
  date: string
  /** Esconde mini-KPIs do header (Recebido/A receber/Pendentes). Útil quando
   *  o componente é embedado em página que já tem KPIs (ex: Início, Eu) */
  hideKpis?: boolean
  /** Quando setado, mostra só a coluna desse profissional (ex: aba "Eu" do
   *  dono que atende). Default: todos os profs ativos do negócio. */
  onlyProfessionalId?: string
  /** v98b · esconde colunas específicas. Usado no painel da profissional, que
   *  não mostra a coluna da dona quando ela só administra (Realli 30/07).
   *  Default: não esconde ninguém — admin, recepção e Palace seguem iguais. */
  excludeProfessionalIds?: string[]
  /** v98d · esconde Vender produto / Resgatar pacote / Registrar venda do header.
   *  A profissional não opera caixa. Default false = admin e recepção iguais. */
  hideCaixaActions?: boolean
  /** v145 · false = grade só de leitura: sem botão Agendar e sem abrir modal
   *  no slot. Pra profissional que pode VER a agenda mas não marcar. */
  podeAgendar?: boolean
  /** v98e · essa coluna vem PRIMEIRO (as outras seguem alfabéticas) e ganha o
   *  selo "(você)" no nome. No painel da profissional é a agenda dela — abre o
   *  app e a própria coluna já está na frente, sem rolar a sanfona no celular.
   *  Default undefined = ordem alfabética normal (admin, recepção, Palace). */
  firstProfessionalId?: string
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
  combo_package_id?: string | null
  combo_name?: string | null
}

// Janela padrão quando o negócio não tem horário cadastrado nem nada marcado no
// dia. Antes a grade era FIXA em 7h-22h e as primeiras linhas ficavam sempre
// vazias — Eduardo 30/07: "começa às 7, mas os horários são das 8 em diante,
// então remove esse horário [...] fica só tomando espaço". Agora 7h só aparece
// se existir trabalho às 7h.
const HORA_PADRAO_INICIO = 8
const HORA_PADRAO_FIM = 20

/** HH:MM[:SS] → minutos. */
function hhmmParaMin(t: string | null | undefined): number | null {
  if (!t) return null
  const [h, m] = String(t).slice(0, 5).split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

export default async function GradeTimeline({ businessId, date, hideKpis = false, onlyProfessionalId, excludeProfessionalIds, hideCaixaActions = false, podeAgendar = true, firstProfessionalId }: Props) {
  const excluded = new Set(excludeProfessionalIds ?? [])
  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // v98o · quando os KPIs estão escondidos (painel da profissional), as 3
  // queries que só alimentam Recebido/A receber/Pendentes não rodam. Eram 3
  // idas ao banco por carregamento pra calcular número que ninguém vê —
  // Eduardo reportou lentidão em 30/07 e era isso somado ao resto.
  const vazio = Promise.resolve({ data: [] as never[] })
  const [{ data: profsData }, { data: apptsData }, { data: servicesData }, { data: blocksData }, { data: salesPaidDay }, { data: apptsPaidDay }, { data: salesPendingDay }, { data: bizFlags }] = await Promise.all([
    sb
      .from('professionals')
      .select('id, name, photo_url, is_receptionist, does_appointments')
      .eq('business_id', businessId)
      .eq('active', true)
      .order('name'),
    sb
      .from('appointments')
      .select('id, professional_id, start_time, end_time, status, client_name, service_name, total_price, paid_at, payment_method, combo_package_id, company_id, company:companies(name)')
      .eq('business_id', businessId)
      .eq('appointment_date', date)
      // Cancelados aparecem visualmente diferentes (faixa diagonal/desbotado · vide TimelineGridInteractive)
      // pra preservar contexto histórico do slot (Salão99 pattern).
      .order('start_time'),
    sb
      .from('services')
      .select('id, name, price, duration_minutes, convenio_price')
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
    hideKpis ? vazio : sb
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
    hideKpis ? vazio : sb
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
    hideKpis ? vazio : sb
      .from('sales')
      .select('total, professional_id')
      .eq('business_id', businessId)
      .eq('type', 'product_sale')
      .eq('status', 'pending')
      .eq('sale_date', date),
    /* Negócio que aceita dois atendimentos no mesmo horário (CAF) precisa que
       a grade deixe uma faixa clicável ao lado do card — senão o horário fica
       coberto e não tem por onde abrir o segundo agendamento. */
    sb.from('businesses').select('agendamento_simultaneo, vendas_balcao_enabled').eq('id', businessId).maybeSingle(),
  ])

  /* Grade só mostra QUEM ATENDE — e quem responde isso é does_appointments,
     não is_receptionist. v144 · antes o filtro tirava toda recepção, e quem
     acumula balcão e atendimento (Josi) sumia da própria grade: ninguém
     conseguia marcar cliente pra ela, nem ela mesma.
     `!== false` em vez de `=== true` pra não esconder registro antigo com null
     (antes do backfill da v79). */
  const profs = (profsData ?? [])
    .filter((p) => p.does_appointments !== false)
    // Aba "Eu" do dono: só a coluna dele
    .filter((p) => !onlyProfessionalId || p.id === onlyProfessionalId)
    // v98b · colunas escondidas (painel da profissional não vê a da dona)
    .filter((p) => !excluded.has(p.id))
    .map((p) => ({
      id: p.id,
      // v98e · "(você)" só quando alguém pediu destaque de coluna (painel da
      // profissional). Admin e recepção não passam a prop → nome cru.
      name: p.id === firstProfessionalId ? `${p.name} (você)` : p.name,
      photo_url: p.photo_url ?? null,
    }))
    // v98e · a coluna em destaque vem primeiro · as outras seguem alfabéticas
    // (a query já ordenou por name, e sort estável do JS preserva isso)
    .sort((a, b) => {
      if (!firstProfessionalId) return 0
      if (a.id === firstProfessionalId) return -1
      if (b.id === firstProfessionalId) return 1
      return 0
    })
  // Quando filtrado pra um profissional (aba "Eu"), contagem/KPIs/grade
  // refletem só os appts dele.
  const apptsBase = ((apptsData ?? []) as ApptRow[])
    .filter((a) => !onlyProfessionalId || a.professional_id === onlyProfessionalId)
    .filter((a) => !excluded.has(a.professional_id))
  // Resgates de pacote · marca os atendimentos que consumiram uma sessão pra a
  // grade mostrar selo/cor (o valor não entra no caixa · já foi pago na venda).
  const apptIds = apptsBase.map((a) => a.id)
  const { data: pkgSessions } = apptIds.length
    ? await sb.from('customer_package_sessions').select('appointment_id').in('appointment_id', apptIds)
    : { data: [] as { appointment_id: string | null }[] }
  const pkgSet = new Set((pkgSessions ?? []).map((s) => s.appointment_id).filter(Boolean) as string[])
  // Combos · nome do combo de origem (pro selo "COMBO · nome" no card).
  const comboIds = Array.from(new Set(apptsBase.map((a) => a.combo_package_id).filter(Boolean) as string[]))
  const { data: comboPkgs } = comboIds.length
    ? await sb.from('packages').select('id, name').in('id', comboIds)
    : { data: [] as { id: string; name: string }[] }
  const comboNameById = Object.fromEntries((comboPkgs ?? []).map((p) => [p.id, p.name]))
  const appts = apptsBase.map((a) => ({
    ...a,
    is_package: pkgSet.has(a.id),
    combo_name: a.combo_package_id ? (comboNameById[a.combo_package_id] ?? null) : null,
  }))
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

  // ─── Janela da grade · derivada do que EXISTE naquele dia ────────────────
  // Fontes, nesta ordem de verdade:
  //   1. working_hours das profissionais visíveis (o horário real de trabalho)
  //   2. atendimentos do dia (alguém pode ter sido encaixado fora da janela)
  //   3. bloqueios que valem nessa data
  // Sem nenhuma delas, cai no padrão 8h-20h.
  const dow = new Date(date + 'T12:00:00Z').getUTCDay()
  const profIdsVisiveis = profs.map((p) => p.id)
  const { data: horariosData } = profIdsVisiveis.length
    ? await sb
        .from('working_hours')
        .select('professional_id, day_of_week, start_time, end_time')
        .in('professional_id', profIdsVisiveis)
        .eq('day_of_week', dow)
    : { data: [] as { start_time: string; end_time: string }[] }

  const inicios: number[] = []
  const fins: number[] = []
  for (const h of horariosData ?? []) {
    const s = hhmmParaMin(h.start_time)
    const e = hhmmParaMin(h.end_time)
    if (s != null) inicios.push(s)
    if (e != null) fins.push(e)
  }
  for (const a of appts) {
    const s = hhmmParaMin(a.start_time)
    const e = hhmmParaMin(a.end_time)
    if (s != null) inicios.push(s)
    if (e != null) fins.push(e)
  }
  for (const b of blocks) {
    if (!blockAppliesTo(b, b.professional_id ?? profIdsVisiveis[0] ?? '', date)) continue
    const s = hhmmParaMin(String(b.start_time))
    const e = hhmmParaMin(String(b.end_time))
    // Folga de dia inteiro (00:00-23:59) esticaria a grade pra 24h — ignora
    if (s != null && e != null && !(s === 0 && e >= 1439)) {
      inicios.push(s)
      fins.push(e)
    }
  }

  const hourStart = inicios.length ? Math.max(0, Math.floor(Math.min(...inicios) / 60)) : HORA_PADRAO_INICIO
  const hourEndBruto = fins.length ? Math.min(24, Math.ceil(Math.max(...fins) / 60)) : HORA_PADRAO_FIM
  // Garante pelo menos 4h de grade (dia com 1 atendimento de 30min não vira
  // uma tira de uma linha só)
  const hourEnd = Math.min(24, Math.max(hourEndBruto, hourStart + 4))

  return (
    <div className="grade-timeline">
      <GradeTimelineHeader
        date={date}
        totalAppts={appts.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show').length}
        recebidoHoje={recebidoHoje}
        aReceberHoje={aReceberHoje}
        pendentesHoje={pendentesHoje}
        hideKpis={true /* 28/05: KPIs migraram pra dentro da tabela */}
        hideCaixaActions={hideCaixaActions}
        podeAgendar={podeAgendar}
        vendasBalcao={bizFlags?.vendas_balcao_enabled !== false}
      />

      <TimelineGridInteractive
        podeAgendar={podeAgendar}
        businessId={businessId}
        profs={profs}
        appts={appts}
        blocks={blocks}
        services={services}
        hourStart={hourStart}
        hourEnd={hourEnd}
        date={date}
        recebidoHoje={recebidoHoje}
        aReceberHoje={aReceberHoje}
        pendentesHoje={pendentesHoje}
        hideKpis={hideKpis}
        permiteSimultaneo={bizFlags?.agendamento_simultaneo === true}
      />
    </div>
  )
}
