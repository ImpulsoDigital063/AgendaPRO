import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PdvPagina from '@/components/admin/pdv/PdvPagina'

export const dynamic = 'force-dynamic'

/* Era o VenderProdutoView (PDV só de produto). Desde 28/09 é o PDV único do
   "Registrar venda", aberto na aba Produtos (Eduardo). */
export default async function VenderProdutoPage({
  searchParams,
}: {
  searchParams: Promise<{ prefill?: string }>
}) {
  const sp = await searchParams
  const prefill = typeof sp.prefill === 'string' ? sp.prefill : null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase.from('businesses').select('id').eq('owner_id', user.id).single()
  if (!business) redirect(await destinoSemNegocio())

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <PdvPagina businessId={business.id} prefillProdutoId={prefill} voltarPara="/admin/produtos" />
    </main>
  )
}
