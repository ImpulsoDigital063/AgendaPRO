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
  paid_at: string | null
  payment_method: 'pix' | 'cash' | 'card' | 'courtesy' | 'credit' | null
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
  // Comissao SO sobre receita de fato (PIX/Dinheiro/Cartao).
  // Cortesia (brinde) NAO conta — bug historico (CIC rodada 4): profissional
  // ganhava comissao sobre cortesia (R$0 de receita gera R$X de obrigacao).
  const pagos = appointments.filter(
    (a) => a.paid_at && a.total_price && a.payment_method !== 'courtesy' && a.payment_method !== 'credit'
  )
  const naoPagos = appointments.filter(
    (a) =>
      a.paid_at == null &&
      a.total_price !== null &&
      a.total_price > 0 &&
      (a.status === 'confirmed' || a.status === 'completed')
  )
  const ativos = [...pagos, ...naoPagos]

  const totalGerado = ativos.reduce((sum, a) => sum + (a.total_price ?? 0), 0)
  const totalRealizado = pagos.reduce((sum, a) => sum + (a.total_price ?? 0), 0)
  const totalPendente = naoPagos.reduce((sum, a) => sum + (a.total_price ?? 0), 0)
  // Comissao baseada em PAGOS (mesma semantica do admin)
  const minhaComissao = totalRealizado * (commissionPercentage / 100)
  // Comissao "futura" — o que vai entrar quando o dono confirmar pagamento
  const comissaoPendente = totalPendente * (commissionPercentage / 100)
  const ticketMedio = ativos.length > 0 ? totalGerado / ativos.length : 0

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
              {commissionPercentage}% sobre {pagos.length} atendimento{pagos.length === 1 ? '' : 's'} pago{pagos.length === 1 ? '' : 's'}
              {comissaoPendente > 0 && (
                <span style={{ color: 'var(--admin-warn)' }}>
                  {' · '}+ {formatPrice(comissaoPendente)} pendente
                </span>
              )}
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

      {/* Aviso quando a % não foi configurada — sem isso a tela inteira mostra
          R$0,00 e ela acha que o sistema está quebrado. Na Realli, 4 das 6
          estavam com 0% em 30/07. */}
      {commissionPercentage === 0 && (
        <div
          className="rounded-2xl p-3.5"
          style={{
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.35)',
          }}
        >
          <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
            Sua comissão ainda não foi configurada
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
            Por isso os valores aparecem zerados. Peça pra administração definir
            sua porcentagem no seu cadastro.
          </p>
        </div>
      )}

      {/* Tudo aqui é a COMISSÃO dela, não o valor do serviço (Eduardo 30/07:
          "o certo é mostrar o valor da comissão [...] com uma legenda falando
          que é o valor da comissão"). O valor cheio segue visível na agenda e
          no card de cada atendimento como referência do cálculo. */}
      <div className="grid grid-cols-3 gap-2">
        <KpiTile
          label="Comissão paga"
          value={formatPrice(minhaComissao)}
          sub={`${pagos.length} atendimento${pagos.length === 1 ? '' : 's'}`}
          icon={<IconCheck size={14} />}
          tone="success"
        />
        <KpiTile
          label="A receber"
          value={formatPrice(comissaoPendente)}
          sub={`${naoPagos.length} pendente${naoPagos.length === 1 ? '' : 's'}`}
          icon={<IconClock size={14} />}
          tone="warn"
        />
        <KpiTile
          label="Média"
          value={formatPrice(ticketMedio * (commissionPercentage / 100))}
          sub="comissão por atendimento"
          icon={<IconDollar size={14} />}
          tone="accent"
        />
      </div>

      <p className="text-[11px] text-center -mt-2" style={{ color: 'var(--admin-text-faded)' }}>
        Os três valores acima são a <strong>sua comissão</strong> ({commissionPercentage}%),
        não o valor cobrado da cliente.
      </p>

      {/* Lista de agendamentos — readOnly (só dono confirma pagamento) */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-mute)' }}>
          Agendamentos · {PERIODO_LABEL[periodo]}
        </h2>
        <FinanceAppointmentList items={rows} readOnly comissaoPercent={commissionPercentage} />
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
