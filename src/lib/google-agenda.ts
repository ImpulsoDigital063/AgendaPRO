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
import { GOOGLE_AGENDA_BLOQUEIO_LIBERADOS, GOOGLE_AGENDA_LIBERADOS } from '@/lib/feature-flags'

const ESCOPOS = ['openid', 'email', 'https://www.googleapis.com/auth/calendar.events']
const FUSO = 'America/Sao_Paulo'

export function googleAgendaLiberado(slug: string | null | undefined) {
  return !!slug && GOOGLE_AGENDA_LIBERADOS.includes(slug)
}

/** A volta (v176, adicional pago): compromisso do Google bloqueia horário */
export function googleBloqueioLiberado(slug: string | null | undefined) {
  return !!slug && GOOGLE_AGENDA_BLOQUEIO_LIBERADOS.includes(slug)
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

async function tokenDeAcesso(refreshCifrado: string) {
  const { access_token } = await pedirToken({ refresh_token: decifrar(refreshCifrado), grant_type: 'refresh_token' })
  return access_token
}

/**
 * fetch na API da agenda com nova tentativa quando o Google segura por taxa
 * (403 rateLimitExceeded/userRateLimitExceeded ou 429). Acontece quando chegam
 * muitos avisos juntos, ex.: importação. Espera crescente com sorteio pra os
 * avisos simultâneos não baterem de novo no mesmo instante; cabe nos 15 s do
 * pg_net. Erro que sobra leva o motivo (ex.: "insert 403 rateLimitExceeded").
 */
async function chamarAgenda(url: string, init: RequestInit) {
  for (let tentativa = 0; ; tentativa++) {
    const r = await fetch(url, init)
    if (r.status !== 403 && r.status !== 429) return { r, motivo: '' }
    const j = await r.clone().json().catch(() => ({}))
    const motivo: string = j?.error?.errors?.[0]?.reason ?? ''
    const deTaxa = r.status === 429 || /rateLimit/i.test(motivo)
    if (!deTaxa || tentativa === 3) return { r, motivo }
    await new Promise((ok) => setTimeout(ok, 1000 * 2 ** tentativa + Math.random() * 1000))
  }
}

async function aplicar(db: SupabaseClient, conexao: Conexao, appointmentId: string) {
  const access_token = await tokenDeAcesso(conexao.refresh_token_cifrado)
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
    const { r, motivo } = await chamarAgenda(`${base}/${eventId}`, { method: 'DELETE', headers: auth })
    // 404/410 = nunca existiu ou já apagado: é o estado que a gente quer
    if (!r.ok && r.status !== 404 && r.status !== 410) throw new ErroGoogle(`delete ${r.status} ${motivo}`.trim(), r.status)
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
    // marca de origem: a volta (v176) ignora o que o próprio AgendaPRO criou
    extendedProperties: { private: { agendapro: '1' } },
  }

  const { r: put, motivo: mPut } = await chamarAgenda(`${base}/${eventId}`, {
    method: 'PUT',
    headers: auth,
    body: JSON.stringify(evento),
  })
  if (put.ok) return 'atualizado' as const
  if (put.status !== 404) throw new ErroGoogle(`update ${put.status} ${mPut}`.trim(), put.status)

  const { r: post, motivo: mPost } = await chamarAgenda(base, { method: 'POST', headers: auth, body: JSON.stringify(evento) })
  if (post.ok) return 'criado' as const
  // 409 = outro aviso criou no meio do caminho: o evento existe, tá certo
  if (post.status === 409) return 'atualizado' as const
  throw new ErroGoogle(`insert ${post.status} ${mPost}`.trim(), post.status)
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
  let enviados = 0
  let falhas = 0
  const ids = (data ?? []).map((r) => r.id as string)
  for (let i = 0; i < ids.length; i += 4) {
    const lote = await Promise.allSettled(ids.slice(i, i + 4).map((id) => sincronizarAgendamento(db, businessId, id)))
    for (const r of lote) {
      if (r.status === 'fulfilled') enviados++
      else falhas++
    }
  }
  return { total: ids.length, enviados, falhas }
}

