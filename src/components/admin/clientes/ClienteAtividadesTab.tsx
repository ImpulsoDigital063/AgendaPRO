'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IconChevronRight, IconWhatsapp, IconExternalLink } from '@/components/ui/Icon'

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
}

type InvoiceRef = {
  id: string
  invoice: { id: string; invoice_number: number; status: string } | null
}

type Props = {
  customerId: string
  customerName: string
  customerPhone: string | null
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

export default function ClienteAtividadesTab({ customerId, customerName, customerPhone }: Props) {
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])
  const [invoicesById, setInvoicesById] = useState<Record<string, InvoiceRef>>({})
  const [loading, setLoading] = useState(true)
  const [filterPeriod, setFilterPeriod] = useState<'past' | 'future'>('past')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)
  const [showLembrete, setShowLembrete] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    const sb = createClient()
    async function load() {
      setLoading(true)
      let q = sb
        .from('appointments')
        .select(`
          id, appointment_date, start_time, end_time, service_name, total_price,
          status, paid_at, payment_method, invoice_item_id, professional_id,
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

  const selected = activities.find((a) => a.id === selectedId)

  function describeStatus(a: Activity): { label: string; color: string } {
    if (a.status === 'cancelled') return { label: 'Cancelada', color: 'var(--admin-danger,#EF4444)' }
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

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={filterPeriod}
          onChange={(e) => setFilterPeriod(e.target.value as 'past' | 'future')}
          className="admin-input text-sm py-2 px-3"
        >
          <option value="past">Até Hoje</option>
          <option value="future">Futuros</option>
        </select>
        <p className="text-xs ml-auto" style={{ color: 'var(--admin-text-mute)' }}>
          {activities.length} {activities.length === 1 ? 'atividade' : 'atividades'}
        </p>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-center text-sm py-10" style={{ color: 'var(--admin-text-mute)' }}>
          Carregando atividades…
        </p>
      ) : activities.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
            Nenhuma atividade foi encontrada
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
                <th className="text-right px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Situação</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a, idx) => {
                const st = describeStatus(a)
                const isSelected = selectedId === a.id
                return (
                  <tr
                    key={a.id}
                    onClick={() => setSelectedId(isSelected ? null : a.id)}
                    className="cursor-pointer hover:bg-[var(--admin-surface-hi)]"
                    style={{
                      borderBottom: idx < activities.length - 1 ? '1px solid var(--admin-divider)' : 'none',
                      background: isSelected ? 'color-mix(in srgb, var(--admin-accent) 8%, transparent)' : 'transparent',
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
                    <td className="px-3 py-2 align-top text-sm" style={{ color: 'var(--admin-text)' }}>
                      {a.service_name ?? '—'}
                    </td>
                    <td className="px-3 py-2 align-top text-sm" style={{ color: 'var(--admin-text-2)' }}>
                      {a.professional?.name ?? '—'}
                    </td>
                    <td className="px-3 py-2 align-top text-right tabular-nums font-semibold" style={{ color: 'var(--admin-text)' }}>
                      {formatBRL(a.total_price)}
                    </td>
                    <td className="px-3 py-2 align-top text-right">
                      <span className="text-xs font-bold" style={{ color: st.color }}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

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

  return (
    <div className="fixed inset-0 z-[110]" role="dialog" aria-modal="true">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div
        className="absolute rounded-2xl p-5"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
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
    </div>
  )
}
