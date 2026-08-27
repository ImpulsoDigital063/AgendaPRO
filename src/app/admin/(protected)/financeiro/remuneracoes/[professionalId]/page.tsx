import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
import { redirect, notFound } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getCurrentUser, getCurrentBusiness } from '@/lib/admin-data'
import SubPageHeader from '@/components/admin/SubPageHeader'
import DetalheCalculoLink from '@/components/admin/remuneracoes/DetalheCalculoLink'
import { getApptDiscountMap } from '@/lib/commission-discount'
import { getPackageSessionCommission } from '@/lib/queries/package-session-commission'
import { getGiftCardSessionCommission } from '@/lib/queries/gift-card-session-commission'
import { todayBR, startOfDayBR } from '@/lib/date-br'

const METHOD_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  package: 'Pacote (resgate)',
  credit: 'Cartão de Crédito',
  credit_card: 'Cartão de Crédito',
  debit: 'Cartão de Débito',
  debit_card: 'Cartão de Débito',
  transfer: 'Transferência Bancária',
  other: 'Outro',
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
}

function monthRangeLabel(year: number, month0: number): string {
  const last = new Date(year, month0 + 1, 0).getDate()
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  return `01/${months[month0]}/${year} a ${String(last).padStart(2, '0')}/${months[month0]}/${year}`
}

