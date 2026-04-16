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
    .select('id, business_id, password_changed')
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

  return (
    <AdminThemeProvider initial={initialTheme}>
      <div className="admin-shell" data-admin-theme={initialTheme}>
        <InstallBanner />
        <div className="pb-24">{children}</div>
        <ProfissionalBottomNav />
      </div>
    </AdminThemeProvider>
  )
}
