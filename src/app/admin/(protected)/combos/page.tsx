import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import PacotesView from '@/components/admin/pacotes/PacotesView'
import SubPageHeader from '@/components/admin/SubPageHeader'

export const dynamic = 'force-dynamic'

// Combos = serviço + produto vendidos juntos por um preço. Entrada própria no
// Catálogo, logo abaixo de Produtos (Eduardo 24/07/2026). Reusa a PacotesView
// com kind='combo'. Pacote (multi-serviço resgatável) fica na aba /admin/pacotes.
export default async function CombosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!business) redirect('/cadastro')

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
      .eq('kind', 'combo')
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
      <SubPageHeader title="Combos" subtitle={business.name} back="/admin/inicio" />
      <div className="max-w-lg mx-auto px-4 py-6 lg:max-w-5xl lg:px-8">
        <PacotesView
          kind="combo"
          businessId={business.id}
          initialPackages={(packages ?? []) as unknown as Parameters<typeof PacotesView>[0]['initialPackages']}
          services={(services ?? []) as Parameters<typeof PacotesView>[0]['services']}
          products={(products ?? []) as Parameters<typeof PacotesView>[0]['products']}
        />
      </div>
    </main>
  )
}
