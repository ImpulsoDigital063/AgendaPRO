/**
 * Push da novidade da aba Sumidos.
 *
 * TEXTO APROVADO pelo Eduardo em 08/09/2026. Não alterar sem novo OK —
 * push é irreversível: saiu, chegou no aparelho, não tem como apagar.
 *
 * NÃO DISPARA SOZINHO. Sem argumento, só mostra quem receberia:
 *   node scripts/_push-novidade-sumidos.mjs                 → ensaio (não envia)
 *   node scripts/_push-novidade-sumidos.mjs --enviar        → envia pros PAGANTES
 *   node scripts/_push-novidade-sumidos.mjs --enviar --todos → envia pros 20 devices
 */
import fs from 'fs'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  fs.readFileSync('.env.local','utf8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i=l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,'')] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })

const PAYLOAD = {
  titulo: 'AgendaPRO · quem sumiu, e o que fazer',
  corpo: 'Nova aba Sumidos: escolha o prazo, veja quem parou de voltar e chame no WhatsApp.',
  url: '/admin/sumidos',
}

/* Os nove pagantes. Marcela (teste), cortesias e trial parado ficam de fora
   por padrao — novidade pra quem nao usa e' ruido. */
const PAGANTES = ['Olímpio','Rosy','Gessica','Wanessa','Viva Cacheada','Diogo','CAF','Isis','MOOD']

const enviar = process.argv.includes('--enviar')
const todos = process.argv.includes('--todos')

const { data: bizs } = await db.from('businesses').select('id,name')
const nome = new Map((bizs||[]).map(b => [b.id, b.name]))
const idsPagantes = new Set((bizs||[])
  .filter(b => PAGANTES.some(p => (b.name||'').toLowerCase().includes(p.toLowerCase())))
  .map(b => b.id))

const { data: subs } = await db.from('push_subscriptions').select('business_id,endpoint,p256dh,auth')
const alvo = (subs||[]).filter(s => todos ? true : idsPagantes.has(s.business_id))

console.log(`\nTITULO: ${PAYLOAD.titulo}`)
console.log(`CORPO : ${PAYLOAD.corpo}`)
console.log(`DESTINO: ${PAYLOAD.url}\n`)
console.log(`alvo: ${alvo.length} devices ${todos ? '(TODOS)' : '(so pagantes)'}`)
const porNeg = new Map()
for (const s of alvo) porNeg.set(s.business_id, (porNeg.get(s.business_id)||0)+1)
for (const [bid,n] of porNeg) console.log(`  ${n} device(s)  ${nome.get(bid) ?? '(sem negocio)'}`)

if (!enviar) {
  console.log('\nENSAIO — nada foi enviado. Use --enviar pra disparar de verdade.')
  process.exit(0)
}

webpush.setVapidDetails(
  `mailto:${env.VAPID_SUBJECT || 'contato@impulsodigital063.com'}`,
  env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  env.VAPID_PRIVATE_KEY,
)
let ok=0, morto=0, erro=0
for (const s of alvo) {
  try {
    await webpush.sendNotification(
      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
      JSON.stringify(PAYLOAD),
    )
    ok++
  } catch (e) {
    const c = e?.statusCode
    if (c === 404 || c === 410) { morto++; await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint) }
    else { erro++; console.error('  falhou:', nome.get(s.business_id), c) }
  }
}
console.log(`\nenviados: ${ok} · devices mortos removidos: ${morto} · erros: ${erro}`)
