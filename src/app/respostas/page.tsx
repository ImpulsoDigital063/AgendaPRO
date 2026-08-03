/* ═══════════════════════════════════════════════════════════════
   ÍNDICE DA CENTRAL DE RESPOSTAS

   Existe por dois motivos: dar um lugar pro Google entender que as
   respostas são um conjunto (ItemList), e dar link interno pras páginas
   filhas — página órfã, sem nada apontando pra ela, demora muito mais
   pra ser indexada.
   ═══════════════════════════════════════════════════════════════ */

import Link from 'next/link'
import type { Metadata } from 'next'
import { RESPOSTAS } from '@/lib/respostas'
import { JsonLd, breadcrumbJsonLd, organizationJsonLd, SITE_URL } from '@/lib/jsonld'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Respostas — dúvidas de quem administra salão, barbearia e studio',
  description:
    'Respostas diretas sobre preço de sistema, cálculo de comissão, taxa de maquininha e organização de agenda com várias profissionais.',
  alternates: { canonical: `${SITE_URL}/respostas` },
}

export default function RespostasIndex() {
  const dados = [
    organizationJsonLd(),
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Respostas para quem administra salão, barbearia e studio',
      itemListElement: RESPOSTAS.map((r, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: r.pergunta,
        url: `${SITE_URL}/respostas/${r.slug}`,
      })),
    },
    breadcrumbJsonLd([
      { nome: 'AgendaPRO', url: `${SITE_URL}/` },
      { nome: 'Respostas', url: `${SITE_URL}/respostas` },
    ]),
  ]

  return (
    <main className="relative min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <JsonLd data={dados} />

      <div className="container max-w-3xl px-4 py-10 sm:py-16">
        <nav className="mb-8 text-xs sm:text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-300 transition-colors">AgendaPRO</Link>
        </nav>

        <h1 className="text-white font-black leading-tight mb-4" style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)' }}>
          Respostas
        </h1>
        <p className="text-slate-400 text-base sm:text-lg leading-relaxed mb-10 max-w-2xl">
          As dúvidas que mais aparecem em conversa com dono de salão, barbearia e studio.
          Respondidas direto, sem enrolação — úteis mesmo pra quem não vai usar o sistema.
        </p>

        <div className="space-y-3">
          {RESPOSTAS.map((r) => (
            <Link
              key={r.slug}
              href={`/respostas/${r.slug}`}
              className="block rounded-2xl p-5 transition-colors hover:bg-white/[0.06]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <h2 className="text-white font-bold text-base sm:text-lg leading-snug mb-2">{r.pergunta}</h2>
              <p className="text-slate-400 text-sm leading-relaxed">{r.curta[0]}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
