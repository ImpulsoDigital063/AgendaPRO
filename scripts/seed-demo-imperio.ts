/**
 * SEED — Império Barbershop (demo realista pra apresentação/marketing)
 *
 * Cria UMA conta operando há 30 dias com padrões reais de barbearia
 * popular brasileira: sábado pico, segunda fraca, clientes VIP que
 * voltam toda 3 semanas, alguns sumidos pra Reativar Sumidos brilhar.
 *
 * Roda com:  npx tsx scripts/seed-demo-imperio.ts
 *
 * Idempotente: apaga business com slug 'imperio-barbershop' antes
 * de recriar — pode rodar de novo pra resetar.
 *
 * Credenciais geradas:
 *   email: demo-imperio@agendapro.net.br
 *   senha: AgendaPRO@2026
 *   slug:  imperio-barbershop
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Lê .env.local manualmente (sem dependência de dotenv).
const envPath = resolve(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf8')
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1')
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('ERRO: faltam env vars NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

// ============================================================
// CONFIGURAÇÃO DO NEGÓCIO
// ============================================================

// Logo SVG inline — emblema "I.B." em escudo dourado sobre preto.
// Tipografia serifada premium, navalha discreta na base. Funciona em
// data URI (img src direto, sem next/Image).
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E8C77E"/>
      <stop offset="55%" stop-color="#C9A961"/>
      <stop offset="100%" stop-color="#9C7E3E"/>
    </linearGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1F1F1F"/>
      <stop offset="100%" stop-color="#0A0A0A"/>
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="96" fill="url(#bg)" stroke="url(#gold)" stroke-width="3"/>
  <circle cx="100" cy="100" r="84" fill="none" stroke="url(#gold)" stroke-width="0.8" opacity="0.6"/>
  <text x="100" y="78" font-family="Georgia, 'Times New Roman', serif" font-size="20" font-weight="700" fill="url(#gold)" text-anchor="middle" letter-spacing="3">IMPÉRIO</text>
  <line x1="40" y1="92" x2="80" y2="92" stroke="url(#gold)" stroke-width="1"/>
  <line x1="120" y1="92" x2="160" y2="92" stroke="url(#gold)" stroke-width="1"/>
  <text x="100" y="112" font-family="Georgia, 'Times New Roman', serif" font-size="44" font-weight="900" fill="url(#gold)" text-anchor="middle" letter-spacing="-1">I.B.</text>
  <text x="100" y="135" font-family="Georgia, 'Times New Roman', serif" font-size="11" font-style="italic" fill="url(#gold)" text-anchor="middle" letter-spacing="6" opacity="0.95">BARBERSHOP</text>
  <g transform="translate(100, 158)">
    <line x1="-22" y1="0" x2="-6" y2="0" stroke="url(#gold)" stroke-width="1.2"/>
    <path d="M -6 0 L 0 -3 L 6 0 L 0 3 Z" fill="url(#gold)"/>
    <line x1="6" y1="0" x2="22" y2="0" stroke="url(#gold)" stroke-width="1.2"/>
  </g>
  <text x="100" y="178" font-family="Arial, sans-serif" font-size="8" fill="url(#gold)" text-anchor="middle" letter-spacing="2" opacity="0.7">EST. 2024</text>
</svg>`

const LOGO_DATA_URL = `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString('base64')}`

// Capa: foto real de barbearia premium do Unsplash (free CC0).
// URL direta do CDN Unsplash com params de otimização (1600x900 crop).
const COVER_URL = 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1600&h=900&fit=crop&q=80'

const DEMO = {
  email: 'demo-imperio@agendapro.net.br',
  password: 'AgendaPRO@2026',
  slug: 'imperio-barbershop',
  business: {
    name: 'Império Barbershop',
    description: 'barbearia',
    phone: '63999991010',
    address: 'Rua das Palmeiras, 234 — Centro, Palmas-TO',
    logo_url: LOGO_DATA_URL,
    cover_url: COVER_URL,
    brand_primary: '#0A0A0A',   // preto absoluto
    brand_secondary: '#C9A961', // dourado premium
    brand_mode: 'dark',
    points_for_review: 50,
    points_for_referral: 30,
    punctuality_bonus_points: 10,
    slot_interval_minutes: 30,
    instagram_url: 'https://instagram.com/imperio.barbershop',
  },
  ownerName: 'Carlos Almeida',
}

const PROFESSIONALS = [
  {
    name: 'Carlos Almeida',
    email: DEMO.email,
    isOwner: true,
    employment_type: 'commissioned',
    commission_percentage: 0, // dono recebe 100%, comissão 0 implícita
  },
  {
    name: 'Rafael Santos',
    email: 'rafael.santos@imperio.demo',
    isOwner: false,
    employment_type: 'commissioned',
    commission_percentage: 50,
  },
  {
    name: 'Bruno Costa',
    email: 'bruno.costa@imperio.demo',
    isOwner: false,
    employment_type: 'commissioned',
    commission_percentage: 50,
  },
]

// Catálogo realista de barbearia premium acessível.
// Pesos calibrados pra ticket médio ~R$44 (atinge R$13k mês com volume real).
const SERVICES = [
  { name: 'Corte Simples',     price: 30, duration: 30, points: 30, weight: 22 },
  { name: 'Corte + Barba',     price: 50, duration: 60, points: 60, weight: 32 },
  { name: 'Barba Tradicional', price: 25, duration: 30, points: 25, weight: 13 },
  { name: 'Corte Degradê',     price: 45, duration: 45, points: 45, weight: 18 },
  { name: 'Sobrancelha',       price: 15, duration: 20, points: 15, weight: 3 },
  { name: 'Pigmentação Capilar', price: 80, duration: 60, points: 80, weight: 12 },
]

// Pool de nomes brasileiros realistas pra distribuir entre 50 clientes.
// Mistura de clientes VIP recorrentes, novos, e sumidos.
const CLIENT_NAMES = [
  // VIPs (vão aparecer várias vezes — 6+ atendimentos no mês)
  'João Pedro Silva',     'Marcelo Oliveira',     'Lucas Ferreira',
  'Rodrigo Almeida',      'Felipe Costa',         'Diego Martins',
  // Recorrentes (3-5 atendimentos)
  'Tiago Souza',          'Bruno Pereira',        'André Lima',
  'Vinícius Carvalho',    'Gabriel Ribeiro',      'Eduardo Santos',
  'Henrique Barbosa',     'Matheus Cardoso',      'Pedro Henrique',
  'Rafael Mendes',        'Caio Nascimento',      'Daniel Rocha',
  // Casuais (1-2 atendimentos)
  'Bernardo Rodrigues',   'Arthur Carvalho',      'Davi Souza',
  'Heitor Lima',          'Theo Almeida',         'Miguel Costa',
  'Enzo Gabriel',         'Lorenzo Martins',      'Benício Ribeiro',
  'Antônio José',         'Francisco Neto',       'Joaquim Ferraz',
  // Novos (último mês)
  'Vitor Hugo',           'Murilo Pacheco',       'Otávio Borges',
  'Leonardo Tavares',     'Kauã Vieira',          'Yuri Castro',
  'Igor Sampaio',         'Renan Gomes',          'Thiago Mota',
  // Sumidos (últimos 60-90 dias) — vão aparecer só nos primeiros dias
  'Cláudio Moreira',      'Sérgio Antunes',       'Roberto Cardoso',
  'Fernando Brito',       'Marcos Vieira',        'Paulo Ricardo',
  'José Carlos',          'Adilson Ramalho',
]

// Telefones gerados aleatoriamente em DDD 63 (Tocantins) e 99 (variação).
function genPhone(seed: number): string {
  const ddd = seed % 5 === 0 ? '99' : '63'
  // gera 9XXXXYYYY — formato BR celular
  const part1 = String(8000 + (seed * 17) % 1999).padStart(4, '0')
  const part2 = String(1000 + (seed * 23) % 8999).padStart(4, '0')
  return `${ddd}9${part1}${part2}`
}

// Email opcional pra alguns clientes (não obrigatório)
function genEmail(name: string, seed: number): string | null {
  if (seed % 3 === 0) return null
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]+/g, '.')
    .replace(/\.$/, '')
  return `${slug}${seed}@email.demo`
}

// ============================================================
// HELPERS
// ============================================================

function pickWeighted<T extends { weight: number }>(items: T[], rand: number): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  let acc = rand * total
  for (const item of items) {
    acc -= item.weight
    if (acc <= 0) return item
  }
  return items[items.length - 1]
}

function randInt(rand: number, min: number, max: number): number {
  return Math.floor(rand * (max - min + 1)) + min
}

// PRNG determinístico (seed-based) pra reprodutibilidade.
// Mulberry32 — simples, rápido, qualidade boa pra simulação.
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20260504) // semente = 04/05/2026

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Hoje (referência) — ajusta pra timezone Brasil
function today(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + days)
  return r
}

// ============================================================
// FASES
// ============================================================

async function cleanup() {
  console.log('🧹 Limpando dados antigos...')
  // Pega o business existente (se houver) pra apagar em cascata
  const { data: existing } = await supabase
    .from('businesses')
    .select('id, owner_id')
    .eq('slug', DEMO.slug)
    .maybeSingle()

  if (existing) {
    // Cascade delete via FK on delete cascade — apaga prof, hours, services, appointments
    await supabase.from('businesses').delete().eq('id', existing.id)
    if (existing.owner_id) {
      await supabase.auth.admin.deleteUser(existing.owner_id).catch(() => {})
    }
    console.log('  ✓ business antigo + auth user apagados')
  } else {
    // Pode ter user órfão de tentativa anterior
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const orphan = users.find((u) => u.email === DEMO.email)
    if (orphan) {
      await supabase.auth.admin.deleteUser(orphan.id).catch(() => {})
      console.log('  ✓ auth user órfão apagado')
    }
  }
}

async function createOwner(): Promise<string> {
  console.log('👤 Criando owner auth user...')
  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO.email,
    password: DEMO.password,
    email_confirm: true,
  })
  if (error || !data.user) throw error || new Error('createUser retornou null')
  console.log(`  ✓ owner criado (id: ${data.user.id})`)
  return data.user.id
}

async function createBusiness(ownerId: string): Promise<string> {
  console.log('🏢 Criando business...')
  const { data, error } = await supabase
    .from('businesses')
    .insert({
      ...DEMO.business,
      slug: DEMO.slug,
      owner_id: ownerId,
    })
    .select('id')
    .single()
  if (error || !data) throw error || new Error('business retornou null')
  console.log(`  ✓ business criado (id: ${data.id})`)
  return data.id
}

async function createSubscription(businessId: string) {
  console.log('💳 Criando subscription ativa...')
  // Datas: simulando que o cliente assinou há 30 dias e está ativo.
  // setup_paid_at fora da janela de garantia (pra status='active' valer).
  const thirtyDaysAgo = new Date(today().getTime() - 30 * 86400000)
  const { error } = await supabase.from('subscriptions').insert({
    business_id: businessId,
    plan: 'equipe',
    status: 'active',
    price_cents: 9700,
    setup_cents: 0,
    founders_club: true,
    setup_paid_at: thirtyDaysAgo.toISOString(),
  })
  if (error) throw error
  console.log('  ✓ subscription Equipe ativa')
}

async function createProfessionals(businessId: string, ownerAuthId: string) {
  console.log('👥 Criando 3 profissionais...')
  const profIds: { id: string; name: string }[] = []
  for (const p of PROFESSIONALS) {
    const { data, error } = await supabase
      .from('professionals')
      .insert({
        business_id: businessId,
        name: p.name,
        email: p.email,
        active: true,
        auth_user_id: p.isOwner ? ownerAuthId : null,
        role: p.isOwner ? 'owner' : null,
        employment_type: p.employment_type,
        commission_percentage: p.commission_percentage,
      })
      .select('id, name')
      .single()
    if (error || !data) throw error
    profIds.push(data)
    console.log(`  ✓ ${p.name} (${p.isOwner ? 'owner' : 'comissionado 50%'})`)
  }
  return profIds
}

async function createServices(businessId: string) {
  console.log('🛍 Criando 6 serviços...')
  const serviceIds: { id: string; name: string; price: number; duration: number; points: number; weight: number }[] = []
  for (const s of SERVICES) {
    const { data, error } = await supabase
      .from('services')
      .insert({
        business_id: businessId,
        name: s.name,
        price: s.price,
        duration_minutes: s.duration,
        points: s.points,
        active: true,
      })
      .select('id, name')
      .single()
    if (error || !data) throw error
    serviceIds.push({ id: data.id, name: s.name, price: s.price, duration: s.duration, points: s.points, weight: s.weight })
  }
  console.log(`  ✓ ${SERVICES.length} serviços`)
  return serviceIds
}

async function createWorkingHours(profIds: { id: string; name: string }[]) {
  console.log('⏰ Criando horários (Seg-Sáb 8-12 + 13-18)...')
  const rows: Array<Record<string, unknown>> = []
  // 1=Seg ... 6=Sáb
  for (const p of profIds) {
    for (let day = 1; day <= 6; day++) {
      rows.push({
        professional_id: p.id,
        day_of_week: day,
        start_time: '08:00',
        end_time: '12:00',
        slot_duration: 30,
      })
      rows.push({
        professional_id: p.id,
        day_of_week: day,
        start_time: '13:00',
        end_time: '18:00',
        slot_duration: 30,
      })
    }
  }
  const { error } = await supabase.from('working_hours').insert(rows)
  if (error) throw error
  console.log(`  ✓ ${rows.length} períodos (3 profs × 6 dias × 2 períodos)`)
}

type CustomerSeed = {
  name: string
  phone: string
  email: string | null
  /** Nº de atendimentos esperados em 30 dias (perfil de uso). */
  visits: number
  /** Se sumido (último atendimento >60 dias). */
  isSumido: boolean
  /** Quantos dias atrás foi a primeira visita. */
  firstSeenDaysAgo: number
}

