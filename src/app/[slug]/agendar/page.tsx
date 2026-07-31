import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { generateCancelToken } from '@/lib/token'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import BookingFlow from '@/components/BookingFlow'
import type { Business, Professional } from '@/lib/types'
import { BookingBackProvider, BookingBackButton } from '@/components/BookingBack'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AgendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ ref?: string; date?: string; time?: string; prof?: string; w?: string; cupom?: string }>
}) {
  const { slug } = await params
  const { ref: referralCode, date: prefillDate, time: prefillTime, prof: prefillProf, w: waitlistId, cupom: couponCode } = await searchParams
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug, description, phone, address, logo_url, owner_id, created_at, brand_primary, brand_secondary, brand_mode, category, google_place_id, google_rating, google_reviews_count, points_for_review, points_for_referral, instagram_url, facebook_url, tiktok_url, website_url, whatsapp_instance_id, whatsapp_token, slot_interval_minutes, max_daily_appointments, no_show_punishment_enabled, no_show_penalty_mode, no_show_fixed_points, booking_days_with_service')
    .eq('slug', slug)
    .single()

  if (!business) notFound()

  const { data: allProfessionals } = await supabase
    .from('professionals')
    .select('id, name, photo_url, active, business_id, created_at')
    .eq('business_id', business.id)
    .eq('active', true)
    .order('created_at', { ascending: true })

  const [{ data: workingHours }, { data: services }] = await Promise.all([
    supabase
      .from('working_hours')
      .select('id, professional_id, day_of_week, start_time, end_time, slot_duration')
      .in('professional_id', (allProfessionals || []).map((p) => p.id)),
    supabase
      .from('services')
      .select('id, name, description, price, duration_minutes, points, active, business_id')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('name'),
  ])

  // Filtra profissionais SEM working_hours configurado — eles nao
  // teriam slot disponivel mesmo se cliente os escolhesse, gerando
  // tela vazia. CIC rodada 4 reportou (item 8.3): prof "Teste QA"
  // sem horarios aparecia no fluxo publico, cliente clicava e via
  // mensagem generica "Sem horario disponivel". Filtro upstream =
  // melhor UX (cliente nao chega nessa parede).
  const profsWithHours = new Set(
    (workingHours || []).map((wh) => wh.professional_id)
  )
  const professionals = (allProfessionals || []).filter((p) => profsWithHours.has(p.id))

  // Prefill vindo do email da fila de espera (?w=<waitlist_id>).
  // Busca dados do registro + checa se o cliente já tem outro agendamento no mesmo dia.
  type Prefill = {
    name: string
    phone: string
    email: string
    date: string
    time: string
    professionalId: string
    serviceIds: string[]
    otherAppointment: { id: string; start_time: string; cancel_token: string } | null
  } | null

  let prefill: Prefill = null
  if (waitlistId && prefillDate && prefillTime && prefillProf) {
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: w } = await admin
      .from('waitlist')
      .select('client_name, client_phone, client_email, business_id, professional_id, appointment_date, start_time, service_ids')
      .eq('id', waitlistId)
      .maybeSingle()

    if (w && w.business_id === business.id) {
      const { data: other } = await admin
        .from('appointments')
        .select('id, start_time')
        .eq('business_id', business.id)
        .eq('client_phone', w.client_phone)
        .eq('appointment_date', prefillDate)
        .eq('status', 'confirmed')
        .order('start_time')
        .limit(1)
        .maybeSingle()

      prefill = {
        name: w.client_name,
        phone: w.client_phone,
        email: w.client_email || '',
        date: prefillDate,
        time: prefillTime,
        professionalId: prefillProf,
        serviceIds: (w.service_ids as string[] | null) || [],
        otherAppointment: other
          ? {
              id: other.id,
              start_time: other.start_time.slice(0, 5),
              cancel_token: generateCancelToken(other.id),
            }
          : null,
      }
    }
  }

  // Valida cupom server-side se vier ?cupom=X
  let appliedCoupon: { id: string; code: string; discount_type: 'fixed' | 'percent'; discount_value: number; expires_at: string } | null = null
  if (couponCode) {
    const { data: coupon } = await supabase
      .from('coupons')
      .select('id, code, discount_type, discount_value, expires_at, used_at')
      .eq('code', couponCode.toUpperCase())
      .eq('business_id', business.id)
      .maybeSingle()
    if (coupon && !coupon.used_at && new Date(coupon.expires_at) > new Date()) {
      appliedCoupon = {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type as 'fixed' | 'percent',
        discount_value: Number(coupon.discount_value),
        expires_at: coupon.expires_at,
      }
    }
  }

  const b = business as Business
  const primary = b.brand_primary || '#3B82F6'
  const secondary = b.brand_secondary || '#06B6D4'
  const mode = b.brand_mode || 'light'
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
      {/* Provider é client, mas recebe o header server-rendered como children —
          nada aqui precisa virar client por causa dele. */}
      <BookingBackProvider>
      <div className="max-w-lg mx-auto">
        {/* Header com cover branded — sticky pra "respirar" ao rolar */}
        <div className="relative">
          <div className="h-20 w-full" style={{ background: cover }} />
          <div
            className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3 backdrop-blur-xl border-b"
            style={{
              background: isDark ? 'rgba(5,7,19,0.85)' : 'rgba(255,255,255,0.85)',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
            }}
          >
            {/* Volta UM passo do fluxo; só sai pra home do negócio quando já
                está no primeiro passo. Antes era Link fixo e jogava o cliente
                pro início, perdendo serviço e data escolhidos. */}
            <BookingBackButton
              slug={slug}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 flex-shrink-0 cursor-pointer"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                color: isDark ? '#F8FAFC' : '#0F172A',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
              }}
            />
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold flex-shrink-0 overflow-hidden"
              style={{
                background: b.logo_url ? (isDark ? '#050713' : '#FFFFFF') : cover,
                color: '#FFFFFF',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0',
              }}
            >
              {b.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.logo_url} alt={b.name} className="w-full h-full object-contain p-0.5" />
              ) : (
                b.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold truncate" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                {b.name}
              </h1>
              <p className="text-xs" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                Agendamento online
              </p>
            </div>
          </div>
        </div>

        {/* BookingFlow — controla suas próprias cores via business.brand_mode */}
        <BookingFlow
          business={b}
          professionals={(professionals || []) as Professional[]}
          workingHours={workingHours || []}
          services={services || []}
          referralCode={referralCode}
          prefill={prefill}
          coupon={appliedCoupon}
        />

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
      </BookingBackProvider>
    </main>
  )
}
