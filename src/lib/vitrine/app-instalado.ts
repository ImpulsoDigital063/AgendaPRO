/* APP INSTALADO DA CLÍNICA (25/10/2026) · a equipe da Ivna instala o painel no
   celular e o ícone, o nome e a abertura são os dela, não os do AgendaPRO.
   O manifest e os layouts não sabem de qual negócio é quem está no aparelho,
   então o SlugCacher grava o slug num cookie (COOKIE_SLUG) e eles leem daqui.
   Só a clínica com `app` no conteúdo da vitrine ganha; as outras seguem iguais. */
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { conteudoDaVitrine } from './conteudo'
import { getCurrentBusiness, getCurrentUser } from '@/lib/admin-data'
import { createClient } from '@/lib/supabase/server'

export const COOKIE_SLUG = 'agendapro-slug'

export function appDaClinica(slug: string | null | undefined) {
  if (!slug) return null
  // mesmo truque do painel: no dev, a conta de teste veste a Ivna
  const preview = process.env.NODE_ENV === 'development' && process.env.PAINEL_CLINICA_PREVIEW === slug
  const c = conteudoDaVitrine(preview ? 'ivna-loyola-beauty-clinic' : slug)
  return c?.app ? { ...c.app, slug, logo: c.logoDourada ?? null } : null
}

/* 25/10 · a clínica sai da CONTA LOGADA, não só do cookie. O cookie é gravado
   pelo SlugCacher no navegador DEPOIS que a página carrega: na 1ª visita o
   servidor ainda não sabia que era a Ivna e o "Adicionar à Tela de Início" saía
   com nome e ícone do AgendaPRO (Eduardo instalou e viu isso). Dona/gerente =
   negócio do painel; recepção/profissional = negócio do cadastro dela. O
   cookie fica de reserva (manifest pedido sem sessão). */
async function slugDaConta(): Promise<string | null> {
  try {
    const user = await getCurrentUser()
    if (!user) return null
    const negocio = await getCurrentBusiness(user.id)
    if (negocio?.slug) return negocio.slug as string
    const supabase = await createClient()
    const { data: prof } = await supabase
      .from('professionals')
      .select('businesses(slug)')
      .eq('auth_user_id', user.id)
      .eq('active', true)
      .limit(1)
      .maybeSingle()
    const b = prof?.businesses as { slug?: string } | { slug?: string }[] | null | undefined
    return (Array.isArray(b) ? b[0]?.slug : b?.slug) ?? null
  } catch {
    return null
  }
}

export async function appDoAparelho() {
  return appDaClinica((await slugDaConta()) ?? (await cookies()).get(COOKIE_SLUG)?.value)
}

// mesmas telas do layout raiz (iOS escolhe pela media query)
/* 25/10 · abertura saía BRANCA no iPhone do Eduardo (vídeo da instalação): a
   lista parava no iPhone 15. O iOS só usa a imagem cujo media bate exato com a
   tela; sem par, fica branco. Entraram 16 Pro/17/17 Pro (402x874), 16/17 Pro
   Max (440x956), Air (420x912) e mini (360x780). */
const TELAS: [number, number, string][] = [
  [1320, 2868, '(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3)'],
  [1260, 2736, '(device-width: 420px) and (device-height: 912px) and (-webkit-device-pixel-ratio: 3)'],
  [1206, 2622, '(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3)'],
  [1080, 2340, '(device-width: 360px) and (device-height: 780px) and (-webkit-device-pixel-ratio: 3)'],
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
