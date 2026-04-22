'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Reward, Customer } from '@/lib/types'
import {
  IconAlert,
  IconCheck,
  IconChevronDown,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconGift,
  IconInfo,
  IconPencil,
  IconPlus,
  IconSparkles,
  IconStar,
  IconTrash,
  IconUsers,
} from '@/components/ui/Icon'
import ConfirmActionModal from '@/components/admin/ConfirmActionModal'
import MoreActionsMenu, { type MoreAction } from '@/components/admin/MoreActionsMenu'

type ReviewClaim = {
  id: string
  customer_name: string | null
  customer_phone: string
  google_review_name: string | null
  requested_at: string
}

type Props = {
  businessId: string
  initialRewards: Reward[]
  initialCustomers: Customer[]
  pointsForReferral: number
  pointsForReview: number
  pointsMode: 'business' | 'professional'
  onNavigateToNegocio?: () => void
}

const REWARD_SUGGESTIONS = [
  'Corte grátis',
  '10% off',
  'Limpeza grátis',
  'Sobrancelha grátis',
  'Manicure grátis',
]

type RewardForm = {
  name: string
  description: string
  points_required: string
}

const emptyRewardForm: RewardForm = { name: '', description: '', points_required: '' }

function formatRelativeDay(iso: string) {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const hours = Math.floor((now - then) / (1000 * 60 * 60))
  if (hours < 1) return 'agora'
  if (hours < 24) return `${hours}h atrás`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'ontem'
  if (days < 7) return `${days} dias`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function FidelidadeTab({
  businessId,
  initialRewards,
  initialCustomers,
  pointsForReferral,
  pointsForReview,
  pointsMode: initialPointsMode,
  onNavigateToNegocio,
}: Props) {
  const supabase = createClient()

  const [rewards, setRewards] = useState(initialRewards)
  const [customers] = useState(initialCustomers)
  const [pointsMode, setPointsMode] = useState<'business' | 'professional'>(initialPointsMode)
  const [referralPoints, setReferralPoints] = useState(String(pointsForReferral))
  const [referralSavedAt, setReferralSavedAt] = useState<number | null>(null)

  const [pendingClaims, setPendingClaims] = useState<ReviewClaim[]>([])
  const [claimActionId, setClaimActionId] = useState<string | null>(null)

  const [form, setForm] = useState<RewardForm>(emptyRewardForm)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<RewardForm>(emptyRewardForm)

  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Reward | null>(null)
  const [confirmModeChange, setConfirmModeChange] = useState<'business' | 'professional' | null>(null)
  const [savingMode, setSavingMode] = useState(false)

  const [showHelp, setShowHelp] = useState(false)
  const [showAllRanking, setShowAllRanking] = useState(false)

  const addFormRef = useRef<HTMLDivElement | null>(null)
  const referralSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Carrega claims pendentes
  useEffect(() => {
    let cancelled = false
    async function loadClaims() {
      const { data } = await supabase
        .from('review_claims')
        .select('id, customer_name, customer_phone, google_review_name, requested_at')
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

  useEffect(() => {
    return () => {
      if (referralSavedTimerRef.current) clearTimeout(referralSavedTimerRef.current)
    }
  }, [])

  const customersWithPoints = useMemo(
    () => customers.filter((c) => c.total_points > 0),
    [customers],
  )
  const totalPointsCirculating = useMemo(
    () => customersWithPoints.reduce((sum, c) => sum + c.total_points, 0),
    [customersWithPoints],
  )
  const activeRewardsCount = useMemo(() => rewards.filter((r) => r.active).length, [rewards])

  const topCustomers = useMemo(
    () =>
      [...customersWithPoints]
        .sort((a, b) => b.total_points - a.total_points)
        .slice(0, showAllRanking ? 50 : 5),
    [customersWithPoints, showAllRanking],
  )

  // ---- Pedidos de pontos por avaliação ----
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

  // ---- Modo de pontos ----
  async function applyModeChange(next: 'business' | 'professional') {
    if (next === pointsMode) return
    setSavingMode(true)
    const prev = pointsMode
    setPointsMode(next)
    const { error } = await supabase
      .from('businesses')
      .update({ points_mode: next })
      .eq('id', businessId)
    if (error) setPointsMode(prev)
    setSavingMode(false)
    setConfirmModeChange(null)
  }

  // ---- Pontos por indicação (autosave em blur) ----
  async function handleReferralBlur() {
    const value = parseInt(referralPoints) || 0
    if (value === pointsForReferral) return
    await supabase
      .from('businesses')
      .update({ points_for_referral: value })
      .eq('id', businessId)
    setReferralSavedAt(Date.now())
    if (referralSavedTimerRef.current) clearTimeout(referralSavedTimerRef.current)
    referralSavedTimerRef.current = setTimeout(() => setReferralSavedAt(null), 2000)
  }

  // ---- Recompensas ----
  function scrollToAddForm(prefillName?: string) {
    if (prefillName) setForm({ ...emptyRewardForm, name: prefillName })
    addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
      setForm(emptyRewardForm)
    }
    setSaving(false)
  }

  function startEdit(reward: Reward) {
    setEditingId(reward.id)
    setEditForm({
      name: reward.name,
      description: reward.description ?? '',
      points_required: String(reward.points_required),
    })
  }

  async function handleSaveEdit(id: string) {
    if (!editForm.name.trim() || !editForm.points_required) return
    setLoadingId(id)
    const { error } = await supabase
      .from('rewards')
      .update({
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        points_required: parseInt(editForm.points_required),
      })
      .eq('id', id)
    if (!error) {
      setRewards(
        rewards.map((r) =>
          r.id === id
            ? {
                ...r,
                name: editForm.name.trim(),
                description: editForm.description.trim() || null,
                points_required: parseInt(editForm.points_required),
              }
            : r,
        ),
      )
      setEditingId(null)
    }
    setLoadingId(null)
  }

  async function handleToggle(reward: Reward) {
    setLoadingId(reward.id)
    const { error } = await supabase
      .from('rewards')
      .update({ active: !reward.active })
      .eq('id', reward.id)
    if (!error) {
      setRewards(
        rewards.map((r) => (r.id === reward.id ? { ...r, active: !r.active } : r)),
      )
    }
    setLoadingId(null)
  }

  async function handleDelete(id: string) {
    setLoadingId(id)
    const { error } = await supabase.from('rewards').delete().eq('id', id)
    if (!error) setRewards(rewards.filter((r) => r.id !== id))
    setLoadingId(null)
  }

  // Recompensas ordenadas: ativas primeiro, depois por pontos crescente
  const sortedRewards = useMemo(
    () =>
      [...rewards].sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1
        return a.points_required - b.points_required
      }),
    [rewards],
  )

  return (
    <div className="space-y-5 pb-10">
      {/* 1. PEDIDOS PENDENTES — topo, urgente */}
      {pendingClaims.length > 0 && (
        <section>
          <SectionHeader
            label="Pedidos pendentes"
            badge={pendingClaims.length}
            urgent
            icon={<IconAlert size={14} />}
          />
          <div
            className="rounded-xl px-3 py-2.5 mb-2 flex items-start gap-2 text-xs leading-relaxed"
            style={{
              background: 'color-mix(in srgb, var(--admin-warn) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--admin-warn) 30%, transparent)',
              color: 'var(--admin-text-2)',
            }}
          >
            <span style={{ color: 'var(--admin-warn)' }}>
              <IconInfo size={14} />
            </span>
            <span>
              Confira no Google se a pessoa <strong>realmente</strong> avaliou. Aprove só se
              encontrou a review.
            </span>
          </div>
          <div className="space-y-2">
            {pendingClaims.map((claim) => {
              const ageMs = Date.now() - new Date(claim.requested_at).getTime()
              const isFresh = ageMs < 24 * 60 * 60 * 1000
              const isStale = ageMs > 3 * 24 * 60 * 60 * 1000
              return (
                <div
                  key={claim.id}
                  className="admin-card-deep p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p
                        className="text-sm font-semibold truncate"
                        style={{ color: 'var(--admin-text)' }}
                      >
                        {claim.customer_name || 'Cliente'}
                      </p>
                      {isFresh && (
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{
                            background: 'color-mix(in srgb, var(--admin-accent) 18%, transparent)',
                            color: 'var(--admin-accent)',
                          }}
                        >
                          Novo
                        </span>
                      )}
                      {isStale && (
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{
                            background: 'color-mix(in srgb, var(--admin-warn) 18%, transparent)',
                            color: 'var(--admin-warn)',
                          }}
                        >
                          Esperando
                        </span>
                      )}
                    </div>
                    <p
                      className="text-[11px] mt-0.5"
                      style={{ color: 'var(--admin-text-faded)' }}
                    >
                      {claim.customer_phone} · {formatRelativeDay(claim.requested_at)}
                    </p>
                    {claim.google_review_name && (
                      <p
                        className="text-[11px] mt-1"
                        style={{ color: 'var(--admin-text-2)' }}
                      >
                        No Google:{' '}
                        <span className="font-semibold" style={{ color: 'var(--admin-text)' }}>
                          {claim.google_review_name}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleClaimAction(claim.id, 'reject')}
                      disabled={claimActionId === claim.id}
                      className="text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                      style={{
                        background: 'transparent',
                        color: 'var(--admin-danger)',
                        border: '1px solid var(--admin-border)',
                      }}
                    >
                      Rejeitar
                    </button>
                    <button
                      onClick={() => handleClaimAction(claim.id, 'approve')}
                      disabled={claimActionId === claim.id}
                      className="text-xs px-3 py-1.5 rounded-lg font-bold disabled:opacity-40 transition-all"
                      style={{
                        background:
                          'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
                        color: '#fff',
                        boxShadow: '0 4px 12px -4px rgba(59,130,246,0.5)',
                      }}
                    >
                      Aprovar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 2. KPI STRIP */}
      <section>
        <div className="grid grid-cols-3 gap-2">
          <Kpi
            icon={<IconUsers size={14} />}
            label="Com pontos"
            value={String(customersWithPoints.length)}
            sub={`de ${customers.length} cliente${customers.length === 1 ? '' : 's'}`}
          />
          <Kpi
            icon={<IconSparkles size={14} />}
            label="Em circulação"
            value={totalPointsCirculating.toLocaleString('pt-BR')}
            sub="pontos no total"
            tone="accent"
          />
          <Kpi
            icon={<IconGift size={14} />}
            label="Recompensas"
            value={`${activeRewardsCount}/${rewards.length}`}
            sub="ativas"
          />
        </div>
      </section>

      {/* 3. RECOMPENSAS */}
      <section>
        <SectionHeader label="Recompensas" icon={<IconGift size={14} />} />
        {sortedRewards.length === 0 ? (
          <div className="admin-card-deep p-6 text-center space-y-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
              Nenhuma recompensa configurada ainda
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
              Sugestões pra começar (clique pra prefiller):
            </p>
            <div className="flex flex-wrap justify-center gap-1.5 pt-1">
              {REWARD_SUGGESTIONS.map((name) => (
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
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedRewards.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                isEditing={editingId === reward.id}
                editForm={editForm}
                setEditForm={setEditForm}
                loadingId={loadingId}
                onStartEdit={() => startEdit(reward)}
                onCancelEdit={() => setEditingId(null)}
                onSaveEdit={() => handleSaveEdit(reward.id)}
                onToggle={() => handleToggle(reward)}
                onAskDelete={() => setConfirmDelete(reward)}
              />
            ))}
          </div>
        )}

        {/* Adicionar recompensa */}
        <div
          ref={addFormRef}
          className="rounded-2xl p-4 space-y-3 mt-3"
          style={{
            background: 'var(--admin-surface)',
            border: '1px dashed var(--admin-border-hi)',
          }}
        >
          <p className="admin-label flex items-center gap-1.5">
            <IconPlus size={14} />
            Adicionar recompensa
          </p>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nome (ex: Corte grátis)"
            className="admin-input w-full px-3 py-2.5 text-sm"
          />
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descrição (opcional)"
            className="admin-input w-full px-3 py-2.5 text-sm"
          />
          <div>
            <label className="admin-label">Pontos necessários</label>
            <input
              type="number"
              value={form.points_required}
              onChange={(e) => setForm({ ...form, points_required: e.target.value })}
              placeholder="ex: 1000"
              min="1"
              className="admin-input w-full px-3 py-2.5 text-sm"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={saving || !form.name.trim() || !form.points_required}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
            style={{
              background:
                'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
              color: '#FFFFFF',
              boxShadow:
                '0 8px 20px -6px color-mix(in srgb, var(--admin-accent) 45%, transparent)',
            }}
          >
            {saving ? 'Adicionando...' : 'Adicionar recompensa'}
          </button>
        </div>
      </section>

      {/* 4. CONFIGURAÇÕES */}
      <section className="space-y-3">
        <SectionHeader label="Como o cliente ganha pontos" />

        {/* Pontos por indicação */}
        <div className="admin-card p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
              Pontos por indicação
            </p>
            {referralSavedAt && (
              <span
                className="text-[10px] font-bold flex items-center gap-1 transition-opacity"
                style={{ color: 'var(--admin-success, #16A34A)' }}
              >
                <IconCheck size={11} /> Salvo
              </span>
            )}
          </div>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
            Quando um amigo indicado faz o primeiro agendamento e você confirma.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={referralPoints}
              onChange={(e) => setReferralPoints(e.target.value)}
              onBlur={handleReferralBlur}
              placeholder="ex: 200"
              min="0"
              className="admin-input flex-1 px-3 py-2 text-sm"
            />
            <span className="text-xs font-medium" style={{ color: 'var(--admin-text-mute)' }}>
              pontos
            </span>
          </div>
        </div>

        {/* Pontos por avaliação no Google */}
        <button
          type="button"
          onClick={() => onNavigateToNegocio?.()}
          className="admin-card p-4 w-full flex items-center justify-between gap-3 text-left transition-transform hover:scale-[1.005] active:scale-[0.998]"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                Pontos por avaliação no Google
              </p>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                style={{
                  background:
                    pointsForReview > 0
                      ? 'color-mix(in srgb, var(--admin-success) 14%, transparent)'
                      : 'var(--admin-input-bg)',
                  color:
                    pointsForReview > 0 ? 'var(--admin-success)' : 'var(--admin-text-mute)',
                  border:
                    pointsForReview > 0
                      ? '1px solid color-mix(in srgb, var(--admin-success) 28%, transparent)'
                      : '1px solid var(--admin-border)',
                }}
              >
                {pointsForReview > 0 ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--admin-text-mute)' }}>
              {pointsForReview > 0
                ? `${pointsForReview} pontos por avaliação confirmada`
                : 'Configure no card de Negócio → Google Reviews'}
            </p>
          </div>
          <span
            className="text-xs font-semibold flex items-center gap-1 flex-shrink-0"
            style={{ color: 'var(--admin-accent)' }}
          >
            Configurar <IconExternalLink size={12} />
          </span>
        </button>

        {/* Modo de pontos */}
        <div className="admin-card p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
              Modo de pontuação
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
              Saldo único do estabelecimento ou separado por profissional.
            </p>
          </div>
          <div
            className="flex rounded-xl p-1"
            style={{
              background: 'var(--admin-input-bg)',
              border: '1px solid var(--admin-border)',
            }}
          >
            {(
              [
                { id: 'business' as const, label: 'Estabelecimento', desc: 'Um saldo só' },
                { id: 'professional' as const, label: 'Profissional', desc: 'Por atendente' },
              ]
            ).map((opt) => {
              const active = pointsMode === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    if (opt.id === pointsMode || savingMode) return
                    setConfirmModeChange(opt.id)
                  }}
                  disabled={savingMode}
                  className="flex-1 py-2 px-2 text-sm rounded-lg transition-colors disabled:opacity-60"
                  style={{
                    background: active
                      ? 'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)'
                      : 'transparent',
                    color: active ? '#fff' : 'var(--admin-text-mute)',
                    boxShadow: active
                      ? '0 4px 12px -4px color-mix(in srgb, var(--admin-accent) 50%, transparent)'
                      : 'none',
                  }}
                >
                  <span className="block font-semibold text-[12px]">{opt.label}</span>
                  <span className="block text-[10px] mt-0.5 opacity-85">{opt.desc}</span>
                </button>
              )
            })}
          </div>
          {pointsMode === 'professional' && (
            <p
              className="text-[11px] leading-relaxed rounded-lg px-3 py-2"
              style={{
                background: 'var(--admin-accent-bg)',
                color: 'var(--admin-text-2)',
                border: '1px solid var(--admin-accent-border)',
              }}
            >
              Cada cliente vê o saldo separado por atendente. Indicação vai pra quem atendeu;
              avaliação Google vai pro último profissional.
            </p>
          )}
        </div>
      </section>

      {/* 5. RANKING */}
      {customersWithPoints.length > 0 && (
        <section>
          <SectionHeader label="Ranking de clientes" icon={<IconStar size={14} />} />
          <div className="space-y-2">
            {topCustomers.map((customer, index) => {
              const isPodium = index < 3
              const podiumColor =
                index === 0 ? '#F59E0B' : index === 1 ? '#94A3B8' : '#CD7F32'
              return (
                <div
                  key={customer.id}
                  className="admin-card px-4 py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-6 flex-shrink-0 text-center"
                      style={{
                        color: isPodium ? podiumColor : 'var(--admin-text-faded)',
                      }}
                    >
                      {isPodium ? (
                        <span className="inline-flex">
                          <IconStar size={16} />
                        </span>
                      ) : (
                        <span className="text-xs font-bold tabular-nums">{index + 1}º</span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm font-semibold truncate"
                        style={{ color: 'var(--admin-text)' }}
                      >
                        {customer.name}
                      </p>
                      <p
                        className="text-[11px] truncate"
                        style={{ color: 'var(--admin-text-faded)' }}
                      >
                        {customer.phone}
                      </p>
                    </div>
                  </div>
                  <p
                    className="text-sm font-bold tabular-nums flex-shrink-0"
                    style={{ color: 'var(--admin-warn)' }}
                  >
                    {customer.total_points} pts
                  </p>
                </div>
              )
            })}
          </div>
          {customersWithPoints.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllRanking((s) => !s)}
              className="mt-2 w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              style={{
                background: 'var(--admin-input-bg)',
                color: 'var(--admin-text-mute)',
                border: '1px solid var(--admin-border)',
              }}
            >
              {showAllRanking
                ? 'Mostrar só os 5 primeiros'
                : `Ver todos (${customersWithPoints.length})`}
              <span
                className="transition-transform"
                style={{ transform: showAllRanking ? 'rotate(180deg)' : undefined }}
              >
                <IconChevronDown size={12} />
              </span>
            </button>
          )}
        </section>
      )}

      {/* 6. COMO FUNCIONA — colapsado */}
      <section>
        <button
          type="button"
          onClick={() => setShowHelp((s) => !s)}
          className="w-full admin-card px-4 py-3 flex items-center justify-between text-left transition-colors"
          aria-expanded={showHelp}
        >
          <span
            className="text-sm font-semibold flex items-center gap-2"
            style={{ color: 'var(--admin-text)' }}
          >
            <IconInfo size={14} style={{ color: 'var(--admin-accent)' }} />
            Como funciona o programa
          </span>
          <span
            className="transition-transform"
            style={{
              color: 'var(--admin-text-mute)',
              transform: showHelp ? 'rotate(180deg)' : undefined,
            }}
          >
            <IconChevronDown size={14} />
          </span>
        </button>
        {showHelp && (
          <div className="admin-card-deep p-4 mt-2 space-y-4">
            <p
              className="text-xs leading-relaxed"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              Use isso no atendimento pra incentivar indicação e avaliação no Google. Os pontos só
              entram depois que <strong>você confirma</strong> o agendamento.
            </p>
            {[
              {
                n: 1,
                title: 'Pontos por atendimento',
                body: 'Cada serviço tem um valor em pontos (configura em Serviços). Quando confirma o agendamento, o cliente ganha a soma.',
              },
              {
                n: 2,
                title: 'Pontos por indicação',
                body: 'Cada cliente tem um link próprio. Quando alguém novo agenda por esse link e você confirma, o indicador ganha pontos. Uma vez por indicado.',
              },
              {
                n: 3,
                title: 'Pontos por avaliação no Google',
                body: 'Cliente avalia, pede os pontos, o pedido cai aqui em cima. Você aprova se viu a review. Uma vez por cliente.',
              },
              {
                n: 4,
                title: 'Trocar por recompensas',
                body: 'Configure aqui em cima quais recompensas o cliente pode trocar (corte grátis, desconto, produto). Você define nome e custo.',
              },
            ].map((item) => (
              <div key={item.n} className="flex gap-3">
                <div
                  className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                  style={{
                    background: 'var(--admin-accent-bg)',
                    color: 'var(--admin-accent)',
                  }}
                >
                  {item.n}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                    {item.title}
                  </p>
                  <p
                    className="text-[11px] leading-relaxed mt-0.5"
                    style={{ color: 'var(--admin-text-mute)' }}
                  >
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
            <div
              className="rounded-xl p-3"
              style={{
                background: 'var(--admin-input-bg)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
                Dica pro atendimento
              </p>
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: 'var(--admin-text-mute)' }}
              >
                Fale na hora:{' '}
                <em>
                  &ldquo;Tu pode ganhar pontos avaliando a gente no Google e indicando amigo pelo
                  link da agenda. Troca por corte grátis depois.&rdquo;
                </em>{' '}
                Cliente que conhece o programa indica mais.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* MODAIS */}
      <ConfirmActionModal
        open={!!confirmDelete}
        title={`Remover ${confirmDelete?.name || 'recompensa'}?`}
        message="Os clientes que tinham essa recompensa em vista vão deixar de ver. Pontos já acumulados continuam intactos. Essa ação não pode ser desfeita."
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

      <ConfirmActionModal
        open={!!confirmModeChange}
        title={
          confirmModeChange === 'professional'
            ? 'Mudar para saldo por profissional?'
            : 'Mudar para saldo único?'
        }
        message={
          confirmModeChange === 'professional'
            ? 'A partir de agora, cada cliente vê o saldo separado por atendente. O total acumulado continua válido — a mudança vale daqui pra frente.'
            : 'A partir de agora, todos os pontos do cliente entram num único saldo do estabelecimento. O total acumulado continua válido.'
        }
        confirmLabel="Sim, mudar"
        cancelLabel="Voltar"
        tone="warn"
        loading={savingMode}
        onConfirm={() => confirmModeChange && applyModeChange(confirmModeChange)}
        onClose={() => setConfirmModeChange(null)}
      />
    </div>
  )
}

// =============================================================================
// Card de recompensa (com modo edição inline)
// =============================================================================
function RewardCard({
  reward,
  isEditing,
  editForm,
  setEditForm,
  loadingId,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onToggle,
  onAskDelete,
}: {
  reward: Reward
  isEditing: boolean
  editForm: RewardForm
  setEditForm: (f: RewardForm) => void
  loadingId: string | null
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onToggle: () => void
  onAskDelete: () => void
}) {
  const isLoading = loadingId === reward.id

  if (isEditing) {
    return (
      <div className="admin-card-deep overflow-hidden p-4 space-y-3">
        <input
          type="text"
          value={editForm.name}
          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          className="admin-input w-full px-3 py-2.5 text-sm"
          placeholder="Nome"
        />
        <input
          type="text"
          value={editForm.description}
          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          className="admin-input w-full px-3 py-2.5 text-sm"
          placeholder="Descrição (opcional)"
        />
        <div>
          <label className="admin-label">Pontos necessários</label>
          <input
            type="number"
            value={editForm.points_required}
            onChange={(e) => setEditForm({ ...editForm, points_required: e.target.value })}
            min="1"
            className="admin-input w-full px-3 py-2.5 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSaveEdit}
            disabled={isLoading || !editForm.name.trim() || !editForm.points_required}
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
      label: reward.active ? 'Ocultar' : 'Mostrar',
      icon: reward.active ? <IconEyeOff size={15} /> : <IconEye size={15} />,
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
      style={!reward.active ? { opacity: 0.65 } : undefined}
    >
      <span
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: reward.active
            ? 'color-mix(in srgb, var(--admin-warn) 18%, transparent)'
            : 'var(--admin-input-bg)',
          color: reward.active ? 'var(--admin-warn)' : 'var(--admin-text-faded)',
          border: reward.active
            ? '1px solid color-mix(in srgb, var(--admin-warn) 30%, transparent)'
            : '1px solid var(--admin-border)',
        }}
      >
        <IconGift size={16} />
      </span>
      <div className="flex-1 min-w-0">
        <p
          className="font-semibold text-sm truncate"
          style={{ color: reward.active ? 'var(--admin-text)' : 'var(--admin-text-mute)' }}
        >
          {reward.name}
        </p>
        <p
          className="text-[11px] mt-0.5 flex items-center gap-1.5 flex-wrap"
          style={{ color: 'var(--admin-text-faded)' }}
        >
          <span
            className="font-bold tabular-nums"
            style={{ color: 'var(--admin-warn)' }}
          >
            {reward.points_required.toLocaleString('pt-BR')} pts
          </span>
          {!reward.active && (
            <>
              <span aria-hidden>·</span>
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{
                  background: 'color-mix(in srgb, var(--admin-warn) 16%, transparent)',
                  color: 'var(--admin-warn)',
                }}
              >
                Oculto
              </span>
            </>
          )}
        </p>
        {reward.description && (
          <p
            className="text-[11px] mt-1 line-clamp-2 leading-snug"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            {reward.description}
          </p>
        )}
      </div>
      <MoreActionsMenu actions={actions} />
    </div>
  )
}

