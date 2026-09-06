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
    if (d >= dias && d < ate) sumidos.set(id, ultima)
  }
  if (sumidos.size === 0) {
    return NextResponse.json({ dias, ate: ate === Infinity ? null : ate, negocio, slug, descricao, clientes: [] })
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

  return NextResponse.json({ dias, ate: ate === Infinity ? null : ate, negocio, slug, descricao, clientes })
}
