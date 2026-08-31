import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
for (const l of fs.readFileSync('.env.local','utf8').split('\n')) {
  if(!l||l.startsWith('#')||!l.includes('='))continue
  const i=l.indexOf('='); const k=l.slice(0,i).trim()
  if(!process.env[k]) process.env[k]=l.slice(i+1).trim().replace(/^["']|["']$/g,'')
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const ID='cd3c7f5a-e657-4ddb-96c7-0a4ff45b63eb'
const { data: b } = await db.from('businesses')
  .select('avisos_pacote,avisos_unidades,avisos_desde,avisos_ate').eq('id',ID).maybeSingle()
console.log('=== PACOTE NA MARCELA ===')
console.log(JSON.stringify(b,null,1))
const { data: sub } = await db.from('subscriptions').select('asaas_customer_id').eq('business_id',ID).maybeSingle()
console.log('asaas_customer_id:', sub?.asaas_customer_id)
const { data: ml } = await db.from('message_log').select('tipo,status,provider_id,created_at,entregue_em')
  .eq('business_id',ID).order('created_at',{ascending:false}).limit(5)
console.log('\n=== message_log da Marcela ===')
console.log(ml?.length ? ml.map(m=>JSON.stringify(m)).join('\n') : '(nenhuma)')
const { data: r } = await db.from('message_rules').select('tipo,enabled,offset_minutos,template').eq('business_id',ID)
console.log('\n=== message_rules (o que o tab antigo grava) ===')
for(const x of r??[]) console.log(x.tipo.padEnd(18), x.enabled?'ON ':'off', String(x.offset_minutos).padStart(6), '| template:', x.template ? JSON.stringify(x.template.slice(0,45))+'…' : 'null (padrao)')
const { data: t } = await db.from('message_templates_negocio').select('tipo,status,nome_meta').eq('business_id',ID)
console.log('\n=== message_templates_negocio (o que a Meta aprova) ===')
console.log(t?.length ? t.map(x=>JSON.stringify(x)).join('\n') : '(nenhum — usa o texto padrao aprovado)')
