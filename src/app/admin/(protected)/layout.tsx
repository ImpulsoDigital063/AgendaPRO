import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/admin/BottomNav'
import InstallBanner from '@/components/admin/InstallBanner'
import AdminThemeProvider from '@/components/admin/AdminThemeProvider'
import {
  getCurrentUser,
  getCurrentBusiness,
  getCurrentSubscription,
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

  if (business) {
    // Subscription + counts da bottom nav em paralelo. Subscription so
    // depende de business.id, counts tambem — entao roda tudo junto e
    // valida apos. Corta ~200-300ms vs sequencial.
    const supabase = await createClient()
    const [subscription, apptRes, claimsRes] = await Promise.all([
      getCurrentSubscription(business.id),
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .eq('status', 'pending'),
      supabase
        .from('review_claims')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .eq('status', 'pending'),
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

    pendingAppointments = apptRes.count ?? 0
    pendingClaims = claimsRes.count ?? 0
  }

  const initialTheme = (cookieStore.get('admin_theme')?.value === 'light' ? 'light' : 'dark') as
    | 'dark'
    | 'light'

  return (
    <AdminThemeProvider initial={initialTheme}>
      <div className="admin-shell" data-admin-theme={initialTheme}>
        <InstallBanner />
        <div style={{ paddingBottom: 'calc(108px + env(safe-area-inset-bottom))' }}>
          {children}
        </div>
        <BottomNav
          pendingAppointments={pendingAppointments}
          pendingClaims={pendingClaims}
        />
      </div>
    </AdminThemeProvider>
  )
}
