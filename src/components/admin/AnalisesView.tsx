'use client'

import { todayBR } from '@/lib/date-br'
import { useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

type Appointment = {
  id: string
  appointment_date: string
  start_time: string
  total_price: number | null
  paid_at: string | null
  payment_method: 'pix' | 'cash' | 'card' | 'courtesy' | 'credit' | null
  status: string
  /* v117 · preenchido = horario solto por falta de pagamento do sinal, nao
     desistencia. Fica FORA da conta de perdas. */
  sinal_expirado_at?: string | null
  service_name: string | null
  client_id: string | null
  professional?: { id: string; name: string } | null
}

type PrevAppointment = {
  total_price: number | null
  payment_method: 'pix' | 'cash' | 'card' | 'courtesy' | 'credit' | null
}

type ProductSaleRow = {
  total: number | string | null
  sale_date?: string
  payment_method?: string | null
  professional_id?: string | null
}

type Props = {
  currentMonth: Appointment[]
  prevMonth: PrevAppointment[]
  previousClientIds: string[]
  professionals: { id: string; name: string }[]
  services: string[]
  startCurrent: string
  endCurrent: string
  profFilter: string
  serviceFilter: string
  productSalesCurrent?: ProductSaleRow[]
  productSalesPrev?: ProductSaleRow[]
}

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DAY_NAMES_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const METHOD_COLOR: Record<'pix' | 'cash' | 'card' | 'courtesy' | 'credit', string> = {
  pix: '#10B981', cash: '#16A34A', card: '#3B82F6', courtesy: '#A855F7', credit: '#8B5CF6',
}
const METHOD_LABEL: Record<'pix' | 'cash' | 'card' | 'courtesy' | 'credit', string> = {
  pix: 'PIX', cash: 'Dinheiro', card: 'Cartão', courtesy: 'Cortesia', credit: 'Crédito',
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

export default function AnalisesView({
  currentMonth,
  prevMonth,
  previousClientIds,
  professionals,
  services,
  startCurrent,
  endCurrent,
  profFilter,
  serviceFilter,
  productSalesCurrent = [],
  productSalesPrev = [],
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // ===== Cálculos base =====
  // pagos = receita real (exclui cortesia e crédito · bonificação e abate não
  // contam como faturamento novo)
  const pagos = useMemo(() => currentMonth.filter((a) =>
    a.paid_at && a.total_price &&
    a.payment_method !== 'courtesy' &&
    (a.payment_method as string | null) !== 'credit',
  ), [currentMonth])
  /* Horario que venceu por falta de sinal sai da conta (v117): a cliente
     nunca confirmou, entao nao houve desistencia nem perda de atendimento
     agendado. Sem esse filtro a metrica que ORIGINOU o sinal - o quanto se
     perde com falta - subiria sozinha conforme o sinal fosse ligado. */
  const cancelados = useMemo(
    () => currentMonth.filter(
      (a) => (a.status === 'cancelled' || a.status === 'no_show') && !a.sinal_expirado_at,
    ),
    [currentMonth]
  )
  const totalAgendamentos = currentMonth.length
  // Receita total = appointments pagos + vendas de produto pagas (ambos já filtraram cortesia/crédito no server)
  const currentTotalAppts = pagos.reduce((s, a) => s + Number(a.total_price || 0), 0)
  const currentTotalSales = productSalesCurrent.reduce((s, p) => s + Number(p.total || 0), 0)
  const currentTotal = currentTotalAppts + currentTotalSales
  const prevTotalAppts = prevMonth.reduce((s, a) => s + Number(a.total_price || 0), 0)
  const prevTotalSales = productSalesPrev.reduce((s, p) => s + Number(p.total || 0), 0)
  const prevTotal = prevTotalAppts + prevTotalSales
  const variation = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : null

  // ===== 4. Receita por dia (bar) + acumulada (line) =====
  // Soma appointments pagos + vendas de produto pagas no mesmo dia
  const dailyData = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of pagos) {
      const d = a.appointment_date
      map.set(d, (map.get(d) || 0) + Number(a.total_price || 0))
    }
    for (const s of productSalesCurrent) {
      if (!s.sale_date) continue
      map.set(s.sale_date, (map.get(s.sale_date) || 0) + Number(s.total || 0))
    }
    const start = new Date(startCurrent + 'T00:00:00')
    const end = new Date(endCurrent + 'T00:00:00')
    let cumulative = 0
    const days: { date: string; value: number; cumulative: number; day: number }[] = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().split('T')[0]
      const value = map.get(iso) || 0
      cumulative += value
      days.push({ date: iso, value, cumulative, day: d.getDate() })
    }
    return days
  }, [pagos, productSalesCurrent, startCurrent, endCurrent])

  const maxDailyValue = Math.max(1, ...dailyData.map((d) => d.value))
  const maxCumulative = Math.max(1, ...dailyData.map((d) => d.cumulative))
  const busiestDay = dailyData.length > 0
    ? dailyData.reduce((max, d) => (d.value > max.value ? d : max), dailyData[0])
    : null

  // ===== 1. Dia da semana mais movimentado =====
  const weekdayData = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0]
    for (const a of pagos) {
      const dow = new Date(a.appointment_date + 'T00:00:00').getDay()
      totals[dow] += Number(a.total_price || 0)
    }
    return totals
  }, [pagos])
  const weekdayMax = Math.max(1, ...weekdayData)
  const bestWeekday = weekdayData.indexOf(Math.max(...weekdayData))
  const totalWeek = weekdayData.reduce((s, v) => s + v, 0)

  // ===== 2. Hora de pico =====
  const hourlyData = useMemo(() => {
    const totals = new Array(24).fill(0)
    for (const a of pagos) {
      const h = parseInt(a.start_time.slice(0, 2), 10)
      if (!isNaN(h)) totals[h] += Number(a.total_price || 0)
    }
    return totals
  }, [pagos])
  const hourlyMax = Math.max(1, ...hourlyData)
  const peakHour = hourlyData.indexOf(Math.max(...hourlyData))
  // Janela ativa: primeiro hora com >0 ate ultimo
  const firstActiveHour = hourlyData.findIndex((v) => v > 0)
  const lastActiveHour = (() => {
    for (let i = hourlyData.length - 1; i >= 0; i--) if (hourlyData[i] > 0) return i
    return -1
  })()

  // ===== 3. Projecao proximos 30 dias (rolling) =====
  // Janela e' rolling 30d, entao currentTotal ja' representa "ultimos
  // 30 dias". Forecast e' simplesmente projecao linear: se manter
  // ritmo, proximos 30 dias = currentTotal. Mostrar media diaria
  // ajuda dono a comparar com dia tipico.
  const dailyAverage = currentTotal > 0 ? Math.round(currentTotal / 30) : 0
  const forecast = currentTotal > 0 ? currentTotal : null

  // ===== 5. Taxa de conversão =====
  const taxaCancelamento = totalAgendamentos > 0
    ? (cancelados.length / totalAgendamentos) * 100
    : 0

  // ===== 6. Métodos comparativo =====
  const currentByMethod = useMemo(() => {
    const map: Record<'pix' | 'cash' | 'card' | 'courtesy' | 'credit', number> = { pix: 0, cash: 0, card: 0, courtesy: 0, credit: 0 }
    for (const a of pagos) {
      if (a.payment_method) map[a.payment_method] += Number(a.total_price || 0)
    }
    return map
  }, [pagos])
  const prevByMethod = useMemo(() => {
    const map: Record<'pix' | 'cash' | 'card' | 'courtesy' | 'credit', number> = { pix: 0, cash: 0, card: 0, courtesy: 0, credit: 0 }
    for (const a of prevMonth) {
      if (a.payment_method) map[a.payment_method] += Number(a.total_price || 0)
    }
    return map
  }, [prevMonth])

  // ===== 7. Novos vs recorrentes =====
  const previousClientsSet = useMemo(() => new Set(previousClientIds), [previousClientIds])
  const novosVsRecorrentes = useMemo(() => {
    let novos = 0
    let recorrentes = 0
    for (const a of pagos) {
      if (!a.client_id) continue
      const value = Number(a.total_price || 0)
      if (previousClientsSet.has(a.client_id)) recorrentes += value
      else novos += value
    }
    return { novos, recorrentes }
  }, [pagos, previousClientsSet])

  // ===== Top serviços / profissionais =====
  const topServices = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>()
    for (const a of pagos) {
      const name = a.service_name || 'Sem nome'
      const cur = map.get(name) || { name, total: 0, count: 0 }
      cur.total += Number(a.total_price || 0)
      cur.count += 1
      map.set(name, cur)
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 5)
  }, [pagos])

  const topProfs = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>()
    for (const a of pagos) {
      if (!a.professional) continue
      const cur = map.get(a.professional.id) || { name: a.professional.name, total: 0, count: 0 }
      cur.total += Number(a.total_price || 0)
      cur.count += 1
      map.set(a.professional.id, cur)
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 5)
  }, [pagos])

  // ===== 10. Insights automáticos =====
  const insights = useMemo(() => {
    const list: { text: string; color: string; tone: 'success' | 'warn' | 'info' | 'danger' }[] = []
    if (variation != null) {
      if (variation >= 20) list.push({ text: `Você cresceu ${variation.toFixed(0)}% vs 30 dias anteriores.`, color: '#10B981', tone: 'success' })
      else if (variation <= -10) list.push({ text: `Faturamento caiu ${Math.abs(variation).toFixed(0)}% vs 30 dias anteriores.`, color: '#EF4444', tone: 'danger' })
    }
    if (totalWeek > 0 && weekdayData[bestWeekday] > 0) {
      const pct = (weekdayData[bestWeekday] / totalWeek) * 100
      list.push({ text: `${DAY_NAMES_FULL[bestWeekday]} é seu melhor dia (${pct.toFixed(0)}% do faturamento).`, color: '#3B82F6', tone: 'info' })
    }
    if (peakHour >= 0 && hourlyData[peakHour] > 0) {
      list.push({ text: `Pico de movimento às ${peakHour}h.`, color: '#A855F7', tone: 'info' })
    }
    if (pagos.length > 0) {
      const totalNovoRec = novosVsRecorrentes.novos + novosVsRecorrentes.recorrentes
      if (totalNovoRec > 0) {
        const pctRecorrentes = (novosVsRecorrentes.recorrentes / totalNovoRec) * 100
        if (pctRecorrentes >= 60) list.push({ text: `${pctRecorrentes.toFixed(0)}% da receita vem de clientes fiéis. Boa retenção!`, color: '#10B981', tone: 'success' })
        else if (pctRecorrentes <= 30) list.push({ text: `Só ${pctRecorrentes.toFixed(0)}% vem de clientes recorrentes. Foque em fidelização.`, color: '#F59E0B', tone: 'warn' })
      }
    }
    if (taxaCancelamento >= 20) {
      list.push({ text: `Taxa de cancelamento alta (${taxaCancelamento.toFixed(0)}%). Considere cobrar tarifa de no-show.`, color: '#F59E0B', tone: 'warn' })
    }
    // Comparativo de método (se tiver dados)
    if (prevByMethod.pix > 0 && currentByMethod.pix > 0) {
      const pixVar = ((currentByMethod.pix - prevByMethod.pix) / prevByMethod.pix) * 100
      if (Math.abs(pixVar) >= 30) {
        list.push({
          text: `PIX ${pixVar >= 0 ? 'cresceu' : 'caiu'} ${Math.abs(pixVar).toFixed(0)}% vs 30 dias anteriores.`,
          color: pixVar >= 0 ? '#10B981' : '#EF4444',
          tone: pixVar >= 0 ? 'success' : 'warn',
        })
      }
    }
    return list
  }, [variation, totalWeek, weekdayData, bestWeekday, peakHour, hourlyData, pagos, novosVsRecorrentes, taxaCancelamento, prevByMethod, currentByMethod])

  function setFilter(key: 'prof' | 'service', value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }

  const hasFilters = !!profFilter || !!serviceFilter

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="admin-card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
            Filtros
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={() => router.push(pathname)}
              className="text-[10px] font-semibold"
              style={{ color: 'var(--admin-accent)' }}
            >
              Limpar
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={profFilter}
            onChange={(e) => setFilter('prof', e.target.value)}
            className="admin-input text-xs px-2 py-2"
            aria-label="Profissional"
          >
            <option value="">Todos profissionais</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={serviceFilter}
            onChange={(e) => setFilter('service', e.target.value)}
            className="admin-input text-xs px-2 py-2"
            aria-label="Serviço"
          >
            <option value="">Todos serviços</option>
            {services.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Hero — faturamento + comparativo */}
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
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
          Faturamento · Últimos 30 dias
        </p>
        <p className="text-3xl font-extrabold mt-1 leading-none tabular-nums" style={{ color: 'var(--admin-text)' }}>
          {formatPrice(currentTotal)}
        </p>
        <p className="text-[11px] mt-2" style={{ color: 'var(--admin-text-mute)' }}>
          30 dias anteriores: {formatPrice(prevTotal)}
          {variation != null && (
            <span className="ml-2 font-bold" style={{ color: variation >= 0 ? '#10B981' : '#EF4444' }}>
              {variation >= 0 ? '↑' : '↓'} {Math.abs(variation).toFixed(0)}%
            </span>
          )}
        </p>
      </div>

      {/* 10. Insights automáticos */}
      {insights.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>
            Insights
          </h2>
          {insights.map((ins, i) => (
            <div
              key={i}
              className="rounded-xl p-3 flex items-start gap-2.5"
              style={{
                background: `${ins.color}0F`,
                border: `1px solid ${ins.color}33`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                style={{ background: ins.color }}
              />
              <p className="text-xs leading-snug font-medium" style={{ color: 'var(--admin-text)' }}>
                {ins.text}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* 3. Forecast do mês */}
      {forecast != null && forecast > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, color-mix(in srgb, var(--brand-primary) 12%, var(--admin-surface)) 100%)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
            Projeção próximos 30 dias
          </p>
          <p className="text-2xl font-extrabold mt-1 leading-none tabular-nums" style={{ color: '#A855F7' }}>
            {formatPrice(forecast)}
          </p>
          <p className="text-[11px] mt-2" style={{ color: 'var(--admin-text-mute)' }}>
            Mantendo o ritmo atual ({formatPrice(dailyAverage)}/dia em média).
          </p>
        </div>
      )}

      {/* 4. Receita por dia (bar) + acumulada (line) */}
      <section className="admin-card p-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-mute)' }}>
          Receita por dia
        </h2>
        <div className="relative">
          <div className="flex items-end gap-0.5" style={{ height: 100 }}>
            {dailyData.map((d) => {
              const heightPx = d.value > 0 ? Math.max((d.value / maxDailyValue) * 100, 4) : 2
              const isToday = d.date === todayBR()
              const hasValue = d.value > 0
              return (
                <div key={d.date} className="flex-1 flex items-end justify-center" title={`${d.day}: ${formatPrice(d.value)}`}>
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
          {/* Linha cumulativa sobreposta (SVG) */}
          {currentTotal > 0 && (
            <svg
              className="absolute top-0 left-0 w-full pointer-events-none"
              style={{ height: 100 }}
              viewBox={`0 0 ${dailyData.length} 100`}
              preserveAspectRatio="none"
            >
              <polyline
                fill="none"
                stroke="#A855F7"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                points={dailyData
                  .map((d, i) => `${i + 0.5},${100 - (d.cumulative / maxCumulative) * 95}`)
                  .join(' ')}
              />
            </svg>
          )}
        </div>
        <div className="flex gap-0.5 mt-1.5">
          {dailyData.map((d) => {
            const isToday = d.date === todayBR()
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
        <div className="flex items-center justify-between mt-2 text-[10px]" style={{ color: 'var(--admin-text-mute)' }}>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ background: 'linear-gradient(180deg, var(--brand-primary), var(--brand-secondary))' }} />
            Receita do dia
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-0.5" style={{ background: '#A855F7' }} />
            Acumulado
          </span>
        </div>
        {busiestDay && busiestDay.value > 0 && (
          <p className="text-[11px] mt-2 text-center" style={{ color: 'var(--admin-text-mute)' }}>
            Pico: dia {busiestDay.day} · {formatPriceShort(busiestDay.value)}
          </p>
        )}
      </section>

      {/* 1. Dia da semana mais movimentado */}
      <section className="admin-card p-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-mute)' }}>
          Por dia da semana
        </h2>
        <div className="flex items-end gap-1.5" style={{ height: 80 }}>
          {weekdayData.map((value, i) => {
            const heightPx = value > 0 ? Math.max((value / weekdayMax) * 80, 4) : 2
            const isBest = i === bestWeekday && value > 0
            return (
              <div key={i} className="flex-1 flex items-end justify-center">
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${heightPx}px`,
                    background: isBest
                      ? 'linear-gradient(180deg, var(--brand-primary), var(--brand-secondary))'
                      : 'var(--admin-divider)',
                    opacity: value > 0 ? (isBest ? 1 : 0.6) : 0.3,
                  }}
                />
              </div>
            )
          })}
        </div>
        <div className="flex gap-1.5 mt-1.5">
          {DAY_NAMES.map((d, i) => (
            <span
              key={d}
              className="flex-1 text-center text-[10px] font-semibold"
              style={{
                color: i === bestWeekday && weekdayData[i] > 0 ? 'var(--admin-accent)' : 'var(--admin-text-faded)',
              }}
            >
              {d}
            </span>
          ))}
        </div>
        {weekdayData[bestWeekday] > 0 && (
          <p className="text-[11px] mt-2 text-center" style={{ color: 'var(--admin-text-mute)' }}>
            Melhor: {DAY_NAMES_FULL[bestWeekday]} · {formatPriceShort(weekdayData[bestWeekday])}
          </p>
        )}
      </section>

      {/* 2. Hora de pico */}
      {firstActiveHour >= 0 && lastActiveHour >= 0 && (
        <section className="admin-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-mute)' }}>
            Por hora
          </h2>
          <div className="flex items-end gap-0.5" style={{ height: 60 }}>
            {hourlyData.slice(firstActiveHour, lastActiveHour + 1).map((value, i) => {
              const hour = firstActiveHour + i
              const heightPx = value > 0 ? Math.max((value / hourlyMax) * 60, 3) : 2
              const isPeak = hour === peakHour && value > 0
              return (
                <div key={hour} className="flex-1 flex items-end justify-center" title={`${hour}h: ${formatPrice(value)}`}>
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${heightPx}px`,
                      background: isPeak
                        ? 'linear-gradient(180deg, var(--brand-primary), var(--brand-secondary))'
                        : 'var(--admin-divider)',
                      opacity: value > 0 ? (isPeak ? 1 : 0.6) : 0.3,
                    }}
                  />
                </div>
              )
            })}
          </div>
          <div className="flex gap-0.5 mt-1.5">
            {hourlyData.slice(firstActiveHour, lastActiveHour + 1).map((_, i) => {
              const hour = firstActiveHour + i
              return (
                <span
                  key={hour}
                  className="flex-1 text-center text-[8px] tabular-nums"
                  style={{
                    color: hour === peakHour ? 'var(--admin-accent)' : 'var(--admin-text-faded)',
                    fontWeight: hour === peakHour ? 700 : 400,
                  }}
                >
                  {hour}h
                </span>
              )
            })}
          </div>
          {peakHour >= 0 && hourlyData[peakHour] > 0 && (
            <p className="text-[11px] mt-2 text-center" style={{ color: 'var(--admin-text-mute)' }}>
              Pico: {peakHour}h · {formatPriceShort(hourlyData[peakHour])}
            </p>
          )}
        </section>
      )}

      {/* 5. Taxa de conversão / cancelamento */}
      {totalAgendamentos > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="admin-card p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
              Taxa cancelamento
            </p>
            <p
              className="text-xl font-bold mt-1 tabular-nums leading-none"
              style={{ color: taxaCancelamento >= 20 ? '#EF4444' : taxaCancelamento >= 10 ? '#F59E0B' : '#10B981' }}
            >
              {taxaCancelamento.toFixed(0)}%
            </p>
            <p className="text-[10px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
              {cancelados.length} de {totalAgendamentos}
            </p>
          </div>
          <div className="admin-card p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
              Taxa execução
            </p>
            <p
              className="text-xl font-bold mt-1 tabular-nums leading-none"
              style={{ color: '#10B981' }}
            >
              {(100 - taxaCancelamento).toFixed(0)}%
            </p>
            <p className="text-[10px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
              {totalAgendamentos - cancelados.length} concluíram
            </p>
          </div>
        </div>
      )}

      {/* 7. Novos vs recorrentes */}
      {(novosVsRecorrentes.novos > 0 || novosVsRecorrentes.recorrentes > 0) && (
        <section className="admin-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-mute)' }}>
            Novos vs recorrentes
          </h2>
          {(() => {
            const total = novosVsRecorrentes.novos + novosVsRecorrentes.recorrentes
            const pctNovos = total > 0 ? (novosVsRecorrentes.novos / total) * 100 : 0
            const pctRec = total > 0 ? (novosVsRecorrentes.recorrentes / total) * 100 : 0
            return (
              <>
                <div className="h-2 rounded-full overflow-hidden flex" style={{ background: 'var(--admin-divider)' }}>
                  <div style={{ width: `${pctRec}%`, background: '#10B981' }} />
                  <div style={{ width: `${pctNovos}%`, background: '#3B82F6' }} />
                </div>
                <div className="flex items-center justify-between mt-2.5 text-xs">
                  <div>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} />
                      <span className="font-semibold" style={{ color: 'var(--admin-text)' }}>Recorrentes</span>
                    </span>
                    <p className="text-[11px] tabular-nums mt-0.5 ml-3.5" style={{ color: 'var(--admin-text-mute)' }}>
                      {formatPrice(novosVsRecorrentes.recorrentes)} · {pctRec.toFixed(0)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="font-semibold" style={{ color: 'var(--admin-text)' }}>Novos</span>
                      <span className="w-2 h-2 rounded-full" style={{ background: '#3B82F6' }} />
                    </span>
                    <p className="text-[11px] tabular-nums mt-0.5 mr-3.5" style={{ color: 'var(--admin-text-mute)' }}>
                      {formatPrice(novosVsRecorrentes.novos)} · {pctNovos.toFixed(0)}%
                    </p>
                  </div>
                </div>
              </>
            )
          })()}
        </section>
      )}

      {/* 6. Comparativo de métodos de pagamento */}
      {(currentTotal > 0 || prevTotal > 0) && (
        <section className="admin-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-mute)' }}>
            Métodos · 30 dias atuais vs 30 anteriores
          </h2>
          <div className="space-y-2">
            {(['pix', 'cash', 'card', 'courtesy'] as const).map((m) => {
              const cur = currentByMethod[m]
              const prev = prevByMethod[m]
              if (cur === 0 && prev === 0) return null
              const variationM = prev > 0 ? ((cur - prev) / prev) * 100 : null
              return (
                <div key={m} className="flex items-center gap-3">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"
                    style={{ background: `${METHOD_COLOR[m]}1F`, color: METHOD_COLOR[m] }}
                  >
                    {m === 'pix' ? 'P' : m === 'cash' ? '$' : m === 'card' ? 'C' : '•'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                        {METHOD_LABEL[m]}
                      </p>
                      <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                        {formatPrice(cur)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[10px]" style={{ color: 'var(--admin-text-faded)' }}>
                        Anterior: {formatPrice(prev)}
                      </p>
                      {variationM != null && Math.abs(variationM) >= 1 && (
                        <p
                          className="text-[10px] font-bold"
                          style={{ color: variationM >= 0 ? '#10B981' : '#EF4444' }}
                        >
                          {variationM >= 0 ? '↑' : '↓'} {Math.abs(variationM).toFixed(0)}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

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
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--admin-divider)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--brand-primary), var(--brand-secondary))' }}
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
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--admin-divider)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--brand-primary), var(--brand-secondary))' }}
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

      {currentMonth.length === 0 && pagos.length === 0 && (
        <div className="admin-card p-8 text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--admin-text-2)' }}>
            Sem dados pra analisar
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-faded)' }}>
            {hasFilters ? 'Tente limpar os filtros' : 'Análises aparecem quando tiver atendimentos pagos'}
          </p>
        </div>
      )}
    </div>
  )
}
