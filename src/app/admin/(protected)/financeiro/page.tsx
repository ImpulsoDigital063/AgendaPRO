import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SubPageHeader from '@/components/admin/SubPageHeader'
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

  // Range de cada periodo cobre PASSADO + FUTURO dentro do escopo:
  // - Hoje: so o dia de hoje
  // - 7 dias: ultimos 3 + proximos 3 (janela de uma semana centrada)
  // - Mes: do primeiro ao ultimo dia do mes corrente
  // Sem isso, agendamentos confirmados futuros sumiam de "A receber".
  let startDate: string
  let endDate: string
  if (periodo === 'hoje') {
    startDate = todayStr
    endDate = todayStr
  } else if (periodo === 'semana') {
    const start = new Date(today)
    start.setDate(start.getDate() - 3)
    const end = new Date(today)
    end.setDate(end.getDate() + 3)
    startDate = start.toISOString().split('T')[0]
    endDate = end.toISOString().split('T')[0]
  } else {
    // mes corrente: dia 1 ate ultimo dia do mes
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    startDate = start.toISOString().split('T')[0]
    endDate = end.toISOString().split('T')[0]
  }

  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id, client_name, client_phone, appointment_date, start_time,
      status, service_name, total_price,
      professional:professionals(id, name, commission_percentage, employment_type)
    `)
    .eq('business_id', business.id)
    .gte('appointment_date', startDate)
    .lte('appointment_date', endDate)
    .order('appointment_date', { ascending: false })
    .order('start_time', { ascending: false })

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      {/* Mesma atmosfera da home */}
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
        <SubPageHeader title="Financeiro" subtitle={business.name} />
        <div className="max-w-lg mx-auto px-4 py-6">
          <FinanceiroView appointments={(appointments || []) as unknown as AppointmentRow[]} periodo={periodo} />
        </div>
      </div>
    </main>
  )
}
