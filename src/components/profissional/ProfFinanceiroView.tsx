'use client'

import FinancePeriodTabs from '@/components/admin/FinancePeriodTabs'
import FinanceAppointmentList, { type FinanceRow } from '@/components/admin/FinanceAppointmentList'
import { IconDollar, IconClock, IconCheck } from '@/components/ui/Icon'

type AppointmentRow = {
  id: string
  client_name: string
  client_phone: string
  appointment_date: string
  start_time: string
  status: string
  service_name: string | null
  total_price: number | null
}

type Props = {
  appointments: AppointmentRow[]
  periodo: string
  commissionPercentage: number
}

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const PERIODO_LABEL: Record<string, string> = {
  hoje: 'Hoje',
  semana: 'Últimos 7 dias',
  mes: 'Este mês',
}

export default function ProfFinanceiroView({ appointments, periodo, commissionPercentage }: Props) {
  const ativos = appointments.filter(
    (a) => a.total_price !== null && a.total_price > 0 && (a.status === 'confirmed' || a.status === 'completed')
  )
  const realizados = appointments.filter((a) => a.status === 'completed' && a.total_price)
  const pendentes = appointments.filter((a) => a.status === 'confirmed' && a.total_price)

  const totalGerado = ativos.reduce((sum, a) => sum + (a.total_price ?? 0), 0)
  const totalRealizado = realizados.reduce((sum, a) => sum + (a.total_price ?? 0), 0)
  const totalPendente = pendentes.reduce((sum, a) => sum + (a.total_price ?? 0), 0)
  const minhaComissao = totalRealizado * (commissionPercentage / 100)
  const ticketMedio = ativos.length > 0 ? totalGerado / ativos.length : 0

  const rows: FinanceRow[] = appointments.map((a) => ({
    id: a.id,
    client_name: a.client_name,
    appointment_date: a.appointment_date,
    start_time: a.start_time,
    status: a.status,
    service_name: a.service_name,
    total_price: a.total_price,
  }))

  return (
    <div className="space-y-5">
      <FinancePeriodTabs periodo={periodo} />

      {/* Hero KPI: Minha comissão (o que vou receber) */}
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
              Minha comissão · {PERIODO_LABEL[periodo]}
            </p>
            <p
              className="text-3xl font-extrabold mt-1 leading-none tabular-nums"
              style={{ color: 'var(--admin-text)' }}
            >
              {formatPrice(minhaComissao)}
            </p>
            <p className="text-[11px] mt-2" style={{ color: 'var(--admin-text-mute)' }}>
              {commissionPercentage}% sobre {realizados.length} atendimento{realizados.length === 1 ? '' : 's'} realizado{realizados.length === 1 ? '' : 's'}
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

      {/* Realizado + A receber + Ticket médio */}
      <div className="grid grid-cols-3 gap-2">
        <KpiTile
          label="Realizado"
          value={formatPrice(totalRealizado)}
          sub={`${realizados.length} feito${realizados.length === 1 ? '' : 's'}`}
          icon={<IconCheck size={14} />}
          tone="success"
        />
        <KpiTile
          label="A receber"
          value={formatPrice(totalPendente)}
          sub={`${pendentes.length} confirmado${pendentes.length === 1 ? '' : 's'}`}
          icon={<IconClock size={14} />}
          tone="warn"
        />
        <KpiTile
          label="Ticket médio"
          value={formatPrice(ticketMedio)}
          sub="por atendimento"
          icon={<IconDollar size={14} />}
          tone="accent"
        />
      </div>

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
  tone: 'warn' | 'success' | 'accent'
}) {
  const colorMap = {
    warn: 'var(--admin-warn)',
    success: 'var(--admin-success)',
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
