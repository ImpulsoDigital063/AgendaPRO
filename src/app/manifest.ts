import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const headersList = await headers()
  const referer = headersList.get('referer') || ''
  const isProfessional = referer.includes('/profissional')

  return {
    name: 'AgendaPRO',
    short_name: 'AgendaPRO',
    description: 'Sistema de agendamento online',
    start_url: isProfessional ? '/profissional' : '/admin',
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
