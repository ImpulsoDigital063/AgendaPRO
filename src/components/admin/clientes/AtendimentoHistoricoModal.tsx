'use client'

import { todayBR } from '@/lib/date-br'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { IconClose, IconArrowLeft } from '@/components/ui/Icon'

/**
 * Lançar atendimento ANTIGO na ficha do cliente (v121 · 20/08/2026).
 *
 * Pedido da Wanessa: trazer pra ficha os procedimentos que a paciente já fez
 * antes do sistema. É REGISTRO, não dinheiro — quem grava isso é a rota
 * /api/admin/customers/[id]/atendimento-historico, que força completed,
 * total_price 0 e historical=true. A tela não manda valor de propósito.
 *
 * Usado pelos DOIS fronts: ClienteDrawer (desktop ≥1024) e ClienteDetailModal
 * (mobile). Um componente só pra não nascerem duas regras.
 */

type Professional = { id: string; name: string }
type Service = { id: string; name: string }

type Props = {
  customerId: string
  customerName: string
  businessId: string
  onClose: () => void
  onSaved: () => void
}

export default function AtendimentoHistoricoModal({
  customerId,
  customerName,
  businessId,
  onClose,
  onSaved,
}: Props) {
  const hoje = todayBR()
  const [profs, setProfs] = useState<Professional[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [professionalId, setProfessionalId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [serviceName, setServiceName] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sb = createClient()
    async function load() {
      const [{ data: p }, { data: s }] = await Promise.all([
        sb.from('professionals').select('id, name').eq('business_id', businessId).eq('active', true).order('name'),
        sb.from('services').select('id, name').eq('business_id', businessId).eq('active', true).order('name'),
      ])
      setProfs((p ?? []) as Professional[])
      setServices((s ?? []) as Service[])
    }
    load()
  }, [businessId])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Escolher no catálogo só PREENCHE o nome — o campo segue editável porque
  // procedimento antigo costuma ter nome que não existe mais na lista de hoje.
  function pickService(id: string) {
    setServiceId(id)
    const found = services.find((s) => s.id === id)
    if (found) setServiceName(found.name)
  }

  async function save() {
    if (!date) {
      setError('Informe a data em que o procedimento foi feito')
      return
    }
    if (date > hoje) {
      setError('Essa data ainda não chegou. Pra marcar no futuro, use a agenda.')
      return
    }
    if (!serviceName.trim()) {
      setError('Informe o procedimento')
      return
    }
    setSubmitting(true)
    setError(null)
    const res = await fetch(`/api/admin/customers/${customerId}/atendimento-historico`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        serviceId: serviceId || null,
        serviceName: serviceName.trim(),
        professionalId: professionalId || null,
        notes: notes.trim() || null,
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(
        j.error === 'date_must_be_past'
          ? 'Essa data ainda não chegou. Pra marcar no futuro, use a agenda.'
          : j.error === 'service_required'
            ? 'Informe o procedimento'
            : (j.error ?? 'Não deu pra salvar'),
      )
      setSubmitting(false)
      return
    }
    onSaved()
  }

  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => { setPortalReady(true) }, [])
  if (!portalReady) return null

  return createPortal(
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div
        className="absolute inset-x-0 top-0 bottom-0 flex flex-col mx-auto"
        style={{ maxWidth: 560, background: 'var(--admin-bg)' }}
      >
        <div
          className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
          style={{ background: 'var(--admin-surface)', borderBottom: '1px solid var(--admin-border)' }}
        >
          <button type="button" onClick={onClose} aria-label="Voltar" className="p-2 rounded-lg" style={{ color: 'var(--admin-text-mute)' }}>
            <IconArrowLeft size={18} />
          </button>
          <h2 className="flex-1 text-base font-bold" style={{ color: 'var(--admin-text)' }}>
            Atendimento Antigo
          </h2>
          <button
            type="button"
            onClick={save}
            disabled={submitting}
            className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50"
            style={{ background: 'var(--admin-accent)', color: '#fff' }}
          >
            {submitting ? 'Salvando…' : 'Salvar'}
          </button>
          <button type="button" onClick={onClose} aria-label="Fechar" className="p-2 rounded-lg" style={{ color: 'var(--admin-text-mute)' }}>
            <IconClose size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{
              background: 'color-mix(in srgb, var(--admin-danger,#EF4444) 14%, transparent)',
              color: 'var(--admin-danger,#EF4444)',
            }}>
              {error}
            </p>
          )}

          <div className="rounded-2xl p-5 space-y-3" style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
          }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                Cliente
              </p>
              <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{customerName}</p>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                Data do procedimento
              </label>
              <input
                type="date"
                value={date}
                max={hoje}
                onChange={(e) => setDate(e.target.value)}
                disabled={submitting}
                className="admin-input w-full px-3 py-2 text-sm tabular-nums"
              />
            </div>

            {services.length > 0 && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                  Procedimento (catálogo)
                </label>
                <select
                  value={serviceId}
                  onChange={(e) => pickService(e.target.value)}
                  disabled={submitting}
                  className="admin-input w-full px-3 py-2 text-sm"
                >
                  <option value="">— Escolher da lista —</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                Nome do procedimento
              </label>
              <input
                type="text"
                value={serviceName}
                onChange={(e) => { setServiceName(e.target.value); setServiceId('') }}
                disabled={submitting}
                placeholder="Ex: Limpeza de pele profunda"
                className="admin-input w-full px-3 py-2 text-sm"
              />
              <p className="text-[10px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
                Pode digitar livre — serve pra procedimento que você nem oferece mais.
              </p>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                Profissional
              </label>
              <select
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                disabled={submitting}
                className="admin-input w-full px-3 py-2 text-sm"
              >
                <option value="">— Não vincular —</option>
                {profs.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                Observação
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
                rows={3}
                placeholder="O que foi feito, produto usado, reação da pele…"
                className="admin-input w-full px-3 py-2 text-sm"
              />
            </div>
          </div>

          <p className="text-[11px] leading-relaxed px-1" style={{ color: 'var(--admin-text-faded)' }}>
            Isso entra no histórico da ficha e conta em <strong>Atendimentos</strong>. Não gera comanda,
            não pede sinal e não entra no financeiro — é registro do que já aconteceu.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
