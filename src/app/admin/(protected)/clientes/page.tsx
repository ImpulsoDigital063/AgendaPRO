import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
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
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-400 hover:text-gray-700 transition-colors">
              ← Voltar
            </Link>
            <div>
              <h1 className="font-bold text-gray-900">Clientes</h1>
              <p className="text-gray-400 text-xs">{clientsWithStats.length} cadastrado{clientsWithStats.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <ClientesView clients={clientsWithStats} />
      </div>
    </main>
  )
}
