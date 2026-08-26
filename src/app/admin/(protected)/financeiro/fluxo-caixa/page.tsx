import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
import { redirect } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getCurrentUser, getCurrentBusiness } from '@/lib/admin-data'
import SubPageHeader from '@/components/admin/SubPageHeader'
import FluxoCaixaTable, { type CashMonth, type MonthCol } from '@/components/admin/financeiro/FluxoCaixaTable'
import FluxoCaixaViewSelector from '@/components/admin/financeiro/FluxoCaixaViewSelector'
import ProjecaoFluxo, { type LinhaProjecao, type SemanaProjecao } from '@/components/admin/financeiro/ProjecaoFluxo'
import { todayBR, addDaysBR, addMonthsBR, monthBoundsBR } from '@/lib/date-br'

// Source of truth do breakdown:
// - invoice_payments cobre split + comanda (cada linha = 1 método com amount próprio)
// - appointments DIRETOS (invoice_item_id IS NULL) cobrem pagamento direto da timeline
// - sales DIRETAS (invoice_id IS NULL) cobrem venda avulsa de produto
// Antes a query usava só appointments.payment_method, que perdia o cartão em split
// (a rota /invoices/[id]/pay propaga só o MAIOR método pro appointment).

// Cartão SEMPRE vira credit_card ou debit_card (Salão99 pattern · nunca "Cartão" genérico)
// quando card_type vier null, default = credit_card (caso mais comum).
const METHOD_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  transfer: 'Transferência Bancária',
  other: 'Outro',
}

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Aluguel',
  products: 'Produtos',
  salary: 'Salários',
  utilities: 'Contas (água · luz · internet)',
  marketing: 'Marketing',
  taxes: 'Impostos',
  other: 'Outros',
  payment_fee: 'Taxa de Maquininha',
}

type ViewKind = 'daily' | 'weekly' | 'monthly' | 'yearly'

function isViewKind(v: string | undefined | null): v is ViewKind {
  return v === 'daily' || v === 'weekly' || v === 'monthly' || v === 'yearly'
}

// Salão99 pattern: sempre 4 colunas em qualquer visão (Diário/Semanal/Mensal/Anual)
const COL_COUNT = 4

