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
