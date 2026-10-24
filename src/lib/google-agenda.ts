/**
 * GOOGLE AGENDA (v175 · Ivna, 24/10/2026) — agendamento do AgendaPRO vira
 * evento no Google Agenda da dona. Um sentido só: o que ela mexer no Google
 * não volta pro sistema.
 *
 * Quem dispara é o gatilho do banco (v175) → /api/google-agenda/sync. Esta lib
 * só sabe falar com o Google e ler o agendamento; a rota decide quando.
 *
 * Idempotente de propósito: o id do evento é o id do agendamento sem hífens
 * (uuid em hex cabe no alfabeto base32hex que o Google aceita). Aviso em
 * dobro, reenvio da faxina, tudo cai no MESMO evento.
 *
 * Sem SDK do Google: são 4 chamadas REST, fetch resolve.
 */
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { GOOGLE_AGENDA_LIBERADOS } from '@/lib/feature-flags'

const ESCOPOS = ['openid', 'email', 'https://www.googleapis.com/auth/calendar.events']
const FUSO = 'America/Sao_Paulo'

export function googleAgendaLiberado(slug: string | null | undefined) {
  return !!slug && GOOGLE_AGENDA_LIBERADOS.includes(slug)
}

/* ── cofre do refresh token ─────────────────────────────────────────── */

function chave() {
  const k = Buffer.from(process.env.GOOGLE_AGENDA_CHAVE ?? '', 'base64')
  if (k.length !== 32) throw new Error('GOOGLE_AGENDA_CHAVE precisa ser 32 bytes em base64')
  return k
}

export function cifrar(texto: string) {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', chave(), iv)
  const corpo = Buffer.concat([c.update(texto, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), corpo].map((b) => b.toString('base64')).join('.')
}

export function decifrar(cifrado: string) {
  const [iv, tag, corpo] = cifrado.split('.').map((p) => Buffer.from(p, 'base64'))
  const d = createDecipheriv('aes-256-gcm', chave(), iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(corpo), d.final()]).toString('utf8')
}

/* ── state do OAuth: assinado, amarrado ao negócio e a quem clicou ──── */

const STATE_VALIDADE_MS = 10 * 60 * 1000

export function assinarState(businessId: string, userId: string) {
  const corpo = Buffer.from(JSON.stringify({ b: businessId, u: userId, t: Date.now() })).toString('base64url')
  const sig = createHmac('sha256', chave()).update(corpo).digest('base64url')
  return `${corpo}.${sig}`
}

export function conferirState(state: string, userId: string): string | null {
  const [corpo, sig] = state.split('.')
  if (!corpo || !sig) return null
  const esperado = createHmac('sha256', chave()).update(corpo).digest()
  const recebido = Buffer.from(sig, 'base64url')
  if (recebido.length !== esperado.length || !timingSafeEqual(recebido, esperado)) return null
  const { b, u, t } = JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8'))
  if (u !== userId || Date.now() - t > STATE_VALIDADE_MS) return null
  return b as string
}

/* ── OAuth ──────────────────────────────────────────────────────────── */

