import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VenderProdutoView from '@/components/admin/produtos/VenderProdutoView'

export const dynamic = 'force-dynamic'

export default async function RecepcaoVenderProdutoPage({
  searchParams,
}: {
  searchParams: Promise<{ prefill?: string }>
}) {
  const sp = await searchParams
  const prefillProductId = typeof sp.prefill === 'string' ? sp.prefill : null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/profissional/login')

  const { data: recep } = await supabase
    .from('professionals')
    .select('id, business_id')
    .eq('auth_user_id', user.id)
    .eq('is_receptionist', true)
    .single()
  if (!recep || !recep.business_id) redirect('/profissional/login')

  const [{ data: products }, { data: professionals }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, variant, unit, price, quantity, track_stock, commission_type, commission_value')
      .eq('business_id', recep.business_id)
      .eq('active', true)
      .eq('sale_active', true)
      .order('name'),
    supabase
      .from('professionals')
      .select('id, name, is_receptionist')
      .eq('business_id', recep.business_id)
      .eq('active', true)
      .order('name'),
  ])

  const profs = [
    ...(professionals ?? []).filter((p) => !p.is_receptionist),
    ...(professionals ?? []).filter((p) => p.is_receptionist),
  ]

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <VenderProdutoView
        businessId={recep.business_id}
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
        defaultProfId={recep.id ?? null}
        prefillProductId={prefillProductId}
      />
    </main>
  )
}
