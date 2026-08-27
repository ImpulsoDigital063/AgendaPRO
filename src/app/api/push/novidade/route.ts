import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendWebPush } from '@/lib/notify-push'

// POST /api/push/novidade — avisa a base quando sobe melhoria no sistema
// (pedido do Eduardo, 06/08). Manda pros aparelhos JÁ registrados em
// push_subscriptions: donos, profissionais e recepção. Nunca cliente final —
// cliente não tem device nessa tabela.
//
// Fechada com Bearer CRON_SECRET, o mesmo do /api/cron/monitor: é disparo
// manual nosso, não pode ficar aberta pra internet mandar notificação em nome
// do AgendaPRO. Disparo: `node scripts/_push-novidade.mjs "titulo" "texto"`.
//
// `dry_run: true` devolve quantos aparelhos receberiam, sem mandar nada — use
// SEMPRE antes do disparo real pra ver o alcance.
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'nao_autorizado' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    titulo?: string
    corpo?: string
    url?: string
    dry_run?: boolean
    somenteSinal?: boolean
    slug?: string
  }
  const titulo = body.titulo?.trim()
  const corpo = body.corpo?.trim()
  if (!titulo || !corpo) {
    return NextResponse.json({ error: 'titulo_e_corpo_obrigatorios' }, { status: 400 })
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: todas, error } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, user_id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  /* `somenteSinal` · novidade sobre sinal não interessa a quem não cobra sinal.
     Sem esta mira, um aviso que vale pra 4 negócios chegaria no celular dos
     ~29 — e notificação irrelevante ensina a pessoa a ignorar as próximas,
     inclusive as que importam de verdade (a de sinal pra vencer).
     O alcance sai de: dono do negócio + profissionais com login. */
  let subs = todas ?? []

  /* `slug` · manda pra UM negócio só. Serve pra ver como a notificação chega
     antes de disparar pra base — texto de push não tem desfazer: chegou no
     celular de 16 pessoas, chegou. Eduardo pediu isso em 27/08 depois de a
     primeira versão chegar cortada no iPhone dele. */
  if (body.slug) {
    const { data: alvo } = await admin
      .from('businesses')
      .select('id, owner_id')
      .eq('slug', body.slug)
      .maybeSingle()
    if (!alvo) return NextResponse.json({ error: 'negocio_nao_encontrado' }, { status: 404 })
    const { data: profs } = await admin
      .from('professionals')
      .select('auth_user_id')
      .eq('business_id', alvo.id)
    const permitidos = new Set(
      [alvo.owner_id as string | null, ...(profs ?? []).map((p) => p.auth_user_id)].filter(
        Boolean,
      ) as string[],
    )
    subs = subs.filter((s: { user_id: string }) => permitidos.has(s.user_id))
  }

  if (body.somenteSinal) {
    const { data: negocios } = await admin
      .from('businesses')
      .select('id, owner_id')
      .eq('sinal_enabled', true)
    const ids = (negocios ?? []).map((n) => n.id as string)
    const { data: profs } = ids.length
      ? await admin.from('professionals').select('auth_user_id').in('business_id', ids)
      : { data: [] as { auth_user_id: string | null }[] }
    const permitidos = new Set(
      [
        ...(negocios ?? []).map((n) => n.owner_id as string | null),
        ...(profs ?? []).map((p) => p.auth_user_id),
      ].filter(Boolean) as string[],
    )
    subs = subs.filter((s: { user_id: string }) => permitidos.has(s.user_id))
  }

  const devices = subs?.length ?? 0
  const pessoas = new Set((subs ?? []).map((s: { user_id: string }) => s.user_id)).size

  if (body.dry_run) return NextResponse.json({ dry_run: true, somenteSinal: !!body.somenteSinal, devices, pessoas })
  if (!subs || subs.length === 0) return NextResponse.json({ enviados: 0, devices: 0, pessoas: 0 })

  const results = await Promise.all(
    subs.map((s: { endpoint: string; p256dh: string; auth: string }) =>
      sendWebPush(s, { titulo, corpo, url: body.url ?? '/admin' })
    )
  )

  const mortas = subs.filter((_, i) => results[i]?.gone).map((s) => s.endpoint)
  if (mortas.length > 0) await admin.from('push_subscriptions').delete().in('endpoint', mortas)

  return NextResponse.json({
    enviados: results.filter((r) => r?.ok).length,
    devices,
    pessoas,
    removidos: mortas.length,
  })
}
