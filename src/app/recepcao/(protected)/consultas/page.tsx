import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConsultasView from '@/components/recepcao/ConsultasView'
import { IconSearch } from '@/components/ui/Icon'

export const dynamic = 'force-dynamic'

export default async function RecepcaoConsultasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/profissional/login')

  const { data: recep } = await supabase
    .from('professionals')
    .select('id, business:businesses(id, name)')
    .eq('auth_user_id', user.id)
    .eq('is_receptionist', true)
    .single()

  if (!recep || !recep.business) redirect('/profissional/login')

  const business = recep.business as unknown as { id: string; name: string }

  const { data: profs } = await supabase
    .from('professionals')
    .select('id, name')
    .eq('business_id', business.id)
    .eq('active', true)
    .eq('is_receptionist', false)
    .order('name')

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <header className="relative max-w-lg md:max-w-7xl mx-auto px-4 md:px-6 pt-7 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-faded)' }}>
          {business.name}
        </p>
        <h1 className="text-[26px] font-bold tracking-tight leading-tight inline-flex items-center gap-2" style={{ color: 'var(--admin-text)' }}>
          <IconSearch size={22} /> Consultas
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--admin-text-mute)' }}>
          Histórico de agendamentos · filtros por cliente, profissional, período e status
        </p>
      </header>

      <ConsultasView businessId={business.id} professionals={profs ?? []} />
    </main>
  )
}
