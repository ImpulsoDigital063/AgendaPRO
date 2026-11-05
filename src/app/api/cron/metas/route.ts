/**
 * GET /api/cron/metas?tipo=diario|bateu[&dry=1[&hoje=AAAA-MM-DD]] — avisos da aba Metas (push).
 * Chamada pelo pg_cron (v187; v186 criou o "bateu"), segredo no Vault.
 *
 *   diario · todo dia 08:00 BRT: decide UM aviso por negócio (lib/metas/avisos):
 *            bateu > fechamento (dia 1) > quase lá (≥90%) > reta final (≤3 dias)
 *            > ritmo (dia 15) > sem meta (dia 3) > semana (segunda)
 *   bateu  · todo dia 21:00 BRT: só "Bateu a meta!" (1x por mês, marca
 *            metas_mes.bateu_avisado_em). Se ela já recebeu um aviso de Metas
 *            hoje, fica pro diário da manhã seguinte (1 por dia).
 *   semana · apelido de diario (o job antigo da v186 caía aqui).
 *
 * 1 por dia: metas_avisos_log tem unique (business_id, dia). A linha é
 * gravada ANTES do push (reserva): duas execuções ao mesmo tempo não mandam 2.
 * Desligado (businesses.metas_avisos = false): não manda nada.
 * Sem aparelho com aviso ligado: não manda nem grava (só o "bateu" marca o mês).
 * Push só pra dona, abre /admin/metas (fechamento/sem meta abrem a tela de definir).
 *
 * ?dry=1 calcula e devolve sem mandar push nem gravar. Só no dry, ?hoje=
 * simula a data (teste das regras contra dados reais, só leitura).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'
import { sendWebPush } from '@/lib/notify-push'
import { addDaysBR, addMonthsBR, todayBR } from '@/lib/date-br'
import { receitaDoPeriodo } from '@/lib/financeiro/resumo-do-periodo'
import { agendaRestanteSemCache, faturadoDoMesSemCache, nomeMes } from '@/lib/metas/calculo'
import { escolherAcao } from '@/lib/metas/acao'
import { nichoMetas } from '@/lib/metas/nichos'
import { resolveCategoria } from '@/lib/segmento'
import { decidirAviso, diasDoMes, type TipoAviso } from '@/lib/metas/avisos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Negocio = { id: string; name: string; owner_id: string | null; category: string | null; description: string | null; metas_avisos?: boolean }
type Meta = { id: string; business_id: string; valor: number; ticket_medio: number | null; bateu_avisado_em: string | null }
type Device = { endpoint: string; p256dh: string; auth: string }

const YMD = /^\d{4}-\d{2}-\d{2}$/

/** Clientes sem voltar há mais de `diasSumido` (mesma conta da RPC
 *  ultimo_agendamento_clientes da tela, que exige sessão de usuário). */
