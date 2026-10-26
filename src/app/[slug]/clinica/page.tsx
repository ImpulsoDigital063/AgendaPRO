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
import { JsonLd, SITE_URL, faqJsonLd, localBusinessJsonLd } from '@/lib/jsonld'

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

/* 26/10 · horário da clínica = do 1º começo ao último fim de quem atende,
   dia a dia; dias seguidos com a mesma faixa viram "Segunda a sábado". */
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
function horarioDaClinica(linhas: { day_of_week: number; start_time: string; end_time: string }[]) {
  const hm = (t: string) => t.slice(0, 5).replace(':', 'h')
  const porDia = new Map<number, { ini: string; fim: string }>()
  for (const l of linhas) {
    const atual = porDia.get(l.day_of_week)
    porDia.set(l.day_of_week, {
      ini: !atual || l.start_time < atual.ini ? l.start_time : atual.ini,
      fim: !atual || l.end_time > atual.fim ? l.end_time : atual.fim,
    })
  }
  const grupos: { de: number; ate: number; faixa: string }[] = []
  for (const dia of [1, 2, 3, 4, 5, 6, 0]) {
    const h = porDia.get(dia)
    if (!h) continue
    const faixa = `${hm(h.ini)} — ${hm(h.fim)}`
    const ultimo = grupos[grupos.length - 1]
    const seguido = ultimo && (ultimo.ate + 1) % 7 === dia && ultimo.faixa === faixa
    if (seguido) ultimo.ate = dia
    else grupos.push({ de: dia, ate: dia, faixa })
  }
  return grupos.map((g) => ({
    dias: g.de === g.ate ? DIAS[g.de] : `${DIAS[g.de]} a ${DIAS[g.ate].toLowerCase()}`,
    faixa: g.faixa,
  }))
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

  const [{ data: servicos }, { data: equipe }, { data: premio }, { data: pacotesDb }, { data: expediente }] = await Promise.all([
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
    supabase
      .from('working_hours')
      .select('day_of_week, start_time, end_time, professionals!inner(business_id, active, does_appointments)')
      .eq('professionals.business_id', b.id)
      .eq('professionals.active', true)
      .eq('professionals.does_appointments', true),
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

  /* 25/10 · AEO: "quanto custa" é a pergunta que mais chega no motor de
     resposta. O preço sai do cadastro na hora (nunca escrito à mão), e só
     entra o que tem preço. */
  const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
  const menorPreco = (cat: string, re?: RegExp) => {
    const ps = porCategoria.find((c) => c.nome === cat)?.servicos.filter((s) => s.preco && !s.avaliacao && s.ordem === 0 && (!re || re.test(s.nome))).map((s) => s.preco as number) ?? []
    return ps.length ? Math.min(...ps) : null
  }
  const precos = ([
    ['micropigmentação de sobrancelhas', menorPreco('Micropigmentação', /sobrancelha/i)],
    ['micropigmentação labial', menorPreco('Micropigmentação', /labial/i)],
    ['alongamento de cílios', menorPreco('Alongamento de cílios')],
  ] as const).filter(([, v]) => v !== null)
  const perguntas = [...(conteudo.perguntas ?? [])]
  if (precos.length) {
    const lista = precos.map(([nome, v]) => `${nome} a partir de ${brl(v as number)}`)
    const frase = lista.length > 1 ? `${lista.slice(0, -1).join(', ')} e ${lista[lista.length - 1]}` : lista[0]
    perguntas.splice(1, 0, {
      q: 'Quanto custam os procedimentos?',
      a: `${frase.charAt(0).toUpperCase()}${frase.slice(1)}. Em alguns procedimentos o valor muda conforme a profissional, e você vê o valor de cada uma na hora de agendar.`,
    })
  }

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
    horarios: horarioDaClinica(expediente ?? []),
    perguntas,
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

/* 25/10 · SEO/AEO: a página padrão do AgendaPRO entregava o negócio em
   JSON-LD e a vitrine tinha deixado de entregar (zero blocos no HTML). Aqui
   volta mais completo: endereço com cidade, pino do mapa, Instagram, serviços
   com preço, nota do Google e as perguntas frequentes da própria página. */
function dadosEstruturados(d: NonNullable<Awaited<ReturnType<typeof carregar>>>) {
  const c = d.conteudo
  const url = `${SITE_URL}/${d.slug}`
  const absoluto = (cam?: string | null) => (cam ? (cam.startsWith('http') ? cam : `${SITE_URL}${cam}`) : null)
  const negocio: Record<string, unknown> = localBusinessJsonLd({
    name: d.nome,
    slug: d.slug,
    description: c.og?.descricao ?? d.descricao,
    phone: d.telefone ? `+55${d.telefone.replace(/\D/g, '')}` : null,
    logo: absoluto(c.logoDourada ?? d.logo),
    cover: absoluto(c.og?.imagem ?? d.capa),
    rating: d.avaliacao?.nota,
    reviews: d.avaliacao?.total,
    services: d.categorias.flatMap((cat) => cat.servicos.filter((s) => !s.avaliacao).map((s) => ({ name: s.nome, price: s.preco }))),
  })
  if (c.mapa) {
    const [cidade, uf] = (c.mapa.cidade ?? '').split(/\s*-\s*/)
    negocio.address = {
      '@type': 'PostalAddress',
      streetAddress: c.mapa.consulta,
      ...(cidade ? { addressLocality: cidade } : {}),
      ...(uf ? { addressRegion: uf } : {}),
      addressCountry: 'BR',
    }
    const [lat, lng] = (c.mapa.coords ?? '').split(',').map(Number)
    if (Number.isFinite(lat) && Number.isFinite(lng) && c.mapa.coords) negocio.geo = { '@type': 'GeoCoordinates', latitude: lat, longitude: lng }
    if (cidade) negocio.areaServed = { '@type': 'City', name: cidade }
  }
  if (d.instagram) negocio.sameAs = [d.instagram.split('?')[0]]
  return d.perguntas.length ? [negocio, faqJsonLd(d.perguntas, url)] : [negocio]
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
      <JsonLd data={dadosEstruturados(dados)} />
      <Vitrine d={dados} chegada={chegada} />
    </div>
  )
}
