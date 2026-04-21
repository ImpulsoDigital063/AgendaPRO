'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Reward, Customer } from '@/lib/types'

type ReviewClaim = {
  id: string
  customer_name: string | null
  customer_phone: string
  requested_at: string
}

type Props = {
  businessId: string
  initialRewards: Reward[]
  initialCustomers: Customer[]
  pointsForReferral: number
  pointsForReview: number
  pointsMode: 'business' | 'professional'
}

export default function FidelidadeTab({ businessId, initialRewards, initialCustomers, pointsForReferral, pointsForReview, pointsMode: initialPointsMode }: Props) {
  const [rewards, setRewards] = useState(initialRewards)
  const [customers] = useState(initialCustomers)
  const [form, setForm] = useState({ name: '', description: '', points_required: '' })
  const [referralPoints, setReferralPoints] = useState(String(pointsForReferral))
  const [savingReferral, setSavingReferral] = useState(false)
  const [pointsMode, setPointsMode] = useState<'business' | 'professional'>(initialPointsMode)
  const [savingMode, setSavingMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [pendingClaims, setPendingClaims] = useState<ReviewClaim[]>([])
  const [claimActionId, setClaimActionId] = useState<string | null>(null)
  const supabase = createClient()

  async function handleChangePointsMode(next: 'business' | 'professional') {
    if (next === pointsMode || savingMode) return
    setSavingMode(true)
    const prev = pointsMode
    setPointsMode(next)
    const { error } = await supabase
      .from('businesses')
      .update({ points_mode: next })
      .eq('id', businessId)
    if (error) setPointsMode(prev)
    setSavingMode(false)
  }

  useEffect(() => {
    let cancelled = false
    async function loadClaims() {
      const { data } = await supabase
        .from('review_claims')
        .select('id, customer_name, customer_phone, requested_at')
        .eq('business_id', businessId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: true })
      if (!cancelled && data) setPendingClaims(data as ReviewClaim[])
    }
    loadClaims()
    return () => {
      cancelled = true
    }
  }, [businessId, supabase])

  async function handleClaimAction(claimId: string, action: 'approve' | 'reject') {
    setClaimActionId(claimId)
    const res = await fetch('/api/admin/review-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimId, action }),
    })
    if (res.ok) {
      setPendingClaims((prev) => prev.filter((c) => c.id !== claimId))
    }
    setClaimActionId(null)
  }

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

      {/* Como funciona o programa de pontos */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--admin-text-mute)' }}>
          Como funciona
        </h3>
        <div className="admin-card p-4 space-y-4">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
            Use isso no atendimento pra incentivar o cliente a indicar amigos e avaliar no Google.
            Os pontos só entram depois que <strong>você confirma</strong> o agendamento.
          </p>

          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}>1</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Pontos por atendimento</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
                  Cada serviço tem um valor em pontos (você configura em Serviços).
                  Quando você confirma o agendamento, o cliente ganha a soma dos pontos.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}>2</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Pontos por indicação</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
                  Cada cliente tem um link próprio. Quando alguém <strong>novo</strong> agenda por esse link
                  e você confirma, o indicador ganha pontos. Uma vez por cliente indicado.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}>3</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Pontos por avaliação no Google</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
                  Cliente avalia no Google e pede os pontos. O pedido cai aqui nessa tela pra você
                  conferir. Você aprova se viu a review, rejeita se não. Uma vez por cliente.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}>4</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Trocar por recompensas</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
                  Configure aqui embaixo quais recompensas o cliente pode trocar
                  (ex: corte grátis, desconto, produto). Você define o nome e quantos pontos custa.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl p-3" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
              Dica pro atendimento
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
              Fale pro cliente na hora do atendimento: <em>&ldquo;Tu pode ganhar pontos
              avaliando a gente no Google e indicando amigo pelo link da agenda.
              Troca por corte grátis depois.&rdquo;</em> Cliente que conhece o programa indica mais.
            </p>
          </div>
        </div>
      </div>

      {/* Modo de pontos */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--admin-text-mute)' }}>
          Modo de pontos
        </h3>
        <div className="admin-card p-4 space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
            Escolha se os pontos do cliente somam no estabelecimento como um todo ou se ficam
            separados por profissional. As recompensas continuam iguais pros dois.
          </p>

          <div
            className="flex rounded-xl p-1"
            style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
          >
            {([
              { id: 'business' as const, label: 'Estabelecimento', desc: 'Um saldo só' },
              { id: 'professional' as const, label: 'Profissional', desc: 'Um saldo por atendente' },
            ]).map((opt) => {
              const active = pointsMode === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => handleChangePointsMode(opt.id)}
                  disabled={savingMode}
                  className="flex-1 py-2.5 px-3 text-sm rounded-lg transition-colors disabled:opacity-60"
                  style={{
                    background: active ? 'var(--admin-accent)' : 'transparent',
                    color: active ? '#fff' : 'var(--admin-text-mute)',
                  }}
                >
                  <span className="block font-semibold">{opt.label}</span>
                  <span className="block text-[11px] mt-0.5 opacity-80">{opt.desc}</span>
                </button>
              )
            })}
          </div>

          {pointsMode === 'professional' && (
            <div
              className="rounded-xl p-3"
              style={{ background: 'var(--admin-accent-bg)', border: '1px solid var(--admin-accent-border)' }}
            >
              <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text)' }}>
                <strong>Modo por profissional ativo.</strong> Cada cliente vai ver o saldo separado
                com cada atendente em &ldquo;Meus pontos&rdquo;. Pontos de indicação vão pra conta
                de quem atendeu; pontos de avaliação no Google vão pro último profissional que
                atendeu aquele cliente.
              </p>
            </div>
          )}
        </div>
      </div>

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

      {/* Pedidos pendentes de pontos por avaliação */}
      {pendingClaims.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--admin-text-mute)' }}>
            Pedidos de pontos por avaliação
            <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
              {pendingClaims.length}
            </span>
          </h3>
          <div className="admin-card p-3 mb-2">
            <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
              Confira no Google se a pessoa realmente avaliou. Só aprovar se viu a review.
            </p>
          </div>
          <div className="space-y-2">
            {pendingClaims.map((claim) => (
              <div key={claim.id} className="admin-card p-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--admin-text)' }}>
                    {claim.customer_name || 'Cliente'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
                    {claim.customer_phone} ·{' '}
                    {new Date(claim.requested_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleClaimAction(claim.id, 'reject')}
                    disabled={claimActionId === claim.id}
                    className="text-xs px-3 py-1.5 rounded-lg text-red-400 disabled:opacity-40 transition-opacity"
                    style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
                  >
                    Rejeitar
                  </button>
                  <button
                    onClick={() => handleClaimAction(claim.id, 'approve')}
                    disabled={claimActionId === claim.id}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-40 transition-opacity"
                    style={{ background: 'var(--admin-accent)', color: '#fff' }}
                  >
                    Aprovar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Pontos por avaliacao Google — config fica na aba Negocio */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--admin-text-mute)' }}>
          Pontos por avaliacao no Google
        </h3>
        <div className="admin-card p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
              {pointsForReview > 0 ? `${pointsForReview} pontos por avaliacao` : 'Desativado'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
              Configure em <strong>Negocio → Google Reviews</strong>
            </p>
          </div>
          <span
            className="text-xs px-2.5 py-1 rounded-lg font-medium"
            style={{
              background: pointsForReview > 0 ? 'color-mix(in srgb, var(--admin-success) 12%, transparent)' : 'var(--admin-surface)',
              color: pointsForReview > 0 ? 'var(--admin-success)' : 'var(--admin-text-mute)',
              border: pointsForReview > 0 ? '1px solid color-mix(in srgb, var(--admin-success) 25%, transparent)' : '1px solid var(--admin-border)',
            }}
          >
            {pointsForReview > 0 ? 'Ativo' : 'Inativo'}
          </span>
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
