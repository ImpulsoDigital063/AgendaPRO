import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

/**
 * Prévia (og:) das páginas públicas — a que o WhatsApp mostra quando alguém
 * compartilha o link do negócio.
 *
 * Por que existe (16/09/2026): nenhuma página de `/[slug]` declarava metadata,
 * então TODA prévia caía no openGraph do layout raiz — "AgendaPRO · Agenda
 * inteligente pro seu negócio crescer sozinho · a partir de R$67/mês". Ou seja:
 * a cliente da Wanessa mandava o link de indicação pra uma amiga e a amiga
 * recebia anúncio do nosso SaaS, com o nosso preço, em vez do nome do salão.
 * Vale pra link de indicação, QR e link de agendamento — todos os tenants.
 *
 * Imagem: capa > logo > a imagem gerada em `[slug]/opengraph-image.tsx` (nome
 * do negócio na cor da marca). Nunca a arte do AgendaPRO.
 */
type Variante = 'home' | 'agendar' | 'pontos'

export async function buildBusinessMetadata(
  slug: string,
  variante: Variante = 'home'
): Promise<Metadata> {
  const supabase = await createClient()
  const { data: b } = await supabase
    .from('businesses')
    .select('name, category, description, address, logo_url, cover_url')
    .eq('slug', slug)
    .maybeSingle()

  // Sem negócio (slug errado) a página já devolve 404 — aqui só evitamos
  // vazar o título do SaaS numa prévia de link quebrado.
  if (!b) return { title: 'Página não encontrada' }

  const nome = String(b.name)
  const categoria = (b.category as string | null) || (b.description as string | null) || null
  const cidade = (b.address as string | null)?.trim() || null

  /* Nada de "no {nome}" / "na {nome}": o nome do negócio entra sempre solto ou
     depois de dois pontos, porque a concordância quebra em metade dos casos
     ("no Wanessa Silva Estética"). */
  const titulo =
    variante === 'agendar' ? `Agendar horário · ${nome}`
    : variante === 'pontos' ? `Meus pontos · ${nome}`
    : nome

  /* Endereço entra só quando é curto: muita ficha guarda a rua inteira com
     número e complemento, e isso empurra a parte útil pra fora da prévia. */
  const partes = [categoria, cidade && cidade.length <= 40 ? cidade : null]
    .filter(Boolean)
    .join(' · ')
  const descricao =
    variante === 'pontos'
      ? `Consulte seu saldo de pontos e suas recompensas. ${partes}`.trim()
      : `Escolha o serviço, veja os horários livres e agende online.${partes ? ` ${partes}.` : ''}`

  /* A imagem é declarada SEMPRE, na mão. Descobri em 16/09 que, quando a
     página exporta `openGraph` pelo generateMetadata, o Next NÃO injeta
     sozinho a imagem do arquivo `opengraph-image.tsx` — o resultado era
     página sem og:image nenhuma, que no WhatsApp vira prévia sem foto.

     Só usamos a foto do negócio quando ela é PNG/JPG: quase todo logo e capa
     que subiram estão em .webp, e a prévia do WhatsApp não é confiável com
     esse formato. Fora isso vale a imagem gerada — PNG 1200x630, com o nome
     e a cor da marca, que é melhor que logo quadrado esticado de qualquer
     jeito. */
  const foto = (b.cover_url as string | null) || (b.logo_url as string | null) || null
  const fotoServe = !!foto && /\.(png|jpe?g)(\?|$)/i.test(foto)
  const imagem = fotoServe ? (foto as string) : `/${slug}/opengraph-image`

  return {
    title: titulo,
    description: descricao,
    openGraph: {
      title: titulo,
      description: descricao,
      type: 'website',
      siteName: nome, // sem isso o WhatsApp escreve "agendapro.net.br" embaixo
      ...(imagem ? { images: [{ url: imagem }] } : {}),
    },
    twitter: {
      card: imagem ? 'summary_large_image' : 'summary',
      title: titulo,
      description: descricao,
      ...(imagem ? { images: [imagem] } : {}),
    },
  }
}
