import type { SupabaseClient } from '@supabase/supabase-js'
import { addDaysBR, monthBoundsBR, startOfDayBR, todayBR } from '@/lib/date-br'
import { fetchAll } from '@/lib/fetch-all'
import { receitaDoPeriodo, despesasDoPeriodo } from '@/lib/financeiro/resumo-do-periodo'
import { comissoesGeradas, comissaoPorProfissional } from '@/lib/comissao-gerada'
import { sinaisRecebidos } from '@/lib/sinal-da-comanda'
import { telefoneCanonico } from '@/lib/phone-variants'
import { PERGUNTA_POR_ID, PERIODOS_FIXOS, type PeriodoId, type Resposta } from './catalogo'

/* ═══════════════════════════════════════════════════════════════
   Respostas do "Pergunte ao seu negócio" (21/10/2026)

   REGRA DE OURO: cada resposta usa a conta da tela que ela cita no link.
   Faturamento, despesas e lucro = lib/financeiro/resumo-do-periodo (a
   mesma do Financeiro). Clientes = RPCs resumo_clientes e
   ultimo_agendamento_clientes (as mesmas de Clientes e Sumidos).
   Cancelados = mesmo filtro da tela de Cancelados.
   ═══════════════════════════════════════════════════════════════ */

export type Negocio = { id: string; comissao_no_fluxo?: boolean | null; comissao_paga_no_atendimento?: boolean | null }

export type Pedido = {
  id: string
  periodo?: PeriodoId | null
  profissionalId?: string | null
  dias?: number | null
}

type Datas = { de: string; ate: string; rotulo: string; anterior: { de: string; ate: string; rotulo: string } }

const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const nomeMes = (ym: string) => NOMES_MES[Number(ym.slice(5, 7)) - 1]
const mesAnterior = (ym: string) => {
  const y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7))
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}
const diasEntre = (de: string, ate: string) => Math.round((Date.parse(ate + 'T12:00:00Z') - Date.parse(de + 'T12:00:00Z')) / 86400000)
const dataCurta = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`

export function datasDoPeriodo(p: PeriodoId, hoje = todayBR()): Datas {
  const janela = (de: string, ate: string, rotulo: string, rotAnt: string): Datas => {
    const n = diasEntre(de, ate)
    const antAte = addDaysBR(de, -1)
    return { de, ate, rotulo, anterior: { de: addDaysBR(antAte, -n), ate: antAte, rotulo: rotAnt } }
  }
  if (p === 'hoje') return janela(hoje, hoje, 'hoje', 'ontem')
  if (p === 'ontem') { const o = addDaysBR(hoje, -1); return janela(o, o, 'ontem', 'anteontem') }
  if (p === 'semana') return janela(addDaysBR(hoje, -6), hoje, 'nos últimos 7 dias', 'os 7 dias anteriores')
  if (p === '30dias') return janela(addDaysBR(hoje, -29), hoje, 'nos últimos 30 dias', 'os 30 dias anteriores')
  if (p === 'ano') {
    const y = hoje.slice(0, 4)
    const antAte = `${Number(y) - 1}${hoje.slice(4)}`
    return { de: `${y}-01-01`, ate: hoje, rotulo: `em ${y}`, anterior: { de: `${Number(y) - 1}-01-01`, ate: antAte, rotulo: `o mesmo período de ${Number(y) - 1}` } }
  }
  const mesCheio = (ym: string): Datas => {
    const b = monthBoundsBR(ym), a = monthBoundsBR(mesAnterior(ym))
    return { de: b.start, ate: b.end, rotulo: `em ${nomeMes(ym)}`, anterior: { de: a.start, ate: a.end, rotulo: nomeMes(mesAnterior(ym)) } }
  }
  if (p === 'mes_passado') return mesCheio(mesAnterior(hoje.slice(0, 7)))
  if (p.startsWith('m:') && /^m:\d{4}-\d{2}$/.test(p)) {
    const ym = p.slice(2)
    if (ym === hoje.slice(0, 7)) return datasDoPeriodo('mes', hoje)
    if (ym < hoje.slice(0, 7)) return mesCheio(ym)
  }
  // 'mes' (padrão): do dia 1º até hoje, contra os MESMOS dias do mês anterior.
  const ym = hoje.slice(0, 7)
  const antYm = mesAnterior(ym)
  const antFim = monthBoundsBR(antYm).end
  const antAte = `${antYm}-${hoje.slice(8, 10)}` > antFim ? antFim : `${antYm}-${hoje.slice(8, 10)}`
  return {
    de: `${ym}-01`, ate: hoje, rotulo: `em ${nomeMes(ym)} (até hoje)`,
    anterior: { de: `${antYm}-01`, ate: antAte, rotulo: `o mesmo período de ${nomeMes(antYm)}` },
  }
}

export function rotuloDoPeriodo(p: PeriodoId): string {
  const f = PERIODOS_FIXOS.find((x) => x.id === p)
  if (f) return f.rotulo
  if (p.startsWith('m:')) { const n = nomeMes(p.slice(2)); return n[0].toUpperCase() + n.slice(1) }
  return p
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (atual: number, antes: number) => (antes > 0 ? Math.round(((atual - antes) / antes) * 100) : null)
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`
const profDe = (a: { professional: unknown }) => {
  const p = a.professional as { id: string; name: string | null } | { id: string; name: string | null }[] | null
  return Array.isArray(p) ? p[0] ?? null : p
}
/** "o mesmo período" → "ao mesmo período"; "setembro" → "a setembro". */
const aoRotulo = (r: string) => (r.startsWith('o ') ? `ao ${r.slice(2)}` : r.startsWith('os ') ? `aos ${r.slice(3)}` : `a ${r}`)
const comparacao = (atual: number, antes: number, rotAnt: string, dinheiro = true) => {
  const v = pct(atual, antes)
  const fmt = dinheiro ? brl(antes) : String(antes)
  if (v === null) return antes === 0 && atual > 0 ? `Nada pra comparar com ${rotAnt}.` : ''
  if (v === 0) return `Igual ${aoRotulo(rotAnt)} (${fmt}).`
  return `${Math.abs(v)}% ${v > 0 ? 'a mais' : 'a menos'} que ${rotAnt} (${fmt}).`
}
const top = <T,>(m: Map<string, T>, por: (x: T) => number, n = 5) => [...m.entries()].sort((a, b) => por(b[1]) - por(a[1])).slice(0, n)

