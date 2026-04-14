'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Reward, Customer } from '@/lib/types'

type Props = {
  businessId: string
  initialRewards: Reward[]
  initialCustomers: Customer[]
}

export default function FidelidadeTab({ businessId, initialRewards, initialCustomers }: Props) {
  const [rewards, setRewards] = useState(initialRewards)
  const [customers, setCustomers] = useState(initialCustomers)
  const [form, setForm] = useState({ name: '', description: '', points_required: '' })
  const [saving, setSaving] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const supabase = createClient()

  async function handleAdd() {
    if (!form.name.trim() || !form.points_required) return
    setSaving(true)

    const { data, error } = await supabase
      .from('rewards')
      .insert({
        business_id: businessId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        points_required: parseInt(form.points_required),
        active: true,
      })
      .select()
      .single()

    if (!error && data) {
      setRewards([...rewards, data])
      setForm({ name: '', description: '', points_required: '' })
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover esta recompensa?')) return
    setLoadingId(id)
    const { error } = await supabase.from('rewards').delete().eq('id', id)
    if (!error) setRewards(rewards.filter((r) => r.id !== id))
    setLoadingId(null)
  }

  async function handleToggle(reward: Reward) {
    setLoadingId(reward.id)
    const { error } = await supabase
      .from('rewards')
      .update({ active: !reward.active })
      .eq('id', reward.id)
    if (!error) setRewards(rewards.map((r) => r.id === reward.id ? { ...r, active: !r.active } : r))
    setLoadingId(null)
  }

  const topCustomers = [...customers]
    .sort((a, b) => b.total_points - a.total_points)
    .slice(0, 10)

  return (
    <div className="space-y-6">

      {/* Ranking de clientes */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Ranking de clientes
        </h3>
        {topCustomers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <p className="text-gray-400 text-sm">Nenhum cliente com pontos ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topCustomers.map((customer, index) => (
              <div key={customer.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-400 w-5">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                    <p className="text-xs text-gray-400">{customer.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-amber-500">{customer.total_points} pts</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recompensas configuradas */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Recompensas
        </h3>
        {rewards.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <p className="text-gray-400 text-sm">Nenhuma recompensa configurada ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rewards.map((reward) => (
              <div key={reward.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${reward.active ? 'bg-amber-400' : 'bg-gray-200'}`} />
                  <div>
                    <p className={`text-sm font-medium ${reward.active ? 'text-gray-900' : 'text-gray-400'}`}>
                      {reward.name}
                    </p>
                    {reward.description && (
                      <p className="text-xs text-gray-400">{reward.description}</p>
                    )}
                    <p className="text-xs text-amber-500 font-medium">{reward.points_required} pontos</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggle(reward)}
                    disabled={loadingId === reward.id}
                    className="text-xs px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-40"
                  >
                    {reward.active ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button
                    onClick={() => handleDelete(reward.id)}
                    disabled={loadingId === reward.id}
                    className="text-xs px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors disabled:opacity-40"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Adicionar recompensa */}
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-4 space-y-3 mt-3">
          <p className="text-xs font-medium text-gray-500">Adicionar recompensa</p>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nome (ex: Corte grátis)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400"
          />
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descrição (opcional)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400"
          />
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Pontos necessários</label>
            <input
              type="number"
              value={form.points_required}
              onChange={(e) => setForm({ ...form, points_required: e.target.value })}
              placeholder="ex: 1000"
              min="1"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={saving || !form.name.trim() || !form.points_required}
            className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            {saving ? 'Adicionando...' : '+ Adicionar recompensa'}
          </button>
        </div>
      </div>
    </div>
  )
}
