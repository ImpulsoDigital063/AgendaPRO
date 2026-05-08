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

const email = 'erlanesannttos@gmail.com'

let allUsers = []
let page = 1
while (true) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
  if (error) { console.error(error); break }
  allUsers.push(...data.users)
  if (data.users.length < 200) break
  page++
}
const u = allUsers.find(x => x.email === email)
if (!u) { console.log('USER NÃO EXISTE'); process.exit(0) }

console.log('USER:', u.id, u.email, 'created:', u.created_at, 'confirmed:', !!u.email_confirmed_at)

const { data: bs } = await admin.from('businesses').select('id,name,slug,owner_id,created_at').eq('owner_id', u.id)
console.log('BUSINESSES:', JSON.stringify(bs, null, 2))

if (bs?.[0]) {
  const { data: ss } = await admin.from('subscriptions').select('*').eq('business_id', bs[0].id)
  console.log('SUBSCRIPTIONS:', JSON.stringify(ss, null, 2))
}
