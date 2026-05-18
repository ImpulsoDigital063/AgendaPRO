import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SubPageHeader from '@/components/admin/SubPageHeader'
import DespesasView from '@/components/admin/DespesasView'
import type { Expense } from '@/lib/types'

export default async function DespesasPage({
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
  let startDate: string
  let endDate: string
  if (periodo === 'hoje') {
    startDate = today.toISOString().split('T')[0]
    endDate = startDate
  } else if (periodo === 'semana') {
    const start = new Date(today)
    start.setDate(start.getDate() - 6)
    startDate = start.toISOString().split('T')[0]
    endDate = today.toISOString().split('T')[0]
  } else {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString().split('T')[0]
    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      .toISOString().split('T')[0]
  }

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('business_id', business.id)
    .gte('occurred_at', startDate)
    .lte('occurred_at', endDate)
    .order('occurred_at', { ascending: false })
    .order('created_at', { ascending: false })

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
        <SubPageHeader title="Despesas" subtitle={business.name} back="/admin/financeiro" />
        <div className="max-w-lg mx-auto px-4 py-6 lg:max-w-5xl lg:px-8">
          <DespesasView
            expenses={(expenses || []) as Expense[]}
            periodo={periodo}
          />
        </div>
      </div>
    </main>
  )
}
