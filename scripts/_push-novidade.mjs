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

// --url=/admin/financeiro/sinal → onde o toque na notificacao abre. Sem isso
// cai em /admin (a agenda), o que joga a pessoa longe do que o aviso falou.
const args = process.argv.slice(2)
const enviar = args.includes('--enviar')
const url = (args.find(a => a.startsWith('--url=')) || '').slice(6) || undefined
// --sinal → manda SO pra quem tem sinal ligado (dono + profissionais desses
// negocios). Novidade de sinal no celular de quem nao cobra sinal e ruido, e
// ruido ensina a ignorar a proxima notificacao — inclusive a que importa.
const somenteSinal = args.includes('--sinal')
// --slug=studio-marcela → manda so pra esse negocio. Use pra ver como chega
// antes de disparar pra base: push nao tem desfazer.
const slug = (args.find(a => a.startsWith('--slug=')) || '').slice(7) || undefined
const [titulo, corpo] = args.filter(a => !a.startsWith('--'))

if (!titulo || !corpo) {
  console.error('uso: node scripts/_push-novidade.mjs "Titulo" "Texto" [--enviar]')
  process.exit(1)
}

const PROD = 'https://www.agendapro.net.br'
const res = await fetch(PROD + '/api/push/novidade', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${env.CRON_SECRET}` },
  body: JSON.stringify({ titulo, corpo, url, dry_run: !enviar, somenteSinal, slug }),
})
const j = await res.json()

console.log(`HTTP ${res.status}`, j)
if (!enviar) console.log('\n(dry run — nada foi enviado. repita com --enviar pra mandar de verdade)')
