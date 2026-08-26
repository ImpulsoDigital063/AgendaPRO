import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MarcarAgendamentoForm from '@/components/recepcao/MarcarAgendamentoForm'

export const dynamic = 'force-dynamic'

export default async function RecepcaoMarcarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/profissional/login')

  const { data: recep } = await supabase
    .from('professionals')
    .select('id, name, business:businesses(id, name, slug)')
    .eq('auth_user_id', user.id)
    .eq('is_receptionist', true)
    .single()

  if (!recep || !recep.business) redirect('/profissional/login')

  const business = recep.business as unknown as { id: string; name: string; slug: string }

  // Fetch parallel
  const [{ data: profs }, { data: services }] = await Promise.all([
    supabase
      .from('professionals')
      .select('id, name')
      .eq('business_id', business.id)
      .eq('active', true)
      .eq('is_receptionist', false)
      .eq('does_appointments', true)
      .order('name'),
    supabase
      .from('services')
      .select('id, name, price, duration_minutes, convenio_price')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('name'),
  ])

  return (
    <MarcarAgendamentoForm
      businessId={business.id}
      businessSlug={business.slug}
      professionals={profs ?? []}
      services={services ?? []}
    />
  )
}
