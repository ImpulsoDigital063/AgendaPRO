import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NICHE_FICHAS } from '@/lib/fichas/registry'
import { faltaParaAssinar, hashToken, soCamposDaFicha, tokenValido } from '@/lib/fichas/convite'
import { subirImagensDaFicha } from '@/lib/fichas/salvar-imagens'
import { carimbar, acharCpf, acharNome } from '@/lib/ficha-assinatura'
import { sendWebPush } from '@/lib/notify-push'

/* ROTA PÚBLICA (v157) · a cliente envia a ficha que preencheu no celular.
   Sem login: quem prova o direito é o token do link. Tudo confere no
   servidor — ficha certa, campos declarados, assinatura presente — porque o
   navegador de quem abriu o link não é confiável. */

function getAdmin() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!tokenValido(token)) return NextResponse.json({ error: 'link_invalido' }, { status: 404 })
  const admin = getAdmin()

  const { data: conv } = await admin
    .from('ficha_convites')
    .select('id, business_id, customer_id, niche_slug, expires_at, used_at, cancelado_em')
    .eq('token_hash', hashToken(token))
    .maybeSingle()
  if (!conv) return NextResponse.json({ error: 'link_invalido' }, { status: 404 })
  if (conv.used_at) return NextResponse.json({ error: 'ja_enviada' }, { status: 410 })
  if (conv.cancelado_em || new Date(conv.expires_at) < new Date()) return NextResponse.json({ error: 'link_expirado' }, { status: 410 })

  const ficha = NICHE_FICHAS[conv.niche_slug]
  if (!ficha?.clientePreenche) return NextResponse.json({ error: 'link_invalido' }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (!body?.values || typeof body.values !== 'object') return NextResponse.json({ error: 'invalid_values' }, { status: 400 })
  const limpos = soCamposDaFicha(ficha, body.values as Record<string, unknown>)
  const falta = faltaParaAssinar(ficha, limpos)
  if (falta.length) return NextResponse.json({ error: 'falta_assinar', falta }, { status: 400 })

  /* Reserva o link ANTES de gravar: update condicional é atômico, então dois
     envios ao mesmo tempo (toque duplo, rede lenta) não geram duas fichas. */
  const { data: reservado } = await admin
    .from('ficha_convites')
    .update({ used_at: new Date().toISOString() })
    .eq('id', conv.id)
    .is('used_at', null)
    .select('id')
  if (!reservado?.length) return NextResponse.json({ error: 'ja_enviada' }, { status: 410 })
  const liberar = () => admin.from('ficha_convites').update({ used_at: null }).eq('id', conv.id)

  const subida = await subirImagensDaFicha(admin, conv.business_id, conv.customer_id, limpos)
  if (subida.erro) { await liberar(); return NextResponse.json({ error: 'falha_ao_salvar' }, { status: 500 }) }
  const values = subida.values

  const carimbo = carimbar({
    conteudo: values,
    businessId: conv.business_id,
    customerId: conv.customer_id,
    assinanteNome: acharNome(values),
    assinanteCpf: acharCpf(values),
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    dispositivo: request.headers.get('user-agent'),
  })
  const { data: ins, error } = await admin.from('client_form_responses').insert({
    business_id: conv.business_id,
    customer_id: conv.customer_id,
    template_id: null,
    niche_slug: conv.niche_slug,
    data: values,
    // null = preenchida pela própria cliente, pelo link (não há usuário do painel)
    filled_by_user_id: null,
    ...carimbo,
  }).select('id').single()
  if (error || !ins) { await liberar(); return NextResponse.json({ error: 'falha_ao_salvar' }, { status: 500 }) }
  await admin.from('ficha_convites').update({ response_id: ins.id }).eq('id', conv.id)

  /* Aviso pra dona. AWAIT obrigatório: a Vercel congela a invocação quando a
     resposta sai (mesma lição do claim-review). Falha aqui não desfaz nada. */
  try {
    const [{ data: biz }, { data: cust }] = await Promise.all([
      admin.from('businesses').select('owner_id').eq('id', conv.business_id).maybeSingle(),
      admin.from('customers').select('name').eq('id', conv.customer_id).maybeSingle(),
    ])
    if (biz?.owner_id) {
      const { data: devices } = await admin.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', biz.owner_id)
      const mortas: string[] = []
      for (const d of devices ?? []) {
        const r = await sendWebPush(
          { endpoint: d.endpoint as string, p256dh: d.p256dh as string, auth: d.auth as string },
          { titulo: 'Ficha preenchida pela cliente', corpo: `${cust?.name || 'Uma cliente'} preencheu e assinou: ${ficha.name}.`, url: '/admin/clientes' },
        )
        if (r.gone) mortas.push(d.endpoint as string)
      }
      if (mortas.length) await admin.from('push_subscriptions').delete().in('endpoint', mortas)
    }
  } catch { /* aviso é extra */ }

  return NextResponse.json({ ok: true })
}
