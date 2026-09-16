import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit-api'
import { variacoesDeTelefone, telefoneCanonico } from '@/lib/phone-variants'

// Valida que a string é uma data ISO REAL (não só "regex passa").
// "2024-02-30" passa no regex YYYY-MM-DD mas não existe — Date corrige
// pra 2024-03-01 silenciosamente. Checamos round-trip pra garantir
// equivalência exata.
function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const date = new Date(`${s}T00:00:00Z`)
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() + 1 === m &&
    date.getUTCDate() === d
  )
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NAME_MAX_LEN = 200

/**
 * GET /api/admin/customers/[id]
 *
 * Retorna detalhes do customer + últimos 20 agendamentos.
 *
 * Performance:
 *   - Query única: customer + business validation pelo owner_id
 *   - Histórico limitado a 20 (paginação client-side se precisar mais)
 *   - Index aproveitado: (business_id, appointment_date DESC)
 *   - 1 lookup adicional em clients pra match por phone (UNIQUE)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(req, { key: 'admin-customer-detail', limit: 60, windowSeconds: 60 })
  if (rl) return rl

  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  // Customer + business filtrado pelo owner — RLS garante seguranca
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (custErr || !customer) {
    return NextResponse.json({ error: 'customer_not_found' }, { status: 404 })
  }

  // Autorização: dono OU recepcionista do business
  const [{ data: business }, { data: prof }] = await Promise.all([
    supabase
      .from('businesses')
      .select('id, slug')
      .eq('id', customer.business_id)
      .eq('owner_id', user.id)
      .maybeSingle(),
    supabase
      .from('professionals')
      .select('id, is_receptionist')
      .eq('business_id', customer.business_id)
      .eq('auth_user_id', user.id)
      .maybeSingle(),
  ])
  const isOwner = !!business
  const isReceptionist = prof?.is_receptionist === true
  if (!isOwner && !isReceptionist) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  /* HISTÓRICO (corrigido 06/08) · antes isto casava o client universal com
     `.eq('phone', customer.phone)` exato e puxava os agendamentos só por
     client_id. Duas falhas em série:

     · o telefone está gravado em formatos diferentes conforme a porta de
       entrada, então a ficha casava com um client e os agendamentos estavam
       pendurados em outro. O Edu apareceu com "0 agendamentos" tendo dois.
     · appointments.customer_id passou a ser sempre preenchido (correção de
       05/08), e ele é o vínculo direto — não precisava do desvio por clients.

     Agora casa pelos dois caminhos: customer_id direto, mais os client_id de
     qualquer formato do mesmo número. */
  const { data: clientsDoTelefone } = await supabase
    .from('clients')
    .select('id')
    .in('phone', variacoesDeTelefone(customer.phone))

  const filtros = [`customer_id.eq.${customer.id}`]
  for (const c of clientsDoTelefone ?? []) filtros.push(`client_id.eq.${c.id}`)

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, appointment_date, start_time, service_name, total_price, status, professional_id')
    .eq('business_id', customer.business_id)
    .or(filtros.join(','))
    .order('appointment_date', { ascending: false })
    .order('start_time', { ascending: false })
    .limit(20)

  // Pega nomes dos profissionais distintos pra display (1 query)
  const profIds = Array.from(
    new Set((appointments || []).map((a) => a.professional_id).filter(Boolean) as string[])
  )
  const { data: profs } = profIds.length > 0
    ? await supabase
        .from('professionals')
        .select('id, name')
        .in('id', profIds)
    : { data: [] }

  const profMap = new Map<string, string>()
  for (const p of profs || []) profMap.set(p.id, p.name)

  const history = (appointments || []).map((a) => ({
    id: a.id,
    date: a.appointment_date,
    time: a.start_time,
    service: a.service_name,
    price: a.total_price,
    status: a.status,
    professional: a.professional_id ? profMap.get(a.professional_id) ?? null : null,
  }))

  // Historico de pontos — extrato auditavel de cada delta + reason.
  // CIC rodada 4 reportou bug #3: cliente tinha saldo +40pts inexplicaveis.
  // Sem extrato, dono nao consegue auditar. Agora cada transacao
  // (servico/referral/review/manual) aparece listada.
  const { data: pointsTx } = await supabase
    .from('points_transactions')
    .select('id, points, reason, created_at, appointment_id')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const pointsHistory = (pointsTx || []).map((t) => ({
    id: t.id,
    points: t.points,
    reason: t.reason as 'service' | 'referral' | 'review' | 'manual' | 'punctuality' | 'redemption',
    created_at: t.created_at,
    appointment_id: t.appointment_id,
  }))

  /* SALDO EM CRÉDITO (06/08) · faltava aqui, e é justamente onde a dona
     olha depois de cancelar um atendimento com sinal pago. Ela cancelou,
     abriu a ficha e não viu nada — nem soube dizer se a cliente tinha o
     dinheiro guardado.

     Disponível = não usado em comanda, não usado em sinal, dentro da
     validade. Mesma régua das telas de pagamento. */
  /* slug + link do Google + pontos entram aqui (16/09/2026) pra ficha montar
     os botões de "pedir avaliação" e "mandar o link de indicação" — antes a
     dona só conseguia esses links se a própria cliente abrisse Meus Pontos
     sozinha (pedido da Wanessa). */
  const { data: negocioSinal } = await supabase
    .from('businesses')
    .select('sinal_enabled, name, slug, google_place_id, points_for_review, points_for_referral')
    .eq('id', customer.business_id)
    .maybeSingle()

  const agoraIso = new Date().toISOString()
  const { data: creditos } = await supabase
    .from('customer_credits')
    .select('id, amount, origin, date, expires_at, used_in_invoice_id, used_in_appointment_id, notes')
    .eq('customer_id', customer.id)
    .eq('business_id', customer.business_id)
    .order('date', { ascending: false })
    .limit(50)

  const disponiveis = (creditos ?? []).filter(
    (c) =>
      !c.used_in_invoice_id &&
      !c.used_in_appointment_id &&
      (!c.expires_at || c.expires_at >= agoraIso),
  )
  const creditBalance = disponiveis.reduce((s, c) => s + Number(c.amount ?? 0), 0)
  const creditList = (creditos ?? []).map((c) => ({
    id: c.id,
    amount: Number(c.amount ?? 0),
    origin: c.origin as string,
    date: c.date as string,
    expires_at: c.expires_at as string | null,
    usado: !!(c.used_in_invoice_id || c.used_in_appointment_id),
    vencido: !!c.expires_at && c.expires_at < agoraIso,
    notes: c.notes as string | null,
  }))

  // Cupom ativo do cliente (CIC NB-5: badge so aparecia no card externo,
  // dentro do modal sumia). Pega o primeiro nao-usado e nao-expirado.
  const nowIso = new Date().toISOString()
  const { data: activeCoupon } = await supabase
    .from('coupons')
    .select('code, discount_type, discount_value, expires_at')
    .eq('customer_id', customer.id)
    .eq('business_id', customer.business_id)
    .is('used_at', null)
    .gt('expires_at', nowIso)
    .order('expires_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  // Recompensas ativas do business (pra dropdown "Resgatar" no modal).
  // Cliente pode resgatar qualquer uma cujo saldo cubra.
  const { data: rewards } = await supabase
    .from('rewards')
    .select('id, name, points_required')
    .eq('business_id', customer.business_id)
    .eq('active', true)
    .order('points_required', { ascending: true })

  return NextResponse.json({
    customer: {
      id: customer.id,
      // v121 · a ficha mobile precisa do tenant pra lancar atendimento antigo
      business_id: customer.business_id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      total_points: customer.total_points ?? 0,
      referral_code: customer.referral_code,
      created_at: customer.created_at,
      // v42 · 14/05/2026 — campos novos (todos nullable)
      birthday: customer.birthday ?? null,
      notes: customer.notes ?? null,
      import_source: customer.import_source ?? null,
      imported_at: customer.imported_at ?? null,
      // v118 · não cobra sinal dessa cliente
      sinal_isento: customer.sinal_isento === true,
    },
    history,
    pointsHistory,
    /* O toggle de isenção só faz sentido em negócio que cobra sinal — na ficha
       de quem não cobra seria um botão sem efeito nenhum. */
    sinalAtivo: negocioSinal?.sinal_enabled === true,
    negocio: {
      nome: (negocioSinal?.name as string | null) ?? null,
      slug: (negocioSinal?.slug as string | null) ?? null,
      googleReviewUrl: (negocioSinal?.google_place_id as string | null) ?? null,
      pontosAvaliacao: (negocioSinal?.points_for_review as number | null) ?? 0,
      pontosIndicacao: (negocioSinal?.points_for_referral as number | null) ?? 0,
    },
    creditBalance,
    credits: creditList,
    activeCoupon: activeCoupon ?? null,
    rewards: rewards ?? [],
  })
}

