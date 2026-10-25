import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { appDoAparelho } from '@/lib/vitrine/app-instalado'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const headersList = await headers()
  const referer = headersList.get('referer') || ''
  const isProfessional = referer.includes('/profissional')

  /* 25/10 · clínica com app próprio (Ivna): nome, ícone e cores dela, e cada
     papel abre na sua tela (a recepção caía no /admin) */
  const app = await appDoAparelho()
  if (app) {
    return {
      name: app.nome,
      short_name: app.nome,
      description: app.nome,
      id: `/app/${app.slug}`,
      start_url: referer.includes('/recepcao') ? '/recepcao' : isProfessional ? '/profissional' : '/admin',
      display: 'standalone',
      background_color: '#FAF7F2',
      theme_color: '#FAF7F2',
      orientation: 'portrait',
      icons: [
        { src: `${app.pasta}/icone-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: `${app.pasta}/icone-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: `${app.pasta}/maskable-192.png`, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
        { src: `${app.pasta}/maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }
  }

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
