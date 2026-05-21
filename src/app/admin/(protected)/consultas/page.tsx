import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConsultasView from '@/components/recepcao/ConsultasView'
import { IconSearch } from '@/components/ui/Icon'

export const dynamic = 'force-dynamic'

/**
 * Versão Adm de consultas (mesma lógica de /recepcao/consultas).
 * Eduardo cravou: Adm tem permissão total.
 */
export default async function AdminConsultasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()
  if (!business) redirect('/cadastro')

  const { data: profs } = await supabase
    .from('professionals')
    .select('id, name')
    .eq('business_id', business.id)
    .eq('active', true)
    .eq('is_receptionist', false)
    .order('name')

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <header className="relative max-w-lg lg:max-w-5xl mx-auto px-4 lg:px-8 pt-7 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-faded)' }}>
          Atendimentos
        </p>
        <h1 className="text-[26px] font-bold tracking-tight leading-tight inline-flex items-center gap-2" style={{ color: 'var(--admin-text)' }}>
          <IconSearch size={22} /> Consultas
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--admin-text-mute)' }}>
          Histórico de agendamentos · filtros por cliente, profissional, período e status
        </p>
      </header>

      <div className="max-w-lg lg:max-w-5xl mx-auto px-4 lg:px-8">
        <ConsultasView businessId={business.id} professionals={profs ?? []} />
      </div>
    </main>
  )
}
