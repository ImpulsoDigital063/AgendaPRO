import { ImageResponse } from 'next/og'

/**
 * Imagem de compartilhamento DO NEGÓCIO — 1200x630.
 *
 * Por que existe (16/09/2026): a de `src/app/opengraph-image.tsx` é a do
 * AgendaPRO, e era ela que aparecia quando a cliente mandava o link do salão
 * pra uma amiga. Só 15 dos 40 negócios têm logo e 5 têm capa, então mandar a
 * prévia usar "logo, se houver" deixaria a maioria com a nossa arte. Aqui a
 * imagem é gerada na hora com o nome e a cor da marca do negócio: sempre a
 * cara dele, mesmo sem nenhuma foto enviada.
 *
 * Quando o negócio TEM capa ou logo, `buildBusinessMetadata` declara aquela
 * imagem e ela ganha desta — a foto real é sempre melhor que texto.
 */
export const runtime = 'edge'
export const alt = 'Agende seu horário'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Params = { slug: string }

export default async function Image({ params }: { params: Promise<Params> | Params }) {
  const { slug } = await params

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  let nome = 'Agende seu horário'
  let categoria: string | null = null
  let primaria = '#3B82F6'
  let secundaria = '#06B6D4'

  if (url && key) {
    try {
      const r = await fetch(
        `${url}/rest/v1/businesses?select=name,category,description,brand_primary,brand_secondary&slug=eq.${encodeURIComponent(slug)}&limit=1`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } }
      )
      const [b] = (await r.json()) as Array<{
        name: string
        category: string | null
        description: string | null
        brand_primary: string | null
        brand_secondary: string | null
      }>
      if (b) {
        nome = b.name
        categoria = b.category || b.description || null
        primaria = b.brand_primary || primaria
        secundaria = b.brand_secondary || secundaria
      }
    } catch {
      // Prévia é enfeite: se o banco não responde, sai o padrão em vez de erro.
    }
  }

  // Nome curto fica grande; nome longo diminui pra não estourar a caixa.
  const fonte = nome.length > 28 ? 62 : nome.length > 18 ? 78 : 96

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${primaria} 0%, ${secundaria} 100%)`,
          padding: 80,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: fonte,
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1.1,
            letterSpacing: -2,
          }}
        >
          {nome}
        </div>
        {categoria && (
          <div style={{ display: 'flex', marginTop: 24, fontSize: 36, color: 'rgba(255,255,255,0.88)' }}>
            {categoria}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            marginTop: 44,
            padding: '16px 34px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.18)',
            border: '2px solid rgba(255,255,255,0.35)',
            fontSize: 32,
            fontWeight: 700,
            color: '#FFFFFF',
          }}
        >
          Agende seu horário online
        </div>
      </div>
    ),
    size
  )
}
