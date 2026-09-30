/**
 * GET /api/cron/fechar-dia — 20h de Brasília (vercel.json: 0 23 * * *)
 *
 * Push pra dona: "N atendimentos de hoje sem fechar. Quem veio?" → abre
 * /admin/fechar-dia. Ver o porquê na própria página.
 *
 * Escopo de começo (Eduardo, 29/09): só negócio com os avisos liberados.
 * É onde a pergunta "os avisos reduziram falta?" precisa de resposta, e
 * mantém o primeiro dia de push pequeno o bastante pra acompanhar. Liberar
 * pra todos é trocar o filtro — a página já serve a qualquer negócio.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendWebPush } from '@/lib/notify-push'
import { LIBERADOS, CANAL_LIBERADO } from '@/lib/mensagens/liberado'
import { todayBR } from '@/lib/date-br'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // ?dry=1 conta sem mandar push (teste sem tocar no celular de ninguém)
  const dry = new URL(req.url).searchParams.get('dry') === '1'
  const hoje = todayBR()
  const agora = new Date(Date.now() - 3 * 3600e3).toISOString().slice(11, 19)

  let qb = db.from('businesses').select('id, owner_id')
  if (!CANAL_LIBERADO) qb = qb.in('id', LIBERADOS)
  const { data: negocios } = await qb

  const feito: { negocio: string; abertos: number; pushes: number }[] = []
  for (const n of (negocios ?? []) as { id: string; owner_id: string | null }[]) {
    if (!n.owner_id) continue
    const { count } = await db
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', n.id)
      .eq('appointment_date', hoje)
      .in('status', ['pending', 'confirmed'])
      .lte('end_time', agora)
    const abertos = count ?? 0
    if (abertos === 0 || dry) { feito.push({ negocio: n.id, abertos, pushes: 0 }); continue }

    const { data: devices } = await db.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', n.owner_id)
    let pushes = 0
    for (const d of (devices ?? []) as { endpoint: string; p256dh: string; auth: string }[]) {
      const r = await sendWebPush(d, {
        titulo: 'Quem veio hoje?',
        corpo: abertos === 1
          ? '1 atendimento de hoje ainda sem fechar. Toque pra marcar se a cliente veio.'
          : `${abertos} atendimentos de hoje ainda sem fechar. Toque pra marcar quem veio e quem faltou.`,
        url: '/admin/fechar-dia',
      }).catch(() => ({ ok: false as const }))
      if (r.ok) pushes++
    }
    feito.push({ negocio: n.id, abertos, pushes })
  }

  return NextResponse.json({ ok: true, dry, dia: hoje, feito })
}
