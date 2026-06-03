'use client'

import { type ReactNode } from 'react'

/**
 * Tema dark removido em 03/06 — agendapro é LIGHT-ONLY.
 * Os tokens claros vivem no `.admin-shell` (globals.css). Este provider
 * virou pass-through, mantido só pra não quebrar os imports dos layouts
 * (admin/recepcao/profissional) e o prop `initial` que eles ainda passam.
 */
export default function AdminThemeProvider({
  children,
}: {
  initial?: 'dark' | 'light'
  children: ReactNode
}) {
  return <>{children}</>
}
