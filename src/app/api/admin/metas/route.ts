/**
 * /api/admin/metas — grava a meta do mês e o sonho (aba Metas, 04/11/2026).
 *
 * POST { tipo: 'meta', mes: 'AAAA-MM', valor, sugerido?, ticket? }  → upsert (negócio, mês)
 * POST { tipo: 'sonho', titulo, custo?, ateMes?: 'AAAA-MM' } → upsert (1 por negócio)
 * POST { tipo: 'cofrinho', mov: 'guardei'|'retirei', valor, motivo? } → lança no cofrinho
 * POST { tipo: 'conquistado' }                               → marca o sonho como conquistado
 * DELETE ?tipo=sonho                                        → tira o sonho
 * DELETE ?tipo=cofrinho&id=<uuid>                           → desfaz o ÚLTIMO lançamento
 *
 * Cofrinho (Eduardo 04/11): o sistema NUNCA mexe em dinheiro, só anota. Saldo
 * vem do banco (cofrinho_saldo); saldo negativo e desfazer fora de ordem são
 * barrados pelos triggers da v186, não só aqui.
 *
 * Sessão do usuário (RLS v186 · pode_ver_metas). Read-after-write: a resposta
 * devolve a linha LIDA do banco depois de gravar, não o que foi enviado.
 * Área "financeiro" (lib/permissoes-gerente · API).
 */
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { negocioDoPainel, NEGOCIO_NENHUM } from '@/lib/admin-data'
import { checkRateLimit } from '@/lib/rate-limit-api'
import { addMonthsBR } from '@/lib/date-br'
import { mesAtualBR } from '@/lib/metas/calculo'

const YM = /^\d{4}-(0[1-9]|1[0-2])$/

async function contexto() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: NextResponse.json({ error: 'unauthenticated' }, { status: 401 }) } as const
  const bid = await negocioDoPainel(user.id)
  if (!bid || bid === NEGOCIO_NENHUM) return { erro: NextResponse.json({ error: 'forbidden' }, { status: 403 }) } as const
  return { supabase, user, bid } as const
}

export type MovimentoCofrinho = { id: string; tipo: 'guardei' | 'retirei'; valor: number; motivo: string | null; criado_em: string }

/** Saldo (calculado no banco) + últimos 5 lançamentos. */
async function lerCofrinho(supabase: Awaited<ReturnType<typeof createClient>>, sonhoId: string) {
  const [{ data: saldo }, { data: movs }] = await Promise.all([
    supabase.rpc('cofrinho_saldo', { p_sonho_id: sonhoId }),
    supabase.from('metas_cofrinho').select('id, tipo, valor, motivo, criado_em').eq('sonho_id', sonhoId).order('criado_em', { ascending: false }).order('id', { ascending: false }).limit(5),
  ])
  return {
    saldo: Number(saldo ?? 0),
    movimentos: ((movs ?? []) as MovimentoCofrinho[]).map((m) => ({ ...m, valor: Number(m.valor) })),
  }
}

