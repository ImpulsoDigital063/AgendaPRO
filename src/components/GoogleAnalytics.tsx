/* ═══════════════════════════════════════════════════════════════
   GOOGLE ANALYTICS (GA4)

   Eduardo 03/08/2026, criando a propriedade: "essa tag? coloca no nosso
   sistema?" — sim, e ela resolve duas coisas de uma vez:
   1. medir de onde vem a visita (hoje não medimos nada; a única pista de
      canal é o campo `acquisition_channel` que o dono preenche no cadastro)
   2. servir de verificação de posse no Search Console — com o GA instalado,
      o GSC aceita "Google Analytics" e dispensa a tag HTML

   ⚠️ CARREGA SÓ NAS PÁGINAS PÚBLICAS. O gtag fica fora de /admin,
   /profissional e /recepcao de propósito: painel é ferramenta de trabalho de
   cliente pagante, e URL de painel carrega id de negócio e de atendimento.
   Isso não vai pro Google. O que interessa medir é o funil de aquisição —
   home, LPs, respostas e as páginas públicas dos clientes.

   ⚠️ Sem NEXT_PUBLIC_GA_ID definido, o componente não renderiza nada. Em
   dev e preview fica desligado sozinho, sem sujar a métrica com nossa
   própria navegação.

   strategy="afterInteractive": o script sobe depois que a página fica usável.
   Métrica não pode atrasar o carregamento de quem está decidindo comprar.
   ═══════════════════════════════════════════════════════════════ */

'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'

// Prefixos que NUNCA recebem o gtag — ver comentário acima.
const AREAS_PRIVADAS = ['/admin', '/profissional', '/recepcao', '/auth', '/login', '/cancelar', '/sistema']

export default function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID
  const pathname = usePathname()

  if (!gaId) return null
  if (AREAS_PRIVADAS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  )
}