/* ── A VOLTA (v176): compromisso do Google vira bloqueio ────────────── */

const JANELA_DIAS = 60
const TRAVA_MS = 2 * 60 * 1000
// a recepção e a equipe veem a grade: o título do compromisso é assunto dela
const MOTIVO = 'Ocupado (Google Agenda)'

export type EventoGoogle = {
  id: string
  status?: string
  transparency?: string
  eventType?: string
  start?: { date?: string; dateTime?: string }
  end?: { date?: string; dateTime?: string }
  attendees?: { self?: boolean; responseStatus?: string }[]
  extendedProperties?: { private?: Record<string, string> }
}

export type PedacoDeBloqueio = { chave: string; data: string; inicio: string; fim: string }

const DATA_HORA_BR = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** instante → { data 'YYYY-MM-DD', hora 'HH:MM:00' } no fuso de Brasília */
function noFusoBR(iso: string) {
  const p = Object.fromEntries(DATA_HORA_BR.formatToParts(new Date(iso)).map((x) => [x.type, x.value]))
  return { data: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}:00` }
}

function somarDia(data: string, n: number) {
  const d = new Date(`${data}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * Um evento do Google → os pedaços de bloqueio, um por dia (evento que vira a
 * noite ou de vários dias é cortado por dia, que é como business_blocks guarda).
 * Lista vazia = esse evento não bloqueia nada. Função pura (o E2E testa direto).
 */
export function eventoParaBloqueios(ev: EventoGoogle): PedacoDeBloqueio[] {
  if (ev.status === 'cancelled') return []
  // "Disponível" no Google = não ocupa (padrão de evento de dia inteiro e lembrete)
  if (ev.transparency === 'transparent') return []
  if (ev.eventType === 'workingLocation' || ev.eventType === 'birthday') return []
  // evento que o próprio AgendaPRO criou (ida, v175): já é agendamento aqui
  if (ev.extendedProperties?.private?.agendapro === '1' || /^[0-9a-f]{32}$/.test(ev.id)) return []
  if (ev.attendees?.some((a) => a.self && a.responseStatus === 'declined')) return []

  const pedacos: PedacoDeBloqueio[] = []
  const DIA_FIM = '23:59:00'

  if (ev.start?.date && ev.end?.date) {
    // dia inteiro: end.date é exclusivo
    for (let d = ev.start.date; d < ev.end.date && pedacos.length <= JANELA_DIAS; d = somarDia(d, 1)) {
      pedacos.push({ chave: `${ev.id}:${d}`, data: d, inicio: '00:00:00', fim: DIA_FIM })
    }
    return pedacos
  }
  if (!ev.start?.dateTime || !ev.end?.dateTime) return []

  const ini = noFusoBR(ev.start.dateTime)
  const fim = noFusoBR(ev.end.dateTime)
  for (let d = ini.data; d <= fim.data && pedacos.length <= JANELA_DIAS; d = somarDia(d, 1)) {
    const inicio = d === ini.data ? ini.hora : '00:00:00'
    const termino = d === fim.data ? fim.hora : DIA_FIM
    if (termino <= inicio) continue // termina 00:00 do dia seguinte: nada a bloquear nesse dia
    pedacos.push({ chave: `${ev.id}:${d}`, data: d, inicio, fim: termino })
  }
  return pedacos
}

async function listarEventos(accessToken: string, calendarId: string, de: string, ate: string) {
  const eventos: EventoGoogle[] = []
  let pageToken: string | undefined
  do {
    const p = new URLSearchParams({
      timeMin: `${de}T00:00:00-03:00`,
      timeMax: `${ate}T23:59:59-03:00`,
      singleEvents: 'true',
      showDeleted: 'false',
      maxResults: '2500',
      fields:
        'nextPageToken,items(id,status,transparency,eventType,start,end,attendees(self,responseStatus),extendedProperties)',
    })
    if (pageToken) p.set('pageToken', pageToken)
    const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${p}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!r.ok) throw new ErroGoogle(`list ${r.status}`, r.status)
    const j = await r.json()
    eventos.push(...((j.items ?? []) as EventoGoogle[]))
    pageToken = j.nextPageToken
  } while (pageToken)
  return eventos
}

