import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SubPageHeader from '@/components/admin/SubPageHeader'
import AnalisesView from '@/components/admin/AnalisesView'

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
    .eq('owner_id', user.id)
    .single()
  if (!business) redirect('/cadastro')

  const { prof: profFilter, service: serviceFilter } = await searchParams

  const today = new Date()
  const startCurrent = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  const endCurrent = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
  const startPrev = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0]
  const endPrev = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0]

  // 1. Mes atual: TODOS agendamentos (pra calcular cancelamento e
  // taxa de conversao). Pagos vao agregar receita.
  let currentQuery = supabase
    .from('appointments')
    .select(`
      id, appointment_date, start_time, total_price, paid_at,
      payment_method, status, service_name, client_id,
      professional:professionals(id, name)
    `)
    .eq('business_id', business.id)
    .gte('appointment_date', startCurrent)
    .lte('appointment_date', endCurrent)

  // Filtros opcionais
  if (profFilter) currentQuery = currentQuery.eq('professional_id', profFilter)
  if (serviceFilter) currentQuery = currentQuery.eq('service_name', serviceFilter)

  // 2. Mes anterior: total pago (pra comparativo)
  let prevQuery = supabase
    .from('appointments')
    .select('total_price, payment_method')
    .eq('business_id', business.id)
    .gte('appointment_date', startPrev)
    .lte('appointment_date', endPrev)
    .not('paid_at', 'is', null)
  if (profFilter) prevQuery = prevQuery.eq('professional_id', profFilter)
  if (serviceFilter) prevQuery = prevQuery.eq('service_name', serviceFilter)

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

  const [currentRes, prevRes, prevClientsRes, profsRes, servicesRes] = await Promise.all([
    currentQuery,
    prevQuery,
    previousClientsQuery,
    profsQuery,
    servicesQuery,
  ])

  const previousClientIds = new Set(
    (prevClientsRes.data || []).map((r: { client_id: string | null }) => r.client_id).filter(Boolean) as string[]
  )

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
        <SubPageHeader title="Análises" subtitle={business.name} back="/admin/financeiro" />
        <div className="max-w-lg mx-auto px-4 py-6">
          <AnalisesView
            currentMonth={(currentRes.data || []) as never[]}
            prevMonth={(prevRes.data || []) as never[]}
            previousClientIds={Array.from(previousClientIds)}
            professionals={profsRes.data || []}
            services={(servicesRes.data || []).map((s: { name: string }) => s.name)}
            startCurrent={startCurrent}
            endCurrent={endCurrent}
            profFilter={profFilter || ''}
            serviceFilter={serviceFilter || ''}
          />
        </div>
      </div>
    </main>
  )
}
