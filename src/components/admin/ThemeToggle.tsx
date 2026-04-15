'use client'

import { useAdminTheme } from './AdminThemeProvider'
import { IconSun, IconMoon } from '@/components/ui/Icon'

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useAdminTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Trocar para tema claro' : 'Trocar para tema escuro'}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
      className="relative inline-flex items-center justify-center rounded-full transition-all hover:scale-[1.04] active:scale-95"
      style={{
        width: compact ? 36 : 40,
        height: compact ? 36 : 40,
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
        color: 'var(--admin-text-2)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <span
        className="absolute inset-0 rounded-full opacity-60"
        style={{
          background: isDark
            ? 'radial-gradient(circle at 30% 30%, rgba(96,165,250,0.25), transparent 60%)'
            : 'radial-gradient(circle at 30% 30%, rgba(251,191,36,0.25), transparent 60%)',
        }}
      />
      <span className="relative">
        {isDark ? <IconMoon size={compact ? 16 : 18} /> : <IconSun size={compact ? 16 : 18} />}
      </span>
    </button>
  )
}
