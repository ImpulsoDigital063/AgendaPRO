import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SubPageHeader from '@/components/admin/SubPageHeader'
import ProfFinanceiroView from '@/components/profissional/ProfFinanceiroView'
import { todayBR, addDaysBR } from '@/lib/date-br'
import { getApptDiscountMap } from '@/lib/commission-discount'

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
    .select('id, name, commission_percentage, business_id, employment_type, business:businesses(comissao_valor_fixo)')
    .eq('auth_user_id', user.id)
    .single()

  if (!professional) redirect('/profissional/login')
  if ((professional.employment_type ?? 'commissioned') === 'employed') redirect('/profissional')

  const { periodo: periodoParam } = await searchParams
  const periodo = periodoParam || 'mes'

  // λ.fuso · datas em BR, NUNCA new Date().toISOString() cru: o servidor da
  // Vercel roda em UTC e depois das 21h no Brasil ele já está no dia seguinte —
  // o "Hoje" dela mostrava o dia errado (mesmo bug do Olímpio, 03/07).
  const todayStr = todayBR()

  // Mesmo range do admin financeiro: cobre passado + futuro do
  // periodo. Sem isso agendamentos confirmados pra dias proximos
  // sumiam de "A receber" do profissional.
  let startDate: string
  let endDate: string
  if (periodo === 'hoje') {
    startDate = todayStr
    endDate = todayStr
  } else if (periodo === 'semana') {
    startDate = addDaysBR(todayStr, -3)
    endDate = addDaysBR(todayStr, 3)
  } else {
    // "Mes" agora = rolling 30 dias passados + 7 futuros (consistencia com /admin/financeiro).
    startDate = addDaysBR(todayStr, -30)
    endDate = addDaysBR(todayStr, 7)
  }

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, client_name, client_phone, appointment_date, start_time, status, service_name, total_price, paid_at, payment_method, invoice_item_id, commission_amount, commission_percent')
    .eq('professional_id', professional.id)
    .gte('appointment_date', startDate)
    .lte('appointment_date', endDate)
    .order('appointment_date', { ascending: false })
    .order('start_time', { ascending: false })

  // λ.valor-liquido · cupom vive em invoices.discount (por COMANDA) e a comissão
  // dela incide sobre o valor FINAL pago pela cliente. Sem isso a tela mostrava
  // o BRUTO e ela veria uma comissão maior do que a dona paga de fato — a
  // remuneração no /admin já paga sobre o líquido desde 04/07.
  const apptDisc = await getApptDiscountMap(
    supabase,
    (appointments ?? []).map((a) => a.invoice_item_id),
  )
  const appointmentsLiquidos = (appointments ?? []).map((a) => ({
    ...a,
    total_price: Math.max(0, (a.total_price ?? 0) - (apptDisc[a.id] ?? 0)),
  }))

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
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
            'radial-gradient(ellipse 100% 80% at 50% 50%, transparent 55%, rgba(15,23,42,0.05) 100%)',
        }}
      />

      <div className="relative">
        <SubPageHeader title="Meu Financeiro" subtitle={professional.name} />
        <div className="max-w-lg mx-auto px-4 py-6">
          <ProfFinanceiroView
            appointments={appointmentsLiquidos}
            periodo={periodo}
            commissionPercentage={professional.commission_percentage ?? 0}
            comissaoValorFixo={
              (Array.isArray(professional.business)
                ? professional.business[0]
                : professional.business
              )?.comissao_valor_fixo === true
            }
          />
        </div>
      </div>
    </main>
  )
}
