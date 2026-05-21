import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RecepCuponsView from '@/components/recepcao/RecepCuponsView'

export const dynamic = 'force-dynamic'

/**
 * Versão Adm da página de cupons (mesma lógica de /recepcao/cupons).
 * Eduardo cravou: Adm tem permissão total · pode fazer tudo que recep faz.
 * Auth via owner_id (não is_receptionist).
 */
export default async function AdminCuponsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, slug, name')
    .eq('owner_id', user.id)
    .single()
  if (!business) redirect('/cadastro')

  const nowIso = new Date().toISOString()
  const { data: personalizados } = await supabase
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

  const { data: promocoes } = await supabase
    .from('coupons')
    .select(`
      id, code, discount_type, discount_value, expires_at,
      standalone_label, professional_id, created_at,
      professional:professionals(name)
    `)
    .eq('business_id', business.id)
    .eq('is_standalone', true)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(50)

  const promoIds = (promocoes || []).map((c) => c.id)
  const { data: redemptions } = promoIds.length > 0
    ? await supabase.from('coupon_redemptions').select('coupon_id').in('coupon_id', promoIds)
    : { data: [] }
  const usageByCoupon: Record<string, number> = {}
  for (const r of redemptions || []) {
    if (r.coupon_id) usageByCoupon[r.coupon_id] = (usageByCoupon[r.coupon_id] ?? 0) + 1
  }

  type PersonalRow = {
    id: string; code: string; discount_type: 'fixed' | 'percent'; discount_value: number
    expires_at: string; sent_at: string | null; used_at: string | null
    whatsapp_message: string | null; customer_id: string
    customer: { id: string; name: string; phone: string } | { id: string; name: string; phone: string }[] | null
  }
  type PromoRow = {
    id: string; code: string; discount_type: 'fixed' | 'percent'; discount_value: number
    expires_at: string; standalone_label: string | null; professional_id: string | null
    created_at: string; professional: { name: string } | { name: string }[] | null
  }

  const cuponsList = ((personalizados || []) as unknown as PersonalRow[]).map((c) => ({
    id: c.id, code: c.code, discount_type: c.discount_type, discount_value: c.discount_value,
    expires_at: c.expires_at, sent_at: c.sent_at, used_at: c.used_at,
    whatsapp_message: c.whatsapp_message,
    customer: Array.isArray(c.customer) ? c.customer[0] : c.customer,
  })).filter((c) => c.customer)

  const promocoesList = ((promocoes || []) as unknown as PromoRow[]).map((c) => {
    const prof = Array.isArray(c.professional) ? c.professional[0] : c.professional
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://agendapro.net.br'
    return {
      id: c.id, code: c.code, discount_type: c.discount_type, discount_value: c.discount_value,
      expires_at: c.expires_at, standalone_label: c.standalone_label,
      professional_name: prof?.name ?? null,
      uses: usageByCoupon[c.id] ?? 0,
      share_url: `${appUrl}/${business.slug}?cupom=${c.code}`,
    }
  })

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <div className="max-w-lg lg:max-w-5xl mx-auto px-4 lg:px-8 py-6">
        <RecepCuponsView
          businessSlug={business.slug}
          businessName={business.name}
          coupons={cuponsList as Array<{
            id: string; code: string; discount_type: 'fixed' | 'percent'; discount_value: number
            expires_at: string; sent_at: string | null; used_at: string | null
            whatsapp_message: string | null
            customer: { id: string; name: string; phone: string }
          }>}
          promocoes={promocoesList}
        />
      </div>
    </main>
  )
}
