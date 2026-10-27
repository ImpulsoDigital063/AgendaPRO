import type { MetadataRoute } from 'next'

/* Estático desde 27/10/2026. Antes lia o referer com headers() pra trocar o
   start_url do profissional, e isso fazia o manifest virar função a cada
   pedido. O app do profissional agora aponta pro dele
   (public/manifest-profissional.webmanifest, declarado em
   src/app/profissional/layout.tsx). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AgendaPRO',
    short_name: 'AgendaPRO',
    description: 'Sistema de agendamento online',
    start_url: '/admin',
    display: 'standalone',
    // Background escuro casa com o admin (--admin-bg-deep) — splash do
    // Android usa essa cor durante o load, em vez de tela branca
    background_color: '#030510',
    theme_color: '#3B82F6',
    orientation: 'portrait',
    icons: [
      // any: usado em telas de gestao (settings, search)
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // maskable: Android Adaptive Icons + splash bonito sem cortar bordas
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
