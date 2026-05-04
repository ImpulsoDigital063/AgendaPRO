import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SubPageHeader from '@/components/admin/SubPageHeader'
import ClientesView from '@/components/admin/ClientesView'

export default async function ClientesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!business) redirect('/cadastro')

  // Busca todos os agendamentos com client_id deste negócio
  const { data: apptData } = await supabase
    .from('appointments')
    .select('client_id, appointment_date, status, service_name, total_price')
    .eq('business_id', business.id)
    .not('client_id', 'is', null)
    .order('appointment_date', { ascending: false })

  // Monta estatísticas por cliente — inclui firstDate (primeira visita)
  // pra que "Novos/mês" reflita comportamento real, não created_at do
  // cadastro: cliente que veio em jan e voltou em mai não é "novo de mai".
  type Stats = { count: number; firstDate: string; lastDate: string; totalSpent: number }
  const statsMap: Record<string, Stats> = {}

  for (const a of apptData || []) {
    if (!a.client_id) continue
    if (!statsMap[a.client_id]) {
      statsMap[a.client_id] = { count: 0, firstDate: '', lastDate: '', totalSpent: 0 }
    }
    statsMap[a.client_id].count++
    if (!statsMap[a.client_id].lastDate || a.appointment_date > statsMap[a.client_id].lastDate) {
      statsMap[a.client_id].lastDate = a.appointment_date
    }
    if (!statsMap[a.client_id].firstDate || a.appointment_date < statsMap[a.client_id].firstDate) {
      statsMap[a.client_id].firstDate = a.appointment_date
    }
    if (a.total_price) {
      statsMap[a.client_id].totalSpent += a.total_price
    }
  }

  const clientIds = Object.keys(statsMap)

  // Busca clients globais + customers do business + cupons ativos
  // em paralelo.
  // - clients: dados universais (nome, telefone, email)
  // - customers: relação business↔cliente com pontos de fidelidade
  // - activeCoupons: pra calcular "sumidos sem cupom ativo" (so esses
  //   precisam de NOVA campanha de reativação)
  const nowIso = new Date().toISOString()
  const [clientsRes, customersRes, couponsRes] = await Promise.all([
    clientIds.length > 0
      ? supabase
          .from('clients')
          .select('id, name, phone, email, created_at')
          .in('id', clientIds)
          .order('name')
      : Promise.resolve({ data: [] as Array<{ id: string; name: string; phone: string; email: string | null; created_at: string }> }),
    supabase
      .from('customers')
      .select('id, name, phone, email, total_points, created_at')
      .eq('business_id', business.id),
    supabase
      .from('coupons')
      .select('customer_id')
      .eq('business_id', business.id)
      .is('used_at', null)
      .gt('expires_at', nowIso),
  ])

  const clients = clientsRes.data || []
  const customers = customersRes.data || []
  const activeCustomerIds = new Set(
    (couponsRes.data || []).map((c: { customer_id: string | null }) => c.customer_id).filter(Boolean) as string[]
  )

  // Index customers por telefone normalizado (pra match com clients)
  const customerByPhone = new Map<string, { id: string; total_points: number }>()
  for (const cust of customers) {
    const key = (cust.phone || '').replace(/\D/g, '')
    if (key) customerByPhone.set(key, { id: cust.id, total_points: cust.total_points ?? 0 })
  }

  // Mapa de clients que JA tem appointment (vindos de statsMap)
  const clientsWithStats = clients.map((c) => {
    const phoneKey = (c.phone || '').replace(/\D/g, '')
    const cust = customerByPhone.get(phoneKey)
    return {
      ...c,
      ...(statsMap[c.id] || { count: 0, firstDate: '', lastDate: '', totalSpent: 0 }),
      customer_id: cust?.id ?? null,
      total_points: cust?.total_points ?? 0,
    }
  })

  // Customers cadastrados manualmente (sem agendamento ainda) — só
  // aparecem se NAO existem como client com appointment. Match pelo
  // phone normalizado.
  const phonesJaListados = new Set(clientsWithStats.map((c) => (c.phone || '').replace(/\D/g, '')))
  const customersOrfaos = customers
    .filter((cust) => {
      const phoneKey = (cust.phone || '').replace(/\D/g, '')
      return phoneKey && !phonesJaListados.has(phoneKey)
    })
    .map((cust) => ({
      id: cust.id, // usa customer_id como id pra UI
      name: cust.name,
      phone: cust.phone,
      email: cust.email,
      created_at: cust.created_at,
      count: 0,
      firstDate: '',
      lastDate: '',
      totalSpent: 0,
      customer_id: cust.id,
      total_points: cust.total_points ?? 0,
    }))

  const todosClientes = [...clientsWithStats, ...customersOrfaos]

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      {/* Mesma atmosfera da home — orbs animados + vignette */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="admin-orb-1 absolute -top-32 left-1/2 w-[520px] h-[520px] rounded-full blur-[120px]"
          style={{ background: 'var(--admin-bg-orb-1)' }}
        />
        <div
          className="admin-orb-2 absolute top-[40%] -right-24 w-72 h-72 rounded-full blur-[80px]"
          style={{ background: 'var(--admin-bg-orb-2)' }}
        />
        <div
          className="admin-orb-3 absolute bottom-0 -left-20 w-64 h-64 rounded-full blur-[80px]"
          style={{ background: 'var(--admin-bg-orb-3)' }}
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
          title="Clientes"
          subtitle={`${todosClientes.length} cadastrado${todosClientes.length !== 1 ? 's' : ''}`}
        />
        <div className="max-w-lg mx-auto px-4 py-6">
          <ClientesView
            clients={todosClientes}
            bookingSlug={business.slug}
            businessId={business.id}
            activeCustomerIds={Array.from(activeCustomerIds)}
          />
        </div>
      </div>
    </main>
  )
}
