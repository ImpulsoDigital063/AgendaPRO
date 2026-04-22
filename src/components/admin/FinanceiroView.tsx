'use client'

import FinancePeriodTabs from './FinancePeriodTabs'
import FinanceAppointmentList, { type FinanceRow } from './FinanceAppointmentList'
import { IconDollar, IconClock, IconCheck } from '@/components/ui/Icon'
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
  professional: { id: string; name: string; commission_percentage: number } | null
}

type Props = {
  appointments: AppointmentRow[]
  periodo: string
}

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const PERIODO_LABEL: Record<string, string> = {
  hoje: 'Hoje',
  semana: 'Últimos 7 dias',
  mes: 'Este mês',
}

export default function FinanceiroView({ appointments, periodo }: Props) {
  const ativos = appointments.filter(
    (a) => a.total_price !== null && a.total_price > 0 && (a.status === 'confirmed' || a.status === 'completed')
  )
  const realizados = appointments.filter((a) => a.status === 'completed' && a.total_price)
  const pendentes = appointments.filter((a) => a.status === 'confirmed' && a.total_price)

  const totalFaturado = ativos.reduce((sum, a) => sum + (a.total_price ?? 0), 0)
  const totalRealizado = realizados.reduce((sum, a) => sum + (a.total_price ?? 0), 0)
  const totalPendente = pendentes.reduce((sum, a) => sum + (a.total_price ?? 0), 0)
  const ticketMedio = ativos.length > 0 ? totalFaturado / ativos.length : 0

  // Agrupamento por profissional (só aparece se tem >1 prof OU comissão > 0)
  type ProfEntry = {
    id: string
    name: string
    commission_percentage: number
    total: number
    count: number
  }
  const profMap: Record<string, ProfEntry> = {}
  for (const a of realizados) {
    const prof = a.professional
    if (!prof) continue
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
              {realizados.length} atendimento{realizados.length === 1 ? '' : 's'} pago{realizados.length === 1 ? '' : 's'}
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
          sub={`${pendentes.length} confirmados`}
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
