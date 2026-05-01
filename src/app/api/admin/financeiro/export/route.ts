import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/financeiro/export?periodo=mes|semana|hoje
 * Retorna CSV com agendamentos + pagamentos do periodo.
 *
 * Sem dependencia externa — geracao de CSV string manual.
 * Compativel com Excel BR (separador ; e BOM UTF-8 pra acentos).
 */
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Não compareceu',
}

const METHOD_LABEL: Record<string, string> = {
  pix: 'PIX',
  cash: 'Dinheiro',
  card: 'Cartão',
  courtesy: 'Cortesia',
}

function csvEscape(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  // Se contém ; , " ou newline, envolvemos em aspas e dobramos as aspas internas
  if (/[;,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()
  if (!business) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const url = new URL(req.url)
  const periodo = url.searchParams.get('periodo') || 'mes'

  const today = new Date()
  let startDate: string
  let endDate: string
  if (periodo === 'hoje') {
    startDate = today.toISOString().split('T')[0]
    endDate = startDate
  } else if (periodo === 'semana') {
    const start = new Date(today)
    start.setDate(start.getDate() - 6)
    startDate = start.toISOString().split('T')[0]
    endDate = today.toISOString().split('T')[0]
  } else {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString().split('T')[0]
    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      .toISOString().split('T')[0]
  }

  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      appointment_date, start_time, client_name, client_phone,
      service_name, total_price, status, paid_at, payment_method,
      professional:professionals(name)
    `)
    .eq('business_id', business.id)
    .gte('appointment_date', startDate)
    .lte('appointment_date', endDate)
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true })

  const { data: expenses } = await supabase
    .from('expenses')
    .select('occurred_at, name, amount, category, recurring, notes')
    .eq('business_id', business.id)
    .gte('occurred_at', startDate)
    .lte('occurred_at', endDate)
    .order('occurred_at', { ascending: true })

  const lines: string[] = []

  // Sessao 1: AGENDAMENTOS
  lines.push('=== AGENDAMENTOS ===')
  lines.push(['Data', 'Hora', 'Cliente', 'Telefone', 'Serviço', 'Profissional', 'Status', 'Valor', 'Pago em', 'Método'].map(csvEscape).join(';'))
  for (const a of appointments || []) {
    type ProfShape = { name: string } | { name: string }[] | null
    const profRaw = a.professional as unknown as ProfShape
    const profName = Array.isArray(profRaw)
      ? profRaw[0]?.name ?? ''
      : profRaw?.name ?? ''
    lines.push([
      a.appointment_date,
      a.start_time?.slice(0, 5),
      a.client_name,
      a.client_phone,
      a.service_name || '',
      profName,
      STATUS_LABEL[a.status] || a.status,
      a.total_price != null ? Number(a.total_price).toFixed(2).replace('.', ',') : '',
      a.paid_at ? new Date(a.paid_at).toLocaleDateString('pt-BR') : '',
      a.payment_method ? METHOD_LABEL[a.payment_method] : '',
    ].map(csvEscape).join(';'))
  }

  lines.push('')
  lines.push('=== DESPESAS ===')
  lines.push(['Data', 'Nome', 'Categoria', 'Valor', 'Recorrente', 'Notas'].map(csvEscape).join(';'))
  for (const e of expenses || []) {
    lines.push([
      e.occurred_at,
      e.name,
      e.category,
      Number(e.amount).toFixed(2).replace('.', ','),
      e.recurring ? 'Sim' : 'Não',
      e.notes || '',
    ].map(csvEscape).join(';'))
  }

  // BOM UTF-8 pra Excel BR abrir com acentos OK
  const csv = '﻿' + lines.join('\r\n')
  const filename = `agendapro-${business.name.toLowerCase().replace(/\s+/g, '-')}-${periodo}-${today.toISOString().split('T')[0]}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
