'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Reward, Customer, Service } from '@/lib/types'
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
import PunicaoNoShowCard from '@/components/admin/PunicaoNoShowCard'

type ReviewClaim = {
  id: string
  customer_name: string | null
  customer_phone: string
  google_review_name: string | null
  requested_at: string
}

type Props = {
  businessId: string
  /** Recompensas — controlled pelo parent (ConfiguracoesTabs) pra
   *  sobreviver ao desmonte ao trocar de aba. */
  rewards: Reward[]
  onRewardsChange: (rewards: Reward[]) => void
  initialCustomers: Customer[]
  /** Serviços do business — usado pra calcular ticket médio e sugerir
   *  pontos de recompensa, mostrar visão geral por serviço, etc. */
  initialServices: Service[]
  /** Categoria do business pra sugestões de recompensa contextualizadas */
  businessCategory: string | null
  /** Pontos de indicação — controlled pelo parent. Sem isso, FidelidadeTab
   *  remontava com valor antigo do SSR ao trocar de aba (mesmo bug das
   *  recompensas). */
  referralPoints: number
  onReferralPointsChange: (value: number) => void
  /** Bônus de pontualidade — idem (controlled). */
  punctualityPoints: number
  onPunctualityPointsChange: (value: number) => void
  pointsForReview: number
  pointsMode: 'business' | 'professional'
  onNavigateToNegocio?: () => void
  // Punição por no-show (v45 · 14/05/2026)
  initialNoShowEnabled: boolean
  initialNoShowMode: 'proportional' | 'fixed'
  initialNoShowFixedPoints: number
  // Toggle global do programa (v72 · 25/05/2026)
  // Default false em negócios novos · backfill marca true em quem já usa
  initialLoyaltyEnabled: boolean
}

/**
 * Sugestões de recompensa por categoria. Pra barbearia, "Manicure
 * grátis" como sugestão é absurdo. Mesmo padrão das sugestões de
 * Serviços (ServicosTab).
 */
const REWARD_SUGGESTIONS_BY_CATEGORY: Record<string, string[]> = {
  'Barbearia':            ['Corte grátis', 'Barba grátis', 'Corte + Barba grátis', '20% off no próximo', 'Sobrancelha grátis'],
  'Salão de beleza':      ['Escova grátis', 'Corte grátis', '20% off', 'Hidratação grátis', 'Manicure grátis'],
  'Estúdio de tatuagem':  ['Sessão de retoque grátis', 'Piercing grátis', '15% off na próxima', 'Tatuagem pequena grátis', 'Cuidado pós-tattoo'],
  'Clínica estética':     ['Limpeza de pele grátis', 'Drenagem grátis', '20% off em procedimento', 'Massagem grátis', 'Brinde de skincare'],
  'Nail designer':        ['Esmaltação grátis', 'Nail art grátis', '20% off no próximo', 'Manutenção grátis', 'Spa das mãos'],
  'Manicure':             ['Mão grátis', 'Pé grátis', '20% off no spa', 'Esmaltação em gel grátis', 'Mão e pé grátis'],
  'Psicólogo / Terapeuta': ['Sessão grátis', '20% off no pacote', 'Avaliação grátis', 'Sessão online grátis', 'Sessão de bonus'],
  'Personal trainer':     ['Sessão grátis', 'Avaliação física grátis', '20% off no pacote', 'Treino online grátis', '4 sessões pelo preço de 3'],
}

const DEFAULT_REWARD_SUGGESTIONS = [
  'Corte grátis',
  '10% off',
  'Limpeza grátis',
  'Sobrancelha grátis',
  'Manicure grátis',
]

