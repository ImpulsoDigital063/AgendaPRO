import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'
import { PRICING } from '@/config/pricing'

// Usa service role para criar usuário no auth + inserir dados
function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { success } = rateLimit({ key: `cadastro:${ip}`, limit: 5, windowSeconds: 3600 })
  if (!success) {
    return NextResponse.json({ error: 'Muitas tentativas. Tente novamente em 1 hora.' }, { status: 429 })
  }

  const { businessName, category, phone, address, slug, email, password, professionalName, plan } =
    await req.json()

  if (!businessName || !slug || !email || !password) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 })
  }

  const chosenPlan: 'solo' | 'equipe' = plan === 'equipe' ? 'equipe' : 'solo'
  const priceCents = PRICING[chosenPlan].mensalidadeCentavos
  // Setup R$197 isento pros 10 primeiros (Clube Fundador) — UI marca founders_club=true
  const setupCents = 0

  // Validação de input
  if (typeof businessName !== 'string' || businessName.trim().length < 2 || businessName.trim().length > 100) {
    return NextResponse.json({ error: 'Nome do negócio inválido.' }, { status: 400 })
  }
  if (typeof slug !== 'string' || !/^[a-z0-9-]+$/.test(slug) || slug.length < 3 || slug.length > 50) {
    return NextResponse.json({ error: 'Endereço (slug) inválido. Use apenas letras minúsculas, números e hífen.' }, { status: 400 })
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Senha deve ter pelo menos 8 caracteres.' }, { status: 400 })
  }

  const supabase = getAdminClient()

  // 1. Verifica se o slug já está em uso
  const { data: existing } = await supabase
    .from('businesses')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Esse endereço (slug) já está em uso. Escolha outro.' }, { status: 409 })
  }

  // 2. Cria o usuário no Supabase Auth
  const { data: userData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // confirma direto, sem precisar de email de verificação
  })

  if (authError || !userData.user) {
    if (authError?.message?.includes('already registered')) {
      return NextResponse.json({ error: 'Esse email já está cadastrado.' }, { status: 409 })
    }
    console.error('Auth error:', authError)
    return NextResponse.json({ error: 'Erro ao criar usuário.' }, { status: 500 })
  }

  const ownerId = userData.user.id

  // 3. Cria o negócio (sem trial_ends_at — lógica agora é 100% via subscriptions)
  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .insert({
      name: businessName,
      slug,
      description: category || null,  // reutiliza campo description para a categoria
      phone: phone || null,
      address: address || null,
      owner_id: ownerId,
    })
    .select('id')
    .single()

  if (bizError || !business) {
    // Rollback: deleta o usuário criado
    await supabase.auth.admin.deleteUser(ownerId)
    console.error('Business creation error:', bizError)
    return NextResponse.json({ error: 'Erro ao criar negócio.' }, { status: 500 })
  }

  // 4. Cria assinatura em pending_payment (garantia ativa só após webhook MP)
  const { error: subError } = await supabase
    .from('subscriptions')
    .insert({
      business_id: business.id,
      plan: chosenPlan,
      status: 'pending_payment',
      price_cents: priceCents,
      setup_cents: setupCents,
      founders_club: true,
    })

  if (subError) {
    console.error('Erro ao criar subscription:', subError)
    // Não é fatal — admin pode regenerar depois. Mas loga pra debug.
  }

  // 5. Cria o profissional padrão
  const { error: profError } = await supabase
    .from('professionals')
    .insert({
      business_id: business.id,
      name: professionalName || businessName,
      active: true,
    })

  if (profError) {
    // Negócio criado, mas sem profissional — não é fatal, admin pode adicionar depois
    console.error('Erro ao criar profissional padrão:', profError)
  }

  return NextResponse.json({ ok: true, slug, plan: chosenPlan })
}
