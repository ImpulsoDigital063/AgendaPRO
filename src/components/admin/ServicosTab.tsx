'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Service } from '@/lib/types'

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

type FormState = {
  name: string
  price: string
  duration_minutes: number
  points: string
}

const emptyForm: FormState = { name: '', price: '', duration_minutes: 30, points: '' }

export default function ServicosTab({ businessId, initialServices }: Props) {
  const [services, setServices] = useState(initialServices)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const supabase = createClient()

  async function handleAdd() {
    if (!form.name.trim()) return
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
  }

  async function handleSaveEdit(id: string) {
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
      setServices(services.map((s) =>
        s.id === id
          ? { ...s, name: editForm.name.trim(), price: priceValue, duration_minutes: editForm.duration_minutes, points: editForm.points ? parseInt(editForm.points) : 0 }
          : s
      ))
      setEditingId(null)
    }
    setLoadingId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este servico?')) return
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
      setServices(services.map((s) => s.id === service.id ? { ...s, active: !s.active } : s))
    }
    setLoadingId(null)
  }

  return (
    <div className="space-y-3">
      {services.length === 0 && (
        <div className="admin-card p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--admin-text-faded)' }}>Nenhum servico cadastrado ainda.</p>
        </div>
      )}

      {services.map((service) => (
        <div key={service.id} className="admin-card overflow-hidden">
          {editingId === service.id ? (
            /* Modo edicao */
            <div className="p-4 space-y-3">
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="admin-input w-full px-3 py-2.5 text-sm"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="admin-label">Preco (R$)</label>
                  <input
                    type="text"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    placeholder="0,00"
                    className="admin-input w-full px-3 py-2.5 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="admin-label">Duracao</label>
                  <select
                    value={editForm.duration_minutes}
                    onChange={(e) => setEditForm({ ...editForm, duration_minutes: Number(e.target.value) })}
                    className="admin-input w-full px-3 py-2.5 text-sm"
                  >
                    {DURATIONS.map((d) => (
                      <option key={d} value={d}>{formatDuration(d)}</option>
                    ))}
                  </select>
                </div>
              </div>
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
                  onClick={() => handleSaveEdit(service.id)}
                  disabled={loadingId === service.id}
                  className="flex-1 py-2 rounded-xl text-sm font-medium disabled:opacity-40 transition-colors"
                  style={{ background: 'var(--admin-accent)', color: '#fff' }}
                >
                  {loadingId === service.id ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-text-mute)' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            /* Modo visualizacao */
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${service.active ? 'bg-green-400' : 'bg-gray-500'}`} />
                <div>
                  <p className="font-medium text-sm" style={{ color: service.active ? 'var(--admin-text)' : 'var(--admin-text-faded)' }}>
                    {service.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
                    {formatPrice(service.price)} · {formatDuration(service.duration_minutes)}
                    {service.points > 0 && <span className="text-amber-500"> · {service.points}pts</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEdit(service)}
                  className="text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--admin-text-mute)' }}
                >
                  Editar
                </button>
                <button
                  onClick={() => toggleActive(service)}
                  disabled={loadingId === service.id}
                  className="text-xs px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                  style={{ color: 'var(--admin-text-mute)' }}
                >
                  {service.active ? 'Ocultar' : 'Mostrar'}
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  disabled={loadingId === service.id}
                  className="text-xs px-2.5 py-1.5 rounded-lg text-red-400 transition-colors disabled:opacity-40"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Adicionar servico */}
      <div className="admin-card p-4 space-y-3" style={{ borderStyle: 'dashed' }}>
        <p className="text-xs font-medium" style={{ color: 'var(--admin-text-mute)' }}>Adicionar servico</p>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Nome do servico (ex: Corte masculino)"
          className="admin-input w-full px-3 py-2.5 text-sm"
        />
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="admin-label">Preco (R$)</label>
            <input
              type="text"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="0,00"
              className="admin-input w-full px-3 py-2.5 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="admin-label">Duracao</label>
            <select
              value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
              className="admin-input w-full px-3 py-2.5 text-sm"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>{formatDuration(d)}</option>
              ))}
            </select>
          </div>
        </div>
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
        </div>
        <button
          onClick={handleAdd}
          disabled={saving || !form.name.trim()}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
          style={{ background: 'var(--admin-accent)', color: '#fff' }}
        >
          {saving ? 'Adicionando...' : '+ Adicionar servico'}
        </button>
      </div>
    </div>
  )
}
