'use client'

import { useRouter, usePathname } from 'next/navigation'

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

const STATUS_COLOR: Record<string, string> = {
  pending: 'text-yellow-600 bg-yellow-50',
  confirmed: 'text-green-600 bg-green-50',
  completed: 'text-blue-600 bg-blue-50',
  cancelled: 'text-gray-400 bg-gray-50',
  no_show: 'text-red-500 bg-red-50',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  completed: 'Realizado',
  cancelled: 'Cancelado',
  no_show: 'Não compareceu',
}

const PERIODO_LABEL: Record<string, string> = {
  hoje: 'Hoje',
  semana: 'Últimos 7 dias',
  mes: 'Este mês',
}

export default function ProfFinanceiroView({ appointments, periodo, commissionPercentage }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function setPeriodo(p: string) {
    router.push(`${pathname}?periodo=${p}`)
  }

  const ativos = appointments.filter(
    (a) => a.total_price !== null && a.total_price > 0 && (a.status === 'confirmed' || a.status === 'completed')
  )
  const realizados = appointments.filter((a) => a.status === 'completed' && a.total_price)

  const totalGerado = ativos.reduce((sum, a) => sum + (a.total_price ?? 0), 0)
  const totalRealizado = realizados.reduce((sum, a) => sum + (a.total_price ?? 0), 0)
  const minhaComissao = totalRealizado * (commissionPercentage / 100)

  return (
    <div className="space-y-6">
      {/* Seletor de periodo */}
      <div
        className="flex rounded-2xl p-1"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
      >
        {(['hoje', 'semana', 'mes'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-colors"
            style={{
              background: periodo === p ? 'var(--admin-accent)' : 'transparent',
              color: periodo === p ? '#fff' : 'var(--admin-text-mute)',
            }}
          >
            {p === 'hoje' ? 'Hoje' : p === 'semana' ? '7 dias' : 'Mês'}
          </button>
        ))}
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="admin-card p-4">
          <p className="text-xs mb-1" style={{ color: 'var(--admin-text-faded)' }}>Total gerado</p>
          <p className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>{formatPrice(totalGerado)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-faded)' }}>{ativos.length} atendimentos</p>
        </div>
        <div className="admin-card p-4">
          <p className="text-xs mb-1" style={{ color: 'var(--admin-text-faded)' }}>Minha comissão</p>
          <p className="text-xl font-bold" style={{ color: 'var(--admin-success)' }}>{formatPrice(minhaComissao)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-faded)' }}>{commissionPercentage}% dos realizados</p>
        </div>
      </div>

      {/* Realizados */}
      <div className="admin-card p-4">
        <p className="text-xs mb-1" style={{ color: 'var(--admin-text-faded)' }}>Realizados</p>
        <p className="text-lg font-bold" style={{ color: 'var(--admin-accent)' }}>{formatPrice(totalRealizado)}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--admin-text-faded)' }}>{realizados.length} atendimentos</p>
      </div>

      {/* Lista de agendamentos */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--admin-text-mute)' }}>
          Agendamentos — {PERIODO_LABEL[periodo]}
        </h2>
        {appointments.length === 0 ? (
          <div className="admin-card p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--admin-text-faded)' }}>Nenhum agendamento neste periodo.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {appointments.map((a) => {
              const date = new Date(a.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR', {
                day: 'numeric',
                month: 'short',
              })
              return (
                <div key={a.id} className="admin-card px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--admin-text)' }}>{a.client_name}</p>
                    <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
                      {date} · {a.start_time.slice(0, 5)}
                      {a.service_name ? ` · ${a.service_name}` : ''}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    {a.total_price ? (
                      <p className="font-bold text-sm" style={{ color: 'var(--admin-text)' }}>{formatPrice(a.total_price)}</p>
                    ) : (
                      <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>—</p>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[a.status]}`}>
                      {STATUS_LABEL[a.status]}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
