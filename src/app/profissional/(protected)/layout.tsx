import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminThemeProvider from '@/components/admin/AdminThemeProvider'
import ProfissionalBottomNav from '@/components/profissional/ProfissionalBottomNav'
import InstallBanner from '@/components/admin/InstallBanner'
import { cookies } from 'next/headers'

export default async function ProfissionalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/profissional/login')
  }

  // Verifica se e um profissional com auth_user_id
  const { data: professional } = await supabase
    .from('professionals')
    .select('id, business_id, password_changed, employment_type')
    .eq('auth_user_id', user.id)
    .single()

  if (!professional) {
    // Pode ser o dono — manda pro admin
    redirect('/admin')
  }

  // Forca troca de senha no primeiro acesso
  if (!professional.password_changed) {
    redirect('/profissional/trocar-senha')
  }

  const cookieStore = await cookies()
  const initialTheme = (cookieStore.get('admin_theme')?.value === 'light' ? 'light' : 'dark') as 'dark' | 'light'

  const employmentType = (professional.employment_type ?? 'commissioned') as 'commissioned' | 'employed'

  // Badge: agendamentos pendentes de hoje pra esse profissional
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const todayStr = `${yyyy}-${mm}-${dd}`

  const { count: pendingCount } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('professional_id', professional.id)
    .eq('status', 'pending')
    .gte('appointment_date', todayStr)

  return (
    <AdminThemeProvider initial={initialTheme}>
      <div className="admin-shell" data-admin-theme={initialTheme}>
        <InstallBanner area="profissional" />
        <div style={{ paddingBottom: 'calc(108px + env(safe-area-inset-bottom))' }}>
          {children}
        </div>
        <ProfissionalBottomNav
          employmentType={employmentType}
          pendingAppointments={pendingCount ?? 0}
        />
      </div>
    </AdminThemeProvider>
  )
}
