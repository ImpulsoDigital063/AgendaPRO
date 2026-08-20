'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IconChevronRight, IconWhatsapp, IconExternalLink, IconCheck, IconClose, IconCalendar } from '@/components/ui/Icon'
import ConfirmActionModal from '@/components/admin/ConfirmActionModal'

type Activity = {
  id: string
  appointment_date: string
  start_time: string
  end_time: string | null
  service_name: string | null
  total_price: number | null
  status: string
  paid_at: string | null
  payment_method: string | null
  invoice_item_id: string | null
  professional: { name: string } | null
  professional_id: string | null
  /** v121 · atendimento antigo lancado a mao na ficha (nao passou pelo sistema) */
  historical: boolean | null
}

type InvoiceRef = {
  id: string
  invoice: { id: string; invoice_number: number; status: string } | null
}

type Props = {
  customerId: string
  customerName: string
  customerPhone: string | null
  /** Fecha o drawer pai · usado ao Reagendar pra navegação ter efeito visual */
  onCloseDrawer?: () => void
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'pending', label: 'Horário Marcado' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'completed', label: 'Concluído' },
  { value: 'no_show', label: 'Faltou' },
  { value: 'cancelled', label: 'Cancelado' },
]

function formatBRL(v: number | null): string {
  if (v == null) return 'R$ 0,00'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
}

function formatDateLong(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

type StatusFilter = 'all' | 'completed' | 'pending' | 'cancelled' | 'paid'

const STATUS_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'completed', label: 'Concluídos' },
  { value: 'paid', label: 'Pagos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'cancelled', label: 'Cancelados' },
]

