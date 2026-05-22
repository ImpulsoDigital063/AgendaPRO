'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/activity-log'
import {
  IconClose,
  IconSearch,
  IconPlus,
  IconUser,
  IconCalendar,
  IconClock,
  IconDollar,
  IconCheck,
} from '@/components/ui/Icon'

type Customer = { id: string; name: string; phone: string; total_points: number | null }
type Professional = { id: string; name: string }
type Service = { id: string; name: string; price: number | null; duration_minutes: number | null }

type Props = {
  open: boolean
  businessId: string
  professionals: Professional[]
  services: Service[]
  /** Prefill vindos do popover de slot vazio ou do botão +Agendar */
  defaultProfId?: string | null
  defaultDate?: string | null
  defaultTime?: string | null
  onClose: () => void
}

function todayISO(): string {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  const eh = Math.floor(total / 60) % 24
  const em = total % 60
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function AgendarModal({
  open,
  businessId,
  professionals,
  services,
  defaultProfId = null,
  defaultDate = null,
  defaultTime = null,
  onClose,
}: Props) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Form state
  const [cliente, setCliente] = useState<Customer | null>(null)
  const [profId, setProfId] = useState<string>('')
  const [serviceId, setServiceId] = useState<string>('')
  const [date, setDate] = useState<string>('')
  const [time, setTime] = useState<string>('')
  const [duration, setDuration] = useState<number>(60)
  const [price, setPrice] = useState<number>(0)
  const [discount, setDiscount] = useState<number>(0)
  const [notes, setNotes] = useState<string>('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null)

  // Cliente search/create
  const [showClientPicker, setShowClientPicker] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [searching, setSearching] = useState(false)
  const [showCreateClient, setShowCreateClient] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', phone: '' })

  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => { setPortalReady(true) }, [])

  // Reset ao abrir
  useEffect(() => {
    if (!open) return
    setCliente(null)
    setProfId(defaultProfId ?? '')
    setServiceId('')
    setDate(defaultDate ?? todayISO())
    setTime(defaultTime ?? '')
    setDuration(60)
    setPrice(0)
    setDiscount(0)
    setNotes('')
    setError(null)
    setCreatedId(null)
    setCreatedCustomerId(null)
    setShowClientPicker(false)
    setShowCreateClient(false)
    setSearch('')
    setResults([])
  }, [open, defaultProfId, defaultDate, defaultTime])

  // Lock scroll + ESC
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, saving, onClose])

  // Quando troca serviço · auto-preenche duração + preço
  useEffect(() => {
    if (!serviceId) return
    const s = services.find((x) => x.id === serviceId)
    if (!s) return
    setDuration(s.duration_minutes ?? 60)
    setPrice(Number(s.price ?? 0))
  }, [serviceId, services])

  // Busca cliente (debounced)
  useEffect(() => {
    if (!showClientPicker) return
    const term = search.trim()
    if (term.length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    const id = setTimeout(async () => {
      const digits = term.replace(/\D/g, '')
      let query = supabase
        .from('customers')
        .select('id, name, phone, total_points')
        .eq('business_id', businessId)
        .limit(20)
      if (digits.length >= 3) {
        query = query.ilike('phone', `%${digits}%`)
      } else {
        query = query.ilike('name', `%${term}%`)
      }
      const { data } = await query.order('name')
      if (!cancelled) {
        setResults((data ?? []) as Customer[])
        setSearching(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [search, showClientPicker, businessId, supabase])

  async function handleCreateClient() {
    const n = newClient.name.trim()
    const p = newClient.phone.trim()
    if (!n || !p) {
      setError('Nome e telefone obrigatórios')
      return
    }
    setError(null)
    setSaving(true)
    const { data, error: e } = await supabase
      .from('customers')
      .insert({ business_id: businessId, name: n, phone: p })
      .select('id, name, phone, total_points')
      .single()
    setSaving(false)
    if (e) {
      setError(`Erro ao criar cliente: ${e.message}`)
      return
    }
    setCliente(data as Customer)
    setShowCreateClient(false)
    setShowClientPicker(false)
    setNewClient({ name: '', phone: '' })
  }

  const valorTotal = Math.max(0, Number(price) - Number(discount))
  const canSave = cliente && profId && serviceId && date && time && duration > 0

  async function handleSave() {
    if (!canSave || !cliente) return
    setError(null)
    setSaving(true)
    const endTime = addMinutesToTime(time, duration)
    const prof = professionals.find((p) => p.id === profId)
    const svc = services.find((s) => s.id === serviceId)

    const { data: inserted, error: e } = await supabase
      .from('appointments')
      .insert({
        business_id: businessId,
        professional_id: profId,
        customer_id: cliente.id,
        client_name: cliente.name,
        client_phone: cliente.phone,
        appointment_date: date,
        start_time: `${time}:00`,
        end_time: `${endTime}:00`,
        service_id: serviceId,
        service_name: svc?.name ?? null,
        total_price: valorTotal,
        status: 'confirmed',
        notes: notes.trim() || null,
      })
      .select('id')
      .single()

    setSaving(false)
    if (e || !inserted) {
      setError(`Erro ao salvar: ${e?.message ?? 'desconhecido'}`)
      return
    }

    // Log
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: prof2 } = await supabase
        .from('professionals')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      logActivity({
        business_id: businessId,
        professional_id: prof2?.id,
        action: 'create_appointment',
        target_type: 'appointment',
        target_id: inserted.id,
        description: `${cliente.name} · ${svc?.name ?? 'serviço'} · ${date} ${time} · com ${prof?.name ?? '—'}`,
      })
    }

    setCreatedId(inserted.id)
    setCreatedCustomerId(cliente.id)
  }

  function novoAtendimento() {
    setCliente(null)
    setProfId('')
    setServiceId('')
    setDate(todayISO())
    setTime('')
    setDuration(60)
    setPrice(0)
    setDiscount(0)
    setNotes('')
    setCreatedId(null)
    setCreatedCustomerId(null)
    setError(null)
  }

  function verCliente() {
    if (!createdCustomerId) return
    router.push(`/admin/clientes?id=${createdCustomerId}`)
    onClose()
  }

  function irParaAgenda() {
    onClose()
    router.refresh()
  }

  if (!open || !portalReady) return null

  // ===== POS-SAVE · modal de sucesso com 3 acoes (Salao99-style) =====
  if (createdId) {
    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[300] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={irParaAgenda}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-3xl overflow-hidden"
          style={{
            background: 'var(--admin-popover-bg, #FFFFFF)',
            border: '1px solid var(--admin-popover-border, #E2E8F0)',
            boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
          }}
        >
          <div className="p-6 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#fff',
                boxShadow: '0 8px 20px -6px rgba(5,150,105,0.45), inset 0 1px 0 rgba(255,255,255,0.3)',
              }}
            >
              <IconCheck size={24} />
            </div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--admin-text)' }}>
              Atendimento criado com sucesso!
            </h3>
          </div>
          <div className="px-3 pb-3 space-y-1">
            <ActionRow label="Novo atendimento" onClick={novoAtendimento} />
            <ActionRow label="Visualizar cliente" onClick={verCliente} />
          </div>
          <div className="p-4 pt-1">
            <button
              type="button"
              onClick={irParaAgenda}
              className="w-full py-3 rounded-xl text-sm font-bold transition-transform hover:translate-y-[-1px]"
              style={{
                background: 'linear-gradient(180deg, var(--brand-primary, #1AA9A8) 0%, color-mix(in srgb, var(--brand-primary, #1AA9A8) 70%, black) 100%)',
                color: '#fff',
                borderTop: '1px solid rgba(255,255,255,0.25)',
                boxShadow: '0 8px 22px -6px color-mix(in srgb, var(--brand-primary, #1AA9A8) 55%, transparent)',
              }}
            >
              Ir para a agenda
            </button>
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  // ===== FORM PRINCIPAL =====
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="agendar-title"
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={() => !saving && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 pb-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--admin-divider)' }}
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--admin-text-faded)' }}>
              Novo
            </p>
            <h3 id="agendar-title" className="text-lg font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>
              Agendamento
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Fechar"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--admin-input-bg)]"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div
              className="rounded-xl px-3 py-2 text-xs"
              style={{
                background: 'rgba(239,68,68,0.10)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#DC2626',
              }}
            >
              {error}
            </div>
          )}

          {/* Cliente */}
          <Field icon={<IconUser size={14} />} label="Cliente">
            {cliente ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>{cliente.name}</p>
                  <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>{cliente.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setCliente(null); setShowClientPicker(true) }}
                  className="text-xs underline flex-shrink-0"
                  style={{ color: 'var(--admin-accent)' }}
                >
                  trocar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowClientPicker(true)}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-left transition-colors hover:bg-[var(--admin-input-bg)]"
                style={{
                  background: 'var(--admin-input-bg)',
                  border: '1px dashed var(--admin-border)',
                  color: 'var(--admin-text-mute)',
                }}
              >
                Selecionar cliente
              </button>
            )}
          </Field>

          {/* Data */}
          <Field icon={<IconCalendar size={14} />} label="Data">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="admin-input w-full px-3 py-2.5 rounded-xl text-sm"
            />
          </Field>

          {/* Profissional */}
          <Field icon={<IconUser size={14} />} label="Profissional">
            <select
              value={profId}
              onChange={(e) => setProfId(e.target.value)}
              className="w-full px-3 py-2.5 pr-9 rounded-xl text-sm transition-colors"
              style={{
                background: `var(--admin-input-bg) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>") no-repeat right 0.875rem center`,
                border: '1px solid var(--admin-border)',
                color: 'var(--admin-text)',
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
              }}
            >
              <option value="">Selecionar profissional</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>

          {/* Serviço */}
          <Field label="Serviço">
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full px-3 py-2.5 pr-9 rounded-xl text-sm transition-colors"
              style={{
                background: `var(--admin-input-bg) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>") no-repeat right 0.875rem center`,
                border: '1px solid var(--admin-border)',
                color: 'var(--admin-text)',
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
              }}
            >
              <option value="">Selecionar serviço</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.duration_minutes ?? 60}min · {formatBRL(Number(s.price ?? 0))}
                </option>
              ))}
            </select>
          </Field>

          {/* Horário + Duração */}
          <div className="grid grid-cols-2 gap-3">
            <Field icon={<IconClock size={14} />} label="Horário">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                step={300}
                className="admin-input w-full px-3 py-2.5 rounded-xl text-sm"
              />
            </Field>
            <Field label="Duração (min)">
              <input
                type="number"
                min={5}
                step={5}
                value={duration}
                onChange={(e) => setDuration(Math.max(5, parseInt(e.target.value, 10) || 0))}
                className="admin-input w-full px-3 py-2.5 rounded-xl text-sm tabular-nums"
              />
            </Field>
          </div>

          {/* Preço + Desconto */}
          <div className="grid grid-cols-2 gap-3">
            <Field icon={<IconDollar size={14} />} label="Preço (R$)">
              <input
                type="number"
                min={0}
                step={0.01}
                value={price}
                onChange={(e) => setPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                className="admin-input w-full px-3 py-2.5 rounded-xl text-sm tabular-nums"
              />
            </Field>
            <Field label="Desconto (R$)">
              <input
                type="number"
                min={0}
                step={0.01}
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="admin-input w-full px-3 py-2.5 rounded-xl text-sm tabular-nums"
                placeholder="0,00"
              />
            </Field>
          </div>

          {/* Observação */}
          <Field label="Observação (opcional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="admin-input w-full px-3 py-2.5 rounded-xl text-sm resize-none"
              placeholder="Algo importante sobre o atendimento"
            />
          </Field>
        </div>

        {/* Footer · resumo + ações */}
        <div
          className="flex items-center justify-between gap-3 p-4 flex-shrink-0"
          style={{
            borderTop: '1px solid var(--admin-divider)',
            background: 'var(--admin-surface-hi)',
          }}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
              Total
            </p>
            <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
              {formatBRL(valorTotal)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
              style={{
                background: 'transparent',
                color: 'var(--admin-text-2)',
                border: '1px solid var(--admin-border)',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || saving}
              className="px-5 py-2.5 rounded-xl text-sm font-bold transition-transform hover:translate-y-[-1px] disabled:opacity-40 disabled:translate-y-0"
              style={{
                background: 'linear-gradient(180deg, var(--brand-primary, #1AA9A8) 0%, color-mix(in srgb, var(--brand-primary, #1AA9A8) 70%, black) 100%)',
                color: '#fff',
                borderTop: '1px solid rgba(255,255,255,0.25)',
                boxShadow: '0 8px 22px -8px color-mix(in srgb, var(--brand-primary, #1AA9A8) 55%, transparent)',
              }}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>

      {/* Popup de seleção de cliente · z mais alto */}
      {showClientPicker && (
        <div
          className="fixed inset-0 z-[310] flex items-start justify-center p-4 pt-20"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowClientPicker(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: 'var(--admin-popover-bg, #FFFFFF)',
              border: '1px solid var(--admin-popover-border, #E2E8F0)',
              boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
              maxHeight: '70vh',
            }}
          >
            {/* Search bar */}
            <div className="flex items-center gap-2 p-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
              <IconSearch size={16} />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente por nome ou telefone"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--admin-text)' }}
              />
              <button
                type="button"
                onClick={() => { setShowCreateClient(true); setNewClient({ name: search, phone: '' }) }}
                aria-label="Criar novo cliente"
                title="Criar cliente"
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'var(--admin-accent)', color: '#fff' }}
              >
                <IconPlus size={14} />
              </button>
              <button
                type="button"
                onClick={() => setShowClientPicker(false)}
                aria-label="Fechar"
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ color: 'var(--admin-text-mute)' }}
              >
                <IconClose size={14} />
              </button>
            </div>

            {showCreateClient ? (
              <div className="p-4 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                  Novo cliente rápido
                </p>
                <input
                  type="text"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  placeholder="Nome completo"
                  className="admin-input w-full px-3 py-2.5 rounded-xl text-sm"
                />
                <input
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  placeholder="Telefone (DDD + número)"
                  className="admin-input w-full px-3 py-2.5 rounded-xl text-sm"
                />
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCreateClient(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{
                      background: 'transparent',
                      color: 'var(--admin-text-2)',
                      border: '1px solid var(--admin-border)',
                    }}
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateClient}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                    style={{
                      background: 'linear-gradient(180deg, var(--brand-primary, #1AA9A8) 0%, color-mix(in srgb, var(--brand-primary, #1AA9A8) 70%, black) 100%)',
                      color: '#fff',
                    }}
                  >
                    {saving ? 'Criando...' : 'Criar e selecionar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto">
                {searching && (
                  <p className="text-xs text-center py-4" style={{ color: 'var(--admin-text-mute)' }}>Buscando...</p>
                )}
                {!searching && results.length === 0 && search.trim().length >= 2 && (
                  <p className="text-xs text-center py-4" style={{ color: 'var(--admin-text-mute)' }}>
                    Nenhum cliente encontrado. Clique no <strong>+</strong> pra criar novo.
                  </p>
                )}
                {!searching && search.trim().length < 2 && (
                  <p className="text-xs text-center py-4" style={{ color: 'var(--admin-text-mute)' }}>
                    Digite pelo menos 2 letras pra buscar
                  </p>
                )}
                {results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCliente(c)
                      setShowClientPicker(false)
                      setSearch('')
                      setResults([])
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--admin-surface-hi)]"
                    style={{ borderBottom: '1px solid var(--admin-divider)' }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>{c.name}</p>
                      <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>{c.phone}</p>
                    </div>
                    {(c.total_points ?? 0) > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(245,158,11,0.15)', color: '#D97706' }}>
                        {c.total_points} pts
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}

function Field({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>
        {icon}
        {label}
      </label>
      {children}
    </div>
  )
}

function ActionRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-left transition-colors hover:bg-[var(--admin-surface-hi)]"
      style={{ color: 'var(--admin-text)' }}
    >
      <span className="font-semibold">{label}</span>
      <span style={{ color: 'var(--admin-text-mute)' }}>›</span>
    </button>
  )
}
