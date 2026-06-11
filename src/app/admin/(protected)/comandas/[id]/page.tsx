import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import ComandaDetalhe, { type InvoiceFull } from '@/components/admin/comandas/ComandaDetalhe'
import { resolveProductItemSellers } from '@/lib/queries/product-item-sellers'

export const dynamic = 'force-dynamic'

export default async function AdminComandaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug, loyalty_enabled')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!business) redirect('/cadastro')

  const { id } = await params

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: invoice } = await admin
    .from('invoices')
    .select(`
      id, invoice_number, status, subtotal, discount, manual_discount, total, notes,
      created_at, closed_at, cancelled_at, business_id, customer_id,
      customer:customers(id, name, phone)
    `)
    .eq('id', id)
    .maybeSingle()

  if (!invoice || invoice.business_id !== business.id) notFound()

  const { data: items } = await admin
    .from('invoice_items')
    .select(`
      id, item_type, reference_id, description, quantity, unit_price, discount, total,
      professional:professionals(id, name)
    `)
    .eq('invoice_id', id)
    .order('created_at')

  const { data: payments } = await admin
    .from('invoice_payments')
    .select('id, payment_method, amount, paid_at, installments, card_brand, card_type, fee_percent')
    .eq('invoice_id', id)
    .order('paid_at')

  // Saldo de crédito disponível do cliente · vai pro SplitPaymentModal
  let availableCredit = 0
  if (invoice.customer_id) {
    const { data: credits } = await admin
      .from('customer_credits')
      .select('amount')
      .eq('customer_id', invoice.customer_id)
      .is('used_in_invoice_id', null)
    availableCredit = (credits ?? []).reduce((s, c) => s + Number(c.amount ?? 0), 0)
  }

  // Fidelidade: saldo de pontos pra exibição (v72)
  // λ.regra-cravada-25/05 · pontos NUNCA misturam com pagamento. Saldo é
  // só visualização — resgate de recompensa NÃO acontece dentro da comanda.
  let customerPoints = 0
  const loyaltyEnabled = business.loyalty_enabled === true
  if (loyaltyEnabled && invoice.customer_id) {
    const { data: c } = await admin
      .from('customers')
      .select('total_points')
      .eq('id', invoice.customer_id)
      .maybeSingle()
    customerPoints = Number(c?.total_points ?? 0)
  }

  const customer = Array.isArray(invoice.customer) ? invoice.customer[0] : invoice.customer

  // Produto = venda → mostra QUEM VENDEU (created_by), não o profissional que
  // atende (a não ser que o produto comissione). Eduardo 10/06.
  const productSaleIds = (items ?? [])
    .filter((it) => it.item_type === 'product' && it.reference_id)
    .map((it) => it.reference_id as string)
  const sellers = await resolveProductItemSellers(admin, business.id, productSaleIds)

  const full: InvoiceFull = {
    id: invoice.id as string,
    invoice_number: invoice.invoice_number as number,
    status: invoice.status as 'open' | 'closed' | 'cancelled',
    subtotal: Number(invoice.subtotal ?? 0),
    discount: Number(invoice.discount ?? 0),
    manual_discount: Number(invoice.manual_discount ?? 0),
    total: Number(invoice.total ?? 0),
    notes: invoice.notes as string | null,
    created_at: invoice.created_at as string,
    closed_at: invoice.closed_at as string | null,
    cancelled_at: invoice.cancelled_at as string | null,
    customer: customer ?? null,
    items: (items ?? []).map((it) => {
      const prof = Array.isArray(it.professional) ? it.professional[0] : it.professional
      let professionalName = prof?.name ?? null
      if (it.item_type === 'product' && it.reference_id) {
        const seller = sellers[it.reference_id as string]
        // Produto sem comissão → nome de quem vendeu. Com comissão → mantém o profissional.
        if (seller && !seller.hasCommission) professionalName = seller.sellerName
      }
      return {
        id: it.id as string,
        item_type: it.item_type as 'appointment' | 'product' | 'package' | 'credit',
        description: it.description as string,
        quantity: Number(it.quantity ?? 1),
        unit_price: Number(it.unit_price ?? 0),
        discount: Number(it.discount ?? 0),
        total: Number(it.total ?? 0),
        professional_name: professionalName,
      }
    }),
    payments: (payments ?? []).map((p) => ({
      id: p.id as string,
      payment_method: p.payment_method as string,
      amount: Number(p.amount ?? 0),
      paid_at: p.paid_at as string,
      installments: p.installments as number | null,
      card_brand: p.card_brand as string | null,
      card_type: p.card_type as string | null,
      fee_percent: Number(p.fee_percent ?? 0),
    })),
  }

  return (
    <ComandaDetalhe
      businessId={business.id}
      businessName={business.name ?? 'AgendaPRO'}
      invoice={full}
      availableCredit={availableCredit}
      loyaltyEnabled={loyaltyEnabled}
      customerPoints={customerPoints}
    />
  )
}
