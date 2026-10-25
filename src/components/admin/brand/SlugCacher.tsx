'use client'

import { useEffect } from 'react'

/**
 * Persiste o slug do business em localStorage pra que componentes
 * client-only (ex: AppSplash) possam customizar branding sem precisar
 * de query Supabase.
 *
 * Usado nos layouts admin/recepcao/profissional. Cold start em PWA:
 * splash lê o slug cacheado e mostra logo correta antes mesmo do auth.
 *
 * 25/10 · também num cookie: o manifest e o "Adicionar à Tela de Início" do
 * iPhone são lidos no servidor e precisam saber de qual clínica é o aparelho
 * (app com nome e ícone da clínica, src/lib/vitrine/app-instalado.ts).
 */
export default function SlugCacher({ slug }: { slug: string | null }) {
  useEffect(() => {
    if (!slug) return
    try {
      localStorage.setItem('agendapro-last-slug', slug)
    } catch {
      /* localStorage pode estar bloqueado (Safari private) · ignora */
    }
    document.cookie = `agendapro-slug=${encodeURIComponent(slug)}; path=/; max-age=31536000; samesite=lax`
  }, [slug])

  return null
}
