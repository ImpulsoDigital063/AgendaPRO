import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MarcarAgendamentoForm from '@/components/recepcao/MarcarAgendamentoForm'

export const dynamic = 'force-dynamic'

/**
 * Página de novo agendamento pelo ADM.
 * Reusa MarcarAgendamentoForm (criado pra recepção).
 *
 * Aceita prefill via query params (vem do popover hover-to-schedule da
 * timeline /admin):
 *   ?prof=UUID&date=YYYY-MM-DD&time=HH:MM
 */
export default async function AdminMarcarPage({
  searchParams,
}: {
  searchParams: Promise<{ prof?: string; date?: string; time?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, slug, name')
    .eq('owner_id', user.id)
    .single()
  if (!business) redirect(await destinoSemNegocio())

  const sp = await searchParams

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
      .select('id, name, price, duration_minutes')
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
      defaultProfId={sp.prof ?? null}
      defaultDate={sp.date ?? null}
      defaultTime={sp.time ?? null}
      area="admin"
    />
  )
}
