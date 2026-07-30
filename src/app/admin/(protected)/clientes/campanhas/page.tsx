import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { todayBR, addDaysBR } from '@/lib/date-br'
import SubPageHeader from '@/components/admin/SubPageHeader'
import CampanhasTabs from '@/components/admin/CampanhasTabs'

const MESES_PT = [
  'janeiro','fevereiro','março','abril','maio','junho',
  'julho','agosto','setembro','outubro','novembro','dezembro',
]

const SUMIDO_DAYS = 40

export default async function CampanhasPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, slug, name, description')
    .eq('owner_id', user.id)
    .single()
  if (!business) redirect('/cadastro')

  const { tab } = await searchParams
  const initialTab: 'sumidos' | 'aniversariantes' | 'avulso' =
    tab === 'aniversariantes' ? 'aniversariantes' :
    tab === 'avulso' ? 'avulso' :
    'sumidos'

  // Cupons ativos (compartilhado entre as duas abas pra contar quem já tem)
  const nowIso = new Date().toISOString()
  const { data: existingCoupons } = await supabase
    .from('coupons')
    .select('id, code, sent_at, used_at, expires_at, customer_id')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
    .limit(200)

  const customerIdsWithActiveCoupon = new Set(
    (existingCoupons || [])
      .filter((c) => !c.used_at && c.expires_at > nowIso)
      .map((c) => c.customer_id)
      .filter(Boolean) as string[]
  )

  // Ticket médio · últimos 90 dias de pagos · fallback R$ 50
  // λ.fuso · janelas e cortes em dia BR (servidor roda em UTC)
  const ninetyDaysAgoCampStr = addDaysBR(todayBR(), -90)
  const { data: paidApptsCamp } = await supabase
    .from('appointments')
    .select('total_price')
    .eq('business_id', business.id)
    .not('paid_at', 'is', null)
    .gte('appointment_date', ninetyDaysAgoCampStr)
  const validPricesCamp = (paidApptsCamp || []).map((a) => Number(a.total_price)).filter((p) => p > 0)
  const ticketMedio = validPricesCamp.length > 0
    ? validPricesCamp.reduce((s, p) => s + p, 0) / validPricesCamp.length
    : 50

  // ─────────────────────────────────────────────────
  // ABA SUMIDOS — replicação da lógica de /clientes/reativar
  // ─────────────────────────────────────────────────
  const cutoffStr = addDaysBR(todayBR(), -SUMIDO_DAYS)

  const { data: lastAppts } = await supabase
    .from('appointments')
    .select('client_id, appointment_date')
    .eq('business_id', business.id)
    .not('client_id', 'is', null)
    .order('appointment_date', { ascending: false })
    // LIMIT defensivo idêntico ao FocoDoDia (admin-data.ts). 10k cobre
    // ~ano de salão movimentado · evita scan de tabela em base grande.
    .limit(10000)

  const lastByClient = new Map<string, string>()
  for (const a of lastAppts || []) {
    if (a.client_id && !lastByClient.has(a.client_id)) {
      lastByClient.set(a.client_id, a.appointment_date)
    }
  }

  const sumidoClientIds = Array.from(lastByClient.entries())
    .filter(([, date]) => date < cutoffStr)
    .map(([cid]) => cid)

  let sumidosTotal = 0
  let sumidosWithoutCoupon = 0
  const sumidoCustomerIdsSet = new Set<string>()
  if (sumidoClientIds.length > 0) {
    const { data: sumidoClients } = await supabase
      .from('clients')
      .select('id, phone')
      .in('id', sumidoClientIds)

    const phones = (sumidoClients || []).map((c) => c.phone)
    const { data: customersOfBusiness } = phones.length > 0
      ? await supabase
          .from('customers')
          .select('id, phone')
          .eq('business_id', business.id)
          .in('phone', phones)
      : { data: [] }

    sumidosTotal = (customersOfBusiness || []).length
    sumidosWithoutCoupon = (customersOfBusiness || []).filter(
      (c) => !customerIdsWithActiveCoupon.has(c.id)
    ).length
    for (const c of customersOfBusiness || []) sumidoCustomerIdsSet.add(c.id)
  }

  // Orphan coupons calc (cupons ativos atribuídos a quem não está mais sumido)
  let orphanCoupons = 0
  for (const c of existingCoupons || []) {
    const isActive = !c.used_at && c.expires_at > nowIso
    const ownerStillSumido = c.customer_id && sumidoCustomerIdsSet.has(c.customer_id)
    if (isActive && !ownerStillSumido) orphanCoupons++
  }

  // ─────────────────────────────────────────────────
  // ABA ANIVERSARIANTES — filtro por mês de birthday
  // ─────────────────────────────────────────────────
  // λ.fuso · mês do dia BR · getMonth() no servidor lê UTC e, no último dia do
  // mês depois das 21h, a lista de aniversariantes pulava pro mês seguinte
  const monthStr = todayBR().slice(5, 7)

  const { data: customersWithBirthday } = await supabase
    .from('customers')
    .select('id, birthday')
    .eq('business_id', business.id)
    .not('birthday', 'is', null)

  const aniversariantesIds = (customersWithBirthday || [])
    .filter((c) => typeof c.birthday === 'string' && c.birthday.slice(5, 7) === monthStr)
    .map((c) => c.id)

  const aniversariantesTotal = aniversariantesIds.length
  const aniversariantesWithoutCoupon = aniversariantesIds.filter(
    (id) => !customerIdsWithActiveCoupon.has(id)
  ).length

  // ─────────────────────────────────────────────────
  // ABA AVULSO (v44) — cupons standalone ativos + profs
  // ─────────────────────────────────────────────────
  const { data: standaloneCouponsRaw } = await supabase
    .from('coupons')
    .select('id, code, discount_type, discount_value, expires_at, standalone_label, professional_id, created_at')
    .eq('business_id', business.id)
    .eq('is_standalone', true)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: professionalsAtivos } = await supabase
    .from('professionals')
    .select('id, name')
    .eq('business_id', business.id)
    .eq('active', true)
    .order('name')

  // Conta usos em batch
  const standaloneIds = (standaloneCouponsRaw || []).map((c) => c.id)
  const { data: standaloneRedemptions } = standaloneIds.length > 0
    ? await supabase
        .from('coupon_redemptions')
        .select('coupon_id')
        .in('coupon_id', standaloneIds)
    : { data: [] }
  const usageByCoupon: Record<string, number> = {}
  for (const r of standaloneRedemptions || []) {
    if (r.coupon_id) usageByCoupon[r.coupon_id] = (usageByCoupon[r.coupon_id] ?? 0) + 1
  }

  const profNameById = new Map(
    (professionalsAtivos || []).map((p) => [p.id, p.name as string]),
  )
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const standaloneCoupons = (standaloneCouponsRaw || []).map((c) => ({
    id: c.id,
    code: c.code,
    discount_type: c.discount_type as 'fixed' | 'percent',
    discount_value: Number(c.discount_value),
    expires_at: c.expires_at,
    standalone_label: c.standalone_label,
    professional_id: c.professional_id,
    professional_name: c.professional_id ? profNameById.get(c.professional_id) ?? null : null,
    uses: usageByCoupon[c.id] ?? 0,
    share_url: `${appUrl}/${business.slug}?cupom=${c.code}`,
    created_at: c.created_at,
  }))
  const standaloneAtivos = standaloneCoupons.length

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="admin-orb-1 absolute -top-32 left-1/2 w-[520px] h-[520px] rounded-full blur-[120px]"
          style={{ background: 'var(--admin-bg-orb-1)' }}
        />
        <div
          className="admin-orb-2 absolute top-[40%] -right-24 w-72 h-72 rounded-full blur-[80px]"
          style={{ background: 'var(--admin-bg-orb-2)' }}
        />
      </div>
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.18) 100%)',
        }}
      />

      <div className="relative">
        <SubPageHeader
          title="Campanhas"
          subtitle={business.name}
          back="/admin/clientes"
        />
        <div className="max-w-lg lg:max-w-5xl mx-auto px-4 lg:px-8 py-6">
          <CampanhasTabs
            businessSlug={business.slug}
            businessName={business.name}
            businessDescription={business.description}
            existingCoupons={existingCoupons || []}
            sumidosTotal={sumidosTotal}
            sumidosWithoutCoupon={sumidosWithoutCoupon}
            orphanCoupons={orphanCoupons}
            aniversariantesTotal={aniversariantesTotal}
            aniversariantesWithoutCoupon={aniversariantesWithoutCoupon}
            mesAtualNome={MESES_PT[Number(monthStr) - 1]}
            professionals={professionalsAtivos || []}
            standaloneCoupons={standaloneCoupons}
            standaloneAtivos={standaloneAtivos}
            initialTab={initialTab}
            ticketMedio={ticketMedio}
          />
        </div>
      </div>
    </main>
  )
}
