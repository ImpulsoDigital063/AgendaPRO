import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MarcarAgendamentoForm from '@/components/recepcao/MarcarAgendamentoForm'

export const dynamic = 'force-dynamic'

/**
 * /profissional/marcar — v92 · 29/07/2026
 *
 * A profissional marca na PRÓPRIA agenda. Reusa o MarcarAgendamentoForm
 * (mesmo form da recepção e do admin mobile — 3º consumidor).
 *
 * A lista de profissionais passada é ela e só ela: o form pula o passo
 * "com qual profissional?" e não existe caminho de UI pra escolher colega.
 * Gate por negócio: `businesses.professionals_can_book_self`.
 */
export default async function ProfissionalMarcarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/profissional/login')

  const { data: prof } = await supabase
    .from('professionals')
    .select('id, name, business:businesses(id, name, slug, professionals_can_book_self)')
    .eq('auth_user_id', user.id)
    .eq('is_receptionist', false)
    .single()

  if (!prof || !prof.business) redirect('/profissional/login')

  const business = prof.business as unknown as {
    id: string
    name: string
    slug: string
    professionals_can_book_self?: boolean | null
  }

  // Dona não liberou (ou desligou depois) → nem renderiza o form
  if (!business.professionals_can_book_self) redirect('/profissional')

  const { data: services } = await supabase
    .from('services')
    .select('id, name, price, duration_minutes')
    .eq('business_id', business.id)
    .eq('active', true)
    .order('name')

  return (
    <MarcarAgendamentoForm
      businessId={business.id}
      businessSlug={business.slug}
      professionals={[{ id: prof.id, name: prof.name }]}
      services={services ?? []}
      defaultProfId={prof.id}
      area="profissional"
    />
  )
}
