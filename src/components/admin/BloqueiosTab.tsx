'use client'

/**
 * BloqueiosTab · Palace V2 (29/05/2026)
 *
 * Tela "Bloqueios" em /admin/configuracoes pra Marko/Luana cadastrarem:
 *   - Intervalos de almoço (recorrente semanal)
 *   - Folgas / feriados / eventos (data específica)
 *
 * V2 cravado por Eduardo "estuda a lógica e aplique melhorias":
 *   · Form colapsável · só abre ao clicar "+ Adicionar bloqueio" (era sempre aberto)
 *   · 5 presets rápidos · 1 clique pré-preenche (Almoço · Férias · Feriado · Folga semanal · Dia inteiro)
 *   · Lista agrupada · Recorrentes / Próximas / Passadas (toggle)
 *   · Badges relativas · "HOJE" / "AMANHÃ" / "EM X DIAS" / "PASSADO"
 *   · CRUD completo · editar e duplicar bloqueio existente (era só remover)
 *
 * Schema business_blocks intacto · zero migration.
 */

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Professional } from '@/lib/types'
import {
  IconPlus,
  IconTrash,
  IconClock,
  IconCalendar,
  IconPencil,
  IconCheck,
  IconClose,
  IconChevronDown,
  IconStar,
  IconSun,
} from '@/components/ui/Icon'

type IconCmp = (p: { size?: number }) => React.ReactElement | null
import ConfirmActionModal from '@/components/admin/ConfirmActionModal'

type Block = {
  id: string
  business_id: string
  professional_id: string | null
  block_type: 'recurring' | 'specific'
  day_of_week: number | null
  block_date: string | null
  start_time: string
  end_time: string
  reason: string | null
  active: boolean
}

type Props = {
  businessId: string
  professionals: Professional[]
}

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

type FormState = {
  block_type: 'recurring' | 'specific'
  professional_id: string
  day_of_week: string
  block_date: string
  start_time: string
  end_time: string
  reason: string
}

const EMPTY_FORM: FormState = {
  block_type: 'recurring',
  professional_id: '',
  day_of_week: '1',
  block_date: '',
  start_time: '12:00',
  end_time: '13:00',
  reason: '',
}

// ═════════════════════════════════════════════════════════════════════
// 5 PRESETS RÁPIDOS · Eduardo cravou pra acelerar uso real do Marko
// ═════════════════════════════════════════════════════════════════════
type Preset = {
  label: string
  Icon: IconCmp
  color: string
  description: string
  apply: (today: string) => Partial<FormState>
}

