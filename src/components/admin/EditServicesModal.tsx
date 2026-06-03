'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { IconClose, IconCheck } from '@/components/ui/Icon'

type Service = {
  id: string
  name: string
  price: number | null
  duration_minutes: number
  points: number | null
}

type Props = {
  appointmentId: string
  startTime: string
  /** Status atual · mantido por compat com chamadores · o bloqueio de comanda
   *  paga vem do backend (locked) via GET, não mais do status. */
  currentStatus?: string
  onClose: () => void
}

function formatHour(time: string): string {
  return time.slice(0, 5)
}

function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function calcEndTime(startTime: string, durationMin: number): string {
  const [sh, sm] = startTime.split(':').map(Number)
  const total = sh * 60 + sm + durationMin
  const eh = Math.floor(total / 60).toString().padStart(2, '0')
  const em = (total % 60).toString().padStart(2, '0')
  return `${eh}:${em}`
}

export default function EditServicesModal({
  appointmentId,
  startTime,
  onClose,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  // locked = comanda já paga (invoice fechada). Editar serviço aqui descasaria
  // o financeiro · backend bloqueia 409 e a UI mostra o caminho (reabrir).
  const [locked, setLocked] = useState(false)
  // Conflict state: quando API retorna 409 com canForce=true, mostra warning
  // amarelo + botao "Salvar mesmo assim" · profissional decide.
  const [conflict, setConflict] = useState<string | null>(null)
  // Flag pra evitar setState após unmount em fluxos async (cancelar
  // durante fetch, fechar antes de salvar concluir). React 18 não loga
  // mais o warning, mas continua boa prática evitar memory leaks.
  const mountedRef = useRef(true)
  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  // Portal-mount guard: createPortal precisa de document, que só existe
  // no client. Sem essa flag, SSR explode. Setado após primeiro mount.
  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => { setPortalReady(true) }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/admin/appointments/${appointmentId}/services`, {
          cache: 'no-store',
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          if (!cancelled) setError(data.error || 'Erro ao carregar serviços')
          return
        }
        const data = await res.json()
        if (cancelled) return
        setServices(data.services || [])
        setSelectedIds(new Set(data.currentServiceIds || []))
        setLocked(data.appointment?.locked === true)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [appointmentId])

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedServices = services.filter((s) => selectedIds.has(s.id))
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0)
  const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price ?? 0), 0)
  const newEndTime = totalDuration > 0 ? calcEndTime(startTime, totalDuration) : null

  async function salvar(force = false) {
    if (selectedIds.size === 0) {
      setError('Selecione pelo menos 1 serviço')
      return
    }
    setSaving(true)
    setError(null)
    if (force) setConflict(null)
    try {
      const res = await fetch(`/api/admin/appointments/${appointmentId}/services`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ serviceIds: Array.from(selectedIds), force }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (mountedRef.current) {
          // 409 com canForce=true: conflito de horario · profissional decide
          if (res.status === 409 && data.canForce === true) {
            setConflict(data.error || 'Conflito de horário')
          } else {
            setError(data.error || 'Erro ao salvar')
          }
        }
        return
      }
      router.refresh()
      onClose()
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : 'Erro')
      }
    } finally {
      // Garante que botão "Salvando..." nunca trava — vale pra sucesso
      // (modal vai desmontar mas defensive), erro tratado e exceção.
      if (mountedRef.current) {
        setSaving(false)
      }
    }
  }

  if (!portalReady) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="admin-card w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl flex flex-col"
        style={{
          maxHeight: 'calc(100svh - 16px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px) + 1rem, 1rem)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header sticky */}
        <div
          className="flex items-center justify-between p-4 sticky top-0 bg-inherit rounded-t-3xl"
          style={{ borderBottom: '1px solid var(--admin-divider)' }}
        >
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
              Editar serviços
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>
              Início {formatHour(startTime)}
            </p>
          </div>
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

        {/* Comanda paga · serviços travados. Editar aqui descasaria o
            financeiro (a cliente já pagou o valor antigo). Caminho: reabrir. */}
        {locked && !loading && (
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <div
              className="rounded-xl p-4 text-sm space-y-2"
              style={{
                background: 'rgba(245,158,11,0.10)',
                border: '1px solid rgba(245,158,11,0.35)',
                color: 'var(--admin-text)',
              }}
            >
              <p className="font-bold" style={{ color: '#D97706' }}>
                Comanda já paga
              </p>
              <p>
                Não dá pra mudar os serviços de uma comanda que já foi paga — os
                valores não bateriam com o que a cliente pagou.
              </p>
              <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
                Pra ajustar: abra a comanda em <strong>Comandas</strong> e toque em{' '}
                <strong>Reabrir</strong>, edite e fature de novo. Ou lance um novo
                atendimento pro serviço extra.
              </p>
            </div>
          </div>
        )}

        {/* Conteúdo */}
        {!locked && (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl"
                  style={{ background: 'var(--admin-input-bg)' }}
                />
              ))}
            </div>
          ) : services.length === 0 ? (
            <p
              className="text-sm text-center py-8"
              style={{ color: 'var(--admin-text-faded)' }}
            >
              Nenhum serviço ativo cadastrado.
            </p>
          ) : (
            services.map((s) => {
              const checked = selectedIds.has(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(s.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-transform active:scale-[0.99]"
                  style={{
                    background: checked
                      ? 'rgba(59,130,246,0.10)'
                      : 'var(--admin-input-bg)',
                    border: `1px solid ${checked ? 'rgba(59,130,246,0.40)' : 'var(--admin-border)'}`,
                  }}
                >
                  <span
                    className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center"
                    style={{
                      background: checked ? '#3B82F6' : 'transparent',
                      border: `1.5px solid ${checked ? '#3B82F6' : 'var(--admin-border)'}`,
                    }}
                  >
                    {checked && <IconCheck size={12} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: 'var(--admin-text)' }}
                    >
                      {s.name}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
                      {s.duration_minutes}min · {s.price != null ? formatPrice(s.price) : '—'}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
        )}

        {/* Footer travado · comanda paga · só fechar */}
        {locked && !loading && (
          <div
            className="p-4"
            style={{ borderTop: '1px solid var(--admin-divider)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              Entendi
            </button>
          </div>
        )}

        {/* Footer com preview e ações */}
        {!locked && !loading && services.length > 0 && (
          <div
            className="p-4 space-y-3"
            style={{ borderTop: '1px solid var(--admin-divider)' }}
          >
            {/* Preview */}
            <div
              className="rounded-xl p-3 text-xs grid grid-cols-3 gap-2"
              style={{
                background: 'var(--admin-input-bg)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <div>
                <p style={{ color: 'var(--admin-text-faded)' }}>Duração</p>
                <p className="font-bold mt-0.5" style={{ color: 'var(--admin-text)' }}>
                  {totalDuration > 0 ? `${totalDuration}min` : '—'}
                </p>
              </div>
              <div>
                <p style={{ color: 'var(--admin-text-faded)' }}>Termina</p>
                <p className="font-bold mt-0.5" style={{ color: 'var(--admin-text)' }}>
                  {newEndTime || '—'}
                </p>
              </div>
              <div>
                <p style={{ color: 'var(--admin-text-faded)' }}>Total</p>
                <p className="font-bold mt-0.5" style={{ color: 'var(--admin-text)' }}>
                  {totalPrice > 0 ? formatPrice(totalPrice) : '—'}
                </p>
              </div>
            </div>

            {error && (
              <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>
            )}

            {conflict && (
              <div
                className="rounded-xl p-3 text-xs space-y-2"
                style={{
                  background: 'rgba(245,158,11,0.10)',
                  border: '1px solid rgba(245,158,11,0.35)',
                  color: 'var(--admin-text)',
                }}
              >
                <p className="font-semibold" style={{ color: '#D97706' }}>Conflito de horário</p>
                <p>{conflict}</p>
                <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
                  Você pode salvar mesmo assim · você é responsável por organizar a agenda com os próximos clientes.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={conflict ? () => setConflict(null) : onClose}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{
                  background: 'var(--admin-accent-bg)',
                  color: 'var(--admin-text)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                {conflict ? 'Voltar' : 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => salvar(conflict !== null)}
                disabled={saving || selectedIds.size === 0}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{
                  background: conflict ? '#D97706' : 'var(--admin-accent)',
                  color: '#fff',
                }}
              >
                {saving ? 'Salvando...' : conflict ? 'Salvar mesmo assim' : 'Salvar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
