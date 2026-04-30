'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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

type Pos = { top: number; left?: number; right?: number }

export default function MoreActionsMenu({
  actions,
  align = 'right',
  ariaLabel = 'Mais ações',
  size = 'sm',
}: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<Pos | null>(null)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    if (align === 'right') {
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    } else {
      setPos({ top: rect.bottom + 4, left: rect.left })
    }
  }, [open, align])

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onReposition() {
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    // Fecha em scroll/resize pra não ficar com posição congelada e errada.
    window.addEventListener('scroll', onReposition, true)
    window.addEventListener('resize', onReposition)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onReposition, true)
      window.removeEventListener('resize', onReposition)
    }
  }, [open])

  const buttonSize = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
  const dotSize = size === 'sm' ? 3 : 4

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${buttonSize} rounded-full flex items-center justify-center transition-colors flex-shrink-0`}
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

      {mounted && open && pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[60] min-w-[180px] rounded-xl py-1"
            style={{
              top: pos.top,
              left: pos.left,
              right: pos.right,
              // Popover precisa de bg SÓLIDO — admin-surface é translucido
              // no dark e fica ilegível sobre cards + orbs animados
              background: 'var(--admin-popover-bg)',
              border: '1px solid var(--admin-popover-border)',
              boxShadow:
                '0 24px 60px -12px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04)',
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
          </div>,
          document.body
        )}
    </>
  )
}
