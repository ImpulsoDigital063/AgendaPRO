import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { diasAteVencer } from '@/lib/billing'
import { sendWebPush } from '@/lib/notify-push'

export const maxDuration = 60

/**
 * GET /api/cron/billing-push
 *
 * Push de billing · 2x/dia (10h e 16h BR · vercel.json em UTC: 13h e 19h).
 * Eduardo 28/07. Complementa os e-mails do billing-check e a faixa no app —
 * push é o canal mais visível. Só dispara pra quem está na JANELA CRÍTICA e
 * tem assinatura de push ativa (a maioria não tem → no-op silencioso).
 *
 * Janelas:
 *  - TRIAL em carência (past_due · modalidade null · grace válida) → "teste acabou"
 *  - TRIAL ativo acabando (pago_ate ≤ 2 dias) → "teste está acabando"
 *  - PAGANTE em carência (past_due) → "pagamento pendente"
 *  - PAGANTE PIX perto de vencer (pago_ate ≤ 3 dias) → "assinatura vence"
 *
 * Não grava estado; é idempotente por natureza (manda o push da janela atual).
 */
function getAdmin() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getAdmin()
  const now = new Date()
  const PLANO_URL = '/admin/configuracoes?tab=plano'

  const { data: subs, error } = await admin
    .from('subscriptions')
    .select(`
      id, status, plan, plan_modalidade, pago_ate, grace_ends_at,
      permanent_courtesy, asaas_subscription_id, mp_subscription_id,
      businesses!inner ( id, name, owner_id )
    `)
    .in('status', ['active', 'past_due'])
    .eq('permanent_courtesy', false)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let candidatos = 0
  let enviados = 0
  let semPush = 0
  const mortas: string[] = []

  for (const sub of subs ?? []) {
    const biz = (sub.businesses as unknown) as { id: string; name: string; owner_id: string } | null
    if (!biz) continue

    const graceAtiva = sub.grace_ends_at ? new Date(sub.grace_ends_at) > now : false
    const isTrial = !sub.plan_modalidade && !sub.asaas_subscription_id && !sub.mp_subscription_id
    const modPix = ['mensal_pix', 'semestral_pix', 'anual_pix'].includes(sub.plan_modalidade ?? '')

    let payload: { titulo: string; corpo: string; url: string } | null = null

    if (isTrial) {
      if (sub.status === 'past_due' && graceAtiva) {
        const diasGrace = Math.max(1, Math.ceil((new Date(sub.grace_ends_at!).getTime() - now.getTime()) / 86400000))
        payload = {
          titulo: 'AgendaPRO · seu teste terminou',
          corpo: `Ative sua assinatura pra não perder seus agendamentos. Faltam ${diasGrace} ${diasGrace === 1 ? 'dia' : 'dias'} antes de bloquear.`,
          url: PLANO_URL,
        }
      } else if (sub.status === 'active' && sub.pago_ate) {
        const dias = diasAteVencer(sub.pago_ate)
        if (dias >= 0 && dias <= 2) {
          payload = {
            titulo: dias === 0 ? 'AgendaPRO · seu teste termina hoje' : 'AgendaPRO · seu teste está acabando',
            corpo: dias === 0 ? 'Ative sua assinatura pra continuar usando o sistema.' : `Faltam ${dias} ${dias === 1 ? 'dia' : 'dias'}. Ative pra não perder seus agendamentos.`,
            url: PLANO_URL,
          }
        }
      }
    } else {
      // PAGANTE
      if (sub.status === 'past_due' && graceAtiva) {
        payload = {
          titulo: 'AgendaPRO · pagamento pendente',
          corpo: 'Sua assinatura venceu. Regularize pra não perder o acesso ao sistema.',
          url: PLANO_URL,
        }
      } else if (modPix && sub.pago_ate) {
        const dias = diasAteVencer(sub.pago_ate)
        if (dias >= 0 && dias <= 3) {
          payload = {
            titulo: 'AgendaPRO · sua assinatura vence',
            corpo: dias === 0 ? 'Vence hoje. Toque pra pagar e continuar sem interrupção.' : `Faltam ${dias} ${dias === 1 ? 'dia' : 'dias'}. Toque pra pagar.`,
            url: PLANO_URL,
          }
        }
      }
    }

    if (!payload) continue
    candidatos++

    const { data: devices } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', biz.owner_id)

    if (!devices || devices.length === 0) { semPush++; continue }

    for (const d of devices) {
      const res = await sendWebPush({ endpoint: d.endpoint, p256dh: d.p256dh, auth: d.auth }, payload)
      if (res.ok) enviados++
      else if (res.gone) mortas.push(d.endpoint)
    }
  }

  // limpa assinaturas mortas (404/410)
  if (mortas.length > 0) {
    await admin.from('push_subscriptions').delete().in('endpoint', mortas)
  }

  return NextResponse.json({ ok: true, candidatos, enviados, sem_push: semPush, limpas: mortas.length })
}