const PRESETS: Preset[] = [
  {
    label: 'Almoço',
    Icon: IconClock,
    color: '#F59E0B',
    description: 'Intervalo semanal · 12-13h',
    apply: () => ({
      block_type: 'recurring',
      day_of_week: '1',
      start_time: '12:00',
      end_time: '13:00',
      reason: 'Intervalo de almoço',
    }),
  },
  {
    label: 'Folga semanal',
    Icon: IconClose,
    color: '#EF4444',
    description: 'Dia da semana inteiro · ex: domingo',
    apply: () => ({
      block_type: 'recurring',
      day_of_week: '0',
      start_time: '00:00',
      end_time: '23:59',
      reason: 'Folga semanal',
    }),
  },
  {
    label: 'Dia inteiro',
    Icon: IconCalendar,
    color: '#A855F7',
    description: 'Data específica · 00h-24h',
    apply: (today) => ({
      block_type: 'specific',
      block_date: today,
      start_time: '00:00',
      end_time: '23:59',
      reason: '',
    }),
  },
  {
    label: 'Feriado',
    Icon: IconStar,
    color: '#EC4899',
    description: 'Data específica · todo o salão',
    apply: (today) => ({
      block_type: 'specific',
      professional_id: '',
      block_date: today,
      start_time: '00:00',
      end_time: '23:59',
      reason: 'Feriado',
    }),
  },
  {
    label: 'Férias',
    Icon: IconSun,
    color: '#10B981',
    description: 'Começa hoje · ajuste a data fim no calendário',
    apply: (today) => ({
      block_type: 'specific',
      block_date: today,
      start_time: '00:00',
      end_time: '23:59',
      reason: 'Férias',
    }),
  },
]

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function daysUntil(dateISO: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateISO + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function relativeBadge(diff: number): { label: string; color: string; bg: string } {
  if (diff < 0) return { label: 'Passado', color: 'var(--admin-text-faded)', bg: 'transparent' }
  if (diff === 0) return { label: 'HOJE', color: '#D97706', bg: 'rgba(245,158,11,0.18)' }
  if (diff === 1) return { label: 'AMANHÃ', color: '#059669', bg: 'rgba(16,185,129,0.16)' }
  if (diff <= 7) return { label: `EM ${diff} DIAS`, color: 'var(--admin-accent)', bg: 'color-mix(in srgb, var(--admin-accent) 14%, transparent)' }
  return { label: `EM ${diff} DIAS`, color: 'var(--admin-text-mute)', bg: 'var(--admin-surface-hi)' }
}

export default function BloqueiosTab({ businessId, professionals }: Props) {
  const supabase = createClient()
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Block | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [showPast, setShowPast] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('business_blocks')
      .select('*')
      .eq('business_id', businessId)
      .eq('active', true)
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setBlocks((data ?? []) as Block[])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setError(null)
  }

  function openCreate() {
    resetForm()
    setFormOpen(true)
  }

  function openEdit(b: Block) {
    setEditingId(b.id)
    setForm({
      block_type: b.block_type,
      professional_id: b.professional_id ?? '',
      day_of_week: String(b.day_of_week ?? 1),
      block_date: b.block_date ?? '',
      start_time: b.start_time.slice(0, 5),
      end_time: b.end_time.slice(0, 5),
      reason: b.reason ?? '',
    })
    setFormOpen(true)
    setError(null)
  }

  function openDuplicate(b: Block) {
    setEditingId(null)
    setForm({
      block_type: b.block_type,
      professional_id: b.professional_id ?? '',
      day_of_week: String(b.day_of_week ?? 1),
      block_date: b.block_date ?? '',
      start_time: b.start_time.slice(0, 5),
      end_time: b.end_time.slice(0, 5),
      reason: b.reason ? `${b.reason} (cópia)` : 'Cópia',
    })
    setFormOpen(true)
    setError(null)
  }

  function applyPreset(preset: Preset) {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, ...preset.apply(todayISO()) })
    setFormOpen(true)
    setError(null)
  }

  async function handleSubmit() {
    setError(null)
    if (form.block_type === 'recurring' && !form.day_of_week) {
      setError('Escolha o dia da semana')
      return
    }
    if (form.block_type === 'specific' && !form.block_date) {
      setError('Escolha a data')
      return
    }
    if (form.start_time >= form.end_time) {
      setError('Hora de início precisa ser antes da hora de fim')
      return
    }

    setCreating(true)
    const payload = {
      business_id: businessId,
      block_type: form.block_type,
      professional_id: form.professional_id || null,
      day_of_week: form.block_type === 'recurring' ? parseInt(form.day_of_week, 10) : null,
      block_date: form.block_type === 'specific' ? form.block_date : null,
      start_time: form.start_time + ':00',
      end_time: form.end_time + ':00',
      reason: form.reason.trim() || null,
    }

    const { error } = editingId
      ? await supabase.from('business_blocks').update(payload).eq('id', editingId)
      : await supabase.from('business_blocks').insert(payload)

    setCreating(false)
    if (error) {
      setError(`Erro: ${error.message}`)
      return
    }
    resetForm()
    setFormOpen(false)
    await load()
  }

  async function handleDelete(block: Block) {
    const { error } = await supabase.from('business_blocks').delete().eq('id', block.id)
    if (error) {
      setError(`Erro ao remover: ${error.message}`)
      return
    }
    setConfirmDelete(null)
    await load()
  }

  function profName(profId: string | null): string {
    if (!profId) return 'Todo o salão'
    return professionals.find((p) => p.id === profId)?.name ?? 'Profissional'
  }

  function describeBlock(b: Block): string {
    const prof = profName(b.professional_id)
    const time = `${b.start_time.slice(0, 5)} às ${b.end_time.slice(0, 5)}`
    if (b.block_type === 'recurring') {
      return `${prof} · ${WEEKDAYS[b.day_of_week ?? 0]}s · ${time}`
    }
    const date = b.block_date ? new Date(b.block_date + 'T00:00:00').toLocaleDateString('pt-BR') : ''
    return `${prof} · ${date} · ${time}`
  }

  // Agrupamento da lista
  const { recurring, upcoming, past } = useMemo(() => {
    const rec: Block[] = []
    const up: Block[] = []
    const ps: Block[] = []
    for (const b of blocks) {
      if (b.block_type === 'recurring') {
        rec.push(b)
        continue
      }
      const diff = daysUntil(b.block_date ?? '1970-01-01')
      if (diff < 0) ps.push(b)
      else up.push(b)
    }
    // Próximas: mais próximas primeiro
    up.sort((a, b) => daysUntil(a.block_date ?? '') - daysUntil(b.block_date ?? ''))
    // Passadas: mais recentes primeiro
    ps.sort((a, b) => daysUntil(b.block_date ?? '') - daysUntil(a.block_date ?? ''))
    // Recorrentes: por dia da semana
    rec.sort((a, b) => (a.day_of_week ?? 0) - (b.day_of_week ?? 0))
    return { recurring: rec, upcoming: up, past: ps }
  }, [blocks])

  const activeProfs = useMemo(
    () => professionals.filter((p) => p.active && !p.is_receptionist),
    [professionals],
  )

  return (
    <div className="space-y-4">
      {/* ─── Cabeçalho explicativo ──────────────────────────────────── */}
      <div className="admin-card p-4">
        <h3 className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
          Bloqueios de horário
        </h3>
        <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
          Bloqueie intervalos (almoço · folga) ou datas específicas (feriado · férias · evento). Sistema impede agendamento nesses horários, mantém histórico preservado.
        </p>
      </div>

      {/* ─── 5 PRESETS RÁPIDOS ──────────────────────────────────────── */}
      <div className="admin-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
            Comece rápido
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider"
            style={{ background: 'var(--admin-accent)', color: '#fff' }}
          >
            <IconPlus size={12} /> Manual
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {PRESETS.map((p) => {
            const PresetIcon = p.Icon
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="rounded-xl p-3 text-left transition-all hover:-translate-y-px"
                style={{
                  background: 'var(--admin-surface)',
                  border: '1px solid var(--admin-border)',
                }}
                title={p.description}
              >
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-1.5"
                  style={{
                    background: `color-mix(in srgb, ${p.color} 14%, transparent)`,
                    color: p.color,
                  }}
                >
                  <PresetIcon size={16} />
                </span>
                <p className="text-xs font-bold" style={{ color: p.color }}>
                  {p.label}
                </p>
                <p className="text-[10px] mt-0.5 leading-snug" style={{ color: 'var(--admin-text-mute)' }}>
                  {p.description}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── FORMULÁRIO COLAPSÁVEL ──────────────────────────────────── */}
      {formOpen && (
        <div
          className="admin-card p-4 space-y-3"
          style={{ borderColor: 'color-mix(in srgb, var(--admin-accent) 35%, transparent)' }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
              {editingId ? 'Editar bloqueio' : 'Novo bloqueio'}
            </h3>
            <button
              type="button"
              onClick={() => { setFormOpen(false); resetForm() }}
              aria-label="Fechar"
              className="p-1.5 rounded-lg"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              <IconClose size={14} />
            </button>
          </div>

          {error && (
            <div
              className="text-xs px-3 py-2 rounded-lg"
              style={{
                background: 'color-mix(in srgb, var(--admin-danger,#EF4444) 12%, transparent)',
                color: 'var(--admin-danger,#EF4444)',
              }}
            >
              {error}
            </div>
          )}

          {/* Tipo */}
          <div className="grid grid-cols-2 gap-2">
            {(['recurring', 'specific'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, block_type: t })}
                className="rounded-xl p-3 text-left"
                style={{
                  background: form.block_type === t ? 'color-mix(in srgb, var(--admin-accent) 14%, transparent)' : 'var(--admin-surface)',
                  border: `1.5px solid ${form.block_type === t ? 'color-mix(in srgb, var(--admin-accent) 45%, transparent)' : 'var(--admin-border)'}`,
                }}
              >
                <p className="text-sm font-semibold" style={{ color: form.block_type === t ? 'var(--admin-accent)' : 'var(--admin-text)' }}>
                  {t === 'recurring' ? 'Recorrente (semanal)' : 'Data específica'}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                  {t === 'recurring' ? 'Almoço · folga semanal' : 'Folga · feriado · evento'}
                </p>
              </button>
            ))}
          </div>

          {/* Profissional · NULL = todo business */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-mute)' }}>
              Para quem
            </p>
            <select
              value={form.professional_id}
              onChange={(e) => setForm({ ...form, professional_id: e.target.value })}
              className="admin-input w-full text-sm py-2 px-2"
            >
              <option value="">Todo o salão</option>
              {activeProfs.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {form.block_type === 'recurring' ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-mute)' }}>
                Dia da semana
              </p>
              <select
                value={form.day_of_week}
                onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
                className="admin-input w-full text-sm py-2 px-2"
              >
                {WEEKDAYS.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-mute)' }}>
                Data
              </p>
              <input
                type="date" lang="pt-BR"
                value={form.block_date}
                onChange={(e) => setForm({ ...form, block_date: e.target.value })}
                className="admin-input w-full text-sm py-2 px-2"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-mute)' }}>
                De
              </p>
              <input
                type="time" lang="pt-BR"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="admin-input w-full text-sm py-2 px-2"
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-mute)' }}>
                Até
              </p>
              <input
                type="time" lang="pt-BR"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="admin-input w-full text-sm py-2 px-2"
              />
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-mute)' }}>
              Motivo (opcional)
            </p>
            <input
              type="text"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Ex: Intervalo de almoço"
              className="admin-input w-full text-sm py-2 px-2"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={creating}
            className="w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
            style={{ background: 'var(--admin-accent)', color: '#fff' }}
          >
            {editingId ? <IconCheck size={14} /> : <IconPlus size={14} />}
            {creating ? 'Salvando…' : (editingId ? 'Salvar alterações' : 'Adicionar bloqueio')}
          </button>
        </div>
      )}

      {/* ─── LISTA AGRUPADA ─────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl h-16 animate-pulse"
              style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}
            />
          ))}
        </div>
      ) : blocks.length === 0 ? (
        <div className="admin-card p-6 text-center">
          <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
            Nenhum bloqueio cadastrado.
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-faded)' }}>
            Use os atalhos rápidos acima ou o botão Manual.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Recorrentes */}
          {recurring.length > 0 && (
            <div className="space-y-2">
              <p
                className="text-[11px] font-semibold uppercase tracking-widest px-1"
                style={{ color: 'var(--admin-text-faded)' }}
              >
                Recorrentes ({recurring.length})
              </p>
              {recurring.map((b) => (
                <BlockCard
                  key={b.id}
                  block={b}
                  describe={describeBlock}
                  onEdit={openEdit}
                  onDuplicate={openDuplicate}
                  onDelete={(x) => setConfirmDelete(x)}
                />
              ))}
            </div>
          )}

          {/* Próximas datas específicas */}
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <p
                className="text-[11px] font-semibold uppercase tracking-widest px-1"
                style={{ color: 'var(--admin-text-faded)' }}
              >
                Próximas datas ({upcoming.length})
              </p>
              {upcoming.map((b) => (
                <BlockCard
                  key={b.id}
                  block={b}
                  describe={describeBlock}
                  onEdit={openEdit}
                  onDuplicate={openDuplicate}
                  onDelete={(x) => setConfirmDelete(x)}
                />
              ))}
            </div>
          )}

          {/* Passadas (toggle) */}
          {past.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowPast((v) => !v)}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--admin-text-mute)' }}
              >
                <IconChevronDown
                  size={12}
                  style={{ transform: showPast ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.18s' }}
                />
                Datas passadas ({past.length})
              </button>
              {showPast && (
                <div className="space-y-2 opacity-60">
                  {past.map((b) => (
                    <BlockCard
                      key={b.id}
                      block={b}
                      describe={describeBlock}
                      onEdit={openEdit}
                      onDuplicate={openDuplicate}
                      onDelete={(x) => setConfirmDelete(x)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {confirmDelete && (
        <ConfirmActionModal
          open={!!confirmDelete}
          title="Remover bloqueio?"
          message={describeBlock(confirmDelete)}
          confirmLabel="Remover"
          tone="danger"
          onConfirm={() => handleDelete(confirmDelete)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════
// Card de bloqueio reusável (lista)
// ═════════════════════════════════════════════════════════════════════
function BlockCard({
  block,
  describe,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  block: Block
  describe: (b: Block) => string
  onEdit: (b: Block) => void
  onDuplicate: (b: Block) => void
  onDelete: (b: Block) => void
}) {
  const isSpecific = block.block_type === 'specific'
  const diff = isSpecific && block.block_date ? daysUntil(block.block_date) : null
  const badge = diff != null ? relativeBadge(diff) : null

  return (
    <div className="admin-card p-3 flex items-center gap-2">
      <span
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}
      >
        {block.block_type === 'recurring' ? <IconClock size={16} /> : <IconCalendar size={16} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            {describe(block)}
          </p>
          {badge && (
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{ background: badge.bg, color: badge.color }}
            >
              {badge.label}
            </span>
          )}
        </div>
        {block.reason && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
            {block.reason}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => onEdit(block)}
          aria-label="Editar"
          title="Editar bloqueio"
          className="p-1.5 rounded-lg transition-colors hover:bg-[color:var(--admin-surface-hi)]"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          <IconPencil size={14} />
        </button>
        <button
          type="button"
          onClick={() => onDuplicate(block)}
          aria-label="Duplicar"
          title="Duplicar bloqueio"
          className="p-1.5 rounded-lg transition-colors hover:bg-[color:var(--admin-surface-hi)]"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          <IconCheck size={14} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(block)}
          aria-label="Remover"
          title="Remover bloqueio"
          className="p-1.5 rounded-lg transition-colors hover:bg-[color:var(--admin-surface-hi)]"
          style={{ color: 'var(--admin-danger,#EF4444)' }}
        >
          <IconTrash size={14} />
        </button>
      </div>
    </div>
  )
}
