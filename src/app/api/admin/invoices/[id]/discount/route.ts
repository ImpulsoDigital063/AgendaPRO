import { resolveBusinessIdOperacao } from '@/lib/api-business-access'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * PATCH /api/admin/invoices/[id]/discount
 * Body: { manual_discount: number }   -- valor em R$ (0 pra zerar)
 *
 * Aplica desconto geral à comanda (separado dos descontos por item).
 *  - Bloqueia se invoice não está open
 *  - Valida valor >= 0 e <= sum(items.total)
 *  - Atualiza manual_discount e recalcula total
 *  - Read-after-write retorna novo total
 *
 * λ.prova-na-fonte: lê de novo depois pra confirmar que persistiu.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // v98l · desconto liberado pra profissional (Eduardo 30/07). Mesma regra
  // única das outras rotas de comanda: dono, recepção, ou profissional quando o
  // negócio ligou a flag de equipe. Quem dá o desconto fica gravado no
  // activity_log da comanda, então a dona consegue auditar depois.
  const businessId = await resolveBusinessIdOperacao(supabase)
  if (!businessId) return NextResponse.json({ error: 'no_business' }, { status: 403 })

  const { id } = await params
  const body = await request.json().catch(() => null)
  const manualRaw = body?.manual_discount
  if (typeof manualRaw !== 'number' || !Number.isFinite(manualRaw) || manualRaw < 0) {
    return NextResponse.json({ error: 'manual_discount inválido', detail: 'use número >= 0' }, { status: 400 })
  }
  const manualDiscount = Math.round(manualRaw * 100) / 100 // arredonda pra 2 casas

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: invoice } = await admin
    .from('invoices')
    .select('id, business_id, status')
    .eq('id', id)
    .maybeSingle()
  if (!invoice) return NextResponse.json({ error: 'invoice_not_found' }, { status: 404 })
  if (invoice.business_id !== businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (invoice.status !== 'open') {
    return NextResponse.json({ error: 'invoice_not_open' }, { status: 400 })
  }

  // Soma itens pra clampar o desconto (não pode passar do total cobrável)
  const { data: items } = await admin
    .from('invoice_items')
    .select('total, discount')
    .eq('invoice_id', id)
  const itemsTotal = (items ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0)
  const itemsDiscount = (items ?? []).reduce((s, r) => s + Number(r.discount ?? 0), 0)
  if (manualDiscount > itemsTotal) {
    return NextResponse.json(
      { error: 'discount_exceeds_total', detail: `Desconto R$ ${manualDiscount.toFixed(2)} > total dos itens R$ ${itemsTotal.toFixed(2)}` },
      { status: 400 },
    )
  }

  const newTotal = Math.max(0, itemsTotal - manualDiscount)

  const { error: updErr } = await admin
    .from('invoices')
    .update({
      subtotal: itemsTotal + itemsDiscount,
      discount: itemsDiscount + manualDiscount,
      manual_discount: manualDiscount,
      total: newTotal,
    })
    .eq('id', id)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  // Read-after-write
  const { data: verify } = await admin
    .from('invoices')
    .select('manual_discount, total')
    .eq('id', id)
    .maybeSingle()
  if (Number(verify?.manual_discount ?? -1) !== manualDiscount) {
    return NextResponse.json({ error: 'verify_failed' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    manual_discount: manualDiscount,
    total: Number(verify?.total ?? newTotal),
  })
}