function buildCustomerProfile(): CustomerSeed[] {
  const profiles: CustomerSeed[] = []
  CLIENT_NAMES.forEach((name, i) => {
    let visits: number
    let isSumido = false
    let firstSeenDaysAgo: number

    if (i < 6) {
      // VIPs — 18-22 visitas/mês (cara que vem 4-5x/semana, fanático), 6+ meses
      visits = randInt(rand(), 18, 22)
      firstSeenDaysAgo = randInt(rand(), 180, 365)
    } else if (i < 18) {
      // Recorrentes — 10-14 visitas, conhecem há 2-6 meses
      visits = randInt(rand(), 10, 14)
      firstSeenDaysAgo = randInt(rand(), 60, 180)
    } else if (i < 30) {
      // Casuais — 5-7 visitas, conhecem há 1-3 meses
      visits = randInt(rand(), 5, 7)
      firstSeenDaysAgo = randInt(rand(), 30, 90)
    } else if (i < 38) {
      // Novos — 3-5 visitas no último mês, primeira vez
      visits = randInt(rand(), 3, 5)
      firstSeenDaysAgo = randInt(rand(), 1, 25)
    } else {
      // Sumidos — não aparecem no último mês
      visits = 0
      isSumido = true
      firstSeenDaysAgo = randInt(rand(), 90, 200)
    }

    profiles.push({
      name,
      phone: genPhone(i + 1),
      email: genEmail(name, i + 1),
      visits,
      isSumido,
      firstSeenDaysAgo,
    })
  })
  return profiles
}

