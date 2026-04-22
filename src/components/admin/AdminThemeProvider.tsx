'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type AdminTheme = 'dark' | 'light'

type Ctx = {
  theme: AdminTheme
  toggle: () => void
  setTheme: (t: AdminTheme) => void
}

const ThemeCtx = createContext<Ctx | null>(null)

const COOKIE = 'admin_theme'

function writeCookie(value: AdminTheme) {
  document.cookie = `${COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

export default function AdminThemeProvider({
  initial = 'dark',
  children,
}: {
  initial?: AdminTheme
  children: ReactNode
}) {
  const [theme, setThemeState] = useState<AdminTheme>(initial)

  const applyTheme = useCallback((next: AdminTheme) => {
    const root = document.documentElement
    root.classList.add('admin-theme-switching')
    // Força reflow pra garantir que o `transition: none` colou antes de mudar as vars
    void root.offsetHeight
    root.setAttribute('data-admin-theme', next)
    root.style.colorScheme = next
    // As divs .admin-shell (admin + profissional) recebem data-admin-theme server-side
    // a partir do cookie. Precisamos atualizá-las também, senão as CSS vars da div
    // sobrescrevem as do html e o tema só muda depois de um F5.
    document.querySelectorAll<HTMLElement>('.admin-shell').forEach((el) => {
      el.setAttribute('data-admin-theme', next)
    })
    // Remove a classe só depois que o browser pintou as novas cores.
    // 80ms cobre a janela de paint mesmo em mobile fraco — RAF aninhado (~32ms)
    // estava muito curto e algumas transições de 0.25s ainda animavam de cor antiga pra nova.
    window.setTimeout(() => {
      root.classList.remove('admin-theme-switching')
    }, 80)
  }, [])

  useEffect(() => {
    if (document.documentElement.getAttribute('data-admin-theme') !== theme) {
      applyTheme(theme)
    }
  }, [theme, applyTheme])

  const setTheme = useCallback(
    (next: AdminTheme) => {
      applyTheme(next)
      writeCookie(next)
      setThemeState(next)
    },
    [applyTheme]
  )

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next: AdminTheme = prev === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      writeCookie(next)
      return next
    })
  }, [applyTheme])

  const value = useMemo(() => ({ theme, toggle, setTheme }), [theme, toggle, setTheme])

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>
}

export function useAdminTheme() {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error('useAdminTheme precisa de AdminThemeProvider')
  return ctx
}
