import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PdvPagina from '@/components/admin/pdv/PdvPagina'

export const dynamic = 'force-dynamic'

/* PDV único (Eduardo 28/09) · mesma tela do "Registrar venda", aba Produtos. */
export default async function RecepcaoVenderProdutoPage({
  searchParams,
}: {
  searchParams: Promise<{ prefill?: string }>
}) {
  const sp = await searchParams
  const prefill = typeof sp.prefill === 'string' ? sp.prefill : null
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

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <PdvPagina businessId={recep.business_id} prefillProdutoId={prefill} voltarPara="/recepcao/produtos" />
    </main>
  )
}
