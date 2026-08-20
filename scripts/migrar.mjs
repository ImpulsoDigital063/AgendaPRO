/**
 * Aplica migration SQL no Supabase do AGENDAPRO via Management API.
 *
 *   node scripts/migrar.mjs supabase/migrations/v124_caf_isolamento.sql
 *   node scripts/migrar.mjs <arquivo> --dry     (só mostra o SQL, não executa)
 *
 * Precisa de SUPABASE_ACCESS_TOKEN no .env.local (token pessoal, gerado em
 * https://supabase.com/dashboard/account/tokens · revogável na mesma tela).
 * A chave de serviço NÃO serve: PostgREST não executa DDL.
 *
 * TRAVA DE PROJETO: só roda no ref do AgendaPRO. Já aconteceu de ferramenta
 * apontar pro projeto errado nessa máquina (o MCP está pinado em outro), e
 * migration no banco errado é estrago que não desfaz.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, '.env.local'), 'utf-8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      let v = l.slice(i + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      return [l.slice(0, i).trim(), v]
    })
)

const AGENDAPRO_REF = 'aazvqjhebfcoruyipoaw'

const arquivo = process.argv[2]
const dry = process.argv.includes('--dry')
if (!arquivo) {
  console.error('uso: node scripts/migrar.mjs <arquivo.sql> [--dry]')
  process.exit(1)
}

const refDoEnv = env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
if (refDoEnv !== AGENDAPRO_REF) {
  console.error(`ABORTADO · o .env.local aponta pra "${refDoEnv}", e este script só roda no AgendaPRO (${AGENDAPRO_REF}).`)
  process.exit(1)
}

const token = env.SUPABASE_ACCESS_TOKEN
if (!token) {
  console.error('ABORTADO · falta SUPABASE_ACCESS_TOKEN no .env.local.')
  console.error('Gere em https://supabase.com/dashboard/account/tokens e cole como SUPABASE_ACCESS_TOKEN=sbp_...')
  process.exit(1)
}

const sql = readFileSync(resolve(ROOT, arquivo), 'utf-8')
console.log(`\n${arquivo} · ${sql.split('\n').length} linhas · projeto ${AGENDAPRO_REF}\n`)

if (dry) {
  console.log(sql)
  console.log('\n(--dry · nada foi executado)')
  process.exit(0)
}

const res = await fetch(`https://api.supabase.com/v1/projects/${AGENDAPRO_REF}/database/query`, {
  method: 'POST',
  headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  body: JSON.stringify({ query: sql }),
})

const texto = await res.text()
if (!res.ok) {
  console.error(`FALHOU · HTTP ${res.status}`)
  console.error(texto.slice(0, 1200))
  process.exit(1)
}

console.log(`OK · HTTP ${res.status}`)
try {
  const json = JSON.parse(texto)
  console.log(JSON.stringify(json, null, 1).slice(0, 2000))
} catch {
  console.log(texto.slice(0, 2000))
}
console.log('\nMigration aplicada. Conferir SEMPRE lendo o banco depois — resposta OK não é prova de estado.')
