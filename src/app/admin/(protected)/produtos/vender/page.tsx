import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
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
  if (!business) redirect(await destinoSemNegocio())

  const [{ data: products }, { data: professionals }, { data: ownerProfData }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, variant, variant_group_id, unit, price, quantity, track_stock, commission_type, commission_value')
      .eq('business_id', business.id)
      .eq('active', true)
      .eq('sale_active', true) // só produtos com dados de venda ativos
      .order('name'),
    supabase
      .from('professionals')
      .select('id, name, is_receptionist, does_appointments')
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
  /* v144 · "recepção" aqui é quem NÃO atende. Quem acumula os dois papéis
     (Josi) entra na lista como profissional mesmo — chamar de recepção quem
     atende o dia todo confunde na hora de escolher quem vendeu. */
  const soBalcao = (p: { is_receptionist?: boolean | null; does_appointments?: boolean | null }) =>
    p.is_receptionist === true && p.does_appointments !== true

  const profs = [
    ...(professionals ?? []).filter((p) => !soBalcao(p)),
    ...(professionals ?? []).filter((p) => soBalcao(p)),
  ]

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <VenderProdutoView
        businessId={business.id}
        products={(products ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          variant: p.variant ?? null,
          variantGroupId: p.variant_group_id ?? null,
          unit: p.unit,
          price: p.price ?? null,
          quantity: Number(p.quantity ?? 0),
          trackStock: p.track_stock ?? true,
          commissionType: p.commission_type ?? null,
          commissionValue: p.commission_value ?? null,
        }))}
        professionals={profs.map((p) => ({
          id: p.id,
          name: soBalcao(p) ? `${p.name} (recepção)` : p.name,
        }))}
        defaultProfId={ownerProfData?.id ?? null}
        prefillProductId={prefillProductId}
      />
    </main>
  )
}
