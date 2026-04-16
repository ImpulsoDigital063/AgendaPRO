'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Reward, Customer } from '@/lib/types'

type Props = {
  businessId: string
  initialRewards: Reward[]
  initialCustomers: Customer[]
  pointsForReferral: number
}

export default function FidelidadeTab({ businessId, initialRewards, initialCustomers, pointsForReferral }: Props) {
  const [rewards, setRewards] = useState(initialRewards)
  const [customers, setCustomers] = useState(initialCustomers)
  const [form, setForm] = useState({ name: '', description: '', points_required: '' })
  const [referralPoints, setReferralPoints] = useState(String(pointsForReferral))
  const [savingReferral, setSavingReferral] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const supabase = createClient()

  async function handleSaveReferralPoints() {
    setSavingReferral(true)
    await supabase
      .from('businesses')
      .update({ points_for_referral: parseInt(referralPoints) || 0 })
      .eq('id', businessId)
    setSavingReferral(false)
  }

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
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--admin-text-mute)' }}>
          Ranking de clientes
        </h3>
        {topCustomers.length === 0 ? (
          <div className="admin-card p-6 text-center">
            <p className="text-sm" style={{ color: 'var(--admin-text-faded)' }}>Nenhum cliente com pontos ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topCustomers.map((customer, index) => (
              <div key={customer.id} className="admin-card px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold w-5" style={{ color: 'var(--admin-text-faded)' }}>
                    {index < 3 ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={index === 0 ? '#F59E0B' : index === 1 ? '#94A3B8' : '#CD7F32'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
                    ) : `${index + 1}º`}
                  </span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>{customer.name}</p>
                    <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>{customer.phone}</p>
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

      {/* Configuração de indicação */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--admin-text-mute)' }}>
          Pontos por indicacao
        </h3>
        <div className="admin-card p-4 space-y-3">
          <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
            Quantos pontos o cliente ganha quando um amigo indicado faz o primeiro agendamento.
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              value={referralPoints}
              onChange={(e) => setReferralPoints(e.target.value)}
              placeholder="ex: 200"
              min="0"
              className="admin-input flex-1"
            />
            <button
              onClick={handleSaveReferralPoints}
              disabled={savingReferral}
              className="px-4 rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              {savingReferral ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>

      {/* Recompensas configuradas */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--admin-text-mute)' }}>
          Recompensas
        </h3>
        {rewards.length === 0 ? (
          <div className="admin-card p-6 text-center">
            <p className="text-sm" style={{ color: 'var(--admin-text-faded)' }}>Nenhuma recompensa configurada ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rewards.map((reward) => (
              <div key={reward.id} className="admin-card px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${reward.active ? 'bg-amber-400' : 'bg-gray-500'}`} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: reward.active ? 'var(--admin-text)' : 'var(--admin-text-faded)' }}>
                      {reward.name}
                    </p>
                    {reward.description && (
                      <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>{reward.description}</p>
                    )}
                    <p className="text-xs text-amber-500 font-medium">{reward.points_required} pontos</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggle(reward)}
                    disabled={loadingId === reward.id}
                    className="text-xs px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                    style={{ color: 'var(--admin-text-mute)' }}
                  >
                    {reward.active ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button
                    onClick={() => handleDelete(reward.id)}
                    disabled={loadingId === reward.id}
                    className="text-xs px-2.5 py-1.5 rounded-lg text-red-400 transition-colors disabled:opacity-40"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Adicionar recompensa */}
        <div className="admin-card p-4 space-y-3 mt-3" style={{ borderStyle: 'dashed' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--admin-text-mute)' }}>Adicionar recompensa</p>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nome (ex: Corte gratis)"
            className="admin-input w-full rounded-xl px-3 py-2.5 text-sm"
          />
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descricao (opcional)"
            className="admin-input w-full rounded-xl px-3 py-2.5 text-sm"
          />
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--admin-text-faded)' }}>Pontos necessarios</label>
            <input
              type="number"
              value={form.points_required}
              onChange={(e) => setForm({ ...form, points_required: e.target.value })}
              placeholder="ex: 1000"
              min="1"
              className="admin-input w-full rounded-xl px-3 py-2.5 text-sm"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={saving || !form.name.trim() || !form.points_required}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
            style={{ background: 'var(--admin-accent)', color: '#fff' }}
          >
            {saving ? 'Adicionando...' : '+ Adicionar recompensa'}
          </button>
        </div>
      </div>
    </div>
  )
}
