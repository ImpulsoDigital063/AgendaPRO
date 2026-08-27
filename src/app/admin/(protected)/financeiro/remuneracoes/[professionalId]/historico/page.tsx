import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
import { redirect, notFound } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getCurrentUser, getCurrentBusiness } from '@/lib/admin-data'
import SubPageHeader from '@/components/admin/SubPageHeader'

export const dynamic = 'force-dynamic'

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
}

function formatPeriod(start: string, end: string): string {
  return `${formatDate(start)} a ${formatDate(end)}`
}

function formatDateTime(d: string): string {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' às '
    + new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default async function HistoricoPagamentosPage({
  params,
}: {
  params: Promise<{ professionalId: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  const business = await getCurrentBusiness(user.id)
  if (!business) redirect(await destinoSemNegocio())

  const { professionalId } = await params

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: prof, error: profErr } = await sb
    .from('professionals')
    .select('id, name, business_id, default_commission_percent:commission_percentage')
    .eq('id', professionalId)
    .maybeSingle()

  if (profErr) console.error('[historico] erro:', profErr.message)
  if (!prof || prof.business_id !== business.id) notFound()

  const { data: payments, error: payErr } = await sb
    .from('commission_payments')
    .select('id, period_start, period_end, total_amount, paid_amount, bonus_amount, bonus_reason, notes, paid_at, created_at')
    .eq('professional_id', professionalId)
    .order('paid_at', { ascending: false })

  if (payErr) console.error('[historico] erro payments:', payErr.message)

  /* v141 · bônus entra no total pago: saiu do caixa junto com a comissão. */
  const totalPago = (payments ?? []).reduce(
    (s, p) => s + Number(p.paid_amount ?? 0) + Number(p.bonus_amount ?? 0),
    0
  )

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <div className="relative">
        <SubPageHeader
          title="Histórico de Pagamentos"
          subtitle={prof.name}
          back={`/admin/financeiro/remuneracoes`}
        />
        <div className="max-w-lg mx-auto px-4 py-6 lg:max-w-5xl lg:px-8">
          <p
            className="text-sm font-bold uppercase tracking-widest mb-4"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            Lista de todos os pagamentos de remunerações registrados
          </p>

          {/* Sumário */}
          {(payments?.length ?? 0) > 0 && (
            <div
              className="rounded-2xl p-4 mb-4 flex items-center justify-between"
              style={{
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                  Total Pago
                </p>
                <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: '#059669' }}>
                  {formatBRL(totalPago)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                  Pagamentos
                </p>
                <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: 'var(--admin-text)' }}>
                  {payments?.length ?? 0}
                </p>
              </div>
            </div>
          )}

          {(payments?.length ?? 0) === 0 ? (
            <div
              className="rounded-2xl p-10 text-center"
              style={{
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                Nenhum pagamento de comissão foi encontrado
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
                Pagamentos vão aparecer aqui conforme forem registrados em Remunerações.
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
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Data Pagamento</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Período</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Total Comissão</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Valor Pago</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(payments ?? []).map((p, idx) => {
                      const total = Number(p.total_amount ?? 0)
                      const paid = Number(p.paid_amount ?? 0)
                      const bonus = Number(p.bonus_amount ?? 0)
                      /* v141 · lançamento só de bônus (total 0, comissão 0) não é
                         pagamento parcial — é prêmio. Sem esta guarda ele apareceria
                         como "Parcial · faltam R$ 0,00". */
                      const parcial = total > 0 && paid < total
                      return (
                        <tr
                          key={p.id}
                          style={{ borderBottom: idx < (payments?.length ?? 0) - 1 ? '1px solid var(--admin-divider)' : 'none' }}
                        >
                          <td className="px-4 py-3 tabular-nums whitespace-nowrap" style={{ color: 'var(--admin-text)' }}>
                            <p className="text-sm">{formatDateTime(p.paid_at)}</p>
                            <p className="text-[10px]" style={{ color: 'var(--admin-text-faded)' }}>
                              Registrado em {formatDateTime(p.created_at)}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-sm" style={{ color: 'var(--admin-text-2)' }}>
                            {formatPeriod(p.period_start, p.period_end)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--admin-text)' }}>
                            {formatBRL(total)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className="tabular-nums font-bold" style={{ color: '#059669' }}>
                              {formatBRL(paid + bonus)}
                            </p>
                            {bonus > 0 && (
                              <p className="text-[10px] font-bold" style={{ color: 'var(--admin-warning,#F59E0B)' }}>
                                inclui bônus {formatBRL(bonus)}
                                {p.bonus_reason ? ` · ${p.bonus_reason}` : ''}
                              </p>
                            )}
                            {parcial && (
                              <p className="text-[10px]" style={{ color: 'var(--admin-warning,#F59E0B)' }}>
                                Parcial · faltam {formatBRL(total - paid)}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                            {p.notes ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
