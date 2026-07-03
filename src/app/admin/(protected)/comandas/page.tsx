import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import ComandasView from '@/components/admin/comandas/ComandasView'
import { fetchComandaList } from '@/lib/comandas-server'

export const dynamic = 'force-dynamic'

export default async function AdminComandasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!business) redirect('/cadastro')

  // Service client pra bypassar RLS e contar items numa subquery
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const list = await fetchComandaList(admin, business.id)

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <ComandasView initialInvoices={list} />
    </main>
  )
}
