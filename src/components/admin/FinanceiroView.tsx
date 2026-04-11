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
      <div className="flex bg-white rounded-2xl border border-gray-100 p-1">
        {(['hoje', 'semana', 'mes'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-colors ${
              periodo === p ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {p === 'hoje' ? 'Hoje' : p === 'semana' ? '7 dias' : 'Mês'}
          </button>
        ))}
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Total faturado</p>
          <p className="text-xl font-bold text-gray-900">{formatPrice(totalFaturado)}</p>
          <p className="text-xs text-gray-400 mt-1">{comPrice.length} agendamentos</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Confirmados</p>
          <p className="text-xl font-bold text-green-600">{formatPrice(totalConfirmado)}</p>
          <p className="text-xs text-gray-400 mt-1">{confirmados.length} agendamentos</p>
        </div>
      </div>

      {/* Comissão por profissional */}
      {profList.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Comissão por profissional
          </h2>
          <div className="space-y-2">
            {profList.map((prof) => {
              const commission = prof.total * (prof.commission_percentage / 100)
              return (
                <div key={prof.name} className="bg-white rounded-2xl border border-gray-100 px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-900">{prof.name}</p>
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                      {prof.commission_percentage}% comissão
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400">Gerado</p>
                      <p className="font-semibold text-gray-700 text-sm">{formatPrice(prof.total)}</p>
                      <p className="text-xs text-gray-400">{prof.count} atendimento{prof.count !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">A pagar</p>
                      <p className="font-bold text-gray-900">{formatPrice(commission)}</p>
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
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Agendamentos — {PERIODO_LABEL[periodo]}
        </h2>
        {appointments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">Nenhum agendamento neste período.</p>
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
                  className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{a.client_name}</p>
                    <p className="text-xs text-gray-400">
                      {date} · {a.start_time.slice(0, 5)}
                      {a.service_name ? ` · ${a.service_name}` : ''}
                    </p>
                    {a.professional && (
                      <p className="text-xs text-gray-300">{a.professional.name}</p>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    {a.total_price ? (
                      <p className="font-bold text-gray-900 text-sm">{formatPrice(a.total_price)}</p>
                    ) : (
                      <p className="text-gray-300 text-xs">—</p>
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
