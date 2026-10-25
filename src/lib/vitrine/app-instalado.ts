/* APP INSTALADO DA CLÍNICA (25/10/2026) · a equipe da Ivna instala o painel no
   celular e o ícone, o nome e a abertura são os dela, não os do AgendaPRO.
   O manifest e os layouts não sabem de qual negócio é quem está no aparelho,
   então o SlugCacher grava o slug num cookie (COOKIE_SLUG) e eles leem daqui.
   Só a clínica com `app` no conteúdo da vitrine ganha; as outras seguem iguais. */
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { conteudoDaVitrine } from './conteudo'

export const COOKIE_SLUG = 'agendapro-slug'

export function appDaClinica(slug: string | null | undefined) {
  if (!slug) return null
  // mesmo truque do painel: no dev, a conta de teste veste a Ivna
  const preview = process.env.NODE_ENV === 'development' && process.env.PAINEL_CLINICA_PREVIEW === slug
  const c = conteudoDaVitrine(preview ? 'ivna-loyola-beauty-clinic' : slug)
  return c?.app ? { ...c.app, slug, logo: c.logoDourada ?? null } : null
}

export async function appDoAparelho() {
  return appDaClinica((await cookies()).get(COOKIE_SLUG)?.value)
}

// mesmas telas do layout raiz (iOS escolhe pela media query)
const TELAS: [number, number, string][] = [
  [1290, 2796, '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)'],
  [1284, 2778, '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)'],
  [1179, 2556, '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)'],
  [1170, 2532, '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)'],
  [1125, 2436, '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)'],
  [828, 1792, '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)'],
  [1242, 2208, '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)'],
  [750, 1334, '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)'],
]

/** iPhone: "Adicionar à Tela de Início" lê nome, ícone e abertura da página */
export async function metadataDoApp(): Promise<Metadata> {
  const app = await appDoAparelho()
  if (!app) return {}
  return {
    applicationName: app.nome,
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: app.nome,
      startupImage: TELAS.map(([w, h, media]) => ({ url: `/splash?w=${w}&h=${h}&c=${app.slug}`, media })),
    },
    icons: { apple: `${app.pasta}/apple-180.png`, icon: `${app.pasta}/icone-192.png` },
  }
}
