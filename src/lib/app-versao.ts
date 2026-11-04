'use client'

/* ═══════════════════════════════════════════════════════════════
   VERSÃO DO APP · ORIGEM · PRESENÇA (04/11/2026)

   Eduardo, 04/11: o app instalado no iPhone ficou na versão antiga depois do
   deploy da Tela cheia, mesmo fechando e abrindo. "Ligar pra cliente pedindo
   reinstalar está fora de questão."

   Três peças, usadas pelo AtualizadorPWA:
   · versaoPublicada() — pergunta ao servidor qual build está no ar.
   · destinoOficial()  — app instalado num endereço que nunca recebe código
                         novo (prévia ou link fixo de deploy) → endereço oficial.
   · registrarPresenca() — cada aparelho conta, 1x a cada 30 min, em que versão,
                         endereço e modo ele está (tabela app_presenca, v185).
   ═══════════════════════════════════════════════════════════════ */

import { createClient } from '@/lib/supabase/client'

export const VERSAO_APP = process.env.NEXT_PUBLIC_APP_VERSAO ?? 'desconhecida'
export const COMMIT_APP = process.env.NEXT_PUBLIC_APP_COMMIT ?? 'local'
const AMBIENTE = process.env.NEXT_PUBLIC_APP_AMBIENTE ?? 'local'
const HOST_FIXO = process.env.NEXT_PUBLIC_APP_HOST_FIXO ?? ''

export const ORIGEM_OFICIAL = 'https://www.agendapro.net.br'

export type AreaApp = 'admin' | 'profissional' | 'recepcao'

export function modoInstalado(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

/** Build publicado agora. null = não deu pra saber (offline, erro) — quem
 *  chama NÃO trata como "versão diferente". */
export async function versaoPublicada(): Promise<string | null> {
  try {
    const r = await fetch('/api/versao', { cache: 'no-store', credentials: 'omit' })
    if (!r.ok) return null
    const j = (await r.json()) as { versao?: unknown }
    if (typeof j.versao !== 'string' || !j.versao || j.versao === 'desconhecida') return null
    return j.versao
  } catch {
    return null
  }
}

/* Quando tirar o app do endereço em que ele abriu.

   Só com o app INSTALADO (tela de início). Aba de navegador numa prévia é
   teste nosso e fica onde está.

   E só quando o endereço não vai receber código novo:
   · build que não é de produção (prévia de branch) — além de divergir do que
     está no ar, sai sem a chave de notificação;
   · o link FIXO do deploy (VERCEL_URL) — congela no dia em que foi instalado.

   Endereço de produção que acompanha os deploys (www, agendapro.net.br,
   agenda-pro-seven do desktop) fica: mudar a origem de um app instalado no
   iPhone tira ele do modo app e perde a notificação daquele ícone. */
export function destinoOficial(): string | null {
  if (typeof window === 'undefined') return null
  const host = window.location.host
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return null
  if (`https://${host}` === ORIGEM_OFICIAL) return null
  if (!modoInstalado()) return null

  const naoAcompanhaDeploy = AMBIENTE !== 'production' || (!!HOST_FIXO && host === HOST_FIXO)
  if (!naoAcompanhaDeploy) return null

  const { pathname, search, hash } = window.location
  const sep = search ? '&' : '?'
  return `${ORIGEM_OFICIAL}${pathname}${search}${sep}veio_de=${encodeURIComponent(host)}${hash}`
}

/* ── Presença ───────────────────────────────────────────────── */

const CHAVE_APARELHO = 'agendapro:aparelho'
const CHAVE_PRESENCA = 'agendapro:presenca'
const INTERVALO_MS = 30 * 60 * 1000

function idDoAparelho(): string {
  try {
    let id = localStorage.getItem(CHAVE_APARELHO)
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
      localStorage.setItem(CHAVE_APARELHO, id)
    }
    return id
  } catch {
    return 'sem-armazenamento'
  }
}

/** Versão do service worker que está controlando a página, lida do nome do
 *  cache (agendapro-static-vNNN) — não precisa mexer no sw.js. */
async function versaoDoSW(): Promise<string | null> {
  try {
    if (typeof caches === 'undefined') return null
    const chaves = await caches.keys()
    const c = chaves.find((k) => k.startsWith('agendapro-static-'))
    return c ? c.replace('agendapro-static-', '') : null
  } catch {
    return null
  }
}

/** Conta pro banco que este aparelho abriu o app. Best-effort, no máximo uma
 *  vez a cada 30 min (ou na hora, se a versão mudou). Nunca quebra a tela. */
export async function registrarPresenca(area: AreaApp): Promise<void> {
  try {
    if (process.env.NODE_ENV !== 'production') return
    const agora = Date.now()
    try {
      const ultimo = JSON.parse(localStorage.getItem(CHAVE_PRESENCA) ?? 'null') as
        | { v?: string; t?: number; a?: string }
        | null
      if (ultimo && ultimo.v === VERSAO_APP && ultimo.a === area && agora - (ultimo.t ?? 0) < INTERVALO_MS) return
    } catch {
      /* sem localStorage: registra mesmo assim */
    }

    let veioDe: string | null = null
    try {
      veioDe = new URLSearchParams(window.location.search).get('veio_de')
    } catch {
      veioDe = null
    }

    const sb = createClient()
    const { error } = await sb.rpc('registrar_presenca_app', {
      p_aparelho: idDoAparelho(),
      p_area: area,
      p_versao: VERSAO_APP,
      p_commit: COMMIT_APP,
      p_sw_versao: await versaoDoSW(),
      p_origem: window.location.origin,
      p_instalado: modoInstalado(),
      p_user_agent: navigator.userAgent.slice(0, 300),
      p_veio_de: veioDe,
    })
    /* Guarda a hora mesmo se deu erro (ex.: migration ainda não aplicada):
       sem isso cada volta ao app repetiria a chamada à toa. */
    void error
    try {
      localStorage.setItem(CHAVE_PRESENCA, JSON.stringify({ v: VERSAO_APP, t: agora, a: area }))
    } catch {
      /* ok */
    }
  } catch {
    /* presença nunca derruba o app */
  }
}
