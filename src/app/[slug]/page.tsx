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
  IconInstagram,
} from '@/components/ui/Icon'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function hexToRgba(hex: string, a: number) {
  const m = /^#([0-9A-Fa-f]{6})$/.exec(hex)
  if (!m) return `rgba(59,130,246,${a})`
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export default async function BusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ ref?: string; preview?: string }>
}) {
  const { slug } = await params
  const { ref, preview } = await searchParams
  const agendarHref = ref ? `/${slug}/agendar?ref=${ref}` : `/${slug}/agendar`
  // Quando admin clica "Ver minha pagina real" na aba Aparencia, abre
  // a pagina publica com ?preview=admin pra mostrar banner sticky de
  // voltar (sem isso o admin ficava sem caminho de retorno).
  const isAdminPreview = preview === 'admin'
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug, description, address, phone, logo_url, cover_url, owner_id, created_at, brand_primary, brand_secondary, brand_mode, category, google_place_id, google_rating, google_reviews_count, points_for_review, points_for_referral, instagram_url, facebook_url, tiktok_url, website_url')
    .eq('slug', slug)
    .single()

  if (!business) notFound()

  const [{ data: services }, { data: professionals }, { data: cheapestReward }] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, price, duration_minutes, points, active')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('name'),
    supabase
      .from('professionals')
      .select('id, name, photo_url, active, created_at')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('created_at', { ascending: true }),
    supabase
      .from('rewards')
      .select('id, name, points_required')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('points_required', { ascending: true })
      .limit(1)
      .maybeSingle(),
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
      {/* Banner sticky pra admin que abriu via "Ver minha página real"
          na aba Aparencia. Sem isso, admin ficava preso na pagina
          publica sem caminho de retorno (especialmente em PWA standalone). */}
      {isAdminPreview && (
        <Link
          href="/admin/configuracoes?tab=aparencia"
          className="sticky top-0 z-50 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, #0F172A, #1E293B)',
            color: '#FFFFFF',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 12px -4px rgba(0,0,0,0.4)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Voltar pra Aparência
        </Link>
      )}
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

      {/* Cover — usa foto se admin subiu, senão gradient da brand.
          object-position 'center 25%' puxa o foco pro terço superior:
          em foto de fachada/ambiente o conteúdo importante normalmente
          está mais em cima (placa, vitrine, logo do estabelecimento). */}
      <div className="relative overflow-hidden">
        <div className="h-44 sm:h-56 w-full" style={{ background: cover }}>
          {b.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={b.cover_url}
              alt={`Capa ${b.name}`}
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center 25%' }}
            />
          )}
        </div>
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
          <div className="flex items-end gap-4 -mt-16 mb-3">
            <div
              className="w-28 h-28 rounded-3xl flex items-center justify-center text-4xl font-bold flex-shrink-0 overflow-hidden"
              style={{
                background: b.logo_url ? (isDark ? '#050713' : '#FFFFFF') : cover,
                color: 'white',
                border: `4px solid ${isDark ? '#050713' : '#FFFFFF'}`,
                boxShadow: `0 16px 44px -14px ${hexToRgba(primary, 0.65)}`,
              }}
            >
              {b.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.logo_url} alt={b.name} className="w-full h-full object-contain p-1" />
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

          {(b.instagram_url || b.facebook_url || b.tiktok_url || b.website_url) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {b.instagram_url && (
                <a
                  href={b.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-9 h-9 rounded-full inline-flex items-center justify-center transition-transform hover:scale-110"
                  style={{
                    background: hexToRgba(primary, 0.12),
                    color: primary,
                    border: `1px solid ${hexToRgba(primary, 0.3)}`,
                  }}
                >
                  <IconInstagram size={16} />
                </a>
              )}
              {b.facebook_url && (
                <a
                  href={b.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="w-9 h-9 rounded-full inline-flex items-center justify-center transition-transform hover:scale-110"
                  style={{
                    background: hexToRgba(primary, 0.12),
                    color: primary,
                    border: `1px solid ${hexToRgba(primary, 0.3)}`,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
                  </svg>
                </a>
              )}
              {b.tiktok_url && (
                <a
                  href={b.tiktok_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="w-9 h-9 rounded-full inline-flex items-center justify-center transition-transform hover:scale-110"
                  style={{
                    background: hexToRgba(primary, 0.12),
                    color: primary,
                    border: `1px solid ${hexToRgba(primary, 0.3)}`,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.16a8.07 8.07 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.59z" />
                  </svg>
                </a>
              )}
              {b.website_url && (
                <a
                  href={b.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Site"
                  className="w-9 h-9 rounded-full inline-flex items-center justify-center transition-transform hover:scale-110"
                  style={{
                    background: hexToRgba(primary, 0.12),
                    color: primary,
                    border: `1px solid ${hexToRgba(primary, 0.3)}`,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </a>
              )}
            </div>
          )}
        </div>

        {/* CTA Agendar */}
        <Link
          href={agendarHref}
          className="group w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.98] mb-3"
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

        {/* Secundário: meus pontos + agendamentos ativos */}
        <Link
          href={`/${slug}/meus-pontos`}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all hover:opacity-90 mb-6"
          style={{
            background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
            color: isDark ? '#F8FAFC' : '#0F172A',
            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0',
          }}
        >
          Meus pontos e agendamentos
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
                      background: pro.photo_url ? 'transparent' : cover,
                      color: '#FFFFFF',
                      border: `2px solid ${hexToRgba(primary, 0.3)}`,
                      boxShadow: `0 6px 16px -6px ${hexToRgba(primary, 0.45)}`,
                    }}
                  >
                    {pro.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pro.photo_url}
                        alt={pro.name}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: 'center 20%' }}
                      />
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
              brandMode={mode}
              slug={slug}
              cheapestReward={
                cheapestReward
                  ? { name: cheapestReward.name, pointsRequired: cheapestReward.points_required }
                  : null
              }
            />
          </section>
        )}

        {/* CTA repetida no fim */}
        <Link
          href={agendarHref}
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