async function contarSumidos(db: SupabaseClient, businessId: string, corte: string): Promise<number> {
  const ultima = new Map<string, string>()
  for (let de = 0; de < 50_000; de += 1000) {
    const { data, error } = await db.from('appointments').select('client_id, appointment_date')
      .eq('business_id', businessId).not('client_id', 'is', null).order('id').range(de, de + 999)
    if (error) throw new Error(error.message)
    for (const a of (data ?? []) as { client_id: string; appointment_date: string }[]) {
      const u = ultima.get(a.client_id)
      if (!u || a.appointment_date > u) ultima.set(a.client_id, a.appointment_date)
    }
    if (!data || data.length < 1000) break
  }
  let n = 0
  for (const d of ultima.values()) if (d < corte) n++
  return n
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const url = new URL(req.url)
  const tipoParam = url.searchParams.get('tipo')
  const modo = tipoParam === 'bateu' ? 'bateu' : tipoParam === 'diario' || tipoParam === 'semana' ? 'diario' : null
  if (!modo) return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })
  const dry = url.searchParams.get('dry') === '1'
  const hojeParam = url.searchParams.get('hoje')
  if (hojeParam && (!dry || !YMD.test(hojeParam))) return NextResponse.json({ error: 'hoje só no dry, AAAA-MM-DD' }, { status: 400 })

  const db = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const hoje = hojeParam ?? todayBR()
  const ym = hoje.slice(0, 7)
  const ymAnt = addMonthsBR(`${ym}-01`, -1).slice(0, 7)
  const dia = Number(hoje.slice(8, 10))

  // ─── Quem pode receber hoje ──────────────────────────────────────
  let qMeta = db.from('metas_mes').select('id, business_id, valor, ticket_medio, bateu_avisado_em').eq('mes', `${ym}-01`)
  if (modo === 'bateu') qMeta = qMeta.is('bateu_avisado_em', null)
  const { data: metasData, error: e1 } = await qMeta
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })
  const metas = new Map(((metasData ?? []) as Meta[]).map((m) => [m.business_id, m]))
  const ids = new Set(metas.keys())

  const metasAnt = new Map<string, number>()
  if (modo === 'diario' && dia === 1) {
    const { data } = await db.from('metas_mes').select('business_id, valor').eq('mes', `${ymAnt}-01`)
    for (const m of (data ?? []) as { business_id: string; valor: number }[]) { metasAnt.set(m.business_id, Number(m.valor)); ids.add(m.business_id) }
  }
  if (modo === 'diario' && dia === 3) {
    // negócio ativo = assinatura active (sem meta: o lembrete é só pra quem usa o sistema)
    const { data } = await db.from('subscriptions').select('business_id').eq('status', 'active')
    for (const s of (data ?? []) as { business_id: string }[]) ids.add(s.business_id)
  }
  if (ids.size === 0) return NextResponse.json({ ok: true, modo, dry, hoje, total: 0, feito: [] })

  // businesses.metas_avisos nasce na v187: antes dela (dry contra produção) vale "ligado"
  const lista = Array.from(ids)
  let negocios: Negocio[] = []
  {
    const r = await db.from('businesses').select('id, name, owner_id, category, description, metas_avisos').in('id', lista)
    if (r.error && dry) {
      const r2 = await db.from('businesses').select('id, name, owner_id, category, description').in('id', lista)
      if (r2.error) return NextResponse.json({ error: r2.error.message }, { status: 500 })
      negocios = (r2.data ?? []) as Negocio[]
    } else if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
    else negocios = (r.data ?? []) as Negocio[]
  }

  // log do mês (1x por mês e 1 por dia)
  const inicioMes = `${ym}-01`
  const log = new Map<string, { hoje: boolean; tipos: Set<TipoAviso> }>()
  {
    const r = await db.from('metas_avisos_log').select('business_id, dia, tipo').in('business_id', lista).gte('dia', inicioMes).lte('dia', hoje)
    if (r.error && !dry) return NextResponse.json({ error: r.error.message }, { status: 500 })
    for (const l of (r.data ?? []) as { business_id: string; dia: string; tipo: TipoAviso }[]) {
      const e = log.get(l.business_id) ?? { hoje: false, tipos: new Set<TipoAviso>() }
      e.tipos.add(l.tipo)
      if (l.dia === hoje) e.hoje = true
      log.set(l.business_id, e)
    }
  }

  const feito: { negocio: string; nome: string; tipo: TipoAviso | null; titulo?: string; texto: string | null; url?: string; aparelhos: number; pushes: number; motivo?: string }[] = []
  for (const n of negocios) {
    const meta = metas.get(n.id) ?? null
    const base = { negocio: n.id, nome: n.name, aparelhos: 0, pushes: 0 }
    if (!n.owner_id) { feito.push({ ...base, tipo: null, texto: null, motivo: 'sem dona' }); continue }
    if (n.metas_avisos === false) { feito.push({ ...base, tipo: null, texto: null, motivo: 'avisos de Metas desligados' }); continue }
    const lg = log.get(n.id)
    if (lg?.hoje) { feito.push({ ...base, tipo: null, texto: null, motivo: 'já recebeu aviso de Metas hoje' }); continue }

    const { data: devs } = await db.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', n.owner_id)
    const devices = (devs ?? []) as Device[]
    // sem meta e sem aparelho: o lembrete do dia 3 nem é calculado
    if (!meta && !metasAnt.has(n.id) && devices.length === 0) continue

    const nicho = nichoMetas(resolveCategoria(n))
    let agendaMemo: Awaited<ReturnType<typeof agendaRestanteSemCache>> | undefined
    const agenda = async () => (agendaMemo ??= await agendaRestanteSemCache(db, n.id, hoje))

    let aviso
    try {
      aviso = await decidirAviso({
        hoje,
        modo,
        meta: meta ? { valor: Number(meta.valor), ticket: meta.ticket_medio ? Number(meta.ticket_medio) : null, bateuAvisado: !!meta.bateu_avisado_em } : null,
        jaNoMes: lg?.tipos ?? new Set(),
        faturado: () => faturadoDoMesSemCache(db, n.id, ym, hoje),
        dias: async () => diasDoMes(hoje, await agenda()),
        mesAnterior: async () => {
          const v = metasAnt.get(n.id)
          return v ? { valor: v, faturado: await faturadoDoMesSemCache(db, n.id, ymAnt, hoje) } : null
        },
        semana: async () => (await receitaDoPeriodo(db, n.id, addDaysBR(hoje, -7), addDaysBR(hoje, -1))).valorRecebido,
        acao: async () => {
          const a = await agenda()
          const corte = addDaysBR(hoje, -nicho.diasSumido)
          const sumidos = await contarSumidos(db, n.id, corte).catch(() => null)
          return escolherAcao({ amanha: addDaysBR(hoje, 1), bateu: false, proximoMesSemMeta: null, proximoDia: a.proximoDia, sumidos, nicho })
        },
      })
    } catch (err) {
      feito.push({ ...base, tipo: null, texto: null, motivo: `erro: ${err instanceof Error ? err.message : String(err)}` })
      continue
    }
    if (!aviso) { feito.push({ ...base, aparelhos: devices.length, tipo: null, texto: null, motivo: 'nenhuma regra hoje' }); continue }
    const linha = { ...base, aparelhos: devices.length, tipo: aviso.tipo, titulo: aviso.titulo, texto: aviso.corpo, url: aviso.url }
    if (devices.length === 0 && aviso.tipo !== 'bateu') { feito.push({ ...linha, motivo: 'sem aparelho com aviso ligado' }); continue }
    if (dry) { feito.push(linha); continue }

    // reserva o dia (unique business_id + dia) ANTES de mandar
    const { data: reserva, error: eRes } = await db.from('metas_avisos_log')
      .insert({ business_id: n.id, dia: hoje, tipo: aviso.tipo, titulo: aviso.titulo, corpo: aviso.corpo, url: aviso.url })
      .select('id').maybeSingle()
    if (eRes || !reserva) { feito.push({ ...linha, motivo: eRes?.code === '23505' ? 'já recebeu aviso de Metas hoje' : `log: ${eRes?.message}` }); continue }

    let pushes = 0
    for (const d of devices) {
      const r = await sendWebPush(d, { titulo: aviso.titulo, corpo: aviso.corpo, url: aviso.url })
      if (r.ok) pushes++
      else if (r.gone) await db.from('push_subscriptions').delete().eq('endpoint', d.endpoint)
    }
    await db.from('metas_avisos_log').update({ aparelhos: pushes }).eq('id', reserva.id)
    // "bateu" é 1x por mês mesmo sem aparelho (a aba já comemora)
    if (aviso.tipo === 'bateu' && meta) await db.from('metas_mes').update({ bateu_avisado_em: new Date().toISOString() }).eq('id', meta.id)
    feito.push({ ...linha, pushes })
  }
  return NextResponse.json({ ok: true, modo, dry, hoje, mes: nomeMes(ym), total: feito.length, feito })
}
