import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
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
  if (!business) redirect(await destinoSemNegocio())

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

  // v104 · contas VENCIDAS e não pagas voltam sempre, mesmo fora do período
  // escolhido. Conta atrasada que some quando vira o mês é conta esquecida —
  // e não perder vencimento de vista é o motivo da feature existir.
  const { data: vencidasForaDoPeriodo } = await supabase
    .from('expenses')
    .select('*')
    .eq('business_id', business.id)
    .eq('status', 'scheduled')
    .lt('due_date', startDate)
    .order('due_date', { ascending: true })

  /* v142 · comissao paga conta como despesa (chave comissao_no_fluxo).
     Nao vira linha editavel: `commission_payments` continua sendo a fonte, e
     a aba mostra o total num card proprio. Salario cadastrado fica de fora de
     proposito — quem usa ja lanca como despesa manual e somaria dobrado. */
  let comissoesPagas = 0
  if ((business as { comissao_no_fluxo?: boolean | null }).comissao_no_fluxo === true) {
    const { data: pagamentos } = await supabase
      .from('commission_payments')
      .select('paid_amount, bonus_amount')
      .eq('business_id', business.id)
      .gte('paid_at', startDate)
      .lte('paid_at', endDate + 'T23:59:59')
    comissoesPagas = (pagamentos ?? []).reduce(
      (s, p) => s + Number(p.paid_amount ?? 0) + Number(p.bonus_amount ?? 0),
      0
    )
  }

  const idsNoPeriodo = new Set((expenses || []).map((e) => e.id))
  const vencidas = (vencidasForaDoPeriodo || []).filter((e) => !idsNoPeriodo.has(e.id))

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
            comissoesPagas={comissoesPagas}
            vencidas={vencidas as Expense[]}
            periodo={periodo}
            currentMonth={currentMonth}
            mesEspecifico={!!mesParam}
          />
        </div>
      </div>
    </main>
  )
}
