import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import FinanceiroView, { type AppointmentRow } from '@/components/admin/FinanceiroView'

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>
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

  const { periodo: periodoParam } = await searchParams
  const periodo = periodoParam || 'mes'

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  let startDate: string
  if (periodo === 'hoje') {
    startDate = todayStr
  } else if (periodo === 'semana') {
    const d = new Date(today)
    d.setDate(d.getDate() - 6)
    startDate = d.toISOString().split('T')[0]
  } else {
    const d = new Date(today.getFullYear(), today.getMonth(), 1)
    startDate = d.toISOString().split('T')[0]
  }

  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id, client_name, client_phone, appointment_date, start_time,
      status, service_name, total_price,
      professional:professionals(id, name, commission_percentage)
    `)
    .eq('business_id', business.id)
    .gte('appointment_date', startDate)
    .lte('appointment_date', todayStr)
    .order('appointment_date', { ascending: false })
    .order('start_time', { ascending: false })

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-400 hover:text-gray-700 transition-colors">
              ← Voltar
            </Link>
            <div>
              <h1 className="font-bold text-gray-900">Financeiro</h1>
              <p className="text-gray-400 text-xs">{business.name}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <FinanceiroView appointments={(appointments || []) as unknown as AppointmentRow[]} periodo={periodo} />
      </div>
    </main>
  )
}
