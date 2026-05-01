import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/coupons?status=active|used|expired|all
 * Lista cupons do business + customer info + campanha
 */
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()
  if (!business) return NextResponse.json({ error: 'business_not_found' }, { status: 404 })

  const url = new URL(req.url)
  const status = url.searchParams.get('status') || 'all'

  let query = supabase
    .from('coupons')
    .select(`
      id, code, customer_id, discount_type, discount_value,
      expires_at, used_at, used_appointment_id, campaign_id,
      whatsapp_message, sent_at, created_at,
      customer:customers(id, name, phone, email)
    `)
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })

  const now = new Date().toISOString()
  if (status === 'active') {
    query = query.is('used_at', null).gt('expires_at', now)
  } else if (status === 'used') {
    query = query.not('used_at', 'is', null)
  } else if (status === 'expired') {
    query = query.is('used_at', null).lt('expires_at', now)
  }

  const { data: coupons } = await query
  return NextResponse.json({ coupons: coupons || [] })
}
