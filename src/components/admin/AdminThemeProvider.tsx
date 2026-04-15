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

  useEffect(() => {
    document.documentElement.setAttribute('data-admin-theme', theme)
    document.documentElement.style.colorScheme = theme
  }, [theme])

  const setTheme = useCallback((next: AdminTheme) => {
    setThemeState(next)
    writeCookie(next)
  }, [])

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next: AdminTheme = prev === 'dark' ? 'light' : 'dark'
      writeCookie(next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ theme, toggle, setTheme }), [theme, toggle, setTheme])

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>
}

export function useAdminTheme() {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error('useAdminTheme precisa de AdminThemeProvider')
  return ctx
}
