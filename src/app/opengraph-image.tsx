import { ImageResponse } from 'next/og'

/**
 * Imagem de compartilhamento (og:image) do AgendaPRO — 1200x630.
 *
 * Por que existe (29/07/2026): metadata.openGraph declarava title e
 * description mas NAO declarava images, e nao havia metadataBase. Sem
 * og:image no head, WhatsApp/Telegram caiam pro icone declarado — que era o
 * favicon.ico do scaffold do create-next-app (triangulo do Vercel). Todo
 * link de acesso mandado pra cliente aparecia com a marca errada.
 *
 * Convencao de arquivo do Next: opengraph-image.tsx na raiz de app/ gera as
 * tags og:image, og:image:width, og:image:height e og:image:type sozinho.
 *
 * Visual espelha o /splash pra manter uma identidade so: fundo #030510 e
 * quadrado com gradiente azul->roxo.
 */
export const runtime = 'edge'
export const alt = 'AgendaPRO — agenda inteligente pro seu negócio crescer sozinho'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#030510',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          <div
            style={{
              width: 148,
              height: 148,
              background:
                'linear-gradient(135deg, #3B82F6 0%, #6366F1 50%, #8B5CF6 100%)',
              borderRadius: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 48,
              fontWeight: 800,
              letterSpacing: -2,
              boxShadow: '0 30px 80px rgba(59,130,246,0.4)',
            }}
          >
            PRO
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                color: '#FFFFFF',
                fontSize: 76,
                fontWeight: 800,
                letterSpacing: -3,
                lineHeight: 1,
              }}
            >
              AgendaPRO
            </div>
            <div style={{ color: '#60A5FA', fontSize: 30, fontWeight: 600, marginTop: 12 }}>
              agendapro.net.br
            </div>
          </div>
        </div>

        <div
          style={{
            color: '#E2E8F0',
            fontSize: 42,
            fontWeight: 600,
            lineHeight: 1.25,
            marginTop: 56,
            maxWidth: 900,
          }}
        >
          Agenda inteligente pro seu negócio crescer sozinho
        </div>

        <div style={{ color: '#94A3B8', fontSize: 28, marginTop: 24 }}>
          Fidelidade · lista de espera · indicação · reputação Google
        </div>
      </div>
    ),
    size
  )
}
