import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProdutosView from '@/components/admin/produtos/ProdutosView'

export const dynamic = 'force-dynamic'

type ProductRow = {
  id: string
  name: string
  description: string | null
  unit: string
  price: number | null
  cost: number | null
  quantity: number
  min_quantity: number
  active: boolean
  created_at: string
  updated_at: string
}

export default async function AdminProdutosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()
  if (!business) redirect('/cadastro')

  const { data: products } = await supabase
    .from('products')
    .select('id, name, description, unit, price, cost, quantity, min_quantity, active, created_at, updated_at')
    .eq('business_id', business.id)
    .eq('active', true)
    .order('name')

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <ProdutosView
        businessId={business.id}
        initialProducts={(products ?? []) as ProductRow[]}
      />
    </main>
  )
}
