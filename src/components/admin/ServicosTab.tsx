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
}

const emptyForm: FormState = { name: '', price: '', duration_minutes: 30 }

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
      })
      .eq('id', id)

    if (!error) {
      setServices(services.map((s) =>
        s.id === id
          ? { ...s, name: editForm.name.trim(), price: priceValue, duration_minutes: editForm.duration_minutes }
          : s
      ))
      setEditingId(null)
    }
    setLoadingId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este serviço?')) return
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
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <p className="text-gray-400 text-sm">Nenhum serviço cadastrado ainda.</p>
        </div>
      )}

      {services.map((service) => (
        <div key={service.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {editingId === service.id ? (
            /* Modo edição */
            <div className="p-4 space-y-3">
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">Preço (R$)</label>
                  <input
                    type="text"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    placeholder="0,00"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">Duração</label>
                  <select
                    value={editForm.duration_minutes}
                    onChange={(e) => setEditForm({ ...editForm, duration_minutes: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-white"
                  >
                    {DURATIONS.map((d) => (
                      <option key={d} value={d}>{formatDuration(d)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveEdit(service.id)}
                  disabled={loadingId === service.id}
                  className="flex-1 bg-gray-900 text-white py-2 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-40"
                >
                  {loadingId === service.id ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-sm font-medium hover:bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            /* Modo visualização */
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${service.active ? 'bg-green-400' : 'bg-gray-200'}`} />
                <div>
                  <p className={`font-medium text-sm ${service.active ? 'text-gray-900' : 'text-gray-400'}`}>
                    {service.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatPrice(service.price)} · {formatDuration(service.duration_minutes)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEdit(service)}
                  className="text-xs px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => toggleActive(service)}
                  disabled={loadingId === service.id}
                  className="text-xs px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-40"
                >
                  {service.active ? 'Ocultar' : 'Mostrar'}
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  disabled={loadingId === service.id}
                  className="text-xs px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Adicionar serviço */}
      <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-4 space-y-3">
        <p className="text-xs font-medium text-gray-500">Adicionar serviço</p>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Nome do serviço (ex: Corte masculino)"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400"
        />
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Preço (R$)</label>
            <input
              type="text"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="0,00"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Duração</label>
            <select
              value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-white"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>{formatDuration(d)}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={saving || !form.name.trim()}
          className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40"
        >
          {saving ? 'Adicionando...' : '+ Adicionar serviço'}
        </button>
      </div>
    </div>
  )
}
