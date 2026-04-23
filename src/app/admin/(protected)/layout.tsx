import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/admin/BottomNav'
import InstallBanner from '@/components/admin/InstallBanner'
import GarantiaBanner from '@/components/admin/GarantiaBanner'
import AdminThemeProvider from '@/components/admin/AdminThemeProvider'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  // Sem negócio associado — pode ser estado temporário pós-cadastro; deixa passar
  let refundDaysLeft: number | null = null
  let pendingAppointments = 0
  let pendingClaims = 0

  if (business) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, setup_paid_at, refund_deadline_at, refunded_at, grace_ends_at')
      .eq('business_id', business.id)
      .single()

    if (subscription) {
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

      // Banner verde de garantia (apenas dentro dos 7 dias pós-pagamento)
      if (
        subscription.status === 'active' &&
        !subscription.refunded_at &&
        subscription.refund_deadline_at
      ) {
        const deadline = new Date(subscription.refund_deadline_at).getTime()
        const daysLeft = Math.ceil((deadline - now.getTime()) / (1000 * 60 * 60 * 24))
        if (daysLeft > 0) refundDaysLeft = daysLeft
      }
    }

    // Badges da bottom nav (aprovam-se em paralelo, ignoram erros silenciosamente)
    const [apptRes, claimsRes] = await Promise.all([
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
    pendingAppointments = apptRes.count ?? 0
    pendingClaims = claimsRes.count ?? 0
  }

  const cookieStore = await cookies()
  const initialTheme = (cookieStore.get('admin_theme')?.value === 'light' ? 'light' : 'dark') as
    | 'dark'
    | 'light'

  return (
    <AdminThemeProvider initial={initialTheme}>
      <div className="admin-shell" data-admin-theme={initialTheme}>
        <InstallBanner />
        {refundDaysLeft !== null && <GarantiaBanner daysLeft={refundDaysLeft} />}
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
