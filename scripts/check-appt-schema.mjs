import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data, error } = await sb
  .from('appointments')
  .select('*')
  .eq('business_id', 'ee6f0b22-5a46-406a-a3d4-b901551c4261')
  .limit(1)
if (error) console.error('ERRO:', error)
if (data?.[0]) {
  console.log('Colunas em appointments:')
  console.log(Object.keys(data[0]).sort().join(' · '))
  console.log('\nExemplo de registro:')
  console.log(JSON.stringify(data[0], null, 2))
}
