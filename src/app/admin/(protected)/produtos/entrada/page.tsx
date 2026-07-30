import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EntradaEstoqueView from '@/components/admin/produtos/EntradaEstoqueView'

export const dynamic = 'force-dynamic'

export default async function EntradaEstoquePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase.from('businesses').select('id').eq('owner_id', user.id).single()
  if (!business) redirect(await destinoSemNegocio())

  // Carrega produtos ativos pra montar dropdown da entrada
  const { data: products } = await supabase
    .from('products')
    .select('id, name, variant, unit, cost, quantity')
    .eq('business_id', business.id)
    .eq('active', true)
    .order('name')

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <EntradaEstoqueView
        businessId={business.id}
        products={(products ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          variant: p.variant ?? null,
          unit: p.unit,
          cost: p.cost ?? null,
          quantity: Number(p.quantity ?? 0),
        }))}
      />
    </main>
  )
}
