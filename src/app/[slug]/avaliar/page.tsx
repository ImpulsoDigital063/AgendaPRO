import { createPublicClient } from '@/lib/supabase/publico'
import { notFound } from 'next/navigation'
import { destinoDoAtalho } from '@/lib/atalho-slug'
import { SeguirAtalho } from '../ExtrasDoLink'
import Link from 'next/link'
import Image from 'next/image'
import { IconArrowLeft } from '@/components/ui/Icon'
import AvaliarClient from './AvaliarClient'
import type { Business } from '@/lib/types'
import { buildBusinessMetadata } from '@/lib/public-metadata'
import { extractGoogleReviewUrl } from '@/lib/google-review'

/* Destino do botão "Pedir avaliação" da ficha (29/10/2026, bug Wanessa): o
   link cru do Google não avisava o AgendaPRO, então não nascia pendência e os
   pontos não entravam. Aqui a cliente toca, o pedido cai na ficha dela e o
   Google abre. Em cache como /meus-pontos; o ?c= é lido no navegador. */
export const revalidate = 60
export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return buildBusinessMetadata(slug, 'avaliar')
}

export default async function AvaliarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createPublicClient()

  const { data: business } = await supabase
    .from('businesses')
    .select(
      'id, name, slug, brand_primary, brand_secondary, brand_mode, google_place_id, google_rating, google_reviews_count, points_for_review'
    )
    .eq('slug', slug)
    .single()

  if (!business) {
    const destino = await destinoDoAtalho(supabase, slug)
    if (destino) return <SeguirAtalho destino={`/${destino}/avaliar`} />
    notFound()
  }

  const b = business as Business
  const googleUrl = extractGoogleReviewUrl(b.google_place_id)
  if (!googleUrl) notFound()

  const { data: rewards } = await supabase
    .from('rewards')
    .select('name, points_required')
    .eq('business_id', b.id)
    .eq('active', true)
    .order('points_required', { ascending: true })
    .limit(1)
  const cheapest = rewards?.[0] ?? null

  const primary = b.brand_primary || '#3B82F6'
  const secondary = b.brand_secondary || '#06B6D4'
  const cover = `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`

  return (
    <main
      className="min-h-screen"
      style={
        {
          background: '#F8FAFC',
          color: '#0F172A',
          ['--brand-primary' as string]: primary,
          ['--brand-secondary' as string]: secondary,
        } as React.CSSProperties
      }
    >
      <div className="max-w-lg mx-auto">
        <div className="relative overflow-hidden">
          <div className="h-20 w-full" style={{ background: cover }} />
          <div
            className="px-4 py-4 flex items-center gap-3 backdrop-blur-xl border-b"
            style={{ background: 'rgba(255,255,255,0.85)', borderColor: '#E2E8F0' }}
          >
            <Link
              href={`/${slug}`}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110"
              style={{ background: '#F1F5F9', color: '#0F172A', border: '1px solid #E2E8F0' }}
              aria-label="Voltar"
            >
              <IconArrowLeft size={18} />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold truncate">Avaliar no Google</h1>
              <p className="text-xs" style={{ color: '#64748B' }}>
                {b.name}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 pt-6">
          <AvaliarClient
            businessId={b.id}
            googleMapsUrl={googleUrl}
            rating={b.google_rating}
            reviewsCount={b.google_reviews_count}
            pointsForReview={b.points_for_review}
            slug={b.slug}
            cheapestReward={cheapest ? { name: cheapest.name, pointsRequired: cheapest.points_required } : null}
          />
        </div>

        <div className="text-center space-y-2 py-8 px-4">
          <Link href="/" className="inline-flex items-center opacity-70 hover:opacity-100 transition-opacity">
            <Image src="/logo-agendapro-dark.svg" alt="AgendaPRO" width={100} height={20} style={{ filter: 'invert(0.85)' }} />
          </Link>
          <p className="text-xs" style={{ color: '#94A3B8' }}>
            Agendamento por AgendaPRO · Impulso Digital
          </p>
        </div>
      </div>
    </main>
  )
}
