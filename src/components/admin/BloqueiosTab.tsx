'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Professional } from '@/lib/types'
import { IconPlus, IconTrash, IconClock, IconCalendar } from '@/components/ui/Icon'
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

export default function BloqueiosTab({ businessId, professionals }: Props) {
  const supabase = createClient()
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Block | null>(null)

  const [form, setForm] = useState<{
    block_type: 'recurring' | 'specific'
    professional_id: string
    day_of_week: string
    block_date: string
    start_time: string
    end_time: string
    reason: string
  }>({
    block_type: 'recurring',
    professional_id: '',
    day_of_week: '1',
    block_date: '',
    start_time: '12:00',
    end_time: '13:00',
    reason: 'Intervalo de almoço',
  })
  const [creating, setCreating] = useState(false)

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

  async function handleCreate() {
    setError(null)
    if (form.block_type === 'recurring' && !form.day_of_week) {
      setError('Escolha o dia da semana')
      return
    }
    if (form.block_type === 'specific' && !form.block_date) {
      setError('Escolha a data')
      return
    }
    setCreating(true)
    const payload: {
      business_id: string
      block_type: 'recurring' | 'specific'
      professional_id: string | null
      day_of_week: number | null
      block_date: string | null
      start_time: string
      end_time: string
      reason: string | null
    } = {
      business_id: businessId,
      block_type: form.block_type,
      professional_id: form.professional_id || null,
      day_of_week: form.block_type === 'recurring' ? parseInt(form.day_of_week, 10) : null,
      block_date: form.block_type === 'specific' ? form.block_date : null,
      start_time: form.start_time + ':00',
      end_time: form.end_time + ':00',
      reason: form.reason.trim() || null,
    }
    const { error } = await supabase.from('business_blocks').insert(payload)
    setCreating(false)
    if (error) {
      setError(`Erro: ${error.message}`)
      return
    }
    setForm({
      ...form,
      reason: '',
      block_date: '',
    })
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

  function describeBlock(b: Block): string {
    const prof = b.professional_id
      ? professionals.find((p) => p.id === b.professional_id)?.name ?? 'Profissional'
      : 'Todo o salão'
    const time = `${b.start_time.slice(0, 5)} às ${b.end_time.slice(0, 5)}`
    if (b.block_type === 'recurring') {
      return `${prof} · ${WEEKDAYS[b.day_of_week ?? 0]}s · ${time}`
    }
    const date = b.block_date ? new Date(b.block_date + 'T00:00:00').toLocaleDateString('pt-BR') : ''
    return `${prof} · ${date} · ${time}`
  }

  return (
    <div className="space-y-4">
      <div className="admin-card p-4 space-y-3">
        <div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
            Bloqueios de horário
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
            Bloqueie intervalos de almoço (recorrente toda semana) ou datas específicas (folga · feriado · evento). Sistema vai impedir agendamento nesses horários.
          </p>
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
            {professionals.filter((p) => p.active && !p.is_receptionist).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
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
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-mute)' }}>
              Data
            </p>
            <input
              type="date"
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
              type="time"
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
              type="time"
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
          onClick={handleCreate}
          disabled={creating}
          className="w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
          style={{ background: 'var(--admin-accent)', color: '#fff' }}
        >
          <IconPlus size={14} /> {creating ? 'Adicionando…' : 'Adicionar bloqueio'}
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-center py-4" style={{ color: 'var(--admin-text-mute)' }}>
          Carregando…
        </p>
      ) : blocks.length === 0 ? (
        <div className="admin-card p-6 text-center">
          <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
            Nenhum bloqueio cadastrado.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {blocks.map((b) => (
            <div key={b.id} className="admin-card p-3 flex items-center justify-between gap-2">
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}
              >
                {b.block_type === 'recurring' ? <IconClock size={16} /> : <IconCalendar size={16} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                  {describeBlock(b)}
                </p>
                {b.reason && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                    {b.reason}
                  </p>
                )}
              </div>
              <button
                onClick={() => setConfirmDelete(b)}
                aria-label="Remover"
                className="p-1.5 rounded-lg flex-shrink-0"
                style={{ color: 'var(--admin-text-faded)' }}
              >
                <IconTrash size={16} />
              </button>
            </div>
          ))}
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
