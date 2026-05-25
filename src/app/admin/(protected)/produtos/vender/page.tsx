import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VenderProdutoView from '@/components/admin/produtos/VenderProdutoView'

export const dynamic = 'force-dynamic'

export default async function VenderProdutoPage({
  searchParams,
}: {
  searchParams: Promise<{ prefill?: string }>
}) {
  const sp = await searchParams
  const prefillProductId = typeof sp.prefill === 'string' ? sp.prefill : null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase.from('businesses').select('id').eq('owner_id', user.id).single()
  if (!business) redirect('/cadastro')

  const [{ data: products }, { data: professionals }, { data: ownerProfData }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, variant, unit, price, quantity, track_stock, commission_type, commission_value')
      .eq('business_id', business.id)
      .eq('active', true)
      .eq('sale_active', true) // só produtos com dados de venda ativos
      .order('name'),
    supabase
      .from('professionals')
      .select('id, name, is_receptionist')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('name'),
    supabase
      .from('professionals')
      .select('id')
      .eq('business_id', business.id)
      .eq('auth_user_id', user.id)
      .maybeSingle(),
  ])

  // Recep pode vender produto avulso (cenário Salão99: cliente compra esmalte na saída) ·
  // ordenar profs primeiro, recep no fim com label (recepção) visualmente diferente.
  const profs = [
    ...(professionals ?? []).filter((p) => !p.is_receptionist),
    ...(professionals ?? []).filter((p) => p.is_receptionist),
  ]

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <VenderProdutoView
        businessId={business.id}
        products={(products ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          variant: p.variant ?? null,
          unit: p.unit,
          price: p.price ?? null,
          quantity: Number(p.quantity ?? 0),
          trackStock: p.track_stock ?? true,
          commissionType: p.commission_type ?? null,
          commissionValue: p.commission_value ?? null,
        }))}
        professionals={profs.map((p) => ({
          id: p.id,
          name: p.is_receptionist ? `${p.name} (recepção)` : p.name,
        }))}
        defaultProfId={ownerProfData?.id ?? null}
        prefillProductId={prefillProductId}
      />
    </main>
  )
}
