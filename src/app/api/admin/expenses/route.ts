import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkRateLimit } from '@/lib/rate-limit-api'
import { todayBR, monthBoundsBR, addMonthsBR, dividirParcelas } from '@/lib/date-br'

const VALID_CATEGORIES = new Set([
  'rent', 'products', 'salary', 'utilities', 'marketing', 'taxes', 'other',
])

/**
 * GET /api/admin/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Lista despesas no periodo (default: mes corrente)
 */
export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'admin-expenses-get', limit: 60, windowSeconds: 60 })
  if (rl) return rl

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()
  if (!business) return NextResponse.json({ error: 'business_not_found' }, { status: 404 })

  const url = new URL(req.url)
  const fromParam = url.searchParams.get('from')
  const toParam = url.searchParams.get('to')

  // λ.fuso · mês corrente em BR · antes era new Date() + getFullYear/getMonth,
  // que no servidor (UTC) viram o mês seguinte na virada depois das 21h
  const { start: defaultFrom, end: defaultTo } = monthBoundsBR(todayBR().slice(0, 7))

  const from = fromParam || defaultFrom
  const to = toParam || defaultTo

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('business_id', business.id)
    .gte('occurred_at', from)
    .lte('occurred_at', to)
    .order('occurred_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('expenses GET error:', error)
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }

  // v104 · contas VENCIDAS e não pagas voltam sempre, mesmo fora do período.
  // Conta atrasada que some da tela quando vira o mês é conta esquecida — e o
  // motivo de existir a feature é justamente não perder vencimento de vista.
  const { data: atrasadas } = await supabase
    .from('expenses')
    .select('*')
    .eq('business_id', business.id)
    .eq('status', 'scheduled')
    .lt('due_date', from)
    .order('due_date', { ascending: true })

  const jaListadas = new Set((expenses || []).map((e) => e.id))
  const vencidas = (atrasadas || []).filter((e) => !jaListadas.has(e.id))

  return NextResponse.json({
    expenses: expenses || [],
    vencidas,
    from,
    to,
  })
}

/**
 * POST /api/admin/expenses
 * Body: { name, amount, category, occurred_at, recurring?, notes? }
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'admin-expenses-create', limit: 30, windowSeconds: 60 })
  if (rl) return rl

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()
  if (!business) return NextResponse.json({ error: 'business_not_found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const amount = Number(body.amount)
  const category = typeof body.category === 'string' ? body.category : 'other'
  const occurred_at = typeof body.occurred_at === 'string' ? body.occurred_at : null
  const recurring = !!body.recurring
  const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null
  // v104 · conta a pagar. 'scheduled' = ainda não saiu do caixa.
  const status = body.status === 'scheduled' ? 'scheduled' : 'paid'
  // v105 · parcelamento (sugestão da Letícia). O valor recebido é sempre o
  // TOTAL da compra; o servidor divide. Só faz sentido em conta a pagar.
  const parcelasPedidas = Number(body.installments)
  const parcelas =
    status === 'scheduled' && Number.isFinite(parcelasPedidas) && parcelasPedidas > 1
      ? Math.min(Math.floor(parcelasPedidas), 24)
      : 1
  const due_date =
    typeof body.due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.due_date)
      ? body.due_date
      : null

  if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
  if (name.length > 200) {
    return NextResponse.json({ error: 'Nome muito longo (max 200)' }, { status: 400 })
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
  }
  // Sanity: barbearia/salão não tem despesa de R$1mi (limite anti-abuso/erro)
  if (amount > 1_000_000) {
    return NextResponse.json({ error: 'Valor acima do limite (R$1.000.000)' }, { status: 400 })
  }
  if (!VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 })
  }
  // Programada é definida pelo VENCIMENTO; paga, pela data em que saiu.
  if (status === 'scheduled') {
    if (!due_date) {
      return NextResponse.json(
        { error: 'Conta programada precisa da data de vencimento' },
        { status: 400 }
      )
    }
  } else if (!occurred_at || !/^\d{4}-\d{2}-\d{2}$/.test(occurred_at)) {
    return NextResponse.json({ error: 'Data inválida (YYYY-MM-DD)' }, { status: 400 })
  }
  if (notes && notes.length > 1000) {
    return NextResponse.json({ error: 'Observação muito longa (max 1000)' }, { status: 400 })
  }

  // Uma linha por parcela, com vencimento mês a mês. addMonthsBR gruda no
  // último dia quando o dia não existe no mês destino (31/08 → 30/09), senão a
  // parcela transbordaria pro mês seguinte e cairia junto com a próxima.
  const valores = parcelas > 1 ? dividirParcelas(amount, parcelas) : [amount]
  const linhas = valores.map((valor, i) => {
    const venc = parcelas > 1 ? addMonthsBR(due_date as string, i) : due_date
    return {
      business_id: business.id,
      name: parcelas > 1 ? `${name} (${i + 1}/${parcelas})` : name,
      amount: valor,
      category,
      // Programada ainda não saiu do caixa: occurred_at guarda a data PREVISTA
      // (= vencimento) e vira a data real quando ela marcar como paga. Assim o
      // fluxo de caixa realizado, que soma por occurred_at, nunca mistura os dois.
      occurred_at: status === 'scheduled' ? venc : occurred_at,
      due_date: status === 'scheduled' ? venc : due_date,
      status,
      recurring,
      notes,
    }
  })

  // Insert em bloco: ou entram todas as parcelas, ou nenhuma. Criar 2 de 3 e
  // falhar no meio deixaria dívida pela metade no financeiro dela.
  const { data: criadas, error } = await supabase.from('expenses').insert(linhas).select('*')
  const expense = criadas?.[0]

  if (error) {
    console.error('expenses POST error:', error)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  revalidatePath('/admin/financeiro')
  revalidatePath('/admin/financeiro/despesas')
  return NextResponse.json({ ok: true, expense, criadas: criadas?.length ?? 0 })
}
