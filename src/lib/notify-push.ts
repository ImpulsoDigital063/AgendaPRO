// Web Push (server) — assina com VAPID e empurra a notificação pro device do
// dono. Portado do appdelyvery/lib/notify.ts. No-op sem as chaves
// (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY) — a estrutura fica pronta e só liga
// quando as env vars existem (igual ao padrão do Asaas/Resend).
import webpush from 'web-push'

const PUB = process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
const PRIV = process.env.VAPID_PRIVATE_KEY ?? ''
const SUBJ = process.env.VAPID_SUBJECT ?? 'mailto:contato@agendapro.net.br'

let ready = false
function init(): boolean {
  if (!PUB || !PRIV) return false
  if (!ready) {
    webpush.setVapidDetails(SUBJ, PUB, PRIV)
    ready = true
  }
  return true
}

export type PushSub = { endpoint: string; p256dh: string; auth: string }
export type PushPayload = { titulo: string; corpo: string; url?: string }

// gone=true quando a assinatura morreu (404/410) — quem chama limpa a linha.
export async function sendWebPush(
  sub: PushSub,
  payload: PushPayload
): Promise<{ ok: boolean; gone?: boolean }> {
  if (!init()) return { ok: false }
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    )
    return { ok: true }
  } catch (e) {
    const code = (e as { statusCode?: number })?.statusCode
    return { ok: false, gone: code === 404 || code === 410 }
  }
}
