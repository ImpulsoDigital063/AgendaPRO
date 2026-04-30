'use client'

import { useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/compress-image'
import type { Business, Service } from '@/lib/types'
import {
  IconCheck,
  IconChevronDown,
  IconExternalLink,
  IconPalette,
  IconClose,
} from '@/components/ui/Icon'
import StickyActionBar from '@/components/admin/StickyActionBar'

const PRESETS: { name: string; primary: string; secondary: string }[] = [
  // Originais
  { name: 'Azul', primary: '#3B82F6', secondary: '#06B6D4' },
  { name: 'Roxo', primary: '#8B5CF6', secondary: '#EC4899' },
  { name: 'Rosa', primary: '#EC4899', secondary: '#F472B6' },
  { name: 'Ciano', primary: '#06B6D4', secondary: '#3B82F6' },
  { name: 'Verde', primary: '#10B981', secondary: '#06B6D4' },
  { name: 'Laranja', primary: '#F97316', secondary: '#EAB308' },
  { name: 'Elegante', primary: '#0F172A', secondary: '#EAB308' },
  { name: 'Vermelho', primary: '#EF4444', secondary: '#F97316' },
  // Novos
  { name: 'Dourado', primary: '#D4A056', secondary: '#9C7A37' },
  { name: 'Marinho', primary: '#1E3A8A', secondary: '#0EA5E9' },
  { name: 'Pêssego', primary: '#FB7185', secondary: '#FDBA74' },
  { name: 'Floresta', primary: '#166534', secondary: '#10B981' },
  { name: 'Bordô', primary: '#9F1239', secondary: '#E11D48' },
  { name: 'Petróleo', primary: '#0F766E', secondary: '#06B6D4' },
  { name: 'Lavanda', primary: '#A78BFA', secondary: '#C4B5FD' },
  { name: 'Grafite', primary: '#374151', secondary: '#9CA3AF' },
]

/**
 * Presets recomendados por categoria — pra cada nicho, 2-3 presets
 * que combinam culturalmente. Não restringe escolha (todos continuam
 * disponíveis), apenas marca com badge "★ Indicada".
 */
const RECOMMENDED_BY_CATEGORY: Record<string, string[]> = {
  'Barbearia':            ['Marinho', 'Bordô', 'Petróleo', 'Grafite', 'Elegante'],
  'Salão de beleza':      ['Rosa', 'Pêssego', 'Lavanda', 'Roxo'],
  'Estúdio de tatuagem':  ['Grafite', 'Bordô', 'Elegante', 'Vermelho'],
  'Clínica estética':     ['Lavanda', 'Pêssego', 'Petróleo', 'Verde'],
  'Nail designer':        ['Rosa', 'Pêssego', 'Lavanda', 'Roxo'],
  'Manicure':             ['Rosa', 'Pêssego', 'Lavanda'],
  'Psicólogo / Terapeuta': ['Petróleo', 'Lavanda', 'Verde', 'Floresta'],
  'Personal trainer':     ['Vermelho', 'Laranja', 'Marinho', 'Floresta'],
}

function isRecommended(presetName: string, category: string | null | undefined): boolean {
  if (!category) return false
  return RECOMMENDED_BY_CATEGORY[category]?.includes(presetName) ?? false
}

const DEFAULT_PRIMARY = '#3B82F6'
const DEFAULT_SECONDARY = '#06B6D4'
const DEFAULT_MODE: 'dark' | 'light' = 'dark'

function snapshot(p: string, s: string, m: string, c: string | null | undefined) {
  return `${p}|${s}|${m}|${c ?? ''}`
}

type Props = {
  business: Business
  /** Serviços do business — usado pra preview real (em vez de mock fixo) */
  services?: Service[]
  /** Callback pra navegar pra aba Negócio (link de editar logo) */
  onNavigateToNegocio?: () => void
}

export default function AparenciaTab({ business, services = [], onNavigateToNegocio }: Props) {
  const initialPrimary = business.brand_primary || DEFAULT_PRIMARY
  const initialSecondary = business.brand_secondary || DEFAULT_SECONDARY
  const initialMode = (business.brand_mode || DEFAULT_MODE) as 'dark' | 'light'
  const initialCover = business.cover_url || null

  const [primary, setPrimary] = useState(initialPrimary)
  const [secondary, setSecondary] = useState(initialSecondary)
  const [mode, setMode] = useState<'dark' | 'light'>(initialMode)
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCover)
  const [savedSnapshot, setSavedSnapshot] = useState(
    snapshot(initialPrimary, initialSecondary, initialMode, initialCover),
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [coverError, setCoverError] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const coverFileInputRef = useRef<HTMLInputElement | null>(null)

  const isDirty = useMemo(
    () => snapshot(primary, secondary, mode, coverUrl) !== savedSnapshot,
    [primary, secondary, mode, coverUrl, savedSnapshot],
  )

  const isPreset = (p: (typeof PRESETS)[number]) =>
    p.primary.toLowerCase() === primary.toLowerCase() &&
    p.secondary.toLowerCase() === secondary.toLowerCase()
  const matchedPreset = PRESETS.find(isPreset)
  const isCustom = !matchedPreset

  async function save() {
    setSaving(true)
    setSaved(false)
    setError(undefined)
    const res = await fetch('/api/admin/branding', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        brand_primary: primary,
        brand_secondary: secondary,
        brand_mode: mode,
        cover_url: coverUrl,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setSavedSnapshot(snapshot(primary, secondary, mode, coverUrl))
      setSaved(true)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaved(false), 2200)
    } else {
      setError('Erro ao salvar. Tente novamente.')
    }
  }

  /**
   * Upload de banner — preset 'cover' do compressImage (max 1600px,
   * 400KB WebP). Sobe pro bucket business-covers com path
   * <business_id>/cover.<ext>. Atualiza state local; persistência no
   * banco só após o admin clicar Salvar (junto com cores).
   */
  async function handleUploadCover(file: File) {
    setCoverError(null)
    setUploadingCover(true)

    const result = await compressImage(file, 'cover')
    if (!result.ok) {
      setCoverError(result.reason)
      setUploadingCover(false)
      return
    }

    const optimized = result.file
    const ext = (optimized.name.split('.').pop() || 'webp').toLowerCase()
    const path = `${business.id}/cover.${ext}`

    const supabase = createClient()
    const { error: uploadError } = await supabase.storage
      .from('business-covers')
      .upload(path, optimized, {
        upsert: true,
        cacheControl: '3600',
        contentType: optimized.type,
      })

    if (uploadError) {
      setCoverError('Erro ao enviar capa: ' + uploadError.message)
      setUploadingCover(false)
      return
    }

    const { data: pub } = supabase.storage.from('business-covers').getPublicUrl(path)
    const publicUrl = `${pub.publicUrl}?v=${Date.now()}`
    setCoverUrl(publicUrl)
    setUploadingCover(false)
  }

  function handleRemoveCover() {
    setCoverUrl(null)
    setCoverError(null)
  }

  /** Resetar pra cores padrão (azul/ciano/dark) */
  function handleReset() {
    setPrimary(DEFAULT_PRIMARY)
    setSecondary(DEFAULT_SECONDARY)
    setMode(DEFAULT_MODE)
    setConfirmReset(false)
  }

  // Serviços reais pra preview — pega 2 ativos com preço definido
  const previewServices = useMemo(() => {
    const filtered = services
      .filter((s) => s.active && (s.price ?? 0) > 0)
      .slice(0, 2)
    if (filtered.length > 0) return filtered
    // Fallback se não tem serviços
    return [
      { id: 'mock1', name: 'Corte masculino', price: 50, duration_minutes: 30 } as Service,
      { id: 'mock2', name: 'Barba', price: 30, duration_minutes: 20 } as Service,
    ]
  }, [services])

  function formatPrice(price: number | null) {
    if (!price) return ''
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }
  function formatDuration(min: number) {
    if (min < 60) return `${min} min`
    const h = Math.floor(min / 60)
    const m = min % 60
    return m === 0 ? `${h}h` : `${h}h ${m}min`
  }

  const businessCategory = business.description ?? null

  const previewBg = mode === 'dark' ? '#050713' : '#F8FAFC'
  const previewCardBg = mode === 'dark' ? 'rgba(15,25,56,0.55)' : '#FFFFFF'
  const previewText = mode === 'dark' ? '#F8FAFC' : '#0F172A'
  const previewMuted = mode === 'dark' ? '#94A3B8' : '#64748B'
  const previewBorder = mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
  const gradient = `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`
  // ?preview=admin sinaliza pra /[slug]/page.tsx mostrar banner sticky
  // "← Voltar pra Aparência" no topo. Sem isso o admin ficava sem
  // caminho de volta no PWA standalone.
  const slugUrl = business.slug ? `/${business.slug}?preview=admin` : null

  return (
    <div className="space-y-4 pb-28 relative">
      {/* PREVIEW STICKY no topo — sempre visível */}
      <div
        className="sticky z-20"
        style={{ top: '8px' }}
      >
        <div
          className="admin-card p-3"
          style={{
            backdropFilter: 'blur(14px) saturate(140%)',
            WebkitBackdropFilter: 'blur(14px) saturate(140%)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <p
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'var(--admin-text-faded)' }}
            >
              Preview ao vivo
            </p>
            {isCustom && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                style={{
                  background: 'color-mix(in srgb, var(--admin-warn) 15%, transparent)',
                  color: 'var(--admin-warn)',
                }}
              >
                Personalizado
              </span>
            )}
          </div>
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: previewBg,
              border: `1px solid ${previewBorder}`,
            }}
          >
            {/* Cover — usa imagem se admin subiu, senão gradient da brand */}
            <div className="h-14 w-full relative" style={{ background: gradient }}>
              {coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt="Capa"
                  className="w-full h-full object-cover"
                  style={{ objectPosition: 'center 25%' }}
                />
              )}
            </div>
            {/* Header */}
            <div className="px-3 py-2.5 flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white flex-shrink-0 overflow-hidden"
                style={{
                  background: business.logo_url ? '#FFFFFF' : gradient,
                }}
              >
                {business.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={business.logo_url} alt={business.name} className="w-full h-full object-contain" />
                ) : (
                  business.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="font-bold text-xs truncate"
                  style={{ color: previewText }}
                >
                  {business.name}
                </p>
                <p
                  className="text-[9px]"
                  style={{ color: previewMuted }}
                >
                  Agendamento online
                </p>
              </div>
            </div>
            {/* Serviços REAIS do business (fallback mock se vazio) */}
            <div className="px-3 pb-3 space-y-1.5">
              {previewServices.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg p-2"
                  style={{ background: previewCardBg, border: `1px solid ${previewBorder}` }}
                >
                  <p className="text-[11px] font-semibold" style={{ color: previewText }}>
                    {s.name}
                  </p>
                  <p className="text-[9px]" style={{ color: previewMuted }}>
                    {formatDuration(s.duration_minutes)} · {formatPrice(s.price)}
                  </p>
                </div>
              ))}
              <button
                type="button"
                className="w-full py-2 rounded-lg font-bold text-white text-[11px]"
                style={{
                  background: gradient,
                  boxShadow: `0 6px 18px -6px ${primary}`,
                }}
              >
                Agendar horário
              </button>
            </div>
          </div>
          {slugUrl && (
            // Navegacao na MESMA aba (sem target=_blank) — em PWA
            // standalone, abrir nova aba caia no browser sem caminho
            // de volta. /[slug] detecta ?preview=admin e mostra banner
            // sticky de "← Voltar pra Aparencia"
            <a
              href={slugUrl}
              className="mt-2 w-full text-xs font-semibold flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--admin-accent)' }}
            >
              Ver minha página real <IconExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {/* Logo — link pra Negócio (sem duplicar o uploader) */}
      <button
        type="button"
        onClick={() => onNavigateToNegocio?.()}
        className="admin-card p-3 w-full flex items-center gap-3 text-left transition-colors hover:opacity-90"
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden font-bold"
          style={{
            background: business.logo_url ? '#FFFFFF' : gradient,
            color: '#FFFFFF',
            border: '1px solid var(--admin-border)',
          }}
        >
          {business.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logo_url} alt={business.name} className="w-full h-full object-contain" />
          ) : (
            business.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Logo
          </p>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
            {business.logo_url ? 'Configurada — toque pra trocar' : 'Sem logo — toque pra adicionar'}
          </p>
        </div>
        <span
          className="text-[11px] font-semibold flex items-center gap-1"
          style={{ color: 'var(--admin-accent)' }}
        >
          Negócio
          <IconChevronDown
            size={12}
            style={{ transform: 'rotate(-90deg)' }}
          />
        </span>
      </button>

      {/* Banner / Capa — uploader local */}
      <div className="admin-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Capa da página
          </p>
          {coverUrl && (
            <button
              type="button"
              onClick={handleRemoveCover}
              className="text-[11px] font-semibold flex items-center gap-1"
              style={{ color: 'var(--admin-danger, #EF4444)' }}
            >
              <IconClose size={12} /> Remover
            </button>
          )}
        </div>
        <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
          Foto da fachada, ambiente ou produto. Aparece no topo da página pública. Sem capa, mostra o gradient das suas cores.
        </p>
        <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
          <strong>Tamanho ideal:</strong> 1600×600px (proporção horizontal/panorâmica).
          O foco visual fica no terço superior — coloque o que importa mais em cima.
        </p>
        <button
          type="button"
          onClick={() => coverFileInputRef.current?.click()}
          disabled={uploadingCover}
          className="w-full rounded-xl overflow-hidden relative h-36 transition-opacity disabled:opacity-60"
          style={{
            background: coverUrl ? '#000' : gradient,
            border: '1px dashed var(--admin-border-hi)',
          }}
        >
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt="Capa"
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center 25%' }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-white text-xs font-semibold">
              + Adicionar foto da capa
            </div>
          )}
          {uploadingCover && (
            <span
              className="absolute inset-0 flex items-center justify-center text-white font-semibold"
              style={{ background: 'rgba(0,0,0,0.55)', fontSize: 12 }}
            >
              Enviando...
            </span>
          )}
        </button>
        <input
          ref={coverFileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUploadCover(file)
            e.target.value = ''
          }}
        />
        {coverError && (
          <p className="text-[11px]" style={{ color: 'var(--admin-danger, #EF4444)' }}>
            {coverError}
          </p>
        )}
      </div>

      {/* Presets */}
      <div className="admin-card p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Escolha um estilo
          </p>
          <span
            className="text-[10px] font-medium tabular-nums"
            style={{ color: 'var(--admin-text-faded)' }}
          >
            {PRESETS.length} opções
          </span>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--admin-text-mute)' }}>
          Toque para aplicar. O preview acima atualiza na hora.
          {businessCategory && RECOMMENDED_BY_CATEGORY[businessCategory] && (
            <>
              {' '}<strong style={{ color: 'var(--admin-accent)' }}>★</strong> indicam estilos que
              combinam com {businessCategory.toLowerCase()}.
            </>
          )}
        </p>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((p) => {
            const active = isPreset(p)
            const recommended = isRecommended(p.name, businessCategory)
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  setPrimary(p.primary)
                  setSecondary(p.secondary)
                }}
                className="rounded-xl p-1.5 text-center transition-all relative"
                style={{
                  border: active
                    ? `2px solid ${p.primary}`
                    : '2px solid var(--admin-border)',
                  background: active ? 'var(--admin-accent-bg)' : 'transparent',
                  transform: active ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                <div
                  className="h-10 rounded-lg mb-1 relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${p.primary} 0%, ${p.secondary} 100%)`,
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
                  }}
                >
                  {active && (
                    <span
                      className="absolute inset-0 flex items-center justify-center"
                      style={{
                        background: 'rgba(0,0,0,0.18)',
                        color: '#fff',
                      }}
                    >
                      <IconCheck size={14} strokeWidth={4} />
                    </span>
                  )}
                  {recommended && !active && (
                    <span
                      className="absolute top-1 right-1 text-[9px] font-black px-1 rounded"
                      style={{
                        background: 'rgba(255,255,255,0.92)',
                        color: '#0F172A',
                      }}
                      aria-label="Indicada pra este nicho"
                      title="Indicada pra este nicho"
                    >
                      ★
                    </span>
                  )}
                </div>
                <p
                  className="text-[10px] font-semibold truncate"
                  style={{
                    color: active ? 'var(--admin-accent)' : 'var(--admin-text-2)',
                  }}
                >
                  {p.name}
                </p>
              </button>
            )
          })}
        </div>
        {/* Botão resetar — visível só se está fora do default */}
        {(primary !== DEFAULT_PRIMARY ||
          secondary !== DEFAULT_SECONDARY ||
          mode !== DEFAULT_MODE) && (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="mt-3 text-[11px] font-semibold w-full py-2 rounded-lg transition-colors"
            style={{
              color: 'var(--admin-text-mute)',
              border: '1px dashed var(--admin-border)',
            }}
          >
            Voltar pro padrão (Azul · Escuro)
          </button>
        )}
      </div>

      {/* Modo claro/escuro */}
      <div className="admin-card p-4">
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--admin-text)' }}>
          Fundo da página
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(['dark', 'light'] as const).map((m) => {
            const active = mode === m
            const isDark = m === 'dark'
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="rounded-xl p-2 transition-all overflow-hidden"
                style={{
                  border: active
                    ? '2px solid var(--admin-accent)'
                    : '2px solid var(--admin-border)',
                  background: active ? 'var(--admin-accent-bg)' : 'transparent',
                }}
              >
                {/* Mini-mock do modo */}
                <div
                  className="rounded-lg overflow-hidden mb-1.5"
                  style={{
                    background: isDark ? '#050713' : '#F8FAFC',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}`,
                  }}
                >
                  <div className="h-2.5 w-full" style={{ background: gradient }} />
                  <div className="p-1.5">
                    <div
                      className="h-1 w-2/3 rounded mb-1"
                      style={{ background: isDark ? '#94A3B8' : '#64748B' }}
                    />
                    <div
                      className="h-1 w-1/2 rounded"
                      style={{ background: isDark ? '#475569' : '#CBD5E1' }}
                    />
                  </div>
                </div>
                <p
                  className="text-[11px] font-semibold flex items-center justify-center gap-1"
                  style={{
                    color: active ? 'var(--admin-accent)' : 'var(--admin-text-2)',
                  }}
                >
                  {active && <IconCheck size={11} strokeWidth={4} />}
                  {isDark ? 'Escuro' : 'Claro'}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Cor personalizada — accordion estilizado */}
      <div className="admin-card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced((s) => !s)}
          className="w-full px-4 py-3.5 flex items-center justify-between text-left transition-colors"
          aria-expanded={showAdvanced}
        >
          <span
            className="text-sm font-semibold flex items-center gap-2"
            style={{ color: 'var(--admin-text)' }}
          >
            <IconPalette size={14} style={{ color: 'var(--admin-accent)' }} />
            Cor personalizada
          </span>
          <span
            className="transition-transform flex-shrink-0"
            style={{
              color: 'var(--admin-text-mute)',
              transform: showAdvanced ? 'rotate(180deg)' : undefined,
            }}
          >
            <IconChevronDown size={14} />
          </span>
        </button>
        {showAdvanced && (
          <div
            className="px-4 pb-4 space-y-3"
            style={{ borderTop: '1px solid var(--admin-divider)' }}
          >
            <p
              className="text-[11px] mt-3"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              O gradiente vai de Primária → Secundária. Use cores que combinem.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ColorField
                label="Cor primária"
                value={primary}
                onChange={setPrimary}
              />
              <ColorField
                label="Cor secundária"
                value={secondary}
                onChange={setSecondary}
              />
            </div>
            <div
              className="rounded-lg p-2.5 text-[10px] font-mono"
              style={{
                background: 'var(--admin-input-bg)',
                color: 'var(--admin-text-mute)',
                border: '1px solid var(--admin-border)',
              }}
            >
              gradient: {primary.toUpperCase()} → {secondary.toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmação do reset */}
      {confirmReset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setConfirmReset(false)}
        >
          <div
            className="admin-card p-5 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-bold mb-1" style={{ color: 'var(--admin-text)' }}>
              Voltar pro padrão?
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--admin-text-mute)' }}>
              Vai trocar pra Azul · Ciano em modo escuro. A capa não muda. Você ainda precisa
              clicar Salvar pra aplicar.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="admin-btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="admin-btn-primary flex-1"
              >
                Voltar pro padrão
              </button>
            </div>
          </div>
        </div>
      )}

      <StickyActionBar
        dirty={isDirty}
        saving={saving}
        saved={saved}
        error={error}
        onSave={save}
        offsetBottom={72}
        saveLabel="Salvar aparência"
      />
    </div>
  )
}

// =============================================================================
// Campo de cor (color picker + hex input)
// =============================================================================
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span
        className="text-[11px] font-semibold mb-1.5 block uppercase tracking-wider"
        style={{ color: 'var(--admin-text-faded)' }}
      >
        {label}
      </span>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-12 rounded-xl cursor-pointer border-0 flex-shrink-0"
          style={{ background: 'none' }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="admin-input flex-1 px-3 py-2 font-mono text-sm uppercase"
        />
      </div>
    </label>
  )
}
