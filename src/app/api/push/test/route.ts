import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendWebPush } from '@/lib/notify-push'

// POST /api/push/test — manda uma notificação de teste pros aparelhos DO
// PRÓPRIO usuário logado. Existe pra fechar o buraco que apareceu no caso do
// Olímpio: não havia como saber se a notificação estava chegando sem esperar um
// agendamento real cair. Agora a tela de Notificações prova na hora.
//
// Só toca nos devices de quem está logado (nunca de outro usuário), então não
// tem como virar canal de disparo pra base.
export const runtime = 'nodejs'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'nao_autenticado' }, { status: 401 })

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', user.id)

  if (!subs || subs.length === 0) {
    return NextResponse.json({ enviados: 0, sem_device: true })
  }

  const results = await Promise.all(
    subs.map((s: { endpoint: string; p256dh: string; auth: string }) =>
      sendWebPush(s, {
        titulo: 'Teste de notificação',
        corpo: 'Deu certo — é assim que você vai ser avisado de um agendamento novo.',
        url: '/admin',
      })
    )
  )

  // Mesma limpeza do /api/notify: assinatura morta (404/410) sai do banco. Aqui
  // ela some ANTES de causar um "ativei e não chega" silencioso.
  const mortas = subs.filter((_, i) => results[i]?.gone).map((s) => s.endpoint)
  if (mortas.length > 0) await admin.from('push_subscriptions').delete().in('endpoint', mortas)

  const enviados = results.filter((r) => r?.ok).length
  return NextResponse.json({ enviados, devices: subs.length, removidos: mortas.length })
}
