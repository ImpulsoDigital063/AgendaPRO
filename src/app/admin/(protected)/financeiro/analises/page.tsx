import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SubPageHeader from '@/components/admin/SubPageHeader'
import AnalisesView from '@/components/admin/AnalisesView'
import { getApptDiscountMap } from '@/lib/commission-discount'
import { todayBR, addDaysBR } from '@/lib/date-br'
import { negocioDoPainel } from '@/lib/admin-data'

export default async function AnalisesPage({
  searchParams,
}: {
  searchParams: Promise<{ prof?: string; service?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', await negocioDoPainel(user.id))
    .single()
  if (!business) redirect(await destinoSemNegocio())

  const { prof: profFilter, service: serviceFilter } = await searchParams

  // Janela rolling 30d (consistencia com /admin/financeiro filtro "Mes").
  // CIC rodada 5 reportou bug critico: /analises usava mes calendario
  // (R$3k em maio so) enquanto /financeiro usava rolling 30d (R$26k).
  // Inconsistencia destruia credibilidade da demo.
  // - "current": ultimos 30 dias passados (mesma janela do KPI principal)
  // - "prev": 30 dias antes desses (pra comparativo)
  // λ.fuso · janelas em dia BR (servidor roda em UTC · depois das 21h a janela
  // inteira deslocava 1 dia e o comparativo mês a mês ficava torto)
  const today = todayBR()
  const startCurrent = addDaysBR(today, -30)
  const endCurrent = today
  const startPrev = addDaysBR(today, -60)
  const endPrev = addDaysBR(today, -31)

  // 1. Mes atual: TODOS agendamentos (pra calcular cancelamento e
  // taxa de conversao). Pagos vao agregar receita.
  // Cortesia + Crédito não contam como receita (não filtra na query porque
  // currentMonth precisa TODOS pra estatística de cancelamento/conversão · o
  // filtro de receita acontece no AnalisesView ao agregar).
  let currentQuery = supabase
    .from('appointments')
    .select(`
      id, appointment_date, start_time, total_price, paid_at, invoice_item_id,
      payment_method, status, service_name, client_id, sinal_expirado_at,
      professional:professionals(id, name)
    `)
    .eq('business_id', business.id)
    .gte('appointment_date', startCurrent)
    .lte('appointment_date', endCurrent)

  // Filtros opcionais
  if (profFilter) currentQuery = currentQuery.eq('professional_id', profFilter)
  if (serviceFilter) currentQuery = currentQuery.eq('service_name', serviceFilter)

  // 2. Mes anterior: total pago REAL (pra comparativo) · exclui cortesia e crédito
  let prevQuery = supabase
    .from('appointments')
    .select('id, total_price, payment_method, invoice_item_id')
    .eq('business_id', business.id)
    .not('payment_method', 'in', '(courtesy,credit,points)')
    .gte('appointment_date', startPrev)
    .lte('appointment_date', endPrev)
    .not('paid_at', 'is', null)
  if (profFilter) prevQuery = prevQuery.eq('professional_id', profFilter)
  if (serviceFilter) prevQuery = prevQuery.eq('service_name', serviceFilter)

  // 2b. Vendas de produto pagas (mes atual + anterior) · pra somar na receita
  const salesCurrentQuery = supabase
    .from('sales')
    .select('total, sale_date, payment_method, professional_id')
    .eq('business_id', business.id)
    .eq('type', 'product_sale')
    .eq('status', 'paid')
    .not('payment_method', 'in', '(courtesy,credit,points)')
    .gte('sale_date', startCurrent)
    .lte('sale_date', endCurrent)

  const salesPrevQuery = supabase
    .from('sales')
    .select('total')
    .eq('business_id', business.id)
    .eq('type', 'product_sale')
    .eq('status', 'paid')
    .not('payment_method', 'in', '(courtesy,credit,points)')
    .gte('sale_date', startPrev)
    .lte('sale_date', endPrev)

  // 3. Client IDs com agendamento ANTES do mes atual (pra distinguir
  // cliente novo vs recorrente). Trafega pouco — so client_ids.
  const previousClientsQuery = supabase
    .from('appointments')
    .select('client_id')
    .eq('business_id', business.id)
    .lt('appointment_date', startCurrent)
    .not('client_id', 'is', null)

  // 4. Listas de profissionais e servicos do business pros filtros
  const profsQuery = supabase
    .from('professionals')
    .select('id, name')
    .eq('business_id', business.id)
    .eq('active', true)
    .order('name')

  const servicesQuery = supabase
    .from('services')
    .select('name')
    .eq('business_id', business.id)
    .eq('active', true)
    .order('name')

  const [currentRes, prevRes, prevClientsRes, profsRes, servicesRes, salesCurrentRes, salesPrevRes] = await Promise.all([
    currentQuery,
    prevQuery,
    previousClientsQuery,
    profsQuery,
    servicesQuery,
    salesCurrentQuery,
    salesPrevQuery,
  ])

  const previousClientIds = new Set(
    (prevClientsRes.data || []).map((r: { client_id: string | null }) => r.client_id).filter(Boolean) as string[]
  )

  // λ.valor-liquido: receita (atual e anterior) com o cupom da comanda abatido
  // antes de passar pro AnalisesView (04/07/2026).
  const [discCur, discPrev] = await Promise.all([
    getApptDiscountMap(supabase, (currentRes.data ?? []).map((a) => (a as { invoice_item_id: string | null }).invoice_item_id)),
    getApptDiscountMap(supabase, (prevRes.data ?? []).map((a) => (a as { invoice_item_id: string | null }).invoice_item_id)),
  ])
  /* Serviço pelo líquido. O produto vem da soma de `sales` (salesCurrent /
     salesPrev). Antes o atendimento com produto na comanda recebia o valor
     da comanda inteira (charged) E o produto era somado de novo pelas
     vendas — 195 + 95 virava 385 (auditoria 29/09). */
  const netAppt = (a: Record<string, unknown>, m: Record<string, number>) => ({
    ...a,
    total_price: Math.max(0, Number(a.total_price ?? 0) - (m[a.id as string] ?? 0)),
  })
  const currentNet = (currentRes.data ?? []).map((a) => netAppt(a as Record<string, unknown>, discCur))
  const prevNet = (prevRes.data ?? []).map((a) => netAppt(a as Record<string, unknown>, discPrev))

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="admin-orb-1 absolute -top-32 left-1/2 w-[520px] h-[520px] rounded-full blur-[120px]"
          style={{ background: 'var(--admin-bg-orb-1)' }} />
        <div className="admin-orb-2 absolute top-[40%] -right-24 w-72 h-72 rounded-full blur-[80px]"
          style={{ background: 'var(--admin-bg-orb-2)' }} />
      </div>
      <div className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(ellipse 100% 80% at 50% 50%, transparent 55%, rgba(15,23,42,0.05) 100%)' }} />

      <div className="relative">
        <SubPageHeader title="Análises" subtitle={business.name} back="/admin/financeiro" />
        <div className="max-w-lg mx-auto px-4 py-6">
          <AnalisesView
            currentMonth={currentNet as never[]}
            prevMonth={prevNet as never[]}
            previousClientIds={Array.from(previousClientIds)}
            professionals={profsRes.data || []}
            services={(servicesRes.data || []).map((s: { name: string }) => s.name)}
            startCurrent={startCurrent}
            endCurrent={endCurrent}
            profFilter={profFilter || ''}
            serviceFilter={serviceFilter || ''}
            productSalesCurrent={(salesCurrentRes.data || []) as never[]}
            productSalesPrev={(salesPrevRes.data || []) as never[]}
          />
        </div>
      </div>
    </main>
  )
}
