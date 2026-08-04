import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
import { fetchAll } from '@/lib/fetch-all'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { todayBR, addDaysBR } from '@/lib/date-br'
import SubPageHeader from '@/components/admin/SubPageHeader'
import ReativarSumidosView from '@/components/admin/ReativarSumidosView'

export default async function ReativarSumidosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, slug, name, description')
    .eq('owner_id', user.id)
    .single()
  if (!business) redirect(await destinoSemNegocio())

  // Lista cupons ativos pra mostrar dashboard mini
  const { data: existingCoupons } = await supabase
    .from('coupons')
    .select('id, code, sent_at, used_at, expires_at, customer_id')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Conta sumidos atuais (>=40 dias sem aparecer) e quantos NAO tem
  // cupom ativo. CIC NB-3 reportou: contador "8 ativos / 3 usados"
  // nao esclarece quantos sumidos AINDA precisam de campanha.
  // Calcula via JOIN entre clients (com last appointment) e coupons.
  const SUMIDO_DAYS = 40
  // λ.fuso · corte em dia BR · com new Date() no servidor (UTC) o corte de
  // "sumido há 40 dias" deslocava 1 dia à noite
  const cutoffStr = addDaysBR(todayBR(), -SUMIDO_DAYS)

  // Pega ultimo agendamento por client_id
  // Base inteira: e daqui que sai quem 'sumiu'. Truncado em 1000, cliente
  // antigo simplesmente nao aparece na lista de reativacao.
  const lastAppts = await fetchAll<{ client_id: string | null; appointment_date: string }>(() =>
    supabase
      .from('appointments')
      .select('client_id, appointment_date')
      .eq('business_id', business.id)
      .not('client_id', 'is', null)
      .order('appointment_date', { ascending: false }),
  )

  const lastByClient = new Map<string, string>()
  for (const a of lastAppts || []) {
    if (a.client_id && !lastByClient.has(a.client_id)) {
      lastByClient.set(a.client_id, a.appointment_date)
    }
  }

  const sumidoClientIds = Array.from(lastByClient.entries())
    .filter(([, date]) => date < cutoffStr)
    .map(([cid]) => cid)

  // Match clients sumidos -> customers do business via phone
  let sumidosWithoutCoupon = 0
  let sumidosTotal = 0
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

    const nowIsoForCheck = new Date().toISOString()
    const customerIdsWithActiveCoupon = new Set(
      (existingCoupons || [])
        .filter((c) => !c.used_at && c.expires_at > nowIsoForCheck)
        .map((c) => c.customer_id)
        .filter(Boolean) as string[]
    )

    sumidosWithoutCoupon = (customersOfBusiness || []).filter(
      (c) => !customerIdsWithActiveCoupon.has(c.id)
    ).length
  }

  // Ticket médio do business · pra calcular ROI estimado da campanha.
  // Pega últimos 90 dias de pagos · fallback R$ 50 se sem dados.
  const ninetyDaysAgoStr = addDaysBR(todayBR(), -90)
  const { data: paidAppts } = await supabase
    .from('appointments')
    .select('total_price')
    .eq('business_id', business.id)
    .not('paid_at', 'is', null)
    .gte('appointment_date', ninetyDaysAgoStr)
  const validPrices = (paidAppts || []).map((a) => Number(a.total_price)).filter((p) => p > 0)
  const ticketMedio = validPrices.length > 0
    ? validPrices.reduce((s, p) => s + p, 0) / validPrices.length
    : 50

  // Cupons "orfaos": ativos atribuidos a customer que NAO esta mais sumido
  // (cliente pegou cupom, depois reativou-se sozinho). CIC NB-3:
  // contador "8 ativos" misturava esses, dono nao entendia diferenca.
  const sumidoCustomerIds = new Set<string>()
  if (sumidoClientIds.length > 0) {
    const { data: sumidoClients } = await supabase
      .from('clients')
      .select('id, phone')
      .in('id', sumidoClientIds)
    const sumidoPhones = (sumidoClients || []).map((c) => c.phone)
    const { data: sumidoCustomers } = sumidoPhones.length > 0
      ? await supabase
          .from('customers')
          .select('id')
          .eq('business_id', business.id)
          .in('phone', sumidoPhones)
      : { data: [] }
    for (const c of sumidoCustomers || []) sumidoCustomerIds.add(c.id)
  }
  const nowIsoForOrphan = new Date().toISOString()
  let orphanCoupons = 0
  for (const c of existingCoupons || []) {
    const isActive = !c.used_at && c.expires_at > nowIsoForOrphan
    const ownerStillSumido = c.customer_id && sumidoCustomerIds.has(c.customer_id)
    if (isActive && !ownerStillSumido) orphanCoupons++
  }

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="admin-orb-1 absolute -top-32 left-1/2 w-[520px] h-[520px] rounded-full blur-[120px]"
          style={{ background: 'var(--admin-bg-orb-1)' }} />
        <div className="admin-orb-2 absolute top-[40%] -right-24 w-72 h-72 rounded-full blur-[80px]"
          style={{ background: 'var(--admin-bg-orb-2)' }} />
      </div>
      <div className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(ellipse 100% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.18) 100%)' }} />

      <div className="relative">
        <SubPageHeader
          title="Reativar sumidos"
          subtitle={business.name}
          back="/admin/clientes"
        />
        <div className="max-w-lg lg:max-w-5xl mx-auto px-4 lg:px-8 py-6">
          <ReativarSumidosView
            businessSlug={business.slug}
            businessName={business.name}
            businessDescription={business.description}
            existingCoupons={existingCoupons || []}
            sumidosTotal={sumidosTotal}
            sumidosWithoutCoupon={sumidosWithoutCoupon}
            orphanCoupons={orphanCoupons}
            ticketMedio={ticketMedio}
          />
        </div>
      </div>
    </main>
  )
}
