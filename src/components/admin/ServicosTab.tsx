'use client'

import { useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Service } from '@/lib/types'
import {
  IconCheck,
  IconClose,
  IconEye,
  IconEyeOff,
  IconPencil,
  IconPlus,
  IconSearch,
  IconTrash,
} from '@/components/ui/Icon'
import ConfirmActionModal from '@/components/admin/ConfirmActionModal'
import MoreActionsMenu, { type MoreAction } from '@/components/admin/MoreActionsMenu'

type Props = {
  businessId: string
  initialServices: Service[]
}

const DURATIONS = [15, 20, 30, 40, 45, 60, 75, 90, 120]

function formatDuration(min: number) {
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

function formatPrice(price: number | null) {
  if (!price) return 'Gratuito'
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function isCustomDuration(min: number) {
  return !DURATIONS.includes(min)
}

type FormState = {
  name: string
  price: string
  duration_minutes: number
  points: string
}

const emptyForm: FormState = { name: '', price: '', duration_minutes: 30, points: '' }

type Filter = 'active' | 'inactive' | 'all'

export default function ServicosTab({ businessId, initialServices }: Props) {
  const [services, setServices] = useState(initialServices)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [showCustomDuration, setShowCustomDuration] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>(emptyForm)
  const [editShowCustom, setEditShowCustom] = useState(false)

  const [saving, setSaving] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const [filter, setFilter] = useState<Filter>('active')
  const [search, setSearch] = useState('')

  const [confirmDelete, setConfirmDelete] = useState<Service | null>(null)

  const addFormRef = useRef<HTMLDivElement | null>(null)
  const supabase = createClient()

  const total = services.length
  const activeCount = services.filter((s) => s.active).length
  const inactiveCount = total - activeCount

  // KPIs
  const withPrice = services.filter((s) => s.price && s.price > 0)
  const ticketMedio =
    withPrice.length > 0
      ? withPrice.reduce((sum, s) => sum + (s.price || 0), 0) / withPrice.length
      : 0
  const duracaoMedia =
    total > 0 ? Math.round(services.reduce((sum, s) => sum + s.duration_minutes, 0) / total) : 0

  const filtered = useMemo(() => {
    let result = [...services]
    if (filter === 'active') result = result.filter((s) => s.active)
    else if (filter === 'inactive') result = result.filter((s) => !s.active)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((s) => s.name.toLowerCase().includes(q))
    }
    // ativos primeiro, depois alfabetico
    result.sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1
      return a.name.localeCompare(b.name, 'pt-BR')
    })
    return result
  }, [services, filter, search])

  function scrollToAddForm(prefillName?: string) {
    if (prefillName) setForm({ ...emptyForm, name: prefillName })
    addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  async function handleAdd() {
    if (!form.name.trim()) return
    if (!form.duration_minutes || form.duration_minutes < 5) return
    setSaving(true)

    const priceValue = form.price ? parseFloat(form.price.replace(',', '.')) : null

    const { data, error } = await supabase
      .from('services')
      .insert({
        business_id: businessId,
        name: form.name.trim(),
        price: priceValue,
        duration_minutes: form.duration_minutes,
        points: form.points ? parseInt(form.points) : 0,
        active: true,
      })
      .select()
      .single()

    if (!error && data) {
      setServices([...services, data])
      setForm(emptyForm)
      setShowCustomDuration(false)
    }
    setSaving(false)
  }

  function startEdit(service: Service) {
    setEditingId(service.id)
    setEditForm({
      name: service.name,
      price: service.price ? String(service.price) : '',
      duration_minutes: service.duration_minutes,
      points: service.points ? String(service.points) : '',
    })
    setEditShowCustom(isCustomDuration(service.duration_minutes))
  }

  async function handleSaveEdit(id: string) {
    if (!editForm.name.trim() || !editForm.duration_minutes) return
    setLoadingId(id)
    const priceValue = editForm.price ? parseFloat(editForm.price.replace(',', '.')) : null

    const { error } = await supabase
      .from('services')
      .update({
        name: editForm.name.trim(),
        price: priceValue,
        duration_minutes: editForm.duration_minutes,
        points: editForm.points ? parseInt(editForm.points) : 0,
      })
      .eq('id', id)

    if (!error) {
      setServices(
        services.map((s) =>
          s.id === id
            ? {
                ...s,
                name: editForm.name.trim(),
                price: priceValue,
                duration_minutes: editForm.duration_minutes,
                points: editForm.points ? parseInt(editForm.points) : 0,
              }
            : s
        )
      )
      setEditingId(null)
    }
    setLoadingId(null)
  }

  async function handleDelete(id: string) {
    setLoadingId(id)
    const { error } = await supabase.from('services').delete().eq('id', id)
    if (!error) setServices(services.filter((s) => s.id !== id))
    setLoadingId(null)
  }

  async function toggleActive(service: Service) {
    setLoadingId(service.id)
    const { error } = await supabase
      .from('services')
      .update({ active: !service.active })
      .eq('id', service.id)

    if (!error) {
      setServices(services.map((s) => (s.id === service.id ? { ...s, active: !s.active } : s)))
    }
    setLoadingId(null)
  }

  return (
    <div className="space-y-3 pb-24 relative">
      {/* KPI strip */}
      {total > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <Kpi label="Total" value={String(total)} sub={`${activeCount} ativo${activeCount === 1 ? '' : 's'}`} />
          <Kpi
            label="Ticket médio"
            value={ticketMedio > 0 ? formatPrice(ticketMedio) : '—'}
            sub={withPrice.length > 0 ? `${withPrice.length} com preço` : 'sem precificação'}
          />
          <Kpi label="Duração média" value={formatDuration(duracaoMedia)} sub="por serviço" />
        </div>
      )}

      {/* Toolbar */}
      {total > 0 && (
        <div className="space-y-2.5">
          {total >= 3 && (
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--admin-text-faded)' }}
              >
                <IconSearch size={14} />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar serviço..."
                className="admin-input w-full pl-9 pr-3 py-2 text-sm"
              />
            </div>
          )}

          <div className="flex gap-1.5">
            {(
              [
                { value: 'active', label: 'Ativos', count: activeCount },
                { value: 'inactive', label: 'Ocultos', count: inactiveCount },
                { value: 'all', label: 'Todos', count: total },
              ] as const
            ).map((chip) => {
              const isActive = filter === chip.value
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setFilter(chip.value)}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-full transition-all"
                  style={
                    isActive
                      ? {
                          background:
                            'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
                          color: '#fff',
                          boxShadow:
                            '0 4px 12px -4px color-mix(in srgb, var(--admin-accent) 50%, transparent)',
                        }
                      : {
                          background: 'var(--admin-input-bg)',
                          color: 'var(--admin-text-mute)',
                          border: '1px solid var(--admin-border)',
                        }
                  }
                >
                  {chip.label}
                  <span className="ml-1.5 text-[10px] tabular-nums" style={{ opacity: 0.85 }}>
                    {chip.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Lista ou empty state */}
      {filtered.length === 0 ? (
        total === 0 ? (
          <div className="admin-card-deep p-6 text-center space-y-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
              Nenhum serviço cadastrado ainda
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
              Comece pelos mais comuns ou cadastre o seu logo abaixo:
            </p>
            <div className="flex flex-wrap justify-center gap-1.5 pt-1">
              {['Corte masculino', 'Manicure', 'Limpeza de pele', 'Massagem', 'Sobrancelha'].map(
                (name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => scrollToAddForm(name)}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-full transition-all hover:opacity-90"
                    style={{
                      background: 'var(--admin-accent-bg)',
                      color: 'var(--admin-accent)',
                      border: '1px solid var(--admin-accent-border)',
                    }}
                  >
                    + {name}
                  </button>
                )
              )}
            </div>
          </div>
        ) : (
          <div className="admin-card-deep p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
              {search.trim()
                ? `Nenhum serviço bate com "${search}".`
                : filter === 'active'
                  ? 'Nenhum serviço ativo.'
                  : 'Nenhum serviço oculto.'}
            </p>
          </div>
        )
      ) : (
        filtered.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            isEditing={editingId === service.id}
            editForm={editForm}
            setEditForm={setEditForm}
            editShowCustom={editShowCustom}
            setEditShowCustom={setEditShowCustom}
            loadingId={loadingId}
            onStartEdit={() => startEdit(service)}
            onCancelEdit={() => setEditingId(null)}
            onSaveEdit={() => handleSaveEdit(service.id)}
            onToggle={() => toggleActive(service)}
            onAskDelete={() => setConfirmDelete(service)}
          />
        ))
      )}

      {/* Adicionar serviço */}
      <div
        ref={addFormRef}
        className="rounded-2xl p-4 space-y-3"
        style={{
          background: 'var(--admin-surface)',
          border: '1px dashed var(--admin-border-hi)',
        }}
      >
        <p className="admin-label flex items-center gap-1.5">
          <IconPlus size={14} />
          Adicionar serviço
        </p>

        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Nome do serviço (ex: Corte masculino)"
          className="admin-input w-full px-3 py-2.5 text-sm"
        />

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="admin-label">Preço (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="0,00"
              className="admin-input w-full px-3 py-2.5 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="admin-label">Duração</label>
            <select
              value={showCustomDuration ? 'custom' : form.duration_minutes}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setShowCustomDuration(true)
                } else {
                  setShowCustomDuration(false)
                  setForm({ ...form, duration_minutes: Number(e.target.value) })
                }
              }}
              className="admin-input w-full px-3 py-2.5 text-sm"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {formatDuration(d)}
                </option>
              ))}
              <option value="custom">Personalizado…</option>
            </select>
          </div>
        </div>

        {showCustomDuration && (
          <div>
            <label className="admin-label">Minutos personalizados</label>
            <input
              type="number"
              inputMode="numeric"
              value={form.duration_minutes || ''}
              onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })}
              min="5"
              max="600"
              placeholder="Ex: 180"
              className="admin-input w-full px-3 py-2.5 text-sm"
            />
          </div>
        )}

        <div>
          <label className="admin-label">Pontos de fidelidade</label>
          <input
            type="number"
            value={form.points}
            onChange={(e) => setForm({ ...form, points: e.target.value })}
            placeholder="0"
            min="0"
            className="admin-input w-full px-3 py-2.5 text-sm"
          />
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-mute)' }}>
            Cliente ganha esses pontos ao concluir o serviço.
          </p>
        </div>

        <button
          onClick={handleAdd}
          disabled={saving || !form.name.trim() || !form.duration_minutes}
          className="w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
          style={{
            background:
              'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
            color: '#FFFFFF',
            boxShadow: '0 8px 20px -6px color-mix(in srgb, var(--admin-accent) 45%, transparent)',
          }}
        >
          {saving ? 'Adicionando...' : 'Adicionar serviço'}
        </button>
      </div>

      {/* Floating + button */}
      {total >= 3 && (
        <button
          type="button"
          onClick={() => scrollToAddForm()}
          aria-label="Adicionar serviço"
          className="fixed right-4 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          style={{
            bottom: 'calc(80px + env(safe-area-inset-bottom))',
            background:
              'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
            color: '#fff',
            boxShadow: '0 12px 28px -8px color-mix(in srgb, var(--admin-accent) 60%, transparent)',
          }}
        >
          <IconPlus size={22} strokeWidth={2.5} />
        </button>
      )}

      <ConfirmActionModal
        open={!!confirmDelete}
        title={`Remover ${confirmDelete?.name || 'serviço'}?`}
        message="Os agendamentos existentes desse serviço não são apagados, mas ele some da lista de oferta. Essa ação não pode ser desfeita."
        confirmLabel="Sim, remover"
        cancelLabel="Voltar"
        tone="danger"
        loading={!!confirmDelete && loadingId === confirmDelete.id}
        onConfirm={async () => {
          if (!confirmDelete) return
          await handleDelete(confirmDelete.id)
          setConfirmDelete(null)
        }}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  )
}