// =============================================================================
// Header de seção
// =============================================================================
function SectionHeader({
  label,
  badge,
  urgent,
  icon,
}: {
  label: string
  badge?: number
  urgent?: boolean
  icon?: React.ReactNode
}) {
  return (
    <h2
      className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2"
      style={{ color: urgent ? 'var(--admin-warn)' : 'var(--admin-text-mute)' }}
    >
      {icon && (
        <span
          style={{ color: urgent ? 'var(--admin-warn)' : 'var(--admin-text-faded)' }}
        >
          {icon}
        </span>
      )}
      {label}
      {badge !== undefined && badge > 0 && (
        <span
          className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold"
          style={{
            background: urgent ? 'var(--admin-warn)' : 'var(--admin-accent)',
            color: '#fff',
          }}
        >
          {badge}
        </span>
      )}
    </h2>
  )
}

// =============================================================================
// KPI tile
// =============================================================================
function Kpi({
  icon,
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  tone?: 'neutral' | 'accent'
}) {
  return (
    <div className="admin-card p-2.5">
      <div
        className="flex items-center gap-1 mb-0.5"
        style={{
          color: tone === 'accent' ? 'var(--admin-accent)' : 'var(--admin-text-faded)',
        }}
      >
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-wider truncate">{label}</p>
      </div>
      <p
        className="text-sm font-bold leading-tight tabular-nums truncate"
        style={{
          color: tone === 'accent' ? 'var(--admin-accent)' : 'var(--admin-text)',
        }}
      >
        {value}
      </p>
      <p
        className="text-[10px] mt-1 truncate"
        style={{ color: 'var(--admin-text-faded)' }}
      >
        {sub}
      </p>
    </div>
  )
}