/**
 * PATCH /api/admin/customers/[id]
 *
 * Edita dados do customer (nome, email, telefone e os campos de ficha).
 * Trocar o telefone é permitido desde 16/09/2026 e propaga pras cópias do
 * número no negócio inteiro — ver o bloco de propagação mais abaixo.
 */
/** Dígitos canônicos no formato que o painel grava: "(91) 98150-9149". */
function formatarTelefoneBR(canon: string): string {
  const ddd = canon.slice(0, 2)
  const resto = canon.slice(2)
  const meio = resto.length === 9 ? resto.slice(0, 5) : resto.slice(0, 4)
  const fim = resto.length === 9 ? resto.slice(5) : resto.slice(4)
  return `(${ddd}) ${meio}-${fim}`
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(req, { key: 'admin-customer-edit', limit: 30, windowSeconds: 60 })
  if (rl) return rl

  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}

  if (typeof body.name === 'string' && body.name.trim()) {
    const trimmedName = body.name.trim()
    if (trimmedName.length > NAME_MAX_LEN) {
      return NextResponse.json({ error: 'name_too_long' }, { status: 400 })
    }
    updates.name = trimmedName
  }
  if ('email' in body) {
    const rawEmail = typeof body.email === 'string' ? body.email.trim() : ''
    if (!rawEmail) {
      updates.email = null
    } else if (!EMAIL_RE.test(rawEmail)) {
      return NextResponse.json({ error: 'email_invalid_format' }, { status: 400 })
    } else {
      updates.email = rawEmail.toLowerCase()
    }
  }
  if ('birthday' in body) {
    const v = body.birthday
    if (v === null || v === '' || v === undefined) {
      updates.birthday = null
    } else if (typeof v === 'string' && isValidIsoDate(v)) {
      updates.birthday = v
    } else {
      return NextResponse.json({ error: 'birthday_invalid_format' }, { status: 400 })
    }
  }
  if ('notes' in body) {
    const v = body.notes
    if (v === null || v === '' || v === undefined) {
      updates.notes = null
    } else if (typeof v === 'string') {
      updates.notes = v.trim().slice(0, 1000)
    }
  }

  /* Telefone editável pela ficha (pedido da Wanessa, 16/09/2026). É a chave
     que amarra ficha, agendamento e cliente universal, então aqui só validamos
     e guardamos: a troca acontece mais abaixo, depois de conferir duplicata,
     e propaga pra toda tabela que guarda cópia do número. */
  let phoneNovo: string | null = null
  if ('phone' in body) {
    const raw = typeof body.phone === 'string' ? body.phone.trim() : ''
    if (!raw) return NextResponse.json({ error: 'phone_obrigatorio' }, { status: 400 })
    const canon = telefoneCanonico(raw)
    if (canon.length < 10 || canon.length > 11) {
      return NextResponse.json({ error: 'phone_invalid_format' }, { status: 400 })
    }
    phoneNovo = formatarTelefoneBR(canon)
  }

  /* Isenta de sinal (v118) · cliente de confiança que a dona não quer
     constranger cobrando toda vez. Vale nos dois caminhos de agendamento. */
  if ('sinal_isento' in body) {
    updates.sinal_isento = body.sinal_isento === true
  }

  // Campos novos v56 · todos texto livre (trim + cap 500 por campo) ou null
  const textFields = [
    'nickname', 'important_note', 'referral_source', 'instagram',
    'cpf', 'rg', 'profession', 'address', 'address_number',
    'address_complement', 'neighborhood', 'city', 'state', 'zip_code',
  ] as const
  for (const f of textFields) {
    if (f in body) {
      const v = body[f]
      if (v === null || v === '' || v === undefined) {
        updates[f] = null
      } else if (typeof v === 'string') {
        updates[f] = v.trim().slice(0, 500)
      }
    }
  }

  // customer_type · enum PF/PJ
  if ('customer_type' in body) {
    const v = body.customer_type
    if (v === 'pf' || v === 'pj') updates.customer_type = v
  }

  // preferred_contact · enum
  if ('preferred_contact' in body) {
    const v = body.preferred_contact
    if (v === null || v === '' || v === undefined) {
      updates.preferred_contact = null
    } else if (typeof v === 'string' && ['whatsapp', 'sms', 'email', 'none'].includes(v)) {
      updates.preferred_contact = v
    }
  }

  // marketing_consent · boolean
  if ('marketing_consent' in body && typeof body.marketing_consent === 'boolean') {
    updates.marketing_consent = body.marketing_consent
  }

  // blocked · boolean + reason
  if ('blocked' in body && typeof body.blocked === 'boolean') {
    updates.blocked = body.blocked
  }
  if ('blocked_reason' in body) {
    const v = body.blocked_reason
    if (v === null || v === '' || v === undefined) updates.blocked_reason = null
    else if (typeof v === 'string') updates.blocked_reason = v.trim().slice(0, 500)
  }

  // sex · enum
  if ('sex' in body) {
    const v = body.sex
    if (v === null || v === '' || v === undefined) {
      updates.sex = null
    } else if (typeof v === 'string' && ['f', 'm', 'other', 'na'].includes(v)) {
      updates.sex = v
    }
  }

  // Ajuste de pontos · soma/subtrai do total_points existente
  if (typeof body.pointsAdjustment === 'number' && body.pointsAdjustment !== 0) {
    // tratado abaixo via RPC ou direto após buscar customer
  }

  const hasPointsAdj = typeof body.pointsAdjustment === 'number' && body.pointsAdjustment !== 0
  if (Object.keys(updates).length === 0 && !hasPointsAdj) {
    return NextResponse.json({ error: 'no_changes' }, { status: 400 })
  }

  // Validacao via business+owner (mesma logica do GET).
  // Lê valores ATUAIS de name/email pra comparar antes de espelhar em
  // `clients` (legado v2 · global por phone) — evita disparar UPDATE em
  // outros businesses que compartilham telefone quando nada mudou.
  const { data: customer } = await supabase
    .from('customers')
    .select('id, business_id, phone, name, email')
    .eq('id', id)
    .single()
  if (!customer) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const [{ data: business }, { data: profPatch }] = await Promise.all([
    supabase
      .from('businesses')
      .select('id')
      .eq('id', customer.business_id)
      .eq('owner_id', user.id)
      .maybeSingle(),
    supabase
      .from('professionals')
      .select('id, is_receptionist')
      .eq('business_id', customer.business_id)
      .eq('auth_user_id', user.id)
      .maybeSingle(),
  ])
  if (!business && profPatch?.is_receptionist !== true) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  /* Duplicata BLOQUEIA (decisão Eduardo, 16/09/2026): fundir duas fichas mexe
     em pontos, crédito e histórico e merece tela própria. A busca usa
     variacoesDeTelefone porque a MESMA pessoa está gravada em formatos
     diferentes conforme a porta de entrada (link público x avaliação). */
  const phoneAntigo = customer.phone || ''
  const trocaTelefone =
    phoneNovo !== null && telefoneCanonico(phoneNovo) !== telefoneCanonico(phoneAntigo)
  if (trocaTelefone && phoneNovo) {
    const { data: jaExiste } = await supabase
      .from('customers')
      .select('id, name')
      .eq('business_id', customer.business_id)
      .in('phone', variacoesDeTelefone(phoneNovo))
      .neq('id', id)
      .limit(1)
      .maybeSingle()
    if (jaExiste) {
      return NextResponse.json(
        { error: 'phone_duplicado', cliente: jaExiste.name },
        { status: 409 }
      )
    }
    updates.phone = phoneNovo
    // Número novo: a checagem de WhatsApp do número antigo não vale mais.
    updates.whatsapp_valido = null
    updates.whatsapp_checado_em = null
  }

  if (Object.keys(updates).length > 0) {
    const { error: custErr } = await supabase.from('customers').update(updates).eq('id', id)
    if (custErr) return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  /* Propaga o número novo pra TODA cópia dentro deste negócio. Onde existe
     customer_id o telefone é retrato do momento do lançamento; onde não existe
     (waitlist, gift_cards, optout) casamos pelas variações do número antigo.
     `message_inbox` fica de fora de propósito: é histórico de conversa que
     chegou naquele número, reescrever seria falsear o que aconteceu.
     `clients` é GLOBAL por telefone — nunca reescrevemos a linha, porque outro
     negócio pode atender a mesma pessoa; achamos/criamos a do número novo e
     reapontamos só os agendamentos deste negócio. */
  const pendentes: Record<string, number> = {}
  if (trocaTelefone && phoneNovo) {
    const antigas = variacoesDeTelefone(phoneAntigo)
    const biz = customer.business_id

    await supabase.from('appointments').update({ client_phone: phoneNovo }).eq('business_id', biz).eq('customer_id', id)
    await supabase.from('appointments').update({ client_phone: phoneNovo }).eq('business_id', biz).in('client_phone', antigas)
    await supabase.from('sales').update({ client_phone: phoneNovo }).eq('business_id', biz).eq('customer_id', id)
    await supabase.from('waitlist').update({ client_phone: phoneNovo }).eq('business_id', biz).in('client_phone', antigas)
    await supabase.from('review_claims').update({ customer_phone: phoneNovo }).eq('business_id', biz).eq('customer_id', id)
    await supabase.from('coupon_redemptions').update({ customer_phone: phoneNovo }).eq('customer_id', id)
    await supabase.from('gift_cards').update({ buyer_phone: phoneNovo }).eq('business_id', biz).in('buyer_phone', antigas)
    await supabase.from('message_optout').update({ telefone: phoneNovo }).eq('business_id', biz).in('telefone', antigas)

    const { data: cliUniv } = await supabase.from('clients').select('id').eq('phone', phoneNovo).maybeSingle()
    let clientIdNovo = cliUniv?.id ?? null
    if (!clientIdNovo) {
      const { data: criado } = await supabase
        .from('clients')
        .insert({
          name: (updates.name as string | undefined) ?? customer.name,
          phone: phoneNovo,
          email: customer.email,
        })
        .select('id')
        .single()
      clientIdNovo = criado?.id ?? null
    }
    if (clientIdNovo) {
      await supabase.from('appointments').update({ client_id: clientIdNovo }).eq('business_id', biz).eq('customer_id', id)
    }

    /* Prova na fonte: RLS recusa UPDATE sem erro (afeta 0 linhas). Em vez de
       responder sucesso às cegas, contamos o que ficou com o número velho e
       devolvemos — a tela avisa em vez de mentir. */
    const conferir = [
      ['appointments', 'client_phone'],
      ['sales', 'client_phone'],
      ['waitlist', 'client_phone'],
      ['gift_cards', 'buyer_phone'],
      ['message_optout', 'telefone'],
    ] as const
    for (const [tabela, coluna] of conferir) {
      const { count } = await supabase
        .from(tabela)
        .select('*', { count: 'exact', head: true })
        .eq('business_id', biz)
        .in(coluna, antigas)
      if (count) pendentes[tabela] = count
    }
  }

  // Ajuste de pontos · cria transaction + atualiza total
  if (hasPointsAdj) {
    const delta = body.pointsAdjustment as number
    const { data: cur } = await supabase
      .from('customers')
      .select('total_points')
      .eq('id', id)
      .maybeSingle()
    const newTotal = Math.max(0, (cur?.total_points ?? 0) + delta)
    await supabase.from('customers').update({ total_points: newTotal }).eq('id', id)
    await supabase.from('points_transactions').insert({
      customer_id: id,
      business_id: customer.business_id,
      points: delta,
      reason: 'manual',
    })
  }

  // Espelha em `clients` (universal v2) APENAS quando name ou email
  // efetivamente mudaram. `clients` é tabela global por phone — se
  // 2 businesses compartilham phone (cliente comum a 2 salões), um
  // UPDATE sem mudança real propagaria estado desnecessariamente.
  // Por isso comparamos com valores atuais antes de tocar.
  const clientsUpdate: { name?: string; email?: string | null } = {}
  if (typeof updates.name === 'string' && updates.name !== customer.name) {
    clientsUpdate.name = updates.name
  }
  if ('email' in updates) {
    const newEmail = (updates.email as string | null | undefined) ?? null
    if (newEmail !== customer.email) clientsUpdate.email = newEmail
  }
  if (Object.keys(clientsUpdate).length > 0) {
    // Depois da troca, quem espelha nome/email é a linha do número NOVO.
    await supabase
      .from('clients')
      .update(clientsUpdate)
      .eq('phone', trocaTelefone && phoneNovo ? phoneNovo : customer.phone)
  }

  return NextResponse.json({
    ok: true,
    ...(trocaTelefone ? { phone: updates.phone } : {}),
    ...(Object.keys(pendentes).length > 0 ? { pendentes } : {}),
  })
}
