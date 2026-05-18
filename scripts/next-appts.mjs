import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const TODAY = new Date().toISOString().slice(0, 10)
const { data, error } = await sb
  .from('appointments')
  .select('appointment_date, start_time, customer_name, service_name, professional_id, status')
  .eq('business_id', 'ee6f0b22-5a46-406a-a3d4-b901551c4261')
  .gte('appointment_date', TODAY)
  .order('appointment_date')
  .order('start_time')
  .limit(15)
if (error) console.error('ERRO:', error)
console.log(`Próximos 15 agendamentos a partir de ${TODAY}:`)
for (const a of (data ?? [])) {
  console.log(`  ${a.appointment_date} ${a.start_time.slice(0,5)} · ${a.customer_name ?? '?'} · ${a.service_name ?? '?'}`)
}
