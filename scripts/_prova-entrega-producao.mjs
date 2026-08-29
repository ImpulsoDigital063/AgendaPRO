/* PROVA DE PONTA A PONTA no número de PRODUÇÃO.
 *
 *   node scripts/_prova-entrega-producao.mjs 5599992065961
 *
 * Manda hello_world (o único APPROVED enquanto os nossos estão em análise),
 * grava no message_log com o provider_id e depois LÊ A ROW pra ver se o
 * webhook escreveu entregue_em.
 *
 * É a primeira vez que dá pra provar ENTREGA em vez de acreditar no aceite:
 * o app só foi publicado agora, e sem publicação a Meta não manda status de
 * produção pro webhook.
 */
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]),
)
const destino = process.argv[2]
if (!destino) {
  console.log('uso: node scripts/_prova-entrega-producao.mjs 5599992065961')
  process.exit(1)
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

console.log('de: ' + env.WHATSAPP_PHONE_NUMBER_ID + '  para: ' + destino)

const res = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + env.WHATSAPP_TOKEN, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messaging_product: 'whatsapp',
    to: destino,
    type: 'template',
    template: { name: 'hello_world', language: { code: 'en_US' } },
  }),
})
const j = await res.json().catch(() => null)
if (!res.ok) {
  console.log('RECUSADO HTTP ' + res.status)
  console.log(JSON.stringify(j?.error ?? j, null, 1))
  process.exit(1)
}
const providerId = j?.messages?.[0]?.id
console.log('aceito · provider_id ' + providerId)

/* A linha precisa existir com o provider_id pro webhook achar: ele procura
   por `.eq('provider_id', id)`. Sem ela, o status chega e não tem onde
   escrever — que é como o "enviado" virava mentira antes. */
const chave = 'prova_entrega:' + Date.now()
const { error } = await db.from('message_log').insert({
  chave,
  tipo: 'confirmacao',
  canal: 'whatsapp',
  destino,
  status: 'enviado',
  provider_id: providerId,
  unidades: 1,
})
console.log('message_log gravado: ' + (error ? 'ERRO ' + error.message : 'ok'))

console.log('\nlendo a row a cada 5s (o webhook escreve quando a Meta avisa)...')
for (let i = 1; i <= 12; i++) {
  await new Promise((r) => setTimeout(r, 5000))
  const { data } = await db
    .from('message_log')
    .select('status, entregue_em, lido_em, falhou_em, falha_motivo')
    .eq('chave', chave)
    .maybeSingle()
  const l = data ?? {}
  console.log(
    `  ${String(i * 5).padStart(2)}s  status=${l.status}` +
      `  entregue=${l.entregue_em ? 'SIM' : '-'}` +
      `  lido=${l.lido_em ? 'SIM' : '-'}` +
      (l.falhou_em ? `  FALHOU: ${l.falha_motivo}` : ''),
  )
  if (l.entregue_em || l.falhou_em) {
    console.log(
      l.entregue_em
        ? '\nPROVADO: a Meta confirmou ENTREGA e o webhook gravou no banco.'
        : '\nFALHOU na entrega — e agora a gente SABE, em vez de achar que enviou.',
    )
    process.exit(0)
  }
}
console.log('\nSem confirmação em 60s. Ou o webhook não recebeu, ou a Meta ainda não mandou o status.')
console.log('Confira no aparelho: se a mensagem chegou mas o banco não gravou, o problema é o webhook.')
