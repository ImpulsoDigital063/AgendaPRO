'use client'

import Link from 'next/link'

type ViewKind = 'daily' | 'weekly' | 'monthly' | 'yearly'

const OPTIONS: { value: ViewKind; label: string }[] = [
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
]

type Props = {
  current: ViewKind
}

export default function FluxoCaixaViewSelector({ current }: Props) {
  return (
    <div
      className="mb-4 inline-flex rounded-xl p-1"
      style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
      }}
    >
      {OPTIONS.map((opt) => {
        const active = current === opt.value
        return (
          <Link
            key={opt.value}
            href={`/admin/financeiro/fluxo-caixa?view=${opt.value}`}
            className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors"
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
            {opt.label}
          </Link>
        )
      })}
    </div>
  )
}