/** Ranking por profissional, regra do Top Profissionais do Financeiro: serviço líquido + produto vendido por ela. */
function rankingProfissionais(r: Awaited<ReturnType<typeof receitaDoPeriodo>>) {
  const m = new Map<string, { nome: string; total: number; qtd: number; servicos: number; qtdServicos: number }>()
  const pega = (id: string, nome: string | null) => {
    const cur = m.get(id) ?? { nome: nome ?? '—', total: 0, qtd: 0, servicos: 0, qtdServicos: 0 }
    m.set(id, cur)
    return cur
  }
  for (const a of r.paidAppts) {
    const p = profDe(a)
    if (!p?.id) continue
    const c = pega(p.id, p.name)
    c.total += Number(a.total_price ?? 0); c.qtd++
    c.servicos += Number(a.total_price ?? 0); c.qtdServicos++
  }
  for (const s of r.productSales) {
    const p = profDe(s)
    if (!p?.id) continue
    const c = pega(p.id, p.name)
    c.total += Number(s.total ?? 0); c.qtd++
  }
  return m
}

/** Nome dos clientes, em lotes (.in gigante volta 400 calado). O cadastro
 *  global (clients) nem sempre é visível pelo login da dona (RLS); quem
 *  faltar sai com o nome gravado no próprio agendamento, que é do negócio. */
async function nomesDeClientes(sb: SupabaseClient, businessId: string, ids: string[]) {
  const out = new Map<string, { name: string }>()
  for (let i = 0; i < ids.length; i += 150) {
    const { data } = await sb.from('clients').select('id, name').in('id', ids.slice(i, i + 150))
    for (const c of data ?? []) if (c.name) out.set(c.id as string, { name: c.name as string })
  }
  const faltam = ids.filter((id) => !out.has(id))
  for (let i = 0; i < faltam.length; i += 150) {
    const { data } = await sb.from('appointments').select('client_id, client_name')
      .eq('business_id', businessId).in('client_id', faltam.slice(i, i + 150)).not('client_name', 'is', null)
      .order('appointment_date', { ascending: false })
    for (const a of data ?? []) if (!out.has(a.client_id as string)) out.set(a.client_id as string, { name: a.client_name as string })
  }
  // resumo_clientes mistura appointments.client_id com sales.customer_id:
  // quem só comprou produto vem com o id da ficha do negócio (customers).
  const aindaFaltam = ids.filter((id) => !out.has(id))
  for (let i = 0; i < aindaFaltam.length; i += 150) {
    const { data } = await sb.from('customers').select('id, name').eq('business_id', businessId).in('id', aindaFaltam.slice(i, i + 150))
    for (const c of data ?? []) if (c.name) out.set(c.id as string, { name: c.name as string })
  }
  return out
}

/** Sem despesa paga no período, lucro e gasto saem inflados/zerados. Avisa
 *  (26/10, print do Eduardo: lucro = faturamento porque nada foi lançado).
 *  Despesa lançada e ainda não paga também não entra: diz quantas são. */
async function avisoSemDespesa(sb: SupabaseClient, businessId: string, d: Datas): Promise<Resposta['aviso']> {
  const { count } = await sb.from('expenses').select('id', { count: 'exact', head: true })
    .eq('business_id', businessId).neq('status', 'paid').gte('occurred_at', d.de).lte('occurred_at', d.ate)
  const link = { href: '/admin/financeiro/despesas', rotulo: count ? 'Ver despesas' : 'Lançar despesa' }
  if (count) {
    return { texto: `${plural(count, 'despesa lançada', 'despesas lançadas')} ${d.rotulo} ainda não ${count === 1 ? 'está marcada' : 'estão marcadas'} como paga. Só despesa paga entra na conta.`, link }
  }
  return { texto: `Nenhuma despesa lançada ${d.rotulo}. Se teve gasto (aluguel, produto, contas), lance pra ver o número de verdade.`, link }
}

type ResumoCliente ={ client_id: string; visitas: number; primeira: string | null; ultima: string | null; total_gasto: number }
async function resumoClientes(sb: SupabaseClient, businessId: string): Promise<ResumoCliente[]> {
  const { data } = await sb.rpc('resumo_clientes', { p_business_id: businessId, p_hoje: todayBR() })
  return ((data ?? []) as ResumoCliente[]).map((r) => ({ ...r, visitas: Number(r.visitas ?? 0), total_gasto: Number(r.total_gasto ?? 0) }))
}

