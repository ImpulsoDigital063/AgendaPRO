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

  // Monta estatísticas por cliente
  type Stats = { count: number; lastDate: string; totalSpent: number }
  const statsMap: Record<string, Stats> = {}

  for (const a of apptData || []) {
    if (!a.client_id) continue
    if (!statsMap[a.client_id]) {
      statsMap[a.client_id] = { count: 0, lastDate: '', totalSpent: 0 }
    }
    statsMap[a.client_id].count++
    if (!statsMap[a.client_id].lastDate || a.appointment_date > statsMap[a.client_id].lastDate) {
      statsMap[a.client_id].lastDate = a.appointment_date
    }
    if (a.total_price) {
      statsMap[a.client_id].totalSpent += a.total_price
    }
  }

  const clientIds = Object.keys(statsMap)

  const { data: clients } = clientIds.length > 0
    ? await supabase
        .from('clients')
        .select('id, name, phone, email, created_at')
        .in('id', clientIds)
        .order('name')
    : { data: [] }

  const clientsWithStats = (clients || []).map((c) => ({
    ...c,
    ...(statsMap[c.id] || { count: 0, lastDate: '', totalSpent: 0 }),
  }))

  return (
    <main>
      <SubPageHeader
        title="Clientes"
        subtitle={`${clientsWithStats.length} cadastrado${clientsWithStats.length !== 1 ? 's' : ''}`}
      />
      <div className="max-w-lg mx-auto px-4 py-6">
        <ClientesView clients={clientsWithStats} />
      </div>
    </main>
  )
}
