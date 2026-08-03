/* ═══════════════════════════════════════════════════════════════
   PÁGINA DE RESPOSTA — uma pergunta, uma URL

   Estrutura pensada pra ser citada, não pra ser bonita:
   · H1 é a pergunta escrita como a pessoa digita
   · logo abaixo, o bloco de resposta curta, isolado — é o que motor de
     resposta copia. Fica no topo do HTML de propósito.
   · profundidade depois, FAQ no fim, CTA discreta
   · schema Article + FAQPage + Breadcrumb

   A CTA é discreta por decisão: página que vende no meio da resposta é
   lida como publicidade e não é citada. Quem responde primeiro e vende
   depois ganha a citação — e a visita.
   ═══════════════════════════════════════════════════════════════ */

import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RESPOSTAS, getResposta } from '@/lib/respostas'
import { PRICING } from '@/config/pricing'
import { JsonLd, faqJsonLd, breadcrumbJsonLd, organizationJsonLd, SITE_URL } from '@/lib/jsonld'

export const revalidate = 86400

export function generateStaticParams() {
  return RESPOSTAS.map((r) => ({ slug: r.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const r = getResposta(slug)
  if (!r) return {}
  return {
    title: r.tituloSeo,
    description: r.descricaoSeo,
    alternates: { canonical: `${SITE_URL}/respostas/${r.slug}` },
    openGraph: {
      title: r.tituloSeo,
      description: r.descricaoSeo,
      url: `${SITE_URL}/respostas/${r.slug}`,
      type: 'article',
    },
  }
}

export default async function RespostaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const r = getResposta(slug)
  if (!r) notFound()

  const url = `${SITE_URL}/respostas/${r.slug}`

  const dados = [
    organizationJsonLd(),
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: r.pergunta,
      description: r.descricaoSeo,
      inLanguage: 'pt-BR',
      mainEntityOfPage: url,
      author: { '@id': `${SITE_URL}/#organization` },
      publisher: { '@id': `${SITE_URL}/#organization` },
      articleSection: 'Gestão de salão',
    },
    faqJsonLd(r.faqs, url),
    breadcrumbJsonLd([
      { nome: 'AgendaPRO', url: `${SITE_URL}/` },
      { nome: 'Respostas', url: `${SITE_URL}/respostas` },
      { nome: r.pergunta, url },
    ]),
  ]

  const relacionadas = r.relacionadas.map(getResposta).filter(Boolean)

  return (
    <main className="relative min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <JsonLd data={dados} />

      <div className="container max-w-3xl px-4 py-10 sm:py-16">
        <nav className="mb-8 text-xs sm:text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-300 transition-colors">AgendaPRO</Link>
          <span className="mx-2">/</span>
          <Link href="/respostas" className="hover:text-slate-300 transition-colors">Respostas</Link>
        </nav>

        <h1
          className="text-white font-black leading-tight mb-6"
          style={{ fontSize: 'clamp(1.7rem, 4.5vw, 2.6rem)' }}
        >
          {r.pergunta}
        </h1>

        {/* Bloco de resposta — o que a IA cita. Tem que se sustentar sozinho. */}
        <div
          className="rounded-2xl p-5 sm:p-6 mb-10"
          style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.25)' }}
        >
          <div className="pill mb-4 inline-flex items-center gap-2 text-xs">
            <span style={{ color: '#3B82F6' }}>●</span>
            <span>Resposta direta</span>
          </div>
          {r.curta.map((p, i) => (
            <p key={i} className={`text-slate-200 leading-relaxed ${i === 0 ? 'text-base sm:text-lg font-semibold text-white' : 'text-sm sm:text-base mt-3'}`}>
              {p}
            </p>
          ))}
        </div>

        <article className="space-y-9">
          {r.blocos.map((b) => (
            <section key={b.h}>
              <h2 className="text-white font-bold text-lg sm:text-xl mb-3 leading-tight">{b.h}</h2>
              <div className="space-y-3">
                {b.p.map((p, i) => (
                  <p key={i} className="text-slate-400 text-sm sm:text-base leading-relaxed">{p}</p>
                ))}
              </div>
            </section>
          ))}
        </article>

        <section className="mt-12">
          <h2 className="text-white font-bold text-lg sm:text-xl mb-4">Perguntas relacionadas</h2>
          <div className="space-y-4">
            {r.faqs.map((f) => (
              <div
                key={f.q}
                className="rounded-xl p-4 sm:p-5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <h3 className="text-white font-semibold text-sm sm:text-base mb-2">{f.q}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA discreta, no fim — ver comentário do topo do arquivo */}
        <section
          className="mt-12 rounded-2xl p-5 sm:p-6"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <h2 className="text-white font-bold text-base sm:text-lg mb-2">
            O AgendaPRO faz essa conta sozinho
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            Agenda, caixa, comissão sobre o líquido e ficha da cliente no mesmo lugar.
            A partir de {PRICING.solo.mensalidadeCompleta}, com {PRICING.trial.dias} dias grátis e sem cartão.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/cadastro"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #06B6D4)' }}
            >
              Testar {PRICING.trial.dias} dias grátis
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 transition-colors hover:text-white"
              style={{ border: '1px solid rgba(255,255,255,0.12)' }}
            >
              Ver o sistema
            </Link>
          </div>
        </section>

        {relacionadas.length > 0 && (
          <section className="mt-10">
            <h2 className="text-white font-bold text-base sm:text-lg mb-4">Leia também</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {relacionadas.map((o) => (
                <Link
                  key={o!.slug}
                  href={`/respostas/${o!.slug}`}
                  className="rounded-xl p-4 transition-colors hover:bg-white/[0.06]"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <span className="text-white font-semibold text-sm leading-snug">{o!.pergunta}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
