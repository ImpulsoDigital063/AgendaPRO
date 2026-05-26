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

  const [
    { data: professionals },
    { data: services },
    { data: rewards },
    { data: customers },
    { data: subscription },
  ] = await Promise.all([
    supabase.from('professionals').select('*').eq('business_id', business.id).order('created_at'),
    supabase.from('services').select('*').eq('business_id', business.id).order('name'),
    supabase.from('rewards').select('*').eq('business_id', business.id).order('points_required'),
    supabase.from('customers').select('*').eq('business_id', business.id).order('total_points', { ascending: false }),
    supabase.from('subscriptions').select('plan, extra_professional_slots').eq('business_id', business.id).single(),
  ])

  // Plano determina limite de profissionais (solo=2, equipe=5).
  // Default 'solo' se subscription estiver corrompida — defesa segura.
  const subscriptionPlan = (subscription?.plan === 'equipe' ? 'equipe' : 'solo') as 'solo' | 'equipe'
  // v78 · slots extras vendidos pra negócios que precisam de mais profs além do plano
  const extraProfessionalSlots = Math.max(0, Number(subscription?.extra_professional_slots ?? 0))

  const professionalIds = (professionals || []).map((p: { id: string }) => p.id)
  const { data: allWorkingHours } = professionalIds.length > 0
    ? await supabase.from('working_hours').select('*').in('professional_id', professionalIds)
    : { data: [] }

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="admin-orb-1 absolute -top-32 left-1/2 w-[520px] h-[520px] rounded-full blur-[120px]"
          style={{ background: 'var(--admin-bg-orb-1)' }}
        />
        <div
          className="admin-orb-2 absolute top-[40%] -right-24 w-72 h-72 rounded-full blur-[80px]"
          style={{ background: 'var(--admin-bg-orb-2)' }}
        />
        <div
          className="admin-orb-3 absolute bottom-0 -left-20 w-64 h-64 rounded-full blur-[80px]"
          style={{ background: 'var(--admin-bg-orb-3)' }}
        />
      </div>
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.18) 100%)',
        }}
      />

      <div className="relative">
        <SubPageHeader title="Configurações" subtitle={business.name} />
        <div className="max-w-lg mx-auto px-4 py-6 lg:max-w-6xl lg:px-8">
          <ConfiguracoesTabs
            business={business}
            initialProfessionals={professionals || []}
            initialServices={services || []}
            initialWorkingHours={allWorkingHours || []}
            initialRewards={rewards || []}
            initialCustomers={customers || []}
            subscriptionPlan={subscriptionPlan}
            extraProfessionalSlots={extraProfessionalSlots}
          />
        </div>
      </div>
    </main>
  )
}
