import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SubPageHeader from '@/components/admin/SubPageHeader'
import AnalisesView from '@/components/admin/AnalisesView'

export default async function AnalisesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single()
  if (!business) redirect('/cadastro')

  const today = new Date()
  // Mes atual
  const startCurrent = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString().split('T')[0]
  const endCurrent = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString().split('T')[0]
  // Mes anterior
  const startPrev = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    .toISOString().split('T')[0]
  const endPrev = new Date(today.getFullYear(), today.getMonth(), 0)
    .toISOString().split('T')[0]

  // Pega 2 meses em paralelo (atual + anterior pra comparativo)
  const [currentRes, prevRes] = await Promise.all([
    supabase
      .from('appointments')
      .select(`
        appointment_date, total_price, paid_at, status, service_name,
        professional:professionals(id, name)
      `)
      .eq('business_id', business.id)
      .gte('appointment_date', startCurrent)
      .lte('appointment_date', endCurrent)
      .not('paid_at', 'is', null),
    supabase
      .from('appointments')
      .select('total_price, paid_at')
      .eq('business_id', business.id)
      .gte('appointment_date', startPrev)
      .lte('appointment_date', endPrev)
      .not('paid_at', 'is', null),
  ])

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
            prevMonthTotal={(prevRes.data || []).reduce((s, a) => s + Number(a.total_price || 0), 0)}
            startCurrent={startCurrent}
            endCurrent={endCurrent}
          />
        </div>
      </div>
    </main>
  )
}
