/* Dry-run do cron de Metas contra dados reais (só leitura: dry=1 não manda
   push nem grava). Servidor local rodando (next start -p 3077).
   Rodar: node --env-file=.env.local scripts/_prova-metas-avisos-dry.mjs [AAAA-MM-DD ...] */
const base = process.env.BASE ?? 'http://localhost:3077'
const datas = process.argv.slice(2)
const chamadas = datas.length ? datas.map((d) => ['diario', d]) : [['diario', null], ['bateu', null]]
for (const [tipo, hoje] of chamadas) {
  const u = `${base}/api/cron/metas?tipo=${tipo}&dry=1${hoje ? `&hoje=${hoje}` : ''}`
  const r = await fetch(u, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } })
  const j = await r.json()
  console.log(`\n== ${tipo} · hoje=${j.hoje ?? hoje} · HTTP ${r.status} · ${j.total ?? 0} negócio(s)${j.error ? ' · ERRO ' + j.error : ''}`)
  for (const f of j.feito ?? []) {
    const txt = f.texto ? `[${f.tipo}] ${f.titulo} · ${f.texto.replace(/ /g, ' ')} → ${f.url}` : '(nada)'
    console.log(`  ${f.nome} · aparelhos ${f.aparelhos} · ${txt}${f.motivo ? ' · ' + f.motivo : ''}`)
  }
}
