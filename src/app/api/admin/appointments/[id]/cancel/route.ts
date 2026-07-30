import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { checkRateLimit } from '@/lib/rate-limit-api'

/**
 * POST /api/admin/appointments/[id]/cancel
 *
 * Cancela um agendamento (status='cancelled').
 *
 * Autorizado: dono do business OU recepcionista (is_receptionist=true)
 * do mesmo business.
 *
 * Read-after-write: relê a row após o update e devolve o status,
 * pra UI ter prova real do banco e não confiar só em res.ok.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(req, { key: 'admin-appt-cancel', limit: 60, windowSeconds: 60 })
  if (rl) return rl

  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  // Validação: appointment + business
  const { data: appt } = await supabase
    .from('appointments')
    .select('id, business_id, professional_id, status, invoice_item_id')
    .eq('id', id)
    .single()
  if (!appt) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Autorização: dono, recepcionista OU profissional (v98 · 30/07/2026).
  //
  // Eduardo 30/07: "vamos deixar igual do adm, afinal eles não têm recepção —
  // quem marca, agenda e marca como pago são as próprias profissionais".
  // Negócio sem recepcionista (caso Realli) quebrava aqui: a profissional
  // marcava a cliente mas não conseguia fechar o ciclo do atendimento.
  //
  // A profissional age SEMPRE no que é dela. Pra mexer no de uma colega, o
  // negócio precisa ter ligado `professionals_can_book_others` — a mesma flag
  // que libera marcar pra colega. Sem a flag (que é o default), nada muda pra
  // Olímpio, Studio MOOD e os outros.
  const [{ data: business }, { data: prof }, { data: biz }] = await Promise.all([
    supabase
      .from('businesses')
      .select('id')
      .eq('id', appt.business_id)
      .eq('owner_id', user.id)
      .maybeSingle(),
    supabase
      .from('professionals')
      .select('id, is_receptionist')
      .eq('business_id', appt.business_id)
      .eq('auth_user_id', user.id)
      .eq('active', true)
      .maybeSingle(),
    supabase
      .from('businesses')
      .select('professionals_can_book_others')
      .eq('id', appt.business_id)
      .maybeSingle(),
  ])
  const isOwner = !!business
  const isReceptionist = prof?.is_receptionist === true
  const ehDela = !!prof && prof.id === appt.professional_id
  const podeMexerNoDaColega = biz?.professionals_can_book_others === true
  const isProfissionalAutorizada = !!prof && !prof.is_receptionist && (ehDela || podeMexerNoDaColega)
  if (!isOwner && !isReceptionist && !isProfissionalAutorizada) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // UPDATE → status=cancelled + zera paid_at + solta invoice_item_id
  const { error: updateErr } = await supabase
    .from('appointments')
    .update({ status: 'cancelled', paid_at: null, invoice_item_id: null, payment_method: null })
    .eq('id', id)

  if (updateErr) {
    console.error('cancel update error:', updateErr)
    return NextResponse.json({ error: 'update_failed', detail: updateErr.message }, { status: 500 })
  }

  // CASCATA · cancela a comanda vinculada (se houver)
  // Lógica simétrica ao PATCH /api/admin/invoices/[id] action=cancel:
  //  - acha invoice via invoice_item_id
  //  - cancela sales product_sale + devolve estoque (entry +qty)
  //  - apaga invoice_payments
  //  - cancela outros invoice_items (que linkam appointments) → resetam aqueles também
  //  - marca invoice como cancelled
  if (appt.invoice_item_id) {
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )
    const { data: item } = await admin
      .from('invoice_items')
      .select('invoice_id')
      .eq('id', appt.invoice_item_id)
      .maybeSingle()
    const invoiceId = item?.invoice_id as string | undefined

    if (invoiceId) {
      // Pega TODOS os items pra cascatear cada um
      const { data: allItems } = await admin
        .from('invoice_items')
        .select('id, item_type, reference_id')
        .eq('invoice_id', invoiceId)

      const productSaleIds = (allItems ?? [])
        .filter((i) => i.item_type === 'product' && i.reference_id)
        .map((i) => i.reference_id as string)
      const otherAppts = (allItems ?? [])
        .filter((i) => i.item_type === 'appointment' && i.reference_id && i.reference_id !== id)
        .map((i) => i.reference_id as string)

      // Reverte outros appointments (não toca status pra não cancelar atendimento
      // que ainda vai acontecer · só solta paid + invoice_item_id)
      if (otherAppts.length > 0) {
        await admin
          .from('appointments')
          .update({ paid_at: null, invoice_item_id: null, payment_method: null })
          .in('id', otherAppts)
      }

      // Reverte sales de produto + devolve estoque
      if (productSaleIds.length > 0) {
        const { data: saleItems } = await admin
          .from('sale_items')
          .select('sale_id, product_id, quantity')
          .in('sale_id', productSaleIds)
        const compensations = (saleItems ?? [])
          .filter((s) => s.product_id)
          .map((s) => ({
            business_id: appt.business_id,
            product_id: s.product_id as string,
            type: 'entry' as const,
            quantity: Number(s.quantity ?? 0),
            reason: 'Cancelamento do atendimento (cascata)',
            created_by: user.id,
          }))
        if (compensations.length > 0) {
          await admin.from('stock_movements').insert(compensations)
        }
        await admin
          .from('sales')
          .update({ status: 'cancelled', paid_at: null })
          .in('id', productSaleIds)
      }

      // Apaga pagamentos da invoice
      await admin.from('invoice_payments').delete().eq('invoice_id', invoiceId)

      // Marca invoice como cancelled
      await admin
        .from('invoices')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', invoiceId)
    }
  }

  // λ.prova-na-fonte · relê a row e confirma que mudou
  const { data: after } = await supabase
    .from('appointments')
    .select('id, status')
    .eq('id', id)
    .single()

  if (after?.status !== 'cancelled') {
    console.error('cancel verification failed · status ainda é', after?.status)
    return NextResponse.json(
      { error: 'verification_failed', actual_status: after?.status ?? null },
      { status: 500 },
    )
  }

  revalidatePath('/admin')
  revalidatePath('/admin/financeiro')
  return NextResponse.json({ ok: true, status: after.status })
}