async function createCustomers(businessId: string, customers: CustomerSeed[]) {
  console.log(`👤 Criando ${customers.length} customers...`)
  const ids: { id: string; name: string; phone: string; email: string | null; isSumido: boolean; visits: number }[] = []
  for (let i = 0; i < customers.length; i++) {
    const c = customers[i]
    const createdAt = new Date(today().getTime() - c.firstSeenDaysAgo * 86400000)
    const { data, error } = await supabase
      .from('customers')
      .insert({
        business_id: businessId,
        name: c.name,
        phone: c.phone,
        email: c.email,
        created_at: createdAt.toISOString(),
      })
      .select('id, name')
      .single()
    if (error) {
      console.warn(`  ⚠ erro em ${c.name}: ${error.message}`)
      continue
    }
    ids.push({
      id: data.id,
      name: data.name,
      phone: c.phone,
      email: c.email,
      isSumido: c.isSumido,
      visits: c.visits,
    })
  }
  console.log(`  ✓ ${ids.length} customers (incluindo ${customers.filter((c) => c.isSumido).length} sumidos)`)
  return ids
}

type ProfilesByDayOfWeek = Record<number, number>
// Distribuição de demanda por dia da semana (BR barbearia popular).
// Sábado = pico (~30%), sexta tarde forte, segunda fraca.
const DEMAND_BY_DOW: ProfilesByDayOfWeek = {
  0: 0,    // Domingo (fechado)
  1: 0.10, // Segunda
  2: 0.12,
  3: 0.13,
  4: 0.14,
  5: 0.21, // Sexta
  6: 0.30, // Sábado
}

