/* ═══════════════════════════════════════════════════════════════
   ABA METAS · OS NÚMEROS DA TELA COMPLETA (05/11/2026)

   Eduardo achou a aba "simples" e escolheu 8 blocos: previsão com a agenda,
   ritmo na barra, mês passado até o mesmo dia, ações de hoje, de onde vem o
   dinheiro, gráfico do mês, meses anteriores e top serviços.

   RÉGUA: tudo sai da MESMA receitaDoPeriodo do Hub financeiro (competência,
   líquido de cupom, fuso BR). O faturado daqui é o mesmo número de
   faturadoDoMesSemCache, por construção (mesma chamada, mesmo arredondamento).
   Serviços / produtos / outros = a "composição" do Hub (valorRecebidoAppts,
   valorRecebidoSales, sinal de fora + pacotes). Ticket médio = o do Hub
   (valorRecebido ÷ atendimentos pagos). Top serviços = o servMap do Hub, só
   a parte de serviço.

   CPU (alerta 90% na Vercel): mês corrente em cache de 5 min (mesma janela
   do faturado), meses fechados em cache de 6 h. Nenhuma tabela nova: só
   leitura. Service role: quem chama já passou por acessoMetas.
   ═══════════════════════════════════════════════════════════════ */

import { unstable_cache } from 'next/cache'
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'
import { receitaDoPeriodo } from '@/lib/financeiro/resumo-do-periodo'
import { getApptDiscountMap } from '@/lib/commission-discount'
import { getApptChargedMap } from '@/lib/queries/appointment-charged-total'
import { fetchAll } from '@/lib/fetch-all'
import { addDaysBR, addMonthsBR, monthBoundsBR } from '@/lib/date-br'

function svc(): SupabaseClient {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

const r2 = (v: number) => Math.round(v * 100) / 100

export type PainelDoMes = {
  /** = faturadoDoMesSemCache (régua do Hub) */
  faturado: number
  servicos: number
  produtos: number
  /** sinal de atendimento de fora do mês + pacote/cartão presente */
  outros: number
  /** atendimentos pagos (régua do Hub) */
  atendimentos: number
  ticketMedio: number
  /** acumulado dia a dia, do dia 1º até hoje (último ponto = faturado) */
  acumulado: { ymd: string; valor: number }[]
  /** 3 serviços que mais trouxeram dinheiro no mês */
  topServicos: { nome: string; valor: number; qtd: number }[]
  /** marcado de HOJE ao fim do mês que ainda não entrou no faturado (hoje: não pago; depois de hoje: pago
   *  adiantado ou não), sem cancelado/falta, pelo valor líquido previsto */
  agendadoAteFim: number
  agendadoQtd: number
}

/** Mês corrente: do dia 1º até hoje (igual ao Hub) + o que está marcado até o fim do mês. */
export async function painelDoMesSemCache(db: SupabaseClient, businessId: string, ym: string, hoje: string): Promise<PainelDoMes> {
  const { start, end } = monthBoundsBR(ym)
  const ate = end > hoje ? hoje : end
  const r = await receitaDoPeriodo(db, businessId, start, ate)
  const faturado = r2(r.valorRecebido)

  // ── acumulado por dia: serviço pela data do atendimento, produto pela data
  // da venda, pacote pelo dia BR em que a comanda fechou. O sinal de fora do
  // mês não tem dia na conta do Hub: entra no dia de hoje, pra a linha
  // terminar exatamente no faturado.
  const porDia = new Map<string, number>()
  const soma = (d: string, v: number) => porDia.set(d, (porDia.get(d) ?? 0) + v)
  for (const a of r.paidAppts) soma(a.appointment_date, Number(a.total_price ?? 0))
  for (const s of r.productSales) soma(s.sale_date, Number(s.total ?? 0))
  const outros = r2(r.sinalDeFora + r.valorPacotes)
  const acumulado: PainelDoMes['acumulado'] = []
  let corrente = 0
  for (let d = start; d <= ate; d = addDaysBR(d, 1)) {
    corrente += porDia.get(d) ?? 0
    acumulado.push({ ymd: d, valor: r2(corrente) })
  }
  // pacote e sinal: a diferença até o faturado (o pacote poderia ir pelo dia
  // dele, mas vendasPacoteCartao só é chamada dentro de receitaDoPeriodo;
  // refazer a consulta custaria CPU por um ajuste de poucos reais)
  if (acumulado.length > 0) acumulado[acumulado.length - 1].valor = faturado

  // ── top serviços (servMap do Hub, só serviço)
  const serv = new Map<string, { nome: string; valor: number; qtd: number }>()
  for (const a of r.paidAppts) {
    const nome = a.service_name ?? 'Sem nome'
    const cur = serv.get(nome) ?? { nome, valor: 0, qtd: 0 }
    cur.valor += Number(a.total_price ?? 0)
    cur.qtd += 1
    serv.set(nome, cur)
  }
  const topServicos = Array.from(serv.values())
    .filter((s) => s.valor > 0)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 3)
    .map((s) => ({ ...s, valor: r2(s.valor) }))

  // ── agenda até o fim do mês. Hoje vem da própria receitaDoPeriodo (já
  // líquido, com o total da comanda quando tem produto); depois de hoje, uma
  // leitura leve com o mesmo desconto e o mesmo "cobrado" da comanda.
  const naoConta = (st: string | null) => st === 'cancelled' || st === 'no_show'
  let agendadoAteFim = 0
  let agendadoQtd = 0
  for (const a of r.appointments) {
    if (a.appointment_date !== hoje || a.paid_at || naoConta(a.status)) continue
    agendadoAteFim += Number(a.charged_total ?? a.total_price ?? 0)
    agendadoQtd++
  }
  const amanha = addDaysBR(hoje, 1)
  if (amanha <= end) {
    // Depois de hoje entra também o JÁ PAGO (pacote/adiantado): pela régua de
    // competência ele só vira faturado no dia do atendimento. Cortesia,
    // crédito e pontos não são receita (mesma regra da receitaDoPeriodo).
    type Futuro = { id: string; total_price: number | null; invoice_item_id: string | null; status: string | null; historical: boolean | null; paid_at: string | null; payment_method: string | null }
    const futuros = await fetchAll<Futuro>(() =>
      db.from('appointments')
        .select('id, total_price, invoice_item_id, status, historical, paid_at, payment_method')
        .eq('business_id', businessId)
        .gte('appointment_date', amanha)
        .lte('appointment_date', end)
        .not('status', 'in', '(cancelled,no_show)')
        .order('id', { ascending: true }) as never,
    )
    const validos = futuros.filter((a) => !a.historical && !(a.paid_at && ['courtesy', 'credit', 'points'].includes(a.payment_method ?? '')))
    if (validos.length > 0) {
      const [disc, charged] = await Promise.all([
        getApptDiscountMap(db, validos.map((a) => a.invoice_item_id)),
        getApptChargedMap(db, validos.map((a) => a.id)),
      ])
      for (const a of validos) {
        const liquido = Math.max(0, Number(a.total_price ?? 0) - (disc[a.id] ?? 0))
        const c = charged[a.id]
        agendadoAteFim += c && c.produtos.length > 0 ? c.charged : liquido
        agendadoQtd++
      }
    }
  }

  return {
    faturado,
    servicos: r2(r.valorRecebidoAppts),
    produtos: r2(r.valorRecebidoSales),
    outros,
    atendimentos: r.qtdAtendimentos,
    ticketMedio: r2(r.ticketMedio),
    acumulado,
    topServicos,
    agendadoAteFim: r2(agendadoAteFim),
    agendadoQtd,
  }
}

