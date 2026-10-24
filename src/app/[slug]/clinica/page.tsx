/* VITRINE DA CLÍNICA (protótipo, 22/10/2026) · a página que apresenta a clínica
   antes do agendamento: proposta, serviços por categoria, equipe e o botão
   "Agendar atendimento". Pedido da Ivna Loyola. Enquanto for protótipo só abre
   pra ela; depois vira recurso ligado por negócio (modelo CAF). */
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Lora, Manrope } from 'next/font/google'
import { CATEGORIAS, categoriaDoServico, nomeLimpo } from '@/lib/vitrine/categorias'
import { conteudoDaVitrine, doCatalogo, primeiroNome } from '@/lib/vitrine/conteudo'
import { extractGoogleReviewUrl } from '@/lib/google-review'

/* 24/10 · foto do catálogo que é montagem de antes/depois virava duas metades
   no quadradinho do serviço. As listadas em `catalogoMini` têm uma versão em
   `catalogo/mini/` (só a metade do resultado, quadrada); o cartão do serviço
   usa ela, os pacotes seguem com a imagem inteira. Lista fixa e não fs: na
   Vercel a pasta public não vai junto com a função. */
function miniaturaDe(mini: string[] | undefined) {
  return (foto: string) => {
    const nome = foto.match(/([^/]+)\.jpg$/)?.[1]
    return nome && mini?.includes(nome) ? foto.replace(/\/([^/]+)$/, '/mini/$1') : foto
  }
}
import Vitrine, { type Chegada, type DadosVitrine } from './Vitrine'

