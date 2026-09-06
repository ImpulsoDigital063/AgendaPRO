/**
 * GET  /api/admin/sumidos?dias=N  · lista quem não volta há mais de N dias
 * PUT  /api/admin/sumidos         · salva o texto do WhatsApp (só a dona)
 *
 * Pedido da Rosy Borges (06/09/2026, três áudios): o Reativar trava em 40 dias,
 * e no nicho dela (cílios) a manutenção é a cada 15–20. Quando o sistema
 * acusava, a cliente já tinha sumido de verdade. Ela também não queria
 * pesquisar nome por nome: "vai aparecer ela e todos que foram 20 dias atrás,
 * não só uma".
 *
 * Permission: GET é dono OU recepção (resolveBusinessIdOperacao, o mesmo gate
 * das outras rotas de operação). PUT é só dono — o texto é ajuste de negócio,
 * não operação de balcão. O business NUNCA vem do client.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveBusinessIdOperacao } from '@/lib/api-business-access'
import { checkRateLimit } from '@/lib/rate-limit-api'
import { todayBR, addDaysBR } from '@/lib/date-br'
import { SUMIDOS_TEMPLATE_PADRAO } from '@/lib/sumidos-template'

/** Os degraus que a tela oferece. Nada fora disso entra na query. */
export const DIAS_OPCOES = [15, 20, 25, 30, 40, 60] as const

/** 40 continua o default — é o que os outros 8 pagantes já conheciam. */
const DIAS_PADRAO = 40

/** Diferença em dias entre duas datas YYYY-MM-DD, sem fuso no meio.
 *  Ambas viram meia-noite UTC, então a subtração é exata. */
function diasEntre(de: string, ate: string): number {
  const a = Date.parse(de + 'T00:00:00Z')
  const b = Date.parse(ate + 'T00:00:00Z')
  return Math.round((b - a) / 86400000)
}

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'admin-sumidos', limit: 60, windowSeconds: 60 })
  if (rl) return rl

  const supabase = await createClient()
  const businessId = await resolveBusinessIdOperacao(supabase)
  if (!businessId) return NextResponse.json({ error: 'no_business' }, { status: 403 })

  const pedido = Number(req.nextUrl.searchParams.get('dias'))
  const dias = (DIAS_OPCOES as readonly number[]).includes(pedido) ? pedido : DIAS_PADRAO

  const { data: biz } = await supabase
    .from('businesses')
    .select('name, sumidos_template')
    .eq('id', businessId)
    .single()

  const negocio = biz?.name ?? ''
  const template = biz?.sumidos_template ?? SUMIDOS_TEMPLATE_PADRAO

  /* Mesma primitiva do Reativar: uma linha por cliente com a última data
     QUALQUER — inclui agendamento futuro e cancelado. Quem tem horário
     marcado à frente NÃO é sumido, e essa régua importa mais em 15 dias
     do que em 40. */
  const hoje = todayBR()
  const corte = addDaysBR(hoje, -dias)

  const { data: ultimos, error } = await supabase.rpc('ultimo_agendamento_clientes', {
    p_business_id: businessId,
  })
  if (error) return NextResponse.json({ error: 'rpc_failed' }, { status: 500 })

  const sumidos = new Map<string, string>()
  for (const r of ultimos ?? []) {
    const id = r.client_id as string | null
    const ultima = r.ultima as string | null
    if (id && ultima && ultima < corte) sumidos.set(id, ultima)
  }
  if (sumidos.size === 0) {
    return NextResponse.json({ dias, negocio, template, clientes: [] })
  }

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, phone')
    .in('id', Array.from(sumidos.keys()))

  const clientes = (clients ?? [])
    .map((c) => {
      const ultima = sumidos.get(c.id as string)!
      return {
        id: c.id as string,
        name: (c.name as string) ?? 'Sem nome',
        phone: (c.phone as string) ?? null,
        ultima,
        diasSem: diasEntre(ultima, hoje),
      }
    })
    // Quem sumiu há mais tempo primeiro — é quem está mais perto de virar perda.
    .sort((a, b) => b.diasSem - a.diasSem)

  return NextResponse.json({ dias, negocio, template, clientes })
}

export async function PUT(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'admin-sumidos-put', limit: 20, windowSeconds: 60 })
  if (rl) return rl

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no_auth' }, { status: 401 })

  // Só a dona edita o texto padrão. Recepção usa o que está salvo.
  const { data: biz } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!biz) return NextResponse.json({ error: 'only_owner' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const bruto = typeof body?.template === 'string' ? body.template.trim() : null
  if (bruto === null) return NextResponse.json({ error: 'bad_body' }, { status: 400 })
  if (bruto.length > 700) return NextResponse.json({ error: 'muito_longo' }, { status: 400 })

  // Vazio volta pro padrão do código em vez de gravar string vazia.
  const valor = bruto.length === 0 ? null : bruto

  const { error } = await supabase
    .from('businesses')
    .update({ sumidos_template: valor })
    .eq('id', biz.id)
  if (error) return NextResponse.json({ error: 'save_failed' }, { status: 500 })

  // λ.prova-na-fonte · devolve o que o banco realmente guardou
  const { data: depois } = await supabase
    .from('businesses')
    .select('sumidos_template')
    .eq('id', biz.id)
    .single()

  return NextResponse.json({
    ok: true,
    template: depois?.sumidos_template ?? SUMIDOS_TEMPLATE_PADRAO,
  })
}