export function urlDeConsentimento(redirectUri: string, state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_AGENDA_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: ESCOPOS.join(' '),
    access_type: 'offline',
    // consent: garante refresh_token mesmo se ela já tiver conectado antes
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`
}

type Tokens = { access_token: string; refresh_token?: string; id_token?: string; scope?: string }

async function pedirToken(params: Record<string, string>): Promise<Tokens> {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_AGENDA_CLIENT_ID!,
      client_secret: process.env.GOOGLE_AGENDA_CLIENT_SECRET!,
      ...params,
    }),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new ErroGoogle(j.error ?? `token ${r.status}`, r.status)
  return j as Tokens
}

export async function trocarCodigo(code: string, redirectUri: string) {
  const t = await pedirToken({ code, redirect_uri: redirectUri, grant_type: 'authorization_code' })
  // e-mail só pra mostrar "conectado como ..." no painel (id_token veio do próprio Google por TLS)
  let email: string | null = null
  if (t.id_token) {
    try {
      email = JSON.parse(Buffer.from(t.id_token.split('.')[1], 'base64url').toString('utf8')).email ?? null
    } catch {}
  }
  const temAgenda = (t.scope ?? '').includes('calendar.events')
  return { refreshToken: t.refresh_token ?? null, email, temAgenda }
}

export async function revogar(refreshToken: string) {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
    method: 'POST',
  }).catch(() => {})
}

export class ErroGoogle extends Error {
  constructor(msg: string, public status: number) {
    super(msg)
  }
}

/* ── sincronizar um agendamento ─────────────────────────────────────── */

type Conexao = {
  business_id: string
  refresh_token_cifrado: string
  calendar_id: string
  professional_id: string | null
}

export const idDoEvento = (appointmentId: string) => appointmentId.replace(/-/g, '')

const PREFIXO: Record<string, string> = {
  pending: 'A confirmar · ',
  no_show: 'Faltou · ',
}

/**
 * Deixa o Google igual ao banco pra UM agendamento. Lê o estado atual (não
 * confia no aviso), então pode rodar quantas vezes for.
 * Retorna 'criado' | 'atualizado' | 'apagado' | 'sem-conexao'.
 */
export async function sincronizarAgendamento(db: SupabaseClient, businessId: string, appointmentId: string) {
  const { data: conexao } = await db
    .from('google_agenda_conexoes')
    .select('business_id, refresh_token_cifrado, calendar_id, professional_id')
    .eq('business_id', businessId)
    .maybeSingle<Conexao>()
  if (!conexao) return 'sem-conexao' as const

  try {
    const r = await aplicar(db, conexao, appointmentId)
    await db.from('google_agenda_eventos').upsert({
      appointment_id: appointmentId,
      business_id: businessId,
      sincronizado_em: new Date().toISOString(),
      erro: null,
      erro_em: null,
    })
    return r
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await db.from('google_agenda_eventos').upsert({
      appointment_id: appointmentId,
      business_id: businessId,
      erro: msg.slice(0, 500),
      erro_em: new Date().toISOString(),
    })
    // invalid_grant = ela tirou o acesso no Google: marca a conexão pro painel avisar
    if (e instanceof ErroGoogle && e.message === 'invalid_grant') {
      await db
        .from('google_agenda_conexoes')
        .update({ erro: 'acesso_revogado', erro_em: new Date().toISOString() })
        .eq('business_id', businessId)
    }
    throw e
  }
}

async function aplicar(db: SupabaseClient, conexao: Conexao, appointmentId: string) {
  const { access_token } = await pedirToken({
    refresh_token: decifrar(conexao.refresh_token_cifrado),
    grant_type: 'refresh_token',
  })
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(conexao.calendar_id)}/events`
  const eventId = idDoEvento(appointmentId)
  const auth = { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' }

  const { data: a } = await db
    .from('appointments')
    .select(
      'id, professional_id, client_name, client_phone, service_name, appointment_date, start_time, end_time, status, notes, professionals(name), appointment_services(service_name)',
    )
    .eq('id', appointmentId)
    .maybeSingle()

  const foraDoFiltro = !!a && !!conexao.professional_id && a.professional_id !== conexao.professional_id
  if (!a || a.status === 'cancelled' || foraDoFiltro) {
    const r = await fetch(`${base}/${eventId}`, { method: 'DELETE', headers: auth })
    // 404/410 = nunca existiu ou já apagado: é o estado que a gente quer
    if (!r.ok && r.status !== 404 && r.status !== 410) throw new ErroGoogle(`delete ${r.status}`, r.status)
    return 'apagado' as const
  }

  const prof = (a.professionals as unknown as { name?: string } | null)?.name ?? null
  const servicos = ((a.appointment_services as { service_name: string | null }[] | null) ?? [])
    .map((s) => s.service_name)
    .filter(Boolean)
  const descricao = [
    prof && `Profissional: ${prof}`,
    servicos.length ? `Serviços: ${servicos.join(', ')}` : a.service_name && `Serviço: ${a.service_name}`,
    a.client_phone && `WhatsApp: ${a.client_phone}`,
    a.notes && `Obs.: ${a.notes}`,
    '',
    'Marcado pelo AgendaPRO. Mudanças feitas aqui no Google não voltam pro sistema.',
  ]
    .filter((l) => l !== null && l !== undefined && l !== false)
    .join('\n')

  const evento = {
    id: eventId,
    summary: `${PREFIXO[a.status] ?? ''}${a.client_name}${a.service_name ? ` · ${a.service_name}` : ''}${prof && !conexao.professional_id ? ` (${prof.split(/\s+/)[0]})` : ''}`,
    description: descricao,
    start: { dateTime: `${a.appointment_date}T${String(a.start_time).slice(0, 8)}`, timeZone: FUSO },
    end: { dateTime: `${a.appointment_date}T${String(a.end_time).slice(0, 8)}`, timeZone: FUSO },
    // status explícito: um evento apagado antes (cancelou e remarcou) volta à vida no PUT
    status: 'confirmed',
  }

  const put = await fetch(`${base}/${eventId}`, { method: 'PUT', headers: auth, body: JSON.stringify(evento) })
  if (put.ok) return 'atualizado' as const
  if (put.status !== 404) throw new ErroGoogle(`update ${put.status}`, put.status)

  const post = await fetch(base, { method: 'POST', headers: auth, body: JSON.stringify(evento) })
  if (post.ok) return 'criado' as const
  // 409 = outro aviso criou no meio do caminho: o evento existe, tá certo
  if (post.status === 409) return 'atualizado' as const
  throw new ErroGoogle(`insert ${post.status}`, post.status)
}

/**
 * Manda pro Google todos os agendamentos de hoje em diante (ao conectar e ao
 * trocar o filtro de profissional). Sequencial em lotes pequenos pra não
 * esbarrar no limite de taxa do Google.
 */
export async function sincronizarFuturos(db: SupabaseClient, businessId: string, hoje: string) {
  const { data } = await db
    .from('appointments')
    .select('id')
    .eq('business_id', businessId)
    .gte('appointment_date', hoje)
    .neq('status', 'cancelled')
    .order('appointment_date')
    .limit(500)
  let ok = 0
  let falhas = 0
  const ids = (data ?? []).map((r) => r.id as string)
  for (let i = 0; i < ids.length; i += 4) {
    const lote = await Promise.allSettled(ids.slice(i, i + 4).map((id) => sincronizarAgendamento(db, businessId, id)))
    for (const r of lote) {
      if (r.status === 'fulfilled') ok++
      else falhas++
    }
  }
  return { total: ids.length, ok, falhas }
}
