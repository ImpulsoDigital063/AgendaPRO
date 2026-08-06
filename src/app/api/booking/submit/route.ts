import { NextRequest, NextResponse, after } from 'next/server'
import { calcularSinal, gerarBRCode } from '@/lib/pix-brcode'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit-api'
import { variacoesDeTelefone } from '@/lib/phone-variants'
import { todayBR } from '@/lib/date-br'
import { limparSinaisVencidos } from '@/lib/sinal-expira'

/**
 * POST /api/booking/submit
 *
 * Endpoint PUBLICO (sem auth) — chamado pelo BookingFlow do cliente final.
 * Move pro server TODA a escrita que antes o navegador fazia direto como
 * anon (clients, customers, appointments, appointment_services), pra que
 * essas tabelas possam ter RLS ligado e travado (alerta Supabase 31/05/2026,
 * fix de segurança Fase 1). Mesmo padrão de /api/coupons/use.
 *
 * Espelha exatamente o antigo handleSubmit:
 *   1. upsert clients (cadastro global por telefone)
 *   2. upsert customers do business (+ birthday opcional + referral)
 *   3. checagem de conflito de horário
 *   4. insert appointment (constraint v40 23P01 = anti-overbooking)
 *   5. insert appointment_services
 *   6. marca referred_by quando cliente novo veio por link de indicação
 *
 * Retorna { appointmentId, referralCode, pointsEarned } pro client montar
 * o link de indicação (com window.location.origin) e a tela de sucesso.
 * Cupom e notificação seguem em rotas server próprias já existentes
 * (/api/coupons/use, /api/notify), chamadas pelo client após o sucesso.
 */

type ServiceInput = {
  id: string
  name: string
  price: number | null
  duration_minutes: number | null
  points: number | null
}