export default function ClienteAtividadesTab({ customerId, customerName, customerPhone, onCloseDrawer }: Props) {
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])
  const [invoicesById, setInvoicesById] = useState<Record<string, InvoiceRef>>({})
  const [loading, setLoading] = useState(true)
  const [filterPeriod, setFilterPeriod] = useState<'past' | 'future'>('past')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)
  const [showLembrete, setShowLembrete] = useState(false)
  const [openKebab, setOpenKebab] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    const sb = createClient()
    async function load() {
      setLoading(true)
      let q = sb
        .from('appointments')
        .select(`
          id, appointment_date, start_time, end_time, service_name, total_price,
          status, paid_at, payment_method, invoice_item_id, professional_id, historical,
          professional:professionals(name)
        `)
        .eq('customer_id', customerId)

      if (filterPeriod === 'past') {
        q = q.lte('appointment_date', today)
      } else {
        q = q.gt('appointment_date', today)
      }

      const { data } = await q.order('appointment_date', { ascending: false }).order('start_time', { ascending: false })
      const list = (data ?? []) as unknown as Activity[]
      setActivities(list)

      // Carrega invoices vinculadas
      const invIds = list.map((a) => a.invoice_item_id).filter(Boolean) as string[]
      if (invIds.length > 0) {
        const { data: items } = await sb
          .from('invoice_items')
          .select('id, invoice:invoices(id, invoice_number, status)')
          .in('id', invIds)
        const map: Record<string, InvoiceRef> = {}
        for (const it of (items ?? []) as unknown as InvoiceRef[]) {
          map[it.id] = it
        }
        setInvoicesById(map)
      } else {
        setInvoicesById({})
      }
      setLoading(false)
    }
    load()
  }, [customerId, filterPeriod, today])

  function describeStatus(a: Activity): { label: string; color: string } {
    if (a.status === 'cancelled') return { label: 'Cancelada', color: 'var(--admin-danger,#EF4444)' }
    // v121 · lancamento retroativo nao tem comanda nem paid_at de proposito.
    // Sem este atalho ele caía no "Pendente" do fim da função e parecia
    // atendimento esperando cobrança — o oposto do que o registro significa.
    if (a.historical) return { label: 'Concluído', color: '#10B981' }
    if (a.invoice_item_id) {
      const inv = invoicesById[a.invoice_item_id]
      if (inv?.invoice) {
        if (inv.invoice.status === 'closed') return { label: `#${inv.invoice.invoice_number} · Fechada`, color: 'var(--admin-accent)' }
        if (inv.invoice.status === 'open') return { label: `#${inv.invoice.invoice_number} · Aberta`, color: 'var(--admin-accent)' }
      }
    }
    if (a.paid_at) return { label: 'Pago', color: '#10B981' }
    return { label: 'Pendente', color: 'var(--admin-text-mute)' }
  }

  async function changeStatus(activityId: string, newStatus: string) {
    setStatusUpdating(activityId)
    const sb = createClient()
    await sb.from('appointments').update({ status: newStatus }).eq('id', activityId)
    // Reload
    setActivities((prev) => prev.map((a) => (a.id === activityId ? { ...a, status: newStatus } : a)))
    setStatusUpdating(null)
    router.refresh()
  }

  async function togglePaid(activity: Activity) {
    setStatusUpdating(activity.id)
    const wasPaid = !!activity.paid_at
    const res = await fetch(`/api/admin/appointments/${activity.id}/payment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(wasPaid ? { paid: false } : { method: 'cash' }),
    })
    if (res.ok) {
      const now = new Date().toISOString()
      setActivities((prev) =>
        prev.map((a) =>
          a.id === activity.id ? { ...a, paid_at: wasPaid ? null : now, payment_method: wasPaid ? null : 'cash' } : a
        )
      )
      router.refresh()
    }
    setStatusUpdating(null)
    setOpenKebab(null)
  }

  function reagendarVia(activity: Activity) {
    // Redireciona pra timeline na data do agendamento · prof pré-selecionado.
    // Fecha o drawer ANTES de navegar · senão fica sobreposto e usuario nao
    // ve que algo aconteceu.
    const date = activity.appointment_date
    setOpenKebab(null)
    onCloseDrawer?.()
    router.push(`/admin?date=${date}#prof-${activity.professional_id ?? ''}`)
  }

  async function confirmCancelar(activityId: string) {
    await changeStatus(activityId, 'cancelled')
    setConfirmCancel(null)
    setOpenKebab(null)
  }

  // Anos disponíveis · derivado das activities pra select
  const availableYears = Array.from(
    new Set(activities.map((a) => a.appointment_date.slice(0, 4)))
  ).sort((a, b) => b.localeCompare(a))

  // Filtros aplicados client-side (status + ano)
  const filtered = activities.filter((a) => {
    if (yearFilter !== 'all' && !a.appointment_date.startsWith(yearFilter)) return false
    if (statusFilter === 'all') return true
    if (statusFilter === 'cancelled') return a.status === 'cancelled'
    if (statusFilter === 'completed') return a.status === 'completed'
    if (statusFilter === 'pending') return (a.status === 'pending' || a.status === 'confirmed') && !a.paid_at
    if (statusFilter === 'paid') return !!a.paid_at
    return true
  })

  const selected = filtered.find((a) => a.id === selectedId)

  return (
    <div className="space-y-3">
      {/* Filtros · linha 1: período + ano + contador */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={filterPeriod}
          onChange={(e) => setFilterPeriod(e.target.value as 'past' | 'future')}
          className="admin-input text-sm py-2 px-3"
        >
          <option value="past">Até Hoje</option>
          <option value="future">Futuros</option>
        </select>
        {availableYears.length > 0 && (
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="admin-input text-sm py-2 px-3"
          >
            <option value="all">Todos os anos</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        )}
        <p className="text-xs ml-auto" style={{ color: 'var(--admin-text-mute)' }}>
          {filtered.length} {filtered.length === 1 ? 'atividade' : 'atividades'}
        </p>
      </div>

      {/* Filtros · linha 2: chips de status */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_CHIPS.map((chip) => {
          const active = statusFilter === chip.value
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => setStatusFilter(chip.value)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
              style={
                active
                  ? { background: 'var(--admin-accent)', color: '#fff' }
                  : { background: 'var(--admin-surface)', color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }
              }
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-center text-sm py-10" style={{ color: 'var(--admin-text-mute)' }}>
          Carregando atividades…
        </p>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
            Nenhuma atividade {activities.length > 0 ? 'bate com os filtros' : 'foi encontrada'}
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  background: 'var(--admin-surface-hi)',
                  borderBottom: '1px solid var(--admin-border)',
                }}
              >
                <th className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Data</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Descrição</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Profissional</th>
                <th className="text-right px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Valor</th>
                <th className="text-center px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Situação</th>
                <th className="px-2 py-2.5 w-9"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, idx) => {
                const st = describeStatus(a)
                const isSelected = selectedId === a.id
                const isCancelled = a.status === 'cancelled'
                return (
                  <tr
                    key={a.id}
                    onClick={() => setSelectedId(isSelected ? null : a.id)}
                    className="cursor-pointer hover:bg-[var(--admin-surface-hi)]"
                    style={{
                      borderBottom: idx < filtered.length - 1 ? '1px solid var(--admin-divider)' : 'none',
                      background: isSelected ? 'color-mix(in srgb, var(--admin-accent) 8%, transparent)' : 'transparent',
                      opacity: isCancelled ? 0.55 : 1,
                    }}
                  >
                    <td className="px-3 py-2 align-top">
                      <p className="font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                        {formatDate(a.appointment_date)}
                      </p>
                      <p className="text-[10px] tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>
                        {a.start_time.slice(0, 5)}
                      </p>
                    </td>
                    <td className="px-3 py-2 align-top text-sm" style={{ color: 'var(--admin-text)', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                      {a.service_name ?? '—'}
                      {/* v121 · registro antigo nao tem valor nem comanda de
                          proposito — sem esse selo parece atendimento perdido. */}
                      {a.historical && (
                        <span
                          className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider align-middle"
                          style={{
                            background: 'var(--admin-input-bg)',
                            border: '1px solid var(--admin-border)',
                            color: 'var(--admin-text-mute)',
                          }}
                          title="Lançado à mão na ficha · não gera comanda nem entra no financeiro"
                        >
                          Registro antigo
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-sm" style={{ color: 'var(--admin-text-2)' }}>
                      {a.professional?.name ?? '—'}
                    </td>
                    <td className="px-3 py-2 align-top text-right tabular-nums font-semibold" style={{ color: 'var(--admin-text)' }}>
                      {formatBRL(a.total_price)}
                    </td>
                    <td className="px-3 py-2 align-top text-center">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          background: `color-mix(in srgb, ${st.color} 14%, transparent)`,
                          color: st.color,
                          border: `1px solid color-mix(in srgb, ${st.color} 30%, transparent)`,
                        }}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="px-2 py-2 align-top text-right" onClick={(e) => e.stopPropagation()}>
                      <KebabMenu
                        activity={a}
                        isPaid={!!a.paid_at}
                        isCancelled={isCancelled}
                        open={openKebab === a.id}
                        onToggle={() => setOpenKebab(openKebab === a.id ? null : a.id)}
                        onClose={() => setOpenKebab(null)}
                        onTogglePaid={() => togglePaid(a)}
                        onReagendar={() => reagendarVia(a)}
                        onCancelar={() => setConfirmCancel(a.id)}
                        onLembrete={() => { setSelectedId(a.id); setOpenKebab(null); setShowLembrete(true) }}
                        disabled={statusUpdating === a.id}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmação de cancelamento */}
      <ConfirmActionModal
        open={!!confirmCancel}
        title="Cancelar este atendimento?"
        message="O cliente vai ver como cancelado. Você pode reverter mudando o status manualmente depois."
        confirmLabel="Sim, cancelar"
        cancelLabel="Voltar"
        tone="danger"
        loading={statusUpdating === confirmCancel}
        onConfirm={() => confirmCancel && confirmCancelar(confirmCancel)}
        onClose={() => setConfirmCancel(null)}
      />

      {/* Popover de detalhe · expand inline abaixo da tabela */}
      {selected && (
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-accent)',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-bold" style={{ color: 'var(--admin-text)' }}>
              {selected.service_name ?? 'Atendimento'}
            </h3>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="Fechar"
              className="p-1 rounded-lg"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              ✕
            </button>
          </div>

          <p className="text-sm capitalize" style={{ color: 'var(--admin-text-mute)' }}>
            {formatDateLong(selected.appointment_date)} · {selected.start_time.slice(0, 5)}
            {selected.end_time && ` até ${selected.end_time.slice(0, 5)}`}
          </p>
          <p className="text-sm" style={{ color: 'var(--admin-text-2)' }}>
            {selected.professional?.name ?? '—'}
          </p>
          <p className="text-2xl font-bold tabular-nums mt-2 mb-3" style={{ color: 'var(--admin-text)' }}>
            {formatBRL(selected.total_price)}
          </p>

          {/* Status dropdown */}
          <div className="mb-3">
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
              Status do atendimento
            </label>
            <select
              value={selected.status}
              onChange={(e) => changeStatus(selected.id, e.target.value)}
              disabled={statusUpdating === selected.id}
              className="admin-input w-full py-2 px-3 text-sm"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  ✓ {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Linha Comanda */}
          {selected.invoice_item_id && invoicesById[selected.invoice_item_id]?.invoice && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-3"
              style={{
                background: 'color-mix(in srgb, var(--admin-accent) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--admin-accent) 30%, transparent)',
              }}
            >
              <span className="text-sm font-bold flex-1" style={{ color: 'var(--admin-accent)' }}>
                ✓ Comanda {invoicesById[selected.invoice_item_id]!.invoice!.status === 'closed' ? 'Fechada' : 'Aberta'}: #{invoicesById[selected.invoice_item_id]!.invoice!.invoice_number}
              </span>
              <IconExternalLink size={14} />
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowLembrete(true)}
              disabled={!customerPhone}
              className="flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-40 flex items-center justify-center gap-1.5"
              style={{ background: 'var(--admin-surface-hi)', color: 'var(--admin-text)' }}
            >
              <IconWhatsapp size={14} /> Enviar Lembrete
            </button>
          </div>
        </div>
      )}

      {/* Modal Enviar Lembrete */}
      {showLembrete && selected && customerPhone && (
        <LembreteModal
          customerName={customerName}
          customerPhone={customerPhone}
          appointment={selected}
          onClose={() => setShowLembrete(false)}
        />
      )}
    </div>
  )
}

function LembreteModal({
  customerName,
  customerPhone,
  appointment,
  onClose,
}: {
  customerName: string
  customerPhone: string
  appointment: Activity
  onClose: () => void
}) {
  const [scope, setScope] = useState<'this' | 'day' | 'day-future'>('this')

  function sendWhatsApp() {
    const date = formatDateLong(appointment.appointment_date)
    let msg = ''
    if (scope === 'this') {
      msg = `Olá ${customerName}! Lembrete do seu atendimento de *${appointment.service_name}* em ${date} às ${appointment.start_time.slice(0, 5)}. Te esperamos!`
    } else if (scope === 'day') {
      msg = `Olá ${customerName}! Você tem atendimento agendado em ${date}. Te esperamos!`
    } else {
      msg = `Olá ${customerName}! Lembrete dos seus atendimentos a partir de ${date}. Te esperamos!`
    }
    const phone = customerPhone.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
    onClose()
  }

  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => { setPortalReady(true) }, [])
  if (!portalReady) return null

  return createPortal(
    <div className="fixed inset-0 z-[110]" role="dialog" aria-modal="true">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div
        className="absolute rounded-2xl p-5"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          minWidth: 360,
          maxWidth: 440,
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
            {customerName}
          </h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="p-1" style={{ color: 'var(--admin-text-mute)' }}>✕</button>
        </div>

        <div className="space-y-2 mb-4">
          {[
            { v: 'this' as const, l: 'Enviar o lembrete apenas deste agendamento' },
            { v: 'day' as const, l: 'Enviar o lembrete com todos os agendamentos marcados para este dia' },
            { v: 'day-future' as const, l: 'Enviar o lembrete com todos os agendamentos marcados para este dia e futuros' },
          ].map((opt) => (
            <label key={opt.v} className="flex items-start gap-2 cursor-pointer text-sm" style={{ color: 'var(--admin-text)' }}>
              <input type="radio" checked={scope === opt.v} onChange={() => setScope(opt.v)} className="mt-1" />
              <span>{opt.l}</span>
            </label>
          ))}
        </div>

        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-faded)' }}>
            Enviar para o telefone:
          </p>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--admin-surface-hi)' }}>
            <IconWhatsapp size={14} />
            <span className="text-sm tabular-nums" style={{ color: 'var(--admin-text)' }}>
              {customerPhone}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={sendWhatsApp}
          className="w-full py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider"
          style={{ background: 'var(--admin-accent)', color: '#fff' }}
        >
          Enviar Lembrete
        </button>
      </div>
    </div>,
    document.body
  )
}

