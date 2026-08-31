import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SubPageHeader from '@/components/admin/SubPageHeader'
import CanceladosView from '@/components/admin/CanceladosView'
import { getApptChargedMap } from '@/lib/queries/appointment-charged-total'
import { todayBR, addDaysBR, monthBoundsBR } from '@/lib/date-br'

export default async function CanceladosPage({
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
  if (!business) redirect(await destinoSemNegocio())

  const { periodo: periodoParam } = await searchParams
  const periodo = periodoParam || 'mes'

  // λ.fuso · dia BR, nunca new Date().toISOString() cru (servidor roda em UTC:
  // depois das 21h no Brasil o filtro "Hoje" mostrava o dia seguinte)
  const today = todayBR()
  let startDate: string
  let endDate: string
  if (periodo === 'hoje') {
    startDate = today
    endDate = today
  } else if (periodo === 'semana') {
    startDate = addDaysBR(today, -6)
    endDate = today
  } else {
    // Mês corrente · aritmética de string, sem Date de calendário
    const bounds = monthBoundsBR(today.slice(0, 7))
    startDate = bounds.start
    endDate = bounds.end
  }

  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id, client_name, client_phone, appointment_date, start_time,
      status, service_name, total_price, paid_at, payment_method, sinal_expirado_at,
      professional:professionals(id, name)
    `)
    .eq('business_id', business.id)
    .in('status', ['cancelled', 'no_show'])
    .gte('appointment_date', startDate)
    .lte('appointment_date', endDate)
    .order('appointment_date', { ascending: false })
    .order('start_time', { ascending: false })

  // Perda estimada precisa do valor da comanda quando o atendimento cancelado
  // tinha produto (combo / vendido junto) — senão subestima (Eduardo 22/07).
  const chargedMap = await getApptChargedMap(supabase, (appointments ?? []).map((a) => a.id as string))
  const appointmentsComValor = (appointments ?? []).map((a) => {
    const c = chargedMap[a.id as string]
    return { ...a, charged_total: c && c.produtos.length > 0 ? c.charged : null }
  })

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="admin-orb-1 absolute -top-32 left-1/2 w-[520px] h-[520px] rounded-full blur-[120px]"
          style={{ background: 'var(--admin-bg-orb-1)' }} />
        <div className="admin-orb-2 absolute top-[40%] -right-24 w-72 h-72 rounded-full blur-[80px]"
          style={{ background: 'var(--admin-bg-orb-2)' }} />
      </div>
      <div className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(ellipse 100% 80% at 50% 50%, transparent 55%, rgba(15,23,42,0.05) 100%)' }} />

      <div className="relative">
        <SubPageHeader title="Cancelados" subtitle={business.name} back="/admin/financeiro" />
        <div className="max-w-lg mx-auto px-4 py-6">
          <CanceladosView
            appointments={appointmentsComValor as never[]}
            periodo={periodo}
            businessName={business.name}
          />
        </div>
      </div>
    </main>
  )
}
