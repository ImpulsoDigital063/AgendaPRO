import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { contextoFidelidade } from '@/lib/resgate-pontos'
import { negocioDoPainel } from '@/lib/admin-data'

/**
 * GET /api/admin/fidelidade/contexto?customer_id=... | ?appointment_id=...
 *
 * O que o botão "Pontos" do pagamento precisa (Eduardo 29/09): se o negócio
 * tem fidelidade ligada (sem ela o botão some), o saldo da cliente e as
 * recompensas ativas pra escolher. Só leitura · dono, recepção ou
 * profissional ativa do negócio.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: owner } = await supabase.from('businesses').select('id').eq('id', await negocioDoPainel(user.id)).maybeSingle()
  let businessId = owner?.id as string | undefined
  if (!businessId) {
    const { data: prof } = await supabase
      .from('professionals')
      .select('business_id')
      .eq('auth_user_id', user.id)
      .eq('active', true)
      .maybeSingle()
    businessId = prof?.business_id as string | undefined
  }
  if (!businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  // customer_id direto, ou appointment_id (telas que só conhecem o atendimento)
  let customerId = req.nextUrl.searchParams.get('customer_id')
  const appointmentId = req.nextUrl.searchParams.get('appointment_id')
  if (!customerId && appointmentId) {
    const { data: appt } = await admin
      .from('appointments')
      .select('customer_id, business_id')
      .eq('id', appointmentId)
      .maybeSingle()
    if (appt && appt.business_id === businessId) customerId = (appt.customer_id as string | null) ?? null
  }
  return NextResponse.json(await contextoFidelidade(admin, businessId, customerId || null))
}
