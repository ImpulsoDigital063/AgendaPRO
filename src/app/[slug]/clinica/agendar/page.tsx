/* VITRINE DA CLÍNICA · 1ª etapa do agendamento no visual da vitrine:
   categoria → procedimento (variações agrupadas) → técnica, com busca.
   Daqui segue pro /[slug]/agendar com os serviços já marcados. */
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Lora, Manrope } from 'next/font/google'
import { CATEGORIAS } from '@/lib/vitrine/categorias'
import { conteudoDaVitrine } from '@/lib/vitrine/conteudo'
import { agrupar } from '@/lib/vitrine/grupos'
import Escolha from './Escolha'

// agendamento com a identidade da clínica (Eduardo 22/10): títulos em Lora, resto em Manrope, iguais à página da clínica
const serif = Lora({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-vitrine', display: 'swap' })
const sans = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-vitrine-sans', display: 'swap' })

export const metadata: Metadata = { robots: { index: false } }

export default async function EscolhaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ cupom?: string; ref?: string }>
}) {
  const { slug } = await params
  // cupom/indicação do link de campanha seguem pro /agendar, que valida e aplica
  const { cupom, ref } = await searchParams
  const chegada = new URLSearchParams()
  if (cupom) chegada.set('cupom', cupom)
  if (ref) chegada.set('ref', ref)
  const conteudo = conteudoDaVitrine(slug)
  if (!conteudo) notFound()
  const supabase = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { data: b } = await supabase.from('businesses').select('id, name, slug, brand_primary, brand_secondary, sinal_enabled, sinal_modo, sinal_percent, sinal_valor_fixo, sinal_faixa_acima, sinal_faixa_valor').eq('slug', slug).maybeSingle()
  if (!b) notFound()
  const { data: servicos } = await supabase
    .from('services')
    .select('id, name, price, duration_minutes, description')
    .eq('business_id', b.id)
    .eq('active', true)
    .eq('public_visible', true)
    .order('name')

  const grupos = agrupar(servicos ?? [])
  const categorias = CATEGORIAS.map((nome) => ({ nome, frase: conteudo.categorias?.[nome]?.frase ?? null, grupos: grupos.filter((g) => g.categoria === nome) })).filter((c) => c.grupos.length)

  return (
    <div className={`${serif.variable} ${sans.variable}`}>
      <Escolha
        slug={b.slug}
        nome={b.name}
        cor={b.brand_primary || '#A47E3B'}
        cor2={b.brand_secondary || '#CBAA62'}
        logoDourada={conteudo.logoDourada ?? null}
        sinal={b.sinal_enabled ? b : null}
        categorias={categorias}
        chegada={chegada.toString()}
      />
    </div>
  )
}