export default async function RemuneracaoDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ professionalId: string }>
  searchParams: Promise<{ month?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  const business = await getCurrentBusiness(user.id)
  if (!business) redirect(await destinoSemNegocio())

  const { professionalId } = await params
  const sp = await searchParams

  // λ.fuso: mês default ancorado no dia BR (não UTC) · a janela de paid_at usa
  // offset −03:00 (startOfDayBR) senão pagamento 21–24h na virada do mês caía no
  // mês errado (00:00 UTC = 21h BR do dia anterior).
  const ymBR = todayBR()
  let year = parseInt(ymBR.slice(0, 4), 10)
  let month0 = parseInt(ymBR.slice(5, 7), 10) - 1
  if (sp.month) {
    const [y, m] = sp.month.split('-')
    if (y && m) {
      year = parseInt(y, 10)
      month0 = parseInt(m, 10) - 1
    }
  }

  const mmBR = String(month0 + 1).padStart(2, '0')
  const nextYear = month0 === 11 ? year + 1 : year
  const nextMM = String(month0 === 11 ? 1 : month0 + 2).padStart(2, '0')
  const from = startOfDayBR(`${year}-${mmBR}-01`)
  const to = startOfDayBR(`${nextYear}-${nextMM}-01`)
  // Datas puras (YYYY-MM-DD) pro recorte por data do ATENDIMENTO no convênio.
  const fromDate = `${year}-${mmBR}-01`
  const toDate = `${nextYear}-${nextMM}-01`

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Profissional
  const { data: prof } = await sb
    .from('professionals')
    .select('id, name, default_commission_percent:commission_percentage, business_id')
    .eq('id', professionalId)
    .maybeSingle()

  if (!prof || prof.business_id !== business.id) notFound()

  const pct = Number(prof.default_commission_percent ?? 40)

  // Atendimentos pagos no mês
  const { data: appts } = await sb
    .from('appointments')
    .select(`
      id,
      paid_at,
      total_price,
      service_name,
      client_name,
      payment_method,
      commission_payment_id,
      invoice_item_id,
      commission_amount,
      commission_percent,
      appointment_date,
      status,
      company_id,
      company:companies(name)
    `)
    .eq('business_id', business.id)
    .eq('professional_id', professionalId)
    /* Particular entra pela data do PAGAMENTO; convênio entra pela data do
       ATENDIMENTO, pago ou não — mesma âncora da lista de Remunerações.
       Sem os de convênio ainda em aberto, esta tela mostrava R$190 pra Ana
       Paula enquanto a lista mostrava R$310 no mesmo mês: dois totais pra
       mesma pessoa (Eduardo, 27/08). */
    .or(`and(paid_at.gte.${from},paid_at.lt.${to},company_id.is.null),and(appointment_date.gte.${fromDate},appointment_date.lt.${toDate},company_id.not.is.null)`)
    .neq('status', 'cancelled')
    .order('appointment_date', { ascending: false })

  type Row = {
    date: string
    description: string
    client: string
    valorBase: number
    valorRemuneracao: number
    valorPago: number
    pagamentoPendente: number
    paymentMethod: string | null
    veioDeValorFixo: boolean
    percentUsado: number
    /** Nome da empresa quando o atendimento é de convênio · null = particular. */
    convenio: string | null
    /** Convênio já recebido da empresa? Define se a comissão está liberada. */
    convenioRecebido: boolean
  }

  // λ.valor-liquido: comissão incide sobre o valor LÍQUIDO (cupom da comanda
  // já abatido), nunca sobre o bruto. Sem isso o salão paga comissão sobre o
  // dinheiro que o desconto tirou. O desconto vive em invoices.discount ·
  // getApptDiscountMap rateia de volta por appointment (Eduardo 04/07/2026).
  const apptDisc = await getApptDiscountMap(sb, (appts ?? []).map((a) => a.invoice_item_id))

  /* COMISSÃO EM VALOR FIXO (CAF · 21/08/2026): quando o atendimento tem
     commission_amount gravado, ELE manda — é a foto do valor combinado no dia
     em que o atendimento nasceu. Null (todos os outros negócios) → segue a
     porcentagem de sempre, sem mudar um centavo. */
  const rows: Row[] = (appts ?? []).map((a) => {
    const base = Math.max(0, Number(a.total_price ?? 0) - (apptDisc[a.id] ?? 0))
    const fixa = a.commission_amount == null ? null : Number(a.commission_amount)
    /* v134 · porcentagem por SERVIÇO (Studio Isis Melo): o trigger fotografa
       commission_percent no dia. Null → porcentagem da pessoa, como sempre. */
    const pctDoAppt = a.commission_percent != null ? Number(a.commission_percent) : pct
    const remuneracao = fixa ?? (base * pctDoAppt) / 100
    const paid = a.commission_payment_id ? remuneracao : 0
    const pendente = remuneracao - paid
    return {
      date: a.paid_at!,
      description: a.service_name ?? 'Atendimento',
      client: a.client_name ?? '—',
      valorBase: base,
      valorRemuneracao: remuneracao,
      /* Pra tela não escrever "Cálculo: 0%" embaixo de uma comissão de R$45
         que veio de valor fixo — parecia defeito, e num negócio de comissão
         fixa isso acontecia em TODA linha (Eduardo, 27/08). */
      veioDeValorFixo: fixa != null,
      percentUsado: pctDoAppt,
      convenio: (Array.isArray(a.company) ? a.company[0] : a.company)?.name ?? null,
      convenioRecebido: a.paid_at != null,
      valorPago: paid,
      pagamentoPendente: pendente,
      paymentMethod: a.payment_method as string | null,
    }
  })

  // Resgates de pacote do período · comissão sobre valor/sessão (o atendimento
  // tem total_price 0, então não vem pela query de appts acima). Base × pct.
  const sessionComm = await getPackageSessionCommission(sb, business.id, from, to)
  for (const l of (sessionComm[professionalId]?.lines ?? [])) {
    const remuneracao = (l.base * pct) / 100
    rows.push({
      date: l.date,
      description: `${l.serviceName} · resgate de pacote`,
      client: l.packageName,
      valorBase: l.base,
      valorRemuneracao: remuneracao,
      valorPago: 0,
      pagamentoPendente: remuneracao,
      veioDeValorFixo: false,
      percentUsado: pct,
      convenio: null,
      convenioRecebido: true,
      paymentMethod: 'package',
    })
  }
  /* v140 · resgate de cartão presente · mesma lógica do pacote: o atendimento
     entra R$0 na comanda, então a comissão vem da base do vale. */
  const giftComm = await getGiftCardSessionCommission(sb, business.id, from, to)
  for (const l of (giftComm[professionalId]?.lines ?? [])) {
    const remuneracao = (l.base * pct) / 100
    rows.push({
      date: l.date,
      description: `${l.serviceName} · cartão presente`,
      client: l.cardCode,
      valorBase: l.base,
      valorRemuneracao: remuneracao,
      valorPago: 0,
      pagamentoPendente: remuneracao,
      veioDeValorFixo: false,
      percentUsado: pct,
      convenio: null,
      convenioRecebido: true,
      paymentMethod: 'gift_card',
    })
  }

  rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  const totalQty = rows.length
  const totalBase = rows.reduce((s, r) => s + r.valorBase, 0)
  const totalComissoes = rows.reduce((s, r) => s + r.valorRemuneracao, 0)
  const totalPago = rows.reduce((s, r) => s + r.valorPago, 0)
  /* Convênio que a empresa ainda não pagou não é sacável — mesma regra da
     lista: "pagar quando receber", combinado do Gustavo com a equipe. Sem
     descontar aqui, o detalhe prometeria um saque que o caixa não tem. */
  const totalAguardandoConvenio = rows
    .filter((r) => r.convenio && !r.convenioRecebido)
    .reduce((s, r) => s + r.valorRemuneracao, 0)
  const totalPendente = Math.max(0, totalComissoes - totalPago - totalAguardandoConvenio)

  // Por forma de pagamento
  const byMethod: Record<string, number> = {}
  for (const r of rows) {
    const m = r.paymentMethod ?? 'other'
    byMethod[m] = (byMethod[m] ?? 0) + r.valorRemuneracao
  }

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <div className="relative">
        <SubPageHeader
          title="Detalhes"
          subtitle={`${prof.name} · ${monthRangeLabel(year, month0)}`}
          back={`/admin/financeiro/remuneracoes?month=${String(year)}-${String(month0 + 1).padStart(2, '0')}`}
        />
        <div className="max-w-lg mx-auto px-4 py-6 lg:max-w-7xl lg:px-8">
          <p
            className="text-sm font-bold uppercase tracking-widest mb-4"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            Lista detalhada de remunerações
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
            {/* Tabela */}
            <div>
              {rows.length === 0 ? (
                <div
                  className="rounded-2xl p-10 text-center"
                  style={{
                    background: 'var(--admin-surface)',
                    border: '1px solid var(--admin-border)',
                  }}
                >
                  <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                    Nenhum atendimento pago no período
                  </p>
                </div>
              ) : (
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: 'var(--admin-surface)',
                    border: '1px solid var(--admin-border)',
                  }}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr
                          style={{
                            background: 'var(--admin-surface-hi)',
                            borderBottom: '1px solid var(--admin-border)',
                          }}
                        >
                          <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Data Venda</th>
                          <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Descrição</th>
                          <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Valor Base</th>
                          <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Valor Remuneração</th>
                          <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Pago</th>
                          <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Pendente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, idx) => (
                          <tr key={idx} style={{ borderBottom: idx < rows.length - 1 ? '1px solid var(--admin-divider)' : 'none' }}>
                            <td className="px-4 py-3 tabular-nums whitespace-nowrap" style={{ color: 'var(--admin-text-2)' }}>
                              {formatDate(r.date)}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold" style={{ color: 'var(--admin-text)' }}>
                                {r.description}
                              </p>
                              <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
                                {r.client}
                                {/* Forma de pagamento só faz sentido no particular: no
                                    convênio quem paga é a empresa, em lote, e o método
                                    é o do recebimento dela — não daquele atendimento. */}
                                {!r.convenio && r.paymentMethod && ` · ${METHOD_LABELS[r.paymentMethod] ?? r.paymentMethod}`}
                              </p>
                              {/* Diferencia convênio de particular na linha (Eduardo,
                                  27/08). Sem isso as duas naturezas ficavam iguais, e
                                  são pagas por caminhos diferentes: uma no balcão,
                                  outra pelo extrato da empresa. */}
                              {r.convenio && (
                                <span
                                  className="inline-block mt-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                                  style={
                                    r.convenioRecebido
                                      ? { background: 'rgba(14,165,233,0.14)', color: '#0284C7' }
                                      : { background: 'rgba(245,158,11,0.16)', color: '#B45309' }
                                  }
                                  title={
                                    r.convenioRecebido
                                      ? `Convênio ${r.convenio} · já recebido da empresa`
                                      : `Convênio ${r.convenio} · a empresa ainda não pagou`
                                  }
                                >
                                  {r.convenio}
                                  {!r.convenioRecebido && ' · aguardando'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--admin-text)' }}>
                              {formatBRL(r.valorBase)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <p className="tabular-nums font-bold" style={{ color: 'var(--admin-accent)' }}>
                                {formatBRL(r.valorRemuneracao)}
                              </p>
                              <p className="text-[10px]" style={{ color: 'var(--admin-text-faded)' }}>
                                {r.veioDeValorFixo ? (
                                  'Valor fixo do serviço'
                                ) : (
                                  <>
                                    Cálculo: {r.percentUsado}% ·{' '}
                                    <DetalheCalculoLink
                                      valorVenda={r.valorBase}
                                      percent={r.percentUsado}
                                      valorBruto={r.valorRemuneracao}
                                      valorTotal={r.valorRemuneracao}
                                    />
                                  </>
                                )}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums" style={{ color: r.valorPago > 0 ? '#059669' : 'var(--admin-text-mute)' }}>
                              {formatBRL(r.valorPago)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: r.pagamentoPendente > 0 ? 'var(--admin-accent)' : 'var(--admin-text-mute)' }}>
                              {formatBRL(r.pagamentoPendente)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Painel resumo lateral */}
            <aside
              className="rounded-2xl p-5 h-fit lg:sticky lg:top-5"
              style={{
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-faded)' }}>
                Resumo
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--admin-text-mute)' }}>Quantidade</span>
                  <span className="font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                    {totalQty}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--admin-text-mute)' }}>Serviços Sem Desconto</span>
                  <span className="font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                    {formatBRL(totalBase)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--admin-text-mute)' }}>Serviços Com Desconto</span>
                  <span className="font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                    {formatBRL(totalBase)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--admin-text-mute)' }}>Produtos Sem Desconto</span>
                  <span className="font-semibold tabular-nums" style={{ color: 'var(--admin-text-faded)' }}>
                    R$ 0,00
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--admin-text-mute)' }}>Produtos Com Desconto</span>
                  <span className="font-semibold tabular-nums" style={{ color: 'var(--admin-text-faded)' }}>
                    R$ 0,00
                  </span>
                </div>

                <div
                  className="flex justify-between pt-2 mt-2"
                  style={{ borderTop: '1px solid var(--admin-divider)' }}
                >
                  <span style={{ color: 'var(--admin-text-mute)' }}>Total Comissões</span>
                  <span className="font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                    {formatBRL(totalComissoes)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold" style={{ color: 'var(--admin-text)' }}>Total Remunerações</span>
                  <span className="font-bold tabular-nums" style={{ color: 'var(--admin-accent)' }}>
                    {formatBRL(totalComissoes)}
                  </span>
                </div>

                {Object.keys(byMethod).length > 0 && (
                  <>
                    <div
                      className="pt-2 mt-2"
                      style={{ borderTop: '1px solid var(--admin-divider)' }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--admin-text-faded)' }}>
                        Por Forma de Pagamento
                      </p>
                      {Object.entries(byMethod).map(([m, v]) => (
                        <div key={m} className="flex justify-between mb-1">
                          <span style={{ color: 'var(--admin-text-mute)' }}>{METHOD_LABELS[m] ?? m}</span>
                          <span className="font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                            {formatBRL(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div
                  className="pt-2 mt-2 space-y-1.5"
                  style={{ borderTop: '1px solid var(--admin-divider)' }}
                >
                  {totalAguardandoConvenio > 0 && (
                  <div className="flex justify-between text-[13px]">
                    <span style={{ color: 'var(--admin-text-mute)' }}>Aguardando convênio</span>
                    <span className="font-semibold tabular-nums" style={{ color: '#B45309' }}>
                      {formatBRL(totalAguardandoConvenio)}
                    </span>
                  </div>
                  )}
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--admin-text-mute)' }}>Total Já Pago</span>
                    <span className="font-semibold tabular-nums" style={{ color: totalPago > 0 ? '#059669' : 'var(--admin-text-mute)' }}>
                      {formatBRL(totalPago)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold" style={{ color: 'var(--admin-text)' }}>Pendente Pagamento</span>
                    <span className="font-bold tabular-nums" style={{ color: 'var(--admin-accent)' }}>
                      {formatBRL(totalPendente)}
                    </span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}
