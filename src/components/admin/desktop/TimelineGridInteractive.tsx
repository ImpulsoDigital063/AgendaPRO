'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { IconChevronLeft, IconChevronRight, IconCalendar, IconDollar, IconClose, IconPlus, IconInfo } from '@/components/ui/Icon'
import AppointmentDrawer from '@/components/admin/atendimentos/AppointmentDrawer'

type Prof = { id: string; name: string; photo_url: string | null }
type Appt = {
  id: string
  professional_id: string
  start_time: string
  end_time: string
  status: string
  client_name: string | null
  service_name: string | null
  total_price: number | null
  paid_at: string | null
}

type ColorMode = 'service' | 'professional' | 'progress' | 'payment'
type Interval = 15 | 30 | 60

type Props = {
  businessId: string
  profs: Prof[]
  appts: Appt[]
  hourStart: number
  hourEnd: number
  /** Data da timeline (YYYY-MM-DD) · usado nos links do popover */
  date: string
}

type PopoverState = {
  profId: string
  profName: string
  time: string // HH:MM
  x: number
  y: number
} | null

const SLOT_HEIGHT_30 = 56 // base · 30min · igual ao anterior
const SERVICE_COLORS = ['#01A197', '#C9A961', '#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444']

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function colorForService(a: Appt): string {
  // cancelado tem prioridade sobre cor do serviço — visual unificado pra "morto"
  if (a.status === 'cancelled') return '#94A3B8'
  const seed = a.service_name
  if (!seed) return SERVICE_COLORS[0]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h << 5) - h + seed.charCodeAt(i)
  return SERVICE_COLORS[Math.abs(h) % SERVICE_COLORS.length]
}

// Por ANDAMENTO · fluxo do atendimento (status === pending/confirmed/completed/no_show/cancelled)
// Ignora pagamento. Pra "ja foi feito o atendimento?".
function colorForProgress(a: Appt): string {
  if (a.status === 'cancelled') return '#94A3B8' // cinza · cancelado
  if (a.status === 'pending') return '#F59E0B' // amber · aguardando confirmação
  if (a.status === 'completed') return '#3B82F6' // blue · realizado
  if (a.status === 'no_show') return '#94A3B8' // cinza · faltou
  return '#01A197' // teal Palace · confirmed (default)
}

// Por PAGAMENTO · paid_at preenchido vs vazio · payment_method=courtesy = lavanda
// Pra "quem deve?"
function colorForPayment(a: Appt): string {
  if (a.paid_at) return '#10B981' // verde · pago
  if (a.status === 'cancelled' || a.status === 'no_show') return '#94A3B8' // cinza · não conta
  return '#F59E0B' // amber · pendente de pagamento
}

function colorForProf(profId: string): string {
  let h = 0
  for (let i = 0; i < profId.length; i++) h = (h << 5) - h + profId.charCodeAt(i)
  return SERVICE_COLORS[Math.abs(h) % SERVICE_COLORS.length]
}

function buildSlots(hourStart: number, hourEnd: number, interval: Interval): string[] {
  const out: string[] = []
  for (let m = hourStart * 60; m < hourEnd * 60; m += interval) {
    const h = Math.floor(m / 60)
    const min = m % 60
    out.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
  }
  return out
}

