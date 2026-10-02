'use client'

/* Peças da tela de Horários do celular (v155). Cor de ação = cor do negócio
   (--admin-accent), regra de cor do painel. Light-only, como o resto. */

import { useEffect, type ReactNode } from 'react'

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: 'rgba(15, 23, 42, 0.45)' }}>
      <button type="button" aria-label="Fechar" className="flex-1" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="rounded-t-[22px] px-4 pt-2.5 flex flex-col gap-3.5 overflow-y-auto"
        style={{ background: 'var(--admin-surface)', maxHeight: '88vh', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}
      >
        <div className="w-10 h-[5px] rounded-full self-center" style={{ background: 'var(--admin-border-hi)' }} />
        {children}
      </div>
    </div>
  )
}

export function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className="relative shrink-0 rounded-full transition-colors"
      style={{ width: 48, height: 28, background: on ? 'var(--admin-accent)' : 'var(--admin-border-hi)' }}
    >
      <span
        className="absolute rounded-full transition-all"
        style={{ top: 3, left: on ? 23 : 3, width: 22, height: 22, background: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
      />
    </button>
  )
}

/* O input de hora do iPhone tem largura mínima própria e estourava o cartão
   (print do Eduardo, 02/10). appearance:none + min-width:0 devolve a largura
   pro grid. */
export function CampoHora({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0 text-xs font-bold tracking-wide" style={{ color: 'var(--admin-text-mute)' }}>
      {label}
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-0 h-[52px] rounded-xl px-3.5 text-lg font-semibold"
        style={{
          WebkitAppearance: 'none',
          appearance: 'none',
          boxSizing: 'border-box',
          background: 'var(--admin-input-bg)',
          border: '1px solid var(--admin-border)',
          color: 'var(--admin-text)',
        }}
      />
    </label>
  )
}

export function BotaoPrincipal({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-[52px] rounded-2xl text-base font-bold disabled:opacity-60"
      style={{ background: 'var(--admin-accent)', color: '#FFFFFF' }}
    >
      {children}
    </button>
  )
}

export function BotaoSecundario({ children, onClick, tom = 'neutro', disabled }: { children: ReactNode; onClick: () => void; tom?: 'neutro' | 'perigo' | 'destaque'; disabled?: boolean }) {
  const cor = tom === 'perigo' ? '#B91C1C' : tom === 'destaque' ? 'var(--admin-accent)' : 'var(--admin-text-2)'
  const borda = tom === 'perigo' ? '#FECACA' : tom === 'destaque' ? 'var(--admin-accent)' : 'var(--admin-border)'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-[52px] rounded-2xl text-base font-semibold disabled:opacity-60"
      style={{ background: 'var(--admin-surface)', color: cor, border: `1px ${tom === 'destaque' ? 'dashed' : 'solid'} ${borda}` }}
    >
      {children}
    </button>
  )
}

export function Segmento<T extends string>({ valor, opcoes, onChange }: { valor: T; opcoes: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="grid gap-1 p-1 rounded-[14px]" style={{ gridTemplateColumns: `repeat(${opcoes.length}, minmax(0, 1fr))`, background: '#E9EDF2' }}>
      {opcoes.map((o) => {
        const on = o.id === valor
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className="min-h-[40px] rounded-[11px] text-[15px]"
            style={on
              ? { background: 'var(--admin-surface)', color: 'var(--admin-text)', fontWeight: 700, boxShadow: '0 1px 3px rgba(15,23,42,0.12)' }
              : { background: 'transparent', color: 'var(--admin-text-mute)', fontWeight: 600 }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Aviso({ texto, tom }: { texto: string; tom: 'erro' | 'info' }) {
  return (
    <div
      role={tom === 'erro' ? 'alert' : undefined}
      className="rounded-xl px-3 py-2.5 text-sm"
      style={tom === 'erro'
        ? { background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }
        : { background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-2)' }}
    >
      {texto}
    </div>
  )
}

export function Toast({ texto }: { texto: string }) {
  if (!texto) return null
  return (
    <div
      role="status"
      className="fixed left-4 right-4 z-[60] rounded-2xl px-4 py-3.5 text-sm font-semibold flex items-center gap-2.5"
      style={{ bottom: 'calc(88px + env(safe-area-inset-bottom))', background: '#0F172A', color: '#FFFFFF' }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
      {texto}
    </div>
  )
}
