'use client'

import { useRouter, usePathname } from 'next/navigation'

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

const STATUS_COLOR: Record<string, string> = {
  pending: 'text-yellow-600 bg-yellow-50',
  confirmed: 'text-green-600 bg-green-50',
  cancelled: 'text-gray-400 bg-gray-50',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
}

const PERIODO_LABEL: Record<string, string> = {
  hoje: 'Hoje',
  semana: 'Últimos 7 dias',
  mes: 'Este mês',
}

export default function FinanceiroView({ appointments, periodo }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function setPeriodo(p: string) {
    router.push(`${pathname}?periodo=${p}`)
  }

  const comPrice = appointments.filter((a) => a.total_price !== null && a.total_price > 0)
  const confirmados = appointments.filter((a) => a.status === 'confirmed' && a.total_price)

  const totalFaturado = comPrice.reduce((sum, a) => sum + (a.total_price ?? 0), 0)
  const totalConfirmado = confirmados.reduce((sum, a) => sum + (a.total_price ?? 0), 0)

  // Agrupamento por profissional
  type ProfEntry = {
    name: string
    commission_percentage: number
    total: number
    count: number
  }
  const profMap: Record<string, ProfEntry> = {}

  for (const a of comPrice) {
    const prof = a.professional
    if (!prof) continue
    if (!profMap[prof.id]) {
      profMap[prof.id] = {
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

  return (
    <div className="space-y-6">
      {/* Seletor de período */}
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
          <p className="text-xs mb-1" style={{ color: 'var(--admin-text-faded)' }}>Total faturado</p>
          <p className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>{formatPrice(totalFaturado)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-faded)' }}>{comPrice.length} agendamentos</p>
        </div>
        <div className="admin-card p-4">
          <p className="text-xs mb-1" style={{ color: 'var(--admin-text-faded)' }}>Confirmados</p>
          <p className="text-xl font-bold" style={{ color: 'var(--admin-success)' }}>{formatPrice(totalConfirmado)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-faded)' }}>{confirmados.length} agendamentos</p>
        </div>
      </div>

      {/* Comissão por profissional */}
      {profList.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--admin-text-mute)' }}>
            Comissao por profissional
          </h2>
          <div className="space-y-2">
            {profList.map((prof) => {
              const commission = prof.total * (prof.commission_percentage / 100)
              return (
                <div key={prof.name} className="admin-card px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium" style={{ color: 'var(--admin-text)' }}>{prof.name}</p>
                    <span
                      className="text-xs px-2 py-1 rounded-lg"
                      style={{ color: 'var(--admin-text-faded)', background: 'var(--admin-accent-bg)', border: '1px solid var(--admin-border)' }}
                    >
                      {prof.commission_percentage}% comissão
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>Gerado</p>
                      <p className="font-semibold text-sm" style={{ color: 'var(--admin-text-2)' }}>{formatPrice(prof.total)}</p>
                      <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>{prof.count} atendimento{prof.count !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>A pagar</p>
                      <p className="font-bold" style={{ color: 'var(--admin-text)' }}>{formatPrice(commission)}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

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
                <div
                  key={a.id}
                  className="admin-card px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--admin-text)' }}>{a.client_name}</p>
                    <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
                      {date} · {a.start_time.slice(0, 5)}
                      {a.service_name ? ` · ${a.service_name}` : ''}
                    </p>
                    {a.professional && (
                      <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>{a.professional.name}</p>
                    )}
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
