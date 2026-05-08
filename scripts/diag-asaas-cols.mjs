import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envContent = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Tenta selecionar exatamente o que o checkout-asaas pede
const { data, error } = await admin
  .from('subscriptions')
  .select('id, asaas_customer_id, asaas_subscription_id, status, provider')
  .limit(1)

console.log('SELECT TESTE:')
console.log('  data:', JSON.stringify(data, null, 2))
console.log('  error:', JSON.stringify(error, null, 2))
