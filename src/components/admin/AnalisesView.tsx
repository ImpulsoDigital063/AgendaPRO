'use client'

import { useMemo } from 'react'

type Appointment = {
  appointment_date: string
  total_price: number | null
  paid_at: string | null
  status: string
  service_name: string | null
  professional?: { id: string; name: string } | null
}

type Props = {
  currentMonth: Appointment[]
  prevMonthTotal: number
  startCurrent: string
  endCurrent: string
}

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatPriceShort(value: number) {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
  }
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}

export default function AnalisesView({ currentMonth, prevMonthTotal, startCurrent, endCurrent }: Props) {
  // Total mes atual
  const currentTotal = useMemo(
    () => currentMonth.reduce((s, a) => s + Number(a.total_price || 0), 0),
    [currentMonth]
  )

  // Variacao % vs mes anterior
  const variation = prevMonthTotal > 0
    ? ((currentTotal - prevMonthTotal) / prevMonthTotal) * 100
    : null

  // Receita por dia (bar chart)
  const dailyData = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of currentMonth) {
      const d = a.appointment_date
      map.set(d, (map.get(d) || 0) + Number(a.total_price || 0))
    }
    // Preenche todos os dias do mes (mesmo zerados)
    const start = new Date(startCurrent + 'T00:00:00')
    const end = new Date(endCurrent + 'T00:00:00')
    const days: { date: string; value: number; day: number }[] = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().split('T')[0]
      days.push({
        date: iso,
        value: map.get(iso) || 0,
        day: d.getDate(),
      })
    }
    return days
  }, [currentMonth, startCurrent, endCurrent])

  const maxDailyValue = Math.max(1, ...dailyData.map((d) => d.value))

  // Top servicos (por receita)
  const topServices = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>()
    for (const a of currentMonth) {
      const name = a.service_name || 'Sem nome'
      const cur = map.get(name) || { name, total: 0, count: 0 }
      cur.total += Number(a.total_price || 0)
      cur.count += 1
      map.set(name, cur)
    }
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [currentMonth])

  // Top profissionais
  const topProfs = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>()
    for (const a of currentMonth) {
      if (!a.professional) continue
      const cur = map.get(a.professional.id) || {
        name: a.professional.name,
        total: 0,
        count: 0,
      }
      cur.total += Number(a.total_price || 0)
      cur.count += 1
      map.set(a.professional.id, cur)
    }
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [currentMonth])

  // Dia/horario mais movimentado
  const busiestDay = useMemo(() => {
    if (dailyData.length === 0) return null
    return dailyData.reduce((max, d) => (d.value > max.value ? d : max), dailyData[0])
  }, [dailyData])

  return (
    <div className="space-y-5">
      {/* Hero: comparativo */}
      <div
        className="rounded-2xl p-4 relative overflow-hidden"
        style={{
          background: variation == null
            ? 'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 12%, var(--admin-surface)) 0%, var(--admin-surface) 100%)'
            : variation >= 0
              ? 'linear-gradient(135deg, rgba(16,185,129,0.18) 0%, color-mix(in srgb, var(--brand-primary) 12%, var(--admin-surface)) 100%)'
              : 'linear-gradient(135deg, rgba(239,68,68,0.14) 0%, color-mix(in srgb, var(--brand-primary) 12%, var(--admin-surface)) 100%)',
          border: '1px solid var(--admin-border)',
        }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--admin-text-faded)' }}>
          Faturamento · Este mês
        </p>
        <p className="text-3xl font-extrabold mt-1 leading-none tabular-nums"
          style={{ color: 'var(--admin-text)' }}>
          {formatPrice(currentTotal)}
        </p>
        <p className="text-[11px] mt-2" style={{ color: 'var(--admin-text-mute)' }}>
          Mês anterior: {formatPrice(prevMonthTotal)}
          {variation != null && (
            <span
              className="ml-2 font-bold"
              style={{ color: variation >= 0 ? '#10B981' : '#EF4444' }}
            >
              {variation >= 0 ? '↑' : '↓'} {Math.abs(variation).toFixed(0)}%
            </span>
          )}
        </p>
      </div>

      {/* Bar chart por dia */}
      <section className="admin-card p-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-mute)' }}>
          Receita por dia
        </h2>
        {/* Container com altura fixa pras barras + linha de labels separada */}
        <div className="flex items-end gap-0.5" style={{ height: 120 }}>
          {dailyData.map((d) => {
            const heightPx = d.value > 0 ? Math.max((d.value / maxDailyValue) * 120, 4) : 2
            const isToday = d.date === new Date().toISOString().split('T')[0]
            const hasValue = d.value > 0
            return (
              <div
                key={d.date}
                className="flex-1 flex items-end justify-center"
                title={`${d.day}: ${formatPrice(d.value)}`}
              >
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: `${heightPx}px`,
                    background: hasValue
                      ? 'linear-gradient(180deg, var(--brand-primary), var(--brand-secondary))'
                      : 'var(--admin-divider)',
                    opacity: isToday ? 1 : hasValue ? 0.85 : 0.4,
                  }}
                />
              </div>
            )
          })}
        </div>
        {/* Labels dos dias em linha separada */}
        <div className="flex gap-0.5 mt-1.5">
          {dailyData.map((d) => {
            const isToday = d.date === new Date().toISOString().split('T')[0]
            return (
              <span
                key={d.date}
                className="flex-1 text-center text-[8px] tabular-nums"
                style={{
                  color: isToday ? 'var(--admin-accent)' : 'var(--admin-text-faded)',
                  fontWeight: isToday ? 700 : 400,
                }}
              >
                {d.day}
              </span>
            )
          })}
        </div>
        {busiestDay && busiestDay.value > 0 && (
          <p className="text-[11px] mt-2 text-center" style={{ color: 'var(--admin-text-mute)' }}>
            Pico: dia {busiestDay.day} · {formatPriceShort(busiestDay.value)}
          </p>
        )}
      </section>

      {/* Top serviços */}
      {topServices.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-mute)' }}>
            Top serviços
          </h2>
          <div className="space-y-2">
            {topServices.map((s, i) => {
              const pct = currentTotal > 0 ? (s.total / currentTotal) * 100 : 0
              return (
                <div key={s.name} className="admin-card p-3">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}
                      >
                        {i + 1}
                      </span>
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--admin-text)' }}>
                        {s.name}
                      </p>
                    </div>
                    <p className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: 'var(--admin-text)' }}>
                      {formatPrice(s.total)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="flex-1 h-1.5 rounded-full overflow-hidden"
                      style={{ background: 'var(--admin-divider)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg, var(--brand-primary), var(--brand-secondary))',
                        }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums flex-shrink-0" style={{ color: 'var(--admin-text-faded)' }}>
                      {s.count} · {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Top profissionais */}
      {topProfs.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-mute)' }}>
            Top profissionais
          </h2>
          <div className="space-y-2">
            {topProfs.map((p, i) => {
              const pct = currentTotal > 0 ? (p.total / currentTotal) * 100 : 0
              return (
                <div key={p.name} className="admin-card p-3">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}
                      >
                        {i + 1}
                      </span>
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--admin-text)' }}>
                        {p.name}
                      </p>
                    </div>
                    <p className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: 'var(--admin-text)' }}>
                      {formatPrice(p.total)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="flex-1 h-1.5 rounded-full overflow-hidden"
                      style={{ background: 'var(--admin-divider)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg, var(--brand-primary), var(--brand-secondary))',
                        }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums flex-shrink-0" style={{ color: 'var(--admin-text-faded)' }}>
                      {p.count} · {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {currentMonth.length === 0 && (
        <div className="admin-card p-8 text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--admin-text-2)' }}>
            Sem dados pra analisar este mês
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-faded)' }}>
            Análises aparecem quando você tiver atendimentos pagos
          </p>
        </div>
      )}
    </div>
  )
}
