import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

/**
 * GET /splash?w=1284&h=2778
 *
 * Gera dinamicamente uma splash image PNG pra iOS PWA. iOS exibe essa
 * imagem em fullscreen enquanto o app esta carregando (substitui a tela
 * branca padrao por uma splash com identidade do AgendaPRO).
 *
 * Largura/altura via query params — uma URL atende todos os modelos de
 * iPhone. Vercel cacheia a resposta no edge, segunda abertura e
 * instantanea.
 *
 * Linkado em src/app/layout.tsx via metadata.appleWebApp.startupImage
 * com media queries pra cada resolucao de iPhone.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const width = Number(searchParams.get('w') ?? '1284')
  const height = Number(searchParams.get('h') ?? '2778')

  // Tamanho do icone proporcional a tela — ~22% da menor dimensao
  const iconSize = Math.round(Math.min(width, height) * 0.22)
  const iconRadius = Math.round(iconSize * 0.22)
  const fontSize = Math.round(iconSize * 0.32)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#030510',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: iconSize,
            height: iconSize,
            background:
              'linear-gradient(135deg, #3B82F6 0%, #6366F1 50%, #8B5CF6 100%)',
            borderRadius: iconRadius,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize,
            fontWeight: 800,
            letterSpacing: -2,
            boxShadow: '0 30px 80px rgba(59,130,246,0.4)',
          }}
        >
          PRO
        </div>
      </div>
    ),
    {
      width,
      height,
      // Cache forte de 1 ano + immutable: Vercel edge cacheia a resposta,
      // proximas requests sao instantaneas. Sem isso, cada tap no icone do
      // PWA fazia o iOS pedir a splash e ela demorava ~7s pra gerar
      // (next/og e caro: SSR de imagem com fontes/svg). Splash gerada uma
      // vez fica no edge ate o build deploy mudar a URL.
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'CDN-Cache-Control': 'public, max-age=31536000, immutable',
        'Vercel-CDN-Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  )
}
