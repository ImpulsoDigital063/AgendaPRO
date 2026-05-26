import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CaixaView from '@/components/recepcao/CaixaView'
import { IconWallet } from '@/components/ui/Icon'

export const dynamic = 'force-dynamic'

type AppointmentForCash = {
  id: string
  total_price: number | null
  paid_at: string | null
  payment_method: string | null
  payment_card_type: string | null
  payment_fee_percent: number | null
  client_name: string
}

type ClosingRow = {
  id: string
  closing_date: string
  closed_at: string
  total_gross_cents: number
  total_net_cents: number
  cash_diff_cents: number | null
}

export default async function RecepcaoCaixaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/profissional/login')

  const { data: recep } = await supabase
    .from('professionals')
    .select('id, name, business:businesses(id, name)')
    .eq('auth_user_id', user.id)
    .eq('is_receptionist', true)
    .single()

  if (!recep || !recep.business) redirect('/profissional/login')

  const business = recep.business as unknown as { id: string; name: string }

  // Agendamentos pagos HOJE
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowISO = tomorrow.toISOString().split('T')[0]

  const { data: paidToday } = await supabase
    .from('appointments')
    .select('id, total_price, paid_at, payment_method, payment_card_type, payment_fee_percent, client_name')
    .eq('business_id', business.id)
    .not('paid_at', 'is', null)
    .gte('paid_at', today + 'T00:00:00')
    .lt('paid_at', tomorrowISO + 'T00:00:00')

  const todayAppts = (paidToday ?? []) as AppointmentForCash[]

  // Histórico de fechamentos (últimos 30)
  const { data: closings } = await supabase
    .from('cash_closings')
    .select('id, closing_date, closed_at, total_gross_cents, total_net_cents, cash_diff_cents')
    .eq('business_id', business.id)
    .order('closing_date', { ascending: false })
    .limit(30)

  // Verifica se já tem fechamento hoje
  const { data: closingToday } = await supabase
    .from('cash_closings')
    .select('id')
    .eq('business_id', business.id)
    .eq('closing_date', today)
    .maybeSingle()

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <header className="relative max-w-lg md:max-w-7xl mx-auto px-4 md:px-6 pt-7 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-faded)' }}>
          Recepção
        </p>
        <h1 className="text-[26px] font-bold tracking-tight leading-tight inline-flex items-center gap-2" style={{ color: 'var(--admin-text)' }}>
          <IconWallet size={22} /> Caixa
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--admin-text-mute)' }}>
          Resumo do dia + fechamento + histórico
        </p>
      </header>

      <CaixaView
        businessId={business.id}
        professionalId={recep.id as string}
        recepName={(recep.name as string) || 'Recepção'}
        todayAppts={todayAppts}
        closings={(closings ?? []) as ClosingRow[]}
        alreadyClosedToday={!!closingToday}
      />
    </main>
  )
}
