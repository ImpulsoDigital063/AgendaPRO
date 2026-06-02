import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, '.env.local'), 'utf-8')
    .split('\n').filter((l) => l.trim() && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); let v = l.slice(i + 1).trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); return [l.slice(0, i).trim(), v] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data: bizs } = await db.from('businesses').select('id, name, slug').order('created_at')
// prefere demo/teste/qa/imperio
const pref = bizs.find((b) => /demo|teste|test|qa|imp[ée]rio/i.test(`${b.name} ${b.slug}`)) || bizs[0]
console.log('BUSINESSES:', bizs.map((b) => `${b.slug} (${b.name})`).join(' · '))
console.log('\nESCOLHIDO:', pref.slug, '·', pref.id)

const { data: profs } = await db.from('professionals').select('id, name, active').eq('business_id', pref.id).eq('active', true)
const { data: wh } = await db.from('working_hours').select('professional_id, day_of_week, start_time, end_time').in('professional_id', (profs || []).map((p) => p.id))
const prof = (profs || []).find((p) => (wh || []).some((w) => w.professional_id === p.id))
const { data: svcs } = await db.from('services').select('id, name, price, duration_minutes, points, active').eq('business_id', pref.id).eq('active', true).limit(1)

console.log('PROFISSIONAL:', prof?.name, '·', prof?.id)
console.log('WH do prof:', (wh || []).filter((w) => w.professional_id === prof?.id).map((w) => `dow${w.day_of_week} ${w.start_time}-${w.end_time}`).join(' · '))
console.log('SERVICO:', svcs?.[0]?.name, '·', svcs?.[0]?.id, '·', svcs?.[0]?.duration_minutes, 'min')
console.log('\nJSON:', JSON.stringify({ businessId: pref.id, slug: pref.slug, professionalId: prof?.id, service: svcs?.[0], wh: (wh || []).filter((w) => w.professional_id === prof?.id) }))