export async function responder(sb: SupabaseClient, negocio: Negocio, pedido: Pedido): Promise<Resposta | null> {
  const def = PERGUNTA_POR_ID[pedido.id]
  if (!def) return null
  const periodo = pedido.periodo ?? def.periodo ?? 'mes'
  const d = datasDoPeriodo(periodo)
  const hoje = todayBR()
  const bid = negocio.id

  switch (def.id) {
    case 'faturei':
    case 'comparar': {
      const [cur, ant] = await Promise.all([receitaDoPeriodo(sb, bid, d.de, d.ate), receitaDoPeriodo(sb, bid, d.anterior.de, d.anterior.ate)])
      if (pedido.profissionalId) {
        const rc = rankingProfissionais(cur).get(pedido.profissionalId)
        const ra = rankingProfissionais(ant).get(pedido.profissionalId)
        const nome = rc?.nome ?? ra?.nome ?? 'Essa profissional'
        return {
          titulo: def.texto,
          frase: `${nome} faturou ${brl(rc?.total ?? 0)} ${d.rotulo}. ${comparacao(rc?.total ?? 0, ra?.total ?? 0, d.anterior.rotulo)}`.trim(),
          itens: [
            { rotulo: 'Serviços', valor: `${brl(rc?.servicos ?? 0)} · ${plural(rc?.qtdServicos ?? 0, 'atendimento', 'atendimentos')}` },
            { rotulo: 'Produtos vendidos por ela', valor: brl((rc?.total ?? 0) - (rc?.servicos ?? 0)) },
          ],
          link: { href: `/admin/financeiro?de=${d.de}&ate=${d.ate}`, rotulo: 'Ver no Financeiro' },
          nota: 'Mesma conta do Top Profissionais do Financeiro: atendimentos pagos (com desconto) mais produtos que ela vendeu.',
        }
      }
      return {
        titulo: def.texto,
        frase: `Você faturou ${brl(cur.valorRecebido)} ${d.rotulo}. ${comparacao(cur.valorRecebido, ant.valorRecebido, d.anterior.rotulo)}`.trim(),
        itens: [
          { rotulo: 'Serviços', valor: `${brl(cur.valorRecebidoAppts)} · ${plural(cur.qtdAtendimentos, 'atendimento', 'atendimentos')}` },
          { rotulo: 'Produtos', valor: brl(cur.valorRecebidoSales) },
          ...(cur.sinalDeFora + cur.valorPacotes > 0 ? [{ rotulo: 'Sinal e pacotes', valor: brl(cur.sinalDeFora + cur.valorPacotes) }] : []),
        ],
        link: { href: `/admin/financeiro?de=${d.de}&ate=${d.ate}`, rotulo: 'Ver no Financeiro' },
        nota: 'Conta pela data do atendimento, já com desconto. Cortesia e pagamento com pontos ou crédito não entram.',
      }
    }

    case 'ticket': {
      const [cur, ant] = await Promise.all([receitaDoPeriodo(sb, bid, d.de, d.ate), receitaDoPeriodo(sb, bid, d.anterior.de, d.anterior.ate)])
      return {
        titulo: def.texto,
        frase: `Seu ticket médio ${d.rotulo} foi ${brl(cur.ticketMedio)}. ${comparacao(cur.ticketMedio, ant.ticketMedio, d.anterior.rotulo)}`.trim(),
        itens: [{ rotulo: 'Faturamento', valor: brl(cur.valorRecebido) }, { rotulo: 'Atendimentos pagos', valor: String(cur.qtdAtendimentos) }],
        link: { href: `/admin/financeiro?de=${d.de}&ate=${d.ate}`, rotulo: 'Ver no Financeiro' },
        nota: 'Faturamento dividido pelos atendimentos pagos, igual ao card do Financeiro.',
      }
    }

    case 'servico_fatura':
    case 'servico_qtd': {
      const cur = await receitaDoPeriodo(sb, bid, d.de, d.ate)
      const m = new Map<string, { total: number; qtd: number }>()
      for (const a of cur.paidAppts) {
        const k = a.service_name ?? 'Sem nome'
        const c = m.get(k) ?? { total: 0, qtd: 0 }
        c.total += Number(a.total_price ?? 0); c.qtd++
        m.set(k, c)
      }
      const porValor = def.id === 'servico_fatura'
      const lista = top(m, (x) => (porValor ? x.total : x.qtd))
      if (lista.length === 0) return { titulo: def.texto, frase: `Nenhum atendimento pago ${d.rotulo}.` }
      const [nome, v] = lista[0]
      return {
        titulo: def.texto,
        frase: porValor
          ? `${nome} foi o que mais faturou ${d.rotulo}: ${brl(v.total)} em ${plural(v.qtd, 'atendimento', 'atendimentos')}.`
          : `${nome} foi o mais feito ${d.rotulo}: ${plural(v.qtd, 'vez', 'vezes')} (${brl(v.total)}).`,
        itens: lista.map(([n, x]) => ({ rotulo: n, valor: porValor ? `${brl(x.total)} · ${x.qtd}x` : `${x.qtd}x · ${brl(x.total)}` })),
        link: { href: `/admin/financeiro?de=${d.de}&ate=${d.ate}`, rotulo: 'Ver no Financeiro' },
      }
    }

    case 'produtos': {
      const cur = await receitaDoPeriodo(sb, bid, d.de, d.ate)
      const ant = await receitaDoPeriodo(sb, bid, d.anterior.de, d.anterior.ate)
      return {
        titulo: def.texto,
        frase: `Você vendeu ${brl(cur.valorRecebidoSales)} em produtos ${d.rotulo}, em ${plural(cur.productSales.length, 'venda', 'vendas')}. ${comparacao(cur.valorRecebidoSales, ant.valorRecebidoSales, d.anterior.rotulo)}`.trim(),
        link: { href: '/admin/financeiro/vendas', rotulo: 'Ver vendas' },
      }
    }

    case 'produto_top': {
      const cur = await receitaDoPeriodo(sb, bid, d.de, d.ate)
      const m = new Map<string, { total: number; qtd: number }>()
      for (const s of cur.productSales) for (const it of s.sale_items ?? []) {
        const k = it.product_name ?? 'Produto'
        const c = m.get(k) ?? { total: 0, qtd: 0 }
        c.total += Number(it.unit_price ?? 0) * Number(it.quantity ?? 0); c.qtd += Number(it.quantity ?? 0)
        m.set(k, c)
      }
      const lista = top(m, (x) => x.qtd)
      if (lista.length === 0) return { titulo: def.texto, frase: `Nenhum produto vendido ${d.rotulo}.` }
      return {
        titulo: def.texto,
        frase: `${lista[0][0]} foi o produto mais vendido ${d.rotulo}: ${plural(lista[0][1].qtd, 'unidade', 'unidades')}.`,
        itens: lista.map(([n, x]) => ({ rotulo: n, valor: `${x.qtd} un · ${brl(x.total)}` })),
        link: { href: '/admin/produtos', rotulo: 'Ver produtos' },
      }
    }

    case 'formas': {
      const cur = await receitaDoPeriodo(sb, bid, d.de, d.ate)
      const ROT: Record<string, string> = { cash: 'Dinheiro', pix: 'Pix', credit: 'Cartão de crédito', credit_card: 'Cartão de crédito', debit: 'Cartão de débito', debit_card: 'Cartão de débito', card: 'Cartão', transfer: 'Transferência', courtesy: 'Cortesia', points: 'Pontos', other: 'Não classificado' }
      const metodo = (m: string | null, tipo: string | null) => (m === 'card' && (tipo === 'credit' || tipo === 'debit') ? tipo : m ?? 'other')
      const m = new Map<string, number>()
      // Mesma conta do gráfico "Formas de pagamento" do Financeiro.
      for (const a of cur.appointments) if (a.paid_at) {
        const k = metodo(a.payment_method, a.payment_card_type); m.set(k, (m.get(k) ?? 0) + Number(a.total_price ?? 0))
      }
      for (const s of cur.productSales) {
        const k = metodo(s.payment_method, s.payment_card_type); m.set(k, (m.get(k) ?? 0) + Number(s.total ?? 0))
      }
      const lista = top(m, (x) => x, 10).filter(([, v]) => v > 0)
      if (lista.length === 0) return { titulo: def.texto, frase: `Nenhum pagamento ${d.rotulo}.` }
      return {
        titulo: def.texto,
        frase: `${d.rotulo[0].toUpperCase() + d.rotulo.slice(1)}, o que mais entrou foi ${ROT[lista[0][0]] ?? lista[0][0]}: ${brl(lista[0][1])}.`,
        itens: lista.map(([k, v]) => ({ rotulo: ROT[k] ?? k, valor: brl(v) })),
        link: { href: `/admin/financeiro/fluxo-caixa`, rotulo: 'Ver no Fluxo de Caixa' },
        nota: 'Mesma conta do gráfico de formas de pagamento do Financeiro.',
      }
    }

    case 'taxas': {
      const cur = await receitaDoPeriodo(sb, bid, d.de, d.ate)
      return {
        titulo: def.texto,
        frase: `Você pagou ${brl(cur.totalTaxas)} de taxa de cartão ${d.rotulo}, sobre ${brl(cur.valorRecebido)} faturados.`,
        link: { href: `/admin/financeiro?de=${d.de}&ate=${d.ate}`, rotulo: 'Ver no Financeiro' },
        nota: 'Usa a taxa cadastrada em cada maquininha.',
      }
    }

    case 'a_receber': {
      const cur = await receitaDoPeriodo(sb, bid, d.de, d.ate)
      const abertos = cur.appointments.filter((a) => !a.paid_at && a.status !== 'cancelled' && a.appointment_date <= hoje)
      const valorAbertos = abertos.reduce((s, a) => s + Number(a.charged_total ?? a.total_price ?? 0), 0)
      return {
        titulo: def.texto,
        frase: `${d.rotulo[0].toUpperCase() + d.rotulo.slice(1)} tem ${brl(cur.valorProgramado)} a receber, contando atendimentos ainda não pagos.`,
        itens: [
          { rotulo: 'Já atendidos e não pagos', valor: `${brl(valorAbertos)} · ${abertos.length}` },
          { rotulo: 'Agendados que ainda vão acontecer', valor: brl(cur.valorProgramado - valorAbertos) },
        ],
        link: { href: '/admin/comandas', rotulo: 'Ver comandas' },
        nota: 'Mesmo número do card "A receber" do Financeiro.',
      }
    }

    case 'melhor_dia': {
      const cur = await receitaDoPeriodo(sb, bid, d.de, d.ate)
      const m = new Map<string, number>()
      for (const a of cur.paidAppts) m.set(a.appointment_date, (m.get(a.appointment_date) ?? 0) + Number(a.total_price ?? 0))
      for (const s of cur.productSales) m.set(s.sale_date, (m.get(s.sale_date) ?? 0) + Number(s.total ?? 0))
      const lista = top(m, (x) => x, 3)
      if (lista.length === 0) return { titulo: def.texto, frase: `Nenhum faturamento ${d.rotulo}.` }
      return {
        titulo: def.texto,
        frase: `Seu melhor dia ${d.rotulo} foi ${dataCurta(lista[0][0])}, com ${brl(lista[0][1])}.`,
        itens: lista.map(([k, v]) => ({ rotulo: dataCurta(k), valor: brl(v) })),
        link: { href: `/admin/financeiro?de=${d.de}&ate=${d.ate}`, rotulo: 'Ver no Financeiro' },
      }
    }

    case 'gastei':
    case 'maior_despesa': {
      const [cur, ant] = await Promise.all([despesasDoPeriodo(sb, negocio, d.de, d.ate), despesasDoPeriodo(sb, negocio, d.anterior.de, d.anterior.ate)])
      if (def.id === 'gastei') {
        const CAT: Record<string, string> = { rent: 'Aluguel', products: 'Produtos', salary: 'Salários', utilities: 'Contas', marketing: 'Marketing', taxes: 'Impostos', other: 'Outros' }
        const m = new Map<string, number>()
        for (const e of cur.expenses) { const k = CAT[e.category ?? 'other'] ?? e.category ?? 'Outros'; m.set(k, (m.get(k) ?? 0) + Number(e.amount ?? 0)) }
        if (cur.comissoesPagasRegistradas > 0) m.set('Comissões pagas', cur.comissoesPagasRegistradas)
        return {
          titulo: def.texto,
          frase: `Você gastou ${brl(cur.despesasPagas)} ${d.rotulo}. ${comparacao(cur.despesasPagas, ant.despesasPagas, d.anterior.rotulo)}`.trim(),
          itens: top(m, (x) => x, 10).map(([k, v]) => ({ rotulo: k, valor: brl(v) })),
          link: { href: '/admin/financeiro/despesas', rotulo: 'Ver despesas' },
          nota: 'Só despesas marcadas como pagas, igual ao card "Despesas pagas" do Financeiro.',
          aviso: cur.despesasPagas === 0 ? await avisoSemDespesa(sb, bid, d) : undefined,
        }
      }
      const lista = [...cur.expenses].sort((a, b) => Number(b.amount ?? 0) - Number(a.amount ?? 0)).slice(0, 5)
      if (lista.length === 0) return { titulo: def.texto, frase: `Nenhuma despesa paga ${d.rotulo}.`, aviso: await avisoSemDespesa(sb, bid, d) }
      return {
        titulo: def.texto,
        frase: `Sua maior despesa ${d.rotulo} foi ${lista[0].name ?? 'sem nome'}: ${brl(Number(lista[0].amount ?? 0))}.`,
        itens: lista.map((e) => ({ rotulo: `${e.name ?? 'Sem nome'} · ${dataCurta(e.occurred_at)}`, valor: brl(Number(e.amount ?? 0)) })),
        link: { href: '/admin/financeiro/despesas', rotulo: 'Ver despesas' },
      }
    }

    case 'lucro': {
      const [rc, ra, dc, da] = await Promise.all([
        receitaDoPeriodo(sb, bid, d.de, d.ate), receitaDoPeriodo(sb, bid, d.anterior.de, d.anterior.ate),
        despesasDoPeriodo(sb, negocio, d.de, d.ate), despesasDoPeriodo(sb, negocio, d.anterior.de, d.anterior.ate),
      ])
      const lucro = rc.valorRecebido - dc.despesasPagas - dc.comissaoAPagar
      const lucroAnt = ra.valorRecebido - da.despesasPagas - da.comissaoAPagar
      return {
        titulo: def.texto,
        frase: lucro >= 0
          ? `Sobraram ${brl(lucro)} ${d.rotulo}. ${comparacao(lucro, lucroAnt, d.anterior.rotulo)}`.trim()
          : `${d.rotulo[0].toUpperCase() + d.rotulo.slice(1)} saiu mais do que entrou: faltaram ${brl(-lucro)}.`,
        itens: [
          { rotulo: 'Faturamento', valor: brl(rc.valorRecebido) },
          { rotulo: 'Despesas pagas', valor: `− ${brl(dc.despesasPagas)}` },
          ...(dc.comissaoAPagar > 0 ? [{ rotulo: 'Comissão a pagar', valor: `− ${brl(dc.comissaoAPagar)}` }] : []),
        ],
        link: { href: `/admin/financeiro?de=${d.de}&ate=${d.ate}`, rotulo: 'Ver no Financeiro' },
        nota: 'Mesmo número do card "Lucro líquido" do Financeiro.',
        aviso: dc.despesasPagas === 0 ? await avisoSemDespesa(sb, bid, d) : undefined,
      }
    }

    case 'sinal': {
      const r = await sinaisRecebidos(sb, bid, startOfDayBR(d.de), startOfDayBR(addDaysBR(d.ate, 1)))
      const total = r.reduce((s, x) => s + x.valor, 0)
      return {
        titulo: def.texto,
        frase: `Entraram ${brl(total)} de sinal ${d.rotulo}, de ${plural(r.length, 'cliente', 'clientes')}.`,
        link: { href: '/admin/financeiro/sinal', rotulo: 'Ver sinais' },
        nota: 'Conta pelo dia em que o sinal caiu. Sinal pago com crédito não entra.',
      }
    }

    case 'prof_top':
    case 'prof_atend':
    case 'prof_ticket': {
      const cur = await receitaDoPeriodo(sb, bid, d.de, d.ate)
      const m = rankingProfissionais(cur)
      if (m.size === 0) return { titulo: def.texto, frase: `Nenhum atendimento pago ${d.rotulo}.` }
      if (def.id === 'prof_top') {
        const l = top(m, (x) => x.total, 20)
        return {
          titulo: def.texto,
          frase: `${l[0][1].nome} foi quem mais faturou ${d.rotulo}: ${brl(l[0][1].total)}.`,
          itens: l.map(([, x]) => ({ rotulo: x.nome, valor: brl(x.total) })),
          link: { href: `/admin/financeiro?de=${d.de}&ate=${d.ate}`, rotulo: 'Ver no Financeiro' },
          nota: 'Atendimentos pagos (com desconto) mais produtos que cada uma vendeu, igual ao Top Profissionais.',
        }
      }
      if (def.id === 'prof_atend') {
        const l = top(m, (x) => x.qtdServicos, 20).filter(([, x]) => x.qtdServicos > 0)
        return {
          titulo: def.texto,
          frase: `${l[0][1].nome} fez mais atendimentos ${d.rotulo}: ${l[0][1].qtdServicos}.`,
          itens: l.map(([, x]) => ({ rotulo: x.nome, valor: String(x.qtdServicos) })),
          link: { href: '/admin/financeiro/remuneracoes', rotulo: 'Ver Remunerações' },
          nota: 'Conta atendimentos pagos.',
        }
      }
      const l = top(m, (x) => (x.qtdServicos > 0 ? x.servicos / x.qtdServicos : 0), 20).filter(([, x]) => x.qtdServicos > 0)
      return {
        titulo: def.texto,
        frase: `${l[0][1].nome} tem o maior ticket médio ${d.rotulo}: ${brl(l[0][1].servicos / l[0][1].qtdServicos)} por atendimento.`,
        itens: l.map(([, x]) => ({ rotulo: x.nome, valor: `${brl(x.servicos / x.qtdServicos)} · ${x.qtdServicos} atend.` })),
        nota: 'Só serviços (sem produto), já com desconto.',
      }
    }

    case 'comissao': {
      const linhas = await comissoesGeradas(sb, bid, startOfDayBR(d.de), startOfDayBR(addDaysBR(d.ate, 1)))
      let porProf = comissaoPorProfissional(linhas)
      if (pedido.profissionalId) {
        const doProf = linhas.filter((l) => l.professionalId === pedido.profissionalId)
        porProf = comissaoPorProfissional(doProf)
        const nome = porProf[0]?.nome ?? 'Essa profissional'
        return {
          titulo: def.texto,
          frase: `${nome} gerou ${brl(porProf[0]?.valor ?? 0)} de comissão ${d.rotulo}.`,
          link: { href: '/admin/financeiro/remuneracoes', rotulo: 'Ver Remunerações' },
          nota: 'Comissão gerada pelos atendimentos e vendas do período. O que já foi pago você vê em Remunerações.',
        }
      }
      const total = porProf.reduce((s, x) => s + x.valor, 0)
      return {
        titulo: def.texto,
        frase: `A equipe gerou ${brl(total)} de comissão ${d.rotulo}.`,
        itens: porProf.map((x) => ({ rotulo: x.nome, valor: brl(x.valor) })),
        link: { href: '/admin/financeiro/remuneracoes', rotulo: 'Ver Remunerações' },
        nota: 'Comissão gerada pelos atendimentos e vendas do período. O que já foi pago você vê em Remunerações.',
      }
    }

    case 'prof_fieis': {
      const linhas = await fetchAll<{ client_id: string | null; client_phone: string | null; professional_id: string | null; professional: unknown }>(() =>
        sb.from('appointments').select('client_id, client_phone, professional_id, professional:professionals(id, name)')
          .eq('business_id', bid).eq('status', 'completed').lte('appointment_date', hoje)
          .order('id', { ascending: true }) as never)
      const visitas = new Map<string, { nome: string; porCliente: Map<string, number> }>()
      for (const a of linhas) {
        const p = profDe(a)
        const cliente = a.client_id ?? (a.client_phone ? telefoneCanonico(a.client_phone) : null)
        if (!p?.id || !cliente) continue
        const v = visitas.get(p.id) ?? { nome: p.name ?? '—', porCliente: new Map() }
        v.porCliente.set(cliente, (v.porCliente.get(cliente) ?? 0) + 1)
        visitas.set(p.id, v)
      }
      const l = [...visitas.values()].map((v) => {
        const total = v.porCliente.size
        const voltam = [...v.porCliente.values()].filter((n) => n >= 2).length
        return { nome: v.nome, total, voltam, taxa: total > 0 ? Math.round((voltam / total) * 100) : 0 }
      }).filter((x) => x.total > 0).sort((a, b) => b.voltam - a.voltam)
      if (l.length === 0) return { titulo: def.texto, frase: 'Ainda não tem atendimento concluído pra comparar.' }
      return {
        titulo: def.texto,
        frase: `${l[0].nome} tem mais clientes que voltam: ${l[0].voltam} de ${l[0].total} (${l[0].taxa}%).`,
        itens: l.map((x) => ({ rotulo: x.nome, valor: `${x.voltam} de ${x.total} · ${x.taxa}%` })),
        nota: 'Desde o início: clientes que foram atendidas 2 vezes ou mais pela mesma profissional.',
      }
    }

    case 'prof_faltas':
    case 'faltas':
    case 'cancelamentos': {
      // Mesmo filtro da tela de Cancelados: quem não confirmou o sinal é à parte.
      const linhas = await fetchAll<{ status: string; client_name: string | null; appointment_date: string; sinal_expirado_at: string | null; professional: unknown }>(() =>
        sb.from('appointments').select('status, client_name, appointment_date, sinal_expirado_at, professional:professionals(id, name)')
          .eq('business_id', bid).in('status', ['cancelled', 'no_show'])
          .gte('appointment_date', d.de).lte('appointment_date', d.ate)
          .order('id', { ascending: true }) as never)
      const reais = linhas.filter((a) => !a.sinal_expirado_at)
      if (def.id === 'prof_faltas') {
        const m = new Map<string, { nome: string; faltas: number; canc: number }>()
        for (const a of reais) {
          const p = profDe(a)
          const k = p?.id ?? 'sem'
          const c = m.get(k) ?? { nome: p?.name ?? 'Sem profissional', faltas: 0, canc: 0 }
          if (a.status === 'no_show') c.faltas++; else c.canc++
          m.set(k, c)
        }
        const l = top(m, (x) => x.faltas + x.canc, 20)
        if (l.length === 0) return { titulo: def.texto, frase: `Nenhuma falta ou cancelamento ${d.rotulo}.` }
        return {
          titulo: def.texto,
          frase: `A agenda de ${l[0][1].nome} teve mais perdas ${d.rotulo}: ${plural(l[0][1].faltas, 'falta', 'faltas')} e ${plural(l[0][1].canc, 'cancelamento', 'cancelamentos')}.`,
          itens: l.map(([, x]) => ({ rotulo: x.nome, valor: `${x.faltas} faltas · ${x.canc} cancel.` })),
          link: { href: '/admin/financeiro/cancelados', rotulo: 'Ver cancelados' },
        }
      }
      const alvo = def.id === 'faltas' ? 'no_show' : 'cancelled'
      const l = reais.filter((a) => a.status === alvo)
      const expirados = linhas.filter((a) => a.sinal_expirado_at).length
      return {
        titulo: def.texto,
        frase: def.id === 'faltas'
          ? `${l.length === 0 ? 'Nenhuma falta' : plural(l.length, 'cliente faltou', 'clientes faltaram')} ${d.rotulo}.`
          : `${l.length === 0 ? 'Nenhum cancelamento' : plural(l.length, 'cancelamento', 'cancelamentos')} ${d.rotulo}.`,
        itens: l.slice(0, 10).map((a) => ({ rotulo: a.client_name ?? 'Cliente', valor: dataCurta(a.appointment_date) })),
        link: { href: '/admin/financeiro/cancelados', rotulo: 'Ver cancelados' },
        nota: expirados > 0 ? `Fora ${plural(expirados, 'horário que não confirmou', 'horários que não confirmaram')} o sinal, que a tela de Cancelados mostra à parte.` : undefined,
      }
    }

    case 'novas': {
      const r = await resumoClientes(sb, bid)
      const novas = r.filter((c) => c.primeira && c.primeira >= d.de && c.primeira <= d.ate)
      const antes = r.filter((c) => c.primeira && c.primeira >= d.anterior.de && c.primeira <= d.anterior.ate).length
      const nomes = await nomesDeClientes(sb, bid, novas.slice(0, 10).map((c) => c.client_id))
      return {
        titulo: def.texto,
        frase: `${novas.length === 0 ? 'Nenhuma cliente nova' : plural(novas.length, 'cliente nova veio', 'clientes novas vieram')} ${d.rotulo}. ${comparacao(novas.length, antes, d.anterior.rotulo, false)}`.trim(),
        itens: novas.slice(0, 10).map((c) => ({ rotulo: nomes.get(c.client_id)?.name ?? 'Cliente', valor: c.primeira ? dataCurta(c.primeira) : '' })),
        link: { href: '/admin/clientes', rotulo: 'Ver clientes' },
        nota: 'Cliente nova = primeira visita realizada no período.',
      }
    }

    case 'melhores':
    case 'frequentes': {
      const r = await resumoClientes(sb, bid)
      const porGasto = def.id === 'melhores'
      const l = [...r].sort((a, b) => (porGasto ? b.total_gasto - a.total_gasto : b.visitas - a.visitas)).filter((c) => (porGasto ? c.total_gasto > 0 : c.visitas > 0)).slice(0, 10)
      if (l.length === 0) return { titulo: def.texto, frase: 'Ainda não tem visita realizada pra montar o ranking.' }
      const nomes = await nomesDeClientes(sb, bid, l.map((c) => c.client_id))
      const nome = (c: ResumoCliente) => nomes.get(c.client_id)?.name ?? 'Cliente'
      return {
        titulo: def.texto,
        frase: porGasto
          ? `Sua melhor cliente é ${nome(l[0])}: ${brl(l[0].total_gasto)} em ${plural(l[0].visitas, 'visita', 'visitas')}.`
          : `Quem mais vem é ${nome(l[0])}: ${plural(l[0].visitas, 'visita', 'visitas')}.`,
        itens: l.map((c) => ({ rotulo: nome(c), valor: porGasto ? `${brl(c.total_gasto)} · ${c.visitas} vis.` : `${c.visitas} visitas · ${brl(c.total_gasto)}` })),
        link: { href: '/admin/clientes', rotulo: 'Ver clientes' },
        nota: 'Desde o início, mesma conta da tela de Clientes.',
      }
    }

    case 'sumidas': {
      const dias = Math.min(365, Math.max(15, Math.round(pedido.dias ?? def.dias ?? 60)))
      const corte = addDaysBR(hoje, -dias)
      // Mesma régua da tela Sumidos: última data QUALQUER (quem tem horário marcado à frente não sumiu).
      const [{ data: ultimos }, resumo] = await Promise.all([
        sb.rpc('ultimo_agendamento_clientes', { p_business_id: bid }),
        resumoClientes(sb, bid),
      ])
      const sumidas = ((ultimos ?? []) as { client_id: string; ultima: string }[]).filter((u) => u.client_id && u.ultima && u.ultima < corte)
      const gasto = new Map(resumo.map((c) => [c.client_id, c.total_gasto]))
      const l = sumidas.sort((a, b) => (gasto.get(b.client_id) ?? 0) - (gasto.get(a.client_id) ?? 0)).slice(0, 10)
      const nomes = await nomesDeClientes(sb, bid, l.map((c) => c.client_id))
      return {
        titulo: def.texto,
        frase: sumidas.length === 0
          ? `Nenhuma cliente sumida há mais de ${dias} dias.`
          : `${plural(sumidas.length, 'cliente não volta', 'clientes não voltam')} há mais de ${dias} dias.`,
        itens: l.map((c) => ({ rotulo: nomes.get(c.client_id)?.name ?? 'Cliente', valor: `desde ${dataCurta(c.ultima)} · ${brl(gasto.get(c.client_id) ?? 0)}` })),
        link: { href: '/admin/sumidos', rotulo: 'Chamar de volta' },
        nota: 'Lista começa por quem mais gastou. Quem tem horário marcado não conta como sumida.',
      }
    }

    case 'aniversario': {
      const mes = hoje.slice(5, 7)
      const linhas = await fetchAll<{ name: string | null; birthday: string | null }>(() =>
        sb.from('customers').select('name, birthday').eq('business_id', bid).not('birthday', 'is', null).order('id', { ascending: true }) as never)
      const l = linhas.filter((c) => c.birthday && c.birthday.slice(5, 7) === mes).sort((a, b) => a.birthday!.slice(8, 10).localeCompare(b.birthday!.slice(8, 10)))
      return {
        titulo: def.texto,
        frase: l.length === 0 ? `Nenhuma cliente com aniversário cadastrado em ${nomeMes(hoje)}.` : `${plural(l.length, 'cliente faz', 'clientes fazem')} aniversário em ${nomeMes(hoje)}.`,
        itens: l.slice(0, 20).map((c) => ({ rotulo: c.name ?? 'Cliente', valor: `dia ${c.birthday!.slice(8, 10)}` })),
        link: { href: '/admin/clientes/campanhas', rotulo: 'Mandar parabéns' },
      }
    }

    case 'voltaram': {
      const r = (await resumoClientes(sb, bid)).filter((c) => c.visitas > 0)
      const voltaram = r.filter((c) => c.visitas >= 2).length
      const taxa = r.length > 0 ? Math.round((voltaram / r.length) * 100) : 0
      return {
        titulo: def.texto,
        frase: r.length === 0 ? 'Ainda não tem visita realizada.' : `${voltaram} de ${r.length} clientes voltaram depois da primeira vez (${taxa}%).`,
        link: { href: '/admin/clientes', rotulo: 'Ver clientes' },
        nota: 'Desde o início: clientes com 2 visitas realizadas ou mais.',
      }
    }

    case 'pontos': {
      const { data } = await sb.from('customers').select('name, total_points').eq('business_id', bid).gt('total_points', 0).order('total_points', { ascending: false }).limit(10)
      const l = data ?? []
      return {
        titulo: def.texto,
        frase: l.length === 0 ? 'Nenhuma cliente com pontos ainda.' : `${l[0].name ?? 'Cliente'} tem mais pontos: ${l[0].total_points}.`,
        itens: l.map((c) => ({ rotulo: (c.name as string) ?? 'Cliente', valor: `${c.total_points} pts` })),
        link: { href: '/admin/clientes', rotulo: 'Ver clientes' },
      }
    }

    case 'dia_cheio':
    case 'horario_cheio': {
      const linhas = await fetchAll<{ appointment_date: string; start_time: string | null }>(() =>
        sb.from('appointments').select('appointment_date, start_time')
          .eq('business_id', bid).neq('status', 'cancelled').eq('historical', false)
          .gte('appointment_date', d.de).lte('appointment_date', d.ate)
          .order('id', { ascending: true }) as never)
      if (linhas.length === 0) return { titulo: def.texto, frase: `Nenhum agendamento ${d.rotulo}.` }
      const m = new Map<string, number>()
      if (def.id === 'dia_cheio') {
        const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
        for (const a of linhas) { const k = DIAS[new Date(a.appointment_date + 'T12:00:00Z').getUTCDay()]; m.set(k, (m.get(k) ?? 0) + 1) }
      } else {
        for (const a of linhas) if (a.start_time) { const k = `${a.start_time.slice(0, 2)}h`; m.set(k, (m.get(k) ?? 0) + 1) }
      }
      const l = top(m, (x) => x, 24)
      const ult = l[l.length - 1]
      return {
        titulo: def.texto,
        frase: def.id === 'dia_cheio'
          ? `${l[0][0]} é seu dia mais cheio ${d.rotulo}: ${plural(l[0][1], 'agendamento', 'agendamentos')}. O mais vazio é ${ult[0].toLowerCase()}.`
          : `O horário mais cheio ${d.rotulo} é ${l[0][0]}: ${plural(l[0][1], 'agendamento', 'agendamentos')}.`,
        itens: (def.id === 'dia_cheio' ? l : [...l].sort((a, b) => a[0].localeCompare(b[0]))).map(([k, v]) => ({ rotulo: k, valor: String(v) })),
        link: { href: '/admin/financeiro/analises', rotulo: 'Ver Análises' },
        nota: 'Conta agendamentos (não valor), sem os cancelados.',
      }
    }

    case 'proxima_semana': {
      const de = addDaysBR(hoje, 1), ate = addDaysBR(hoje, 7)
      const linhas = await fetchAll<{ appointment_date: string }>(() =>
        sb.from('appointments').select('appointment_date')
          .eq('business_id', bid).in('status', ['pending', 'confirmed'])
          .gte('appointment_date', de).lte('appointment_date', ate)
          .order('id', { ascending: true }) as never)
      const m = new Map<string, number>()
      for (const a of linhas) m.set(a.appointment_date, (m.get(a.appointment_date) ?? 0) + 1)
      const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
      return {
        titulo: def.texto,
        frase: `${linhas.length === 0 ? 'Nenhum agendamento' : plural(linhas.length, 'agendamento', 'agendamentos')} nos próximos 7 dias.`,
        itens: [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => ({ rotulo: `${DIAS[new Date(k + 'T12:00:00Z').getUTCDay()]} ${dataCurta(k)}`, valor: String(v) })),
        link: { href: '/admin/marcar', rotulo: 'Ver agenda' },
      }
    }
  }
  return null
}