export const painelDoMes = unstable_cache(
  async (businessId: string, ym: string, hoje: string) => painelDoMesSemCache(svc(), businessId, ym, hoje),
  ['metas-painel-v2'],
  { revalidate: 300 },
)

/* ─── Mês passado até o mesmo dia ────────────────────────────────── */

/** Faturado do mês anterior do dia 1º até o mesmo dia de hoje (31 → último dia do mês). */
export async function mesPassadoAteDiaSemCache(db: SupabaseClient, businessId: string, hoje: string) {
  const ymAnt = addMonthsBR(`${hoje.slice(0, 7)}-01`, -1).slice(0, 7)
  const ateDia = addMonthsBR(hoje, -1) // gruda no último dia
  const r = await receitaDoPeriodo(db, businessId, `${ymAnt}-01`, ateDia)
  return { ym: ymAnt, ateDia, valor: r2(r.valorRecebido) }
}

export const mesPassadoAteDia = unstable_cache(
  async (businessId: string, hoje: string) => mesPassadoAteDiaSemCache(svc(), businessId, hoje),
  ['metas-mes-passado-v1'],
  { revalidate: 1800 },
)

/* ─── Meses fechados (histórico) ─────────────────────────────────── */

/** Faturado de um mês FECHADO inteiro (1º ao último dia). */
export const faturadoMesFechado = unstable_cache(
  async (businessId: string, ym: string) => {
    const { start, end } = monthBoundsBR(ym)
    const r = await receitaDoPeriodo(svc(), businessId, start, end)
    return r2(r.valorRecebido)
  },
  ['metas-mes-fechado-v1'],
  { revalidate: 21600 },
)

/** Os N meses fechados antes de `ym`, do mais antigo pro mais recente. */
export function mesesAnteriores(ym: string, n = 6): string[] {
  return Array.from({ length: n }, (_, i) => addMonthsBR(`${ym}-01`, -(n - i)).slice(0, 7))
}

/* ─── Ritmo ──────────────────────────────────────────────────────── */

/** Onde a barra deveria estar hoje: meta × dias de trabalho JÁ PASSADOS
 *  (antes de hoje) ÷ dias de trabalho do mês. Sem horário cadastrado, cai
 *  nos dias corridos. Hoje não conta como passado: de manhã ninguém está
 *  "atrás" por um dia que ainda nem começou. */
export function ritmoEsperado(meta: number, hoje: string, diasAbertosMes: number, diasAbertosDeHojeEmDiante: string[]): number {
  let total = diasAbertosMes
  let passados = diasAbertosMes - diasAbertosDeHojeEmDiante.length
  if (total <= 0) {
    const { end } = monthBoundsBR(hoje.slice(0, 7))
    total = Number(end.slice(8, 10))
    passados = Number(hoje.slice(8, 10)) - 1
  }
  if (total <= 0) return 0
  return r2(meta * Math.max(0, passados) / total)
}

