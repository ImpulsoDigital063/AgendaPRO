'use client'

import Link from 'next/link'
import FinancePeriodTabs from './FinancePeriodTabs'
import FinanceAppointmentList, { type FinanceRow } from './FinanceAppointmentList'
import { IconDollar, IconClock, IconCheck, IconChevronRight } from '@/components/ui/Icon'
import { initialsFor, avatarGradient } from '@/lib/client-display'

export type AppointmentRow = {
  id: string
  client_name: string
  client_phone: string
  appointment_date: string
  start_time: string
  status: string
  service_name: string | null
  total_price: number | null
  paid_at: string | null
  payment_method: 'pix' | 'cash' | 'card' | 'courtesy' | null
  professional: { id: string; name: string; commission_percentage: number; employment_type?: string | null } | null
}

type Props = {
  appointments: AppointmentRow[]
  periodo: string
  totalExpenses?: number
}

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const PERIODO_LABEL: Record<string, string> = {
  hoje: 'Hoje',
  semana: 'Últimos 7 dias',
  mes: 'Este mês',
}

export default function FinanceiroView({ appointments, periodo, totalExpenses = 0 }: Props) {
  // Nova semantica:
  // - Realizado = paid_at != null (dinheiro ja recebido, qualquer
  //   metodo)
  // - A receber = total_price > 0 + (confirmed ou completed) +
  //   paid_at == null (atendimento confirmado, ainda nao pago)
  // - Faturado = soma dos dois (todo dinheiro do periodo)
  const pagos = appointments.filter((a) => a.paid_at && a.total_price)
  const naoPagos = appointments.filter(
    (a) =>
      a.paid_at == null &&
      a.total_price !== null &&
      a.total_price > 0 &&
      (a.status === 'confirmed' || a.status === 'completed')
  )
  const ativos = [...pagos, ...naoPagos]

  const totalRealizado = pagos.reduce((sum, a) => sum + (a.total_price ?? 0), 0)
  const totalPendente = naoPagos.reduce((sum, a) => sum + (a.total_price ?? 0), 0)
  const totalFaturado = ativos.reduce((sum, a) => sum + (a.total_price ?? 0), 0)
  const ticketMedio = ativos.length > 0 ? totalFaturado / ativos.length : 0

  // Breakdown por método de pagamento (so dos pagos)
  type MethodKey = 'pix' | 'cash' | 'card' | 'courtesy'
  const byMethod: Record<MethodKey, number> = { pix: 0, cash: 0, card: 0, courtesy: 0 }
  for (const a of pagos) {
    if (a.payment_method) byMethod[a.payment_method] += a.total_price ?? 0
  }

  // Agrupamento por profissional — comissao baseada em PAGOS
  // (so paga comissao do que ja entrou no caixa). Se pagamento ainda
  // nao entrou, nao gera obrigacao de pagar comissao.
  type ProfEntry = {
    id: string
    name: string
    commission_percentage: number
    total: number
    count: number
  }
  const profMap: Record<string, ProfEntry> = {}
  for (const a of pagos) {
    const prof = a.professional
    if (!prof) continue
    if ((prof.employment_type ?? 'commissioned') === 'employed') continue
    if (!profMap[prof.id]) {
      profMap[prof.id] = {
        id: prof.id,
        name: prof.name,
        commission_percentage: prof.commission_percentage ?? 0,
        total: 0,
        count: 0,
      }
    }
    profMap[prof.id].total += a.total_price ?? 0
    profMap[prof.id].count += 1
  }
  const profList = Object.values(profMap)
  const showCommission = profList.length > 1 || profList.some((p) => p.commission_percentage > 0)

  const rows: FinanceRow[] = appointments.map((a) => ({
    id: a.id,
    client_name: a.client_name,
    appointment_date: a.appointment_date,
    start_time: a.start_time,
    status: a.status,
    service_name: a.service_name,
    total_price: a.total_price,
    paid_at: a.paid_at,
    payment_method: a.payment_method,
    professional_name: a.professional?.name ?? null,
  }))

  return (
    <div className="space-y-5">
      <FinancePeriodTabs periodo={periodo} />

      {/* Hero KPI: Realizado (dinheiro real no caixa) */}
      <div
        className="rounded-2xl p-4 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, rgba(16,185,129,0.18) 0%, color-mix(in srgb, var(--brand-primary) 12%, var(--admin-surface)) 100%)',
          border: '1px solid var(--admin-border)',
        }}
      >
        <div
          className="absolute -top-6 -right-6 w-28 h-28 rounded-full blur-2xl opacity-70 pointer-events-none"
          style={{ background: 'rgba(16,185,129,0.35)' }}
        />
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--admin-text-faded)' }}
            >
              Realizado · {PERIODO_LABEL[periodo]}
            </p>
            <p
              className="text-3xl font-extrabold mt-1 leading-none tabular-nums"
              style={{ color: 'var(--admin-text)' }}
            >
              {formatPrice(totalRealizado)}
            </p>
            <p className="text-[11px] mt-2" style={{ color: 'var(--admin-text-mute)' }}>
              {pagos.length} atendimento{pagos.length === 1 ? '' : 's'} pago{pagos.length === 1 ? '' : 's'}
            </p>
          </div>
          <span
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(16,185,129,0.2)',
              color: '#16A34A',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
            }}
          >
            <IconCheck size={22} />
          </span>
        </div>
      </div>

      {/* Pendente + Faturado total + Ticket médio */}
      <div className="grid grid-cols-3 gap-2">
        <KpiTile
          label="A receber"
          value={formatPrice(totalPendente)}
          sub={`${naoPagos.length} pendente${naoPagos.length === 1 ? '' : 's'}`}
          icon={<IconClock size={14} />}
          tone="warn"
        />
        <KpiTile
          label="Faturado"
          value={formatPrice(totalFaturado)}
          sub={`${ativos.length} no total`}
          icon={<IconDollar size={14} />}
          tone="neutral"
        />
        <KpiTile
          label="Ticket médio"
          value={formatPrice(ticketMedio)}
          sub="por atendimento"
          tone="accent"
        />
      </div>

      {/* Card LUCRO REAL (receita - despesas) */}
      <Link
        href="/admin/financeiro/despesas"
        className="block rounded-2xl p-4 transition-transform active:scale-[0.99]"
        style={{
          background:
            totalRealizado - totalExpenses >= 0
              ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))'
              : 'linear-gradient(135deg, rgba(239,68,68,0.14), rgba(239,68,68,0.04))',
          border: '1px solid var(--admin-border)',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
              Lucro real do período
            </p>
            <p
              className="text-2xl font-extrabold mt-1 leading-none tabular-nums"
              style={{ color: totalRealizado - totalExpenses >= 0 ? '#10B981' : '#EF4444' }}
            >
              {formatPrice(totalRealizado - totalExpenses)}
            </p>
            <p className="text-[11px] mt-2" style={{ color: 'var(--admin-text-mute)' }}>
              {formatPrice(totalRealizado)} <span style={{ color: 'var(--admin-text-faded)' }}>recebido</span>
              {' · '}
              <span style={{ color: '#EF4444' }}>− {formatPrice(totalExpenses)}</span>{' '}
              <span style={{ color: 'var(--admin-text-faded)' }}>despesas</span>
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold flex-shrink-0" style={{ color: 'var(--admin-accent)' }}>
            Despesas
            <IconChevronRight size={14} />
          </div>
        </div>
      </Link>

      {/* Breakdown por método de pagamento (só aparece se já recebeu algo) */}
      {totalRealizado > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-mute)' }}>
            Recebido por método
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <MethodTile label="PIX"      value={byMethod.pix}      letter="P" color="#10B981" />
            <MethodTile label="Dinheiro" value={byMethod.cash}     letter="$" color="#16A34A" />
            <MethodTile label="Cartão"   value={byMethod.card}     letter="C" color="#3B82F6" />
            <MethodTile label="Cortesia" value={byMethod.courtesy} letter="•" color="#A855F7" />
          </div>
        </section>
      )}

      {/* Comissão por profissional (só se relevante) */}
      {showCommission && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-mute)' }}>
            Comissão por profissional
          </h2>
          <div className="space-y-2">
            {profList.map((prof) => {
              const commission = prof.total * (prof.commission_percentage / 100)
              return (
                <div key={prof.id} className="admin-card p-3.5">
                  <div className="flex items-center gap-3 mb-2.5">
                    <span
                      aria-hidden
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                      style={{
                        background: avatarGradient(prof.name),
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
                      }}
                    >
                      {initialsFor(prof.name)}
                    </span>
                    <p className="font-semibold text-sm flex-1 truncate" style={{ color: 'var(--admin-text)' }}>
                      {prof.name}
                    </p>
                    <span
                      className="text-[10px] font-bold px-2 py-1 rounded-full"
                      style={{
                        background: 'var(--admin-accent-bg)',
                        color: 'var(--admin-accent)',
                        border: '1px solid var(--admin-accent-border)',
                      }}
                    >
                      {prof.commission_percentage}%
                    </span>
                  </div>
                  <div
                    className="grid grid-cols-3 gap-2 pt-2.5"
                    style={{ borderTop: '1px solid var(--admin-divider)' }}
                  >
                    <ProfStat label="Gerou" value={formatPrice(prof.total)} />
                    <ProfStat label="Atendeu" value={`${prof.count}`} />
                    <ProfStat label="A pagar" value={formatPrice(commission)} highlight />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Lista de agendamentos */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-mute)' }}>
          Agendamentos · {PERIODO_LABEL[periodo]}
        </h2>
        <FinanceAppointmentList items={rows} />
      </section>
    </div>
  )
}

function KpiTile({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string
  value: string
  sub: string
  icon?: React.ReactNode
  tone: 'warn' | 'neutral' | 'accent'
}) {
  const colorMap = {
    warn: 'var(--admin-warn)',
    neutral: 'var(--admin-text)',
    accent: 'var(--admin-accent)',
  }
  return (
    <div className="admin-card p-2.5">
      <div className="flex items-center gap-1 mb-0.5" style={{ color: 'var(--admin-text-faded)' }}>
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-wider truncate">
          {label}
        </p>
      </div>
      <p className="text-sm font-bold leading-tight tabular-nums truncate" style={{ color: colorMap[tone] }}>
        {value}
      </p>
      <p className="text-[10px] mt-1 truncate" style={{ color: 'var(--admin-text-faded)' }}>
        {sub}
      </p>
    </div>
  )
}

function MethodTile({
  label,
  value,
  letter,
  color,
}: {
  label: string
  value: number
  letter: string
  color: string
}) {
  const has = value > 0
  return (
    <div
      className="admin-card p-3 flex items-center gap-3"
      style={{ opacity: has ? 1 : 0.55 }}
    >
      <span
        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
        style={{
          background: `${color}1F`,
          color: color,
        }}
      >
        {letter}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider truncate" style={{ color: 'var(--admin-text-faded)' }}>
          {label}
        </p>
        <p className="text-sm font-bold tabular-nums leading-tight truncate" style={{ color: 'var(--admin-text)' }}>
          {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
      </div>
    </div>
  )
}

function ProfStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
        {label}
      </p>
      <p
        className="font-bold text-sm mt-0.5 tabular-nums leading-tight"
        style={{ color: highlight ? 'var(--admin-success)' : 'var(--admin-text)' }}
      >
        {value}
      </p>
    </div>
  )
}
