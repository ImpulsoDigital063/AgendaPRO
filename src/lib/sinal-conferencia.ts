/* v174 · Sinal conferido pela recepção (Ivna Loyola, 24/10/2026).

   Na clínica da Ivna a cliente manda o comprovante do PIX pro WhatsApp da
   clínica, que fica com a recepção. O "Já paguei" confirma o horário igual
   em todo negócio (modelo da Wanessa, v146: quem diz que pagou tem o horário).
   O que a opção muda é QUEM confere o dinheiro:

     · o aviso de "disse que pagou" vai pro celular da recepção também;
     · a recepção tem "Sinais a conferir" (/recepcao/sinal) pra ver o
       comprovante e tocar em "Recebi o sinal".

   Eduardo cogitou segurar o horário até a conferência e voltou atrás no mesmo
   dia (24/10): o modelo da Wanessa funciona há semanas sem reclamação. */
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
