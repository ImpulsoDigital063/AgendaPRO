// Gera chave de API só leitura pra UMA conta (v169 · 21/10/2026).
//   node scripts/_gera-chave-api.mjs <slug> [rótulo]
//   node scripts/_gera-chave-api.mjs --desligar <prefixo>
// A chave sai num .txt na Área de Trabalho (não no terminal: não vai pra
// print nem pra conversa). O banco guarda só o hash.
import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const env = Object.fromEntries(fs.readFileSync('C:/Users/Usuario/agendapro/.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const [arg, extra] = process.argv.slice(2)
if (!arg) { console.log('uso: node scripts/_gera-chave-api.mjs <slug> [rótulo] | --desligar <prefixo>'); process.exit(1) }

if (arg === '--desligar') {
  const { data, error } = await sb.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('key_prefix', extra).is('revoked_at', null).select('key_prefix, revoked_at')
  if (error) throw error
  console.log(data?.length ? `desligada: ${JSON.stringify(data)}` : 'nenhuma chave ativa com esse prefixo')
  process.exit(0)
}

const { data: b, error: bErr } = await sb.from('businesses').select('id, name').eq('slug', arg).single()
if (bErr || !b) { console.log('conta não encontrada:', arg); process.exit(1) }

const chave = 'apk_' + randomBytes(24).toString('base64url')
const prefixo = chave.slice(0, 10)
const { error } = await sb.from('api_keys').insert({
  business_id: b.id,
  key_hash: createHash('sha256').update(chave).digest('hex'),
  key_prefix: prefixo,
  label: extra ?? null,
})
if (error) throw error

// prova na fonte: lê a linha gravada
const { data: lida } = await sb.from('api_keys').select('key_prefix, label, limite_hora, revoked_at, created_at').eq('key_prefix', prefixo).single()
const arquivo = path.join(os.homedir(), 'Desktop', `chave-api-${arg}.txt`)
fs.writeFileSync(arquivo, chave + '\n')
console.log(`${b.name} · gravada no banco: ${JSON.stringify(lida)}`)
console.log(`chave salva em ${arquivo}`)
