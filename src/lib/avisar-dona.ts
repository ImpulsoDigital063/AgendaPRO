/* Push no celular da DONA (todos os aparelhos em que ela ativou aviso).
   Saiu de dentro do webhook do WhatsApp em 16/10 porque o "Já paguei" da
   PÁGINA do sinal também precisa avisar: o botão do WhatsApp avisava, o da
   página só gravava — a dona descobria o pagamento só se fosse olhar a aba
   Sinal por conta própria (achado gravando o tutorial da Ivna Loyola). */
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendWebPush } from '@/lib/notify-push'

type Db = SupabaseClient

export async function avisarDona(
  db: Db,
  businessId: string,
  ownerId: string | null,
  quem: string,
  texto: string,
  /* O sinal precisa cair na tela de sinal, não na de mensagens: o que a
     dona tem que fazer é conferir o PIX e marcar "Recebi". */
  destino = '/admin/whatsapp',
  titulo?: string,
) {
  if (!ownerId) return
  const { data: devices } = await db
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', ownerId)
  for (const d of (devices ?? []) as { endpoint: string; p256dh: string; auth: string }[]) {
    await sendWebPush(
      { endpoint: d.endpoint, p256dh: d.p256dh, auth: d.auth },
      {
        titulo: titulo ?? `${quem} respondeu o aviso`,
        corpo: texto.slice(0, 140),
        url: destino,
      },
    ).catch(() => null)
  }
}
