import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { gerarPixPreference, diasAteVencer } from '@/lib/billing'
import { sendBillingReminderD3, sendBillingOverdue, sendBillingBlocked } from '@/lib/email'
import type { ModalidadeKey, PlanoTipo } from '@/config/pricing'

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
 *   D-3:  gera PIX novo + envia email lembrete
 *   D-2:  email lembrete (sem regenerar PIX — usa o anterior)
 *   D-1:  email lembrete intensificado
 *   D+0:  email "vence hoje"
 *   D+3:  email "atrasada"
 *   D+6+: marca status=past_due (bloqueia painel) + email "bloqueado"
 *
 * mensal_cartao não passa por aqui — preapproval renova automático via MP.
 */
export async function GET(req: NextRequest) {
  // Auth: Vercel cron envia Bearer CRON_SECRET
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getAdminClient()
  const accessToken = process.env.MP_ACCESS_TOKEN
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agendapro.net.br'

  if (!accessToken) {
    return NextResponse.json({ error: 'MP não configurado' }, { status: 500 })
  }

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
      // D-3: Gera PIX novo + envia email
      if (dias === 3) {
        const pix = await gerarPixPreference({
          businessId: business.id,
          payerEmail: ownerUser.email,
          plan: sub.plan as PlanoTipo,
          modalidade: sub.plan_modalidade as Exclude<ModalidadeKey, 'mensal_cartao'>,
          appUrl: APP_URL,
          accessToken,
        })

        if (!pix.ok) {
          errors.push({ id: sub.id, error: pix.error })
          continue
        }

        await admin
          .from('subscriptions')
          .update({ pix_link_atual: pix.init_point })
          .eq('id', sub.id)

        await sendBillingReminderD3({
          ownerEmail: ownerUser.email,
          ownerName: business.name,
          businessName: business.name,
          pixUrl: pix.init_point,
          valor,
          diasParaVencer: 3,
          modalidade: sub.plan_modalidade as 'mensal_pix' | 'semestral_pix' | 'anual_pix',
        })

        alertsSent++
      }
      // D-2 e D-1: email lembrete (sem regenerar — usa pix anterior)
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
      // D+6+: bloqueia
      else if (dias <= -6 && sub.status === 'active') {
        await admin
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('id', sub.id)

        if (sub.pix_link_atual) {
          await sendBillingBlocked({
            ownerEmail: ownerUser.email,
            ownerName: business.name,
            businessName: business.name,
            pixUrl: sub.pix_link_atual,
            valor,
          })
        }

        blocked++
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      errors.push({ id: sub.id, error: errMsg })
      console.error(`[Cron Billing] Erro ao processar sub ${sub.id}:`, err)
    }
  }

  console.log(`[Cron Billing] processed=${processed} alertsSent=${alertsSent} blocked=${blocked} errors=${errors.length}`)

  return NextResponse.json({
    ok: true,
    processed,
    alerts_sent: alertsSent,
    blocked,
    errors: errors.length,
    errors_detail: errors.slice(0, 10),
  })
}
