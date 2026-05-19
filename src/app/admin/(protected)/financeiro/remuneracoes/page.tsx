import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getCurrentUser, getCurrentBusiness } from '@/lib/admin-data'
import SubPageHeader from '@/components/admin/SubPageHeader'
import { IconChevronLeft, IconChevronRight } from '@/components/ui/Icon'

type ProfRow = {
  id: string
  name: string
  default_commission_percent: number
  valorTotal: number
  pago: number
  pendente: number
  valesPendentes: number
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function monthLabel(year: number, month0: number): string {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  return `${months[month0]}/${year}`
}

function shiftMonth(year: number, month0: number, delta: number): { year: number; month0: number; iso: string } {
  const d = new Date(Date.UTC(year, month0 + delta, 1))
  return {
    year: d.getUTCFullYear(),
    month0: d.getUTCMonth(),
    iso: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
  }
}

export default async function RemuneracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  const business = await getCurrentBusiness(user.id)
  if (!business) redirect('/cadastro')

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
  const fromDate = from.toISOString().slice(0, 10)
  const toDate = to.toISOString().slice(0, 10)

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const [{ data: profs }, { data: paidAppts }, { data: payments }, { data: vouchers }] = await Promise.all([
    sb
      .from('professionals')
      .select('id, name, default_commission_percent, is_receptionist, active')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('name'),
    sb
      .from('appointments')
      .select('professional_id, paid_at, total_price')
      .eq('business_id', business.id)
      .gte('paid_at', from.toISOString())
      .lt('paid_at', to.toISOString())
      .not('paid_at', 'is', null),
    sb
      .from('commission_payments')
      .select('professional_id, paid_amount')
      .eq('business_id', business.id)
      .gte('period_start', fromDate)
      .lt('period_start', toDate),
    sb
      .from('professional_vouchers')
      .select('professional_id, amount, used_in_payment_id')
      .eq('business_id', business.id)
      .is('used_in_payment_id', null),
  ])

  // Filtra non-recep
  const activeProfs = (profs ?? []).filter((p) => !p.is_receptionist)

  // Calcula por prof
  const rows: ProfRow[] = activeProfs.map((p) => {
    const pct = Number(p.default_commission_percent ?? 40)
    const sumPaid = (paidAppts ?? [])
      .filter((a) => a.professional_id === p.id)
      .reduce((s, a) => s + Number(a.total_price ?? 0), 0)
    const valorTotal = (sumPaid * pct) / 100

    const pago = (payments ?? [])
      .filter((cp) => cp.professional_id === p.id)
      .reduce((s, cp) => s + Number(cp.paid_amount ?? 0), 0)

    const valesPendentes = (vouchers ?? [])
      .filter((v) => v.professional_id === p.id)
      .reduce((s, v) => s + Number(v.amount ?? 0), 0)

    return {
      id: p.id,
      name: p.name,
      default_commission_percent: pct,
      valorTotal,
      pago,
      pendente: valorTotal - pago,
      valesPendentes,
    }
  })

  const totalRemuneracoes = rows.reduce((s, r) => s + r.valorTotal, 0)
  const totalPago = rows.reduce((s, r) => s + r.pago, 0)
  const totalValesPendentes = rows.reduce((s, r) => s + r.valesPendentes, 0)
  const pendentePagamento = totalRemuneracoes - totalPago

  const prev = shiftMonth(year, month0, -1)
  const next = shiftMonth(year, month0, 1)
  const isCurrent =
    year === now.getFullYear() && month0 === now.getMonth()

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <div className="relative">
        <SubPageHeader title="Remunerações" subtitle={business.name} back="/admin/financeiro" />
        <div className="max-w-lg mx-auto px-4 py-6 lg:max-w-7xl lg:px-8">
          {/* Navegação por mês */}
          <div className="flex items-center gap-2 mb-4">
            <Link
              href={`/admin/financeiro/remuneracoes?month=${prev.iso}`}
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: 'var(--admin-surface)',
                color: 'var(--admin-text-mute)',
                border: '1px solid var(--admin-border)',
              }}
              aria-label="Mês anterior"
            >
              <IconChevronLeft size={16} />
            </Link>
            <div
              className="flex-1 text-center font-bold text-base capitalize"
              style={{ color: 'var(--admin-text)' }}
            >
              {monthLabel(year, month0)}
            </div>
            <Link
              href={`/admin/financeiro/remuneracoes?month=${next.iso}`}
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: 'var(--admin-surface)',
                color: 'var(--admin-text-mute)',
                border: '1px solid var(--admin-border)',
              }}
              aria-label="Próximo mês"
            >
              <IconChevronRight size={16} />
            </Link>
            {!isCurrent && (
              <Link
                href="/admin/financeiro/remuneracoes"
                className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider"
                style={{
                  background: 'var(--admin-accent)',
                  color: '#fff',
                }}
              >
                Hoje
              </Link>
            )}
          </div>

          {/* Tabela */}
          {rows.length === 0 ? (
            <div
              className="rounded-2xl p-10 text-center"
              style={{
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                Nenhum profissional cadastrado
              </p>
            </div>
          ) : (
            <div
              className="rounded-2xl overflow-hidden mb-6"
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
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                        Profissional
                      </th>
                      <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                        Valor Total (R$)
                      </th>
                      <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                        Valor Pago (R$)
                      </th>
                      <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                        Pendente Pagamento (R$)
                      </th>
                      <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                        Vales Pendentes (R$)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => (
                      <tr
                        key={r.id}
                        style={{ borderBottom: idx < rows.length - 1 ? '1px solid var(--admin-divider)' : 'none' }}
                      >
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-3">
                            <span
                              className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{ background: 'var(--admin-surface-hi)', color: 'var(--admin-text-mute)' }}
                            >
                              {r.name.slice(0, 1).toUpperCase()}
                            </span>
                            <div>
                              <p className="font-semibold" style={{ color: 'var(--admin-text)' }}>
                                {r.name}
                              </p>
                              <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
                                Comissão {r.default_commission_percent}%
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: 'var(--admin-text)' }}>
                          {formatBRL(r.valorTotal)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: r.pago > 0 ? '#059669' : 'var(--admin-text-mute)' }}>
                          {formatBRL(r.pago)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold" style={{ color: r.pendente > 0 ? 'var(--admin-accent)' : 'var(--admin-text-mute)' }}>
                          {formatBRL(r.pendente)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: r.valesPendentes > 0 ? 'var(--admin-warning,#F59E0B)' : 'var(--admin-text-mute)' }}>
                          {formatBRL(r.valesPendentes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Hint */}
          <p className="text-[11px] mt-1 text-center" style={{ color: 'var(--admin-text-faded)' }}>
            Comissão calculada no faturamento (% configurável por profissional) · Duplo-click na linha pra ações (próxima etapa)
          </p>
        </div>
      </div>

      {/* Painel resumo flutuante · canto inferior direito (desktop) */}
      {rows.length > 0 && (
        <div
          className="hidden lg:block fixed rounded-2xl p-4 z-30"
          style={{
            bottom: 24,
            right: 24,
            width: 280,
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-faded)' }}>
            Resumo do mês
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--admin-text-mute)' }}>Total Remunerações</span>
              <span className="font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                {formatBRL(totalRemuneracoes)}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--admin-text-mute)' }}>Total Pago</span>
              <span className="font-semibold tabular-nums" style={{ color: '#059669' }}>
                {formatBRL(totalPago)}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--admin-text-mute)' }}>Vales Pendentes</span>
              <span className="font-semibold tabular-nums" style={{ color: 'var(--admin-warning,#F59E0B)' }}>
                {formatBRL(totalValesPendentes)}
              </span>
            </div>
            <div
              className="flex justify-between pt-2"
              style={{ borderTop: '1px solid var(--admin-divider)' }}
            >
              <span className="font-bold" style={{ color: 'var(--admin-text)' }}>
                Pendente Pagamento
              </span>
              <span className="font-bold tabular-nums" style={{ color: 'var(--admin-accent)' }}>
                {formatBRL(pendentePagamento)}
              </span>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