// Fonte escolhida pelo Eduardo (22/10) a partir do estudo de clínicas
// (REFERENCIAS-CLINICAS.md): serifa firme nos títulos, como a Ever/Body, sem
// itálico, e a mesma Manrope do agendamento no resto.
const serif = Lora({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-vitrine', display: 'swap' })
const sans = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-vitrine-sans', display: 'swap' })

// descrição vem do cadastro: tira escape de markdown, negrito e emoji (página sem emoji)
function limparTexto(t: string | null): string | null {
  if (!t) return null
  const limpo = t
    .replace(/\\(.)/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
  return limpo || null
}

function db() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

async function carregar(slug: string): Promise<DadosVitrine | null> {
  const conteudo = conteudoDaVitrine(slug)
  if (!conteudo) return null
  const supabase = db()
  const { data: b } = await supabase
    .from('businesses')
    .select('id, name, slug, description, phone, address, logo_url, cover_url, instagram_url, brand_primary, brand_secondary, google_place_id, google_rating, google_reviews_count, points_for_review')
    .eq('slug', slug)
    .maybeSingle()
  if (!b) return null

  const [{ data: servicos }, { data: equipe }, { data: premio }, { data: pacotesDb }] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, price, duration_minutes, description')
      .eq('business_id', b.id)
      .eq('active', true)
      .eq('public_visible', true)
      .order('name'),
    supabase
      .from('professionals')
      .select('id, name, photo_url, is_owner, role')
      .eq('business_id', b.id)
      .eq('active', true)
      .eq('does_appointments', true)
      .order('created_at', { ascending: true }),
    supabase
      .from('rewards')
      .select('name, points_required')
      .eq('business_id', b.id)
      .eq('active', true)
      .order('points_required', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('packages')
      .select('id, name, price, description, package_items(service_id, quantity, services(name, price))')
      .eq('business_id', b.id)
      .eq('active', true)
      .order('price', { ascending: true }),
  ])
  type ItemDb = { service_id: string | null; quantity: number; services: { name: string; price: number | null } | { name: string; price: number | null }[] | null }
  const pacotes = (pacotesDb ?? []).map((p) => {
    const itens = ((p.package_items ?? []) as ItemDb[]).map((i) => {
      const sv = Array.isArray(i.services) ? i.services[0] : i.services
      return { servico: i.service_id, nome: nomeLimpo(sv?.name ?? ''), qtd: i.quantity, preco: sv?.price ? Number(sv.price) : 0 }
    }).filter((i) => i.nome)
    // "separado" só quando todos os itens têm preço (senão a comparação mente)
    const separado = itens.length && itens.every((i) => i.preco > 0) ? itens.reduce((t, i) => t + i.preco * i.qtd, 0) : null
    const unico = itens.length === 1 && itens[0].qtd > 1 ? itens[0] : null
    return {
      id: p.id,
      nome: nomeLimpo(p.name),
      preco: Number(p.price),
      descricao: limparTexto(p.description),
      itens: itens.map((i) => ({ nome: i.nome, qtd: i.qtd })),
      separado: separado && separado > Number(p.price) ? separado : null,
      // tratamento de várias sessões de um serviço só: dá pra agendar a 1ª
      sessoes: unico ? { servico: unico.servico, qtd: unico.qtd } : null,
      // foto pelos procedimentos, não pelo nome ("Beleza Express" casava com cílios Express)
      foto: doCatalogo(conteudo, ...itens.map((i) => i.nome), p.name).foto,
    }
  })
  const urlAvaliar = extractGoogleReviewUrl(b.google_place_id)

  /* posição dentro da aba: principal → correção/remoção → combo → retorno/manutenção → avaliação */
  const ordemNaAba = (nome: string) =>
    /^avalia/i.test(nome.trim()) ? 9 : /retorno|manuten/i.test(nome) ? 4 : /combo/i.test(nome) ? 3 : /remo[cç][aã]o|microagulhamento de micro/i.test(nome) ? 2 : 0

  const porCategoria = CATEGORIAS.map((c) => ({
    nome: c,
    servicos: (servicos ?? [])
      .filter((s) => categoriaDoServico(s.name) === c)
      .map((s) => {
        // catálogo do WhatsApp: foto sempre; texto só onde o cadastro não tem descrição
        const cat = doCatalogo(conteudo, s.name)
        if (cat.foto) cat.foto = miniaturaDe(conteudo.catalogoMini)(cat.foto)
        // dentro da aba de cílios o prefixo repetia em todo cartão; o cadastro (e o agendamento) seguem com o nome completo
        const nome = nomeLimpo(s.name).replace(/^alongamento de c[ií]lios\s*-\s*/i, '')
        return { id: s.id, nome: nome.charAt(0).toUpperCase() + nome.slice(1), descricao: s.description?.trim() || cat.texto, preco: s.price ? Number(s.price) : null, duracao: s.duration_minutes, foto: cat.foto, avaliacao: /^avalia/i.test(s.name.trim()), ordem: ordemNaAba(s.name) }
      })
      /* 24/10 · o principal primeiro (Eduardo: a aba de micro abria no Combo
         Diva e no pigmento laranja). Avaliação sai da lista e vira o cartão
         "A avaliação é indispensável" no fim da aba. */
      .sort((x, y) => x.ordem - y.ordem),
  })).filter((c) => c.servicos.length)

  return {
    nome: b.name,
    slug: b.slug,
    descricao: b.description,
    telefone: b.phone,
    endereco: b.address,
    logo: b.logo_url,
    capa: b.cover_url,
    instagram: b.instagram_url,
    cor: b.brand_primary || '#A47E3B',
    cor2: b.brand_secondary || '#CBAA62',
    categorias: porCategoria,
    pacotes,
    conteudo,
    // mesmo bloco de avaliação/pontos da página pública (GoogleReviewSection + /api/claim-review)
    avaliacao: urlAvaliar
      ? {
          businessId: b.id,
          url: urlAvaliar,
          nota: b.google_rating,
          total: b.google_reviews_count,
          pontos: b.points_for_review ?? 0,
          premio: premio ? { name: premio.name, pointsRequired: premio.points_required } : null,
        }
      : null,
    equipe: (equipe ?? []).map((p) => ({
      id: p.id,
      nome: p.name,
      foto: conteudo?.fotos?.[primeiroNome(p.name)] ?? p.photo_url,
      dona: p.is_owner || p.role === 'owner',
    })),
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const d = await carregar(slug)
  if (!d) return {}
  return { title: d.nome, description: d.descricao ?? undefined, robots: { index: false } }
}

/* Link de campanha/influencer (?cupom=) ou de indicação (?ref=), Black Friday da
   Ivna (24/10). Mesma validação da página padrão: cupom do negócio, não vencido
   e (se for de uso único) não usado; indicação = cliente do negócio com esse
   código. Inválido = página normal, sem aviso e sem levar o parâmetro. */
async function lerChegada(slug: string, cupom?: string, ref?: string): Promise<Chegada | null> {
  if (!cupom && !ref) return null
  const supabase = db()
  const { data: b } = await supabase.from('businesses').select('id').eq('slug', slug).maybeSingle()
  if (!b) return null
  const query = new URLSearchParams()
  const chegada: Chegada = { query: '' }
  if (cupom) {
    const { data: cp } = await supabase
      .from('coupons')
      .select('code, discount_type, discount_value, expires_at, used_at, is_standalone')
      .eq('code', cupom.toUpperCase())
      .eq('business_id', b.id)
      .maybeSingle()
    if (cp && (cp.is_standalone || !cp.used_at) && new Date(cp.expires_at) > new Date()) {
      const v = Number(cp.discount_value)
      chegada.cupom = {
        code: cp.code,
        texto: cp.discount_type === 'percent' ? `${v}% de desconto` : `R$ ${v.toFixed(2).replace('.', ',')} de desconto`,
      }
      query.set('cupom', cp.code)
    }
  }
  if (ref) {
    const { data: quem } = await supabase
      .from('customers')
      .select('name')
      .eq('referral_code', ref)
      .eq('business_id', b.id)
      .maybeSingle()
    if (quem?.name) {
      chegada.indicacao = primeiroNome(quem.name)
      query.set('ref', ref)
    }
  }
  chegada.query = query.toString()
  return chegada.query ? chegada : null
}

export default async function PaginaClinica({
  params,
  cupom,
  ref,
}: {
  params: Promise<{ slug: string }>
  cupom?: string
  ref?: string
}) {
  const { slug } = await params
  const [dados, chegada] = await Promise.all([carregar(slug), lerChegada(slug, cupom, ref)])
  if (!dados) notFound()
  return (
    <div className={`${serif.variable} ${sans.variable}`}>
      <Vitrine d={dados} chegada={chegada} />
    </div>
  )
}
