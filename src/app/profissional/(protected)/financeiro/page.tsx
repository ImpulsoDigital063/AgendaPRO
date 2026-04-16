import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SubPageHeader from '@/components/admin/SubPageHeader'
import ProfFinanceiroView from '@/components/profissional/ProfFinanceiroView'

export default async function ProfissionalFinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/profissional/login')

  const { data: professional } = await supabase
    .from('professionals')
    .select('id, name, commission_percentage, business_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!professional) redirect('/profissional/login')

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
    .select('id, client_name, client_phone, appointment_date, start_time, status, service_name, total_price')
    .eq('professional_id', professional.id)
    .gte('appointment_date', startDate)
    .lte('appointment_date', todayStr)
    .order('appointment_date', { ascending: false })
    .order('start_time', { ascending: false })

  return (
    <main>
      <SubPageHeader title="Meu Financeiro" subtitle={professional.name} />
      <div className="max-w-lg mx-auto px-4 py-6">
        <ProfFinanceiroView
          appointments={appointments || []}
          periodo={periodo}
          commissionPercentage={professional.commission_percentage ?? 0}
        />
      </div>
    </main>
  )
}
