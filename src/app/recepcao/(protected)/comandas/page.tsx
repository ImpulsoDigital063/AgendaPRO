import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import ComandasView from '@/components/admin/comandas/ComandasView'
import { fetchComandaList } from '@/lib/comandas-server'

export const dynamic = 'force-dynamic'

export default async function RecepcaoComandasPage() {
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

  // Service client pra bypassar RLS · mesmo padrão da /admin/comandas
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const list = await fetchComandaList(admin, recep.business_id)

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <ComandasView initialInvoices={list} />
    </main>
  )
}
