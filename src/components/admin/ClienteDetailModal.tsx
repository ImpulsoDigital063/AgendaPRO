'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { initialsFor, avatarGradient, maskPhone } from '@/lib/client-display'
import { IconClose, IconWhatsapp, IconSparkles } from '@/components/ui/Icon'

type Customer = {
  id: string
  name: string
  phone: string
  email: string | null
  total_points: number
  referral_code: string | null
  created_at: string
}

type Appointment = {
  id: string
  date: string
  time: string
  service: string | null
  price: number | null
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  professional: string | null
}

type Props = {
  customerId: string
  onClose: () => void
}

const STATUS_CONFIG: Record<Appointment['status'], { label: string; color: string }> = {
  pending: { label: 'Pendente', color: '#F59E0B' },
  confirmed: { label: 'Confirmado', color: '#3B82F6' },
  completed: { label: 'Concluído', color: '#10B981' },
  cancelled: { label: 'Cancelado', color: '#94A3B8' },
  no_show: { label: 'Não compareceu', color: '#EF4444' },
}

function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatPrice(v: number | null) {
  if (!v) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ClienteDetailModal({ customerId, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [history, setHistory] = useState<Appointment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pointsDelta, setPointsDelta] = useState(10)
  const [adjustingPoints, setAdjustingPoints] = useState(false)
  const [pointsError, setPointsError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/customers/${customerId}`, {
          // Cache curto: cliente raramente muda, mas se admin
          // adicionar pontos noutra aba precisa atualizar
          cache: 'no-store',
        })
        if (!res.ok) throw new Error('Falha ao carregar')
        const data = await res.json()
        if (cancelled) return
        setCustomer(data.customer)
        setHistory(data.history || [])
        setEditName(data.customer.name)
        setEditEmail(data.customer.email || '')
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Erro')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [customerId])

  async function adjustPoints(delta: number) {
    if (!customer || delta === 0) return
    setAdjustingPoints(true)
    setPointsError(null)
    // Update otimista
    const previous = customer.total_points
    setCustomer({ ...customer, total_points: previous + delta })
    const res = await fetch(`/api/admin/customers/${customerId}/points`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ delta }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setPointsError(data.error || 'Erro ao atualizar pontos')
      // Reverte UI
      setCustomer({ ...customer, total_points: previous })
    } else {
      const data = await res.json()
      setCustomer({ ...customer, total_points: data.total_points })
      router.refresh() // sincroniza lista por tras
    }
    setAdjustingPoints(false)
  }

  async function saveEdit() {
    if (!customer) return
    const trimmedName = editName.trim()
    if (!trimmedName) return
    const res = await fetch(`/api/admin/customers/${customerId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: trimmedName, email: editEmail.trim() }),
    })
    if (res.ok) {
      setCustomer({ ...customer, name: trimmedName, email: editEmail.trim() || null })
      setEditing(false)
      router.refresh()
    }
  }

  const phoneDigits = customer?.phone.replace(/\D/g, '') ?? ''
  const waUrl = phoneDigits ? `https://wa.me/55${phoneDigits}` : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="admin-card w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl flex flex-col"
        style={{ maxHeight: 'calc(100vh - 16px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header sticky */}
        <div className="flex items-center justify-between p-4 sticky top-0 bg-inherit rounded-t-3xl" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
          <h3 className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
            Detalhes do cliente
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--admin-text-mute)' }}
            aria-label="Fechar"
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Conteúdo scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <SkeletonContent />
          ) : error ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--admin-danger, #EF4444)' }}>
              {error}
            </p>
          ) : customer ? (
            <>
              {/* Avatar + identidade */}
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                  style={{ background: avatarGradient(customer.name) }}
                >
                  {initialsFor(customer.name)}
                </div>
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="admin-input w-full text-base font-bold px-2 py-1"
                      autoFocus
                    />
                  ) : (
                    <p className="text-lg font-bold truncate" style={{ color: 'var(--admin-text)' }}>
                      {customer.name}
                    </p>
                  )}
                  <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
                    Cliente desde {formatDate(customer.created_at.split('T')[0])}
                  </p>
                </div>
                {!editing && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{ color: 'var(--admin-accent)', background: 'var(--admin-accent-bg)', border: '1px solid var(--admin-border)' }}
                  >
                    Editar
                  </button>
                )}
              </div>

              {/* Card de pontos */}
              <div
                className="p-4 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(139,92,246,0.04))',
                  border: '1px solid rgba(139,92,246,0.18)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#7C3AED' }}>
                    <IconSparkles size={11} /> Saldo de pontos
                  </span>
                  <span className="text-2xl font-extrabold tabular-nums" style={{ color: '#7C3AED' }}>
                    {customer.total_points}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={pointsDelta}
                    onChange={(e) => setPointsDelta(Number(e.target.value) || 0)}
                    min={1}
                    max={10000}
                    className="admin-input w-20 text-sm px-2 py-2 text-center"
                    aria-label="Quantidade"
                  />
                  <button
                    type="button"
                    onClick={() => adjustPoints(Math.abs(pointsDelta))}
                    disabled={adjustingPoints || pointsDelta <= 0}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                    style={{ background: '#10B981', color: '#fff' }}
                  >
                    + Adicionar
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustPoints(-Math.abs(pointsDelta))}
                    disabled={adjustingPoints || pointsDelta <= 0 || customer.total_points < pointsDelta}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                    style={{ background: '#EF4444', color: '#fff' }}
                  >
                    − Remover
                  </button>
                </div>
                {pointsError && (
                  <p className="text-[11px] mt-2" style={{ color: '#EF4444' }}>
                    {pointsError}
                  </p>
                )}
              </div>

              {/* Contato */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                  Contato
                </p>
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-xl"
                    style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)' }}
                  >
                    <IconWhatsapp size={16} />
                    <span className="text-sm font-medium" style={{ color: '#16A34A' }}>
                      {maskPhone(customer.phone)}
                    </span>
                  </a>
                )}
                {editing ? (
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Email"
                    className="admin-input w-full px-3 py-2.5 text-sm"
                  />
                ) : customer.email ? (
                  <p className="text-sm px-3 py-2.5 rounded-xl" style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}>
                    {customer.email}
                  </p>
                ) : null}

                {editing && (
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => { setEditing(false); setEditName(customer.name); setEditEmail(customer.email || '') }}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold"
                      style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)' }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold"
                      style={{ background: 'var(--admin-accent)', color: '#fff' }}
                    >
                      Salvar
                    </button>
                  </div>
                )}
              </div>

              {/* Histórico */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                    Histórico
                  </p>
                  <span className="text-[10px]" style={{ color: 'var(--admin-text-faded)' }}>
                    {history.length === 20 ? '20 últimos' : `${history.length} agendamento${history.length !== 1 ? 's' : ''}`}
                  </span>
                </div>

                {history.length === 0 ? (
                  <p className="text-xs text-center py-6 rounded-xl" style={{ color: 'var(--admin-text-faded)', background: 'var(--admin-input-bg)' }}>
                    Cliente ainda não tem agendamentos
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {history.map((apt) => {
                      const sCfg = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending
                      return (
                        <li
                          key={apt.id}
                          className="p-3 rounded-xl flex items-center gap-3"
                          style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}
                        >
                          <div className="text-center flex-shrink-0">
                            <p className="text-[10px] uppercase font-semibold" style={{ color: 'var(--admin-text-mute)' }}>
                              {formatDate(apt.date).slice(0, 5)}
                            </p>
                            <p className="text-[10px]" style={{ color: 'var(--admin-text-faded)' }}>
                              {apt.time?.slice(0, 5)}
                            </p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
                              {apt.service || 'Serviço'}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                                style={{ background: `${sCfg.color}20`, color: sCfg.color }}
                              >
                                {sCfg.label}
                              </span>
                              {apt.professional && (
                                <span className="text-[11px] truncate" style={{ color: 'var(--admin-text-faded)' }}>
                                  {apt.professional}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--admin-text)' }}>
                            {formatPrice(apt.price)}
                          </p>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function SkeletonContent() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-full" style={{ background: 'var(--admin-input-bg)' }} />
        <div className="flex-1 space-y-2">
          <div className="h-5 rounded w-2/3" style={{ background: 'var(--admin-input-bg)' }} />
          <div className="h-3 rounded w-1/3" style={{ background: 'var(--admin-input-bg)' }} />
        </div>
      </div>
      <div className="h-24 rounded-2xl" style={{ background: 'var(--admin-input-bg)' }} />
      <div className="h-12 rounded-xl" style={{ background: 'var(--admin-input-bg)' }} />
      <div className="space-y-2">
        <div className="h-14 rounded-xl" style={{ background: 'var(--admin-input-bg)' }} />
        <div className="h-14 rounded-xl" style={{ background: 'var(--admin-input-bg)' }} />
      </div>
    </div>
  )
}
