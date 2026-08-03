import type { MetadataRoute } from 'next'

import { SITE_URL as BASE } from '@/lib/site-url'

/**
 * robots.txt (01/08/2026).
 *
 * O projeto não tinha nenhum — o Google entrava sem mapa e sem regra. Achado
 * enquanto investigávamos 3 dias sem cadastro novo: não era a causa (ninguém
 * chegou a abrir o formulário), mas é dinheiro parado, porque hoje existem 13
 * páginas públicas de clientes reais + 4 páginas de nicho que ninguém guiava.
 *
 * O que fica FORA do índice, de propósito:
 *   · /admin · /profissional · /recepcao → painéis, exigem login
 *   · /auth · /login · /cancelar → fluxos com token na URL
 *   · /sistema · /splash → internos
 *   · /[slug]/meus-pontos → área da cliente final, com dado dela
 *   · /api → não é página
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/profissional',
          '/recepcao',
          '/auth/',
          '/login',
          '/cancelar',
          '/sistema',
          '/splash',
          '/api/',
          '/*/meus-pontos',
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  }
}
