import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { diasAteVencer } from '@/lib/billing'
import { createPayment, getNextDueDate } from '@/lib/asaas'
import { sendBillingReminderD3, sendBillingOverdue, sendTrialEndingSoon, sendTrialEnded } from '@/lib/email'
import { calcularPreco, type ModalidadeKey, type PlanoTipo } from '@/config/pricing'

export const maxDuration = 60

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * GET /api/cron/billing-check
 *
 * Cron daily — roda 1x por dia (configurado em vercel.json).
 *
 * Pra cada subscription ativa com modalidade PIX (mensal_pix / semestral_pix / anual_pix):
 *   D-3:  cria nova cobrança PIX no Asaas + envia email lembrete
 *   D-2:  email lembrete (sem regenerar — usa link anterior)
 *   D-1:  email lembrete intensificado
 *   D+0:  email "vence hoje"
 *   D+3:  email "atrasada"
 *   D+1+ (venceu e ainda 'active'): FALLBACK — se o webhook PAYMENT_OVERDUE do
 *         Asaas não moveu pra past_due, o cron garante past_due + grace_ends_at
 *         (3 dias), mesmo modelo do webhook. O gate bloqueia quando a carência vence.
 *
 * mensal_cartao não passa por aqui — Asaas Subscription renova automático
 * via API e dispara webhook PAYMENT_CONFIRMED.
 */