function numero(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v.replace(/\./g, '').replace(',', '.')) : Number(v)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'admin-metas', limit: 30, windowSeconds: 60 })
  if (rl) return rl
  const c = await contexto()
  if ('erro' in c) return c.erro
  const { supabase, user, bid } = c

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'json inválido' }, { status: 400 })

  if (body.tipo === 'meta') {
    const mes = String(body.mes ?? '')
    const atual = mesAtualBR()
    const proximo = addMonthsBR(`${atual}-01`, 1).slice(0, 7)
    if (!YM.test(mes) || (mes !== atual && mes !== proximo)) {
      return NextResponse.json({ error: 'mês inválido' }, { status: 400 })
    }
    const valor = numero(body.valor)
    if (!valor || valor <= 0 || valor >= 100_000_000) return NextResponse.json({ error: 'valor inválido' }, { status: 400 })
    const sugerido = numero(body.sugerido)
    const ticket = numero(body.ticket)
    const { error } = await supabase.from('metas_mes').upsert(
      {
        business_id: bid,
        mes: `${mes}-01`,
        valor,
        sugerido: sugerido && sugerido > 0 ? sugerido : null,
        ticket_medio: ticket && ticket > 0 && ticket < 1_000_000 ? ticket : null,
        // meta nova = pode avisar de novo quando bater
        bateu_avisado_em: null,
        criado_por: user.id,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'business_id,mes' },
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const { data: lida } = await supabase.from('metas_mes').select('mes, valor, sugerido').eq('business_id', bid).eq('mes', `${mes}-01`).maybeSingle()
    if (!lida || Number(lida.valor) !== valor) return NextResponse.json({ error: 'não confirmou no banco' }, { status: 500 })
    revalidatePath('/admin/metas')
    revalidatePath('/admin/inicio')
    return NextResponse.json({ ok: true, meta: lida })
  }

  if (body.tipo === 'cofrinho') {
    const mov = body.mov === 'retirei' ? 'retirei' : body.mov === 'guardei' ? 'guardei' : null
    const valor = numero(body.valor)
    if (!mov) return NextResponse.json({ error: 'movimento inválido' }, { status: 400 })
    if (!valor || valor <= 0 || valor >= 100_000_000) return NextResponse.json({ error: 'valor inválido' }, { status: 400 })
    const motivo = String(body.motivo ?? '').trim().slice(0, 60) || null
    const { data: sonho } = await supabase.from('metas_sonho').select('id').eq('business_id', bid).maybeSingle()
    if (!sonho) return NextResponse.json({ error: 'sem sonho' }, { status: 400 })
    const { data: ins, error } = await supabase
      .from('metas_cofrinho')
      .insert({ sonho_id: sonho.id, business_id: bid, tipo: mov, valor, motivo, criado_por: user.id })
      .select('id')
      .single()
    if (error) {
      const saldoNeg = /retirada maior/.test(error.message)
      return NextResponse.json({ error: saldoNeg ? 'Não dá pra retirar mais do que está guardado.' : error.message }, { status: saldoNeg ? 400 : 500 })
    }
    const cofre = await lerCofrinho(supabase, sonho.id as string)
    if (!cofre.movimentos.some((m) => m.id === ins.id)) return NextResponse.json({ error: 'não confirmou no banco' }, { status: 500 })
    revalidatePath('/admin/metas')
    return NextResponse.json({ ok: true, ...cofre })
  }

  if (body.tipo === 'conquistado') {
    const { data: sonho } = await supabase.from('metas_sonho').select('id, custo').eq('business_id', bid).maybeSingle()
    if (!sonho) return NextResponse.json({ error: 'sem sonho' }, { status: 400 })
    const { saldo } = await lerCofrinho(supabase, sonho.id as string)
    if (!sonho.custo || saldo < Number(sonho.custo)) return NextResponse.json({ error: 'ainda não chegou no valor' }, { status: 400 })
    const { error } = await supabase.from('metas_sonho').update({ conquistado_em: new Date().toISOString() }).eq('id', sonho.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const { data: lida } = await supabase.from('metas_sonho').select('conquistado_em').eq('id', sonho.id).maybeSingle()
    if (!lida?.conquistado_em) return NextResponse.json({ error: 'não confirmou no banco' }, { status: 500 })
    revalidatePath('/admin/metas')
    return NextResponse.json({ ok: true, conquistado_em: lida.conquistado_em })
  }

  if (body.tipo === 'sonho') {
    // sonho conquistado + sonho novo = começa do zero (cofrinho novo)
    const { data: antigo } = await supabase.from('metas_sonho').select('id, conquistado_em').eq('business_id', bid).maybeSingle()
    if (antigo?.conquistado_em) await supabase.from('metas_sonho').delete().eq('id', antigo.id)
    const titulo = String(body.titulo ?? '').trim().slice(0, 80)
    if (!titulo) return NextResponse.json({ error: 'diga qual é o sonho' }, { status: 400 })
    const custo = body.custo === null || body.custo === '' || body.custo === undefined ? null : numero(body.custo)
    if (custo !== null && (custo <= 0 || custo >= 100_000_000)) return NextResponse.json({ error: 'custo inválido' }, { status: 400 })
    const ateMes = body.ateMes ? String(body.ateMes) : null
    if (ateMes && (!YM.test(ateMes) || ateMes < mesAtualBR())) return NextResponse.json({ error: 'prazo inválido' }, { status: 400 })
    const { error } = await supabase.from('metas_sonho').upsert(
      {
        business_id: bid,
        titulo,
        custo,
        ate_mes: ateMes ? `${ateMes}-01` : null,
        criado_por: user.id,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'business_id' },
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const { data: lida } = await supabase.from('metas_sonho').select('titulo, custo, ate_mes, desde_mes').eq('business_id', bid).maybeSingle()
    if (!lida || lida.titulo !== titulo) return NextResponse.json({ error: 'não confirmou no banco' }, { status: 500 })
    revalidatePath('/admin/metas')
    revalidatePath('/admin/inicio')
    return NextResponse.json({ ok: true, sonho: lida })
  }

  return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  const c = await contexto()
  if ('erro' in c) return c.erro
  const { supabase, bid } = c
  const tipo = req.nextUrl.searchParams.get('tipo')
  if (tipo === 'cofrinho') {
    const id = req.nextUrl.searchParams.get('id') ?? ''
    if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: 'id inválido' }, { status: 400 })
    const { data: sonho } = await supabase.from('metas_sonho').select('id').eq('business_id', bid).maybeSingle()
    if (!sonho) return NextResponse.json({ error: 'sem sonho' }, { status: 400 })
    const { error } = await supabase.from('metas_cofrinho').delete().eq('id', id).eq('sonho_id', sonho.id)
    if (error) {
      const fora = /último lançamento/.test(error.message)
      return NextResponse.json({ error: fora ? 'Só dá pra desfazer o último lançamento.' : error.message }, { status: fora ? 400 : 500 })
    }
    const cofre = await lerCofrinho(supabase, sonho.id as string)
    if (cofre.movimentos.some((m) => m.id === id)) return NextResponse.json({ error: 'não desfez' }, { status: 500 })
    revalidatePath('/admin/metas')
    return NextResponse.json({ ok: true, ...cofre })
  }
  if (tipo !== 'sonho') return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })
  const { error } = await supabase.from('metas_sonho').delete().eq('business_id', bid)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data: sobrou } = await supabase.from('metas_sonho').select('business_id').eq('business_id', bid).maybeSingle()
  if (sobrou) return NextResponse.json({ error: 'não apagou' }, { status: 500 })
  revalidatePath('/admin/metas')
  revalidatePath('/admin/inicio')
  return NextResponse.json({ ok: true })
}
