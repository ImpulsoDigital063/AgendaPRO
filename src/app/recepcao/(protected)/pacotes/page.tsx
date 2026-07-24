import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import PacotesView from '@/components/admin/pacotes/PacotesView'
import SubPageHeader from '@/components/admin/SubPageHeader'

export const dynamic = 'force-dynamic'

export default async function RecepcaoPacotesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/profissional/login')

  const { data: recep } = await supabase
    .from('professionals')
    .select('business:businesses(id, name)')
    .eq('auth_user_id', user.id)
    .eq('is_receptionist', true)
    .single()
  if (!recep || !recep.business) redirect('/profissional/login')

  const business = recep.business as unknown as { id: string; name: string }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const [{ data: packages }, { data: services }, { data: products }] = await Promise.all([
    admin
      .from('packages')
      .select(`
        id, name, price, kind, validity_kind, validity_value, active, description, created_at,
        package_items (id, service_id, product_id, quantity, unit_price, services(name, price), products(name, price))
      `)
      .eq('business_id', business.id)
      .eq('kind', 'pacote')
      .order('created_at', { ascending: false }),
    admin
      .from('services')
      .select('id, name, price, active')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('name'),
    admin
      .from('products')
      .select('id, name, price')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('name'),
  ])

  return (
    <main style={{ minHeight: '100svh' }}>
      <SubPageHeader title="Pacotes" subtitle={business.name} back="/recepcao" />
      <div className="max-w-lg mx-auto px-4 py-6 md:max-w-7xl md:px-8">
        <PacotesView
          kind="pacote"
          businessId={business.id}
          initialPackages={(packages ?? []) as unknown as Parameters<typeof PacotesView>[0]['initialPackages']}
          services={(services ?? []) as Parameters<typeof PacotesView>[0]['services']}
          products={(products ?? []) as Parameters<typeof PacotesView>[0]['products']}
        />
      </div>
    </main>
  )
}
