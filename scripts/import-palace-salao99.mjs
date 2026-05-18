/**
 * Import dados Salão 99 → AgendaPRO · Palace Nail Spa Macaé
 *
 * Rodar:
 *   node --env-file=.env.local scripts/import-palace-salao99.mjs
 *
 * Faz em ordem:
 *   1. SERVIÇOS — parse 41 itens com duração ("2h45" → minutos) + preço
 *   2. CLIENTES — UNION cliente_dados.csv + clients_2026.03.16.xlsx · match por telefone
 *   3. AGENDAMENTOS — Marcado (futuros) + Concluido (histórico). Pula Cancelado.
 *
 * Idempotente via import_external_id e (business_id, name) UNIQUE.
 * Reusa profissionais já cadastrados (Kelle, Sofia, Ariana, Dos Santos Souza, Divina).
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import xlsx from 'xlsx'

const BIZ_ID = 'ee6f0b22-5a46-406a-a3d4-b901551c4261'
const DATA_DIR = './data-imports/palace-salao99'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

// ============================================================
// HELPERS
// ============================================================

function parseDuration(s) {
  // "2h45" → 165 · "2h" → 120 · "45min" → 45 · "0h45" → 45
  if (!s) return 30
  const t = s.toLowerCase().trim()
  const h = t.match(/(\d+)h/)
  const m = t.match(/(\d+)\s*min/) || t.match(/h\s*(\d+)/)
  const hours = h ? parseInt(h[1], 10) : 0
  const mins = m ? parseInt(m[1], 10) : 0
  const total = hours * 60 + mins
  return total > 0 ? total : 30
}

function parsePrice(s) {
  // "240,00" → 240.00 · "55.00" → 55.00
  if (!s) return null
  const cleaned = String(s).replace(/[^\d,.]/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

function normalizePhone(s) {
  // "(22) 99781-2478" → "5522997812478" · "5522999774570" → "5522999774570"
  if (!s) return null
  let digits = String(s).replace(/\D/g, '')
  if (digits.length === 0) return null
  // Remove leading "55" se presente pra padronizar
  if (digits.startsWith('55') && digits.length === 13) {
    return digits  // já tá com DDI
  }
  if (digits.length === 11 || digits.length === 10) {
    return '55' + digits  // adiciona DDI Brasil
  }
  return digits.length >= 8 ? digits : null  // mínimo viável
}

function parseDateYYYYMMDD(s) {
  // "20260429" → "2026-04-29"
  if (!s || s.length !== 8) return null
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}

function parseTimeHHMM(s) {
  // "1815" → "18:15:00" · "0900" → "09:00:00"
  if (!s) return null
  const padded = String(s).padStart(4, '0')
  return `${padded.slice(0, 2)}:${padded.slice(2, 4)}:00`
}

function parseBirthdayBR(s) {
  // "02/12/2000" → "2000-12-02" · "06/05/2003" → "2003-05-06"
  if (!s) return null
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

function parseCSV(text, sep = ';') {
  // Parser simples · NÃO trata aspas escapadas (Salão 99 não usa)
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return []
  const header = lines[0].split(sep).map((h) => h.trim())
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(sep)
    const row = {}
    header.forEach((h, j) => {
      row[h] = (parts[j] ?? '').trim()
    })
    rows.push(row)
  }
  return rows
}

// ============================================================
// FASE 1 · SERVIÇOS
// ============================================================

async function importServices() {
  console.log('\n=== FASE 1 · SERVIÇOS ===')
  const text = readFileSync(`${DATA_DIR}/2635-SERVICO/servico.csv`, 'utf-8')
  const rows = parseCSV(text)
  console.log(`Lidos ${rows.length} serviços do CSV`)

  const serviceMap = new Map() // name → id

  let inserted = 0
  let skipped = 0

  for (const r of rows) {
    const name = (r['Servico'] || '').trim()
    if (!name) {
      skipped++
      continue
    }
    const variation = (r['Variação'] || '').trim()
    const displayName = variation ? `${name} (${variation})` : name
    const price = parsePrice(r['Preço (R$)'])
    const duration = parseDuration(r['Duracao'])

    // Idempotência: se já existe service com mesmo nome no business, pula
    const { data: existing } = await sb
      .from('services')
      .select('id, name')
      .eq('business_id', BIZ_ID)
      .eq('name', displayName)
      .maybeSingle()

    if (existing) {
      serviceMap.set(displayName.toLowerCase(), existing.id)
      serviceMap.set(name.toLowerCase(), existing.id) // alias sem variação
      skipped++
      continue
    }

    const { data, error } = await sb
      .from('services')
      .insert({
        business_id: BIZ_ID,
        name: displayName,
        price,
        duration_minutes: duration,
        active: true,
        points: 0,
        description: r['Categoria'] ? `${r['Categoria']}` : null,
      })
      .select()
      .single()

    if (error) {
      console.error(`  ERRO ${displayName}: ${error.message}`)
      skipped++
      continue
    }
    serviceMap.set(displayName.toLowerCase(), data.id)
    serviceMap.set(name.toLowerCase(), data.id)
    inserted++
  }

  console.log(`  Inseridos: ${inserted} · pulados (já existiam): ${skipped}`)
  return serviceMap
}

// ============================================================
// FASE 2 · CLIENTES (UNION XLSX + CSV)
// ============================================================

async function importCustomers() {
  console.log('\n=== FASE 2 · CLIENTES ===')

  // 2a · Lê XLSX (642 clientes com telefone)
  const wb = xlsx.readFile(`${DATA_DIR}/clients_2026.03.16 (1) (1).xlsx`)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const xlsxRows = xlsx.utils.sheet_to_json(ws, { header: 1 }).slice(1) // pula header
  console.log(`XLSX: ${xlsxRows.length} linhas`)

  // 2b · Lê CSV (986 clientes, alguns com email/birthday)
  const csvText = readFileSync(`${DATA_DIR}/2635-CLIENTE/cliente_dados.csv`, 'utf-8')
  const csvRows = parseCSV(csvText)
  console.log(`CSV: ${csvRows.length} linhas`)

  // 2c · Merge por nome + telefone
  // Estratégia: indexar CSV por nome (lowercase) pra enriquecer XLSX
  const csvByName = new Map()
  const csvByPhone = new Map()
  const csvById = new Map()
  for (const r of csvRows) {
    const id = r.id_cliente
    const name = (r.nome || '').toLowerCase().trim()
    const phone = normalizePhone(r.telefone_1)
    if (id) csvById.set(id, r)
    if (name) csvByName.set(name, r)
    if (phone) csvByPhone.set(phone, r)
  }

  // Customers a inserir: union de XLSX (phone-based) + CSV-only (sem phone)
  const customers = new Map() // phone → record
  const phonelessCustomers = [] // sem phone (do CSV apenas)

  // 2c.1 · Processa XLSX (todos têm phone)
  for (const row of xlsxRows) {
    const firstName = (row[0] || '').toString().trim()
    const surname = (row[1] || '').toString().trim()
    const rawPhone = (row[2] || '').toString().trim()
    const phone = normalizePhone(rawPhone)
    if (!phone || !firstName) continue

    const fullName = [firstName, surname].filter(Boolean).join(' ').trim()
    const csvMatch = csvByPhone.get(phone) || csvByName.get(fullName.toLowerCase())

    customers.set(phone, {
      name: fullName,
      phone,
      email: csvMatch?.email || null,
      birthday: parseBirthdayBR(csvMatch?.data_nascimento),
      import_external_id: csvMatch?.id_cliente || null,
    })
  }

  // 2c.2 · CSV-only (não está no XLSX · sem telefone também)
  for (const r of csvRows) {
    if (!r.nome || !r.nome.trim()) continue
    const phone = normalizePhone(r.telefone_1)
    if (phone && customers.has(phone)) continue // já tem
    if (phone) {
      // Phone novo do CSV (não tava no XLSX)
      customers.set(phone, {
        name: r.nome.trim(),
        phone,
        email: r.email || null,
        birthday: parseBirthdayBR(r.data_nascimento),
        import_external_id: r.id_cliente,
      })
    } else {
      // Sem phone — pra preservar id_cliente, vamos importar com phone sintético
      phonelessCustomers.push({
        name: r.nome.trim(),
        phone: null,
        email: r.email || null,
        birthday: parseBirthdayBR(r.data_nascimento),
        import_external_id: r.id_cliente,
      })
    }
  }

  console.log(
    `Pra inserir: ${customers.size} com phone + ${phonelessCustomers.length} sem phone (pulados)`,
  )

  let inserted = 0
  let skipped = 0
  const customerIdByExternalId = new Map() // id_cliente_salao99 → AgendaPRO id
  const customerIdByPhone = new Map()
  const customerIdByName = new Map()
  const usedExternalIds = new Set() // pra evitar duplicate UNIQUE constraint

  for (const c of customers.values()) {
    // Idempotência: phone UNIQUE constraint em customers(business_id, phone)
    const { data: existing } = await sb
      .from('customers')
      .select('id, name')
      .eq('business_id', BIZ_ID)
      .eq('phone', c.phone)
      .maybeSingle()

    if (existing) {
      customerIdByPhone.set(c.phone, existing.id)
      if (c.import_external_id) customerIdByExternalId.set(c.import_external_id, existing.id)
      customerIdByName.set(c.name.toLowerCase(), existing.id)
      skipped++
      continue
    }

    // Evita duplicate em import_external_id (vários records do XLSX podem
    // bater com mesmo csvMatch.id_cliente · UNIQUE constraint quebraria)
    const externalId =
      c.import_external_id && !usedExternalIds.has(c.import_external_id)
        ? c.import_external_id
        : null
    if (externalId) usedExternalIds.add(externalId)

    const { data, error } = await sb
      .from('customers')
      .insert({
        business_id: BIZ_ID,
        name: c.name,
        phone: c.phone,
        email: c.email,
        birthday: c.birthday,
        import_source: 'salao99',
        import_external_id: externalId,
        imported_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error(`  ERRO ${c.name} (${c.phone}): ${error.message}`)
      skipped++
      continue
    }
    customerIdByPhone.set(c.phone, data.id)
    if (externalId) customerIdByExternalId.set(externalId, data.id)
    customerIdByName.set(c.name.toLowerCase(), data.id)
    inserted++
  }

  console.log(`  Inseridos: ${inserted} · pulados: ${skipped} · phoneless ignorados: ${phonelessCustomers.length}`)
  return { customerIdByExternalId, customerIdByPhone, customerIdByName }
}

// ============================================================
// FASE 3 · AGENDAMENTOS
// ============================================================

async function importAppointments(serviceMap, customerMaps) {
  console.log('\n=== FASE 3 · AGENDAMENTOS ===')
  const text = readFileSync(`${DATA_DIR}/2635-ATENDIMENTO/atendimento.csv`, 'utf-8')
  const rows = parseCSV(text)
  console.log(`Lidos ${rows.length} agendamentos do CSV`)

  // Fetch professionals (nome → id) — usa lower pra matching case-insensitive
  const { data: profs } = await sb
    .from('professionals')
    .select('id, name, is_receptionist')
    .eq('business_id', BIZ_ID)
  const profMap = new Map()
  for (const p of profs) {
    if (p.is_receptionist) continue
    profMap.set(p.name.toLowerCase(), p.id)
  }
  console.log(`Profissionais ativos: ${[...profMap.keys()].join(', ')}`)

  const STATUS_MAP = {
    Concluido: 'completed',
    Marcado: 'confirmed',
    Cancelado: null, // pula
  }

  const skipReasons = { cancelled: 0, no_prof: 0, no_service: 0, no_customer: 0, no_date: 0, error: 0 }
  let inserted = 0

  for (const r of rows) {
    const status = STATUS_MAP[r.status]
    if (status === null || status === undefined) {
      skipReasons.cancelled++
      continue
    }

    const profId = profMap.get((r.colaborador || '').toLowerCase().trim())
    if (!profId) {
      skipReasons.no_prof++
      continue
    }

    const serviceName = (r.servico || '').trim()
    const serviceId = serviceMap.get(serviceName.toLowerCase())
    // service_id é opcional — se não tem, mantém service_name como text

    // Cliente: tenta external_id → phone → name
    let customerId = null
    let customerName = (r.cliente || '').trim()
    let customerPhone = null
    if (r.id_cliente && customerMaps.customerIdByExternalId.has(r.id_cliente)) {
      customerId = customerMaps.customerIdByExternalId.get(r.id_cliente)
    }
    // Se não tem id_cliente match, tenta por nome
    if (!customerId && customerName) {
      customerId = customerMaps.customerIdByName.get(customerName.toLowerCase())
    }

    if (customerId) {
      // Busca phone do cliente importado pra preencher client_phone (legacy obrigatório)
      const { data: cust } = await sb
        .from('customers')
        .select('phone')
        .eq('id', customerId)
        .single()
      customerPhone = cust?.phone || '00000000000'
    } else {
      // Cliente não encontrado — pula
      skipReasons.no_customer++
      continue
    }

    const date = parseDateYYYYMMDD(r.data)
    const start = parseTimeHHMM(r.horario_inicio)
    const end = parseTimeHHMM(r.horario_termino)

    if (!date || !start || !end) {
      skipReasons.no_date++
      continue
    }

    const totalPrice = parsePrice(r.valor_total)

    const { error } = await sb.from('appointments').insert({
      business_id: BIZ_ID,
      professional_id: profId,
      client_name: customerName.substring(0, 100), // limite text
      client_phone: customerPhone || '00000000000',
      customer_id: customerId,
      appointment_date: date,
      start_time: start,
      end_time: end,
      status,
      service_id: serviceId || null,
      service_name: serviceName.substring(0, 100),
      total_price: totalPrice,
      notes: 'Importado do Salão 99',
    })

    if (error) {
      skipReasons.error++
      if (skipReasons.error < 5) console.error(`  ERRO appt ${customerName} ${date} ${start}: ${error.message}`)
      continue
    }
    inserted++
  }

  console.log(`  Inseridos: ${inserted}`)
  console.log(`  Pulados:`, skipReasons)
}

// ============================================================
// MAIN
// ============================================================

console.log('Import Salão 99 → Palace Nail Spa Macaé')
console.log(`business_id: ${BIZ_ID}`)

const serviceMap = await importServices()
const customerMaps = await importCustomers()
await importAppointments(serviceMap, customerMaps)

console.log('\nImport concluído.')
