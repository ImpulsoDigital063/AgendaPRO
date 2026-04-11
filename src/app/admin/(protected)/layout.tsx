import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/admin/BottomNav'
import InstallBanner from '@/components/admin/InstallBanner'

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

  return (
    <>
      <InstallBanner />
      <div className="pb-20">{children}</div>
      <BottomNav />
    </>
  )
}
