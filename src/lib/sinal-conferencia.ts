/* v174 · Sinal conferido pela recepção (Ivna Loyola, 24/10/2026).

   Na clínica da Ivna a cliente manda o comprovante do PIX pro WhatsApp da
   clínica, e quem confere é a recepção (ou a dona). Com a opção ligada:

     · "Já paguei" (página ou WhatsApp) só grava a declaração. O horário fica
       reservado (o prazo para de correr, v146) mas NÃO confirma.
     · O aviso de "disse que pagou" vai pro celular da recepção também.
     · "Recebi o sinal" é que confirma o horário e manda a confirmação.

   Sem a opção, tudo segue como sempre: "Já paguei" confirma o horário e o
   aviso vai só pra dona. */
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendWebPush } from '@/lib/notify-push'

/** Leitura à parte de propósito: sem a coluna no banco (antes da v174) dá
    erro, vira false, e o negócio segue com o comportamento de sempre. */
export async function sinalConferidoPelaRecepcao(db: SupabaseClient, businessId: string): Promise<boolean> {
  const { data, error } = await db
    .from('businesses')
    .select('sinal_conferido_pela_recepcao')
    .eq('id', businessId)
    .maybeSingle()
  if (error) return false
  return (data as { sinal_conferido_pela_recepcao?: boolean } | null)?.sinal_conferido_pela_recepcao === true
}

/** Push no celular de quem é recepção no negócio (a dona é avisada à parte,
    pelo avisarDona, e não recebe duas vezes). */
export async function avisarRecepcao(
  db: SupabaseClient,
  businessId: string,
  ownerId: string | null,
  texto: string,
) {
  const { data: equipe } = await db
    .from('professionals')
    .select('auth_user_id')
    .eq('business_id', businessId)
    .eq('active', true)
    .eq('is_receptionist', true)
    .not('auth_user_id', 'is', null)
  const usuarios = [...new Set((equipe ?? []).map((p) => p.auth_user_id as string))].filter((u) => u !== ownerId)
  if (usuarios.length === 0) return
  const { data: devices } = await db
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', usuarios)
  for (const d of (devices ?? []) as { endpoint: string; p256dh: string; auth: string }[]) {
    await sendWebPush(
      { endpoint: d.endpoint, p256dh: d.p256dh, auth: d.auth },
      { titulo: 'Sinal: confira o comprovante', corpo: texto.slice(0, 140), url: '/recepcao/sinal' },
    ).catch(() => null)
  }
}
