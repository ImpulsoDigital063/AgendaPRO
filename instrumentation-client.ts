// Sentry — runtime CLIENT (browser)
// Carregado pelo Next.js 16 automaticamente em todas as paginas client-side.
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',

    // Performance: amostra 10% em prod, 100% em dev
    tracesSampleRate: process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ? 0.1 : 1.0,

    // Replay desabilitado por padrao (custo + privacidade). Liga sob demanda.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Anonimiza dados sensiveis
    sendDefaultPii: false,

    // Ignora erros de extensao/bot que poluem
    ignoreErrors: [
      'ResizeObserver loop',
      'Non-Error promise rejection',
      'Network request failed', // erros de rede do cliente nao sao bugs nossos
    ],
  })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