/**
 * Deixa os bloqueios vindos do Google iguais à agenda dela, de hoje até
 * +60 dias. Lê a janela inteira e reconcilia (insere, ajusta, apaga): sem
 * syncToken, sem estado pra corromper.
 *
 * forcar=false respeita a trava de 2 min (o link público chama a cada troca
 * de dia; não pode virar uma leitura do Google por clique). A trava é tomada
 * no próprio UPDATE, então duas chamadas juntas não leem duas vezes.
 * Retorna null quando não leu (volta desligada, trava, acesso revogado).
 */
export async function puxarDoGoogle(db: SupabaseClient, businessId: string, hoje: string, forcar = false) {
  let q = db
    .from('google_agenda_conexoes')
    .update({ puxado_em: new Date().toISOString() })
    .eq('business_id', businessId)
    .not('bloqueio_professional_id', 'is', null)
    .is('erro', null)
  if (!forcar) q = q.or(`puxado_em.is.null,puxado_em.lt.${new Date(Date.now() - TRAVA_MS).toISOString()}`)
  const { data: conexao } = await q.select('refresh_token_cifrado, calendar_id, bloqueio_professional_id').maybeSingle()
  if (!conexao) return null

  const ate = somarDia(hoje, JANELA_DIAS)
  let eventos: EventoGoogle[]
  try {
    eventos = await listarEventos(await tokenDeAcesso(conexao.refresh_token_cifrado), conexao.calendar_id, hoje, ate)
  } catch (e) {
    if (e instanceof ErroGoogle && e.message === 'invalid_grant') {
      await db
        .from('google_agenda_conexoes')
        .update({ erro: 'acesso_revogado', erro_em: new Date().toISOString() })
        .eq('business_id', businessId)
    }
    throw e
  }

  const desejados = new Map<string, PedacoDeBloqueio>()
  for (const ev of eventos) {
    for (const p of eventoParaBloqueios(ev)) if (p.data >= hoje && p.data <= ate) desejados.set(p.chave, p)
  }

  const { data: atuais } = await db
    .from('business_blocks')
    .select('id, google_event_id, professional_id, block_date, start_time, end_time')
    .eq('business_id', businessId)
    .not('google_event_id', 'is', null)
  const prof = conexao.bloqueio_professional_id as string

  const apagar: string[] = []
  const vistos = new Set<string>()
  let ajustados = 0
  for (const b of atuais ?? []) {
    const d = desejados.get(b.google_event_id as string)
    if (!d) {
      apagar.push(b.id as string)
      continue
    }
    vistos.add(d.chave)
    const igual =
      b.professional_id === prof &&
      b.block_date === d.data &&
      String(b.start_time).slice(0, 8) === d.inicio &&
      String(b.end_time).slice(0, 8) === d.fim
    if (!igual) {
      await db
        .from('business_blocks')
        .update({ professional_id: prof, block_date: d.data, start_time: d.inicio, end_time: d.fim, active: true })
        .eq('id', b.id)
      ajustados++
    }
  }
  if (apagar.length) await db.from('business_blocks').delete().in('id', apagar)

  const novos = [...desejados.values()]
    .filter((d) => !vistos.has(d.chave))
    .map((d) => ({
      business_id: businessId,
      professional_id: prof,
      block_type: 'specific',
      block_date: d.data,
      start_time: d.inicio,
      end_time: d.fim,
      reason: MOTIVO,
      google_event_id: d.chave,
    }))
  if (novos.length) {
    const { error } = await db.from('business_blocks').insert(novos)
    if (error) throw new Error(`inserir bloqueios: ${error.message}`)
  }
  return { eventos: eventos.length, novos: novos.length, ajustados, apagados: apagar.length }
}

/** Some com todos os bloqueios vindos do Google (desligar a volta ou desconectar) */
export async function apagarBloqueiosDoGoogle(db: SupabaseClient, businessId: string) {
  await db.from('business_blocks').delete().eq('business_id', businessId).not('google_event_id', 'is', null)
}
