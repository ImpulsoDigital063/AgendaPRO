import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkRateLimit } from '@/lib/rate-limit-api'

/**
 * POST /api/admin/customers
 * Cria cliente manualmente (admin cadastra alguém que ligou,
 * por exemplo, sem o cliente passar pelo fluxo de agendamento).
 *
 * Estratégia:
 *   1. Cria/atualiza em `clients` (cliente universal por telefone)
 *   2. Cria customer em `customers` (relação business↔cliente)
 *   3. Se ja existe customer pra esse business+phone, retorna 409
 *
 * Retorna o customer criado.
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'admin-customers-create', limit: 30, windowSeconds: 60 })
  if (rl) return rl

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!business) return NextResponse.json({ error: 'business_not_found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''

  if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
  if (!phone || phone.replace(/\D/g, '').length < 10) {
    return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 })
  }

  const phoneClean = phone.replace(/\D/g, '')
  const phoneFormatted = phoneClean.length === 11
    ? `(${phoneClean.slice(0, 2)}) ${phoneClean.slice(2, 7)}-${phoneClean.slice(7)}`
    : phoneClean.length === 10
      ? `(${phoneClean.slice(0, 2)}) ${phoneClean.slice(2, 6)}-${phoneClean.slice(6)}`
      : phone

  // 1. Verifica se ja existe customer no business com esse phone
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id, name')
    .eq('business_id', business.id)
    .eq('phone', phoneFormatted)
    .maybeSingle()

  if (existingCustomer) {
    return NextResponse.json(
      { error: `Cliente já cadastrado: ${existingCustomer.name}`, existing_id: existingCustomer.id },
      { status: 409 }
    )
  }

  // 2. Cria/atualiza em `clients` (universal)
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('phone', phoneFormatted)
    .maybeSingle()

  let clientId: string | null = existingClient?.id ?? null

  if (!clientId) {
    const { data: created, error: clientErr } = await supabase
      .from('clients')
      .insert({
        name,
        phone: phoneFormatted,
        email: email || null,
      })
      .select('id')
      .single()
    if (clientErr) {
      console.error('clients insert error:', clientErr)
      return NextResponse.json({ error: 'Erro ao criar cliente' }, { status: 500 })
    }
    clientId = created?.id ?? null
  } else {
    // Atualiza dados defensivamente (cliente pode ter mudado nome/email)
    await supabase
      .from('clients')
      .update({ name, email: email || null })
      .eq('id', clientId)
  }

  // 3. Cria customer no business
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .insert({
      business_id: business.id,
      name,
      phone: phoneFormatted,
      email: email || null,
    })
    .select('id, name, phone, email, total_points, created_at')
    .single()

  if (custErr) {
    console.error('customers insert error:', custErr)
    return NextResponse.json({ error: 'Erro ao criar cliente no negócio' }, { status: 500 })
  }

  revalidatePath('/admin/clientes')
  return NextResponse.json({ ok: true, customer })
}
