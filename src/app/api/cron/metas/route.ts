/**
 * GET /api/cron/metas?tipo=semana|bateu[&dry=1] — avisos da aba Metas (push).
 * Chamada pelo pg_cron (v186), segredo no Vault, igual v183.
 *
 *   semana · segunda 08:00 BRT: "Semana passada: R$ X · faltam R$ Z pra <mês>"
 *   bateu  · todo dia 21:00 BRT: "Bateu a meta!" (1x por mês, marca
 *            metas_mes.bateu_avisado_em)
 *
 * Só percorre negócios COM meta no mês: o custo de CPU cresce com quem usa,
 * não com a base. Faturamento pela régua do Hub (receitaDoPeriodo).
 * Push só pra dona (aparelhos com aviso ligado), abre /admin/metas.
 * ?dry=1 calcula e devolve sem mandar push nem gravar (teste).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendWebPush } from '@/lib/notify-push'
import { addDaysBR, todayBR } from '@/lib/date-br'
import { receitaDoPeriodo } from '@/lib/financeiro/resumo-do-periodo'
import { brl, faturadoDoMesSemCache, nomeMes } from '@/lib/metas/calculo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Linha = { id: string; business_id: string; valor: number; bateu_avisado_em: string | null; business: { owner_id: string | null } | { owner_id: string | null }[] | null }

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const url = new URL(req.url)
  const tipo = url.searchParams.get('tipo')
  if (tipo !== 'semana' && tipo !== 'bateu') return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })
  const dry = url.searchParams.get('dry') === '1'

  const db = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const hoje = todayBR()
  const ym = hoje.slice(0, 7)
  const mes = nomeMes(ym)

  let q = db.from('metas_mes').select('id, business_id, valor, bateu_avisado_em, business:businesses(owner_id)').eq('mes', `${ym}-01`)
  if (tipo === 'bateu') q = q.is('bateu_avisado_em', null)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const feito: { negocio: string; texto: string | null; pushes: number }[] = []
  for (const m of (data ?? []) as Linha[]) {
    const biz = Array.isArray(m.business) ? m.business[0] : m.business
    const owner = biz?.owner_id
    if (!owner) continue
    const meta = Number(m.valor)
    const faturado = await faturadoDoMesSemCache(db, m.business_id, ym, hoje)

    let titulo = ''
    let texto: string | null = null
    if (tipo === 'semana') {
      const semana = await receitaDoPeriodo(db, m.business_id, addDaysBR(hoje, -7), addDaysBR(hoje, -1))
      const faltam = Math.max(0, meta - faturado)
      titulo = 'Sua meta do mês'
      texto = faltam > 0
        ? `Semana passada: ${brl(semana.valorRecebido)} · faltam ${brl(faltam)} pra ${mes}`
        : `Semana passada: ${brl(semana.valorRecebido)} · meta de ${mes} batida`
    } else if (faturado >= meta) {
      titulo = 'Bateu a meta!'
      texto = `${mes.charAt(0).toUpperCase() + mes.slice(1)}: ${brl(faturado)} de ${brl(meta)}`
    }
    if (!texto) { feito.push({ negocio: m.business_id, texto: null, pushes: 0 }); continue }
    if (dry) { feito.push({ negocio: m.business_id, texto, pushes: 0 }); continue }

    const { data: devices } = await db.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', owner)
    let pushes = 0
    for (const d of (devices ?? []) as { endpoint: string; p256dh: string; auth: string }[]) {
      const r = await sendWebPush(d, { titulo, corpo: texto, url: '/admin/metas' })
      if (r.ok) pushes++
      else if (r.gone) await db.from('push_subscriptions').delete().eq('endpoint', d.endpoint)
    }
    // "bateu" é 1x por mês mesmo sem aparelho com aviso (a aba já comemora)
    if (tipo === 'bateu') await db.from('metas_mes').update({ bateu_avisado_em: new Date().toISOString() }).eq('id', m.id)
    feito.push({ negocio: m.business_id, texto, pushes })
  }
  return NextResponse.json({ ok: true, tipo, dry, hoje, total: feito.length, feito })
}
