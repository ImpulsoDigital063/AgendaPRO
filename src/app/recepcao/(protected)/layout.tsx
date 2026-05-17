import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import AdminThemeProvider from '@/components/admin/AdminThemeProvider'
import InstallBanner from '@/components/admin/InstallBanner'
import RecepcaoBottomNav from '@/components/recepcao/RecepcaoBottomNav'

export default async function RecepcaoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/profissional/login')
  }

  const { data: professional } = await supabase
    .from('professionals')
    .select('id, business_id, password_changed, is_receptionist')
    .eq('auth_user_id', user.id)
    .single()

  if (!professional) {
    redirect('/profissional/login')
  }

  if (!professional.is_receptionist) {
    redirect('/profissional')
  }

  if (!professional.password_changed) {
    redirect('/profissional/trocar-senha')
  }

  const cookieStore = await cookies()
  const initialTheme = (cookieStore.get('admin_theme')?.value === 'light' ? 'light' : 'dark') as 'dark' | 'light'

  return (
    <AdminThemeProvider initial={initialTheme}>
      <div className="admin-shell" data-admin-theme={initialTheme}>
        <InstallBanner area="profissional" />
        <div style={{ paddingBottom: 'calc(108px + env(safe-area-inset-bottom))' }}>
          {children}
        </div>
        <RecepcaoBottomNav />
      </div>
    </AdminThemeProvider>
  )
}
