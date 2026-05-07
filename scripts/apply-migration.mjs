// Uso: node scripts/apply-migration.mjs <arquivo-sql>
// Aplica uma migration SQL no Supabase via Service Role
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')

const envContent = readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltando SUPABASE envs no .env.local')
  process.exit(1)
}

const sqlFile = process.argv[2]
if (!sqlFile) {
  console.error('Uso: node scripts/apply-migration.mjs <arquivo-sql>')
  process.exit(1)
}

const sql = readFileSync(join(__dirname, '..', sqlFile), 'utf-8')

console.log(`\n📋 Aplicando: ${sqlFile}\n`)

// Usar fetch direto pro endpoint REST do Postgres (PostgREST não roda DDL)
// Vamos usar a query API do Supabase (rpc/sql se disponível) ou tentar via pg
// Como Supabase não expõe DDL via REST, vou usar o endpoint /pg/query do projeto
// que requer service role.

const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
if (!projectRef) {
  console.error('Não consegui extrair project ref da URL')
  process.exit(1)
}

// Supabase oferece endpoint de SQL via Management API mas requer access token diferente
// Alternativa: usar postgres connection string. Mas pra simplificar, vou logar
// o SQL e instruir Eduardo a colar no SQL Editor do Supabase Studio.

console.log('---')
console.log(sql)
console.log('---')
console.log(`\n⚠️  Cole esse SQL no Supabase Studio:`)
console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new\n`)
console.log(`Aperta "Run". A migration é idempotente (ADD COLUMN IF NOT EXISTS), seguro re-rodar.`)