export default function TimelineGridInteractive({ businessId, profs, appts, hourStart, hourEnd, date }: Props) {
  const router = useRouter()
  const [popover, setPopover] = useState<PopoverState>(null)
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null) // `${profId}-${time}`
  const [portalReady, setPortalReady] = useState(false)
  // Drawer inline do agendamento clicado · Salão99-style · sem trocar de rota
  const [selectedApptId, setSelectedApptId] = useState<string | null>(null)
  useEffect(() => { setPortalReady(true) }, [])

  function closeDrawer() {
    setSelectedApptId(null)
    router.refresh() // pega mudanças de pagamento/cancelamento feitas no drawer
  }

  // Fecha popover · ESC + click fora
  useEffect(() => {
    if (!popover) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setPopover(null) }
    function onClick(e: MouseEvent) {
      const target = e.target as Element
      if (!target.closest('[data-slot-popover]') && !target.closest('[data-slot-trigger]')) {
        setPopover(null)
      }
    }
    document.addEventListener('keydown', onKey)
    setTimeout(() => document.addEventListener('click', onClick), 0)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick)
    }
  }, [popover])

  function openSlotPopover(e: React.MouseEvent, profId: string, profName: string, time: string) {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPopover({
      profId,
      profName,
      time,
      x: rect.left + rect.width / 2,
      y: rect.top + window.scrollY,
    })
  }

  function novoAtendimento() {
    if (!popover) return
    const params = new URLSearchParams({
      prof: popover.profId,
      date,
      time: popover.time,
    })
    router.push(`/admin/marcar?${params.toString()}`)
    setPopover(null)
  }

  function novaVenda() {
    router.push('/admin/financeiro/vendas')
    setPopover(null)
  }

  function bloquearHorario() {
    if (!popover) return
    router.push(`/admin/configuracoes?tab=bloqueios&prof=${popover.profId}&date=${date}&time=${popover.time}`)
    setPopover(null)
  }

  // Estado · profs visíveis · intervalo · cor · sidebar recolhida
  // Persistência via localStorage por business (key isolada por negócio).
  const [visibleProfIds, setVisibleProfIds] = useState<Set<string>>(() => new Set(profs.map((p) => p.id)))
  const [interval, setInterval] = useState<Interval>(30)
  const [colorMode, setColorMode] = useState<ColorMode>('service')
  const [collapsed, setCollapsed] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`agendapro-timeline-config-${businessId}`)
      if (raw) {
        const cfg = JSON.parse(raw) as { visibleProfIds?: string[]; interval?: Interval; colorMode?: ColorMode; collapsed?: boolean }
        if (cfg.visibleProfIds) setVisibleProfIds(new Set(cfg.visibleProfIds))
        if (cfg.interval && [15, 30, 60].includes(cfg.interval)) setInterval(cfg.interval)
        if (cfg.colorMode && ['service', 'professional', 'progress', 'payment'].includes(cfg.colorMode)) setColorMode(cfg.colorMode)
        if (typeof cfg.collapsed === 'boolean') setCollapsed(cfg.collapsed)
      }
    } catch {/* ignore */}
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(
        `agendapro-timeline-config-${businessId}`,
        JSON.stringify({
          visibleProfIds: Array.from(visibleProfIds),
          interval,
          colorMode,
          collapsed,
        }),
      )
    } catch {/* ignore */}
  }, [visibleProfIds, interval, colorMode, collapsed, hydrated, businessId])

  const visibleProfs = profs.filter((p) => visibleProfIds.has(p.id))
  const slots = buildSlots(hourStart, hourEnd, interval)
  // Altura proporcional ao intervalo · 30min=56 · 15min=28 · 60min=112
  const SLOT_HEIGHT = (SLOT_HEIGHT_30 * interval) / 30
  const gridHeight = slots.length * SLOT_HEIGHT
  const dayStartMin = hourStart * 60

  function toggleProf(id: string) {
    setVisibleProfIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function getColor(a: Appt): string {
    if (colorMode === 'professional') return colorForProf(a.professional_id)
    if (colorMode === 'progress') return colorForProgress(a)
    if (colorMode === 'payment') return colorForPayment(a)
    return colorForService(a) // default
  }

  return (
    <div className="flex gap-3 items-start">
      {/* PAINEL LATERAL CONFIGURAÇÕES · recolhível */}
      <aside
        className="flex-shrink-0 rounded-2xl overflow-hidden transition-all"
        style={{
          width: collapsed ? 44 : 220,
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
          borderTopColor: 'rgba(255,255,255,0.4)',
          boxShadow: '0 4px 14px -4px rgba(0,0,0,0.06)',
        }}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Abrir configurações"
            className="w-full h-12 flex items-center justify-center"
            style={{ color: 'var(--admin-text-mute)' }}
            title="Configurações"
          >
            <IconChevronRight size={18} />
          </button>
        ) : (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>
                Configurações
              </p>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                aria-label="Recolher configurações"
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ color: 'var(--admin-text-mute)' }}
              >
                <IconChevronLeft size={14} />
              </button>
            </div>

            {/* Intervalo */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>
                Intervalo
              </p>
              <div className="grid grid-cols-3 gap-1">
                {([15, 30, 60] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setInterval(opt)}
                    className="py-1.5 rounded-md text-[11px] font-semibold transition-colors"
                    style={
                      interval === opt
                        ? { background: 'var(--admin-accent)', color: '#fff' }
                        : { background: 'var(--admin-input-bg)', color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }
                    }
                  >
                    {opt}min
                  </button>
                ))}
              </div>
            </div>

            {/* Cor · 4 modos (Salão99-style + nossa pegada) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
                  Cor dos cards
                </p>
                <button
                  type="button"
                  onClick={() => setHelpOpen(true)}
                  aria-label="O que cada modo significa"
                  title="Como interpretar as cores"
                  className="w-4 h-4 rounded-full flex items-center justify-center transition-colors"
                  style={{ color: 'var(--admin-text-mute)' }}
                >
                  <IconInfo size={14} />
                </button>
              </div>
              <div className="space-y-1">
                {([
                  { v: 'service', l: 'Por serviço', desc: 'Cor diferente por tipo de serviço' },
                  { v: 'professional', l: 'Por profissional', desc: 'Cor por coluna · vê o dia de cada um' },
                  { v: 'progress', l: 'Por andamento', desc: 'Aguardando · feito · faltou' },
                  { v: 'payment', l: 'Por pagamento', desc: 'Verde pago · âmbar a receber' },
                ] as const).map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setColorMode(opt.v)}
                    className="w-full px-2.5 py-1.5 rounded-md text-left transition-colors"
                    style={
                      colorMode === opt.v
                        ? { background: 'var(--admin-accent-bg)', border: '1px solid var(--admin-accent)' }
                        : { background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }
                    }
                    title={opt.desc}
                  >
                    <p className="text-[11px] font-semibold leading-tight" style={{ color: colorMode === opt.v ? 'var(--admin-accent)' : 'var(--admin-text)' }}>
                      {opt.l}
                    </p>
                    <p className="text-[10px] leading-snug mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>
                      {opt.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Profissionais */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
                  Profissionais
                </p>
                <button
                  type="button"
                  onClick={() => setVisibleProfIds(new Set(profs.map((p) => p.id)))}
                  className="text-[10px] underline"
                  style={{ color: 'var(--admin-accent)' }}
                  title="Mostrar todos"
                >
                  todos
                </button>
              </div>
              <div className="space-y-1">
                {profs.map((p) => {
                  const visible = visibleProfIds.has(p.id)
                  return (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors"
                      style={{ background: visible ? 'var(--admin-input-bg)' : 'transparent' }}
                    >
                      <input
                        type="checkbox"
                        checked={visible}
                        onChange={() => toggleProf(p.id)}
                        className="w-3.5 h-3.5"
                      />
                      <span
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ background: colorForProf(p.id), color: '#fff' }}
                      >
                        {p.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="text-[11px] truncate flex-1" style={{ color: visible ? 'var(--admin-text)' : 'var(--admin-text-faded)' }}>
                        {p.name}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* GRADE */}
      <div
        className="flex-1 rounded-2xl overflow-hidden min-w-0"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
      >
        {visibleProfs.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
              Nenhum profissional selecionado
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
              Marca pelo menos 1 no painel à esquerda pra ver a agenda.
            </p>
          </div>
        ) : (
          <>
            {/* LEGENDA contextual · varia conforme colorMode */}
            <ColorLegend
              colorMode={colorMode}
              appts={appts.filter((a) => visibleProfIds.has(a.professional_id))}
            />

            {/* Header de profs */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: `64px repeat(${visibleProfs.length}, minmax(140px, 1fr))`,
                background: 'var(--admin-surface-hi)',
                borderBottom: '1px solid var(--admin-border)',
                position: 'sticky',
                top: 0,
                zIndex: 5,
              }}
            >
              <div />
              {visibleProfs.map((p) => (
                <div key={p.id} className="px-3 py-3 flex items-center gap-2 min-w-0">
                  <span
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden"
                    style={{ background: colorForProf(p.id), color: '#fff' }}
                  >
                    {p.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      p.name.slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <span className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }} title={p.name}>
                    {p.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Grade scroll */}
            <div
              className="grid relative overflow-auto"
              style={{
                gridTemplateColumns: `64px repeat(${visibleProfs.length}, minmax(140px, 1fr))`,
                maxHeight: 'calc(100svh - 280px)',
              }}
            >
              {/* Coluna de horas */}
              <div className="relative" style={{ height: gridHeight }}>
                {slots.map((s, i) => {
                  // 60min → só :00 · 30min → :00 e :30 · 15min → :00, :15, :30, :45
                  const showLabel = s.endsWith(':00') || (interval <= 30 && s.endsWith(':30')) || interval === 15
                  return (
                    <div
                      key={s}
                      className="text-[11px] font-medium tabular-nums px-2 flex items-start pt-1"
                      style={{
                        position: 'absolute',
                        top: i * SLOT_HEIGHT,
                        left: 0,
                        right: 0,
                        height: SLOT_HEIGHT,
                        color: s.endsWith(':00') ? 'var(--admin-text-mute)' : 'var(--admin-text-faded)',
                        borderTop: s.endsWith(':00') ? '1px solid var(--admin-divider)' : 'none',
                      }}
                    >
                      {showLabel ? s : ''}
                    </div>
                  )
                })}
              </div>

              {/* Colunas por prof visível */}
              {visibleProfs.map((p) => {
                const profAppts = appts.filter((a) => a.professional_id === p.id)
                return (
                  <div
                    key={p.id}
                    className="relative"
                    style={{ height: gridHeight, borderLeft: '1px solid var(--admin-divider)' }}
                  >
                    {/* Slots clicáveis · hover-to-schedule · click abre popover */}
                    {slots.map((s, i) => {
                      const slotKey = `${p.id}-${s}`
                      const isHovered = hoveredSlot === slotKey
                      return (
                        <button
                          key={i}
                          type="button"
                          data-slot-trigger
                          onMouseEnter={() => setHoveredSlot(slotKey)}
                          onMouseLeave={() => setHoveredSlot((cur) => (cur === slotKey ? null : cur))}
                          onClick={(e) => openSlotPopover(e, p.id, p.name, s)}
                          className="absolute left-0 right-0 transition-colors group flex items-center justify-center text-left"
                          style={{
                            top: i * SLOT_HEIGHT,
                            height: SLOT_HEIGHT,
                            borderTop: s.endsWith(':00')
                              ? '1px solid var(--admin-divider)'
                              : '1px dashed color-mix(in srgb, var(--admin-divider) 50%, transparent)',
                            background: isHovered ? 'color-mix(in srgb, var(--brand-primary, #1AA9A8) 8%, transparent)' : 'transparent',
                            cursor: 'pointer',
                            zIndex: 1,
                          }}
                          aria-label={`Agendar ${p.name} às ${s}`}
                          title={`+ Agendar ${p.name} às ${s}`}
                        >
                          {isHovered && (
                            <span
                              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                              style={{
                                background: 'var(--brand-primary, #1AA9A8)',
                                color: '#fff',
                                boxShadow: '0 2px 6px -1px color-mix(in srgb, var(--brand-primary, #1AA9A8) 40%, transparent)',
                              }}
                            >
                              <IconPlus size={10} /> {s}
                            </span>
                          )}
                        </button>
                      )
                    })}

                    {/* Cards de agendamento · padrão 3D premium */}
                    {profAppts.map((a) => {
                      const startMin = timeToMinutes(a.start_time)
                      const endMin = timeToMinutes(a.end_time)
                      const top = ((startMin - dayStartMin) / interval) * SLOT_HEIGHT
                      const height = ((endMin - startMin) / interval) * SLOT_HEIGHT
                      const color = getColor(a)
                      const isPaid = !!a.paid_at
                      const isPending = a.status === 'pending'
                      const isCancelled = a.status === 'cancelled'
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedApptId(a.id)
                          }}
                          className="absolute left-1 right-1 rounded-lg p-2 flex flex-col overflow-hidden text-left transition-all hover:-translate-y-px"
                          style={{
                            top,
                            height: Math.max(height - 2, 24),
                            background: `linear-gradient(180deg, color-mix(in srgb, ${color} 14%, var(--admin-surface)) 0%, color-mix(in srgb, ${color} 22%, var(--admin-surface)) 100%)`,
                            borderLeft: `3px solid ${color}`,
                            borderTop: `1px solid color-mix(in srgb, ${color} 35%, rgba(255,255,255,0.5))`,
                            boxShadow: `0 4px 12px -4px color-mix(in srgb, ${color} 30%, transparent), 0 1px 2px rgba(0,0,0,0.04)`,
                            zIndex: 2,
                            cursor: 'pointer',
                            opacity: isCancelled ? 0.55 : 1,
                            textDecoration: isCancelled ? 'line-through' : 'none',
                          }}
                          title={`${a.start_time.slice(0, 5)} · ${a.client_name ?? 'Cliente'} · ${a.service_name ?? 'Serviço'}${isCancelled ? ' · CANCELADO' : ''}`}
                        >
                          <span className="text-[11px] font-bold tabular-nums leading-tight" style={{ color }}>
                            {a.start_time.slice(0, 5)} · {a.end_time.slice(0, 5)}
                          </span>
                          <span className="text-xs font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
                            {a.client_name ?? 'Cliente'}
                          </span>
                          {height >= SLOT_HEIGHT * 1.5 && (
                            <span className="text-[11px] truncate" style={{ color: 'var(--admin-text-mute)' }}>
                              {a.service_name ?? '—'}
                            </span>
                          )}
                          {isCancelled && (
                            <span
                              className="text-[9px] font-bold uppercase mt-auto inline-block w-fit px-1.5 py-0.5 rounded"
                              style={{
                                background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
                                color: '#fff',
                                boxShadow: '0 2px 4px -1px rgba(185,28,28,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                                textDecoration: 'none',
                              }}
                            >
                              Cancelado
                            </span>
                          )}
                          {!isCancelled && isPending && (
                            <span
                              className="text-[9px] font-bold uppercase mt-auto inline-block w-fit px-1.5 py-0.5 rounded"
                              style={{
                                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                color: '#fff',
                                boxShadow: '0 2px 4px -1px rgba(217,119,6,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                              }}
                            >
                              A confirmar
                            </span>
                          )}
                          {!isCancelled && isPaid && (
                            <span
                              className="text-[9px] font-bold uppercase mt-auto inline-block w-fit px-1.5 py-0.5 rounded"
                              style={{
                                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                color: '#fff',
                                boxShadow: '0 2px 4px -1px rgba(5,150,105,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                              }}
                            >
                              Pago
                            </span>
                          )}
                        </button>
                      )
                    })}

                    {/* Vazio · sem agendamentos */}
                    {profAppts.length === 0 && (
                      <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        style={{ color: 'var(--admin-text-faded)' }}
                      >
                        <span className="text-xs">Livre</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* POPOVER · 3 opções ao clicar em slot vazio · via portal pra fugir do overflow */}
      {popover && portalReady && createPortal(
        <div
          data-slot-popover
          className="fixed z-[200] rounded-2xl overflow-hidden"
          style={{
            top: popover.y + 8,
            left: Math.min(popover.x - 130, window.innerWidth - 280),
            width: 260,
            background: 'var(--admin-popover-bg, #FFFFFF)',
            border: '1px solid var(--admin-popover-border, #E2E8F0)',
            boxShadow: '0 20px 50px -10px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.06)',
          }}
        >
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ background: 'var(--admin-surface-hi)', borderBottom: '1px solid var(--admin-divider)' }}
          >
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                {popover.profName}
              </p>
              <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                {popover.time}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPopover(null)}
              aria-label="Fechar"
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              <IconClose size={14} />
            </button>
          </div>
          <div className="p-2 space-y-1">
            <button
              type="button"
              onClick={novoAtendimento}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-[var(--admin-surface-hi)]"
            >
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, var(--brand-primary, #1AA9A8) 0%, color-mix(in srgb, var(--brand-primary, #1AA9A8) 70%, black) 100%)',
                  color: '#fff',
                  boxShadow: '0 2px 6px -1px color-mix(in srgb, var(--brand-primary, #1AA9A8) 40%, transparent)',
                }}
              >
                <IconCalendar size={14} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>Novo Atendimento</p>
                <p className="text-[10px]" style={{ color: 'var(--admin-text-mute)' }}>Cliente · serviço · horário</p>
              </div>
            </button>
            <button
              type="button"
              onClick={novaVenda}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-[var(--admin-surface-hi)]"
            >
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#fff',
                  boxShadow: '0 2px 6px -1px rgba(5,150,105,0.4)',
                }}
              >
                <IconDollar size={14} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>Nova Venda</p>
                <p className="text-[10px]" style={{ color: 'var(--admin-text-mute)' }}>Produto ou serviço avulso</p>
              </div>
            </button>
            <button
              type="button"
              onClick={bloquearHorario}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-[var(--admin-surface-hi)]"
            >
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)',
                  color: '#fff',
                  boxShadow: '0 2px 6px -1px rgba(100,116,139,0.4)',
                }}
              >
                <IconClose size={14} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>Bloqueio de Horário</p>
                <p className="text-[10px]" style={{ color: 'var(--admin-text-mute)' }}>Almoço · folga · indisponível</p>
              </div>
            </button>
          </div>
        </div>,
        document.body,
      )}

      {/* DRAWER inline · click no card abre lateral sem trocar de rota · Salão99-style */}
      <AppointmentDrawer
        appointmentId={selectedApptId}
        businessId={businessId}
        onClose={closeDrawer}
      />

      {/* MODAL · Como interpretar as cores · explicação completa dos 4 modos */}
      <ColorHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}

/* ============================================================
 * Legenda contextual da grade · explica o que cada cor significa.
 * Varia conforme o colorMode escolhido no painel.
 * Em modo "professional" omite (header de profs ja deixa claro).
 * ============================================================ */
function ColorLegend({ colorMode, appts }: { colorMode: ColorMode; appts: Appt[] }) {
  // No modo profissional, header de profs ja eh autoexplicativo
  if (colorMode === 'professional') return null

  const chips: { color: string; label: string }[] = []

  if (colorMode === 'service') {
    // Deriva servicos unicos no dia (max 8 chips pra nao poluir)
    const unique = new Map<string, string>() // service_name -> color
    for (const a of appts) {
      const name = a.service_name ?? '—'
      if (!unique.has(name)) unique.set(name, colorForService(a))
      if (unique.size >= 8) break
    }
    if (unique.size === 0) {
      chips.push({ color: '#94A3B8', label: 'Sem agendamentos hoje' })
    } else {
      unique.forEach((color, name) => chips.push({ color, label: name }))
    }
  } else if (colorMode === 'progress') {
    chips.push(
      { color: '#F59E0B', label: 'A confirmar' },
      { color: '#01A197', label: 'Confirmado' },
      { color: '#3B82F6', label: 'Realizado' },
      { color: '#94A3B8', label: 'Faltou / cancelado' },
    )
  } else if (colorMode === 'payment') {
    chips.push(
      { color: '#10B981', label: 'Pago' },
      { color: '#F59E0B', label: 'A receber' },
      { color: '#94A3B8', label: 'Cancelado / faltou' },
    )
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 flex-wrap"
      style={{
        borderBottom: '1px solid var(--admin-divider)',
        background: 'var(--admin-surface-hi)',
      }}
    >
      <span
        className="text-[10px] font-bold uppercase tracking-widest flex-shrink-0"
        style={{ color: 'var(--admin-text-faded)' }}
      >
        Legenda:
      </span>
      {chips.map((c, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium"
          style={{ color: 'var(--admin-text-2)' }}
        >
          <span
            className="inline-block w-3 h-3 rounded"
            style={{
              background: `linear-gradient(180deg, color-mix(in srgb, ${c.color} 30%, var(--admin-surface)) 0%, color-mix(in srgb, ${c.color} 50%, var(--admin-surface)) 100%)`,
              borderLeft: `3px solid ${c.color}`,
            }}
            aria-hidden
          />
          {c.label}
        </span>
      ))}
    </div>
  )
}

/* ============================================================
 * Modal de ajuda · explica os 4 modos de cor + quando usar cada um.
 * Aberto pelo bot (?) no painel lateral. Educa cliente novo sem ser intrusivo.
 * ============================================================ */
function ColorHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => { setPortalReady(true) }, [])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open || !portalReady) return null

  const modes: { titulo: string; quando: string; chips: { color: string; label: string }[] }[] = [
    {
      titulo: 'Por serviço',
      quando: 'Use no dia a dia pra bater o olho e ver o mix de serviços. Se o dia inteiro for da mesma cor, é monocultura.',
      chips: [
        { color: '#01A197', label: 'Serviço 1' },
        { color: '#C9A961', label: 'Serviço 2' },
        { color: '#8B5CF6', label: 'Serviço 3' },
        { color: '#EC4899', label: 'Serviço 4' },
      ],
    },
    {
      titulo: 'Por profissional',
      quando: 'Use pra ver coluna por coluna se cada profissional tem dia cheio ou furos. Coluna vazia = receita parada.',
      chips: [
        { color: '#01A197', label: 'Profissional A' },
        { color: '#C9A961', label: 'Profissional B' },
        { color: '#8B5CF6', label: 'Profissional C' },
      ],
    },
    {
      titulo: 'Por andamento',
      quando: 'Use durante o expediente pra saber quem ainda não chegou e em quem cobrar confirmação no WhatsApp.',
      chips: [
        { color: '#F59E0B', label: 'A confirmar' },
        { color: '#01A197', label: 'Confirmado' },
        { color: '#3B82F6', label: 'Realizado' },
        { color: '#94A3B8', label: 'Faltou / cancelado' },
      ],
    },
    {
      titulo: 'Por pagamento',
      quando: 'Use no fechamento do caixa pra ver quem ainda está devendo. Tudo verde = caixa fechou redondo.',
      chips: [
        { color: '#10B981', label: 'Pago' },
        { color: '#F59E0B', label: 'A receber' },
        { color: '#94A3B8', label: 'Cancelado / faltou' },
      ],
    },
  ]

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="color-help-title"
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between p-5 pb-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--admin-divider)' }}
        >
          <div>
            <p
              className="text-[11px] font-bold uppercase tracking-widest mb-1"
              style={{ color: 'var(--admin-text-faded)' }}
            >
              Ajuda · Cor dos cards
            </p>
            <h3
              id="color-help-title"
              className="text-lg font-bold leading-tight"
              style={{ color: 'var(--admin-text)' }}
            >
              Como interpretar as cores
            </h3>
            <p className="text-sm mt-1.5" style={{ color: 'var(--admin-text-2)' }}>
              Você escolhe 4 modos diferentes de pintar a agenda. Cada um responde uma pergunta diferente.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 rounded-full transition-opacity hover:opacity-70"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            <IconClose size={18} />
          </button>
        </div>

        {/* Body · 4 modos */}
        <div className="overflow-y-auto p-5 space-y-4">
          {modes.map((m, i) => (
            <div
              key={i}
              className="rounded-2xl p-4"
              style={{
                background: 'var(--admin-surface-hi)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <h4 className="text-sm font-bold mb-1" style={{ color: 'var(--admin-text)' }}>
                {m.titulo}
              </h4>
              <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--admin-text-2)' }}>
                {m.quando}
              </p>
              <div className="flex flex-wrap gap-2">
                {m.chips.map((c, j) => (
                  <span
                    key={j}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md"
                    style={{
                      background: `linear-gradient(180deg, color-mix(in srgb, ${c.color} 14%, var(--admin-surface)) 0%, color-mix(in srgb, ${c.color} 22%, var(--admin-surface)) 100%)`,
                      borderLeft: `3px solid ${c.color}`,
                      color: 'var(--admin-text)',
                    }}
                  >
                    {c.label}
                  </span>
                ))}
              </div>
            </div>
          ))}

          <div
            className="rounded-xl p-3 text-xs"
            style={{
              background: 'color-mix(in srgb, var(--admin-accent) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--admin-accent) 25%, transparent)',
              color: 'var(--admin-text-2)',
            }}
          >
            <strong style={{ color: 'var(--admin-text)' }}>Dica:</strong> a escolha do modo fica gravada no
            seu navegador. Você pode trocar quantas vezes quiser sem afetar a equipe.
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
