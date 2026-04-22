import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { IconArrowLeft } from '@/components/ui/Icon'
import MeusPontosClient from './MeusPontosClient'
import type { Business } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MeusPontosPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug, brand_primary, brand_secondary, brand_mode')
    .eq('slug', slug)
    .single()

  if (!business) notFound()

  const { data: cheapestReward } = await supabase
    .from('rewards')
    .select('id, name, points_required')
    .eq('business_id', business.id)
    .eq('active', true)
    .order('points_required', { ascending: true })
    .limit(1)
    .maybeSingle()

  const b = business as Business
  const primary = b.brand_primary || '#3B82F6'
  const secondary = b.brand_secondary || '#06B6D4'
  const mode = b.brand_mode || 'dark'
  const isDark = mode === 'dark'
  const cover = `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`

  return (
    <main
      className="min-h-screen"
      style={
        {
          background: isDark ? '#050713' : '#F8FAFC',
          color: isDark ? '#F8FAFC' : '#0F172A',
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
            style={{
              background: isDark ? 'rgba(5,7,19,0.85)' : 'rgba(255,255,255,0.85)',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
            }}
          >
            <Link
              href={`/${slug}`}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                color: isDark ? '#F8FAFC' : '#0F172A',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
              }}
              aria-label="Voltar"
            >
              <IconArrowLeft size={18} />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold truncate" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                Meus pontos
              </h1>
              <p className="text-xs" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                {b.name}
              </p>
            </div>
          </div>
        </div>

        <MeusPontosClient
          businessId={b.id}
          slug={b.slug}
          businessName={b.name}
          isDark={isDark}
          cheapestReward={
            cheapestReward
              ? { name: cheapestReward.name, pointsRequired: cheapestReward.points_required }
              : null
          }
        />

        <div className="text-center space-y-2 py-8 px-4">
          <Link href="/" className="inline-flex items-center opacity-70 hover:opacity-100 transition-opacity">
            <Image
              src="/logo-agendapro-dark.svg"
              alt="AgendaPRO"
              width={100}
              height={20}
              style={{ filter: isDark ? 'none' : 'invert(0.85)' }}
            />
          </Link>
          <p className="text-xs" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
            Agendamento por AgendaPRO · Impulso Digital
          </p>
        </div>
      </div>
    </main>
  )
}
