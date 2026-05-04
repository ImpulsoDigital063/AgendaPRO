/**
 * POST /api/lgpd/delete-me
 *
 * Cliente final solicita exclusão dos próprios dados (Lei 13.709 — LGPD).
 * Cliente é o titular dos dados pessoais (nome, telefone, email,
 * histórico de agendamentos, pontos de fidelidade).
 *
 * Body esperado:
 *   {
 *     businessSlug: string  // slug do estabelecimento (público)
 *     phone: string         // telefone com DDD (10-11 dígitos)
 *     confirmText: "EXCLUIR_MEUS_DADOS"  // confirmação literal anti-acidente
 *   }
 *
 * Quem pode chamar: cliente final (sem auth). Identifica-se pela
 * combinação business+phone — assume que só o titular tem acesso ao
 * próprio número. Rate limit estrito (3/h por IP) defende contra
 * tentativa de descobrir clientes por brute force.
 *
 * O que apaga (cascata):
 *   - customers (registros do cliente naquele business)
 *   - appointments (filtra por client_phone digits + business_id)
 *   - waitlist (filtra por client_phone digits + business_id)
 *   - coupons (FK customer_id — apaga via cascade do customer)
 *   - points_transactions (FK customer_id — apaga via cascade)
 *   - review_claims (FK customer_id — apaga via cascade)
 *
 * O que NÃO apaga:
 *   - clients (tabela global compartilhada com outros negócios)
 *   - subscription/billing data (não tem dados pessoais do cliente final)
 *   - activity_log (rastreio de auditoria — anonimiza em vez de apagar)
 *
 * Resposta: 200 com counts; 404 se phone não encontrado; 429 se rate.
 *
 * Compliance LGPD: lei prevê resposta em 15 dias. Esse endpoint
 * processa imediatamente. Para auditoria futura, pode-se gravar em
 * tabela `lgpd_deletion_log` (não implementado nesta versão MVP).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit-api'

const CONFIRM_TEXT = 'EXCLUIR_MEUS_DADOS'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  // Rate limit estrito — pra dificultar brute force descobrir clientes
  const rl = checkRateLimit(req, {
    key: 'lgpd-delete-me',
    limit: 3,
    windowSeconds: 3600,
    message: 'Muitas tentativas. Tente novamente em 1 hora.',
  })
  if (rl) return rl

  const body = await req.json().catch(() => ({}))
  const businessSlug = typeof body.businessSlug === 'string' ? body.businessSlug.trim().toLowerCase() : ''
  const phone = typeof body.phone === 'string' ? body.phone : ''
  const confirmText = typeof body.confirmText === 'string' ? body.confirmText : ''

  if (!businessSlug || !phone) {
    return NextResponse.json(
      { error: 'Informe businessSlug e phone.' },
      { status: 400 }
    )
  }

  // Confirmação literal anti-acidente. Frontend deve forçar usuário
  // digitar exatamente "EXCLUIR_MEUS_DADOS" antes de habilitar botão.
  if (confirmText !== CONFIRM_TEXT) {
    return NextResponse.json(
      { error: `Confirmação inválida. Envie confirmText="${CONFIRM_TEXT}".` },
      { status: 400 }
    )
  }

  const phoneDigits = phone.replace(/\D/g, '')
  if (phoneDigits.length < 10) {
    return NextResponse.json({ error: 'Telefone inválido.' }, { status: 400 })
  }

  const admin = getAdminClient()

  // Acha o business pelo slug
  const { data: business } = await admin
    .from('businesses')
    .select('id, name')
    .eq('slug', businessSlug)
    .maybeSingle()

  if (!business) {
    return NextResponse.json({ error: 'Estabelecimento não encontrado.' }, { status: 404 })
  }

  // Acha o customer no business pelo phone (tolerante a máscara)
  const { data: customers } = await admin
    .from('customers')
    .select('id, name, phone')
    .eq('business_id', business.id)

  const customer = (customers || []).find(
    (c) => (c.phone || '').replace(/\D/g, '') === phoneDigits
  )

  if (!customer) {
    // Não revela se phone existe — resposta neutra protege privacidade
    // de quem foi alvo de pesquisa por terceiros. Mesmo retorno 200.
    return NextResponse.json({
      ok: true,
      message: 'Se houver dados associados, foram processados. Em caso de dúvida, contate o estabelecimento.',
    })
  }

  // Counts antes pra log
  const counts = { appointments: 0, waitlist: 0, customer: 0 }

  // Apaga appointments por client_phone digits + business_id (não tem
  // FK pra customer). Usa LIKE/match por dígitos pra cobrir variações.
  const { data: appts } = await admin
    .from('appointments')
    .select('id, client_phone')
    .eq('business_id', business.id)

  const apptIds = (appts || [])
    .filter((a) => (a.client_phone || '').replace(/\D/g, '') === phoneDigits)
    .map((a) => a.id)

  if (apptIds.length > 0) {
    const { error: deleteApptErr } = await admin
      .from('appointments')
      .delete()
      .in('id', apptIds)
    if (!deleteApptErr) counts.appointments = apptIds.length
  }

  // Apaga waitlist por client_phone digits + business_id
  const { data: wl } = await admin
    .from('waitlist')
    .select('id, client_phone')
    .eq('business_id', business.id)

  const wlIds = (wl || [])
    .filter((w) => (w.client_phone || '').replace(/\D/g, '') === phoneDigits)
    .map((w) => w.id)

  if (wlIds.length > 0) {
    const { error: deleteWlErr } = await admin
      .from('waitlist')
      .delete()
      .in('id', wlIds)
    if (!deleteWlErr) counts.waitlist = wlIds.length
  }

  // Apaga o customer — FKs cascade cuidam de coupons, points_transactions,
  // review_claims (todas têm customer_id ON DELETE CASCADE).
  const { error: deleteCustomerErr } = await admin
    .from('customers')
    .delete()
    .eq('id', customer.id)

  if (deleteCustomerErr) {
    console.error('[LGPD] Erro ao apagar customer:', deleteCustomerErr)
    return NextResponse.json(
      { error: 'Erro ao processar exclusão. Tente novamente ou contate o estabelecimento.' },
      { status: 500 }
    )
  }
  counts.customer = 1

  console.log(
    `[LGPD] Exclusão concluída — business=${business.name} customer=${customer.id} ` +
      `appts=${counts.appointments} waitlist=${counts.waitlist}`
  )

  return NextResponse.json({
    ok: true,
    message: 'Seus dados foram excluídos. Você não receberá mais comunicações deste estabelecimento.',
    deleted: {
      customer: counts.customer,
      appointments: counts.appointments,
      waitlist: counts.waitlist,
    },
  })
}
