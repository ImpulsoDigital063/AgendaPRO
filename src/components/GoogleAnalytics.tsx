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

   ⚠️ POR QUE <script> CRU E NÃO next/script (03/08/2026):
   a primeira versão usava <Script strategy="afterInteractive"> pros dois
   scripts. O carregador (com src) saía no HTML, mas o INLINE de
   inicialização não — e gtag.js sem `gtag('config')` não envia hit nenhum.
   Resultado: tag "instalada", Tempo real em zero, e meia hora perdida
   procurando culpa no Google. Com <script> cru os dois aparecem no HTML e dá
   pra conferir com um curl, sem depender de abrir navegador.
   ═══════════════════════════════════════════════════════════════ */

'use client'

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
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`,
        }}
      />
    </>
  )
}
