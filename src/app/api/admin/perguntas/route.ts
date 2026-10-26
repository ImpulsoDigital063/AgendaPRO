import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getAdminAccess } from '@/lib/admin-data'
import { PERGUNTA_POR_ID } from '@/lib/perguntas/catalogo'
import { AREA_DO_GRUPO } from '@/lib/perguntas/areas'
import { responder } from '@/lib/perguntas/responder'

/**
 * POST /api/admin/perguntas · "Pergunte ao seu negócio" (21/10/2026)
 * { id, periodo?, profissionalId?, dias?, texto?, origem? }  → resposta
 * { naoEntendeu: true, texto }                               → só registra
 *
 * Sem IA: a pergunta já chega escolhida (botão ou busca por palavra-chave
 * no navegador). Gerente com a área bloqueada não vê a resposta.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const acesso = await getAdminAccess(user.id)
  if (!acesso) return NextResponse.json({ error: 'business_not_found' }, { status: 404 })

  const body = (await req.json().catch(() => ({}))) as {
    id?: string; periodo?: string; profissionalId?: string; dias?: number; texto?: string; origem?: string; naoEntendeu?: boolean; atalhoId?: string
  }
  const texto = typeof body.texto === 'string' ? body.texto.slice(0, 300) : null
  const origem = body.origem === 'busca' ? 'busca' : 'botao'

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const registrar = (pergunta_id: string | null, entendeu: boolean) =>
    sb.from('perguntas_log').insert({ business_id: acesso.businessId, pergunta_id, texto, entendeu, origem, periodo: body.periodo ?? null })

  if (body.naoEntendeu) {
    await registrar(null, false)
    return NextResponse.json({ ok: true })
  }
  // Atalho "como faço" (26/10): só registra, a tela já sabe pra onde levar.
  if (typeof body.atalhoId === 'string' && /^[a-z_]{1,40}$/.test(body.atalhoId)) {
    await registrar(`atalho:${body.atalhoId}`, true)
    return NextResponse.json({ ok: true })
  }

  const def = body.id ? PERGUNTA_POR_ID[body.id] : null
  if (!def) return NextResponse.json({ error: 'Pergunta não encontrada.' }, { status: 400 })
  const area = AREA_DO_GRUPO[def.grupo]
  if (area && acesso.bloqueadas.includes(area)) {
    return NextResponse.json({ error: 'Essa pergunta é de uma área que não está liberada pra você.' }, { status: 403 })
  }

  // O profissional precisa ser deste negócio (o id vem do navegador).
  let profissionalId: string | null = null
  if (body.profissionalId) {
    const { data: prof } = await sb.from('professionals').select('id').eq('id', body.profissionalId).eq('business_id', acesso.businessId).maybeSingle()
    profissionalId = prof?.id ?? null
  }

  const { data: negocio } = await sb
    .from('businesses')
    .select('id, comissao_no_fluxo, comissao_paga_no_atendimento')
    .eq('id', acesso.businessId)
    .single()
  if (!negocio) return NextResponse.json({ error: 'business_not_found' }, { status: 404 })

  const dias = Number.isFinite(Number(body.dias)) ? Number(body.dias) : null
  // Responde com o login da pessoa (RLS), igual às telas: as funções de
  // cliente (resumo_clientes, ultimo_agendamento_clientes) só respondem a
  // quem tem acesso ao negócio. A chave do servidor fica só pro registro.
  const resposta = await responder(supabase, negocio, { id: def.id, periodo: body.periodo ?? null, profissionalId, dias })
  await registrar(def.id, true)
  if (!resposta) return NextResponse.json({ error: 'Não consegui responder agora.' }, { status: 500 })
  return NextResponse.json({ resposta }, { headers: { 'Cache-Control': 'no-store' } })
}
