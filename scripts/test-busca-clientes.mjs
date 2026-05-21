#!/usr/bin/env node
/**
 * Teste E2E da busca de clientes com normalização de acentos.
 *
 * 1. Busca via Supabase os customers/clients da demo Império Barbershop
 * 2. Aplica a função stripAccents (mesma do ClientesView.tsx)
 * 3. Testa 5 buscas reais que ANTES falhavam e agora devem passar
 *
 * Roda: node scripts/test-busca-clientes.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf8')
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const stripAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

async function main() {
  console.log('━━━ TESTE E2E · busca de clientes ━━━\n')

  // 1. Pega business Império
  const { data: biz } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('slug', 'imperio-barbershop')
    .single()
  console.log(`Business: ${biz.name} (${biz.id})\n`)

  // 2. Pega TODOS os customers do business
  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, phone, email')
    .eq('business_id', biz.id)
    .order('name')
  console.log(`Total customers: ${customers.length}\n`)

  // 3. Identifica clientes com acentos (pra testar)
  const comAcento = customers.filter((c) => /[áàâãäéèêíïóôõöúüçñ]/i.test(c.name || ''))
  console.log(`Clientes COM acento no nome: ${comAcento.length}`)
  comAcento.slice(0, 10).forEach((c) => console.log(`  · ${c.name}`))
  console.log('')

  // 4. Testa busca ANTIGA (sem stripAccents) vs NOVA
  const queriesTeste = [
    'joao',      // deve achar João
    'andre',     // deve achar André
    'fatima',    // deve achar Fátima
    'antonio',   // deve achar Antônio
    'felipe',    // controle · sem acento original
    'maria',     // controle
  ]

  console.log('━━━ Simulação ANTES vs DEPOIS do fix ━━━\n')
  for (const q of queriesTeste) {
    const qLower = q.toLowerCase()
    const qNorm = stripAccents(qLower)

    // ANTES · simples toLowerCase
    const antes = customers.filter((c) =>
      (c.name || '').toLowerCase().includes(qLower)
    )

    // DEPOIS · com stripAccents
    const depois = customers.filter((c) => {
      const nameNorm = stripAccents((c.name || '').toLowerCase())
      return nameNorm.includes(qNorm)
    })

    const ganho = depois.length - antes.length
    const status = ganho > 0 ? '🟢 FIX FUNCIONOU' : ganho === 0 && depois.length > 0 ? '⚪ já achava' : ganho === 0 ? '❌ não acha' : '?'
    console.log(`Busca "${q}":`)
    console.log(`  Antes: ${antes.length} resultados`)
    console.log(`  Depois: ${depois.length} resultados  ${status}`)
    if (ganho > 0) {
      console.log(`  Novos achados:`)
      const novos = depois.filter((d) => !antes.find((a) => a.id === d.id))
      novos.slice(0, 5).forEach((c) => console.log(`    + ${c.name}`))
    }
    console.log('')
  }

  console.log('━━━ FIM ━━━')
}

main().catch((e) => {
  console.error('ERRO:', e.message)
  process.exit(1)
})
