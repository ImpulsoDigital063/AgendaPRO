import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const VALID_METHODS = new Set(['pix', 'cash', 'card', 'courtesy'])

/**
 * POST /api/admin/appointments/[id]/payment
 * Body: { method: 'pix' | 'cash' | 'card' | 'courtesy' } pra marcar pago
 *       { paid: false } pra desmarcar (caso erro do dono)
 *
 * Marca/desmarca o pagamento de um agendamento. So o dono do business
 * pode (validacao via owner_id).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))

  // Validacao: appointment + business + owner
  const { data: appt } = await supabase
    .from('appointments')
    .select('id, business_id')
    .eq('id', id)
    .single()
  if (!appt) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', appt.business_id)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!business) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // 2 modos: marcar pago (com method) OU desmarcar (paid: false)
  const updates: { paid_at: string | null; payment_method: string | null } = {
    paid_at: null,
    payment_method: null,
  }

  if (body.paid !== false) {
    const method = typeof body.method === 'string' ? body.method : null
    if (!method || !VALID_METHODS.has(method)) {
      return NextResponse.json(
        { error: 'método inválido (use pix, cash, card ou courtesy)' },
        { status: 400 }
      )
    }
    updates.paid_at = new Date().toISOString()
    updates.payment_method = method
  }

  const { error: updateErr } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)

  if (updateErr) {
    console.error('payment update error:', updateErr)
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  revalidatePath('/admin/financeiro')
  return NextResponse.json({ ok: true, paid_at: updates.paid_at, payment_method: updates.payment_method })
}
