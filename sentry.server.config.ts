import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || 'development',

    // Performance: amostra 10% em prod, 100% em dev
    tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,

    // Anonimiza dados sensiveis
    sendDefaultPii: false,

    // Ignora erros esperados (rate limit, auth) que ja viram 401/429 — nao sao bugs
    ignoreErrors: [
      'Unauthorized',
      'NEXT_NOT_FOUND',
      'NEXT_REDIRECT',
    ],
  })
}