async function createAppointments(
  businessId: string,
  profIds: { id: string; name: string }[],
  serviceIds: { id: string; name: string; price: number; duration: number; points: number; weight: number }[],
  customers: { id: string; name: string; phone: string; email: string | null; isSumido: boolean; visits: number }[]
) {
  console.log('📅 Criando appointments distribuídos em 30 dias...')

  // Pool de slots customer-visita (já desnormalizado por visita)
  const visitPool: { customerIdx: number }[] = []
  customers.forEach((c, idx) => {
    for (let v = 0; v < c.visits; v++) visitPool.push({ customerIdx: idx })
  })
  // shuffle determinístico
  for (let i = visitPool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[visitPool[i], visitPool[j]] = [visitPool[j], visitPool[i]]
  }

  console.log(`  · pool de visitas: ${visitPool.length} agendamentos a criar`)

  // Distribui pelos últimos 30 dias + 5 dias futuros (agenda já com
  // confirmados pra cliente ver "próximos dias"). Demanda por dia da
  // semana respeitada (sábado pico, segunda fraca).
  const appointmentsToInsert: Array<Record<string, unknown>> = []
  const todayMs = today().getTime()
  const startMs = todayMs - 30 * 86400000
  const dayWeights: { day: Date; weight: number }[] = []
  for (let dOffset = 0; dOffset <= 35; dOffset++) {
    const d = new Date(startMs + dOffset * 86400000)
    const dow = d.getDay()
    if (DEMAND_BY_DOW[dow] > 0) {
      // Dias futuros tem peso menor (~30%) pra não saturar agenda
      const isFuture = d.getTime() > todayMs
      const weight = DEMAND_BY_DOW[dow] * (isFuture ? 0.3 : 1)
      dayWeights.push({ day: d, weight })
    }
  }
  // Slots ocupados — chave (profId+date) → array de [startMin, endMin]
  // Permite checagem real de sobreposição em vez de aproximação.
  const usedSlotsByProfDate = new Map<string, Array<[number, number]>>()
  function slotFree(profId: string, date: string, startMin: number, endMin: number): boolean {
    const key = `${profId}|${date}`
    const list = usedSlotsByProfDate.get(key) ?? []
    for (const [s, e] of list) {
      // overlap real: [s,e) e [startMin,endMin) se sobrepõem
      if (startMin < e && s < endMin) return false
    }
    return true
  }
  function reserveSlot(profId: string, date: string, startMin: number, endMin: number) {
    const key = `${profId}|${date}`
    const list = usedSlotsByProfDate.get(key) ?? []
    list.push([startMin, endMin])
    usedSlotsByProfDate.set(key, list)
  }

  const appointmentLog: Array<{
    customerName: string
    serviceName: string
    profName: string
    price: number
    date: string
    time: string
    status: string
    paid_at: string | null
    payment_method: string | null
  }> = []

  let attempts = 0
  for (const visit of visitPool) {
    if (attempts > visitPool.length * 5) break // safety
    attempts++

    const customer = customers[visit.customerIdx]
    if (!customer || customer.isSumido) continue // sumidos não geram visita no mês

    // Escolhe dia ponderado
    const totalW = dayWeights.reduce((s, d) => s + d.weight, 0)
    let pick = rand() * totalW
    let chosenDay = dayWeights[0].day
    for (const dw of dayWeights) {
      pick -= dw.weight
      if (pick <= 0) {
        chosenDay = dw.day
        break
      }
    }
    const dateStrVal = dateStr(chosenDay)

    // Escolhe profissional aleatório
    const prof = profIds[Math.floor(rand() * profIds.length)]

    // Escolhe serviço (pesos)
    const service = pickWeighted(serviceIds, rand())

    // Escolhe horário: tenta achar um slot livre 8-12 ou 13-18 (até 30 tentativas)
    let startMin = 0
    let endMin = 0
    let chosen = false
    for (let try_ = 0; try_ < 30; try_++) {
      // Manhã (8-12) ou tarde (13-18) — peso pra tarde maior (60%)
      const isAfternoon = rand() < 0.6
      if (isAfternoon) {
        startMin = (13 * 60) + Math.floor(rand() * 10) * 30 // 13:00, 13:30 ... 17:30
      } else {
        startMin = (8 * 60) + Math.floor(rand() * 8) * 30 // 8:00, 8:30 ... 11:30
      }
      endMin = startMin + service.duration
      // Não pode atravessar pausa de almoço (12-13)
      if (startMin < 12 * 60 && endMin > 12 * 60) continue
      // Não pode passar do fechamento (18:00)
      if (endMin > 18 * 60) continue
      if (slotFree(prof.id, dateStrVal, startMin, endMin)) {
        reserveSlot(prof.id, dateStrVal, startMin, endMin)
        chosen = true
        break
      }
    }
    if (!chosen) continue

    const startTime = `${pad(Math.floor(startMin / 60))}:${pad(startMin % 60)}`
    const endTime = `${pad(Math.floor((startMin + service.duration) / 60))}:${pad((startMin + service.duration) % 60)}`

    // Decide status:
    // Se data > hoje → confirmed (futuro)
    // Senão: 75% completed pago, 13% completed sem pagar, 8% cancelled, 4% no_show
    const isFuture = chosenDay.getTime() > todayMs
    let status: 'confirmed' | 'completed' | 'cancelled' | 'no_show'
    let paid_at: string | null = null
    let payment_method: string | null = null

    if (isFuture) {
      status = 'confirmed'
    } else {
      const r = rand()
      if (r < 0.75) {
        status = 'completed'
        // Decide método (PIX 50%, Dinheiro 30%, Cartão 15%, Pontos 5%)
        const m = rand()
        if (m < 0.50) payment_method = 'pix'
        else if (m < 0.80) payment_method = 'cash'
        else if (m < 0.95) payment_method = 'card'
        else payment_method = 'points'
        // paid_at = mesmo dia + horário próximo do fim do atendimento
        const paidDt = new Date(chosenDay)
        paidDt.setHours(Math.floor((startMin + service.duration) / 60), (startMin + service.duration) % 60, 0, 0)
        paid_at = paidDt.toISOString()
      } else if (r < 0.88) {
        status = 'completed' // a receber
      } else if (r < 0.96) {
        status = 'cancelled'
      } else {
        status = 'no_show'
      }
    }

    appointmentsToInsert.push({
      business_id: businessId,
      professional_id: prof.id,
      client_name: customer.name,
      client_phone: customer.phone,
      client_email: customer.email,
      service_name: service.name,
      service_id: service.id,
      total_price: service.price,
      appointment_date: dateStrVal,
      start_time: startTime,
      end_time: endTime,
      status,
      paid_at,
      payment_method,
    })
    appointmentLog.push({
      customerName: customer.name,
      serviceName: service.name,
      profName: prof.name,
      price: service.price,
      date: dateStrVal,
      time: startTime,
      status,
      paid_at,
      payment_method,
    })
  }

  // Insere em batches de 50
  console.log(`  · inserindo ${appointmentsToInsert.length} appointments em lotes...`)
  let inserted = 0
  for (let i = 0; i < appointmentsToInsert.length; i += 50) {
    const batch = appointmentsToInsert.slice(i, i + 50)
    const { error, data } = await supabase
      .from('appointments')
      .insert(batch)
      .select('id')
    if (error) {
      console.warn(`  ⚠ erro batch ${i}: ${error.message}`)
      continue
    }
    inserted += data?.length ?? 0
  }
  console.log(`  ✓ ${inserted} appointments criados`)

  // Stats
  const completed = appointmentLog.filter((a) => a.status === 'completed')
  const paid = completed.filter((a) => a.paid_at)
  const realizado = paid.reduce((s, a) => s + a.price, 0)
  const aReceber = completed.filter((a) => !a.paid_at).reduce((s, a) => s + a.price, 0)
  const cancelado = appointmentLog.filter((a) => a.status === 'cancelled' || a.status === 'no_show').length
  const futuro = appointmentLog.filter((a) => a.status === 'confirmed').length
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  📊 Realizado:   R$ ${realizado.toFixed(2)} (${paid.length} atendimentos)`)
  console.log(`     A receber:   R$ ${aReceber.toFixed(2)} (${completed.length - paid.length} atendimentos)`)
  console.log(`     Faturado:    R$ ${(realizado + aReceber).toFixed(2)}`)
  console.log(`     Cancelados:  ${cancelado}`)
  console.log(`     Futuros:     ${futuro}`)
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

async function createExpenses(businessId: string) {
  console.log('💸 Criando despesas do mês...')
  const todayDate = today()
  const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)

  const expenses = [
    { name: 'Aluguel', category: 'rent', amount: 2500, recurring: true, occurred_at: dateStr(monthStart), notes: 'Pago via PIX dia 5' },
    { name: 'Energia + Água', category: 'utilities', amount: 320, recurring: true, occurred_at: dateStr(addDays(monthStart, 5)), notes: null },
    { name: 'Internet/Wi-Fi', category: 'utilities', amount: 99, recurring: true, occurred_at: dateStr(addDays(monthStart, 8)), notes: null },
    { name: 'Pomadas + Cera (estoque)', category: 'products', amount: 580, recurring: false, occurred_at: dateStr(addDays(monthStart, 3)), notes: 'Reposição mensal' },
    { name: 'Tintas pra pigmentação', category: 'products', amount: 280, recurring: false, occurred_at: dateStr(addDays(monthStart, 10)), notes: null },
    { name: 'Toalhas + capas (estoque)', category: 'products', amount: 150, recurring: false, occurred_at: dateStr(addDays(monthStart, 12)), notes: null },
    { name: 'Tráfego pago Instagram', category: 'marketing', amount: 200, recurring: true, occurred_at: dateStr(addDays(monthStart, 1)), notes: 'Meta Ads — campanha mensal' },
    { name: 'Contador (mensalidade)', category: 'taxes', amount: 250, recurring: true, occurred_at: dateStr(addDays(monthStart, 6)), notes: null },
    { name: 'Material de limpeza', category: 'other', amount: 85, recurring: false, occurred_at: dateStr(addDays(monthStart, 14)), notes: null },
    { name: 'Conserto da máquina de corte 2', category: 'other', amount: 120, recurring: false, occurred_at: dateStr(addDays(monthStart, 18)), notes: 'Quebrou polia' },
  ]

  let inserted = 0
  for (const exp of expenses) {
    const { error } = await supabase.from('expenses').insert({
      business_id: businessId,
      ...exp,
    })
    if (error) {
      console.warn(`  ⚠ erro ${exp.name}: ${error.message}`)
      continue
    }
    inserted++
  }
  const total = expenses.reduce((s, e) => s + e.amount, 0)
  console.log(`  ✓ ${inserted} despesas — total R$ ${total.toFixed(2)}`)
}

// ============================================================
// EXECUÇÃO
// ============================================================

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🪒 SEED — Império Barbershop (demo realista)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  await cleanup()
  const ownerId = await createOwner()
  const businessId = await createBusiness(ownerId)
  await createSubscription(businessId)
  const profIds = await createProfessionals(businessId, ownerId)
  const serviceIds = await createServices(businessId)
  await createWorkingHours(profIds)
  const customerProfiles = buildCustomerProfile()
  const customers = await createCustomers(businessId, customerProfiles)
  await createAppointments(businessId, profIds, serviceIds, customers)
  await createExpenses(businessId)

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ SEED COMPLETO')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('🔑 CREDENCIAIS:')
  console.log(`   Email: ${DEMO.email}`)
  console.log(`   Senha: ${DEMO.password}`)
  console.log('')
  console.log('🌐 LINKS:')
  console.log(`   Admin:    https://agendapro.net.br/admin/login`)
  console.log(`   Público:  https://agendapro.net.br/${DEMO.slug}`)
  console.log(`   Agendar:  https://agendapro.net.br/${DEMO.slug}/agendar`)
  console.log('')
}

main().catch((err) => {
  console.error('❌ ERRO FATAL:', err)
  process.exit(1)
})
