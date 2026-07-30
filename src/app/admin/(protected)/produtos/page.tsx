import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
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
  // v64
  brand_id: string | null
  category_id: string | null
  variant: string | null
  variant_group_id: string | null
  expires_at: string | null
  pack_quantity: number | null
  barcode: string | null
  sku: string | null
  track_stock: boolean
  sale_active: boolean
  commission_type: 'percent' | 'fixed' | null
  commission_value: number | null
  image_url: string | null
  brand?: { id: string; name: string } | { id: string; name: string }[] | null
  category?: { id: string; name: string } | { id: string; name: string }[] | null
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
  if (!business) redirect(await destinoSemNegocio())

  const { data: products } = await supabase
    .from('products')
    .select(`
      id, name, description, unit, price, cost, quantity, min_quantity, active, created_at, updated_at,
      brand_id, category_id, variant, variant_group_id, expires_at, pack_quantity, barcode, sku, image_url,
      track_stock, sale_active, commission_type, commission_value,
      brand:product_brands(id, name),
      category:product_categories(id, name)
    `)
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