function admin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// v42 · birthday opcional · round-trip pra rejeitar data irreal (30/02 etc)
function parseBirthday(raw: string): string | null {
  const input = (raw || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null
  const [by, bm, bd] = input.split('-').map(Number)
  const d = new Date(`${input}T00:00:00Z`)
  const isReal = d.getUTCFullYear() === by && d.getUTCMonth() + 1 === bm && d.getUTCDate() === bd
  const isPastOrToday = d.getTime() <= Date.now()
  return isReal && isPastOrToday ? input : null
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'booking-submit', limit: 20, windowSeconds: 60 })
  if (rl) return rl

  const body = await req.json().catch(() => ({}))
  const businessId = typeof body.businessId === 'string' ? body.businessId : ''
  const professionalId = typeof body.professionalId === 'string' ? body.professionalId : ''
  const returningClientId = typeof body.clientId === 'string' && body.clientId ? body.clientId : null
  const name = typeof body.clientName === 'string' ? body.clientName.trim() : ''
  const phone = typeof body.clientPhone === 'string' ? body.clientPhone.trim() : ''
  const email = typeof body.clientEmail === 'string' && body.clientEmail.trim() ? body.clientEmail.trim() : null
  const validBirthday = parseBirthday(typeof body.clientBirthday === 'string' ? body.clientBirthday : '')
  const services: ServiceInput[] = Array.isArray(body.services) ? body.services : []
  const appointmentDate = typeof body.date === 'string' ? body.date : ''
  const startTime = typeof body.startTime === 'string' ? body.startTime : ''
  const endTime = typeof body.endTime === 'string' ? body.endTime : ''
  const referralCode = typeof body.referralCode === 'string' && body.referralCode ? body.referralCode : null
  const totalPrice = typeof body.totalPrice === 'number' ? body.totalPrice : null
  const hasPrice = body.hasPrice === true

  if (!businessId || !professionalId || !name || !phone || !appointmentDate || !startTime || !endTime) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
  }

  /* Data no passado (auditoria 05/08) · a tela nunca deixa escolher, mas a
     rota é pública e aceitava. Agendamento em data vencida entra na agenda
     como se fosse real e polui todo relatório que conta por dia.

     Fica só nisso de propósito: replicar aqui a validação de expediente,
     bloqueio e intervalo (que hoje mora na tela) tem risco alto de recusar
     agendamento legítimo do Olímpio, que é o caminho de receita. Data
     passada é inequívoco. λ.fuso: compara no fuso de Brasília, não em UTC —
     em UTC, depois das 21h "hoje" já virou ontem. */
  if (appointmentDate < todayBR()) {
    return NextResponse.json({ error: 'data_passada' }, { status: 400 })
  }

  const db = admin()

  // Valida que o professional pertence ao business e está ativo
  // (anti-cross-business / payload forjado — antes a anon key garantia
  // só pelo RLS inexistente; agora validamos explicitamente).
  const { data: prof } = await db
    .from('professionals')
    .select('id, business_id, active')
    .eq('id', professionalId)
    .maybeSingle()

  if (!prof || prof.business_id !== businessId || !prof.active) {
    return NextResponse.json({ error: 'invalid_professional' }, { status: 400 })
  }

  /* PREÇO VEM DO BANCO, NÃO DO NAVEGADOR (auditoria 05/08).
     ─────────────────────────────────────────────────────────────────
     Esta rota é PÚBLICA e sem login. Até aqui ela gravava price, duração
     e pontos exatamente como o corpo do POST mandava — e é esse valor que
     vira a comanda que o dono cobra. Qualquer um com o link podia postar
     um R$ 250 como R$ 0 e o salão só descobriria na cadeira, com a
     cliente na frente e a comanda dizendo zero.

     Não havia nem checagem de que o serviço é DESTE negócio: dava pra
     pendurar serviço de outro salão no agendamento.

     Agora: relê os serviços no banco por id, exige que sejam do negócio e
     estejam ativos, e usa os valores de lá. O que o navegador mandou vira
     só uma lista de ids.

     O fim do horário também é recalculado — antes vinha pronto do corpo,
     então dava pra reservar 5 minutos de um serviço de 1h e deixar o
     profissional em cima de outro agendamento. */
  const idsPedidos = services.map((s) => s.id).filter((id) => typeof id === 'string' && id)
  let servicosDb: { id: string; name: string; price: number | null; duration_minutes: number | null; points: number | null }[] = []

  if (idsPedidos.length > 0) {
    const { data: encontrados } = await db
      .from('services')
      .select('id, name, price, duration_minutes, points, business_id, active')
      .in('id', idsPedidos)
      .eq('business_id', businessId)

    const porId = new Map((encontrados ?? []).map((s) => [s.id as string, s]))
    for (const id of idsPedidos) {
      const s = porId.get(id)
      if (!s || s.active === false) {
        return NextResponse.json({ error: 'invalid_service' }, { status: 400 })
      }
    }
    // Preserva a ordem que a cliente escolheu (o primeiro vira o service_name).
    servicosDb = idsPedidos.map((id) => {
      const s = porId.get(id)!
      return {
        id: s.id as string,
        name: s.name as string,
        price: s.price === null || s.price === undefined ? null : Number(s.price),
        duration_minutes: s.duration_minutes === null ? null : Number(s.duration_minutes),
        points: s.points === null || s.points === undefined ? 0 : Number(s.points),
      }
    })
  }

  // Total e fim do horário, ambos derivados do banco.
  const precos = servicosDb.map((s) => s.price).filter((p): p is number => p !== null)
  const temPrecoReal = precos.length > 0 && precos.length === servicosDb.length
  const totalServer = temPrecoReal ? Math.round(precos.reduce((a, b) => a + b, 0) * 100) / 100 : null

  /* Divergência entre o que a tela mostrou e o que o banco diz. Normalmente é
     inocente (a dona mudou o preço enquanto a cliente escolhia); se aparecer
     muito no log, é sinal de payload forjado. O banco manda de qualquer jeito. */
  if (hasPrice && totalPrice !== null && totalServer !== null && Math.abs(totalPrice - totalServer) > 0.01) {
    console.warn(
      `booking submit · preço divergente · negócio ${businessId} · tela R$ ${totalPrice} × banco R$ ${totalServer}`,
    )
  }

  const duracaoTotal = servicosDb.reduce((a, s) => a + (s.duration_minutes ?? 0), 0)
  let endTimeServer = endTime
  if (duracaoTotal > 0) {
    const [hh, mm] = startTime.split(':').map(Number)
    const fim = hh * 60 + mm + duracaoTotal
    endTimeServer = `${String(Math.floor(fim / 60)).padStart(2, '0')}:${String(fim % 60).padStart(2, '0')}:00`
  }

  // 1. Criar ou recuperar cliente global (clients) — match por phone trim,
  //    igual ao handleSubmit original.
  /* clientId vem do corpo (cliente reconhecida pelo telefone na tela anterior).
     Auditoria 05/08: era aceito sem conferir. Um id de outra pessoa penduraria
     o atendimento na ficha dela. Confere que o telefone bate; se não bate,
     ignora e cai no caminho normal de busca por telefone. */
  let clientId: string | null = null
  if (returningClientId) {
    const { data: dono } = await db
      .from('clients')
      .select('id, phone')
      .eq('id', returningClientId)
      .maybeSingle()
    if (dono && (dono.phone || '').trim() === phone) clientId = dono.id
  }
  if (!clientId) {
    // Casa por qualquer formato do mesmo número (ver phone-variants.ts).
    const { data: achados } = await db
      .from('clients')
      .select('id, created_at')
      .in('phone', variacoesDeTelefone(phone))
      .order('created_at', { ascending: true })
      .limit(1)
    const existing = achados?.[0] ?? null
    if (existing) {
      clientId = existing.id
      await db.from('clients').update({ name, email }).eq('id', clientId)
    } else {
      const { data: created } = await db
        .from('clients')
        .insert({ name, phone, email })
        .select('id')
        .single()
      clientId = created?.id ?? null
    }
  }

  // 1b. Criar ou recuperar customer do business (pontos/fidelidade)
  /* Mesmo motivo do clients acima: o fluxo de avaliação grava o telefone só
     em dígitos e o link grava com máscara. Com `.eq` exato a mesma pessoa
     ganhava segunda ficha — e o crédito dela ficava na ficha errada. */
  const { data: customersAchados } = await db
    .from('customers')
    .select('id, total_points, birthday, created_at')
    .eq('business_id', businessId)
    .in('phone', variacoesDeTelefone(phone))
    .order('created_at', { ascending: true })
    .limit(1)
  const existingCustomer = customersAchados?.[0] ?? null

  let customerId: string | null = existingCustomer?.id ?? null
  let referralCodeOut: string | null = null

  if (!customerId) {
    const insertData: Record<string, unknown> = { business_id: businessId, name, phone, email }
    if (validBirthday) insertData.birthday = validBirthday
    const { data: newCustomer } = await db
      .from('customers')
      .insert(insertData)
      .select('id, referral_code')
      .single()
    customerId = newCustomer?.id ?? null
    referralCodeOut = newCustomer?.referral_code ?? null
  } else {
    const { data: existingFull } = await db
      .from('customers')
      .select('referral_code')
      .eq('id', customerId)
      .single()
    referralCodeOut = existingFull?.referral_code ?? null
    // "preenche se faltar" — não sobrescreve birthday prévio
    if (validBirthday && !existingCustomer?.birthday) {
      await db.from('customers').update({ birthday: validBirthday }).eq('id', customerId)
    }
  }

  /* Solta os horários cujo sinal venceu antes de conferir conflito (v115).
     Tem que ser ANTES: a constraint no_overlap do banco conta pending como
     ocupado, então sem isto a cliente tomaria erro num horário que a tela
     mostrou livre. Escopo estreito — só este profissional, só este dia. */
  await limparSinaisVencidos(db, { businessId, professionalId, date: appointmentDate })

  // 2. Conflito de horário (proteção pré-insert; a constraint v40 é a final)
  const { data: conflict } = await db
    .from('appointments')
    .select('id')
    .eq('professional_id', professionalId)
    .eq('appointment_date', appointmentDate)
    .in('status', ['pending', 'confirmed'])
    .lt('start_time', endTimeServer)
    .gt('end_time', startTime)
    .limit(1)
    .maybeSingle()

  if (conflict) {
    return NextResponse.json({ error: 'overlap' }, { status: 409 })
  }

  /* SINAL (v112) · pedido da Wanessa Silva em 05/08.
     ───────────────────────────────────────────────────────────────
     Quando o negocio liga o sinal, o horario NAO nasce confirmado: fica
     pendente ate o dono ver o PIX cair e marcar. E o fluxo que ela
     descreveu e ja usa na academia dela.

     O valor e congelado aqui, no ato da marcacao: se o percentual do
     negocio mudar amanha, quem marcou hoje continua devendo o que foi
     combinado hoje.

     Servico sem preco (DN Diogo) nao gera sinal — nao da pra cobrar
     percentual de um valor que ainda nao existe. */
  const { data: negocio } = await db
    .from('businesses')
    .select('sinal_enabled, sinal_percent, pix_key, pix_receiver_name, pix_city')
    .eq('id', businessId)
    .maybeSingle()

  const exigeSinal =
    negocio?.sinal_enabled === true &&
    !!negocio?.pix_key &&
    temPrecoReal &&
    !!totalServer &&
    totalServer > 0
  const sinalCheio = exigeSinal
    ? calcularSinal(totalServer as number, Number(negocio?.sinal_percent ?? 0))
    : null

  /* CRÉDITO ABATE O SINAL (v113 · decisão do Eduardo, 05/08).
     ─────────────────────────────────────────────────────────────────
     Sem isto o crédito seria inútil no caso que o criou: a cliente
     cancelou dentro do prazo, ganhou R$ 9 de crédito, e ao remarcar pelo
     link o sistema pediria outro PIX de R$ 9 — ela pagaria duas vezes
     pra usar o que já é dela.

     Consome do mais antigo pro mais novo, e o que sobrar CONTINUA DELA:
     crédito de R$ 20 num sinal de R$ 9 vira R$ 9 consumidos e uma nova
     linha de R$ 11, com a mesma validade. Zerar a sobra seria confiscar.

     Crédito vencido não entra: expires_at no passado fica de fora. */
  let creditoAplicado = 0
  const creditosUsados: string[] = []
  let sobra: { valor: number; expira: string | null } | null = null

  if (sinalCheio && sinalCheio > 0 && customerId) {
    const { data: disponiveis } = await db
      .from('customer_credits')
      .select('id, amount, expires_at')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .is('used_in_invoice_id', null)
      .is('used_in_appointment_id', null)
      .order('expires_at', { ascending: true, nullsFirst: false })

    const agora = new Date()
    for (const c of disponiveis ?? []) {
      if (creditoAplicado >= sinalCheio) break
      if (c.expires_at && new Date(c.expires_at) < agora) continue
      const valor = Number(c.amount ?? 0)
      if (valor <= 0) continue
      const falta = sinalCheio - creditoAplicado
      creditosUsados.push(c.id)
      if (valor <= falta) {
        creditoAplicado += valor
      } else {
        creditoAplicado += falta
        sobra = { valor: Math.round((valor - falta) * 100) / 100, expira: c.expires_at ?? null }
      }
    }
  }

  // O que ainda falta pagar no PIX depois de abater o crédito.
  const valorSinal = sinalCheio ? Math.max(0, Math.round((sinalCheio - creditoAplicado) * 100) / 100) : null
  // Crédito cobriu tudo: o horário já nasce confirmado, sem PIX nenhum.
  const sinalQuitadoPorCredito = !!sinalCheio && creditoAplicado >= sinalCheio

  // 3. Criar agendamento
  const firstService = servicosDb[0] ?? null
  const { data: appointment, error: apptErr } = await db
    .from('appointments')
    .insert({
      business_id: businessId,
      professional_id: professionalId,
      client_id: clientId,
      /* customer_id (auditoria 05/08) · faltava desde sempre. O customer é
         criado/recuperado logo acima, mas o vínculo nunca era gravado no
         agendamento — 396 dos 1.272 da base ficaram órfãos.

         Não é detalhe de schema, quebra três coisas de verdade:
         · crédito de cancelamento (sinal-cancelamento.ts sai fora sem isto)
           — justo pra quem cancela PELO LINK, que é o caso todo
         · ficha da cliente no drawer, que só abre com customer_id
         · card de reativação, que conta última visita por customer_id: quem
           só marca por link nunca contava como "veio", então aparecia como
           sumida tendo vindo semana passada

         Pontos NÃO estavam nesse pacote: o trigger v15 resolve o customer por
         business+phone, então continuou creditando (155 de 158 conferidos). */
      customer_id: customerId,
      client_name: name,
      client_phone: phone,
      client_email: email,
      service_id: firstService?.id ?? null,
      service_name: firstService?.name ?? null,
      total_price: temPrecoReal ? totalServer : null,
      appointment_date: appointmentDate,
      start_time: startTime,
      end_time: endTimeServer,
      // Crédito cobriu tudo: confirma direto. Sobrou diferença: fica reservado.
      status: valorSinal && valorSinal > 0 ? 'pending' : 'confirmed',
      // sinal_valor guarda o SINAL CHEIO (o que a comanda vai abater depois),
      // não o que faltou pagar no PIX — o crédito também é dinheiro que entrou.
      sinal_valor: sinalCheio,
      sinal_pago_at: sinalQuitadoPorCredito ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (apptErr || !appointment) {
    // 23P01 = exclusion_violation (constraint no_overlap_appointments v40)
    const code = (apptErr as { code?: string } | null)?.code
    const isOverlap =
      code === '23P01' ||
      apptErr?.message?.includes('horário') ||
      apptErr?.message?.includes('no_overlap')
    if (isOverlap) return NextResponse.json({ error: 'overlap' }, { status: 409 })
    console.error('booking submit · appointment insert error:', apptErr)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }

  /* Consome o crédito DEPOIS do agendamento existir — precisamos do id pra
     marcar onde ele foi usado. Se o insert acima tivesse falhado, o crédito
     continuaria intacto: nada de queimar saldo por agendamento que não nasceu. */
  if (creditosUsados.length > 0) {
    await db
      .from('customer_credits')
      .update({ used_in_appointment_id: appointment.id })
      .in('id', creditosUsados)

    /* Sobra volta como crédito novo, com a mesma validade do original.
       Se ESTE insert falhar, a cliente perde a diferença: o crédito antigo já
       foi marcado como usado logo acima. Por isso o erro é tratado — e a
       reação é devolver o crédito original ao estado anterior, que é melhor
       do que ela ficar sem nada. Foi assim que a v113 sangrava: o CHECK de
       origin não conhecia 'sinal' e o insert morria calado. */
    if (sobra && sobra.valor > 0) {
      const { error: sobraErr } = await db.from('customer_credits').insert({
        business_id: businessId,
        customer_id: customerId,
        amount: sobra.valor,
        origin: 'sinal',
        date: appointmentDate,
        expires_at: sobra.expira,
        notes: 'Sobra de crédito usado no sinal',
      })
      if (sobraErr) {
        console.error('booking submit · sobra de crédito NÃO gravou · devolvendo o crédito original:', sobraErr.message)
        await db
          .from('customer_credits')
          .update({ used_in_appointment_id: null })
          .in('id', creditosUsados)
        await db
          .from('appointments')
          .update({ sinal_valor: sinalCheio, sinal_pago_at: null, status: 'pending' })
          .eq('id', appointment.id)
      }
    }
  }

  // 4. Serviços do agendamento
  if (servicosDb.length > 0) {
    await db.from('appointment_services').insert(
      servicosDb.map((s) => ({
        appointment_id: appointment.id,
        service_id: s.id,
        service_name: s.name,
        price: s.price,
        duration_minutes: s.duration_minutes,
      }))
    )
  }

  // 5. referred_by quando cliente NOVO veio por link de indicação
  if (referralCode && customerId && !existingCustomer) {
    const { data: referrer } = await db
      .from('customers')
      .select('id')
      .eq('referral_code', referralCode)
      .eq('business_id', businessId)
      .maybeSingle()
    if (referrer && referrer.id !== customerId) {
      await db.from('customers').update({ referred_by: referrer.id }).eq('id', customerId)
    }
  }

  // 6. Pontos que o cliente VAI ganhar (creditados pelo trigger SQL no completed)
  const pointsEarned = servicosDb.reduce((sum, s) => sum + (s.points ?? 0), 0)

  /* Devolve o PIX pronto quando há sinal. O BR Code é montado no servidor
     porque a chave e o nome do recebedor não devem trafegar antes da hora —
     e porque assim a cliente recebe o código exato que o banco espera, sem
     depender de nada rodar certo no celular dela. */
  const pix = valorSinal && valorSinal > 0
    ? {
        valor: valorSinal,
        copiaECola: gerarBRCode({
          chave: negocio!.pix_key as string,
          nomeRecebedor: (negocio as { pix_receiver_name?: string })?.pix_receiver_name || 'RECEBEDOR',
          cidade: (negocio as { pix_city?: string })?.pix_city || 'BRASIL',
          valor: valorSinal,
          identificador: appointment.id.replace(/-/g, '').slice(0, 25),
        }),
      }
    : null

  /* AVISO NÃO DEPENDE MAIS DO NAVEGADOR (auditoria 05/08).
     ─────────────────────────────────────────────────────────────────
     Quem avisava a dona era o navegador da cliente: o BookingFlow chamava
     /api/notify depois que esta rota respondia. Se o 4G caísse nesse
     intervalo — ou ela fechasse a aba na hora — o agendamento existia e
     ninguém era avisado. Em salão isso é horário perdido, e a dona só
     descobria abrindo a agenda.

     after() roda depois da resposta ir embora, então não custa nada pra
     cliente esperando a tela de sucesso. A chamada do navegador continua
     lá como segunda tentativa: desde a v114 a rota é idempotente
     (notified_at), quem chegar primeiro avisa e o outro só devolve o
     link de cancelamento. Sem risco de mandar dois emails. */
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.agendapro.net.br'
  after(async () => {
    try {
      await fetch(`${baseUrl}/api/notify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ appointmentId: appointment.id }),
      })
    } catch (err) {
      console.error('booking submit · aviso do servidor falhou (o navegador ainda tenta):', err)
    }
  })

  return NextResponse.json({
    ok: true,
    appointmentId: appointment.id,
    referralCode: referralCodeOut,
    pointsEarned,
    pix,
    /* A tela precisa saber pra dizer 'crédito aplicado' em vez de sumir com o
       valor — e precisa da SOBRA: cliente que gastou R$ 18 de um crédito de
       R$ 23 e não vê os R$ 5 na tela acha que perdeu, e quem ouve isso depois
       é o salão. */
    credito:
      creditoAplicado > 0
        ? {
            aplicado: creditoAplicado,
            sinalCheio,
            quitado: sinalQuitadoPorCredito,
            sobra: sobra?.valor ?? 0,
          }
        : null,
  })
}
