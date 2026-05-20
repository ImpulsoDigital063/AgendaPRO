'use client'

import { useEffect } from 'react'

/**
 * Persiste o slug do business em localStorage pra que componentes
 * client-only (ex: AppSplash) possam customizar branding sem precisar
 * de query Supabase.
 *
 * Usado nos layouts admin/recepcao/profissional. Cold start em PWA:
 * splash lê o slug cacheado e mostra logo correta antes mesmo do auth.
 */
export default function SlugCacher({ slug }: { slug: string | null }) {
  useEffect(() => {
    if (!slug) return
    try {
      localStorage.setItem('agendapro-last-slug', slug)
    } catch {
      /* localStorage pode estar bloqueado (Safari private) · ignora */
    }
  }, [slug])

  return null
}
