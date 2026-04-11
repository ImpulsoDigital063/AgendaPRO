import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/admin/BottomNav'
import InstallBanner from '@/components/admin/InstallBanner'
import TrialBanner from '@/components/admin/TrialBanner'

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

  return (
    <>
      <InstallBanner />
      {trialDaysLeft !== null && <TrialBanner daysLeft={trialDaysLeft} />}
      <div className="pb-20">{children}</div>
      <BottomNav />
    </>
  )
}
