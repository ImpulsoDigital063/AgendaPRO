/**
 * GET /api/admin/sumidos?dias=N · lista quem não volta há mais de N dias.
 *
 * O texto/cupom/link NÃO vive aqui: a aba reusa o sistema que já existe —
 * templates por nicho de coupon-templates.ts + POST /api/admin/coupons/campaign
 * (que agora aceita `dias`). Não reinventar (Eduardo, 06/09).
 *
 * Pedido da Rosy Borges (06/09/2026, três áudios): o Reativar trava em 40 dias,
 * e no nicho dela (cílios) a manutenção é a cada 15–20. Quando o sistema
 * acusava, a cliente já tinha sumido de verdade. Ela também não queria
 * pesquisar nome por nome: "vai aparecer ela e todos que foram 20 dias atrás,
 * não só uma".
 *
 * Permission: dono OU recepção (resolveBusinessIdOperacao, o mesmo gate das
 * outras rotas de operação). O business NUNCA vem do client.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveBusinessIdOperacao } from '@/lib/api-business-access'
import { checkRateLimit } from '@/lib/rate-limit-api'
import { todayBR } from '@/lib/date-br'

/* FAIXAS FECHADAS (Eduardo, 06/09). Cada botao mostra o SEU pedaco, nao um
   acumulado: 15 traz de 15 a 19 dias, 20 traz de 20 a 24, e assim por diante.
   A ultima fica aberta porque nao tem proxima. Antes era ">= N", e clicar em
   15 devolvia tambem quem sumiu ha 70 — os grupos se repetiam e a soma dos
   seis nao batia com o total. */
export const DIAS_OPCOES = [15, 20, 25, 30, 40, 60] as const

/* TODOS = 0 · cumulativo a partir do menor degrau, sem teto (08/09).
   Sem ele, o default de 40 virava a faixa 40-59 e escondia quem sumiu ha
   mais de 60: a Wanessa veria 9 clientes onde via 78, o Olimpio 20 onde via
   72. A faixa fechada e' a regra que a Rosy pediu pra FILTRAR, nao pra ser
   o que todo mundo ve ao abrir. */
export const TODOS = 0
const DIAS_PADRAO = TODOS

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
  const dias = pedido === TODOS || (DIAS_OPCOES as readonly number[]).includes(pedido)
    ? pedido
    : DIAS_PADRAO

  const { data: biz } = await supabase
    .from('businesses')
    .select('name, slug, description')
    .eq('id', businessId)
    .single()

  const negocio = biz?.name ?? ''
  const slug = biz?.slug ?? ''
  const descricao = biz?.description ?? null

  /* Mesma primitiva do Reativar: uma linha por cliente com a última data
     QUALQUER — inclui agendamento futuro e cancelado. Quem tem horário
     marcado à frente NÃO é sumido, e essa régua importa mais em 15 dias
     do que em 40. */
  const hoje = todayBR()
  /* Limite superior = o proximo degrau. No ultimo, Infinity. */
  const idx = (DIAS_OPCOES as readonly number[]).indexOf(dias)
  const ate = idx >= 0 && idx < DIAS_OPCOES.length - 1 ? DIAS_OPCOES[idx + 1] : Infinity
  /** Piso: em TODOS, o menor degrau da escala. */
  const de = dias === TODOS ? DIAS_OPCOES[0] : dias

  const { data: ultimos, error } = await supabase.rpc('ultimo_agendamento_clientes', {
    p_business_id: businessId,
  })
  if (error) return NextResponse.json({ error: 'rpc_failed' }, { status: 500 })

  const sumidos = new Map<string, string>()
  for (const r of ultimos ?? []) {
    const id = r.client_id as string | null
    const ultima = r.ultima as string | null
    if (!id || !ultima) continue
    const d = diasEntre(ultima, hoje)
    // Fora da faixa (inclui quem tem horario FUTURO, que da d negativo)
    if (d >= de && d < ate) sumidos.set(id, ultima)
  }
  if (sumidos.size === 0) {
    return NextResponse.json({ dias, ate: ate === Infinity ? null : ate, negocio, slug, descricao, businessId, clientes: [] })
  }

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, phone')
    .in('id', Array.from(sumidos.keys()))

  /* customer_id de cada cliente, pra abrir a ficha direto da lista (08/09).
     A ponte e' o telefone: `clients` e' global e `customers` e' por negocio. */
  const fonesDaLista = (clients ?? []).map((c) => c.phone as string).filter(Boolean)
  const { data: custsDaLista } = fonesDaLista.length
    ? await supabase
        .from('customers')
        .select('id, phone')
        .eq('business_id', businessId)
        .in('phone', fonesDaLista)
    : { data: [] }
  const customerPorFone = new Map((custsDaLista ?? []).map((c) => [c.phone as string, c.id as string]))

  /* CUPOM ATIVO POR CLIENTE (08/09) · sem isto a dona reabre a tela, nao
     lembra que ja mandou cupom pra alguem e gera um segundo — dois descontos
     pra mesma pessoa, e o primeiro solto no mundo. Foi o que quase aconteceu
     com a Erlane. A ponte e' a de sempre: coupons.customer_id -> customers
     -> telefone -> clients. */
  const agoraIso = new Date().toISOString()
  const { data: cupons } = await supabase
    .from('coupons')
    .select('id, code, customer_id, discount_type, discount_value, expires_at, sent_at, used_at, whatsapp_message')
    .eq('business_id', businessId)
    .is('used_at', null)
    .gt('expires_at', agoraIso)

  const cupomPorFone = new Map<string, {
    code: string; discount_type: string; discount_value: number
    expires_at: string; sent_at: string | null; whatsapp_message: string | null
  }>()
  const customerIds = (cupons ?? []).map((c) => c.customer_id).filter(Boolean) as string[]
  if (customerIds.length > 0) {
    const { data: custs } = await supabase
      .from('customers')
      .select('id, phone')
      .eq('business_id', businessId)
      .in('id', customerIds)
    const fonePorCustomer = new Map((custs ?? []).map((c) => [c.id as string, c.phone as string]))
    for (const cp of cupons ?? []) {
      const fone = cp.customer_id ? fonePorCustomer.get(cp.customer_id as string) : null
      if (!fone) continue
      // Mais recente ganha, se houver mais de um ativo.
      const atual = cupomPorFone.get(fone)
      if (atual && atual.expires_at > (cp.expires_at as string)) continue
      cupomPorFone.set(fone, {
        code: cp.code as string,
        discount_type: cp.discount_type as string,
        discount_value: Number(cp.discount_value),
        expires_at: cp.expires_at as string,
        sent_at: (cp.sent_at as string) ?? null,
        whatsapp_message: (cp.whatsapp_message as string) ?? null,
      })
    }
  }

  const clientes = (clients ?? [])
    .map((c) => {
      const ultima = sumidos.get(c.id as string)!
      return {
        id: c.id as string,
        name: (c.name as string) ?? 'Sem nome',
        phone: (c.phone as string) ?? null,
        ultima,
        diasSem: diasEntre(ultima, hoje),
        cupom: c.phone ? cupomPorFone.get(c.phone as string) ?? null : null,
        customerId: c.phone ? customerPorFone.get(c.phone as string) ?? null : null,
      }
    })
    // Quem sumiu há mais tempo primeiro — é quem está mais perto de virar perda.
    .sort((a, b) => b.diasSem - a.diasSem)

  return NextResponse.json({ dias, ate: ate === Infinity ? null : ate, negocio, slug, descricao, businessId, clientes })
}
