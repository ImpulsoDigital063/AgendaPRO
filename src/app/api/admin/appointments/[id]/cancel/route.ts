import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
    .select('id, business_id, status')
    .eq('id', id)
    .single()
  if (!appt) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Autorização: dono OU recepcionista do business
  const [{ data: business }, { data: prof }] = await Promise.all([
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
      .maybeSingle(),
  ])
  const isOwner = !!business
  const isReceptionist = prof?.is_receptionist === true
  if (!isOwner && !isReceptionist) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // UPDATE → status=cancelled
  const { error: updateErr } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (updateErr) {
    console.error('cancel update error:', updateErr)
    return NextResponse.json({ error: 'update_failed', detail: updateErr.message }, { status: 500 })
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
