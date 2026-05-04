import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkRateLimit } from '@/lib/rate-limit-api'

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

  const today = new Date()
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString().split('T')[0]
  const defaultTo = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString().split('T')[0]

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

  return NextResponse.json({ expenses: expenses || [], from, to })
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
  if (!occurred_at || !/^\d{4}-\d{2}-\d{2}$/.test(occurred_at)) {
    return NextResponse.json({ error: 'Data inválida (YYYY-MM-DD)' }, { status: 400 })
  }
  if (notes && notes.length > 1000) {
    return NextResponse.json({ error: 'Observação muito longa (max 1000)' }, { status: 400 })
  }

  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      business_id: business.id,
      name,
      amount,
      category,
      occurred_at,
      recurring,
      notes,
    })
    .select('*')
    .single()

  if (error) {
    console.error('expenses POST error:', error)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  revalidatePath('/admin/financeiro')
  revalidatePath('/admin/financeiro/despesas')
  return NextResponse.json({ ok: true, expense })
}
