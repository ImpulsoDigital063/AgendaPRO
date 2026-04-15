import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Business, Service } from '@/lib/types'
import GoogleReviewSection from '@/components/GoogleReviewSection'
import {
  IconMapPin,
  IconWhatsapp,
  IconClock,
  IconSparkles,
  IconArrowRight,
} from '@/components/ui/Icon'

function hexToRgba(hex: string, a: number) {
  const m = /^#([0-9A-Fa-f]{6})$/.exec(hex)
  if (!m) return `rgba(59,130,246,${a})`
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!business) notFound()

  const [{ data: services }, { data: professionals }] = await Promise.all([
    supabase
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('name'),
    supabase
      .from('professionals')
      .select('*')
      .eq('business_id', business.id)
      .eq('active', true),
  ])

  const b = business as Business & { category?: string }
  const primary = b.brand_primary || '#3B82F6'
  const secondary = b.brand_secondary || '#06B6D4'
  const mode = b.brand_mode || 'dark'
  const isDark = mode === 'dark'

  const bg = isDark ? '#050713' : '#F6F8FC'
  const surface = isDark ? 'rgba(15,25,56,0.55)' : '#FFFFFF'
  const surfaceBorder = isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
  const text = isDark ? '#F8FAFC' : '#0F172A'
  const muted = isDark ? '#94A3B8' : '#64748B'
  const subtle = isDark ? '#64748B' : '#94A3B8'
  const cover = `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`

  return (
    <main
      className="relative overflow-x-hidden"
      style={
        {
          minHeight: '100svh',
          background: bg,
          color: text,
          ['--brand-primary' as string]: primary,
          ['--brand-secondary' as string]: secondary,
        } as React.CSSProperties
      }
    >
      {/* Orbs decorativos em dark */}
      {isDark && (
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div
            className="absolute -top-40 right-1/4 w-[420px] h-[420px] rounded-full blur-[110px] opacity-60"
            style={{ background: hexToRgba(primary, 0.25) }}
          />
          <div
            className="absolute top-1/3 -left-20 w-80 h-80 rounded-full blur-[90px] opacity-50"
            style={{ background: hexToRgba(secondary, 0.20) }}
          />
        </div>
      )}

      {/* Cover */}
      <div className="relative overflow-hidden">
        <div className="h-32 sm:h-40 w-full" style={{ background: cover }} />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isDark
              ? 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.18) 0%, transparent 60%)'
              : 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.25) 0%, transparent 60%)',
          }}
        />
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-12 pb-10 relative">
        {/* Identidade */}
        <div
          className="rounded-3xl p-5 mb-5 backdrop-blur-xl"
          style={{
            background: surface,
            border: `1px solid ${surfaceBorder}`,
            boxShadow: isDark
              ? '0 20px 60px -20px rgba(0,0,0,0.6)'
              : '0 12px 40px -12px rgba(15,23,42,0.15)',
          }}
        >
          <div className="flex items-end gap-4 -mt-12 mb-3">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold flex-shrink-0 overflow-hidden"
              style={{
                background: cover,
                color: 'white',
                border: `4px solid ${isDark ? '#050713' : '#FFFFFF'}`,
                boxShadow: `0 10px 30px -10px ${hexToRgba(primary, 0.6)}`,
              }}
            >
              {b.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.logo_url} alt={b.name} className="w-full h-full object-cover" />
              ) : (
                b.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="pb-2 flex-1 min-w-0">
              {b.category && (
                <span
                  className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
                  style={{
                    background: hexToRgba(primary, 0.15),
                    color: primary,
                    border: `1px solid ${hexToRgba(primary, 0.3)}`,
                  }}
                >
                  <IconSparkles size={10} />
                  {b.category}
                </span>
              )}
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight" style={{ color: text }}>
            {b.name}
          </h1>
          {b.description && (
            <p className="text-sm mt-2 leading-relaxed" style={{ color: muted }}>
              {b.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            {b.address && (
              <span
                className="text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                  color: muted,
                }}
              >
                <IconMapPin size={12} />
                {b.address}
              </span>
            )}
            {b.phone && (
              <a
                href={`https://wa.me/55${b.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-transform hover:scale-105"
                style={{
                  background: hexToRgba(primary, 0.15),
                  color: primary,
                  border: `1px solid ${hexToRgba(primary, 0.3)}`,
                }}
              >
                <IconWhatsapp size={12} />
                {b.phone}
              </a>
            )}
          </div>
        </div>

        {/* CTA Agendar */}
        <Link
          href={`/${slug}/agendar`}
          className="group w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.98] mb-6"
          style={{
            background: cover,
            color: 'white',
            boxShadow: `0 14px 40px -14px ${hexToRgba(primary, 0.7)}`,
          }}
        >
          Agendar horário
          <span className="transition-transform group-hover:translate-x-1">
            <IconArrowRight size={20} />
          </span>
        </Link>

        {/* Profissionais (se múltiplos) */}
        {professionals && professionals.length > 1 && (
          <section className="mb-6">
            <h2
              className="text-xs font-semibold uppercase tracking-[0.2em] mb-3"
              style={{ color: subtle }}
            >
              Equipe
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {professionals.map((pro) => (
                <div
                  key={pro.id}
                  className="flex-shrink-0 flex flex-col items-center gap-2 w-20"
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden"
                    style={{
                      background: hexToRgba(primary, 0.15),
                      color: primary,
                      border: `2px solid ${hexToRgba(primary, 0.3)}`,
                    }}
                  >
                    {pro.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={pro.photo_url} alt={pro.name} className="w-full h-full object-cover" />
                    ) : (
                      pro.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span
                    className="text-xs font-medium text-center leading-tight line-clamp-2"
                    style={{ color: text }}
                  >
                    {pro.name}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Serviços */}
        {services && services.length > 0 && (
          <section className="mb-6">
            <h2
              className="text-xs font-semibold uppercase tracking-[0.2em] mb-3"
              style={{ color: subtle }}
            >
              Serviços
            </h2>
            <div
              className="rounded-2xl overflow-hidden backdrop-blur-xl"
              style={{
                background: surface,
                border: `1px solid ${surfaceBorder}`,
              }}
            >
              {(services as Service[]).map((service, index) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between px-4 py-4"
                  style={{
                    borderBottom:
                      index < services.length - 1
                        ? `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9'}`
                        : 'none',
                  }}
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="font-semibold truncate" style={{ color: text }}>
                      {service.name}
                    </p>
                    <div className="text-xs mt-1 flex items-center gap-2 flex-wrap" style={{ color: muted }}>
                      <span className="inline-flex items-center gap-1">
                        <IconClock size={11} /> {service.duration_minutes} min
                      </span>
                      {service.points > 0 && (
                        <span
                          className="inline-flex items-center gap-1"
                          style={{ color: primary }}
                        >
                          <IconSparkles size={11} /> +{service.points} pts
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {service.price ? (
                      <p className="font-bold" style={{ color: text }}>
                        {Number(service.price).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </p>
                    ) : (
                      <p className="text-sm" style={{ color: muted }}>sob consulta</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Google Reviews */}
        {b.google_place_id && (
          <section className="mb-6">
            <GoogleReviewSection
              businessId={b.id}
              googleMapsUrl={b.google_place_id!}
              rating={b.google_rating}
              reviewsCount={b.google_reviews_count}
              pointsForReview={b.points_for_review}
            />
          </section>
        )}

        {/* CTA repetida no fim */}
        <Link
          href={`/${slug}/agendar`}
          className="group w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] mb-6"
          style={{
            background: cover,
            color: 'white',
            boxShadow: `0 14px 40px -14px ${hexToRgba(primary, 0.7)}`,
          }}
        >
          Agendar agora
          <span className="transition-transform group-hover:translate-x-1">
            <IconArrowRight size={18} />
          </span>
        </Link>

        {/* Footer */}
        <div className="text-center space-y-2 pt-4">
          <Link href="/" className="inline-flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
            <Image
              src="/logo-agendapro-dark.svg"
              alt="AgendaPRO"
              width={100}
              height={20}
              style={{ filter: isDark ? 'none' : 'invert(0.85)' }}
            />
          </Link>
          <p className="text-xs" style={{ color: subtle }}>
            Agendamento por AgendaPRO · Impulso Digital
          </p>
          <div className="flex justify-center gap-3 text-xs" style={{ color: muted }}>
            <Link href="/privacidade" className="underline underline-offset-2 hover:opacity-80">
              Privacidade
            </Link>
            <span style={{ color: subtle }}>·</span>
            <Link href="/termos" className="underline underline-offset-2 hover:opacity-80">
              Termos
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
