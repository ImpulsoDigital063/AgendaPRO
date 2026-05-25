'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { IconClose, IconCalendar, IconClock, IconDollar, IconUser, IconExternalLink } from '@/components/ui/Icon'
import AppointmentActions from './AppointmentActions'
import Link from 'next/link'

type Props = {
  appointmentId: string | null
  businessId: string
  onClose: () => void
}

type ApptDetail = {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  status: string
  paid_at: string | null
  payment_method: string | null
  total_price: number | null
  notes: string | null
  client_name: string | null
  client_phone: string | null
  customer_id: string | null
  service_name: string | null
  professional: { id: string; name: string } | { id: string; name: string }[] | null
  customer: { id: string; name: string; phone: string; email: string | null } | { id: string; name: string; phone: string; email: string | null }[] | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando confirmação',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Não compareceu',
}

const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#1AA9A8',
  completed: '#3B82F6',
  cancelled: '#EF4444',
  no_show: '#94A3B8',
}

function formatBRL(v: number | null): string {
  if (v == null) return 'R$ 0,00'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDateLong(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
}

export default function AppointmentDrawer({ appointmentId, businessId, onClose }: Props) {
  const [data, setData] = useState<ApptDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => { setPortalReady(true) }, [])

  useEffect(() => {
    if (!appointmentId) {
      setData(null)
      return
    }
    setLoading(true)
    const sb = createClient()
    sb.from('appointments')
      .select(`
        id, appointment_date, start_time, end_time, status, paid_at,
        payment_method, total_price, notes,
        client_name, client_phone, customer_id,
        service_name,
        professional:professionals(id, name),
        customer:customers(id, name, phone, email)
      `)
      .eq('id', appointmentId)
      .maybeSingle()
      .then(({ data: d }) => {
        setData(d as ApptDetail | null)
        setLoading(false)
      })
  }, [appointmentId])

  useEffect(() => {
    if (!appointmentId) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [appointmentId, onClose])

  if (!appointmentId || !portalReady) return null

  const prof = data && (Array.isArray(data.professional) ? data.professional[0] : data.professional)
  const customer = data && (Array.isArray(data.customer) ? data.customer[0] : data.customer)
  const status = data?.status ?? 'pending'
  const statusLabel = STATUS_LABEL[status] ?? status
  const statusColor = STATUS_COLOR[status] ?? '#94A3B8'
  const isPaid = !!data?.paid_at
  const isCancelled = status === 'cancelled' || status === 'no_show'

  return createPortal(
    <div className="fixed inset-0 z-[150]" role="dialog" aria-modal="true">
      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* Drawer · 480px direita · padrão 3D premium */}
      <div
        className="absolute inset-y-0 right-0 flex flex-col"
        style={{
          width: 'min(520px, 100vw)',
          background: 'var(--admin-surface)',
          boxShadow: '-12px 0 32px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header sticky */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-3 flex-shrink-0"
          style={{
            background: 'var(--admin-surface-hi)',
            borderBottom: '1px solid var(--admin-border)',
          }}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
              Atendimento
            </p>
            <p className="text-base font-bold truncate" style={{ color: 'var(--admin-text)' }}>
              {data?.service_name ?? (loading ? 'Carregando...' : 'Serviço')}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {data && (
              <Link
                href={`/admin/atendimentos/${data.id}`}
                aria-label="Abrir em tela cheia"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--admin-input-bg)]"
                style={{ color: 'var(--admin-text-mute)' }}
                title="Abrir página completa"
              >
                <IconExternalLink size={14} />
              </Link>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--admin-input-bg)]"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              <IconClose size={16} />
            </button>
          </div>
        </div>

        {/* Body scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && (
            <p className="text-center text-sm py-10" style={{ color: 'var(--admin-text-mute)' }}>
              Carregando...
            </p>
          )}

          {data && (
            <>
              {/* Status + Pago */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${statusColor} 0%, color-mix(in srgb, ${statusColor} 75%, black) 100%)`,
                    color: '#fff',
                    boxShadow: `0 2px 6px -1px color-mix(in srgb, ${statusColor} 50%, transparent), inset 0 1px 0 rgba(255,255,255,0.3)`,
                  }}
                >
                  {statusLabel}
                </span>
                {isPaid && (
                  <span
                    className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#fff',
                      boxShadow: '0 2px 6px -1px rgba(5,150,105,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                    }}
                  >
                    ✓ Pago
                  </span>
                )}
              </div>

              {/* Rows */}
              <div className="space-y-3">
                <Row icon={<IconUser size={16} />} label="Cliente" value={data.client_name ?? customer?.name ?? '—'} sub={data.client_phone ?? customer?.phone ?? undefined} />
                <Row icon={<IconCalendar size={16} />} label="Quando" value={<span className="capitalize">{formatDateLong(data.appointment_date)}</span>} sub={`${data.start_time.slice(0, 5)} até ${data.end_time.slice(0, 5)}`} />
                <Row icon={<IconClock size={16} />} label="Profissional" value={prof?.name ?? '—'} />
                <Row icon={<IconDollar size={16} />} label="Valor" value={<span className="font-bold text-lg" style={{ color: 'var(--admin-text)' }}>{formatBRL(data.total_price)}</span>} sub={data.payment_method ?? undefined} />
                {data.notes && (
                  <div className="pt-3 border-t" style={{ borderColor: 'var(--admin-divider)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                      Observação
                    </p>
                    <p className="text-sm" style={{ color: 'var(--admin-text-2)' }}>{data.notes}</p>
                  </div>
                )}
              </div>

              {/* Ações · sem mostrar pra cancelados */}
              {!isCancelled && (
                <AppointmentActions
                  appointmentId={data.id}
                  isPaid={isPaid}
                  backHref={`/admin?date=${data.appointment_date}`}
                  customerName={data.client_name ?? customer?.name ?? 'Cliente'}
                  customerPhone={data.client_phone ?? customer?.phone ?? null}
                  businessId={businessId}
                  totalPrice={data.total_price}
                  serviceName={data.service_name}
                  professionalId={prof?.id ?? null}
                  onDone={onClose}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Row({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text-mute)' }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
          {label}
        </p>
        <div className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{value}</div>
        {sub && (
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>{sub}</p>
        )}
      </div>
    </div>
  )
}
