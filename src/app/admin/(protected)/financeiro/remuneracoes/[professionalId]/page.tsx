import { redirect, notFound } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getCurrentUser, getCurrentBusiness } from '@/lib/admin-data'
import SubPageHeader from '@/components/admin/SubPageHeader'
import DetalheCalculoLink from '@/components/admin/remuneracoes/DetalheCalculoLink'

const METHOD_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
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
  if (!business) redirect('/cadastro')

  const { professionalId } = await params
  const sp = await searchParams

  const now = new Date()
  let year = now.getFullYear()
  let month0 = now.getMonth()
  if (sp.month) {
    const [y, m] = sp.month.split('-')
    if (y && m) {
      year = parseInt(y, 10)
      month0 = parseInt(m, 10) - 1
    }
  }

  const from = new Date(Date.UTC(year, month0, 1))
  const to = new Date(Date.UTC(year, month0 + 1, 1))

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
      commission_payment_id
    `)
    .eq('business_id', business.id)
    .eq('professional_id', professionalId)
    .gte('paid_at', from.toISOString())
    .lt('paid_at', to.toISOString())
    .not('paid_at', 'is', null)
    .order('paid_at', { ascending: false })

  type Row = {
    date: string
    description: string
    client: string
    valorBase: number
    valorRemuneracao: number
    valorPago: number
    pagamentoPendente: number
    paymentMethod: string | null
  }

  const rows: Row[] = (appts ?? []).map((a) => {
    const base = Number(a.total_price ?? 0)
    const remuneracao = (base * pct) / 100
    const paid = a.commission_payment_id ? remuneracao : 0
    const pendente = remuneracao - paid
    return {
      date: a.paid_at!,
      description: a.service_name ?? 'Atendimento',
      client: a.client_name ?? '—',
      valorBase: base,
      valorRemuneracao: remuneracao,
      valorPago: paid,
      pagamentoPendente: pendente,
      paymentMethod: a.payment_method as string | null,
    }
  })

  const totalQty = rows.length
  const totalBase = rows.reduce((s, r) => s + r.valorBase, 0)
  const totalComissoes = rows.reduce((s, r) => s + r.valorRemuneracao, 0)
  const totalPago = rows.reduce((s, r) => s + r.valorPago, 0)
  const totalPendente = totalComissoes - totalPago

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
                                {r.paymentMethod && ` · ${METHOD_LABELS[r.paymentMethod] ?? r.paymentMethod}`}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--admin-text)' }}>
                              {formatBRL(r.valorBase)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <p className="tabular-nums font-bold" style={{ color: 'var(--admin-accent)' }}>
                                {formatBRL(r.valorRemuneracao)}
                              </p>
                              <p className="text-[10px]" style={{ color: 'var(--admin-text-faded)' }}>
                                Cálculo: {pct}% ·{' '}
                                <DetalheCalculoLink
                                  valorVenda={r.valorBase}
                                  percent={pct}
                                  valorBruto={r.valorRemuneracao}
                                  valorTotal={r.valorRemuneracao}
                                />
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
