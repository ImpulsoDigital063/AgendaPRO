import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getApptDiscountMap } from '@/lib/commission-discount'

/**
 * GET /api/v1/agendamentos?de=YYYY-MM-DD&ate=YYYY-MM-DD&pagina=1
 * Authorization: Bearer apk_...
 *
 * API só leitura (v169 · 21/10/2026). Pedido do irmão da Ivna pra puxar os
 * agendamentos da clínica num BI e num assistente de IA. Mesmos campos do
 * CSV de Vendas, mais o valor líquido (com desconto) — BI que soma o bruto
 * mostra faturamento maior que o real.
 *
 * A chave vale pra UMA conta (api_keys.business_id); nunca há parâmetro de
 * negócio na URL. Limite por hora em api_key_usar().
 */

const POR_PAGINA = 500
const MAX_DIAS = 366

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Não compareceu',
}
const METHOD_LABEL: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  card: 'Cartão',
  credit: 'Cartão de Crédito',
  credit_card: 'Cartão de Crédito',
  debit: 'Cartão de Débito',
  debit_card: 'Cartão de Débito',
  transfer: 'Transferência',
  courtesy: 'Cortesia',
  points: 'Pontos (recompensa)',
}

const erro = (status: number, mensagem: string) =>
  NextResponse.json({ erro: mensagem }, { status, headers: { 'Cache-Control': 'no-store' } })

const dataValida = (s: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'))

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const chave = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
  if (!chave.startsWith('apk_')) return erro(401, 'Chave ausente. Envie o header Authorization: Bearer <sua chave>.')

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const hash = createHash('sha256').update(chave).digest('hex')
  const { data: uso, error: usoErr } = await sb.rpc('api_key_usar', { p_hash: hash })
  if (usoErr) return erro(500, 'Erro ao validar a chave.')
  const k = (Array.isArray(uso) ? uso[0] : uso) as { business_id: string; permitido: boolean; limite: number } | undefined
  if (!k) return erro(401, 'Chave inválida ou desativada.')
  if (!k.permitido) return erro(429, `Limite de ${k.limite} consultas por hora atingido. Tente de novo mais tarde.`)

  const sp = req.nextUrl.searchParams
  const de = sp.get('de')
  const ate = sp.get('ate')
  if (!dataValida(de) || !dataValida(ate)) return erro(400, 'Informe de e ate no formato AAAA-MM-DD.')
  const dias = (Date.parse(ate! + 'T00:00:00Z') - Date.parse(de! + 'T00:00:00Z')) / 86400000
  if (dias < 0) return erro(400, 'A data de é depois da data ate.')
  if (dias > MAX_DIAS) return erro(400, `Período máximo de ${MAX_DIAS} dias por consulta.`)
  const pagina = Math.max(1, Math.floor(Number(sp.get('pagina') ?? '1')) || 1)

  const inicio = (pagina - 1) * POR_PAGINA
  const { data: rows, error, count } = await sb
    .from('appointments')
    .select(`
      id, appointment_date, start_time, client_name, client_phone,
      service_name, total_price, status, paid_at, payment_method, invoice_item_id,
      professional:professionals(name)
    `, { count: 'exact' })
    .eq('business_id', k.business_id)
    .gte('appointment_date', de!)
    .lte('appointment_date', ate!)
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true })
    .order('id', { ascending: true })
    .range(inicio, inicio + POR_PAGINA - 1)
  if (error) return erro(500, 'Erro ao buscar os agendamentos.')

  type Row = {
    id: string
    appointment_date: string
    start_time: string | null
    client_name: string | null
    client_phone: string | null
    service_name: string | null
    total_price: number | null
    status: string | null
    paid_at: string | null
    payment_method: string | null
    invoice_item_id: string | null
    professional: { name: string } | { name: string }[] | null
  }
  const lista = (rows ?? []) as unknown as Row[]

  // Em lotes: .in() gigante estoura a URL e volta 400 calado.
  const descontos: Record<string, number> = {}
  const itens = lista.map((r) => r.invoice_item_id).filter((x): x is string => !!x)
  for (let i = 0; i < itens.length; i += 150) {
    Object.assign(descontos, await getApptDiscountMap(sb, itens.slice(i, i + 150)))
  }

  const agendamentos = lista.map((r) => {
    const prof = Array.isArray(r.professional) ? r.professional[0] : r.professional
    const bruto = r.total_price != null ? Number(r.total_price) : null
    const desconto = Math.round((descontos[r.id] ?? 0) * 100) / 100
    return {
      id: r.id,
      data: r.appointment_date,
      hora: (r.start_time ?? '').slice(0, 5) || null,
      cliente: r.client_name,
      telefone: r.client_phone,
      servico: r.service_name,
      profissional: prof?.name ?? null,
      valor: bruto,
      desconto,
      valor_liquido: bruto == null ? null : Math.max(0, Math.round((bruto - desconto) * 100) / 100),
      situacao: STATUS_LABEL[r.status ?? ''] ?? r.status,
      pago_em: r.paid_at,
      forma_pagamento: r.payment_method ? (METHOD_LABEL[r.payment_method] ?? r.payment_method) : null,
    }
  })

  const total = count ?? agendamentos.length
  return NextResponse.json(
    {
      de,
      ate,
      pagina,
      por_pagina: POR_PAGINA,
      total,
      tem_mais: inicio + agendamentos.length < total,
      agendamentos,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
