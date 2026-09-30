import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import CaixaView from '@/components/recepcao/CaixaView'
import { IconWallet } from '@/components/ui/Icon'
import { getApptDiscountMap } from '@/lib/commission-discount'
import { getSalePaymentSplitMap, getApptPaymentSplitMap, type PaymentShare } from '@/lib/queries/appointment-payment-split'
import { sinalPorAtendimento, sinaisRecebidos } from '@/lib/sinal-da-comanda'
import { vendasPacoteCartao } from '@/lib/queries/vendas-pacote-cartao'
import { todayBR, startOfDayBR } from '@/lib/date-br'

export const dynamic = 'force-dynamic'

type AppointmentForCash = {
  id: string
  total_price: number | null
  paid_at: string | null
  payment_method: string | null
  payment_card_type: string | null
  payment_fee_percent: number | null
  client_name: string
  discount_cents?: number
  /* v146 · como o valor se divide entre Pix/dinheiro/cartão. Vazio = pagamento
     direto, e aí vale o payment_method do próprio atendimento. */
  payment_split?: PaymentShare[]
}

type ClosingRow = {
  id: string
  closing_date: string
  closed_at: string
  total_gross_cents: number
  total_net_cents: number
  cash_diff_cents: number | null
}

export default async function RecepcaoCaixaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/profissional/login')

  const { data: recep } = await supabase
    .from('professionals')
    .select('id, name, business:businesses(id, name)')
    .eq('auth_user_id', user.id)
    .eq('is_receptionist', true)
    .single()

  if (!recep || !recep.business) redirect('/profissional/login')

  const business = recep.business as unknown as { id: string; name: string }

  // Dia do caixa em fuso de Brasília (não UTC) · evita virar o dia após 21h
  const today = todayBR()
  const tomorrow = new Date(today + 'T12:00:00')
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowISO = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`

  // Agendamentos pagos HOJE
  const { data: paidToday } = await supabase
    .from('appointments')
    .select('id, total_price, paid_at, payment_method, payment_card_type, payment_fee_percent, client_name, invoice_item_id')
    .eq('business_id', business.id)
    .not('paid_at', 'is', null)
    // Decisão 29/09: cortesia, pontos e crédito não são dinheiro na gaveta
    .not('payment_method', 'in', '(courtesy,credit,points)')
    .gte('paid_at', startOfDayBR(today))
    .lt('paid_at', startOfDayBR(tomorrowISO))

  // Caixa soma o LÍQUIDO (− desconto rateado da comanda). Desconto vive em
  // invoices → service-role (recep não lê invoice por RLS).
  const sbAdmin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const apptDisc = await getApptDiscountMap(sbAdmin, (paidToday ?? []).map((a) => a.invoice_item_id))
  /* Auditoria da comanda (29/09): a recepção usava `charged_total` = o total
     da COMANDA INTEIRA em cada atendimento. Comanda com 2 atendimentos +
     produto contava tudo 2x (R$460 onde entraram R$230), e venda de produto
     avulsa nem aparecia. Agora é a mesma conta do Caixa da dona: atendimento
     pelo líquido + venda de produto pelo valor dela (sales.total), cada coisa
     uma vez. */
  const apptSplit = await getApptPaymentSplitMap(sbAdmin, (paidToday ?? []).map((a) => a.id as string))
  // Sinal (decisão 29/09): sai do atendimento no dia em que ele é pago e
  // entra como linha própria no dia em que caiu (sinaisHoje, abaixo).
  const sinalAppt = await sinalPorAtendimento(sbAdmin, (paidToday ?? []).map((a) => a.id as string))
  const apptsHoje: AppointmentForCash[] = (paidToday ?? []).map((a) => ({
    ...a,
    total_price: Math.max(0, Number(a.total_price ?? 0) - (sinalAppt[a.id as string] ?? 0)),
    discount_cents: Math.round((apptDisc[a.id as string] ?? 0) * 100),
    payment_split: apptSplit[a.id as string],
  }))
  const { data: vendasHoje } = await sbAdmin
    .from('sales')
    .select('id, total, paid_at, payment_method, payment_card_type, payment_fee_percent, client_name, invoice_id')
    .eq('business_id', business.id)
    .eq('type', 'product_sale')
    .eq('status', 'paid')
    .not('payment_method', 'in', '(courtesy,credit,points)')
    .not('paid_at', 'is', null)
    .gte('paid_at', startOfDayBR(today))
    .lt('paid_at', startOfDayBR(tomorrowISO))
  // Produto em comanda paga dividida reparte entre os métodos (auditoria 29/09)
  const saleSplit = await getSalePaymentSplitMap(sbAdmin, (vendasHoje ?? []).map((x) => ({ id: x.id as string, invoice_id: (x.invoice_id as string | null) ?? null })))
  const salesHoje: AppointmentForCash[] = (vendasHoje ?? []).map((v) => ({
    id: v.id as string,
    total_price: Number(v.total ?? 0),
    paid_at: v.paid_at as string | null,
    payment_method: v.payment_method as string | null,
    payment_card_type: (v.payment_card_type as string | null) ?? null,
    payment_fee_percent: (v.payment_fee_percent as number | null) ?? null,
    client_name: (v.client_name as string | null) ?? 'Venda de produto',
    payment_split: saleSplit[v.id as string],
  }))
  const sinaisDoDia = await sinaisRecebidos(sbAdmin, business.id, startOfDayBR(today), startOfDayBR(tomorrowISO))
  const sinaisHoje: AppointmentForCash[] = sinaisDoDia.map((x) => ({
    id: `sinal-${x.id}`,
    total_price: x.valor,
    paid_at: x.paid_at,
    payment_method: 'pix',
    payment_card_type: null,
    payment_fee_percent: null,
    client_name: `Sinal · ${x.client_name}`,
  }))
  // Venda de pacote / cartão presente paga hoje (só comanda + pagamento)
  const pacotesHoje: AppointmentForCash[] = (await vendasPacoteCartao(sbAdmin, business.id, startOfDayBR(today), startOfDayBR(tomorrowISO))).map((v) => ({
    id: v.id,
    total_price: v.valor,
    paid_at: v.paid_at,
    payment_method: v.payment_method,
    payment_card_type: null,
    payment_fee_percent: null,
    client_name: v.descricao,
    payment_split: v.payment_split,
  }))
  const todayAppts: AppointmentForCash[] = [...apptsHoje, ...salesHoje, ...sinaisHoje, ...pacotesHoje]

  // Resumo do dia · atendimentos no dia + a receber (contexto antes de fechar)
  const { data: allTodayAppts } = await supabase
    .from('appointments')
    .select('id, total_price, paid_at, status')
    .eq('business_id', business.id)
    .eq('appointment_date', today)
    .not('status', 'in', '(cancelled,no_show)')

  const todayCount = (allTodayAppts ?? []).length
  // "A receber" = valor de cada atendimento ainda não pago (mesma conta do
  // Caixa da dona). O valor da comanda inteira por atendimento duplicava
  // quando a comanda tinha 2+ atendimentos.
  const pendingValueCents = (allTodayAppts ?? []).filter((a) => !a.paid_at)
    .reduce((s, a) => s + Math.round((Number(a.total_price) || 0) * 100), 0)
  const pendingCount = (allTodayAppts ?? []).filter((a) => !a.paid_at).length

  // Recepção só vê dado DIÁRIO · não recebe histórico de fechamentos
  const { data: closingToday } = await supabase
    .from('cash_closings')
    .select('id')
    .eq('business_id', business.id)
    .eq('closing_date', today)
    .maybeSingle()

  // Abertura de caixa de hoje (fundo de troco) · null se ainda não abriu
  const { data: openingToday } = await supabase
    .from('cash_openings')
    .select('opening_amount_cents, opened_at')
    .eq('business_id', business.id)
    .eq('opening_date', today)
    .maybeSingle()

  // Movimentos do dia (sangria/suprimento) · ajustam o esperado na gaveta
  const { data: movementsToday } = await supabase
    .from('cash_movements')
    .select('id, type, amount_cents, reason, created_at')
    .eq('business_id', business.id)
    .eq('movement_date', today)
    .order('created_at', { ascending: false })

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <header className="relative max-w-lg md:max-w-7xl mx-auto px-4 md:px-6 pt-7 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-faded)' }}>
          {business.name}
        </p>
        <h1 className="text-[26px] font-bold tracking-tight leading-tight inline-flex items-center gap-2" style={{ color: 'var(--admin-text)' }}>
          <IconWallet size={22} /> Caixa
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--admin-text-mute)' }}>
          Abertura (fundo de troco) + resumo do dia + fechamento
        </p>
      </header>

      <CaixaView
        businessId={business.id}
        professionalId={recep.id as string}
        recepName={(recep.name as string) || 'Recepção'}
        todayAppts={todayAppts}
        closings={[] as ClosingRow[]}
        alreadyClosedToday={!!closingToday}
        todayCount={todayCount}
        pendingCount={pendingCount}
        pendingValueCents={pendingValueCents}
        isReceptionist
        opening={(openingToday ?? null) as { opening_amount_cents: number; opened_at: string } | null}
        movements={(movementsToday ?? []) as { id: string; type: 'sangria' | 'suprimento'; amount_cents: number; reason: string | null; created_at: string }[]}
      />
    </main>
  )
}
