import { redirect } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getCurrentUser, getCurrentBusiness } from '@/lib/admin-data'
import SubPageHeader from '@/components/admin/SubPageHeader'

type CashRow = {
  saldoInicial: number
  receitas: number
  despesas: number
  resultado: number
  saldoFinal: number
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function monthLabel(year: number, month0: number): string {
  // month0: 0-11
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${months[month0]}/${String(year).slice(2)}`
}

function rangeForMonth(year: number, month0: number): { from: string; to: string } {
  const from = new Date(Date.UTC(year, month0, 1))
  const to = new Date(Date.UTC(year, month0 + 1, 1))
  return { from: from.toISOString(), to: to.toISOString() }
}

export default async function FluxoCaixaPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  const business = await getCurrentBusiness(user.id)
  if (!business) redirect('/cadastro')

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Visão Mensal · 4 últimos meses (atual + 3 anteriores)
  const now = new Date()
  const currentY = now.getFullYear()
  const currentM = now.getMonth()
  const months: { year: number; month0: number; label: string }[] = []
  for (let i = 3; i >= 0; i--) {
    const d = new Date(currentY, currentM - i, 1)
    months.push({
      year: d.getFullYear(),
      month0: d.getMonth(),
      label: monthLabel(d.getFullYear(), d.getMonth()),
    })
  }

  // Busca todos os pagamentos + despesas do range que cobre os 4 meses + algum anterior pro Saldo Inicial
  const fullRangeFrom = new Date(Date.UTC(months[0].year, months[0].month0, 1))
  const fullRangeTo = new Date(Date.UTC(currentY, currentM + 1, 1))

  // Pra Saldo Inicial do mês mais antigo: precisa saber acumulado TUDO até esse mês
  const startOfPeriod = fullRangeFrom.toISOString()

  // Receitas: appointments com paid_at (modelo híbrido) · ignora futuros
  // + Despesas no período · + Saldo acumulado ANTERIOR pra calcular Saldo Inicial
  const [
    { data: paidAppts },
    { data: expensesData },
    { data: priorR },
    { data: priorD },
  ] = await Promise.all([
    sb
      .from('appointments')
      .select('paid_at, total_price')
      .eq('business_id', business.id)
      .gte('paid_at', fullRangeFrom.toISOString())
      .lt('paid_at', fullRangeTo.toISOString())
      .not('paid_at', 'is', null),
    sb
      .from('expenses')
      .select('paid_at, amount')
      .eq('business_id', business.id)
      .gte('paid_at', fullRangeFrom.toISOString())
      .lt('paid_at', fullRangeTo.toISOString()),
    sb
      .from('appointments')
      .select('total_price')
      .eq('business_id', business.id)
      .lt('paid_at', startOfPeriod)
      .not('paid_at', 'is', null),
    sb
      .from('expenses')
      .select('amount')
      .eq('business_id', business.id)
      .lt('paid_at', startOfPeriod),
  ])

  const priorReceitas = (priorR ?? []).reduce((s, a) => s + Number(a.total_price ?? 0), 0)
  const priorDespesas = (priorD ?? []).reduce((s, e) => s + Number(e.amount ?? 0), 0)
  const saldoAcumulado = priorReceitas - priorDespesas

  // Monta receitas/despesas por mês
  const rows: Map<string, CashRow> = new Map()
  for (const m of months) {
    rows.set(`${m.year}-${m.month0}`, {
      saldoInicial: 0,
      receitas: 0,
      despesas: 0,
      resultado: 0,
      saldoFinal: 0,
    })
  }

  for (const a of paidAppts ?? []) {
    if (!a.paid_at) continue
    const d = new Date(a.paid_at)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const row = rows.get(key)
    if (row) row.receitas += Number(a.total_price ?? 0)
  }

  for (const e of expensesData ?? []) {
    if (!e.paid_at) continue
    const d = new Date(e.paid_at)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const row = rows.get(key)
    if (row) row.despesas += Number(e.amount ?? 0)
  }

  // Calcula saldo encadeado
  let acc = saldoAcumulado
  for (const m of months) {
    const row = rows.get(`${m.year}-${m.month0}`)!
    row.saldoInicial = acc
    row.resultado = row.receitas - row.despesas
    row.saldoFinal = row.saldoInicial + row.resultado
    acc = row.saldoFinal
  }

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <div className="relative">
        <SubPageHeader title="Fluxo de Caixa" subtitle={business.name} back="/admin/financeiro" />
        <div className="max-w-lg mx-auto px-4 py-6 lg:max-w-7xl lg:px-8">
          {/* Toggle de visão · só Mensal por enquanto */}
          <div className="mb-4">
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-70"
              style={{
                background: 'var(--admin-surface)',
                color: 'var(--admin-text)',
                border: '1px solid var(--admin-border)',
              }}
              title="Visão Diária · Semanal · Anual vêm na próxima etapa"
            >
              Visão Mensal
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {/* Tabela matricial */}
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
                    <th
                      className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider"
                      style={{ color: 'var(--admin-text-mute)', minWidth: 180 }}
                    />
                    {months.map((m) => (
                      <th
                        key={`${m.year}-${m.month0}`}
                        className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: 'var(--admin-text-mute)' }}
                      >
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Saldo Inicial */}
                  <tr style={{ borderBottom: '1px solid var(--admin-divider)' }}>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--admin-text)' }}>
                      Saldo Inicial
                    </td>
                    {months.map((m) => {
                      const row = rows.get(`${m.year}-${m.month0}`)!
                      return (
                        <td
                          key={`si-${m.year}-${m.month0}`}
                          className="px-4 py-3 text-right tabular-nums font-semibold"
                          style={{ color: row.saldoInicial < 0 ? 'var(--admin-danger,#EF4444)' : 'var(--admin-text)' }}
                        >
                          {formatBRL(row.saldoInicial)}
                        </td>
                      )
                    })}
                  </tr>

                  {/* Receitas · fundo verde pálido */}
                  <tr
                    style={{
                      background: 'color-mix(in srgb, #10B981 8%, transparent)',
                      borderBottom: '1px solid var(--admin-divider)',
                    }}
                  >
                    <td className="px-4 py-3 font-semibold" style={{ color: '#059669' }}>
                      Receitas
                    </td>
                    {months.map((m) => {
                      const row = rows.get(`${m.year}-${m.month0}`)!
                      return (
                        <td
                          key={`r-${m.year}-${m.month0}`}
                          className="px-4 py-3 text-right tabular-nums font-bold"
                          style={{ color: '#059669' }}
                        >
                          {formatBRL(row.receitas)}
                        </td>
                      )
                    })}
                  </tr>

                  {/* Despesas · fundo vermelho pálido */}
                  <tr
                    style={{
                      background: 'color-mix(in srgb, #EF4444 8%, transparent)',
                      borderBottom: '1px solid var(--admin-divider)',
                    }}
                  >
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--admin-danger,#EF4444)' }}>
                      Despesas
                    </td>
                    {months.map((m) => {
                      const row = rows.get(`${m.year}-${m.month0}`)!
                      return (
                        <td
                          key={`d-${m.year}-${m.month0}`}
                          className="px-4 py-3 text-right tabular-nums font-bold"
                          style={{ color: 'var(--admin-danger,#EF4444)' }}
                        >
                          {formatBRL(row.despesas)}
                        </td>
                      )
                    })}
                  </tr>

                  {/* Resultado Líquido */}
                  <tr style={{ borderBottom: '1px solid var(--admin-divider)' }}>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--admin-text)' }}>
                      Resultado Líquido
                    </td>
                    {months.map((m) => {
                      const row = rows.get(`${m.year}-${m.month0}`)!
                      return (
                        <td
                          key={`res-${m.year}-${m.month0}`}
                          className="px-4 py-3 text-right tabular-nums font-semibold"
                          style={{ color: row.resultado < 0 ? 'var(--admin-danger,#EF4444)' : row.resultado > 0 ? '#059669' : 'var(--admin-text-mute)' }}
                        >
                          {formatBRL(row.resultado)}
                        </td>
                      )
                    })}
                  </tr>

                  {/* Saldo Final */}
                  <tr style={{ background: 'var(--admin-surface-hi)' }}>
                    <td className="px-4 py-3 font-bold" style={{ color: 'var(--admin-text)' }}>
                      Saldo Final
                    </td>
                    {months.map((m) => {
                      const row = rows.get(`${m.year}-${m.month0}`)!
                      return (
                        <td
                          key={`sf-${m.year}-${m.month0}`}
                          className="px-4 py-3 text-right tabular-nums font-bold"
                          style={{ color: row.saldoFinal < 0 ? 'var(--admin-danger,#EF4444)' : 'var(--admin-accent)' }}
                        >
                          {formatBRL(row.saldoFinal)}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Hint */}
          <p className="text-[11px] mt-3 text-center" style={{ color: 'var(--admin-text-faded)' }}>
            Receitas: atendimentos pagos no período · Despesas: lançamentos manuais ·
            Saldo Inicial = Saldo Final do mês anterior
          </p>
        </div>
      </div>
    </main>
  )
}
