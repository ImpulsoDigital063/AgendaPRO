import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CaixaView from '@/components/recepcao/CaixaView'
import { IconWallet } from '@/components/ui/Icon'
import { getOwnerProfessional } from '@/lib/admin-data'

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

/**
 * Versão Adm de caixa (mesma lógica de /recepcao/caixa).
 * Eduardo cravou: Adm tem permissão total.
 *
 * Caso especial: CaixaView precisa de professional_id pra registrar quem
 * fechou. Adm usa o owner_professional se existir (criado no cadastro do
 * negócio quando dono também atende). Se Adm não tem registro de prof,
 * mostra mensagem amigável pra cadastrar.
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
  if (!business) redirect('/cadastro')

  // Tenta pegar o owner como professional · necessário pra fechar caixa
  const ownerProf = await getOwnerProfessional(user.id, business.id)

  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowISO = tomorrow.toISOString().split('T')[0]

  // Recebimentos do dia · soma appointments pagos + vendas de produto pagas
  const [paidApptsRes, paidSalesRes] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, total_price, paid_at, payment_method, payment_card_type, payment_fee_percent, client_name')
      .eq('business_id', business.id)
      .not('paid_at', 'is', null)
      .gte('paid_at', today + 'T00:00:00')
      .lt('paid_at', tomorrowISO + 'T00:00:00'),
    supabase
      .from('sales')
      .select('id, total, paid_at, payment_method, client_name')
      .eq('business_id', business.id)
      .eq('type', 'product_sale')
      .eq('status', 'paid')
      .not('payment_method', 'in', '(courtesy,credit)')
      .not('paid_at', 'is', null)
      .gte('paid_at', today + 'T00:00:00')
      .lt('paid_at', tomorrowISO + 'T00:00:00'),
  ])

  const apptsToday = (paidApptsRes.data ?? []) as AppointmentForCash[]
  const salesToday: AppointmentForCash[] = (paidSalesRes.data ?? []).map((s) => ({
    id: s.id as string,
    total_price: Number(s.total ?? 0),
    paid_at: s.paid_at as string | null,
    payment_method: s.payment_method as string | null,
    payment_card_type: null,
    payment_fee_percent: null,
    client_name: (s.client_name as string | null) ?? 'Venda de produto',
  }))
  const todayAppts = [...apptsToday, ...salesToday]

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
          Resumo do dia + fechamento + histórico
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
          />
        )}
      </div>
    </main>
  )
}
