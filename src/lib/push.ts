'use client'

// Web Push (client) — registra o service worker, pede permissão e salva a
// assinatura na tabela push_subscriptions (via RPC salvar_push_subscription).
// Portado do appdelyvery/lib/push.ts, trocando o client Supabase pelo do
// AgendaPRO e retornando um status pra faixa da home reagir.
//
// Best-effort e idempotente: no-op sem a chave pública VAPID, sem suporte do
// navegador, ou se o dono negou. Chamar SEMPRE a partir de um gesto do usuário
// (clique no botão "Ativar") — a permissão de notificação exige interação.
import { createClient } from '@/lib/supabase/client'

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

export type PushResult = 'granted' | 'denied' | 'unsupported' | 'error'

function urlB64ToUint8Array(base64: string): Uint8Array {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export async function registerPush(): Promise<PushResult> {
  try {
    if (!pushSupported() || !VAPID) return 'unsupported'
    if (Notification.permission === 'denied') return 'denied'

    const reg = await navigator.serviceWorker.register('/sw.js')

    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'error'
    }

    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID) as unknown as BufferSource,
      })
    }

    const json = sub.toJSON()
    if (!json.keys?.p256dh || !json.keys?.auth) return 'error'

    const sb = createClient()
    const { error } = await sb.rpc('salvar_push_subscription', {
      p_endpoint: sub.endpoint,
      p_p256dh: json.keys.p256dh,
      p_auth: json.keys.auth,
      p_user_agent: navigator.userAgent.slice(0, 300),
    })
    if (error) return 'error'
    return 'granted'
  } catch {
    return 'error'
  }
}

// Já tem assinatura ativa neste device? (pra a faixa não aparecer à toa)
export async function hasActivePushSubscription(): Promise<boolean> {
  try {
    if (!pushSupported()) return false
    if (Notification.permission !== 'granted') return false
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return false
    const sub = await reg.pushManager.getSubscription()
    return !!sub
  } catch {
    return false
  }
}

// Reconciliação navegador × banco (achado 06/08 · caso Olímpio).
//
// O navegador guardar uma assinatura NÃO quer dizer que ela existe no banco —
// e é o banco que o /api/notify consulta pra saber pra onde mandar. Os dois
// descasam em dois caminhos reais:
//   1. o `subscribe()` funciona mas a RPC de salvar falha depois (rede/sessão);
//   2. o /api/notify APAGA a row quando o serviço de push devolve 404/410
//      (assinatura morta), e o aparelho continua com o objeto dele.
// Nos dois casos o resultado era o mesmo e mudo: a faixa via "já tem assinatura"
// e sumia pra sempre, enquanto nenhum push chegava. Ninguém ficava sabendo.
//
// Esta função reenvia a assinatura do aparelho pro banco. A RPC é idempotente
// (`on conflict (endpoint) do update`), então rodar à toa não custa nada nem
// duplica device. Best-effort: falhou, devolve false e a faixa continua o fluxo.
export async function syncPushSubscription(): Promise<boolean> {
  try {
    if (!pushSupported()) return false
    if (Notification.permission !== 'granted') return false
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (!sub) return false

    const json = sub.toJSON()
    if (!json.keys?.p256dh || !json.keys?.auth) return false

    const sb = createClient()
    const { error } = await sb.rpc('salvar_push_subscription', {
      p_endpoint: sub.endpoint,
      p_p256dh: json.keys.p256dh,
      p_auth: json.keys.auth,
      p_user_agent: navigator.userAgent.slice(0, 300),
    })
    return !error
  } catch {
    return false
  }
}

// Quantos aparelhos DESTE usuário estão registrados no banco (RLS já filtra por
// user_id = auth.uid()). Zero = essa pessoa não recebe notificação em lugar
// nenhum, só email — é o caso do Olímpio e do funcionário dele. Devolve null
// se não deu pra consultar (offline/sessão), pra quem chama não confundir
// "não sei" com "não tem".
export async function contarDevicesRegistrados(): Promise<number | null> {
  try {
    const sb = createClient()
    const { count, error } = await sb
      .from('push_subscriptions')
      .select('endpoint', { count: 'exact', head: true })
    if (error) return null
    return count ?? 0
  } catch {
    return null
  }
}

// Estado real deste aparelho, olhando os DOIS lados. Usado pela tela fixa de
// Notificações (Configurações), que precisa dizer a verdade pro dono — e não
// só "some quando parece ok", que era o comportamento da faixa.
export type PushDeviceState =
  | 'ativo'          // permissão dada, assinatura no aparelho E salva no banco
  | 'desligado'      // suporta, mas nunca ativou aqui
  | 'bloqueado'      // permissão negada — só o dono reativa nos ajustes do aparelho
  | 'ios-sem-app'    // iPhone no Safari: precisa instalar na tela de início antes
  | 'sem-suporte'

export async function pushDeviceState(): Promise<PushDeviceState> {
  if (typeof window === 'undefined') return 'sem-suporte'
  const ua = navigator.userAgent
  const isIOS = /iphone|ipad|ipod/i.test(ua)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true

  if (!pushSupported()) return isIOS && !isStandalone ? 'ios-sem-app' : 'sem-suporte'
  if (Notification.permission === 'denied') return 'bloqueado'
  if (Notification.permission !== 'granted') return 'desligado'

  // Permissão dada: só é "ativo" se a assinatura estiver TAMBÉM no banco. Como
  // a RPC é idempotente, garantir isso é mais barato (e mais honesto) do que
  // consultar e depois consertar.
  const ok = await syncPushSubscription()
  return ok ? 'ativo' : 'desligado'
}
