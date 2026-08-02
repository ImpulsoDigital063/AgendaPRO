/* ═══════════════════════════════════════════════════════════════
   JSON-LD — dados estruturados (AEO / SEO)

   Eduardo 01/08/2026: "AEO e LLM.txt tá incluso no sistema?" — não estava.
   O projeto tinha ZERO dado estruturado. Google e ChatGPT liam as páginas
   como texto solto, tendo que adivinhar o que era preço, o que era pergunta
   e o que era negócio local.

   Por que importa aqui especificamente: 10 dos 26 cadastros vieram do
   ChatGPT, sem nenhum trabalho de aquisição. Motor de resposta cita o que
   consegue ler sem ambiguidade — FAQPage e Offer são exatamente isso.

   Três schemas, três funções diferentes:
   · SoftwareApplication + Offer → preço do AgendaPRO citável ("custa R$67")
   · FAQPage                     → resposta pronta pro motor copiar
   · LocalBusiness               → página de CLIENTE aparecendo em busca
                                    local ("nail designer em Fortaleza")

   REGRA: nada aqui pode afirmar o que o produto não faz. Todo número sai de
   src/config/pricing.ts, toda resposta sai do FAQ que está na tela. Schema
   que promete diferente do conteúdo visível é penalizado pelo Google e,
   pior, vira citação errada na boca da IA.
   ═══════════════════════════════════════════════════════════════ */

import { PRICING } from '@/config/pricing'
import type { FAQItem } from '@/components/FAQ'

export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.agendapro.net.br').replace(/\/$/, '')

/* ─── Organização — quem é a empresa por trás ─────────────────── */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: 'AgendaPRO',
    url: SITE_URL,
    logo: `${SITE_URL}/logo-agendapro.svg`,
    description:
      'Sistema de agendamento, caixa, comissão e ficha de cliente para barbearias, salões, studios de unhas, cílios e clínicas de estética no Brasil.',
    areaServed: { '@type': 'Country', name: 'Brasil' },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      telephone: '+55-63-99292-0080',
      availableLanguage: 'Portuguese',
    },
  }
}

/* ─── O produto e o preço — o que a IA cita quando perguntam quanto custa ── */
export function softwareApplicationJsonLd() {
  const solo = PRICING.solo
  const equipe = PRICING.equipe

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/#software`,
    name: 'AgendaPRO',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Sistema de agendamento e gestão para salões e barbearias',
    operatingSystem: 'Web, Android, iOS',
    url: SITE_URL,
    inLanguage: 'pt-BR',
    description:
      'Agenda online, comanda, controle de caixa, comissão automática sobre o valor líquido, ficha de cliente, fidelidade e página pública de agendamento. Sem taxa de setup e sem fidelidade contratual.',
    publisher: { '@id': `${SITE_URL}/#organization` },
    offers: [
      {
        '@type': 'Offer',
        name: `Plano ${solo.nome}`,
        description: 'Administrador mais 1 colaborador. Agenda, caixa, ficha de cliente e página pública.',
        price: String(solo.mensalidadeReais),
        priceCurrency: 'BRL',
        category: 'Assinatura mensal',
        availability: 'https://schema.org/InStock',
        url: `${SITE_URL}/cadastro`,
      },
      {
        '@type': 'Offer',
        name: `Plano ${equipe.nome}`,
        description:
          'Até 5 profissionais com acesso próprio, mais 1 recepcionista com tela dedicada. Inclui comissão por profissional, venda de produto e controle de estoque.',
        price: String(equipe.mensalidadeReais),
        priceCurrency: 'BRL',
        category: 'Assinatura mensal',
        availability: 'https://schema.org/InStock',
        url: `${SITE_URL}/cadastro`,
      },
    ],
    // Trial de 7 dias sem cartão — o dado vem do config, não é copy inventada.
    ...(PRICING.trial?.dias
      ? {
          award: undefined,
          termsOfService: `${SITE_URL}/termos`,
          isAccessibleForFree: false,
          potentialAction: {
            '@type': 'RegisterAction',
            name: `Testar ${PRICING.trial.dias} dias grátis, sem cartão`,
            target: `${SITE_URL}/cadastro`,
          },
        }
      : {}),
  }
}

/* ─── FAQ — o formato que motor de resposta mais cita ─────────── */
export function faqJsonLd(items: FAQItem[], pageUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${pageUrl}#faq`,
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}

/* ─── Trilha de navegação — ajuda a IA a entender a hierarquia ─── */
export function breadcrumbJsonLd(trilha: { nome: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trilha.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.nome,
      item: t.url,
    })),
  }
}

/* ─── Negócio do cliente — busca local ─────────────────────────
   Aqui o beneficiário é o CLIENTE, não o AgendaPRO: a página dele passa a
   poder aparecer em "manicure em Maringá". Só emite campo que existe no
   cadastro — endereço, telefone e nota do Google entram apenas se o dono
   preencheu. Campo vazio em JSON-LD é erro de validação, não é neutro. */
export function localBusinessJsonLd(b: {
  name: string
  slug: string
  description?: string | null
  address?: string | null
  phone?: string | null
  logo?: string | null
  cover?: string | null
  rating?: number | null
  reviews?: number | null
  category?: string | null
  services?: { name: string; price?: number | null }[]
}) {
  const url = `${SITE_URL}/${b.slug}`

  const json: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'HealthAndBeautyBusiness',
    '@id': `${url}#business`,
    name: b.name,
    url,
    inLanguage: 'pt-BR',
    potentialAction: {
      '@type': 'ReserveAction',
      name: 'Agendar horário',
      target: `${url}/agendar`,
    },
  }

  if (b.description) json.description = b.description
  if (b.phone) json.telephone = b.phone
  if (b.logo) json.logo = b.logo
  if (b.cover) json.image = b.cover
  if (b.address) json.address = { '@type': 'PostalAddress', streetAddress: b.address, addressCountry: 'BR' }

  if (b.rating && b.reviews) {
    json.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: b.rating,
      reviewCount: b.reviews,
      bestRating: 5,
    }
  }

  const servicos = (b.services ?? []).filter((s) => s.name)
  if (servicos.length) {
    json.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: 'Serviços',
      itemListElement: servicos.slice(0, 30).map((s) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: s.name },
        ...(s.price ? { price: String(s.price), priceCurrency: 'BRL' } : {}),
      })),
    }
  }

  return json
}

/* ─── Render ───────────────────────────────────────────────────
   Um único <script> por página com @graph é melhor que vários soltos: o
   Google resolve as referências entre os nós (#organization, #software)
   sem precisar cruzar tags. */
export function JsonLd({ data }: { data: object | object[] }) {
  const payload = Array.isArray(data)
    ? { '@context': 'https://schema.org', '@graph': data.map((d) => omitContext(d)) }
    : data

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  )
}

function omitContext(obj: object) {
  const { '@context': _ctx, ...resto } = obj as Record<string, unknown>
  return resto
}
