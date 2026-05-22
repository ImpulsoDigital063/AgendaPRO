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

  const {
    businessName, category, phone, address, slug, email, password, professionalName, plan,
    // v67 · mapeamento de canal e dor (insight pós-Studio Mood/Izanara via ChatGPT)
    acquisitionChannel, primaryNeed,
  } = await req.json()

  if (!businessName || !slug || !email || !password) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 })
  }

  const chosenPlan: 'solo' | 'equipe' = plan === 'equipe' ? 'equipe' : 'solo'
  const priceCents = PRICING[chosenPlan].mensalidadeCentavos
  // Sem setup pra ninguém · descontinuado em 06/05/2026 (preço fixo Solo R$67 / Equipe R$97)
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
  // v67 valida acquisition_channel e primary_need contra os enums do banco
  const VALID_CHANNELS = ['indicacao', 'google', 'instagram', 'tiktok', 'chatgpt_ia', 'salao99_migrante', 'whatsapp_organico', 'outro']
  const VALID_NEEDS = ['agenda', 'loja_vendas', 'ambos', 'indeciso']
  const channel = typeof acquisitionChannel === 'string' && VALID_CHANNELS.includes(acquisitionChannel) ? acquisitionChannel : null
  const need = typeof primaryNeed === 'string' && VALID_NEEDS.includes(primaryNeed) ? primaryNeed : null

  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .insert({
      name: businessName,
      slug,
      description: category || null,  // reutiliza campo description para a categoria
      phone: phone || null,
      address: address || null,
      owner_id: ownerId,
      acquisition_channel: channel,
      primary_need: need,
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
    })

  if (subError) {
    console.error('Erro ao criar subscription:', subError)
    // Rollback completo: sem subscription, o usuário ficaria em estado corrompido
    await supabase.from('businesses').delete().eq('id', business.id)
    await supabase.auth.admin.deleteUser(ownerId)
    return NextResponse.json({ error: 'Erro ao criar conta. Tente novamente.' }, { status: 500 })
  }

  // 5. Cria o profissional default — JÁ LINKADO AO DONO
  //
  // role='owner' + auth_user_id = ownerId fazem o ProfissionaisTab
  // reconhecer esse profissional como o admin/dono. Resultado:
  //   - card mostra badge verde "Tem acesso ao painel" (em vez do botão
  //     "Dar acesso" que criava login fantasma duplicado)
  //   - dono ja consegue receber agendamentos no proprio nome desde o
  //     cadastro, sem precisar configurar nada
  //
  // Premissa pensada pra uso em massa: 100 cadastros = 100 perfis
  // corretos sem suporte ("por que aparece o nome da minha barbearia
  // como profissional?"), sem login duplicado.
  const emailNorm = email.trim().toLowerCase()
  const { error: profError } = await supabase
    .from('professionals')
    .insert({
      business_id: business.id,
      name: professionalName || businessName,
      email: emailNorm,
      auth_user_id: ownerId,
      role: 'owner',
      active: true,
    })

  if (profError) {
    // Negócio criado, mas sem profissional — não é fatal, admin pode adicionar depois
    console.error('Erro ao criar profissional padrão:', profError)
  }

  return NextResponse.json({ ok: true, slug, plan: chosenPlan })
}
