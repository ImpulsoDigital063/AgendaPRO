'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { IconChevronLeft, IconChevronRight, IconCalendar, IconDollar, IconClose, IconPlus, IconInfo, IconSettings, IconCheck, IconClock } from '@/components/ui/Icon'
import AppointmentDrawer from '@/components/admin/atendimentos/AppointmentDrawer'
import AgendarModal from '@/components/admin/desktop/atendimentos/AgendarModal'
import ResgatarPacoteModal, { type ResgateSelecionado } from '@/components/admin/pacotes/ResgatarPacoteModal'
import { PACOTE_ENABLED } from '@/lib/feature-flags'
import { MiniKPI } from './GradeTimelineHeader'
import { blockAppliesTo, blockTimeToMinutes, type BlockRow } from '@/lib/blocks'
import { todayBR } from '@/lib/date-br'

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
  is_package?: boolean
  combo_name?: string | null
  /** Convênio: atendimento feito PELA empresa (CAF · 21/08). */
  company_id?: string | null
  company?: { name: string } | { name: string }[] | null
}
type Service = { id: string; name: string; price: number | null; duration_minutes: number | null }

/** O join `company:companies(name)` volta objeto ou array conforme o caso. */
function nomeConvenio(a: Appt): string | null {
  if (!a.company) return null
  const c = Array.isArray(a.company) ? a.company[0] : a.company
  return c?.name ?? null
}

type ColorMode = 'service' | 'professional' | 'progress' | 'payment'
type Interval = 15 | 30 | 60

