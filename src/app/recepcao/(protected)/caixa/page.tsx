import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import CaixaView from '@/components/recepcao/CaixaView'
import { IconWallet } from '@/components/ui/Icon'
import { getApptDiscountMap } from '@/lib/commission-discount'
import { todayBR } from '@/lib/date-br'

export const dynamic = 'force-dynamic'

type AppointmentForCash = {
  id: string
  total_price: number | null
  paid_at: string | null
  payment_method: string | null
  payment_card_type: string | null
  payment_fee_percent: number | null
  client_name: string
  discount_cents?: number
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

  // Dia do caixa em fuso de Brasília (não UTC) · evita virar o dia após 21h
  const today = todayBR()
  const tomorrow = new Date(today + 'T12:00:00')
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowISO = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`

  // Agendamentos pagos HOJE
  const { data: paidToday } = await supabase
    .from('appointments')
    .select('id, total_price, paid_at, payment_method, payment_card_type, payment_fee_percent, client_name, invoice_item_id')
    .eq('business_id', business.id)
    .not('paid_at', 'is', null)
    .gte('paid_at', today + 'T00:00:00')
    .lt('paid_at', tomorrowISO + 'T00:00:00')

  // Caixa soma o LÍQUIDO (− desconto rateado da comanda). Desconto vive em
  // invoices → service-role (recep não lê invoice por RLS).
  const sbAdmin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const apptDisc = await getApptDiscountMap(sbAdmin, (paidToday ?? []).map((a) => a.invoice_item_id))
  const todayAppts: AppointmentForCash[] = (paidToday ?? []).map((a) => ({
    ...a,
    discount_cents: Math.round((apptDisc[a.id as string] ?? 0) * 100),
  }))

  // Resumo do dia · atendimentos no dia + a receber (contexto antes de fechar)
  const { data: allTodayAppts } = await supabase
    .from('appointments')
    .select('id, total_price, paid_at, status')
    .eq('business_id', business.id)
    .eq('appointment_date', today)
    .not('status', 'in', '(cancelled,no_show)')

  const todayCount = (allTodayAppts ?? []).length
  const pendingValueCents = (allTodayAppts ?? [])
    .filter((a) => !a.paid_at)
    .reduce((s, a) => s + Math.round((Number(a.total_price) || 0) * 100), 0)
  const pendingCount = (allTodayAppts ?? []).filter((a) => !a.paid_at).length

  // Recepção só vê dado DIÁRIO · não recebe histórico de fechamentos
  const { data: closingToday } = await supabase
    .from('cash_closings')
    .select('id')
    .eq('business_id', business.id)
    .eq('closing_date', today)
    .maybeSingle()

  // Abertura de caixa de hoje (fundo de troco) · null se ainda não abriu
  const { data: openingToday } = await supabase
    .from('cash_openings')
    .select('opening_amount_cents, opened_at')
    .eq('business_id', business.id)
    .eq('opening_date', today)
    .maybeSingle()

  // Movimentos do dia (sangria/suprimento) · ajustam o esperado na gaveta
  const { data: movementsToday } = await supabase
    .from('cash_movements')
    .select('id, type, amount_cents, reason, created_at')
    .eq('business_id', business.id)
    .eq('movement_date', today)
    .order('created_at', { ascending: false })

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
          Abertura (fundo de troco) + resumo do dia + fechamento
        </p>
      </header>

      <CaixaView
        businessId={business.id}
        professionalId={recep.id as string}
        recepName={(recep.name as string) || 'Recepção'}
        todayAppts={todayAppts}
        closings={[] as ClosingRow[]}
        alreadyClosedToday={!!closingToday}
        todayCount={todayCount}
        pendingCount={pendingCount}
        pendingValueCents={pendingValueCents}
        isReceptionist
        opening={(openingToday ?? null) as { opening_amount_cents: number; opened_at: string } | null}
        movements={(movementsToday ?? []) as { id: string; type: 'sangria' | 'suprimento'; amount_cents: number; reason: string | null; created_at: string }[]}
      />
    </main>
  )
}
