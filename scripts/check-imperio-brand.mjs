import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envContent = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data, error } = await sb
  .from('businesses')
  .select('name, slug, brand_primary, brand_secondary, brand_mode, logo_url')
  .eq('slug', 'imperio-barbershop')
  .single()

if (error) console.error('ERROR:', error)
console.log('=== Império no banco ===')
console.log('name:', data?.name)
console.log('brand_primary:', data?.brand_primary)
console.log('brand_secondary:', data?.brand_secondary)
console.log('brand_mode:', data?.brand_mode)
console.log('logo_url:', data?.logo_url?.slice(0, 60) + '...')
console.log('logo length:', data?.logo_url?.length)
