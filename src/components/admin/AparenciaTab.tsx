'use client'

import { useMemo, useRef, useState } from 'react'
import type { Business } from '@/lib/types'
import { IconCheck, IconChevronDown, IconExternalLink, IconPalette } from '@/components/ui/Icon'
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

function snapshot(p: string, s: string, m: string) {
  return `${p}|${s}|${m}`
}

export default function AparenciaTab({ business }: { business: Business }) {
  const initialPrimary = business.brand_primary || '#3B82F6'
  const initialSecondary = business.brand_secondary || '#06B6D4'
  const initialMode = business.brand_mode || 'dark'

  const [primary, setPrimary] = useState(initialPrimary)
  const [secondary, setSecondary] = useState(initialSecondary)
  const [mode, setMode] = useState<'dark' | 'light'>(initialMode)
  const [savedSnapshot, setSavedSnapshot] = useState(
    snapshot(initialPrimary, initialSecondary, initialMode),
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isDirty = useMemo(
    () => snapshot(primary, secondary, mode) !== savedSnapshot,
    [primary, secondary, mode, savedSnapshot],
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
      }),
    })
    setSaving(false)
    if (res.ok) {
      setSavedSnapshot(snapshot(primary, secondary, mode))
      setSaved(true)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaved(false), 2200)
    } else {
      setError('Erro ao salvar. Tente novamente.')
    }
  }

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
            {/* Cover branded */}
            <div className="h-12 w-full" style={{ background: gradient }} />
            {/* Header */}
            <div className="px-3 py-2.5 flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white flex-shrink-0"
                style={{ background: gradient }}
              >
                {business.name.charAt(0).toUpperCase()}
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
            {/* Mock de serviços */}
            <div className="px-3 pb-3 space-y-1.5">
              {[
                { name: 'Corte masculino', sub: '30 min · R$ 50' },
                { name: 'Barba', sub: '20 min · R$ 30' },
              ].map((s, i) => (
                <div
                  key={i}
                  className="rounded-lg p-2"
                  style={{ background: previewCardBg, border: `1px solid ${previewBorder}` }}
                >
                  <p className="text-[11px] font-semibold" style={{ color: previewText }}>
                    {s.name}
                  </p>
                  <p className="text-[9px]" style={{ color: previewMuted }}>
                    {s.sub}
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
        </p>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((p) => {
            const active = isPreset(p)
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