/**
 * Kebab dropdown · ações por linha. Portal pra não ser cortado pelo overflow
 * do drawer. Fecha ao clicar fora ou ESC.
 */
function KebabMenu({
  activity,
  isPaid,
  isCancelled,
  open,
  onToggle,
  onClose,
  onTogglePaid,
  onReagendar,
  onCancelar,
  onLembrete,
  disabled,
}: {
  activity: Activity
  isPaid: boolean
  isCancelled: boolean
  open: boolean
  onToggle: () => void
  onClose: () => void
  onTogglePaid: () => void
  onReagendar: () => void
  onCancelar: () => void
  onLembrete: () => void
  disabled: boolean
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null)

  useEffect(() => {
    if (!open) {
      setCoords(null)
      return
    }
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setCoords({ top: r.bottom + 4, right: window.innerWidth - r.right })
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    // Usar 'click' (NÃO 'mousedown') · mousedown dispara ANTES do click do
    // botão, fechando o dropdown sem deixar o botão processar. Click vem
    // depois · botão dispara handler primeiro · dropdown fecha em seguida.
    function onClick(e: MouseEvent) {
      const target = e.target as Node
      if (btnRef.current?.contains(target)) return
      // Se clique foi dentro do menu portal · não fecha
      const menu = document.querySelector('[data-kebab-menu="true"]')
      if (menu?.contains(target)) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    setTimeout(() => document.addEventListener('click', onClick), 0)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick)
    }
  }, [open, onClose])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle() }}
        disabled={disabled}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
        style={{ color: 'var(--admin-text-mute)' }}
        aria-label="Mais ações"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {open && coords && typeof document !== 'undefined' && createPortal(
        <div
          data-kebab-menu="true"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: coords.top,
            right: coords.right,
            zIndex: 200,
            minWidth: 220,
            borderRadius: 12,
            background: 'var(--admin-popover-bg, #FFFFFF)',
            border: '1px solid var(--admin-popover-border, #E2E8F0)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
            padding: 4,
          }}
        >
          {!isCancelled && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onTogglePaid() }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-[var(--admin-surface-hi)]"
              style={{ color: isPaid ? 'var(--admin-text-mute)' : 'var(--admin-accent)' }}
            >
              <IconCheck size={14} />
              {isPaid ? 'Desmarcar pagamento' : 'Marcar como pago'}
            </button>
          )}
          {!isCancelled && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onReagendar() }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-[var(--admin-surface-hi)]"
              style={{ color: 'var(--admin-text)' }}
            >
              <IconCalendar size={14} />
              Reagendar
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onLembrete() }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-[var(--admin-surface-hi)]"
            style={{ color: 'var(--admin-text)' }}
          >
            <IconWhatsapp size={14} />
            Enviar lembrete
          </button>
          {!isCancelled && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCancelar() }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-[var(--admin-surface-hi)]"
              style={{ color: '#EF4444' }}
            >
              <IconClose size={14} />
              Cancelar atendimento
            </button>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
