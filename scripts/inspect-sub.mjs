import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
for (const l of env.split(/\r?\n/)) { if (!l||l.startsWith('#')||!l.includes('='))continue; const [k,...r]=l.split('='); if(!process.env[k])process.env[k]=r.join('=').replace(/^"(.*)"$/,'$1') }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data, error } = await sb.from('subscriptions').select('*').limit(1)
if (error) { console.error(error.message); process.exit(1) }
console.log('Sample row keys:', Object.keys(data[0] || {}))
console.log('Sample:', JSON.stringify(data[0], null, 2))
