import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { extractGoogleReviewUrl } from '@/lib/google-review'
import { notFound } from 'next/navigation'
import { JsonLd, localBusinessJsonLd } from '@/lib/jsonld'
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
  IconPhone,
  IconCalendar,
  IconGift,
  IconStar,
} from '@/components/ui/Icon'
import PointsTrailModal from '@/components/PointsTrailModal'

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
  searchParams: Promise<{ ref?: string; preview?: string; cupom?: string }>
}) {
  const { slug } = await params
  const { ref, preview, cupom } = await searchParams
  // Propaga ref e cupom pro link de agendar — sem isso o cliente
  // perde o cupom ao clicar "Agendar horário" daqui.
  const agendarParams = new URLSearchParams()
  if (ref) agendarParams.set('ref', ref)
  if (cupom) agendarParams.set('cupom', cupom)
  const agendarQuery = agendarParams.toString()
  const agendarHref = agendarQuery ? `/${slug}/agendar?${agendarQuery}` : `/${slug}/agendar`
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

  // Valida cupom (se vier ?cupom=X) — server-side, sem expor lógica
  let appliedCoupon: { code: string; discount_type: 'fixed' | 'percent'; discount_value: number } | null = null
  if (cupom) {
    const { data: coupon } = await supabase
      .from('coupons')
      .select('code, discount_type, discount_value, expires_at, used_at')
      .eq('code', cupom.toUpperCase())
      .eq('business_id', business.id)
      .maybeSingle()
    if (coupon && !coupon.used_at && new Date(coupon.expires_at) > new Date()) {
      appliedCoupon = {
        code: coupon.code,
        discount_type: coupon.discount_type as 'fixed' | 'percent',
        discount_value: Number(coupon.discount_value),
      }
    }
  }

  // Valida ref (se vier ?ref=X) e busca nome do indicador.
  // CIC rodada 6 reportou: ref era silencioso, indicado nao sabia que
  // tinha sido indicado. Banner simetrico ao cupom da feedback ao
  // indicado E confirma pro indicador que o link "vale".
  let referrer: { name: string; pointsForReferral: number } | null = null
  if (ref) {
    // customers tem RLS travado (fix Fase 1) — lookup de indicador via
    // service_role (página pública = role anon, não enxergaria a row).
    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const { data: refCustomer } = await svc
      .from('customers')
      .select('name, business_id')
      .eq('referral_code', ref)
      .eq('business_id', business.id)
      .maybeSingle()
    if (refCustomer) {
      referrer = {
        name: refCustomer.name,
        pointsForReferral: business.points_for_referral ?? 0,
      }
    }
  }

  const [{ data: services }, { data: professionals }, { data: cheapestReward }] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, price, duration_minutes, points, active')
      .eq('business_id', business.id)
      .eq('active', true)
      // v107 · serviço interno: o dono usa ao marcar, a cliente não vê.
      .eq('public_visible', true)
      .order('name'),
    supabase
      .from('professionals')
      .select('id, name, photo_url, active, created_at')
      .eq('business_id', business.id)
      .eq('active', true)
      .eq('does_appointments', true)
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
  const mode = b.brand_mode || 'light'
  const isDark = mode === 'dark'

  const bg = isDark ? '#050713' : '#F6F8FC'
  const surface = isDark ? 'rgba(15,25,56,0.55)' : '#FFFFFF'
  const surfaceBorder = isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
  const text = isDark ? '#F8FAFC' : '#0F172A'
  const muted = isDark ? '#94A3B8' : '#64748B'
  const subtle = isDark ? '#64748B' : '#94A3B8'
  const cover = `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`

  // JSON-LD do negócio: faz a página do cliente poder aparecer em busca local
  // ("nail designer em Fortaleza") e em resposta de IA. Só emite campo que o
  // dono preencheu — ver src/lib/jsonld.tsx.
  const negocioJsonLd = localBusinessJsonLd({
    name: b.name,
    slug: b.slug,
    description: b.description,
    address: b.address,
    phone: b.phone,
    logo: b.logo_url,
    cover: b.cover_url,
    rating: b.google_rating,
    reviews: b.google_reviews_count,
    category: b.category,
    services: ((services as Service[]) ?? []).map((sv) => ({ name: sv.name, price: sv.price })),
  })

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
      <JsonLd data={negocioJsonLd} />

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
                // Quando há logo, sempre fundo BRANCO (independente do
                // modo) — logos típicas têm fundo branco/transparente
                // ou cores escuras, então fundo branco preserva a
                // legibilidade em todos os casos. Em dark, o "ilha
                // branca" arredondada destaca visualmente em vez de
                // sumir.
                background: b.logo_url ? '#FFFFFF' : cover,
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
              // Endereco agora abre Google Maps em nova aba (CIC rodada 6:
              // cliente em mobile clicava esperando ir pro Maps, era pill
              // estatica). encodeURIComponent garante chars especiais.
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-transform hover:scale-105"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                  color: muted,
                }}
              >
                <IconMapPin size={12} />
                {b.address}
              </a>
            )}
            {b.phone && (
              // Pill clara: WhatsApp e' a acao primaria pra barbearia
              // (CIC rodada 6 reportou que cliente esperava tel: e abria
              // WA — agora o icone WA explicita o destino).
              <a
                href={`https://wa.me/55${b.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Falar no WhatsApp"
                className="text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-transform hover:scale-105 font-semibold"
                style={{
                  background: hexToRgba(primary, 0.15),
                  color: primary,
                  border: `1px solid ${hexToRgba(primary, 0.3)}`,
                }}
              >
                <IconWhatsapp size={12} />
                WhatsApp
              </a>
            )}
            {b.phone && (
              // Telefone com tel: pra quem prefere ligar (idoso, urgencia).
              // Coexiste com WhatsApp acima — cliente escolhe canal.
              <a
                href={`tel:+55${b.phone.replace(/\D/g, '')}`}
                title="Ligar"
                className="text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-transform hover:scale-105"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                  color: muted,
                }}
              >
                <IconPhone size={12} />
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

        {/* Banner de indicacao — quando vier ?ref=X valido. Simetrico
            ao cupom: laranja (em vez de verde) pra distinguir visualmente.
            CIC rodada 6 #3: feedback que faltava pro indicado/indicador. */}
        {referrer && (
          <div
            className="rounded-2xl p-4 mb-3 flex items-center gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.06))',
              border: '1px solid rgba(245,158,11,0.40)',
            }}
          >
            <span
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
              style={{ background: 'rgba(245,158,11,0.20)' }}
            >
              👋
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-bold leading-tight" style={{ color: '#F59E0B' }}>
                Indicação de {referrer.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: muted }}>
                {referrer.pointsForReferral > 0
                  ? `Agende seu primeiro horário e ${referrer.name} ganha +${referrer.pointsForReferral} pts. Você também acumula pontos a partir do primeiro corte.`
                  : `Agende seu horário — você acumula pontos pelos serviços daqui em diante.`}
              </p>
            </div>
          </div>
        )}

        {/* Banner de cupom — quando vier ?cupom=X e for válido */}
        {appliedCoupon && (
          <div
            className="rounded-2xl p-4 mb-3 flex items-center gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(16,185,129,0.06))',
              border: '1px solid rgba(16,185,129,0.4)',
            }}
          >
            <span
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
              style={{ background: 'rgba(16,185,129,0.2)' }}
            >
              🎁
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-bold leading-tight" style={{ color: '#10B981' }}>
                Cupom {appliedCoupon.code} aplicado
              </p>
              <p className="text-xs mt-0.5" style={{ color: muted }}>
                {appliedCoupon.discount_type === 'percent'
                  ? `${appliedCoupon.discount_value}% de desconto na sua próxima visita`
                  : `R$ ${appliedCoupon.discount_value.toFixed(2).replace('.', ',')} de desconto na sua próxima visita`}
              </p>
            </div>
          </div>
        )}

        {/* Popup "Como funciona os pontos" — abre toda vez (Eduardo 05/06).
            Mesmo gate da trilha inline: só se o negócio usa pontos. */}
        {(((services as Service[]) ?? []).some((s) => (s.points ?? 0) > 0) ||
          cheapestReward ||
          (b.points_for_review ?? 0) > 0 ||
          (b.points_for_referral ?? 0) > 0) && (
          <PointsTrailModal
            agendarHref={agendarHref}
            meusPontosHref={`/${slug}/meus-pontos`}
            primary={primary}
            cheapestReward={
              cheapestReward
                ? { name: cheapestReward.name, pointsRequired: cheapestReward.points_required }
                : null
            }
            pointsForReview={b.points_for_review ?? 0}
            pointsForReferral={b.points_for_referral ?? 0}
          />
        )}

        {/* CTA Agendar — SEMPRE verde + pulsando (padrão global, sobrepõe a cor
            da marca neste botão pra conversão · pedido Eduardo 05/06) */}
        <Link
          href={agendarHref}
          className="cta-pulse-green group w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.98] mb-3"
          style={{
            background: 'linear-gradient(180deg, #22C55E 0%, #16A34A 100%)',
            color: 'white',
          }}
        >
          {appliedCoupon ? 'Agendar e usar cupom' : 'Agendar horário'}
          <span className="transition-transform group-hover:translate-x-1">
            <IconArrowRight size={20} />
          </span>
        </Link>

        {/* Secundário com mais destaque: meus pontos + agendamentos (acento
            âmbar = pontos, elevado, ícone + seta · pedido Eduardo 05/06) */}
        <Link
          href={`/${slug}/meus-pontos`}
          className="group w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] mb-6"
          style={{
            background: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
            color: isDark ? '#F8FAFC' : '#0F172A',
            border: isDark ? '1px solid rgba(245,158,11,0.35)' : '1px solid #FDE68A',
            boxShadow: '0 8px 24px -12px rgba(245,158,11,0.45)',
          }}
        >
          <IconSparkles size={16} style={{ color: '#F59E0B' }} />
          Meus pontos e agendamentos
          <span className="transition-transform group-hover:translate-x-0.5">
            <IconArrowRight size={16} />
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

        {/* Trilha de pontos — "Como funciona" (3 passos) · pedido Eduardo 05/06.
            Só aparece se o negócio realmente usa pontos (serviço com pts, prêmio,
            avaliação ou indicação) — não polui quem tem fidelidade desligada. */}
        {(((services as Service[]) ?? []).some((s) => (s.points ?? 0) > 0) ||
          cheapestReward ||
          (b.points_for_review ?? 0) > 0 ||
          (b.points_for_referral ?? 0) > 0) && (
          <section className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: subtle }}>
              Como funciona os pontos
            </h2>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {([
                { Icon: IconCalendar, t: 'Agende', d: 'Ganhe pontos a cada serviço' },
                { Icon: IconSparkles, t: 'Acumule', d: 'Seus pontos somam a cada visita' },
                {
                  Icon: IconGift,
                  t: 'Troque',
                  d: cheapestReward
                    ? `Por ${cheapestReward.name} · ${cheapestReward.points_required} pts`
                    : 'Por serviços grátis',
                },
              ] as const).map((s, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-3 text-center"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0'}`,
                  }}
                >
                  <span
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl mb-2"
                    style={{ background: hexToRgba(primary, isDark ? 0.18 : 0.1), color: primary }}
                  >
                    <s.Icon size={18} />
                  </span>
                  <p className="font-bold text-sm" style={{ color: text }}>{s.t}</p>
                  <p className="text-[11px] leading-snug mt-0.5" style={{ color: muted }}>{s.d}</p>
                </div>
              ))}
            </div>
            {((b.points_for_review ?? 0) > 0 || (b.points_for_referral ?? 0) > 0) && (
              <div className="flex flex-col gap-1.5">
                {(b.points_for_review ?? 0) > 0 && (
                  <p className="flex items-center gap-2 text-xs" style={{ color: muted }}>
                    <IconStar size={13} style={{ color: '#F59E0B' }} />
                    Avalie no Google e ganhe <strong style={{ color: text }}>+{b.points_for_review} pts</strong>
                  </p>
                )}
                {(b.points_for_referral ?? 0) > 0 && (
                  <p className="flex items-center gap-2 text-xs" style={{ color: muted }}>
                    <IconSparkles size={13} style={{ color: '#F59E0B' }} />
                    Indique um amigo e ganhe <strong style={{ color: text }}>+{b.points_for_referral} pts</strong>
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* Google Reviews */}
        {extractGoogleReviewUrl(b.google_place_id) && (
          <section className="mb-6">
            <GoogleReviewSection
              businessId={b.id}
              googleMapsUrl={extractGoogleReviewUrl(b.google_place_id)!}
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

        {/* CTA repetida no fim — também verde + pulse (consistência · Eduardo 05/06).
            SÓ em página longa (29/07/2026): com poucos serviços a página inteira
            cabe numa tela, e aí os dois CTAs verdes aparecem juntos e viram
            bagunça (caso DN Diogo Nogueira, 1 serviço). Acima de 3 serviços o
            cliente rolou até aqui e a repetição volta a fazer sentido — Olímpio,
            Studio Marcela e cia. continuam vendo igual. */}
        {(services?.length ?? 0) > 3 && (
        <Link
          href={agendarHref}
          className="cta-pulse-green group w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] mb-6"
          style={{
            background: 'linear-gradient(180deg, #22C55E 0%, #16A34A 100%)',
            color: 'white',
          }}
        >
          Agendar agora
          <span className="transition-transform group-hover:translate-x-1">
            <IconArrowRight size={18} />
          </span>
        </Link>
        )}

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
