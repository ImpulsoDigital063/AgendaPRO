/**
 * Import despesas Salão 99 → AgendaPRO · Palace Nail Spa Macaé
 *
 * Pre-requisito: rodar migration v59 (coluna import_external_id em expenses)
 *
 * Rodar:
 *   node --env-file=.env.local scripts/import-despesas-palace.mjs
 *
 * Espera CSV em ./data-imports/palace-salao99/2635-DESPESA/palace-despesas-salao99.csv
 *
 * Formato esperado (gerado pelo CIC):
 *   occurred_at,name,amount,category,recurring,notes
 *   2026-04-10,"Aluguel abril",2800.00,rent,true,"Boleto pago via Itaú"
 *
 * Idempotente via import_external_id = sha1(name|occurred_at|amount).
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const BIZ_ID = 'ee6f0b22-5a46-406a-a3d4-b901551c4261'
const CSV_PATH = './data-imports/palace-salao99/2635-DESPESA/palace-despesas-salao99.csv'

const VALID_CATEGORIES = new Set([
  'rent', 'products', 'salary', 'utilities', 'marketing', 'taxes', 'other',
])

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

// ============================================================
// CSV PARSER · trata aspas duplas escapadas ("...")
// ============================================================

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return []

  const parseLine = (line) => {
    const out = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
        else { inQuotes = !inQuotes }
      } else if (ch === ',' && !inQuotes) {
        out.push(cur); cur = ''
      } else {
        cur += ch
      }
    }
    out.push(cur)
    return out.map((s) => s.trim())
  }

  const header = parseLine(lines[0])
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const parts = parseLine(lines[i])
    const row = {}
    header.forEach((h, j) => { row[h] = (parts[j] ?? '').trim() })
    rows.push(row)
  }
  return rows
}

// ============================================================
// HELPERS
// ============================================================

function parseAmount(s) {
  if (!s) return null
  const cleaned = String(s).replace(/[^\d,.]/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) || n <= 0 ? null : Math.round(n * 100) / 100
}

function parseBool(s) {
  if (!s) return false
  const v = String(s).toLowerCase().trim()
  return v === 'true' || v === '1' || v === 'sim' || v === 'yes'
}

function parseDateISO(s) {
  if (!s) return null
  const t = String(s).trim()
  // ja vem YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  // DD/MM/YYYY
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return null
}

function externalId({ name, occurred_at, amount }) {
  const key = `${name}|${occurred_at}|${amount.toFixed(2)}`
  return 'salao99-' + createHash('sha1').update(key).digest('hex').slice(0, 16)
}

// ============================================================
// IMPORT
// ============================================================

async function importDespesas() {
  console.log('\n=== IMPORT DESPESAS PALACE · Salão 99 → AgendaPRO ===\n')

  let text
  try {
    text = readFileSync(CSV_PATH, 'utf-8')
  } catch (e) {
    console.error(`ERRO: não consegui ler ${CSV_PATH}`)
    console.error(`  Pede pro CIC salvar o CSV em data-imports/palace-salao99/2635-DESPESA/`)
    process.exit(1)
  }

  const rows = parseCSV(text)
  console.log(`Lidas ${rows.length} linhas do CSV\n`)

  let inserted = 0
  let updated = 0
  let skipped = 0
  let errors = 0
  const categoryTotals = {}
  const skippedReasons = []

  for (const r of rows) {
    const name = (r.name || '').trim()
    const occurred_at = parseDateISO(r.occurred_at)
    const amount = parseAmount(r.amount)
    let category = (r.category || 'other').toLowerCase().trim()
    const recurring = parseBool(r.recurring)
    const notes = (r.notes || '').trim() || null

    // Validacoes minimas
    if (!name) { skipped++; skippedReasons.push(`linha sem name: ${JSON.stringify(r)}`); continue }
    if (!occurred_at) { skipped++; skippedReasons.push(`${name}: data invalida "${r.occurred_at}"`); continue }
    if (!amount) { skipped++; skippedReasons.push(`${name}: valor invalido "${r.amount}"`); continue }
    if (!VALID_CATEGORIES.has(category)) {
      console.warn(`  WARN ${name}: categoria "${category}" invalida → forcando "other"`)
      category = 'other'
    }

    const ext_id = externalId({ name, occurred_at, amount })

    const { data: existing } = await sb
      .from('expenses')
      .select('id')
      .eq('business_id', BIZ_ID)
      .eq('import_external_id', ext_id)
      .maybeSingle()

    if (existing) {
      const { error: updateErr } = await sb
        .from('expenses')
        .update({ name, amount, category, occurred_at, recurring, notes })
        .eq('id', existing.id)
      if (updateErr) {
        console.error(`  ERRO update ${name}: ${updateErr.message}`)
        errors++
        continue
      }
      updated++
    } else {
      const { error: insertErr } = await sb
        .from('expenses')
        .insert({
          business_id: BIZ_ID,
          name,
          amount,
          category,
          occurred_at,
          recurring,
          notes,
          import_external_id: ext_id,
        })
      if (insertErr) {
        console.error(`  ERRO insert ${name}: ${insertErr.message}`)
        errors++
        continue
      }
      inserted++
    }

    categoryTotals[category] = (categoryTotals[category] || 0) + amount
  }

  console.log('\n=== RESUMO ===')
  console.log(`  Inseridos: ${inserted}`)
  console.log(`  Atualizados: ${updated}`)
  console.log(`  Pulados: ${skipped}`)
  console.log(`  Erros: ${errors}`)
  console.log('\n=== TOTAL POR CATEGORIA ===')
  for (const [cat, total] of Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(12)} R$ ${total.toFixed(2)}`)
  }
  const grandTotal = Object.values(categoryTotals).reduce((s, v) => s + v, 0)
  console.log(`  ${'TOTAL'.padEnd(12)} R$ ${grandTotal.toFixed(2)}`)

  if (skippedReasons.length > 0) {
    console.log('\n=== LINHAS PULADAS ===')
    skippedReasons.slice(0, 20).forEach((r) => console.log(`  - ${r}`))
    if (skippedReasons.length > 20) console.log(`  ... e mais ${skippedReasons.length - 20}`)
  }
}

importDespesas().catch((e) => {
  console.error('FALHA:', e)
  process.exit(1)
})
