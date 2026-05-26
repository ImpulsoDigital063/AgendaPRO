import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import ComandasView, { type InvoiceListItem } from '@/components/admin/comandas/ComandasView'

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

  const { data: invoices } = await admin
    .from('invoices')
    .select(`
      id, invoice_number, status, subtotal, discount, total,
      created_at, closed_at,
      customer:customers(id, name, phone),
      items:invoice_items(id, item_type)
    `)
    .eq('business_id', recep.business_id)
    .order('created_at', { ascending: false })
    .limit(300)

  const list: InvoiceListItem[] = (invoices ?? []).map((inv) => {
    const customer = Array.isArray(inv.customer) ? inv.customer[0] : inv.customer
    const items = Array.isArray(inv.items) ? inv.items : []
    return {
      id: inv.id as string,
      invoice_number: inv.invoice_number as number,
      status: inv.status as 'open' | 'closed' | 'cancelled',
      total: Number(inv.total ?? 0),
      created_at: inv.created_at as string,
      closed_at: inv.closed_at as string | null,
      customer_name: customer?.name ?? null,
      items_count: items.length,
      has_service: items.some((i) => i.item_type === 'appointment'),
      has_product: items.some((i) => i.item_type === 'product'),
    }
  })

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <ComandasView initialInvoices={list} />
    </main>
  )
}
