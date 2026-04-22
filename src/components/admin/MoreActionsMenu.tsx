'use client'

import { useEffect, useRef, useState } from 'react'

export type MoreAction = {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  destructive?: boolean
  disabled?: boolean
  /** Marca este item para receber um separador acima dele. */
  separatorAbove?: boolean
}

type Props = {
  actions: MoreAction[]
  align?: 'left' | 'right'
  ariaLabel?: string
  /** Deixa o botão de gatilho menor no card (compact por padrão). */
  size?: 'sm' | 'md'
}

export default function MoreActionsMenu({
  actions,
  align = 'right',
  ariaLabel = 'Mais ações',
  size = 'sm',
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const buttonSize = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
  const dotSize = size === 'sm' ? 3 : 4

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${buttonSize} rounded-full flex items-center justify-center transition-colors`}
        style={{
          background: open ? 'var(--admin-surface-hover)' : 'transparent',
          color: 'var(--admin-text-mute)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="6" r={dotSize} />
          <circle cx="12" cy="12" r={dotSize} />
          <circle cx="12" cy="18" r={dotSize} />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute z-30 mt-1 min-w-[180px] rounded-xl py-1 ${align === 'right' ? 'right-0' : 'left-0'}`}
          style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
            boxShadow: '0 12px 28px -8px rgba(0,0,0,0.35)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {actions.map((action, i) => (
            <div key={i}>
              {action.separatorAbove && i > 0 && (
                <div
                  className="my-1"
                  style={{ height: 1, background: 'var(--admin-divider)' }}
                />
              )}
              <button
                type="button"
                role="menuitem"
                disabled={action.disabled}
                onClick={() => {
                  if (action.disabled) return
                  action.onClick()
                  setOpen(false)
                }}
                className="w-full px-3 py-2 text-sm font-medium flex items-center gap-2.5 text-left transition-colors disabled:opacity-40"
                style={{
                  color: action.destructive ? 'var(--admin-danger)' : 'var(--admin-text)',
                }}
                onMouseOver={(e) => {
                  if (action.disabled) return
                  e.currentTarget.style.background = action.destructive
                    ? 'color-mix(in srgb, var(--admin-danger) 12%, transparent)'
                    : 'var(--admin-surface-hover)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {action.icon && (
                  <span className="flex-shrink-0" style={{ color: 'inherit' }}>
                    {action.icon}
                  </span>
                )}
                <span>{action.label}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
