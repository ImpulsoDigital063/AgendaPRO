import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EntradaEstoqueView from '@/components/admin/produtos/EntradaEstoqueView'

export const dynamic = 'force-dynamic'

export default async function RecepcaoEntradaEstoquePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/profissional/login')

  const { data: recep } = await supabase
    .from('professionals')
    .select('business_id')
    .eq('auth_user_id', user.id)
    .eq('is_receptionist', true)
    .single()
  if (!recep || !recep.business_id) redirect('/profissional/login')

  const { data: products } = await supabase
    .from('products')
    .select('id, name, variant, unit, cost, quantity')
    .eq('business_id', recep.business_id)
    .eq('active', true)
    .order('name')

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <EntradaEstoqueView
        businessId={recep.business_id}
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
