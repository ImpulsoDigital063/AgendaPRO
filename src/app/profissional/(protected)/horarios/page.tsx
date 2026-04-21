import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import LogoutButton from '@/components/LogoutButton'
import ThemeToggle from '@/components/admin/ThemeToggle'
import HorariosTab from '@/components/admin/HorariosTab'
import { IconChevronRight } from '@/components/ui/Icon'

export default async function ProfHorariosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/profissional/login')

  const { data: professional } = await supabase
    .from('professionals')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (!professional) redirect('/profissional/login')
  if ((professional.employment_type ?? 'commissioned') === 'employed') redirect('/profissional')

  const { data: workingHours } = await supabase
    .from('working_hours')
    .select('*')
    .eq('professional_id', professional.id)
    .order('day_of_week', { ascending: true })

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full blur-[120px]"
          style={{ background: 'var(--admin-bg-orb-1)' }}
        />
      </div>

      <header className="relative max-w-lg mx-auto px-4 pt-7 pb-6">
        <div className="flex items-center justify-between mb-6">
          <Image
            src="/logo-agendapro-dark.svg"
            alt="AgendaPRO"
            width={130}
            height={26}
            priority
            style={{ filter: 'var(--admin-logo-filter)' }}
          />
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <LogoutButton />
          </div>
        </div>

        <Link
          href="/profissional"
          className="inline-flex items-center gap-1 text-xs font-medium mb-3"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          <IconChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
          Voltar
        </Link>
        <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--admin-text)' }}>
          Meus horários
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--admin-text-mute)' }}>
          Defina os dias e janelas em que voce atende
        </p>
      </header>

      <div className="relative max-w-lg mx-auto px-4 pb-10">
        <HorariosTab
          professionals={[professional]}
          initialWorkingHours={workingHours || []}
        />
      </div>
    </main>
  )
}
