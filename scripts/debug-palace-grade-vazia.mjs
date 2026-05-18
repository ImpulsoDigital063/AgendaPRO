/**
 * Investiga porque /admin do Palace mostra "0 agendamentos" hoje
 * sendo que importamos 1435 do Salão99.
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

const BUSINESS_ID = 'ee6f0b22-5a46-406a-a3d4-b901551c4261'
const TODAY = new Date().toISOString().slice(0, 10)

// 1. Total appointments do business
const { count: totalAppts } = await sb
  .from('appointments')
  .select('id', { count: 'exact', head: true })
  .eq('business_id', BUSINESS_ID)
console.log(`Total appointments Palace: ${totalAppts}`)

// 2. Appointments por status
const { data: byStatus } = await sb
  .from('appointments')
  .select('status')
  .eq('business_id', BUSINESS_ID)
const statusCounts = {}
for (const a of byStatus ?? []) {
  statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1
}
console.log('Por status:', statusCounts)

// 3. Appointments hoje
const { data: todayAppts } = await sb
  .from('appointments')
  .select('id, professional_id, start_time, end_time, status, customer_name, service_name, paid_at')
  .eq('business_id', BUSINESS_ID)
  .eq('appointment_date', TODAY)
  .order('start_time')
console.log(`\nHoje (${TODAY}): ${todayAppts?.length ?? 0} agendamentos`)
for (const a of todayAppts ?? []) {
  console.log(`  ${a.start_time.slice(0,5)} · prof:${a.professional_id?.slice(0,8) ?? 'NULL'} · ${a.customer_name ?? '?'} · ${a.service_name ?? '?'} · ${a.status}`)
}

// 4. Profs ativos não-recep
const { data: profs } = await sb
  .from('professionals')
  .select('id, name, is_receptionist, active')
  .eq('business_id', BUSINESS_ID)
  .order('name')
console.log(`\nProfs Palace (${profs?.length ?? 0}):`)
for (const p of profs ?? []) {
  console.log(`  ${p.id.slice(0,8)} · ${p.name} · active:${p.active} · recep:${p.is_receptionist}`)
}

// 5. professional_id distinct dos appointments hoje vs profs cadastrados
if (todayAppts?.length) {
  const profIdsToday = [...new Set(todayAppts.map((a) => a.professional_id))]
  console.log(`\nProf IDs em uso hoje: ${profIdsToday.length}`)
  for (const pid of profIdsToday) {
    const match = profs?.find((p) => p.id === pid)
    console.log(`  ${pid?.slice(0,8) ?? 'NULL'} → ${match ? match.name : 'NÃO BATE COM NENHUM PROF'}`)
  }
}

// 6. Próximos 7 dias de appointments
const sevenDays = new Date(TODAY + 'T00:00:00')
sevenDays.setDate(sevenDays.getDate() + 7)
const sevenDaysStr = sevenDays.toISOString().slice(0, 10)
const { count: weekCount } = await sb
  .from('appointments')
  .select('id', { count: 'exact', head: true })
  .eq('business_id', BUSINESS_ID)
  .gte('appointment_date', TODAY)
  .lte('appointment_date', sevenDaysStr)
console.log(`\nPróximos 7 dias: ${weekCount} agendamentos`)