export async function GET(req: NextRequest) {
  // Auth: Vercel cron envia Bearer CRON_SECRET
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getAdminClient()
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.agendapro.net.br'

  const { data: subscriptions, error } = await admin
    .from('subscriptions')
    .select(`
      id,
      business_id,
      plan,
      plan_modalidade,
      pago_ate,
      status,
      pix_link_atual,
      asaas_customer_id,
      provider,
      businesses!inner ( id, name, owner_id )
    `)
    .in('plan_modalidade', ['mensal_pix', 'semestral_pix', 'anual_pix'])
    .in('status', ['active', 'past_due'])

  if (error) {
    console.error('[Cron Billing] Erro ao buscar subscriptions:', error)
    return NextResponse.json({ error: 'Erro ao buscar subscriptions' }, { status: 500 })
  }

  let processed = 0
  let alertsSent = 0
  let blocked = 0
  const errors: { id: string; error: string }[] = []

  for (const sub of subscriptions ?? []) {
    if (!sub.pago_ate) continue
    processed++

    const business = (sub.businesses as unknown) as { id: string; name: string; owner_id: string }

    // Buscar email do owner
    const { data: { user: ownerUser } } = await admin.auth.admin.getUserById(business.owner_id)
    if (!ownerUser?.email) {
      errors.push({ id: sub.id, error: 'owner sem email' })
      continue
    }

    const dias = diasAteVencer(sub.pago_ate)
    const valor =
      sub.plan_modalidade === 'mensal_pix' && sub.plan === 'solo' ? 'R$ 67' :
      sub.plan_modalidade === 'mensal_pix' && sub.plan === 'equipe' ? 'R$ 97' :
      sub.plan_modalidade === 'semestral_pix' && sub.plan === 'solo' ? 'R$ 350' :
      sub.plan_modalidade === 'semestral_pix' && sub.plan === 'equipe' ? 'R$ 500' :
      sub.plan_modalidade === 'anual_pix' && sub.plan === 'solo' ? 'R$ 670' :
      sub.plan_modalidade === 'anual_pix' && sub.plan === 'equipe' ? 'R$ 970' :
      'R$ ?'

    try {
      // D-3: Cria cobrança Asaas nova + envia email
      if (dias === 3) {
        if (!sub.asaas_customer_id) {
          errors.push({ id: sub.id, error: 'sem asaas_customer_id pra criar cobrança' })
          continue
        }

        const preco = calcularPreco(
          sub.plan as PlanoTipo,
          sub.plan_modalidade as ModalidadeKey
        )

        const payRes = await createPayment({
          customer: sub.asaas_customer_id,
          billingType: 'PIX',
          value: preco.valorReais,
          dueDate: getNextDueDate(3), // vence em 3 dias
          description: `AgendaPRO ${sub.plan === 'solo' ? 'Solo' : 'Equipe'} — renovação ${sub.plan_modalidade}`,
          externalReference: `${business.id}|${sub.plan_modalidade}|${preco.coberturaMeses}`,
        })

        if (!payRes.ok || !payRes.data?.invoiceUrl) {
          errors.push({ id: sub.id, error: payRes.error ?? 'asaas createPayment falhou' })
          continue
        }

        await admin
          .from('subscriptions')
          .update({ pix_link_atual: payRes.data.invoiceUrl })
          .eq('id', sub.id)

        await sendBillingReminderD3({
          ownerEmail: ownerUser.email,
          ownerName: business.name,
          businessName: business.name,
          pixUrl: payRes.data.invoiceUrl,
          valor,
          diasParaVencer: 3,
          modalidade: sub.plan_modalidade as 'mensal_pix' | 'semestral_pix' | 'anual_pix',
        })

        alertsSent++
      }
      // D-2 e D-1: email lembrete (usa pix anterior)
      else if (dias === 2 || dias === 1) {
        if (sub.pix_link_atual) {
          await sendBillingReminderD3({
            ownerEmail: ownerUser.email,
            ownerName: business.name,
            businessName: business.name,
            pixUrl: sub.pix_link_atual,
            valor,
            diasParaVencer: dias,
            modalidade: sub.plan_modalidade as 'mensal_pix' | 'semestral_pix' | 'anual_pix',
          })
          alertsSent++
        }
      }
      // D+0 (vence hoje) ou D+3 (atrasada 3 dias): email overdue
      else if (dias === 0 || dias === -3) {
        if (sub.pix_link_atual) {
          await sendBillingOverdue({
            ownerEmail: ownerUser.email,
            ownerName: business.name,
            businessName: business.name,
            pixUrl: sub.pix_link_atual,
            valor,
            diasAtrasado: Math.abs(dias),
            diasAteBlock: 6 + dias, // dias até bloqueio: D+0 = 6, D+3 = 3
          })
          alertsSent++
        }
      }
      // FALLBACK de bloqueio (rede de segurança · venceu e ainda 'active'):
      // o normal é o webhook PAYMENT_OVERDUE do Asaas mover pra past_due +
      // grace_ends_at (3 dias). Se o webhook falhar/atrasar, ninguém vira o
      // status → acesso grátis indefinido (era o bug do trial). Aqui o cron
      // garante a MESMA transição do webhook: past_due + grace de 3 dias. O gate
      // (layout admin) bloqueia quando a carência vence. Os avisos por e-mail já
      // saem nas branches por dia acima — aqui só asseguramos o status.
      else if (dias < 0 && sub.status === 'active') {
        const graceEnds = new Date()
        graceEnds.setDate(graceEnds.getDate() + 3)
        await admin
          .from('subscriptions')
          .update({ status: 'past_due', grace_ends_at: graceEnds.toISOString() })
          .eq('id', sub.id)
        blocked++
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      errors.push({ id: sub.id, error: errMsg })
      console.error(`[Cron Billing] Erro ao processar sub ${sub.id}:`, err)
    }
  }

  // ── Passo 2: expiração de TRIAL / CORTESIA ────────────────────────
  // Trial e cortesia não-permanente (sem renovação automática) não passam
  // pelo fluxo PIX acima. Quando pago_ate vence, ninguém vira o status →
  // acesso grátis vitalício (bug cravado 07/06). Aqui fechamos: status vira
  // pending_payment, e no próximo acesso o dono cai no paywall (/admin/bloqueado).
  //
  // Critério (espelha o que NÃO tem renovação automática):
  //   status=active · plan_modalidade NULL (não é ciclo PIX) ·
  //   asaas_subscription_id NULL e mp_subscription_id NULL (sem assinatura
  //   recorrente) · pago_ate vencido · permanent_courtesy=false (Palace isento).
  let trialsBlocked = 0
  let trialsWarned = 0
  const nowIso = new Date().toISOString()
  const in24hIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const loginUrl = `${APP_URL}/admin/login`

  // Critério comum de "trial/cortesia sem renovação automática"
  const trialBase = () =>
    admin
      .from('subscriptions')
      .select('id, business_id, businesses!inner ( name, owner_id )')
      .eq('status', 'active')
      .eq('permanent_courtesy', false)
      .is('plan_modalidade', null)
      .is('asaas_subscription_id', null)
      .is('mp_subscription_id', null)

  async function ownerEmail(ownerId: string): Promise<string | null> {
    try {
      const { data: { user } } = await admin.auth.admin.getUserById(ownerId)
      return user?.email ?? null
    } catch {
      return null
    }
  }

  // 2a · D-1: avisa quem vence nas próximas 24h (uma vez · cron roda 1x/dia)
  const { data: soonTrials } = await trialBase().gt('pago_ate', nowIso).lt('pago_ate', in24hIso)
  for (const t of soonTrials ?? []) {
    const biz = (t.businesses as unknown) as { name: string; owner_id: string } | null
    if (!biz) continue
    const email = await ownerEmail(biz.owner_id)
    if (!email) continue
    try {
      await sendTrialEndingSoon({ ownerEmail: email, businessName: biz.name, actionUrl: loginUrl })
      trialsWarned++
    } catch (e) {
      errors.push({ id: t.id, error: `trial_warn_email: ${e instanceof Error ? e.message : String(e)}` })
    }
  }

  // 2b · D-0: vence/venceu → bloqueia (paywall) + email "acabou"
  const { data: expiredTrials, error: trialErr } = await trialBase().lt('pago_ate', nowIso)
  if (trialErr) {
    console.error('[Cron Billing] Erro ao buscar trials vencidos:', trialErr)
  } else {
    for (const t of expiredTrials ?? []) {
      const { error: upErr } = await admin
        .from('subscriptions')
        .update({ status: 'pending_payment' })
        .eq('id', t.id)
      if (upErr) {
        errors.push({ id: t.id, error: `trial_block_failed: ${upErr.message}` })
        continue
      }
      trialsBlocked++
      const biz = (t.businesses as unknown) as { name: string; owner_id: string } | null
      console.log(`[Cron Billing] trial expirado → paywall: ${biz?.name ?? t.business_id}`)
      if (biz) {
        const email = await ownerEmail(biz.owner_id)
        if (email) {
          try {
            await sendTrialEnded({ ownerEmail: email, businessName: biz.name, actionUrl: loginUrl })
          } catch (e) {
            errors.push({ id: t.id, error: `trial_ended_email: ${e instanceof Error ? e.message : String(e)}` })
          }
        }
      }
    }
  }

  console.log(`[Cron Billing] processed=${processed} alertsSent=${alertsSent} blocked=${blocked} trialsWarned=${trialsWarned} trialsBlocked=${trialsBlocked} errors=${errors.length}`)

  return NextResponse.json({
    ok: true,
    processed,
    alerts_sent: alertsSent,
    blocked,
    trials_warned: trialsWarned,
    trials_blocked: trialsBlocked,
    errors: errors.length,
    errors_detail: errors.slice(0, 10),
    _APP_URL: APP_URL,
  })
}
