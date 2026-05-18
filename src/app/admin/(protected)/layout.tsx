import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/admin/BottomNav'
import InstallBanner from '@/components/admin/InstallBanner'
import AdminThemeProvider from '@/components/admin/AdminThemeProvider'
import AppSplash from '@/components/admin/AppSplash'
import BrandThemeInjector from '@/components/admin/BrandThemeInjector'
import AdminDesktopSidebar from '@/components/admin/desktop/AdminDesktopSidebar'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentUser,
  getCurrentBusiness,
  getCurrentSubscription,
  getPendingAppointmentsCount,
  getPendingClaimsCount,
  getOwnerProfessional,
} from '@/lib/admin-data'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Auth + theme em paralelo — independentes (cookies nao precisa esperar user)
  const [user, cookieStore] = await Promise.all([getCurrentUser(), cookies()])

  if (!user) {
    redirect('/admin/login')
  }

  const business = await getCurrentBusiness(user.id)

  // Sem negócio associado — pode ser estado temporário pós-cadastro; deixa passar
  let pendingAppointments = 0
  let pendingClaims = 0
  let showOwnerTab = false
  let brand: {
    brand_primary?: string | null
    brand_secondary?: string | null
    brand_accent?: string | null
    brand_neutral?: string | null
    brand_logo_url?: string | null
  } = {}
  let businessName: string | null = null

  if (business) {
    // Fetch brand colors (v50) + nome · NULL = default AgendaPRO
    const supabase = await createClient()
    const { data: brandData } = await supabase
      .from('businesses')
      .select('name, brand_primary, brand_secondary, brand_accent, brand_neutral, brand_logo_url')
      .eq('id', business.id)
      .maybeSingle()
    if (brandData) {
      brand = brandData
      businessName = brandData.name ?? null
    }
  }

  if (business) {
    // Subscription + counts + owner-prof em paralelo. Counts via
    // unstable_cache (TTL 30s) — segunda abertura nao bate Supabase.
    // owner-prof via React cache() (request-scoped) — usado aqui pra
    // condicionar bottom nav e em /admin/eu pra montar a tela.
    const [subscription, apptCount, claimsCount, ownerProf] = await Promise.all([
      getCurrentSubscription(business.id),
      getPendingAppointmentsCount(business.id),
      getPendingClaimsCount(business.id),
      getOwnerProfessional(user.id, business.id),
    ])

    // Defesa: negócio sem subscription = estado corrompido, manda pra bloqueado
    if (!subscription) {
      redirect('/admin/bloqueado')
    }

    const now = new Date()

    const graceExpired =
      subscription.grace_ends_at && new Date(subscription.grace_ends_at) < now

    // Bloqueios que redirecionam pra /admin/bloqueado
    const blocked =
      subscription.status === 'pending_payment' ||
      subscription.status === 'cancelled' ||
      !!subscription.refunded_at ||
      (subscription.status === 'past_due' && graceExpired)

    if (blocked) {
      redirect('/admin/bloqueado')
    }

    pendingAppointments = apptCount
    pendingClaims = claimsCount
    showOwnerTab = !!ownerProf
  }

  const initialTheme = (cookieStore.get('admin_theme')?.value === 'light' ? 'light' : 'dark') as
    | 'dark'
    | 'light'

  return (
    <AdminThemeProvider initial={initialTheme}>
      <BrandThemeInjector brand={brand} />
      <div className="admin-shell admin-shell--with-sidebar" data-admin-theme={initialTheme}>
        <AppSplash />
        <InstallBanner />
        <AdminDesktopSidebar
          brand={{ business_name: businessName, brand_logo_url: brand.brand_logo_url ?? null }}
          pendingAppointments={pendingAppointments}
          pendingClaims={pendingClaims}
        />
        <div className="admin-shell-content">
          {children}
        </div>
        <div className="xl:hidden">
          <BottomNav
            pendingAppointments={pendingAppointments}
            pendingClaims={pendingClaims}
            showOwnerTab={showOwnerTab}
          />
        </div>
      </div>
    </AdminThemeProvider>
  )
}
