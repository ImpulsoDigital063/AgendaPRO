import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/admin/BottomNav'
import InstallBanner from '@/components/admin/InstallBanner'
import TrialBanner from '@/components/admin/TrialBanner'
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
    .select('trial_ends_at')
    .eq('owner_id', user.id)
    .single()

  // trial_ends_at = null → conta antiga/paga, sem restrição
  if (business?.trial_ends_at) {
    const expired = new Date(business.trial_ends_at) < new Date()
    if (expired) {
      redirect('/admin/bloqueado')
    }
  }

  const trialDaysLeft = business?.trial_ends_at
    ? Math.ceil((new Date(business.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const cookieStore = await cookies()
  const initialTheme = (cookieStore.get('admin_theme')?.value === 'light' ? 'light' : 'dark') as
    | 'dark'
    | 'light'

  return (
    <AdminThemeProvider initial={initialTheme}>
      <div className="admin-shell" data-admin-theme={initialTheme}>
        <InstallBanner />
        {trialDaysLeft !== null && <TrialBanner daysLeft={trialDaysLeft} />}
        <div className="pb-24">{children}</div>
        <BottomNav />
      </div>
    </AdminThemeProvider>
  )
}
