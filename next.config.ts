import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async headers() {
    return [
      // Rotas de auth/redirect-sensitive NÃO podem ser cacheadas pelo CDN
      // do Vercel. Confirmado em 17/05/2026: /profissional/login tava com
      // Age=60h no cache do edge, servindo JS antigo (sem redirect novo
      // pra recep), o que travou o redirect pra /recepcao do is_receptionist.
      {
        source: '/:path(profissional|profissional/login|profissional/trocar-senha|admin|admin/login|recepcao|recepcao/:slug*)',
        headers: [
          { key: 'Cache-Control', value: 'private, no-cache, no-store, max-age=0, must-revalidate' },
          { key: 'CDN-Cache-Control', value: 'no-store' },
          { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.supabase.co",
              "font-src 'self'",
              // Sentry: cliente envia eventos pra ingest do projeto (*.sentry.io e *.ingest.sentry.io)
              "connect-src 'self' https://*.supabase.co https://*.sentry.io https://*.ingest.sentry.io",
              // Web Worker via blob: pra compressImage (upload de foto de produto/perfil)
              // Sem isso, navegador bloqueia o worker e a compressão trava silenciosa.
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
};

// Wrapper Sentry: faz upload de sourcemaps + injeta tunnel route pra burlar adblockers.
// Configs lidas das env vars SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN no build.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  // Tunnel: rotas /monitoring viram proxy pra Sentry, evita adblocker
  tunnelRoute: '/monitoring',
  // Sourcemaps so em prod (sem auth token, fica no-op)
  widenClientFileUpload: true,
  disableLogger: true,
  // Trees-shake debug do SDK em prod pra bundle menor
  reactComponentAnnotation: { enabled: false },
});
