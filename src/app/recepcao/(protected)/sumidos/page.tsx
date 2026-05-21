import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RecepSumidosView from '@/components/recepcao/RecepSumidosView'

export const dynamic = 'force-dynamic'

export default async function RecepSumidosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/profissional/login')

  // Confirma que é recepcionista (layout já garante mas reforço)
  const { data: recep } = await supabase
    .from('professionals')
    .select('id, business_id, business:businesses(id, name, slug)')
    .eq('auth_user_id', user.id)
    .eq('is_receptionist', true)
    .single()
  if (!recep || !recep.business) redirect('/profissional/login')

  const business = recep.business as unknown as { id: string; name: string; slug: string }

  // Busca cupons ativos do business · com customer info
  const nowIso = new Date().toISOString()
  const { data: coupons } = await supabase
    .from('coupons')
    .select(`
      id, code, discount_type, discount_value, expires_at,
      sent_at, used_at, whatsapp_message,
      customer_id,
      customer:customers(id, name, phone)
    `)
    .eq('business_id', business.id)
    .gt('expires_at', nowIso)
    .not('customer_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(500)

  type CouponRow = {
    id: string
    code: string
    discount_type: 'fixed' | 'percent'
    discount_value: number
    expires_at: string
    sent_at: string | null
    used_at: string | null
    whatsapp_message: string | null
    customer_id: string
    customer: { id: string; name: string; phone: string } | { id: string; name: string; phone: string }[] | null
  }

  const list = ((coupons || []) as unknown as CouponRow[]).map((c) => ({
    id: c.id,
    code: c.code,
    discount_type: c.discount_type,
    discount_value: c.discount_value,
    expires_at: c.expires_at,
    sent_at: c.sent_at,
    used_at: c.used_at,
    whatsapp_message: c.whatsapp_message,
    customer: Array.isArray(c.customer) ? c.customer[0] : c.customer,
  })).filter((c) => c.customer)

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <div className="max-w-lg lg:max-w-3xl mx-auto px-4 lg:px-6 py-5">
        <RecepSumidosView
          businessSlug={business.slug}
          businessName={business.name}
          coupons={list as Array<{
            id: string
            code: string
            discount_type: 'fixed' | 'percent'
            discount_value: number
            expires_at: string
            sent_at: string | null
            used_at: string | null
            whatsapp_message: string | null
            customer: { id: string; name: string; phone: string }
          }>}
        />
      </div>
    </main>
  )
}
