'use client'

import { IconCheck, IconAlert } from '@/components/ui/Icon'

type Props = {
  dirty: boolean
  saving?: boolean
  saved?: boolean
  error?: string
  onSave: () => void
  saveLabel?: string
  unsavedLabel?: string
  /** Distância do bottom — útil quando há BottomNav fixo. Default: 0. */
  offsetBottom?: number
}

export default function StickyActionBar({
  dirty,
  saving = false,
  saved = false,
  error,
  onSave,
  saveLabel = 'Salvar alterações',
  unsavedLabel = 'Você tem alterações não salvas',
  offsetBottom = 0,
}: Props) {
  const visible = dirty || saving || saved || !!error

  return (
    <div
      className="fixed left-0 right-0 z-40 transition-transform duration-300"
      style={{
        bottom: offsetBottom ? `calc(${offsetBottom}px + env(safe-area-inset-bottom))` : 'env(safe-area-inset-bottom)',
        transform: visible ? 'translateY(0)' : 'translateY(120%)',
        background: 'color-mix(in srgb, var(--admin-bg) 88%, transparent)',
        backdropFilter: 'blur(14px) saturate(140%)',
        WebkitBackdropFilter: 'blur(14px) saturate(140%)',
        borderTop: '1px solid var(--admin-divider)',
        boxShadow: '0 -8px 24px -12px rgba(0,0,0,0.25)',
      }}
    >
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          {error ? (
            <p
              className="text-xs font-medium flex items-center gap-1.5"
              style={{ color: 'var(--admin-danger)' }}
            >
              <IconAlert size={14} />
              <span className="truncate">{error}</span>
            </p>
          ) : saved ? (
            <p
              className="text-xs font-semibold flex items-center gap-1.5"
              style={{ color: '#16A34A' }}
            >
              <IconCheck size={14} />
              Alterações salvas
            </p>
          ) : (
            <p className="text-xs font-medium" style={{ color: 'var(--admin-text-faded)' }}>
              <span
                className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                style={{ background: 'var(--admin-warn)' }}
              />
              {unsavedLabel}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !dirty}
          className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
          style={{
            background:
              'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
            color: '#FFFFFF',
            boxShadow: '0 10px 24px -10px color-mix(in srgb, var(--admin-accent) 65%, transparent)',
          }}
        >
          {saving ? 'Salvando...' : saveLabel}
        </button>
      </div>
    </div>
  )
}
