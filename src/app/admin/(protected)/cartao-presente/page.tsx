import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import CartaoPresenteView from '@/components/admin/cartao-presente/CartaoPresenteView'
import SubPageHeader from '@/components/admin/SubPageHeader'
import { getCurrentBusiness } from '@/lib/admin-data'

export const dynamic = 'force-dynamic'

export default async function CartaoPresentePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const business = await getCurrentBusiness(user.id)
  if (!business) redirect('/admin/login')

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Janela do lembrete "Pra enviar": send_on até hoje+3 dias
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + 3)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const [{ data: giftCards }, { data: services }, { data: customers }, { data: professionals }, { data: pendingSends }] = await Promise.all([
    admin
      .from('gift_cards')
      .select(`
        id, code, mode, buyer_name, recipient_name, recipient_customer_id,
        price_paid, value_total, value_used, status, expires_at, created_at,
        sold_by_professional_id, sold_by_role,
        gift_card_services (id, service_id, service_name, sessions_total, sessions_used)
      `)
      .eq('business_id', business.id)
      .order('created_at', { ascending: false }),
    admin
      .from('services')
      .select('id, name, price')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('name'),
    admin
      .from('customers')
      .select('id, name, phone')
      .eq('business_id', business.id)
      .order('name'),
    admin
      .from('professionals')
      .select('id, name')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('name'),
    admin
      .from('gift_cards')
      .select(`
        id, code, recipient_name, buyer_name, recipient_phone, buyer_phone,
        gift_message, send_on, expires_at,
        gift_card_services (service_name, sessions_total)
      `)
      .eq('business_id', business.id)
      .eq('status', 'active')
      .not('send_on', 'is', null)
      .is('sent_at', null)
      .lte('send_on', cutoffStr)
      .order('send_on', { ascending: true }),
  ])

  // Selo de origem (quem vendeu) · resolve o nome do professional por gift card
  const gcRows = (giftCards ?? []) as unknown as Array<Record<string, unknown> & {
    sold_by_professional_id: string | null
    sold_by_role: 'admin' | 'reception' | null
  }>
  const soldByIds = Array.from(
    new Set(gcRows.map((g) => g.sold_by_professional_id).filter((id): id is string => !!id)),
  )
  const soldByNameById: Record<string, string> = {}
  if (soldByIds.length > 0) {
    const { data: sellers } = await admin
      .from('professionals')
      .select('id, name')
      .in('id', soldByIds)
    for (const s of sellers ?? []) {
      soldByNameById[(s as { id: string }).id] = (s as { name: string }).name
    }
  }
  const enrichedGiftCards = gcRows.map((g) => ({
    ...g,
    sold_by_name: g.sold_by_role
      ? (g.sold_by_professional_id ? soldByNameById[g.sold_by_professional_id] : null)
          ?? (g.sold_by_role === 'admin' ? 'Administração' : 'Recepção')
      : null,
  }))

  return (
    <main style={{ minHeight: '100svh' }}>
      <SubPageHeader title="Cartão Presente" subtitle={business.name} back="/admin/configuracoes" />
      <div className="max-w-lg mx-auto px-4 py-6 sm:max-w-5xl sm:px-6 lg:max-w-5xl lg:px-8">
        <CartaoPresenteView
          initialGiftCards={enrichedGiftCards as unknown as Parameters<typeof CartaoPresenteView>[0]['initialGiftCards']}
          services={(services ?? []) as Parameters<typeof CartaoPresenteView>[0]['services']}
          customers={(customers ?? []) as Parameters<typeof CartaoPresenteView>[0]['customers']}
          professionals={(professionals ?? []) as Parameters<typeof CartaoPresenteView>[0]['professionals']}
          pendingSends={(pendingSends ?? []) as unknown as Parameters<typeof CartaoPresenteView>[0]['pendingSends']}
          businessName={business.name}
          brandLogoUrl={business.brand_logo_url ?? business.logo_url ?? null}
          brandPrimary={business.brand_primary ?? null}
          brandSecondary={business.brand_secondary ?? null}
        />
      </div>
    </main>
  )
}