function getRewardSuggestions(category: string | null): string[] {
  if (!category) return DEFAULT_REWARD_SUGGESTIONS
  return REWARD_SUGGESTIONS_BY_CATEGORY[category] ?? DEFAULT_REWARD_SUGGESTIONS
}

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
  rewards,
  onRewardsChange,
  initialCustomers,
  initialServices,
  businessCategory,
  referralPoints: referralPointsProp,
  onReferralPointsChange,
  punctualityPoints: punctualityPointsProp,
  onPunctualityPointsChange,
  pointsForReview,
  pointsMode: initialPointsMode,
  onNavigateToNegocio,
  initialNoShowEnabled,
  initialNoShowMode,
  initialNoShowFixedPoints,
  initialLoyaltyEnabled,
}: Props) {
  const supabase = createClient()

  // Toggle global do programa (v72) — controla visibilidade das opções
  // de pontos em toda a UI: chip Pontos no split, botão "Trocar
  // recompensa" na comanda, saldo do cliente, etc.
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(initialLoyaltyEnabled)
  const [savingLoyaltyToggle, setSavingLoyaltyToggle] = useState(false)
  const [confirmToggleOff, setConfirmToggleOff] = useState(false)

  async function toggleLoyalty(nextEnabled: boolean) {
    setSavingLoyaltyToggle(true)
    const prev = loyaltyEnabled
    setLoyaltyEnabled(nextEnabled)
    const { error } = await supabase
      .from('businesses')
      .update({ loyalty_enabled: nextEnabled })
      .eq('id', businessId)
    if (error) {
      setLoyaltyEnabled(prev)
    }
    setSavingLoyaltyToggle(false)
    setConfirmToggleOff(false)
  }

  // rewards e setRewards agora vem do parent (controlled) — sobrevive
  // ao desmonte do componente quando troca de aba
  const setRewards = onRewardsChange
  const [customers] = useState(initialCustomers)

  // Sugestões dinâmicas por categoria do business
  const rewardSuggestions = useMemo(
    () => getRewardSuggestions(businessCategory),
    [businessCategory]
  )

  // Ticket médio em pontos (de services com points > 0).
  // Usado pra sugerir valor inicial nas recompensas.
  const ticketMedioPontos = useMemo(() => {
    const withPoints = initialServices.filter((s) => (s.points ?? 0) > 0)
    if (withPoints.length === 0) return 0
    const sum = withPoints.reduce((acc, s) => acc + (s.points ?? 0), 0)
    return Math.round(sum / withPoints.length)
  }, [initialServices])
  const [pointsMode, setPointsMode] = useState<'business' | 'professional'>(initialPointsMode)
  // Strings de input — sincronizadas com props controladas pelo parent.
  // Quando admin digita, atualiza string local; debounce dispara save +
  // notifica parent. Ao trocar de aba e voltar, props vêm corretas.
  const [referralPoints, setReferralPoints] = useState(String(referralPointsProp))
  const [referralSavedAt, setReferralSavedAt] = useState<number | null>(null)
  const [referralSaving, setReferralSaving] = useState(false)

  const [punctualityPoints, setPunctualityPoints] = useState(String(punctualityPointsProp))
  const [punctualitySavedAt, setPunctualitySavedAt] = useState<number | null>(null)
  const [punctualitySaving, setPunctualitySaving] = useState(false)

  // Sincroniza string local quando prop muda (ex: parent recebeu novo
  // valor via re-fetch ou troca de aba)
  useEffect(() => {
    setReferralPoints(String(referralPointsProp))
  }, [referralPointsProp])
  useEffect(() => {
    setPunctualityPoints(String(punctualityPointsProp))
  }, [punctualityPointsProp])

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
  const [showHelpDica, setShowHelpDica] = useState(false)
  const [showAllRanking, setShowAllRanking] = useState(false)

  const addFormRef = useRef<HTMLDivElement | null>(null)
  const referralSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const punctualitySavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Refs pra debounce de auto-save + flush no unmount
  const referralDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const punctualityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Refs pra rastrear o valor latest sem causar re-render
  const referralLatestRef = useRef(referralPoints)
  const punctualityLatestRef = useRef(punctualityPoints)
  // Refs pro ultimo valor SALVO (compara pra evitar saves desnecessarios)
  const referralLastSavedRef = useRef(referralPointsProp)
  const punctualityLastSavedRef = useRef(punctualityPointsProp)

  useEffect(() => {
    referralLatestRef.current = referralPoints
  }, [referralPoints])
  useEffect(() => {
    punctualityLatestRef.current = punctualityPoints
  }, [punctualityPoints])

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
      if (punctualitySavedTimerRef.current) clearTimeout(punctualitySavedTimerRef.current)
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

  // ---- Pontos por indicação ----
  // Save isolado — usado por onChange (debounce), onBlur (flush imediato),
  // e cleanup do unmount (quando troca de aba sem dar blur).
  async function saveReferralPoints(value: number) {
    if (value === referralLastSavedRef.current) return
    setReferralSaving(true)
    const { error } = await supabase
      .from('businesses')
      .update({ points_for_referral: value })
      .eq('id', businessId)
    setReferralSaving(false)
    if (!error) {
      referralLastSavedRef.current = value
      // Notifica parent — sem isto, ao trocar de aba e voltar, prop
      // ainda mostraria valor antigo do SSR
      onReferralPointsChange(value)
      setReferralSavedAt(Date.now())
      if (referralSavedTimerRef.current) clearTimeout(referralSavedTimerRef.current)
      referralSavedTimerRef.current = setTimeout(() => setReferralSavedAt(null), 2500)
    }
  }

  function handleReferralChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value
    setReferralPoints(newValue)
    if (referralDebounceRef.current) clearTimeout(referralDebounceRef.current)
    referralDebounceRef.current = setTimeout(() => {
      saveReferralPoints(parseInt(newValue) || 0)
    }, 800)
  }

  function handleReferralBlur() {
    if (referralDebounceRef.current) clearTimeout(referralDebounceRef.current)
    saveReferralPoints(parseInt(referralPoints) || 0)
  }

  // ---- Bônus de pontualidade ----
  async function savePunctualityPoints(value: number) {
    if (value === punctualityLastSavedRef.current) return
    setPunctualitySaving(true)
    const { error } = await supabase
      .from('businesses')
      .update({ punctuality_bonus_points: value })
      .eq('id', businessId)
    setPunctualitySaving(false)
    if (!error) {
      punctualityLastSavedRef.current = value
      onPunctualityPointsChange(value)
      setPunctualitySavedAt(Date.now())
      if (punctualitySavedTimerRef.current) clearTimeout(punctualitySavedTimerRef.current)
      punctualitySavedTimerRef.current = setTimeout(() => setPunctualitySavedAt(null), 2500)
    }
  }

  function handlePunctualityChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value
    setPunctualityPoints(newValue)
    if (punctualityDebounceRef.current) clearTimeout(punctualityDebounceRef.current)
    punctualityDebounceRef.current = setTimeout(() => {
      savePunctualityPoints(parseInt(newValue) || 0)
    }, 800)
  }

  function handlePunctualityBlur() {
    if (punctualityDebounceRef.current) clearTimeout(punctualityDebounceRef.current)
    savePunctualityPoints(parseInt(punctualityPoints) || 0)
  }

  // Flush no unmount — quando usuario troca de aba sem dar blur,
  // o componente desmonta e este cleanup forca o save de qualquer
  // mudanca pendente. Resolve o bug "alteracoes somem ao trocar de aba".
  useEffect(() => {
    return () => {
      // Cancela debounces pendentes
      if (referralDebounceRef.current) clearTimeout(referralDebounceRef.current)
      if (punctualityDebounceRef.current) clearTimeout(punctualityDebounceRef.current)

      // Flush sincrono via fire-and-forget — promise nao pode ser awaited
      // em cleanup, mas Supabase client envia request mesmo sem await
      const refValue = parseInt(referralLatestRef.current) || 0
      if (refValue !== referralLastSavedRef.current) {
        supabase
          .from('businesses')
          .update({ points_for_referral: refValue })
          .eq('id', businessId)
          .then(() => undefined)
      }
      const punctValue = parseInt(punctualityLatestRef.current) || 0
      if (punctValue !== punctualityLastSavedRef.current) {
        supabase
          .from('businesses')
          .update({ punctuality_bonus_points: punctValue })
          .eq('id', businessId)
          .then(() => undefined)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Recompensas ----
  function scrollToAddForm(prefillName?: string) {
    if (prefillName) {
      // Sugere pontos junto do nome — admin vê valor já pronto e
      // ajusta se quiser. Sem isso, sugestão preenche metade do
      // form e quem é leigo trava em "quanto vale isso?".
      // Fórmula: nome com "grátis" pede ~10× ticket médio (resgate
      // mais raro), com "off" pede ~5× (mais frequente). Sem ticket
      // médio (config nova), cai em fallback fixo.
      const nameLower = prefillName.toLowerCase()
      const isFree = nameLower.includes('grátis') || nameLower.includes('gratis')
      const isPercent = nameLower.includes('%') || nameLower.includes('off')
      let suggested: number
      if (ticketMedioPontos > 0) {
        suggested = isFree
          ? ticketMedioPontos * 10
          : isPercent
          ? ticketMedioPontos * 5
          : ticketMedioPontos * 8
      } else {
        suggested = isFree ? 100 : isPercent ? 50 : 80
      }
      // Arredonda pra cima em múltiplo de 10 — número redondo
      // soa intencional, "97 pts" parece bug.
      const rounded = Math.ceil(suggested / 10) * 10
      setForm({ ...emptyRewardForm, name: prefillName, points_required: String(rounded) })
    }
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
      {/* 0. TOGGLE GLOBAL — controla se o programa de fidelidade
          aparece nas demais telas (comanda, split, cliente). Quando
          off, todo o resto fica oculto. */}
      <section>
        <div
          className="rounded-2xl p-4 sm:p-5 flex items-center gap-4"
          style={{
            background: loyaltyEnabled
              ? 'linear-gradient(135deg, color-mix(in srgb, var(--admin-warn) 18%, transparent) 0%, var(--admin-surface) 70%)'
              : 'var(--admin-surface)',
            border: `1px solid ${
              loyaltyEnabled
                ? 'color-mix(in srgb, var(--admin-warn) 32%, transparent)'
                : 'var(--admin-border)'
            }`,
          }}
        >
          <span
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: loyaltyEnabled
                ? 'color-mix(in srgb, var(--admin-warn) 22%, transparent)'
                : 'var(--admin-input-bg)',
              color: loyaltyEnabled ? 'var(--admin-warn)' : 'var(--admin-text-faded)',
              border: `1px solid ${
                loyaltyEnabled
                  ? 'color-mix(in srgb, var(--admin-warn) 35%, transparent)'
                  : 'var(--admin-border)'
              }`,
            }}
          >
            <IconStar size={20} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
                Programa de fidelidade
              </p>
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{
                  background: loyaltyEnabled
                    ? 'color-mix(in srgb, var(--admin-success) 18%, transparent)'
                    : 'var(--admin-input-bg)',
                  color: loyaltyEnabled
                    ? 'var(--admin-success)'
                    : 'var(--admin-text-faded)',
                  border: `1px solid ${
                    loyaltyEnabled
                      ? 'color-mix(in srgb, var(--admin-success) 32%, transparent)'
                      : 'var(--admin-border)'
                  }`,
                }}
              >
                {loyaltyEnabled ? 'Ativo' : 'Desativado'}
              </span>
            </div>
            <p
              className="text-[12px] mt-1 leading-relaxed"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              {loyaltyEnabled
                ? 'Clientes acumulam pontos e podem trocar por recompensas. Cliente vê o saldo na comanda · você pode aplicar resgate na hora.'
                : 'Ative pra liberar saldo de pontos do cliente, resgate de recompensas na comanda e bônus por avaliação · indicação · pontualidade.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (savingLoyaltyToggle) return
              if (loyaltyEnabled) {
                setConfirmToggleOff(true)
              } else {
                toggleLoyalty(true)
              }
            }}
            disabled={savingLoyaltyToggle}
            role="switch"
            aria-checked={loyaltyEnabled}
            aria-label={loyaltyEnabled ? 'Desativar programa de fidelidade' : 'Ativar programa de fidelidade'}
            className="relative flex-shrink-0 rounded-full transition-colors disabled:opacity-60"
            style={{
              width: 52,
              height: 30,
              background: loyaltyEnabled
                ? 'linear-gradient(135deg, var(--admin-warn) 0%, color-mix(in srgb, var(--admin-warn) 70%, #000) 100%)'
                : 'var(--admin-input-bg)',
              border: `1px solid ${
                loyaltyEnabled
                  ? 'color-mix(in srgb, var(--admin-warn) 45%, transparent)'
                  : 'var(--admin-border)'
              }`,
              boxShadow: loyaltyEnabled
                ? '0 4px 12px -4px color-mix(in srgb, var(--admin-warn) 50%, transparent)'
                : 'inset 0 1px 2px rgba(0,0,0,0.08)',
            }}
          >
            <span
              className="absolute top-1/2 -translate-y-1/2 rounded-full bg-white transition-all"
              style={{
                width: 22,
                height: 22,
                left: loyaltyEnabled ? 26 : 4,
                boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
              }}
            />
          </button>
        </div>
      </section>

      {/* Quando desativado, mostra placeholder e esconde o resto */}
      {!loyaltyEnabled && (
        <section
          className="admin-card-deep p-6 text-center space-y-3"
        >
          <span
            className="inline-flex w-12 h-12 rounded-2xl items-center justify-center"
            style={{
              background: 'var(--admin-input-bg)',
              color: 'var(--admin-text-faded)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <IconGift size={20} />
          </span>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
              Programa desativado
            </p>
            <p
              className="text-[12px] mt-1 leading-relaxed max-w-md mx-auto"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              Suas configurações (recompensas · pontos por serviço · indicação)
              ficam guardadas. Ao reativar, tudo volta no mesmo lugar sem perder
              nada.
            </p>
          </div>
        </section>
      )}

      {/* Modal de confirmação ao desligar — evita clique acidental */}
      <ConfirmActionModal
        open={confirmToggleOff}
        title="Desativar programa de fidelidade?"
        message="Os clientes vão parar de acumular pontos e o botão de trocar recompensa some da comanda. Saldos e recompensas ficam guardados · você pode reativar depois sem perder nada."
        confirmLabel="Sim, desativar"
        cancelLabel="Manter ativo"
        tone="warn"
        loading={savingLoyaltyToggle}
        onConfirm={() => toggleLoyalty(false)}
        onClose={() => setConfirmToggleOff(false)}
      />

      {/* Restante da aba só aparece quando programa está ativo */}
      {loyaltyEnabled && (
        <>
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
        {/* Empty state — guia o admin quando ainda nao tem nenhum cliente
            com ponto (caso Olimpio acabou de cadastrar). Sem isso, KPIs
            zerados pareciam "feature quebrada". */}
        {customers.length === 0 && (
          <div
            className="rounded-xl px-3 py-2.5 mt-2 text-xs leading-relaxed"
            style={{
              background: 'var(--admin-accent-bg)',
              border: '1px solid var(--admin-accent-border)',
              color: 'var(--admin-text-2)',
            }}
          >
            <strong style={{ color: 'var(--admin-accent)' }}>Tudo zerado?</strong> Quando você
            confirmar o primeiro agendamento, o cliente entra na lista e os contadores começam a
            subir. Cadastre as recompensas agora pra estar pronto.
          </div>
        )}
      </section>

      {/* 2.5 VISÃO GERAL — pontos por serviço (linka pra aba Servicos) */}
      {initialServices.length > 0 && (
        <section>
          <SectionHeader label="Pontos por atendimento" icon={<IconStar size={14} />} />
          <div className="admin-card p-3">
            <p
              className="text-[11px] mb-2 leading-relaxed"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              Configurado por serviço. Cliente ganha esses pontos ao concluir o atendimento.
            </p>
            <div className="space-y-1.5">
              {initialServices
                .filter((s) => s.active)
                .slice(0, 6)
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg"
                    style={{ background: 'var(--admin-input-bg)' }}
                  >
                    <span
                      className="text-xs font-medium truncate"
                      style={{ color: 'var(--admin-text)' }}
                    >
                      {s.name}
                    </span>
                    <span
                      className="text-[11px] font-bold tabular-nums flex-shrink-0"
                      style={{
                        color:
                          (s.points ?? 0) > 0
                            ? 'var(--admin-warn, #FBBF24)'
                            : 'var(--admin-text-faded)',
                      }}
                    >
                      {(s.points ?? 0) > 0 ? `${s.points} pts` : '— sem pontos'}
                    </span>
                  </div>
                ))}
              {initialServices.filter((s) => s.active).length > 6 && (
                <p
                  className="text-[11px] text-center mt-1"
                  style={{ color: 'var(--admin-text-faded)' }}
                >
                  + {initialServices.filter((s) => s.active).length - 6} outros serviços
                </p>
              )}
            </div>
            {initialServices.some((s) => s.active && (s.points ?? 0) === 0) && (
              <p
                className="text-[11px] mt-2 leading-relaxed"
                style={{ color: 'var(--admin-warn, #FBBF24)' }}
              >
                Tem serviços sem pontos. Cliente que faz esses não acumula nada — vai em{' '}
                <strong>Serviços</strong> e configure.
              </p>
            )}
          </div>
        </section>
      )}

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
              {rewardSuggestions.map((name) => (
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
              placeholder={
                ticketMedioPontos > 0
                  ? `ex: ${ticketMedioPontos * 10} (~10 atendimentos)`
                  : 'ex: 500'
              }
              min="1"
              className="admin-input w-full px-3 py-2.5 text-sm"
            />
            {ticketMedioPontos > 0 && (
              <p
                className="text-[11px] mt-1.5 leading-relaxed"
                style={{ color: 'var(--admin-text-mute)' }}
              >
                Seu ticket médio é{' '}
                <strong style={{ color: 'var(--admin-text-2)' }}>
                  {ticketMedioPontos} pts/atendimento
                </strong>
                . Sugestão: <strong>{ticketMedioPontos * 5} pts</strong> (5 atendimentos),{' '}
                <strong>{ticketMedioPontos * 10} pts</strong> (10) ou{' '}
                <strong>{ticketMedioPontos * 20} pts</strong> (20) — quanto maior, mais o cliente
                volta pra acumular.
              </p>
            )}
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

        {/* Pontos por indicação — auto-save com debounce */}
        <div className="admin-card p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
              Pontos por indicação
            </p>
            <SaveStatus saving={referralSaving} savedAt={referralSavedAt} />
          </div>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
            Quando um amigo indicado faz o primeiro agendamento e você confirma.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={referralPoints}
              onChange={handleReferralChange}
              onBlur={handleReferralBlur}
              placeholder="ex: 200"
              min="0"
              className="admin-input flex-1 px-3 py-2 text-sm"
            />
            <span className="text-xs font-medium" style={{ color: 'var(--admin-text-mute)' }}>
              pontos
            </span>
          </div>
          {/* Hint contextualizado pelo ticket medio do negocio */}
          {ticketMedioPontos > 0 && (
            <p
              className="text-[11px] leading-relaxed"
              style={{ color: 'var(--admin-text-faded)' }}
            >
              <strong style={{ color: 'var(--admin-text-mute)' }}>Dica:</strong> dar entre{' '}
              <strong>{ticketMedioPontos * 2}</strong> e{' '}
              <strong>{ticketMedioPontos * 4}</strong> pts (2-4 atendimentos do ticket médio) faz
              o cliente sentir que vale a pena indicar. Muito baixo não motiva, muito alto vira
              promessa cara.
            </p>
          )}
        </div>

        {/* Bônus de pontualidade — auto-save com debounce */}
        <div className="admin-card p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
              Bônus de pontualidade
            </p>
            <SaveStatus saving={punctualitySaving} savedAt={punctualitySavedAt} />
          </div>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
            Pts extras pra cliente que chega no horário. O profissional decide na hora — clica
            <strong> +Pontualidade</strong> ao lado do botão Atendi.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={punctualityPoints}
              onChange={handlePunctualityChange}
              onBlur={handlePunctualityBlur}
              placeholder="ex: 10"
              min="0"
              className="admin-input flex-1 px-3 py-2 text-sm"
            />
            <span className="text-xs font-medium" style={{ color: 'var(--admin-text-mute)' }}>
              pontos
            </span>
          </div>
          {ticketMedioPontos > 0 && (
            <p
              className="text-[11px] leading-relaxed"
              style={{ color: 'var(--admin-text-faded)' }}
            >
              <strong style={{ color: 'var(--admin-text-mute)' }}>Dica:</strong> ~10-20% do ticket
              médio ({Math.round(ticketMedioPontos * 0.1)}-{Math.round(ticketMedioPontos * 0.2)}{' '}
              pts) é suficiente pra reconhecer sem inflar — combate cancelamento e atraso de
              forma sutil.
            </p>
          )}
        </div>

        {/* Punição por não-comparecimento (v45 · 14/05/2026) */}
        <PunicaoNoShowCard
          businessId={businessId}
          initialEnabled={initialNoShowEnabled}
          initialMode={initialNoShowMode}
          initialFixedPoints={initialNoShowFixedPoints}
        />

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
          {/* Preview do impacto — mostra exemplo concreto com nome ficticio
              pra admin entender o que cada modo significa antes de mudar. */}
          <div
            className="text-[11px] leading-relaxed rounded-lg px-3 py-2.5 space-y-1.5"
            style={{
              background: 'var(--admin-accent-bg)',
              color: 'var(--admin-text-2)',
              border: '1px solid var(--admin-accent-border)',
            }}
          >
            {pointsMode === 'business' ? (
              <>
                <p>
                  <strong style={{ color: 'var(--admin-accent)' }}>Exemplo:</strong> João tem 100
                  pontos no seu negócio. Ele pode trocar com qualquer profissional disponível.
                </p>
                <p style={{ color: 'var(--admin-text-mute)' }}>
                  Indicação e avaliação Google contam pro saldo único do cliente.
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong style={{ color: 'var(--admin-accent)' }}>Exemplo:</strong> João tem 100
                  pts com Eduardo, mas <strong>0 pts</strong> com Pedro. Saldo separado por
                  atendente.
                </p>
                <p style={{ color: 'var(--admin-text-mute)' }}>
                  Indicação vai pra quem atendeu; avaliação Google vai pro último profissional.
                </p>
              </>
            )}
          </div>
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
                title: 'Bônus de pontualidade',
                body: 'Pts extras pra cliente que chega no horário. Quando o cliente chega na hora, o profissional clica no botão +Pontualidade ao lado do botão Atendi (na agenda do dia). É uma decisão dele em cada atendimento — não automático. Bom pra combater atraso e cancelamento sem ser invasivo.',
              },
              {
                n: 4,
                title: 'Pontos por avaliação no Google',
                body: 'Cliente avalia, pede os pontos, o pedido cai aqui em cima. Você aprova se viu a review. Uma vez por cliente.',
              },
              {
                n: 5,
                title: 'Trocar por recompensas',
                body: 'Configure aqui em cima quais recompensas o cliente pode trocar (corte grátis, desconto, produto). Você define nome e custo. Cliente acumula pontos como quiser e troca pelo que prefere.',
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
            {/* Dica pro atendimento — colapsada por default pra economizar
                espaco. Admin abre se quiser ler script de fala. */}
            <button
              type="button"
              onClick={() => setShowHelpDica((s) => !s)}
              className="w-full rounded-xl p-3 text-left flex items-center justify-between gap-2 transition-colors"
              style={{
                background: 'var(--admin-input-bg)',
                border: '1px solid var(--admin-border)',
                color: 'var(--admin-text)',
              }}
              aria-expanded={showHelpDica}
            >
              <span className="text-xs font-semibold">
                {showHelpDica ? 'Dica pro atendimento' : 'Mostrar dica pro atendimento'}
              </span>
              <IconChevronDown
                size={14}
                style={{
                  color: 'var(--admin-text-mute)',
                  transform: showHelpDica ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 220ms ease',
                }}
              />
            </button>
            {showHelpDica && (
              <div
                className="rounded-xl p-3 -mt-1"
                style={{
                  background: 'var(--admin-input-bg)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                <p
                  className="text-[11px] leading-relaxed"
                  style={{ color: 'var(--admin-text-mute)' }}
                >
                  Fale na hora:{' '}
                  <em>
                    &ldquo;Tu pode ganhar pontos avaliando a gente no Google e indicando amigo
                    pelo link da agenda. Troca por corte grátis depois.&rdquo;
                  </em>{' '}
                  Cliente que conhece o programa indica mais.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

        </>
      )}

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

/**
 * Indicador de status de auto-save: "Salvando..." durante o request,
 * "✓ Salvo" por 2.5s depois. Quieto quando idle.
 * Sutil — sem botão, sem barra grande, só feedback claro.
 */
function SaveStatus({ saving, savedAt }: { saving: boolean; savedAt: number | null }) {
  if (saving) {
    return (
      <span
        className="text-[10px] font-bold flex items-center gap-1"
        style={{ color: 'var(--admin-text-mute)' }}
      >
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{
            background: 'var(--admin-text-mute)',
            animation: 'pulse 1.4s ease-in-out infinite',
          }}
        />
        Salvando...
      </span>
    )
  }
  if (savedAt) {
    return (
      <span
        className="text-[10px] font-bold flex items-center gap-1 transition-opacity"
        style={{ color: 'var(--admin-success, #16A34A)' }}
      >
        <IconCheck size={11} /> Salvo
      </span>
    )
  }
  return null
}