type Props = {
  businessId: string
  profs: Prof[]
  appts: Appt[]
  services: Service[]
  /** Bloqueios ativos do negócio · desenhados como faixa e barram agendamento */
  blocks?: BlockRow[]
  hourStart: number
  hourEnd: number
  /** Data da timeline (YYYY-MM-DD) · usado nos links do popover */
  date: string
  /** v145 · false = grade só de leitura: clicar no slot não abre agendamento */
  podeAgendar?: boolean
  /** KPIs do dia · renderizados acima da legenda só se date === HOJE
   *  (cravado 28/05: Eduardo pediu KPIs em cima da tabela, não no header) */
  recebidoHoje?: number
  aReceberHoje?: number
  pendentesHoje?: number
  /** Esconde os MiniKPI internos (aba "Eu" tem KPIs próprios do dono acima) */
  hideKpis?: boolean
  /**
   * Negócio aceita dois atendimentos no mesmo horário (CAF · 25/08/2026).
   *
   * Sem isto o card ocupava a célula inteira e cobria o slot clicável que fica
   * por baixo — o horário virava um beco: pra marcar o segundo paciente das
   * 08:00 não havia onde clicar. Com a flag, o card cede uma faixa à direita e
   * aquele pedaço continua abrindo o "Agendar" daquele profissional e hora.
   */
  permiteSimultaneo?: boolean
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

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Calcula "lanes" (colunas lado-a-lado) pra agendamentos que se sobrepõem no
 * tempo, evitando que um esconda o outro. Cancelados ficam SEMPRE na lane 0
 * (fundo, fininhos) porque são só histórico — os ativos ocupam as lanes da
 * frente. Retorna por id do appt: { lane, lanes } (índice e total no grupo).
 */
function computeLanes(appts: Appt[]): Record<string, { lane: number; lanes: number }> {
  const out: Record<string, { lane: number; lanes: number }> = {}
  // Só os ATIVOS disputam lanes (cancelado não entra na divisão de largura)
  const active = appts
    .filter((a) => a.status !== 'cancelled')
    .map((a) => ({ id: a.id, s: timeToMinutes(a.start_time), e: timeToMinutes(a.end_time) }))
    .sort((a, b) => a.s - b.s || a.e - b.e)

  // Agrupa em clusters que se tocam (qualquer cadeia de sobreposição)
  let i = 0
  while (i < active.length) {
    const cluster = [active[i]]
    let maxEnd = active[i].e
    let j = i + 1
    while (j < active.length && active[j].s < maxEnd) {
      cluster.push(active[j])
      if (active[j].e > maxEnd) maxEnd = active[j].e
      j++
    }
    // Atribui lane greedy dentro do cluster (primeira lane livre)
    const laneEnds: number[] = []
    for (const item of cluster) {
      let placed = -1
      for (let k = 0; k < laneEnds.length; k++) {
        if (item.s >= laneEnds[k]) { placed = k; break }
      }
      if (placed === -1) { placed = laneEnds.length; laneEnds.push(item.e) }
      else laneEnds[placed] = item.e
      out[item.id] = { lane: placed, lanes: 0 }
    }
    const total = laneEnds.length
    for (const item of cluster) out[item.id].lanes = total
    i = j
  }
  return out
}

// Ícone ⊘ (proibido) · usado nos blocos de bloqueio · padrão Salão99
function IconBlocked({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
    </svg>
  )
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

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function TimelineGridInteractive({
  podeAgendar = true,
  businessId,
  profs,
  appts: apptsDoServidor,
  services,
  blocks = [],
  hourStart,
  hourEnd,
  date,
  recebidoHoje: recebidoDoServidor = 0,
  aReceberHoje: aReceberDoServidor = 0,
  pendentesHoje = 0,
  hideKpis = false,
  permiteSimultaneo = false,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  // No painel da profissional a grade ocupa a tela toda · ajusta a altura útil
  const ehAreaProfissional = pathname.startsWith('/profissional')
  // Quem está logada · usado pra liberar bloqueio SÓ na coluna dela
  const [meuProfId, setMeuProfId] = useState<string | null>(null)
  useEffect(() => {
    if (!ehAreaProfissional) return
    const sb = createSupabaseClient()
    ;(async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data: p } = await sb.from('professionals').select('id').eq('auth_user_id', user.id).maybeSingle()
      setMeuProfId(p?.id ?? null)
    })()
  }, [ehAreaProfissional])
  const [popover, setPopover] = useState<PopoverState>(null)
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null) // `${profId}-${time}`
  const [portalReady, setPortalReady] = useState(false)
  // Drawer de Configurações em tablet/mobile (<lg) · cravado 28/05 estratégia tri-modal
  const [mobileConfigOpen, setMobileConfigOpen] = useState(false)
  // Drawer inline do agendamento clicado · Salão99-style · sem trocar de rota
  const [selectedApptId, setSelectedApptId] = useState<string | null>(null)
  // Resgate de pacote · prefill do AgendarModal vindo do ResgatarPacoteModal.
  const [resgatePrefill, setResgatePrefill] = useState<{ customer: { id: string; name: string; phone: string; total_points: number | null }; serviceId: string; balanceId: string } | null>(null)
  useEffect(() => { setPortalReady(true) }, [])

  /* ATUALIZACAO LOCAL DO PAGAMENTO (04/08/2026)
     ─────────────────────────────────────────────────────────────────
     closeDrawer() chamava router.refresh() SEMPRE — inclusive quando o
     dono so abria o atendimento pra olhar e fechava. Cada abertura
     custava uma re-renderizacao da agenda inteira no servidor, que fica
     em Oregon: ~220ms de travessia + todas as consultas do dia de novo.

     Agora marcar pago aplica o resultado AQUI, em cima do que o servidor
     ja mandou, e nao pede a pagina de novo. O router.refresh() sobrou so
     pro que muda a POSICAO do atendimento na grade (cancelar, remarcar),
     onde a tela precisa vir do servidor mesmo.

     Os ajustes locais sao descartados assim que chega lista nova do
     servidor (troca de dia, refresh de verdade): o servidor continua
     sendo a verdade, isso aqui so evita esperar por ela pra pintar o
     verde que o dono acabou de causar. */
  const [ajustesLocais, setAjustesLocais] = useState<Record<string, Partial<Appt>>>({})
  /* Os KPIs vem prontos do servidor. Sem mover o valor aqui tambem, o dono
     marcaria o pagamento, veria o card ficar verde e o "Recebido hoje"
     parado — parece que nao salvou. Pior que a lentidao que estamos
     tirando. Zera junto com os ajustes quando chega dado novo. */
  const [recebidoLocal, setRecebidoLocal] = useState(0)
  useEffect(() => { setAjustesLocais({}); setRecebidoLocal(0) }, [apptsDoServidor])
  const appts = Object.keys(ajustesLocais).length
    ? apptsDoServidor.map((a) => (ajustesLocais[a.id] ? { ...a, ...ajustesLocais[a.id] } : a))
    : apptsDoServidor

  function closeDrawer(precisaRecarregar = false) {
    setSelectedApptId(null)
    // So volta ao servidor quando a mudanca mexe na grade (cancelamento,
    // remarcacao). Pagamento ja foi aplicado localmente.
    if (precisaRecarregar) router.refresh()
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
      // popover usa position:fixed (viewport) — NÃO somar scrollY (era coord de
      // documento → popover caía "muito abaixo" no desktop com a agenda rolada).
      y: rect.top,
    })
  }

  // ── Bloqueios da data · faixa visual + barra clique de agendar ──────────
  // Lê business_blocks injetado pelo server (GradeTimeline). Antes a grade
  // ignorava bloqueio: não mostrava E deixava agendar por cima (bug 30/05).
  function blockReasonForSlot(profId: string, slotTime: string): string | null {
    const m = timeToMinutes(slotTime)
    for (const b of blocks) {
      if (!blockAppliesTo(b, profId, date)) continue
      const bs = blockTimeToMinutes(b.start_time)
      const be = blockTimeToMinutes(b.end_time)
      if (m >= bs && m < be) return b.reason?.trim() || 'Bloqueado'
    }
    return null
  }

  function blocksForProf(profId: string) {
    return blocks
      .filter((b) => blockAppliesTo(b, profId, date))
      .map((b) => ({
        id: b.id,
        startMin: blockTimeToMinutes(b.start_time),
        endMin: blockTimeToMinutes(b.end_time),
        reason: b.reason?.trim() || 'Bloqueado',
      }))
  }

  function novoAtendimento() {
    if (!popover) return
    const params = new URLSearchParams({
      agendar: '1',
      prof: popover.profId,
      date,
      time: popover.time,
    })
    router.push(`?${params.toString()}`)
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

  // Bloqueio da PRÓPRIA agenda (30/07) · a profissional não vai pras
  // Configurações do negócio (rota de dona): resolve num modal curto aqui mesmo,
  // e o servidor grava só na agenda dela.
  const [bloqueioProf, setBloqueioProf] = useState<{ time: string } | null>(null)
  const [bloqueioDur, setBloqueioDur] = useState(60)
  const [bloqueioMotivo, setBloqueioMotivo] = useState('')
  const [bloqueioErro, setBloqueioErro] = useState<string | null>(null)
  const [bloqueando, setBloqueando] = useState(false)

  function abrirBloqueioProprio() {
    if (!popover) return
    setBloqueioMotivo('')
    setBloqueioErro(null)
    setBloqueioDur(60)
    setBloqueioProf({ time: popover.time })
    setPopover(null)
  }

  async function confirmarBloqueioProprio() {
    if (!bloqueioProf) return
    setBloqueando(true)
    setBloqueioErro(null)
    const [h, m] = bloqueioProf.time.split(':').map(Number)
    const fimMin = h * 60 + m + bloqueioDur
    const fim = `${String(Math.floor(fimMin / 60) % 24).padStart(2, '0')}:${String(fimMin % 60).padStart(2, '0')}`
    const res = await fetch('/api/profissional/bloqueio', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date, start_time: bloqueioProf.time, end_time: fim, reason: bloqueioMotivo }),
    })
    setBloqueando(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setBloqueioErro(d.detail || 'Não consegui bloquear. Tenta de novo.')
      return
    }
    setBloqueioProf(null)
    router.refresh()
  }

  // Estado · profs visíveis · intervalo · cor · sidebar recolhida
  // Persistência via localStorage por business (key isolada por negócio).
  // Guardamos quem está ESCONDIDO, não quem está visível (Eduardo 30/07).
  // Antes era lista de visíveis: profissional cadastrada DEPOIS não estava na
  // lista salva e nascia invisível na grade, sem explicação — a dona contratava
  // alguém e a pessoa simplesmente não aparecia. Com lista de escondidos, todo
  // mundo nasce marcado e só some se alguém desmarcar de propósito.
  const [hiddenProfIds, setHiddenProfIds] = useState<Set<string>>(() => new Set())
  const visibleProfIds = useMemo(
    () => new Set(profs.filter((p) => !hiddenProfIds.has(p.id)).map((p) => p.id)),
    [profs, hiddenProfIds],
  )
  const [interval, setInterval] = useState<Interval>(30)
  const [colorMode, setColorMode] = useState<ColorMode>('service')
  const [collapsed, setCollapsed] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  // isToday só preenche após hidratação · evita mismatch SSR (CIC Onda 5C P0 #1)
  const [todayClient, setTodayClient] = useState<string | null>(null)
  useEffect(() => { setTodayClient(todayBR()) }, [])
  const isToday = todayClient !== null && date === todayClient

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`agendapro-timeline-config-${businessId}`)
      if (raw) {
        const cfg = JSON.parse(raw) as { hiddenProfIds?: string[]; visibleProfIds?: string[]; interval?: Interval; colorMode?: ColorMode; collapsed?: boolean }
        // Config antiga (visibleProfIds) é IGNORADA de propósito: ela não sabe
        // distinguir "escondi de propósito" de "essa profissional nem existia
        // quando salvei". Na primeira abertura depois desta versão, todo mundo
        // volta a aparecer — que é o comportamento que a pessoa espera.
        if (cfg.hiddenProfIds) setHiddenProfIds(new Set(cfg.hiddenProfIds))
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
          hiddenProfIds: Array.from(hiddenProfIds),
          interval,
          colorMode,
          collapsed,
        }),
      )
    } catch {/* ignore */}
  }, [hiddenProfIds, interval, colorMode, collapsed, hydrated, businessId])

  const visibleProfs = profs.filter((p) => visibleProfIds.has(p.id))
  const slots = buildSlots(hourStart, hourEnd, interval)
  // Altura proporcional ao intervalo · 30min=56 · 15min=28 · 60min=112
  const SLOT_HEIGHT = (SLOT_HEIGHT_30 * interval) / 30
  const gridHeight = slots.length * SLOT_HEIGHT
  const dayStartMin = hourStart * 60

  function toggleProf(id: string) {
    setHiddenProfIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id) // estava escondida → mostra
      else next.add(id)                 // estava visível → esconde
      return next
    })
  }

  function getColor(a: Appt): string {
    if (colorMode === 'professional') return colorForProf(a.professional_id)
    if (colorMode === 'progress') return colorForProgress(a)
    if (colorMode === 'payment') return colorForPayment(a)
    return colorForService(a) // default
  }

  // Body do painel Configurações · reusado em 2 contextos:
  // 1) Inline desktop (≥lg): aside fixa à esquerda da grade
  // 2) Drawer mobile/tablet (<lg): overlay slide-out via portal
  // Cravado 28/05 · estratégia tri-modal Eduardo
  const configBody = (
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
                  onClick={() => setHiddenProfIds(new Set())}
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
  )

  return (
    <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-start">
      {/* Botão Configurações · só <lg · abre drawer
          Tablet/Mobile usa drawer pra liberar a largura inteira pra grade */}
      <button
        type="button"
        onClick={() => setMobileConfigOpen(true)}
        className="lg:hidden self-start inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
        style={{
          background: 'var(--admin-surface)',
          color: 'var(--admin-text-2)',
          border: '1px solid var(--admin-border)',
          minHeight: 44, // iOS HIG touch target
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
        aria-label="Abrir configurações"
      >
        <IconSettings size={16} />
        <span>Configurações</span>
        <span
          className="ml-1 text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full"
          style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}
        >
          {visibleProfs.length}/{profs.length}
        </span>
      </button>

      {/* PAINEL LATERAL CONFIGURAÇÕES · só ≥lg (desktop wide)
          recolhível via botão chevron */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 rounded-2xl overflow-hidden transition-all"
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
          configBody
        )}
      </aside>

      {/* DRAWER mobile/tablet · <lg · slide-out à esquerda */}
      {mobileConfigOpen && portalReady && createPortal(
        <div className="fixed inset-0 z-[180] lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(10,36,36,0.55)', backdropFilter: 'blur(2px)' }}
            onClick={() => setMobileConfigOpen(false)}
          />
          <aside
            className="absolute left-0 top-0 bottom-0 overflow-y-auto"
            style={{
              width: 'min(320px, 88vw)',
              background: 'var(--admin-surface)',
              borderRight: '1px solid var(--admin-border)',
              paddingBottom: 'env(safe-area-inset-bottom)',
              boxShadow: '4px 0 20px rgba(0,0,0,0.18)',
            }}
          >
            <div
              className="flex items-center justify-between px-3 py-3 sticky top-0"
              style={{ background: 'var(--admin-surface)', borderBottom: '1px solid var(--admin-divider)', zIndex: 1 }}
            >
              <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
                Configurações da agenda
              </p>
              <button
                type="button"
                onClick={() => setMobileConfigOpen(false)}
                aria-label="Fechar"
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ color: 'var(--admin-text-mute)' }}
              >
                <IconClose size={18} />
              </button>
            </div>
            {configBody}
          </aside>
        </div>,
        document.body,
      )}

      {/* Wrapper da área principal (KPIs + GRADE)
          KPIs ficam SEPARADOS do card da grade (cravado 28/05 Eduardo) */}
      <div className="w-full lg:flex-1 min-w-0 space-y-3">
        {/* KPIs do dia · só se date === HOJE · cards próprios fora da grade.
            hideKpis: aba "Eu" suprime (tem KPIs próprios do dono acima). */}
        {isToday && !hideKpis && (
          <div className="grid grid-cols-3 gap-2">
            <MiniKPI
              label="Recebido"
              value={formatBRL(recebidoDoServidor + recebidoLocal)}
              color="#10B981"
              colorDark="#059669"
              Icon={IconDollar}
            />
            <MiniKPI
              label="A receber"
              value={formatBRL(Math.max(0, aReceberDoServidor - recebidoLocal))}
              color="#1AA9A8"
              colorDark="#0E7C7B"
              Icon={IconCheck}
            />
            <MiniKPI
              label="Pendentes"
              value={pendentesHoje.toString()}
              color="#F59E0B"
              colorDark="#D97706"
              Icon={IconClock}
              pulse={pendentesHoje > 0}
            />
          </div>
        )}

      {/* GRADE · card branco com legenda + scroll horizontal */}
      <div
        className="rounded-2xl overflow-hidden"
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

            {/* Container scrollable (horizontal + vertical) que envolve header
                + grade. Cravado 28/05 por Eduardo: em tablet, ao swipe horizontal
                pra ver mais profs, os NOMES das profs (header) tinham que
                mover JUNTO com as marcações · antes eram 2 grids separados,
                só o body scrollava · header ficava preso. */}
            <div
              className="relative overflow-auto"
              style={{
                // 03/06: dock removido (R1) liberou espaço vertical no mobile/tablet.
                // Tela dedicada a atendimento → grade mais alta. Offset menor = mais linhas.
                //
                // 30/07: no painel da PROFISSIONAL a grade é a tela inteira — não
                // tem KPIs nem menu acima dela, então sobrava um vão morto entre o
                // fim da grade e o bottom nav (Eduardo: "aumenta o grid pra ir até
                // o final"). Offset menor só nessa área; admin e recepção seguem
                // com o valor calibrado em 03/06.
                maxHeight: ehAreaProfissional
                  ? 'calc(100svh - 132px)'
                  : 'calc(100svh - 188px)',
              }}
            >
              {/* Header de profs · sticky no topo (vertical) · move com scroll horizontal */}
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

              {/* Grade · mesmo gridTemplateColumns que o header (alinhamento perfeito) */}
              <div
                className="grid relative"
                style={{
                  gridTemplateColumns: `64px repeat(${visibleProfs.length}, minmax(140px, 1fr))`,
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
                // Lanes p/ sobreposição · quando 2+ agendamentos ATIVOS colidem
                // no horário, dividem a largura lado-a-lado (Google Calendar
                // style) pra nenhum esconder o outro (bug 01/06: Gilmara
                // confirmed sumia atrás da Luana cancelada). Cancelados ficam
                // sempre na lane 0, fininhos, atrás — são só histórico.
                const laneInfo = computeLanes(profAppts)
                return (
                  <div
                    key={p.id}
                    className="relative"
                    style={{ height: gridHeight, borderLeft: '1px solid var(--admin-divider)' }}
                  >
                    {/* Slots clicáveis · hover-to-schedule · click abre popover */}
                    {slots.map((s, i) => {
                      const slotKey = `${p.id}-${s}`
                      const blockReason = blockReasonForSlot(p.id, s)
                      const isBlk = !!blockReason
                      const isHovered = !isBlk && hoveredSlot === slotKey
                      return (
                        <button
                          key={i}
                          type="button"
                          data-slot-trigger
                          onMouseEnter={() => { if (!isBlk) setHoveredSlot(slotKey) }}
                          onMouseLeave={() => setHoveredSlot((cur) => (cur === slotKey ? null : cur))}
                          onClick={(e) => {
                            // Slot bloqueado: não abre o popover de agendar (bug 30/05).
                            if (isBlk) { e.stopPropagation(); return }
                            openSlotPopover(e, p.id, p.name, s)
                          }}
                          className="absolute left-0 right-0 transition-colors group flex items-center justify-center text-left"
                          style={{
                            top: i * SLOT_HEIGHT,
                            height: SLOT_HEIGHT,
                            borderTop: s.endsWith(':00')
                              ? '1px solid var(--admin-divider)'
                              : '1px dashed color-mix(in srgb, var(--admin-divider) 50%, transparent)',
                            background: isHovered ? 'color-mix(in srgb, var(--brand-primary, #1AA9A8) 8%, transparent)' : 'transparent',
                            cursor: isBlk ? 'not-allowed' : 'pointer',
                            zIndex: 1,
                          }}
                          aria-label={isBlk ? `Bloqueado às ${s} · ${blockReason}` : `Agendar ${p.name} às ${s}`}
                          title={isBlk ? `Horário bloqueado · ${blockReason}` : `+ Agendar ${p.name} às ${s}`}
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

                    {/* Faixa de BLOQUEIO · visual sobre a coluna · pointer-events
                        none deixa o clique chegar no slot (que está guardado).
                        zIndex 1 (acima do fundo do slot, abaixo dos cards z2). */}
                    {blocksForProf(p.id).map((blk) => {
                      const top = ((blk.startMin - dayStartMin) / interval) * SLOT_HEIGHT
                      const height = ((blk.endMin - blk.startMin) / interval) * SLOT_HEIGHT
                      const blkH = Math.max(height - 2, 18)
                      // Cinza CHAPADO sólido · padrão Salão99 que Marko/Luana já
                      // conhecem. Cobre o slot (pointer-events auto · cursor
                      // not-allowed) pra deixar claro que é indisponível; o gate
                      // no submit é a trava real. Tiny (<30px) = só motivo inline.
                      const isTinyBlk = blkH < 30
                      return (
                        <div
                          key={blk.id}
                          className={`absolute left-1 right-1 rounded-lg overflow-hidden flex flex-col ${isTinyBlk ? 'justify-center px-1.5' : 'px-2 py-1'}`}
                          style={{
                            top,
                            height: blkH,
                            zIndex: 2,
                            cursor: 'not-allowed',
                            background: '#E9ECF1',
                            borderLeft: '3px solid #94A3B8',
                            borderTop: '1px solid rgba(255,255,255,0.6)',
                            boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.25)',
                          }}
                          title={`Horário bloqueado · ${blk.reason}`}
                        >
                          {isTinyBlk ? (
                            <span className="text-[10px] font-semibold uppercase tracking-wider truncate flex items-center gap-1" style={{ color: '#64748B' }}>
                              <IconBlocked size={10} /> {blk.reason}
                            </span>
                          ) : (
                            <>
                              <span className="text-[10px] font-bold tabular-nums leading-tight flex items-center gap-1" style={{ color: '#64748B' }}>
                                <IconBlocked size={11} />
                                {minutesToTime(blk.startMin)}–{minutesToTime(blk.endMin)}
                              </span>
                              <span className="text-[11px] font-semibold leading-tight truncate" style={{ color: '#475569' }}>
                                {blk.reason}
                              </span>
                            </>
                          )}
                        </div>
                      )
                    })}

                    {/* Cards de agendamento · padrão 3D premium · layout adaptativo por duração */}
                    {profAppts.map((a) => {
                      const startMin = timeToMinutes(a.start_time)
                      const endMin = timeToMinutes(a.end_time)
                      const durationMin = endMin - startMin
                      const top = ((startMin - dayStartMin) / interval) * SLOT_HEIGHT
                      const height = ((endMin - startMin) / interval) * SLOT_HEIGHT
                      const color = getColor(a)
                      const isPaid = !!a.paid_at
                      const isPending = a.status === 'pending'
                      const isCancelled = a.status === 'cancelled'
                      // Tamanhos por duração (em minutos, previsível independente do interval)
                      const isTiny = durationMin < 25 // 1 linha inline
                      const isCompact = !isTiny && durationMin < 45 // 2 linhas
                      // Posição horizontal por lane (sobreposição lado-a-lado).
                      // Cancelado: faixa fininha à esquerda (z atrás) · ativo:
                      // sua fatia da largura conforme nº de lanes do cluster.
                      const li = laneInfo[a.id]
                      const lanes = li?.lanes ?? 1
                      const lane = li?.lane ?? 0
                      /* Faixa à direita que o card NÃO ocupa, deixando o slot de
                         baixo clicável. Só em negócio com agendamento simultâneo:
                         onde dois no mesmo horário são proibidos, "ocupado" é a
                         resposta certa e a faixa só levaria a um erro de conflito. */
                      const faixaLivre = permiteSimultaneo ? 22 : 0
                      const leftStyle = isCancelled
                        ? { left: 4, width: 10 } // só um "talinho" cinza de histórico
                        : {
                            left: `calc(${(lane / lanes) * 100}% + 4px)`,
                            width: `calc(${(1 / lanes) * 100}% - 6px - ${faixaLivre / lanes}px)`,
                          }
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={(e) => {
                            if (isCancelled) return // card cancelado é só histórico · slot por baixo é o que abre o popover de Agendar
                            e.stopPropagation()
                            setSelectedApptId(a.id)
                          }}
                          className={`absolute rounded-lg flex flex-col overflow-hidden text-left transition-all hover:-translate-y-px ${isTiny ? 'px-1.5 py-0.5' : isCompact ? 'px-2 py-1' : 'p-2'}`}
                          style={{
                            ...leftStyle,
                            top,
                            height: Math.max(height - 2, 22),
                            background: `linear-gradient(180deg, color-mix(in srgb, ${color} 14%, var(--admin-surface)) 0%, color-mix(in srgb, ${color} 22%, var(--admin-surface)) 100%)`,
                            borderLeft: `3px solid ${color}`,
                            borderTop: `1px solid color-mix(in srgb, ${color} 35%, rgba(255,255,255,0.5))`,
                            boxShadow: `0 4px 12px -4px color-mix(in srgb, ${color} 30%, transparent), 0 1px 2px rgba(0,0,0,0.04)`,
                            // Cancelado: z-index BAIXO (fica abaixo do slot) + pointer-events: none
                            // → libera o slot pra novo agendamento por cima
                            zIndex: isCancelled ? 0 : 2,
                            pointerEvents: isCancelled ? 'none' : 'auto',
                            cursor: isCancelled ? 'default' : 'pointer',
                            opacity: isCancelled ? 0.55 : 1,
                            textDecoration: isCancelled ? 'line-through' : 'none',
                          }}
                          title={`${a.start_time.slice(0, 5)} · ${a.client_name ?? 'Cliente'} · ${a.service_name ?? 'Serviço'}${nomeConvenio(a) ? ` · convênio ${nomeConvenio(a)}` : ''}${isCancelled ? ' · CANCELADO · slot livre pra reagendar' : ''}`}
                        >
                          {isTiny ? (
                            // 1 linha · horário pequeno + nome inline
                            <span className="flex items-center gap-1.5 truncate text-[10px] leading-none">
                              <span className="font-bold tabular-nums flex-shrink-0" style={{ color }}>
                                {a.start_time.slice(0, 5)}
                              </span>
                              <span className="font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
                                {a.client_name ?? 'Cliente'}
                              </span>
                            </span>
                          ) : (
                            <>
                              <span className={`font-bold tabular-nums leading-tight ${isCompact ? 'text-[10px]' : 'text-[11px]'}`} style={{ color }}>
                                {a.start_time.slice(0, 5)} · {a.end_time.slice(0, 5)}
                              </span>
                              <span className={`font-semibold truncate ${isCompact ? 'text-[11px]' : 'text-xs'} leading-tight`} style={{ color: 'var(--admin-text)' }}>
                                {a.client_name ?? 'Cliente'}
                              </span>
                            </>
                          )}
                          {!isTiny && !isCompact && (
                            <span className="text-[11px] truncate" style={{ color: 'var(--admin-text-mute)' }}>
                              {a.service_name ?? '—'}
                            </span>
                          )}
                          {/* Resgate de pacote · selo curto + cor de destaque. O valor
                              não entra no caixa (já pago na venda do pacote) · a comissão
                              da profissional sai na Remunerações. */}
                          {!isTiny && a.is_package && (
                            <span
                              className={`text-[9px] font-bold uppercase inline-block w-fit px-1.5 py-0.5 rounded ${isCompact ? 'mt-0.5' : 'mt-1'}`}
                              style={{
                                background: 'color-mix(in srgb, var(--admin-accent) 88%, black)',
                                color: '#fff',
                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
                              }}
                              title="Sessão de pacote resgatada · não entra no caixa"
                            >
                              Pacote
                            </span>
                          )}
                          {/* Convênio · o Eduardo prometeu no áudio de 20/08 (10:04)
                              que o card diria a empresa. Sem isso o Gustavo não
                              distingue no olho o que é particular do que é convênio. */}
                          {!isTiny && nomeConvenio(a) && (
                            <span
                              className={`font-bold uppercase inline-block w-fit max-w-full truncate py-0.5 rounded ${
                                lanes > 1 ? 'text-[8px] px-1 tracking-tight' : 'text-[9px] px-1.5'
                              } ${isCompact ? 'mt-0.5' : 'mt-1'}`}
                              style={{
                                background: 'linear-gradient(180deg, #0EA5E9 0%, #0284C7 100%)',
                                color: '#fff',
                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
                              }}
                              title={`Convênio: ${nomeConvenio(a)}`}
                            >
                              {/* Card dividido não tem largura pra nome de empresa:
                                  "Convênio · Prefeitura..." virava "CONVÊ..." e só a
                                  empresa virava "PREFEIT...". Decisão do Eduardo
                                  (25/08): o card diz QUE é convênio, o detalhe diz de
                                  QUEM é. Fonte um passo menor pra caber inteiro. */}
                              {lanes > 1 ? 'Convênio' : `Convênio · ${nomeConvenio(a)}`}
                            </span>
                          )}
                          {/* Combo · selo com o NOME do combo, pra diferenciar de um
                              atendimento comum (Eduardo 24/07). Roxo = cor de combo/produto. */}
                          {!isTiny && a.combo_name && (
                            <span
                              className={`text-[9px] font-bold uppercase inline-block w-fit max-w-full truncate px-1.5 py-0.5 rounded ${isCompact ? 'mt-0.5' : 'mt-1'}`}
                              style={{
                                background: 'linear-gradient(180deg, #9333EA 0%, #7E22CE 100%)',
                                color: '#fff',
                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
                              }}
                              title={`Combo: ${a.combo_name}`}
                            >
                              Combo · {a.combo_name}
                            </span>
                          )}
                          {/* Chips só aparecem em cards com folga (>=45min) · evita poluir tiny/compact */}
                          {!isTiny && !isCompact && isCancelled && (
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
                          {!isTiny && !isCompact && !isCancelled && isPending && (
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
                          {!isTiny && !isCompact && !isCancelled && isPaid && (
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
                          {/* Card pequeno (tiny/compact · ex. 30min ou sobreposto) não
                              cabe o selo grande → mostra ponto de status no canto pra o
                              "Pago"/"A confirmar" NÃO sumir. Cravado 02/06/2026 (Luana:
                              importados de 30min apareciam sem selo apesar de pagos). */}
                          {(isTiny || isCompact) && !isCancelled && (isPaid || isPending) && (
                            <span
                              className="absolute flex items-center justify-center rounded-full"
                              style={{
                                top: 3,
                                right: 3,
                                width: 14,
                                height: 14,
                                background: isPaid ? '#10B981' : '#F59E0B',
                                boxShadow: '0 0 0 1.5px var(--admin-surface)',
                              }}
                              title={isPaid ? 'Pago' : 'A confirmar'}
                            >
                              {isPaid && (
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </span>
                          )}
                        </button>
                      )
                    })}

                    {/* Faixa "+" ao lado de cada card · só onde o negócio aceita
                        dois no mesmo horário. É a porta pro segundo paciente:
                        com o card ocupando a célula inteira, o horário cheio não
                        tinha onde ser clicado (Eduardo, 25/08). */}
                    {permiteSimultaneo && profAppts.map((a) => {
                      if (a.status === 'cancelled') return null
                      const li = laneInfo[a.id]
                      const lanes = li?.lanes ?? 1
                      const lane = li?.lane ?? 0
                      const startMin = timeToMinutes(a.start_time)
                      const endMin = timeToMinutes(a.end_time)
                      const top = ((startMin - dayStartMin) / interval) * SLOT_HEIGHT
                      const height = ((endMin - startMin) / interval) * SLOT_HEIGHT
                      const hora = a.start_time.slice(0, 5)
                      const largura = 22 / lanes
                      return (
                        <button
                          key={`add-${a.id}`}
                          type="button"
                          data-slot-trigger
                          onClick={(e) => {
                            e.stopPropagation()
                            openSlotPopover(e, p.id, p.name, hora)
                          }}
                          className="absolute rounded-r-lg flex items-start justify-center pt-1 transition-colors group/add"
                          style={{
                            left: `calc(${((lane + 1) / lanes) * 100}% - ${largura + 2}px)`,
                            width: Math.max(largura - 2, 8),
                            top,
                            height: Math.max(height - 2, 22),
                            zIndex: 6,
                          }}
                          title={`+ Agendar ${p.name} às ${hora} (mesmo horário)`}
                          aria-label={`Agendar outro atendimento com ${p.name} às ${hora}`}
                        >
                          <span
                            className="text-[13px] font-bold leading-none opacity-40 group-hover/add:opacity-100 transition-opacity"
                            style={{ color: 'var(--admin-text-mute)' }}
                          >
                            +
                          </span>
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
              {/* fim do grid body · fechamento do wrapper scrollable a seguir */}
            </div>
          </>
        )}
      </div>
      </div>
      {/* ↑ fim do wrapper externo (KPIs + GRADE separados) */}

      {/* POPOVER · 3 opções ao clicar em slot vazio · via portal pra fugir do overflow */}
      {popover && portalReady && createPortal(
        <div
          data-slot-popover
          className="fixed z-[200] rounded-2xl overflow-hidden"
          style={{
            // clampa pra não estourar a borda de baixo (slot perto do fim da tela)
            top: Math.min(popover.y + 8, window.innerHeight - 230),
            left: Math.max(8, Math.min(popover.x - 130, window.innerWidth - 280)),
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
            {/* "Nova Venda" e "Bloqueio de Horário" não existem pra profissional
                (Eduardo 30/07: clicou em bloqueio e foi parar na tela de criar
                negócio). As duas empurram pra rotas de /admin — venda pro caixa,
                bloqueio pras Configurações — e o layout do admin manda quem não
                é dona pra /cadastro. Além do bug, nenhuma das duas é poder dela:
                caixa e bloqueio de agenda são da administração. */}
            {!ehAreaProfissional && (
            <>
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
            </>
            )}

            {/* Profissional bloqueia a PRÓPRIA agenda · só na coluna dela
                (Eduardo 30/07: "deve estar aí, pra quando elas precisam
                bloquear a sua agenda"). Resolve num modal aqui mesmo — ela não
                tem acesso às Configurações do negócio. */}
            {ehAreaProfissional && !!meuProfId && popover.profId === meuProfId && (
              <button
                type="button"
                onClick={abrirBloqueioProprio}
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
                  <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>Bloquear meu horário</p>
                  <p className="text-[10px]" style={{ color: 'var(--admin-text-mute)' }}>Almoço · folga · compromisso</p>
                </div>
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}

      {/* Modal do bloqueio próprio · curto de propósito: horário já vem do toque,
          ela só escolhe por quanto tempo e (se quiser) o motivo. */}
      {bloqueioProf && portalReady && createPortal(
        <div
          className="fixed inset-0 z-[330] flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setBloqueioProf(null)}
        >
          <div
            className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 space-y-4"
            style={{ background: 'var(--admin-popover-bg, #fff)', border: '1px solid var(--admin-popover-border, #E2E8F0)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                Bloquear minha agenda
              </p>
              <p className="text-lg font-bold" style={{ color: 'var(--admin-text)' }}>
                {bloqueioProf.time} · {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--admin-text-mute)' }}>
                Por quanto tempo
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[30, 60, 120, 240].map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setBloqueioDur(min)}
                    className="py-2.5 rounded-xl text-sm font-bold"
                    style={
                      bloqueioDur === min
                        ? { background: 'var(--admin-accent)', color: '#fff' }
                        : { background: 'var(--admin-input-bg)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)' }
                    }
                  >
                    {min < 60 ? `${min}min` : `${min / 60}h`}
                  </button>
                ))}
              </div>
            </div>

            <input
              value={bloqueioMotivo}
              onChange={(e) => setBloqueioMotivo(e.target.value)}
              placeholder="Motivo (opcional) · almoço, médico…"
              maxLength={80}
              className="w-full px-3 py-2.5 rounded-xl text-sm"
              style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
            />

            {bloqueioErro && (
              <p className="text-xs" style={{ color: 'var(--admin-danger, #DC2626)' }}>{bloqueioErro}</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBloqueioProf(null)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text)' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarBloqueioProprio}
                disabled={bloqueando}
                className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background: 'linear-gradient(180deg, #64748B 0%, #475569 100%)', color: '#fff' }}
              >
                {bloqueando ? 'Bloqueando…' : 'Bloquear'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* DRAWER inline · click no card abre lateral sem trocar de rota · Salão99-style */}
      <AppointmentDrawer
        appointmentId={selectedApptId}
        businessId={businessId}
        onClose={closeDrawer}
        // Pagamento pinta o card aqui mesmo — sem pedir a agenda inteira
        // de volta ao servidor (ver comentario em closeDrawer).
        onPago={(id, dados) => {
          setAjustesLocais((atual) => ({ ...atual, [id]: { ...atual[id], ...dados } }))
          const valor = dados.total_price ?? apptsDoServidor.find((a) => a.id === id)?.total_price ?? 0
          setRecebidoLocal((v) => v + Number(valor || 0))
        }}
      />

      {/* MODAL · Como interpretar as cores · explicação completa dos 4 modos */}
      <ColorHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* MODAL de agendamento Salão99-style · abre via ?agendar=1.
          CIC Onda 5B #10: onClose ia hardcoded pra /admin, perdia rota se
          aberto de /admin/inicio. Agora usa pathname dinâmico. */}
      <AgendarModal
        open={podeAgendar && searchParams.get('agendar') === '1'}
        businessId={businessId}
        professionals={profs}
        services={services}
        defaultProfId={searchParams.get('prof')}
        defaultDate={searchParams.get('date') ?? date}
        defaultTime={searchParams.get('time')}
        onClose={() => {
          router.replace(pathname)
          router.refresh()
        }}
      />

      {/* MODAL de VENDA DE BALCÃO · abre via ?balcao=1 · mesmo motor do Agendar,
          modo balcão (já concluído + hoje + agora, sem agenda). Pra negócio que
          atende e registra na hora sem marcar (Izanara/Palace · Eduardo 09/06). */}
      <AgendarModal
        open={searchParams.get('balcao') === '1'}
        balcao
        businessId={businessId}
        professionals={profs}
        services={services}
        defaultProfId={searchParams.get('prof')}
        defaultDate={date}
        onClose={() => {
          router.replace(pathname)
          router.refresh()
        }}
      />

      {/* RESGATAR PACOTE · abre via ?resgatar=1 (botão da agenda ou vindo da aba
          Pacotes). Busca a cliente → mostra pacotes ativos → "Resgatar" abre o
          AgendarModal já com cliente + serviço + resgate ligados (Eduardo 24/07). */}
      {PACOTE_ENABLED && searchParams.get('resgatar') === '1' && (
        <ResgatarPacoteModal
          onClose={() => { router.replace(pathname) }}
          onResgatar={(r: ResgateSelecionado) => {
            setResgatePrefill({
              customer: { id: r.customer.id, name: r.customer.name, phone: r.customer.phone ?? '', total_points: null },
              serviceId: r.serviceId,
              balanceId: r.balanceId,
            })
            router.replace(pathname) // fecha o ?resgatar · o AgendarModal abre por estado
          }}
        />
      )}
      {resgatePrefill && (
        <AgendarModal
          open
          businessId={businessId}
          professionals={profs}
          services={services}
          defaultDate={date}
          initialCustomer={resgatePrefill.customer}
          initialServiceId={resgatePrefill.serviceId}
          initialResgateBalanceId={resgatePrefill.balanceId}
          onClose={() => { setResgatePrefill(null); router.refresh() }}
        />
      )}
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
