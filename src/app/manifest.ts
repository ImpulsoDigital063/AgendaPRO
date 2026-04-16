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
    background_color: '#f9fafb',
    theme_color: '#111827',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
