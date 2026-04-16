'use client'

import { useState } from 'react'
import type { Business } from '@/lib/types'

const PRESETS: { name: string; primary: string; secondary: string }[] = [
  { name: 'Azul',      primary: '#3B82F6', secondary: '#06B6D4' },
  { name: 'Roxo',      primary: '#8B5CF6', secondary: '#EC4899' },
  { name: 'Rosa',      primary: '#EC4899', secondary: '#F472B6' },
  { name: 'Ciano',     primary: '#06B6D4', secondary: '#3B82F6' },
  { name: 'Verde',     primary: '#10B981', secondary: '#06B6D4' },
  { name: 'Laranja',   primary: '#F97316', secondary: '#EAB308' },
  { name: 'Elegante',  primary: '#0F172A', secondary: '#EAB308' },
  { name: 'Vermelho',  primary: '#EF4444', secondary: '#F97316' },
]

export default function AparenciaTab({ business }: { business: Business }) {
  const [primary, setPrimary] = useState(business.brand_primary || '#3B82F6')
  const [secondary, setSecondary] = useState(business.brand_secondary || '#06B6D4')
  const [mode, setMode] = useState<'dark' | 'light'>(business.brand_mode || 'dark')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<'ok' | 'error' | null>(null)

  async function save() {
    setSaving(true)
    setSaved(null)
    const res = await fetch('/api/admin/branding', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ brand_primary: primary, brand_secondary: secondary, brand_mode: mode }),
    })
    setSaving(false)
    setSaved(res.ok ? 'ok' : 'error')
    if (res.ok) setTimeout(() => setSaved(null), 2500)
  }

  const isSelected = (p: typeof PRESETS[number]) => p.primary === primary && p.secondary === secondary

  const previewBg = mode === 'dark' ? '#050713' : '#F8FAFC'
  const previewCard = mode === 'dark' ? 'rgba(15,25,56,0.55)' : 'white'
  const previewText = mode === 'dark' ? 'white' : '#0F172A'
  const previewMuted = mode === 'dark' ? '#94A3B8' : '#64748B'

  return (
    <div className="space-y-6">

      {/* Preview fixo no topo — sempre visível */}
      <div className="admin-card p-4">
        <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Preview da sua pagina</p>
        <div
          className="rounded-2xl p-4"
          style={{
            background: previewBg,
            border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
          }}
        >
          <div
            className="h-10 rounded-xl mb-3"
            style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }}
          />
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
              style={{ background: primary }}
            >
              {business.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: previewText }}>{business.name}</p>
              <p className="text-[10px]" style={{ color: previewMuted }}>seu agendamento online</p>
            </div>
          </div>
          <div className="rounded-lg p-2.5 mb-2.5" style={{ background: previewCard }}>
            <p className="text-xs" style={{ color: previewText }}>Corte masculino</p>
            <p className="text-[10px]" style={{ color: previewMuted }}>30 min · R$ 50,00</p>
          </div>
          <button
            className="w-full py-2.5 rounded-xl font-bold text-white text-xs"
            style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }}
          >
            Agendar horario
          </button>
        </div>
      </div>

      {/* Presets — botões grandes com feedback visual */}
      <div className="admin-card p-4">
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>Escolha um estilo</p>
        <p className="text-xs mb-4" style={{ color: 'var(--admin-text-mute)' }}>Toque para aplicar. O preview acima atualiza na hora.</p>
        <div className="grid grid-cols-4 gap-2.5">
          {PRESETS.map((p) => {
            const active = isSelected(p)
            return (
              <button
                key={p.name}
                onClick={() => { setPrimary(p.primary); setSecondary(p.secondary) }}
                className="rounded-xl p-2 text-center transition-all"
                style={{
                  border: active ? `2px solid ${p.primary}` : '2px solid var(--admin-border)',
                  background: active ? 'var(--admin-accent-bg)' : 'transparent',
                  transform: active ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                <div
                  className="h-12 rounded-lg mb-1.5"
                  style={{ background: `linear-gradient(135deg, ${p.primary} 0%, ${p.secondary} 100%)` }}
                />
                <p className="text-[11px] font-semibold" style={{ color: active ? 'var(--admin-accent)' : 'var(--admin-text-2)' }}>{p.name}</p>
                {active && (
                  <div className="flex justify-center mt-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--admin-accent)' }}><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Modo claro/escuro */}
      <div className="admin-card p-4">
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--admin-text)' }}>Fundo da pagina</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode('dark')}
            className="py-4 rounded-xl text-sm font-semibold transition-all flex flex-col items-center gap-2"
            style={{
              background: mode === 'dark' ? 'var(--admin-accent)' : 'var(--admin-accent-bg)',
              color: mode === 'dark' ? '#fff' : 'var(--admin-text-mute)',
              border: `2px solid ${mode === 'dark' ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
            }}
          >
            <div className="w-8 h-8 rounded-lg" style={{ background: '#050713', border: '1px solid rgba(255,255,255,0.15)' }} />
            Escuro
          </button>
          <button
            onClick={() => setMode('light')}
            className="py-4 rounded-xl text-sm font-semibold transition-all flex flex-col items-center gap-2"
            style={{
              background: mode === 'light' ? 'var(--admin-accent)' : 'var(--admin-accent-bg)',
              color: mode === 'light' ? '#fff' : 'var(--admin-text-mute)',
              border: `2px solid ${mode === 'light' ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
            }}
          >
            <div className="w-8 h-8 rounded-lg" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }} />
            Claro
          </button>
        </div>
      </div>

      {/* Cor personalizada — colapsado por padrão no mobile */}
      <details className="admin-card overflow-hidden">
        <summary className="p-4 cursor-pointer text-sm font-semibold flex items-center justify-between" style={{ color: 'var(--admin-text)' }}>
          Cor personalizada
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--admin-text-mute)' }}><polyline points="6 9 12 15 18 9"/></svg>
        </summary>
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--admin-text-2)' }}>Cor primaria</span>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                className="w-14 h-14 rounded-xl cursor-pointer border-0"
                style={{ background: 'none' }}
              />
              <input
                type="text"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                className="admin-input flex-1 px-3 py-2 font-mono text-sm uppercase"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--admin-text-2)' }}>Cor secundaria</span>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={secondary}
                onChange={(e) => setSecondary(e.target.value)}
                className="w-14 h-14 rounded-xl cursor-pointer border-0"
                style={{ background: 'none' }}
              />
              <input
                type="text"
                value={secondary}
                onChange={(e) => setSecondary(e.target.value)}
                className="admin-input flex-1 px-3 py-2 font-mono text-sm uppercase"
              />
            </div>
          </label>
        </div>
      </details>

      {/* Save */}
      <button
        onClick={save}
        disabled={saving}
        className="w-full py-4 rounded-xl font-bold text-white disabled:opacity-50 transition-all text-sm"
        style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }}
      >
        {saving ? 'Salvando...' : saved === 'ok' ? 'Salvo!' : 'Salvar aparencia'}
      </button>
      {saved === 'error' && <p className="text-red-500 text-xs text-center font-medium">Erro ao salvar. Tente novamente.</p>}
    </div>
  )
}
