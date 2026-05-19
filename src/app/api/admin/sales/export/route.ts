import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * GET /api/admin/sales/export?q=...&status=...&from=YYYY-MM-DD&to=...&prof=ID
 * Aplica os mesmos filtros da página /admin/financeiro/vendas e devolve CSV.
 * Sem limite de range — owner pode exportar histórico completo.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!business) return NextResponse.json({ error: 'business_not_found' }, { status: 404 })

  const sp = req.nextUrl.searchParams
  const q = (sp.get('q') ?? '').trim()
  const status = sp.get('status') ?? 'all'
  const from = sp.get('from')
  const to = sp.get('to')
  const profId = sp.get('prof')

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const today = new Date().toISOString().slice(0, 10)

  let query = sb
    .from('appointments')
    .select(`
      id, appointment_date, start_time, client_name, client_phone,
      service_name, total_price, status, paid_at, payment_method,
      professional:professionals(name)
    `)
    .eq('business_id', business.id)
    .lte('appointment_date', from || to ? (to ?? today) : today)

  if (from) query = query.gte('appointment_date', from)
  if (profId) query = query.eq('professional_id', profId)

  if (status === 'pending') {
    query = query.is('paid_at', null).is('invoice_item_id', null).neq('status', 'cancelled')
  } else if (status === 'paid') {
    query = query.not('paid_at', 'is', null).is('invoice_item_id', null).neq('status', 'cancelled')
  } else if (status === 'invoiced') {
    query = query.not('invoice_item_id', 'is', null)
  } else if (status === 'cancelled') {
    query = query.eq('status', 'cancelled')
  }

  if (q) {
    const term = q.replace(/[%_]/g, '\\$&')
    query = query.or(`client_name.ilike.%${term}%,service_name.ilike.%${term}%`)
  }

  query = query
    .order('appointment_date', { ascending: false })
    .order('start_time', { ascending: false })
    .limit(10000)

  const { data: rows } = await query

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
    credit: 'Cartão de Crédito',
    credit_card: 'Cartão de Crédito',
    debit: 'Cartão de Débito',
    debit_card: 'Cartão de Débito',
    transfer: 'Transferência',
    courtesy: 'Cortesia',
  }

  const escape = (s: unknown) => {
    if (s == null) return ''
    const v = String(s).replace(/"/g, '""')
    return /[",\n;]/.test(v) ? `"${v}"` : v
  }

  const header = ['Data', 'Hora', 'Cliente', 'Telefone', 'Serviço', 'Profissional', 'Valor', 'Situação', 'Pago em', 'Forma pagamento']
  const lines = [header.join(',')]

  type Row = {
    appointment_date: string
    start_time: string
    client_name: string | null
    client_phone: string | null
    service_name: string | null
    total_price: number | null
    status: string | null
    paid_at: string | null
    payment_method: string | null
    professional: { name: string } | { name: string }[] | null
  }
  for (const r of ((rows ?? []) as unknown as Row[])) {
    const prof = Array.isArray(r.professional) ? r.professional[0] : r.professional
    const date = r.appointment_date
      ? new Date(r.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR')
      : ''
    const hora = (r.start_time ?? '').slice(0, 5)
    const paidAt = r.paid_at
      ? new Date(r.paid_at).toLocaleDateString('pt-BR')
      : ''
    const valor = r.total_price != null
      ? Number(r.total_price).toFixed(2).replace('.', ',')
      : ''

    lines.push([
      escape(date),
      escape(hora),
      escape(r.client_name),
      escape(r.client_phone),
      escape(r.service_name),
      escape(prof?.name),
      escape(valor),
      escape(STATUS_LABEL[r.status ?? ''] ?? r.status ?? ''),
      escape(paidAt),
      escape(METHOD_LABEL[r.payment_method ?? ''] ?? r.payment_method ?? ''),
    ].join(','))
  }

  const csv = '﻿' + lines.join('\r\n') // BOM pra Excel reconhecer UTF-8
  const today_yyyymmdd = new Date().toISOString().slice(0, 10)
  const filename = `vendas-${business.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${today_yyyymmdd}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
