import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const envPath = resolve(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf8')
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function main() {
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('slug', 'imperio-barbershop')
    .single()
  if (!business) { console.error('biz not found'); return }

  const today = new Date()
  // Mesma logica do FinanceiroView: rolling 30d passados + 7 futuros
  const start = new Date(today)
  start.setDate(start.getDate() - 30)
  const end = new Date(today)
  end.setDate(end.getDate() + 7)
  const monthStart = start.toISOString().split('T')[0]
  const monthEnd = end.toISOString().split('T')[0]

  const { data: appts } = await supabase
    .from('appointments')
    .select('total_price, paid_at, payment_method, status, appointment_date')
    .eq('business_id', business.id)
    .gte('appointment_date', monthStart)
    .lte('appointment_date', monthEnd)

  const pagos = (appts || []).filter(a => a.paid_at && a.payment_method !== 'courtesy')
  const realizado = pagos.reduce((s, a) => s + (a.total_price || 0), 0)
  const naoPagos = (appts || []).filter(a => !a.paid_at && a.total_price && a.total_price > 0 && (a.status === 'confirmed' || a.status === 'completed'))
  const aberto = naoPagos.reduce((s, a) => s + (a.total_price || 0), 0)

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount')
    .eq('business_id', business.id)
    .gte('occurred_at', monthStart)
    .lte('occurred_at', monthEnd)
  const totalExpenses = (expenses || []).reduce((s, e) => s + Number(e.amount || 0), 0)

  console.log(`📅 Período: ${monthStart} → ${monthEnd}`)
  console.log(`📦 Total appointments mês: ${(appts || []).length}`)
  console.log(`💰 Realizado mês: R$ ${realizado.toFixed(2)} (${pagos.length} pagos)`)
  console.log(`⏳ Em aberto:    R$ ${aberto.toFixed(2)} (${naoPagos.length} pendentes)`)
  console.log(`📈 Faturado:     R$ ${(realizado + aberto).toFixed(2)}`)
  console.log(`💸 Despesas mês: R$ ${totalExpenses.toFixed(2)}`)
  console.log(`🎯 LUCRO MÊS:    R$ ${(realizado - totalExpenses).toFixed(2)}`)
}
main()
