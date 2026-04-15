import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConfiguracoesTabs from '@/components/admin/ConfiguracoesTabs'
import SubPageHeader from '@/components/admin/SubPageHeader'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!business) redirect('/cadastro')

  const [{ data: professionals }, { data: services }, { data: rewards }, { data: customers }] = await Promise.all([
    supabase.from('professionals').select('*').eq('business_id', business.id).order('created_at'),
    supabase.from('services').select('*').eq('business_id', business.id).order('name'),
    supabase.from('rewards').select('*').eq('business_id', business.id).order('points_required'),
    supabase.from('customers').select('*').eq('business_id', business.id).order('total_points', { ascending: false }),
  ])

  const professionalIds = (professionals || []).map((p: { id: string }) => p.id)
  const { data: allWorkingHours } = professionalIds.length > 0
    ? await supabase.from('working_hours').select('*').in('professional_id', professionalIds)
    : { data: [] }

  return (
    <main>
      <SubPageHeader title="Configurações" subtitle={business.name} />
      <div className="max-w-lg mx-auto px-4 py-6">
        <ConfiguracoesTabs
          business={business}
          initialProfessionals={professionals || []}
          initialServices={services || []}
          initialWorkingHours={allWorkingHours || []}
          initialRewards={rewards || []}
          initialCustomers={customers || []}
        />
      </div>
    </main>
  )
}
