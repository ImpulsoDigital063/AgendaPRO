import type { Metadata } from 'next'

/* Manifest próprio do app do profissional (27/10/2026): abre em /profissional
   em vez de /admin. Antes isso saía do referer dentro de src/app/manifest.ts,
   o que deixava o manifest dinâmico (CPU de função a cada pedido). Mesmo
   conteúdo do principal, só muda o start_url. */
export const metadata: Metadata = {
  manifest: '/manifest-profissional.webmanifest',
}

export default function ProfissionalLayout({ children }: { children: React.ReactNode }) {
  return children
}