// =============================================================================
// Card individual
// =============================================================================

function ServiceCard({
  service,
  isEditing,
  editForm,
  setEditForm,
  editShowCustom,
  setEditShowCustom,
  loadingId,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onToggle,
  onAskDelete,
}: {
  service: Service
  isEditing: boolean
  editForm: FormState
  setEditForm: (f: FormState) => void
  editShowCustom: boolean
  setEditShowCustom: (v: boolean) => void
  loadingId: string | null
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onToggle: () => void
  onAskDelete: () => void
}) {
  const isLoading = loadingId === service.id

  if (isEditing) {
    return (
      <div className="admin-card-deep overflow-hidden p-4 space-y-3">
        <input
          type="text"
          value={editForm.name}
          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          className="admin-input w-full px-3 py-2.5 text-sm"
          placeholder="Nome do serviço"
        />
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="admin-label">Preço (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              value={editForm.price}
              onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
              placeholder="0,00"
              className="admin-input w-full px-3 py-2.5 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="admin-label">Duração</label>
            <select
              value={editShowCustom ? 'custom' : editForm.duration_minutes}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setEditShowCustom(true)
                } else {
                  setEditShowCustom(false)
                  setEditForm({ ...editForm, duration_minutes: Number(e.target.value) })
                }
              }}
              className="admin-input w-full px-3 py-2.5 text-sm"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {formatDuration(d)}
                </option>
              ))}
              <option value="custom">Personalizado…</option>
            </select>
          </div>
        </div>
        {editShowCustom && (
          <div>
            <label className="admin-label">Minutos personalizados</label>
            <input
              type="number"
              inputMode="numeric"
              value={editForm.duration_minutes || ''}
              onChange={(e) =>
                setEditForm({ ...editForm, duration_minutes: parseInt(e.target.value) || 0 })
              }
              min="5"
              max="600"
              placeholder="Ex: 180"
              className="admin-input w-full px-3 py-2.5 text-sm"
            />
          </div>
        )}
        <div>
          <label className="admin-label">Pontos de fidelidade</label>
          <input
            type="number"
            value={editForm.points}
            onChange={(e) => setEditForm({ ...editForm, points: e.target.value })}
            placeholder="0"
            min="0"
            className="admin-input w-full px-3 py-2.5 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSaveEdit}
            disabled={isLoading || !editForm.name.trim() || !editForm.duration_minutes}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 transition-colors"
            style={{ background: 'var(--admin-accent)', color: '#fff' }}
          >
            {isLoading ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            onClick={onCancelEdit}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: 'var(--admin-input-bg)',
              color: 'var(--admin-text-mute)',
              border: '1px solid var(--admin-border)',
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  const actions: MoreAction[] = [
    {
      label: 'Editar',
      icon: <IconPencil size={15} />,
      onClick: onStartEdit,
    },
    {
      label: service.active ? 'Ocultar' : 'Mostrar',
      icon: service.active ? <IconEyeOff size={15} /> : <IconEye size={15} />,
      onClick: onToggle,
    },
    {
      label: 'Remover',
      icon: <IconTrash size={15} />,
      onClick: onAskDelete,
      destructive: true,
      separatorAbove: true,
    },
  ]

  return (
    <div
      className="admin-card-deep px-4 py-3 flex items-center gap-3"
      style={!service.active ? { opacity: 0.65 } : undefined}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{
          background: service.active ? 'var(--admin-success)' : 'var(--admin-text-faded)',
          boxShadow: service.active ? '0 0 8px color-mix(in srgb, var(--admin-success) 70%, transparent)' : undefined,
        }}
      />
      <div className="flex-1 min-w-0">
        <p
          className="font-semibold text-sm truncate"
          style={{ color: service.active ? 'var(--admin-text)' : 'var(--admin-text-mute)' }}
        >
          {service.name}
        </p>
        <p
          className="text-xs mt-0.5 flex items-center gap-1.5 flex-wrap"
          style={{ color: 'var(--admin-text-faded)' }}
        >
          <span
            className="font-semibold tabular-nums"
            style={{ color: service.active ? 'var(--admin-text-2)' : 'var(--admin-text-faded)' }}
          >
            {formatPrice(service.price)}
          </span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">{formatDuration(service.duration_minutes)}</span>
          {service.points > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="tabular-nums" style={{ color: 'var(--admin-warn)' }}>
                {service.points}pts
              </span>
            </>
          )}
          {!service.active && (
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{
                background: 'color-mix(in srgb, var(--admin-warn) 16%, transparent)',
                color: 'var(--admin-warn)',
              }}
            >
              Oculto
            </span>
          )}
        </p>
      </div>
      <MoreActionsMenu actions={actions} />
    </div>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="admin-card p-2.5">
      <p
        className="text-[10px] font-semibold uppercase tracking-wider truncate"
        style={{ color: 'var(--admin-text-faded)' }}
      >
        {label}
      </p>
      <p
        className="text-sm font-bold leading-tight tabular-nums truncate mt-0.5"
        style={{ color: 'var(--admin-text)' }}
      >
        {value}
      </p>
      <p className="text-[10px] mt-1 truncate" style={{ color: 'var(--admin-text-faded)' }}>
        {sub}
      </p>
    </div>
  )
}