function buildColumns(view: ViewKind, now: Date): MonthCol[] {
  const cols: MonthCol[] = []
  if (view === 'daily') {
    for (let i = COL_COUNT - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const dateLabel = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      cols.push({
        year: d.getFullYear(),
        month0: d.getMonth(),
        label: dateLabel,
        key: `d:${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
      })
    }
    return cols
  }
  if (view === 'weekly') {
    const monday = new Date(now)
    const day = monday.getDay()
    const diff = day === 0 ? -6 : 1 - day
    monday.setDate(monday.getDate() + diff)
    monday.setHours(0, 0, 0, 0)
    for (let i = COL_COUNT - 1; i >= 0; i--) {
      const start = new Date(monday)
      start.setDate(start.getDate() - i * 7)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      const label = `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}–${String(end.getDate()).padStart(2, '0')}/${String(end.getMonth() + 1).padStart(2, '0')}`
      cols.push({
        year: start.getFullYear(),
        month0: start.getMonth(),
        label,
        key: `w:${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`,
      })
    }
    return cols
  }
  if (view === 'yearly') {
    for (let i = COL_COUNT - 1; i >= 0; i--) {
      const y = now.getFullYear() - i
      cols.push({ year: y, month0: 0, label: String(y), key: `y:${y}` })
    }
    return cols
  }
  // monthly
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  for (let i = COL_COUNT - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    cols.push({
      year: d.getFullYear(),
      month0: d.getMonth(),
      label: `${months[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
      key: `m:${d.getFullYear()}-${d.getMonth()}`,
    })
  }
  return cols
}

function buildRange(view: ViewKind, cols: MonthCol[], now: Date): { from: Date; to: Date } {
  // λ.fuso: limites em MEIA-NOITE BR (03:00 UTC = 00:00 −03:00). range.from é a
  // fronteira acumulado/período (as queries prior usam .lt paid_at range.from) →
  // tem que ser EXATA em BR · não pode alargar senão pagamento some do saldo.
  const brMid = (y: number, m0: number, d: number) => new Date(Date.UTC(y, m0, d, 3, 0, 0))
  if (view === 'daily') {
    const first = brMid(cols[0].year, cols[0].month0, parseInt(cols[0].key.split('-')[2]!, 10))
    const to = brMid(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    return { from: first, to }
  }
  if (view === 'weekly') {
    const firstParts = cols[0].key.split(':')[1]!.split('-').map(Number)
    const first = brMid(firstParts[0], firstParts[1], firstParts[2])
    const to = brMid(cols[cols.length - 1].year, cols[cols.length - 1].month0, parseInt(cols[cols.length - 1].key.split('-')[2]!, 10) + 7)
    return { from: first, to }
  }
  if (view === 'yearly') {
    const from = brMid(cols[0].year, 0, 1)
    const to = brMid(cols[cols.length - 1].year + 1, 0, 1)
    return { from, to }
  }
  // monthly
  const from = brMid(cols[0].year, cols[0].month0, 1)
  const to = brMid(cols[cols.length - 1].year, cols[cols.length - 1].month0 + 1, 1)
  return { from, to }
}

// λ.fuso: converte um instante (timestamptz · paid_at/closed_at) pra a "data BR"
// deslocando −3h · assim os getters do keyForDate (UTC no Vercel) devolvem o
// dia/mês/ano de Brasília, batendo com as colunas (também em BR via `now` −3h).
// NÃO usar em occurred_at (coluna DATE · sem hora · deslocar tiraria um dia).
const emBR = (iso: string) => new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000)

function keyForDate(view: ViewKind, d: Date, cols: MonthCol[]): string | null {
  if (view === 'daily') return `d:${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  if (view === 'monthly') return `m:${d.getFullYear()}-${d.getMonth()}`
  if (view === 'yearly') return `y:${d.getFullYear()}`
  for (const c of cols) {
    const parts = c.key.split(':')[1]!.split('-').map(Number)
    const start = new Date(parts[0], parts[1], parts[2])
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    if (d >= start && d < end) return c.key
  }
  return null
}

function resolveMethodKey(raw: string | null, cardType: string | null): string {
  const method = raw ?? 'other'
  // 'card' SEMPRE vira credit_card ou debit_card · nunca "Cartão" genérico.
  // Default credit_card quando card_type vier null (caso mais comum + cobre legado/sales).
  if (method === 'card') {
    return cardType === 'debit' ? 'debit_card' : 'credit_card'
  }
  return method
}

export default async function FluxoCaixaPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; pm?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  const business = await getCurrentBusiness(user.id)
  if (!business) redirect(await destinoSemNegocio())

  const sp = await searchParams
  const view: ViewKind = isViewKind(sp.view) ? sp.view : 'monthly'

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // λ.fuso: instante deslocado −3h → getDate()/getMonth() (UTC no Vercel) dão a
  // data BR · buildColumns/buildRange e o bucketing (emBR) ficam todos em BR.
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const cols = buildColumns(view, now)
  const range = buildRange(view, cols, now)
  const startOfPeriod = range.from.toISOString()
  const fullRangeFromDate = range.from.toISOString().slice(0, 10)
  const fullRangeToDate = range.to.toISOString().slice(0, 10)

  const [
    { data: invPayments },
    { data: apptsDirect },
    { data: salesDirect },
    { data: expensesData },
    // priors (totais só · pra saldo inicial)
    { data: priorInvPay },
    { data: priorApptsDirect },
    { data: priorSalesDirect },
    { data: priorExpenses },
  ] = await Promise.all([
    sb
      .from('invoice_payments')
      .select('payment_method, card_type, amount, fee_percent, paid_at, invoices!inner(business_id)')
      .eq('invoices.business_id', business.id)
      .gte('paid_at', range.from.toISOString())
      .lt('paid_at', range.to.toISOString()),
    sb
      .from('appointments')
      .select('paid_at, total_price, payment_method, payment_card_type, payment_fee_percent')
      .eq('business_id', business.id)
      .is('invoice_item_id', null)
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('paid_at', range.from.toISOString())
      .lt('paid_at', range.to.toISOString())
      .not('paid_at', 'is', null),
    sb
      .from('sales')
      .select('paid_at, total, payment_method, payment_card_type, payment_fee_percent')
      .eq('business_id', business.id)
      .eq('type', 'product_sale')
      .eq('status', 'paid')
      .is('invoice_id', null)
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('paid_at', range.from.toISOString())
      .lt('paid_at', range.to.toISOString())
      .not('paid_at', 'is', null),
    sb
      .from('expenses')
      .select('occurred_at, amount, category')
      .eq('business_id', business.id)
      // v104 · fluxo REALIZADO conta só o que saiu. Conta programada aparece
      // na projeção (Parte 2), nunca somada ao realizado.
      .eq('status', 'paid')
      .gte('occurred_at', fullRangeFromDate)
      .lt('occurred_at', fullRangeToDate),
    // priors
    sb
      .from('invoice_payments')
      .select('amount, payment_method, invoices!inner(business_id)')
      .eq('invoices.business_id', business.id)
      .lt('paid_at', startOfPeriod),
    sb
      .from('appointments')
      .select('total_price')
      .eq('business_id', business.id)
      .is('invoice_item_id', null)
      .not('payment_method', 'in', '(courtesy,credit)')
      .lt('paid_at', startOfPeriod)
      .not('paid_at', 'is', null),
    sb
      .from('sales')
      .select('total')
      .eq('business_id', business.id)
      .eq('type', 'product_sale')
      .eq('status', 'paid')
      .is('invoice_id', null)
      .not('payment_method', 'in', '(courtesy,credit)')
      .lt('paid_at', startOfPeriod)
      .not('paid_at', 'is', null),
    sb
      .from('expenses')
      .select('amount')
      .eq('business_id', business.id)
      .eq('status', 'paid')
      .lt('occurred_at', fullRangeFromDate),
  ])

  // Prior receitas: invoice_payments (exclui courtesy/credit) + appointments diretos + sales diretas
  const priorInvReceita = (priorInvPay ?? [])
    .filter((p) => {
      const m = (p.payment_method as string | null) ?? 'other'
      return m !== 'courtesy' && m !== 'credit'
    })
    .reduce((s, p) => s + Number(p.amount ?? 0), 0)
  const priorApptReceita = (priorApptsDirect ?? []).reduce((s, a) => s + Number(a.total_price ?? 0), 0)
  const priorSalesReceita = (priorSalesDirect ?? []).reduce((s, p) => s + Number(p.total ?? 0), 0)
  const priorReceitas = priorInvReceita + priorApptReceita + priorSalesReceita
  const priorDespesas = (priorExpenses ?? []).reduce((s, e) => s + Number(e.amount ?? 0), 0)
  const saldoAcumulado = priorReceitas - priorDespesas

  const data: Record<string, CashMonth> = {}
  for (const c of cols) {
    data[c.key] = {
      saldoInicial: 0,
      receitasByMethod: {},
      receitasTotal: 0,
      despesasByCategory: {},
      despesasTotal: 0,
      resultado: 0,
      saldoFinal: 0,
      descontosTotal: 0,
    }
  }

  // 1. Invoice payments (split + comanda · source of truth pra breakdown)
  for (const p of invPayments ?? []) {
    if (!p.paid_at) continue
    const raw = (p.payment_method as string | null) ?? 'other'
    if (raw === 'courtesy' || raw === 'credit') continue // não é receita real
    const d = emBR(p.paid_at as string)
    const key = keyForDate(view, d, cols)
    if (!key || !data[key]) continue
    const methodKey = resolveMethodKey(raw, p.card_type as string | null)
    const amt = Number(p.amount ?? 0)
    data[key].receitasByMethod[methodKey] = (data[key].receitasByMethod[methodKey] ?? 0) + amt
    data[key].receitasTotal += amt
    // Taxa de maquininha · fee_percent direto do pagamento
    if (raw === 'card') {
      const fee = Number(p.fee_percent ?? 0)
      if (fee > 0) {
        const feeAmt = (amt * fee) / 100
        data[key].despesasByCategory.payment_fee = (data[key].despesasByCategory.payment_fee ?? 0) + feeAmt
        data[key].despesasTotal += feeAmt
      }
    }
  }

  // 2. Appointments DIRETOS (sem invoice · pago via PaymentMethodModal direto)
  for (const a of apptsDirect ?? []) {
    if (!a.paid_at) continue
    const d = emBR(a.paid_at as string)
    const key = keyForDate(view, d, cols)
    if (!key || !data[key]) continue
    const raw = (a.payment_method as string | null) ?? 'other'
    const methodKey = resolveMethodKey(raw, a.payment_card_type as string | null)
    const amt = Number(a.total_price ?? 0)
    data[key].receitasByMethod[methodKey] = (data[key].receitasByMethod[methodKey] ?? 0) + amt
    data[key].receitasTotal += amt
    if (raw === 'card') {
      const fee = Number(a.payment_fee_percent ?? 0)
      if (fee > 0) {
        const feeAmt = (amt * fee) / 100
        data[key].despesasByCategory.payment_fee = (data[key].despesasByCategory.payment_fee ?? 0) + feeAmt
        data[key].despesasTotal += feeAmt
      }
    }
  }

  // 3. Sales DIRETAS (sem invoice · venda avulsa de produto)
  for (const s of salesDirect ?? []) {
    if (!s.paid_at) continue
    const d = emBR(s.paid_at as string)
    const key = keyForDate(view, d, cols)
    if (!key || !data[key]) continue
    const raw = (s.payment_method as string | null) ?? 'other'
    const methodKey = resolveMethodKey(raw, s.payment_card_type as string | null)
    const amt = Number(s.total ?? 0)
    data[key].receitasByMethod[methodKey] = (data[key].receitasByMethod[methodKey] ?? 0) + amt
    data[key].receitasTotal += amt
    // Taxa de maquininha · desconta do líquido igual comanda/appointment (v87)
    if (raw === 'card') {
      const fee = Number(s.payment_fee_percent ?? 0)
      if (fee > 0) {
        const feeAmt = (amt * fee) / 100
        data[key].despesasByCategory.payment_fee = (data[key].despesasByCategory.payment_fee ?? 0) + feeAmt
        data[key].despesasTotal += feeAmt
      }
    }
  }

  for (const e of expensesData ?? []) {
    if (!e.occurred_at) continue
    const d = new Date(e.occurred_at + 'T00:00:00')
    const key = keyForDate(view, d, cols)
    if (!key || !data[key]) continue
    const cat = (e.category as string | null) ?? 'other'
    const amt = Number(e.amount ?? 0)
    data[key].despesasByCategory[cat] = (data[key].despesasByCategory[cat] ?? 0) + amt
    data[key].despesasTotal += amt
  }

  // Descontos concedidos (cupom + manual) · invoices fechadas no período.
  // INFORMATIVO: o desconto já está embutido na receita líquida (cliente pagou
  // o valor já abatido) · NÃO somar no resultado pra não contar 2x.
  const { data: invDiscounts } = await sb
    .from('invoices')
    .select('discount, closed_at')
    .eq('business_id', business.id)
    .eq('status', 'closed')
    .gt('discount', 0)
    .gte('closed_at', range.from.toISOString())
    .lt('closed_at', range.to.toISOString())
  for (const inv of invDiscounts ?? []) {
    if (!inv.closed_at) continue
    const d = emBR(inv.closed_at as string)
    const key = keyForDate(view, d, cols)
    if (!key || !data[key]) continue
    data[key].descontosTotal = (data[key].descontosTotal ?? 0) + Number(inv.discount ?? 0)
  }

  let acc = saldoAcumulado
  for (const c of cols) {
    const row = data[c.key]
    row.saldoInicial = acc
    row.resultado = row.receitasTotal - row.despesasTotal
    row.saldoFinal = row.saldoInicial + row.resultado
    acc = row.saldoFinal
  }

  /* ─── PROJEÇÃO (Parte 2 · pedido da Viva Cacheada 03/08) ──────────────
     Datas por date-br: contar dinheiro por dia com data de servidor joga
     tudo depois das 21h pro dia seguinte (Vercel em UTC). */
  const HOJE = todayBR()
  /* UM MÊS POR VEZ, com as SEMANAS dele (Eduardo, 04/08).
     ─────────────────────────────────────────────────────────────────
     Passou por três formatos até chegar aqui: janela móvel de 30 dias,
     4 semanas fechadas e 4 linhas de mês. O pedido final junta o melhor
     dos dois últimos — a semana responde "aguento pagar a conta do dia
     10?", e o seletor de mês responde "como eu fecho agosto?" sem
     empilhar quatro meses numa tela só.

     Mês vem da URL (?pm=YYYY-MM), não de estado no cliente: assim o botão
     voltar do celular funciona, a página segue renderizando no servidor e
     a dona pode deixar aberto num mês específico.

     O mês conta do DIA 1, não de hoje: só assim a projeção de agosto é
     comparável com a coluna AGO/26 da tabela acima. Não há dupla contagem
     com o realizado — lá entra o que foi PAGO, aqui só o que segue
     pendente. Boleto vencido dia 2 e não pago ainda vai sair em agosto. */
  const mesAtual = HOJE.slice(0, 7)
  const mesSel = /^\d{4}-\d{2}$/.test(sp.pm ?? '') ? (sp.pm as string) : mesAtual
  const boundsSel = monthBoundsBR(mesSel)
  const INICIO_MES = boundsSel.start
  const FIM_PROJECAO = boundsSel.end

  const linkMes = (ym: string) => {
    const p = new URLSearchParams()
    if (sp.view) p.set('view', sp.view)
    p.set('pm', ym)
    return '?' + p.toString()
  }
  const mesAnterior = addMonthsBR(mesSel + '-01', -1).slice(0, 7)
  const mesProximo = addMonthsBR(mesSel + '-01', 1).slice(0, 7)

  const [futurosRes, comandasAbertasRes, contasRes, mediaRes, futurosAbsolutosRes, convenioAbertoRes] = await Promise.all([
    /* Atendimento marcado e ainda não pago. NÃO filtra invoice_item_id
       (correção 04/08): a comanda aberta é só a forma como o valor está
       guardado — o compromisso continua sendo o atendimento, e é ele que
       tem DATA.

       Antes eu excluía quem estava em comanda e somava as comandas abertas
       à parte, sem data. Na conta da Viva Cacheada isso produzia a tela
       que o Eduardo estranhou: o tile dizia R$ 1.380 e todas as semanas
       diziam +R$ 0,00. Os quatro atendimentos que formavam esse valor
       tinham data (08/08, 08/08, 12/08 e 26/11) — só não passavam por
       aqui. E o de 26/11 entrava no total dos "próximos 30 dias" porque
       comanda aberta não passava pelo filtro de período. */
    sb
      .from('appointments')
      .select('appointment_date, client_name, service_name, total_price, invoice_item_id')
      .eq('business_id', business.id)
      .neq('status', 'cancelled')
      .is('paid_at', null)
      .gte('appointment_date', INICIO_MES)
      .lte('appointment_date', FIM_PROJECAO),
    /* Comanda aberta cujo atendimento já PASSOU: isso é cliente que
       atendeu e não pagou — cobrança, não previsão. Some do "vai entrar" e
       ganha bloco próprio. */
    sb
      .from('invoices')
      .select('id, total, created_at, invoice_items(id)')
      .eq('business_id', business.id)
      .eq('status', 'open')
      .gt('total', 0),
    sb
      .from('expenses')
      .select('due_date, occurred_at, name, amount')
      .eq('business_id', business.id)
      .eq('status', 'scheduled'),
    // Media real das ultimas 4 semanas. E o unico numero honesto de receita
    // futura que temos: a cliente marca com 1-2 dias de antecedencia
    // (mediana medida em toda a base), entao o agendado nao antecipa o mes.
    sb
      .from('appointments')
      .select('total_price')
      .eq('business_id', business.id)
      .not('paid_at', 'is', null)
      .gte('appointment_date', addDaysBR(todayBR(), -28))
      .lt('appointment_date', todayBR()),
    // Atendimento AINDA POR VIR, sem recorte de mes: serve so pra separar
    // "cliente devendo" de "vai acontecer". Independe do mes na tela.
    sb
      .from('appointments')
      .select('invoice_item_id')
      .eq('business_id', business.id)
      .neq('status', 'cancelled')
      .is('paid_at', null)
      .not('invoice_item_id', 'is', null)
      .gte('appointment_date', HOJE),
    /* Atendimento de CONVÊNIO em aberto (25/08/2026).
       A paciente do convênio não paga no balcão — quem paga é a empresa, no
       fechamento do mês. A comanda dela fica aberta de propósito, e sem este
       recorte ela caía em "clientes atendidas e não pagas": o Gustavo abriria o
       Fluxo de Caixa e leria como calote de paciente uma conta que está no
       prazo, com a empresa, e já contada em Convênios com o aviso de lá.
       Mesmo dinheiro cobrado em dois lugares com dois devedores diferentes. */
    sb
      .from('appointments')
      .select('invoice_item_id')
      .eq('business_id', business.id)
      .neq('status', 'cancelled')
      .is('paid_at', null)
      .not('company_id', 'is', null)
      .not('invoice_item_id', 'is', null),
  ])

  const futuros = futurosRes.data ?? []
  const mediaMensal = (mediaRes.data ?? []).reduce((s2, a) => s2 + Number(a.total_price ?? 0), 0)
  const contas = contasRes.data ?? []

  /* Comanda aberta de atendimento que JÁ PASSOU = cliente devendo. O
     atendimento futuro em comanda já foi contado acima (ele tem data), então
     aqui sobra só o atraso. Sem essa separação, dívida antiga aparecia como
     receita futura: a Viva Cacheada tem uma de 29/07 parada até hoje. */
  /* ⚠️ ABSOLUTO, não do mês selecionado (bug pego em 04/08 navegando pra
     setembro): "cliente devendo" é quem já foi atendida e não pagou — isso
     depende de HOJE, não do mês que a tela está mostrando. Amarrado ao mês
     selecionado, abrir setembro fazia as comandas de agosto virarem dívida:
     o bloco saltava de 2 clientes / R$ 380 pra 5 clientes / R$ 1.380 só por
     mudar de aba. Mesmo raciocínio vale pras contas vencidas logo abaixo. */
  const idsItensFuturos = new Set(
    (futurosAbsolutosRes.data ?? []).map((a) => a.invoice_item_id).filter(Boolean) as string[],
  )
  /* Itens de comanda que são de convênio · a empresa paga no fechamento do mês,
     então nunca são "cliente devendo". Ver a query convenioAbertoRes acima. */
  const idsItensConvenio = new Set(
    (convenioAbertoRes.data ?? []).map((a) => a.invoice_item_id).filter(Boolean) as string[],
  )
  const devendo = (comandasAbertasRes.data ?? [])
    .filter((inv) => {
      const itens = (inv.invoice_items ?? []) as { id: string }[]
      return !itens.some((it) => idsItensFuturos.has(it.id) || idsItensConvenio.has(it.id))
    })
    .map((inv) => ({ total: Number(inv.total ?? 0), desde: String(inv.created_at).slice(0, 10) }))
  const totalDevendo = devendo.reduce((s, d) => s + d.total, 0)

  const vencimento = (c: { due_date: string | null; occurred_at: string | null }) =>
    (c.due_date || c.occurred_at || '').slice(0, 10)

  const contasNoPeriodo = contas.filter((c) => {
    const d = vencimento(c)
    return d >= INICIO_MES && d <= FIM_PROJECAO
  })
  // Vencidas ficam de fora do total futuro e aparecem em destaque próprio:
  // misturar as duas esconde o que precisa de ação hoje.
  const atrasadas = contas
    .filter((c) => vencimento(c) && vencimento(c) < monthBoundsBR(mesAtual).start)
    .reduce((s, c) => s + Number(c.amount ?? 0), 0)



  /* Semanas: só as que cabem INTEIRAS na janela. A última linha dizia
     "01/09 a 07/09" mas contava só até 03/09, porque o corte é de 30 dias —
     rótulo prometendo período que o número não cobre. */
  const NOMES_MES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]
  const nomeDoMes = (ym: string) => NOMES_MES[Number(ym.slice(5, 7)) - 1]

  /* Semanas do mês em blocos de 7 dias a partir do dia 1 — não semana de
     calendário. Semana de calendário faria a primeira e a última linha
     invadirem o mês vizinho, e aí a soma das semanas deixaria de bater com o
     total do mês, que foi o defeito que a v106d corrigiu. */
  const semanas: SemanaProjecao[] = []
  for (let d = boundsSel.start; d <= boundsSel.end; d = addDaysBR(d, 7)) {
    const fimBloco = [addDaysBR(d, 6), boundsSel.end].sort()[0]
    const dentro = (x: string) => x >= d && x <= fimBloco
    semanas.push({
      rotulo: `${Number(d.slice(8))} a ${Number(fimBloco.slice(8))}`,
      entradas: futuros.filter((a) => dentro(a.appointment_date)).reduce((s, a) => s + Number(a.total_price ?? 0), 0),
      saidas: contasNoPeriodo.filter((c) => dentro(vencimento(c))).reduce((s, c) => s + Number(c.amount ?? 0), 0),
    })
  }

  const proximas: LinhaProjecao[] = [
    ...futuros
      .filter((a) => Number(a.total_price ?? 0) > 0)
      .map((a) => ({
        data: a.appointment_date as string,
        descricao: `${a.client_name ?? 'Cliente'} · ${a.service_name ?? 'Atendimento'}`,
        valor: Number(a.total_price ?? 0),
        tipo: 'entrada' as const,
      })),
    ...contasNoPeriodo.map((c) => ({
      data: vencimento(c),
      descricao: c.name as string,
      valor: Number(c.amount ?? 0),
      tipo: 'saida' as const,
    })),
  ]
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 12)

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <div className="relative">
        <SubPageHeader title="Fluxo de Caixa" subtitle={business.name} back="/admin/financeiro" />
        {/* Container responsivo · sm: cobre landscape do celular + tablet */}
        <div className="max-w-lg mx-auto px-4 py-6 sm:max-w-5xl sm:px-6 lg:max-w-7xl lg:px-8">
          <FluxoCaixaViewSelector current={view} />

          <FluxoCaixaTable
            months={cols}
            data={data}
            methodLabels={METHOD_LABELS}
            categoryLabels={CATEGORY_LABELS}
          />

          <p className="text-[11px] mt-3 text-center" style={{ color: 'var(--admin-text-faded)' }}>
            Clica em <b>Receitas</b> ou <b>Despesas</b> pra ver breakdown por método/categoria · Saldo Inicial = Saldo Final do período anterior
          </p>

          <ProjecaoFluxo
            entradasPrevistas={semanas.reduce((t, x) => t + x.entradas, 0)}
            mediaMensal={mediaMensal}
            devendo={totalDevendo}
            devendoDesde={devendo.length ? devendo.map((d) => d.desde).sort()[0] : null}
            devendoQtd={devendo.length}
            saidasPrevistas={semanas.reduce((t, x) => t + x.saidas, 0)}
            atrasadas={atrasadas}
            semanas={semanas}
            proximas={proximas}
            mesNome={nomeDoMes(mesSel)}
            ehMesAtual={mesSel === mesAtual}
            hrefAnterior={linkMes(mesAnterior)}
            hrefProximo={linkMes(mesProximo)}
            nomeAnterior={nomeDoMes(mesAnterior)}
            nomeProximo={nomeDoMes(mesProximo)}
          />

        </div>
      </div>
    </main>
  )
}
