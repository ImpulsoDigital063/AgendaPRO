import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import CaixaView from '@/components/recepcao/CaixaView'
import { IconWallet } from '@/components/ui/Icon'
import { getOwnerProfessional } from '@/lib/admin-data'
import { getApptDiscountMap } from '@/lib/commission-discount'
import { getApptPaymentSplitMap, type PaymentShare } from '@/lib/queries/appointment-payment-split'
import { todayBR, startOfDayBR } from '@/lib/date-br'

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
  /* v146 · como o valor se divide entre Pix/dinheiro/cartão. Vazio = pagamento
     direto (venda de produto avulsa também), e aí vale o payment_method. */
  payment_split?: PaymentShare[]
}

type ClosingRow = {
  id: string
  closing_date: string
  closed_at: string
  total_gross_cents: number
  total_net_cents: number
  cash_diff_cents: number | null
}

/**
 * Versão Adm de caixa (mesma lógica de /recepcao/caixa).
 * Eduardo cravou: Adm tem permissão total. Dono opera o caixa completo
 * (abre/fecha, sangria/suprimento, conferência) e vê o histórico.
 */
export default async function AdminCaixaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()
  if (!business) redirect(await destinoSemNegocio())

  const ownerProf = await getOwnerProfessional(user.id, business.id)

  // Dia do caixa em fuso de Brasília (não UTC)
  const today = todayBR()
  const tomorrow = new Date(today + 'T12:00:00')
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowISO = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`

  // Recebimentos do dia · appointments pagos + vendas de produto pagas
  const [paidApptsRes, paidSalesRes, allTodayRes] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, total_price, paid_at, payment_method, payment_card_type, payment_fee_percent, client_name, invoice_item_id')
      .eq('business_id', business.id)
      .not('paid_at', 'is', null)
      .gte('paid_at', startOfDayBR(today))
      .lt('paid_at', startOfDayBR(tomorrowISO)),
    supabase
      .from('sales')
      .select('id, total, paid_at, payment_method, payment_card_type, payment_fee_percent, client_name')
      .eq('business_id', business.id)
      .eq('type', 'product_sale')
      .eq('status', 'paid')
      .not('payment_method', 'in', '(courtesy,credit)')
      .not('paid_at', 'is', null)
      .gte('paid_at', startOfDayBR(today))
      .lt('paid_at', startOfDayBR(tomorrowISO)),
    supabase
      .from('appointments')
      .select('id, total_price, paid_at, status')
      .eq('business_id', business.id)
      .eq('appointment_date', today)
      .not('status', 'in', '(cancelled,no_show)'),
  ])

  // Caixa soma o LÍQUIDO (− desconto rateado da comanda) nos atendimentos
  const sbAdmin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const apptDisc = await getApptDiscountMap(sbAdmin, (paidApptsRes.data ?? []).map((a) => a.invoice_item_id))
  // v146 · a conferência por método vinha do payment_method do atendimento, que
  // guarda só o MAIOR pagamento. Comanda dividida caía inteira num método só.
  const apptSplit = await getApptPaymentSplitMap(sbAdmin, (paidApptsRes.data ?? []).map((a) => a.id as string))
  const apptsToday: AppointmentForCash[] = (paidApptsRes.data ?? []).map((a) => ({
    ...a,
    discount_cents: Math.round((apptDisc[a.id as string] ?? 0) * 100),
    payment_split: apptSplit[a.id as string],
  }))
  const salesToday: AppointmentForCash[] = (paidSalesRes.data ?? []).map((s) => ({
    id: s.id as string,
    total_price: Number(s.total ?? 0),
    paid_at: s.paid_at as string | null,
    payment_method: s.payment_method as string | null,
    payment_card_type: (s.payment_card_type as string | null) ?? null,
    payment_fee_percent: (s.payment_fee_percent as number | null) ?? null,
    client_name: (s.client_name as string | null) ?? 'Venda de produto',
  }))
  const todayAppts = [...apptsToday, ...salesToday]

  // Resumo do dia (atendimentos + a receber)
  const allTodayAppts = allTodayRes.data ?? []
  const todayCount = allTodayAppts.length
  const pendingValueCents = allTodayAppts.filter((a) => !a.paid_at).reduce((s, a) => s + Math.round((Number(a.total_price) || 0) * 100), 0)
  const pendingCount = allTodayAppts.filter((a) => !a.paid_at).length

  const { data: closings } = await supabase
    .from('cash_closings')
    .select('id, closing_date, closed_at, total_gross_cents, total_net_cents, cash_diff_cents')
    .eq('business_id', business.id)
    .order('closing_date', { ascending: false })
    .limit(30)

  const { data: closingToday } = await supabase
    .from('cash_closings')
    .select('id')
    .eq('business_id', business.id)
    .eq('closing_date', today)
    .maybeSingle()

  // Abertura de caixa de hoje (fundo de troco) + movimentos do dia
  const { data: openingToday } = await supabase
    .from('cash_openings')
    .select('opening_amount_cents, opened_at')
    .eq('business_id', business.id)
    .eq('opening_date', today)
    .maybeSingle()

  const { data: movementsToday } = await supabase
    .from('cash_movements')
    .select('id, type, amount_cents, reason, created_at')
    .eq('business_id', business.id)
    .eq('movement_date', today)
    .order('created_at', { ascending: false })

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <header className="relative max-w-lg lg:max-w-5xl mx-auto px-4 lg:px-8 pt-7 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-faded)' }}>
          Financeiro
        </p>
        <h1 className="text-[26px] font-bold tracking-tight leading-tight inline-flex items-center gap-2" style={{ color: 'var(--admin-text)' }}>
          <IconWallet size={22} /> Caixa
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--admin-text-mute)' }}>
          Abertura (fundo de troco) + sangria/suprimento + fechamento + histórico
        </p>
      </header>

      <div className="max-w-lg lg:max-w-5xl mx-auto px-4 lg:px-8">
        {!ownerProf ? (
          <div
            className="rounded-2xl p-6"
            style={{
              background: 'linear-gradient(180deg, #FFFBEB 0%, #FEF3C7 100%)',
              border: '1px solid #FCD34D',
              borderTopColor: 'rgba(255,255,255,0.7)',
            }}
          >
            <p className="text-base font-bold" style={{ color: '#78350F' }}>
              Cadastre-se como profissional pra fechar o caixa
            </p>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: '#92400E' }}>
              Pra fechar o caixa, o sistema precisa registrar quem fez o fechamento (em nome do profissional). Como dono, você pode se cadastrar como profissional do seu próprio negócio em Configurações.
            </p>
            <Link
              href="/admin/configuracoes?tab=profissionais"
              className="inline-block mt-4 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:-translate-y-px"
              style={{
                background: 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)',
                color: '#fff',
                borderTop: '1px solid rgba(255,255,255,0.25)',
                boxShadow: '0 4px 10px -2px rgba(217,119,6,0.4)',
              }}
            >
              Cadastrar profissional →
            </Link>
          </div>
        ) : (
          <CaixaView
            businessId={business.id}
            professionalId={ownerProf.id}
            recepName={ownerProf.name}
            todayAppts={todayAppts}
            closings={(closings ?? []) as ClosingRow[]}
            alreadyClosedToday={!!closingToday}
            todayCount={todayCount}
            pendingCount={pendingCount}
            pendingValueCents={pendingValueCents}
            opening={(openingToday ?? null) as { opening_amount_cents: number; opened_at: string } | null}
            movements={(movementsToday ?? []) as { id: string; type: 'sangria' | 'suprimento'; amount_cents: number; reason: string | null; created_at: string }[]}
          />
        )}
      </div>
    </main>
  )
}
