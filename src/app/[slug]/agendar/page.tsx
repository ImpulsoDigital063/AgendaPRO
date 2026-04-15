import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import BookingFlow from '@/components/BookingFlow'
import type { Business } from '@/lib/types'
import { IconArrowLeft } from '@/components/ui/Icon'

export default async function AgendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ ref?: string }>
}) {
  const { slug } = await params
  const { ref: referralCode } = await searchParams
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!business) notFound()

  const { data: professionals } = await supabase
    .from('professionals')
    .select('*')
    .eq('business_id', business.id)
    .eq('active', true)

  const [{ data: workingHours }, { data: services }] = await Promise.all([
    supabase
      .from('working_hours')
      .select('*')
      .in('professional_id', (professionals || []).map((p) => p.id)),
    supabase
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('name'),
  ])

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
        {/* Header com cover branded */}
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
                {b.name}
              </h1>
              <p className="text-xs" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                Escolha um horário
              </p>
            </div>
          </div>
        </div>

        {/* BookingFlow — usa var(--brand-primary) automaticamente nos botões */}
        <div
          className={isDark ? 'text-white [&_h2]:!text-slate-300 [&_p]:!text-slate-300' : ''}
        >
          <BookingFlow
            business={b}
            professionals={professionals || []}
            workingHours={workingHours || []}
            services={services || []}
            referralCode={referralCode}
          />
        </div>

        {/* Footer */}
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
          <div className="flex justify-center gap-3 text-xs" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
            <Link href="/privacidade" className="underline underline-offset-2 hover:opacity-80">
              Privacidade
            </Link>
            <span style={{ color: isDark ? '#475569' : '#CBD5E1' }}>·</span>
            <Link href="/termos" className="underline underline-offset-2 hover:opacity-80">
              Termos
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
