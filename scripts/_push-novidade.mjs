// Avisa a base que subiu melhoria no sistema.
//
//   node scripts/_push-novidade.mjs "Titulo" "Texto que aparece na notificacao"
//   node scripts/_push-novidade.mjs "Titulo" "Texto" --enviar
//
// SEM --enviar ele so mostra o alcance (dry run). O disparo real exige a flag,
// de proposito: notificacao no celular de cliente pagante nao se manda por
// engano. O CRON_SECRET sai do .env.local; a rota so aceita esse Bearer.
import fs from 'fs'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); let v = l.slice(i + 1).trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); return [l.slice(0, i).trim(), v] })
)

const args = process.argv.slice(2)
const enviar = args.includes('--enviar')
const [titulo, corpo] = args.filter(a => a !== '--enviar')

if (!titulo || !corpo) {
  console.error('uso: node scripts/_push-novidade.mjs "Titulo" "Texto" [--enviar]')
  process.exit(1)
}

const PROD = 'https://www.agendapro.net.br'
const res = await fetch(PROD + '/api/push/novidade', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${env.CRON_SECRET}` },
  body: JSON.stringify({ titulo, corpo, dry_run: !enviar }),
})
const j = await res.json()

console.log(`HTTP ${res.status}`, j)
if (!enviar) console.log('\n(dry run — nada foi enviado. repita com --enviar pra mandar de verdade)')
