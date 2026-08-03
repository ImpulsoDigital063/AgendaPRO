import type { MetadataRoute } from 'next'
import { RESPOSTAS } from '@/lib/respostas'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const BASE = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.agendapro.net.br').replace(/\/$/, '')

// Contas internas: demos de gravação/teste e a conta tutorial. São páginas
// reais e funcionais, mas não são negócio de ninguém — não entram no índice.
const SLUGS_INTERNOS = new Set(['studio-marcela', 'studio-larissa', 'demo-lash'])

// Revalida 1x por hora: cliente novo entra no sitemap sozinho, sem redeploy.
export const revalidate = 3600

/**
 * sitemap.xml (01/08/2026).
 *
 * Duas famílias de página:
 *  1. MARKETING — home + as 4 landings de nicho (/barbearia, /estetica, /nail,
 *     /salao). Existiam e não estavam sendo apontadas pra ninguém.
 *  2. CLIENTES — a página pública de cada negócio ativo (/slug) e a de
 *     agendamento (/slug/agendar). É o conteúdo que mais cresce sozinho: cada
 *     cliente novo vira duas URLs com nome do negócio, nicho e serviços.
 *
 * Negócio bloqueado (pending_payment, cancelled, refunded) fica de fora — não
 * faz sentido levar gente pra uma agenda que não aceita marcação.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const agora = new Date()

  const estaticas: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: agora, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/barbearia`, lastModified: agora, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/salao`, lastModified: agora, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/estetica`, lastModified: agora, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/nail`, lastModified: agora, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/lash`, lastModified: agora, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/respostas`, lastModified: agora, changeFrequency: 'weekly', priority: 0.8 },
    ...RESPOSTAS.map((r) => ({
      url: `${BASE}/respostas/${r.slug}`,
      lastModified: agora,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: `${BASE}/cadastro`, lastModified: agora, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/termos`, lastModified: agora, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE}/privacidade`, lastModified: agora, changeFrequency: 'yearly', priority: 0.2 },
  ]

  try {
    const sb = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const [{ data: subs }, { data: negocios }] = await Promise.all([
      sb.from('subscriptions').select('business_id, status').in('status', ['active', 'past_due']),
      sb.from('businesses').select('slug, created_at'),
    ])

    const liberados = new Set((subs ?? []).map((s) => s.business_id as string))
    const { data: idsPorSlug } = await sb.from('businesses').select('id, slug')
    const idDoSlug = new Map((idsPorSlug ?? []).map((b) => [b.slug as string, b.id as string]))

    const paginasDeCliente: MetadataRoute.Sitemap = []
    for (const n of negocios ?? []) {
      const slug = n.slug as string
      if (!slug || SLUGS_INTERNOS.has(slug)) continue
      const id = idDoSlug.get(slug)
      if (!id || !liberados.has(id)) continue
      const quando = n.created_at ? new Date(n.created_at as string) : agora
      paginasDeCliente.push(
        { url: `${BASE}/${slug}`, lastModified: quando, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${BASE}/${slug}/agendar`, lastModified: quando, changeFrequency: 'weekly', priority: 0.6 },
      )
    }

    return [...estaticas, ...paginasDeCliente]
  } catch {
    // Banco fora do ar não pode derrubar o sitemap — devolve as estáticas.
    return estaticas
  }
}
