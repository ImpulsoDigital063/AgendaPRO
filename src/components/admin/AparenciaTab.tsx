'use client'

import { useState } from 'react'
import type { Business } from '@/lib/types'

const PRESETS: { name: string; primary: string; secondary: string }[] = [
  { name: 'Azul AgendaPRO', primary: '#3B82F6', secondary: '#06B6D4' },
  { name: 'Roxo salao',     primary: '#8B5CF6', secondary: '#EC4899' },
  { name: 'Rosa nail',      primary: '#EC4899', secondary: '#F472B6' },
  { name: 'Ciano estetica', primary: '#06B6D4', secondary: '#3B82F6' },
  { name: 'Verde menta',    primary: '#10B981', secondary: '#06B6D4' },
  { name: 'Laranja barber', primary: '#F97316', secondary: '#EAB308' },
  { name: 'Preto e ouro',   primary: '#0F172A', secondary: '#EAB308' },
  { name: 'Vermelho fogo',  primary: '#EF4444', secondary: '#F97316' },
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

  const previewBg = mode === 'dark' ? '#050713' : '#F8FAFC'
  const previewCard = mode === 'dark' ? 'rgba(15,25,56,0.55)' : 'white'
  const previewText = mode === 'dark' ? 'white' : '#0F172A'
  const previewMuted = mode === 'dark' ? '#94A3B8' : '#64748B'

  return (
    <div className="space-y-6">
      <div className="admin-card p-5">
        <h2 className="font-bold mb-1" style={{ color: 'var(--admin-text)' }}>Aparencia da sua pagina</h2>
        <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>Personalize as cores que o seu cliente ve quando entra em <span className="font-mono" style={{ color: 'var(--admin-accent)' }}>agenda-pro-seven.vercel.app/{business.slug}</span></p>
      </div>

      {/* Presets */}
      <div className="admin-card p-5">
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--admin-text-2)' }}>Comece com um preset</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => { setPrimary(p.primary); setSecondary(p.secondary) }}
              className="rounded-xl p-3 text-left transition-colors"
              style={{ border: '1px solid var(--admin-border)' }}
            >
              <div
                className="h-10 rounded-lg mb-2"
                style={{ background: `linear-gradient(135deg, ${p.primary} 0%, ${p.secondary} 100%)` }}
              />
              <p className="text-xs font-medium" style={{ color: 'var(--admin-text-2)' }}>{p.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Pickers */}
      <div className="admin-card p-5 grid grid-cols-1 sm:grid-cols-3 gap-5">
        <label className="block">
          <span className="text-sm font-semibold mb-1.5 block" style={{ color: 'var(--admin-text-2)' }}>Cor primaria</span>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              className="w-12 h-12 rounded-lg cursor-pointer"
              style={{ border: '1px solid var(--admin-border)' }}
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
          <span className="text-sm font-semibold mb-1.5 block" style={{ color: 'var(--admin-text-2)' }}>Cor secundaria</span>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
              className="w-12 h-12 rounded-lg cursor-pointer"
              style={{ border: '1px solid var(--admin-border)' }}
            />
            <input
              type="text"
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
              className="admin-input flex-1 px-3 py-2 font-mono text-sm uppercase"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-sm font-semibold mb-1.5 block" style={{ color: 'var(--admin-text-2)' }}>Modo</span>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('dark')}
              className="flex-1 py-3 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: mode === 'dark' ? 'var(--admin-accent)' : 'var(--admin-accent-bg)',
                color: mode === 'dark' ? '#fff' : 'var(--admin-text-mute)',
                border: `1px solid ${mode === 'dark' ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
              }}
            >
              Escuro
            </button>
            <button
              onClick={() => setMode('light')}
              className="flex-1 py-3 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: mode === 'light' ? 'var(--admin-accent)' : 'var(--admin-accent-bg)',
                color: mode === 'light' ? '#fff' : 'var(--admin-text-mute)',
                border: `1px solid ${mode === 'light' ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
              }}
            >
              Claro
            </button>
          </div>
        </label>
      </div>

      {/* Preview */}
      <div>
        <p className="text-sm font-semibold mb-2" style={{ color: 'var(--admin-text-2)' }}>Preview</p>
        <div
          className="rounded-2xl p-6"
          style={{
            background: previewBg,
            border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
          }}
        >
          <div
            className="h-16 rounded-2xl mb-4"
            style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }}
          />
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg text-white"
              style={{ background: primary }}
            >
              {business.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold" style={{ color: previewText }}>{business.name}</p>
              <p className="text-xs" style={{ color: previewMuted }}>seu agendamento online</p>
            </div>
          </div>
          <div className="rounded-xl p-3 mb-3" style={{ background: previewCard }}>
            <p className="text-sm" style={{ color: previewText }}>Corte masculino</p>
            <p className="text-xs" style={{ color: previewMuted }}>30 min · R$ 50,00</p>
          </div>
          <button
            className="w-full py-3 rounded-xl font-bold text-white text-sm"
            style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }}
          >
            Agendar horario
          </button>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-3 rounded-xl font-semibold disabled:opacity-50 transition-colors"
          style={{ background: 'var(--admin-accent)', color: '#fff' }}
        >
          {saving ? 'Salvando...' : 'Salvar aparencia'}
        </button>
        {saved === 'ok' && <span className="text-emerald-500 text-sm font-medium flex items-center gap-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Salvo</span>}
        {saved === 'error' && <span className="text-red-500 text-sm font-medium">Erro ao salvar</span>}
      </div>
    </div>
  )
}
