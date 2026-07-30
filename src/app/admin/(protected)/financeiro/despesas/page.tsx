import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SubPageHeader from '@/components/admin/SubPageHeader'
import DespesasView from '@/components/admin/DespesasView'
import type { Expense } from '@/lib/types'
import { todayBR, addDaysBR, monthBoundsBR } from '@/lib/date-br'

export default async function DespesasPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; mes?: string }>
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

  const { periodo: periodoParam, mes: mesParam } = await searchParams
  // ?mes=YYYY-MM tem prioridade sobre ?periodo. Permite navegar histórico
  // (essencial pra Marko que migrou despesas dos meses anteriores).
  const periodo = mesParam ? 'mes' : (periodoParam || 'mes')

  // λ.fuso · tudo derivado do dia BR. Antes: new Date() cru + getFullYear/
  // getMonth, que no servidor (UTC) viram o dia/mês seguinte depois das 21h —
  // "Hoje" mostrava o dia errado e a navegação de mês podia pular na virada.
  const today = todayBR()
  const mesAtual = today.slice(0, 7) // YYYY-MM
  let startDate: string
  let endDate: string
  let currentMonth: string // YYYY-MM do mês ativo (pra navegação)

  if (mesParam) {
    const bounds = monthBoundsBR(mesParam)
    startDate = bounds.start
    endDate = bounds.end
    currentMonth = mesParam
  } else if (periodo === 'hoje') {
    startDate = today
    endDate = today
    currentMonth = mesAtual
  } else if (periodo === 'semana') {
    startDate = addDaysBR(today, -6)
    endDate = today
    currentMonth = mesAtual
  } else {
    const bounds = monthBoundsBR(mesAtual)
    startDate = bounds.start
    endDate = bounds.end
    currentMonth = mesAtual
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
            currentMonth={currentMonth}
            mesEspecifico={!!mesParam}
          />
        </div>
      </div>
    </main>
  )
}
