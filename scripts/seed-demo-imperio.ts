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
    // Place ID real da Barbearia Toledo Palmas — usado pra link de
    // Google Reviews funcionar de fato no demo. Cliente clica no botão
    // "Avaliar no Google" e vai pra perfil real (mostra reviews reais).
    google_place_id: 'ChIJvba-CAY1O5MRkFHisHOBo3k',
    google_rating: 4.9,
    google_reviews_count: 287,
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
  // Pesos calibrados pra ticket medio R$55+ (subir realizado mes na demo).
  // Pigmentacao + Corte+Barba viram serviços principais (rentaveis).
  { name: 'Corte Simples',     price: 30, duration: 30, points: 30, weight: 12 },
  { name: 'Corte + Barba',     price: 50, duration: 60, points: 60, weight: 38 },
  { name: 'Barba Tradicional', price: 25, duration: 30, points: 25, weight: 8 },
  { name: 'Corte Degradê',     price: 45, duration: 45, points: 45, weight: 15 },
  { name: 'Sobrancelha',       price: 15, duration: 20, points: 15, weight: 2 },
  { name: 'Pigmentação Capilar', price: 80, duration: 60, points: 80, weight: 25 },
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
  // 1. Cleanup ordenado pra evitar FK constraint:
  //    appointment_services tem FK pra services SEM cascade. Cascade do
  //    business → services falha enquanto houver appointment_services
  //    apontando. Solução: apagar appointment_services antes.
  const { data: existingBizz } = await supabase
    .from('businesses')
    .select('id')
    .eq('slug', DEMO.slug)
  for (const biz of existingBizz || []) {
    const { data: appts } = await supabase
      .from('appointments')
      .select('id')
      .eq('business_id', biz.id)
    const apptIds = (appts || []).map((a) => a.id)
    for (let i = 0; i < apptIds.length; i += 50) {
      await supabase
        .from('appointment_services')
        .delete()
        .in('appointment_id', apptIds.slice(i, i + 50))
    }
    await supabase.from('businesses').delete().eq('id', biz.id)
    console.log(`  ✓ business antigo apagado + ${apptIds.length} appointment_services`)
  }

  // 2. Renomeia email de auth users existentes — libera o DEMO.email
  //    pra novo cadastro. deleteUser do Supabase faz soft-delete e mantém
  //    o email reservado, então update pra email único é workaround.
  let renamed = 0
  let page = 1
  while (page < 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !data?.users || data.users.length === 0) break
    for (const u of data.users) {
      if (u.email === DEMO.email) {
        const trash = `trash_${Date.now()}_${u.id.slice(0, 6)}@trash.demo`
        await supabase.auth.admin.updateUserById(u.id, { email: trash }).catch(() => {})
        renamed++
      }
    }
    if (data.users.length < 1000) break
    page++
  }
  if (renamed > 0) console.log(`  ✓ ${renamed} auth user(s) com email antigo renomeados pra liberar slot`)
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
    let authUserId: string | null = p.isOwner ? ownerAuthId : null

    // Comissionados ganham conta auth pra logarem em /profissional/login.
    // Senha padrao demo: AgendaPRO@2026 (mesma do owner pra simplicidade).
    // Em prod, dono usa "Dar acesso" no painel que envia convite por email.
    if (!p.isOwner && p.email) {
      // Se ja existe (re-seed), pega o id existente
      let existingId: string | undefined
      let page = 1
      while (page < 10) {
        const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
        if (!data?.users?.length) break
        const found = data.users.find((u) => u.email === p.email)
        if (found) { existingId = found.id; break }
        if (data.users.length < 1000) break
        page++
      }

      if (existingId) {
        // Reseta senha pra senha demo (re-seed garante login funcional)
        await supabase.auth.admin.updateUserById(existingId, { password: 'AgendaPRO@2026' })
        authUserId = existingId
      } else {
        const { data: created, error: authErr } = await supabase.auth.admin.createUser({
          email: p.email,
          password: 'AgendaPRO@2026',
          email_confirm: true,
          user_metadata: { name: p.name, role: 'professional' },
        })
        if (authErr || !created.user) {
          console.warn(`  ⚠ erro auth ${p.name}: ${authErr?.message}`)
        } else {
          authUserId = created.user.id
        }
      }
    }

    const { data, error } = await supabase
      .from('professionals')
      .insert({
        business_id: businessId,
        name: p.name,
        email: p.email,
        active: true,
        auth_user_id: authUserId,
        role: p.isOwner ? 'owner' : 'professional',
        employment_type: p.employment_type,
        commission_percentage: p.commission_percentage,
      })
      .select('id, name')
      .single()
    if (error || !data) throw error
    profIds.push(data)
    console.log(`  ✓ ${p.name} (${p.isOwner ? 'owner' : 'comissionado 50%'}${authUserId && !p.isOwner ? ' · login OK' : ''})`)
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

    // Calibragem demo (v3): volume alto + concentrado no mes corrente.
    // Target: Lucro mensal R$9k+ em qualquer dia que demo for vista.
    // Eduardo viu R$1.5k no filtro "Mes" no dia 5/5 — pouco proporcional
    // (so 5 dias de movimento). Aumentando visits e ajustando range
    // de distribuicao pra que dia-a-dia atual sempre tenha volume
    // suficiente pro KPI parecer profissional.
    if (i < 6) {
      // VIPs — fanaticos, 6x/semana
      visits = randInt(rand(), 32, 38)
      firstSeenDaysAgo = randInt(rand(), 180, 365)
    } else if (i < 18) {
      // Recorrentes — 4-5x/semana
      visits = randInt(rand(), 20, 25)
      firstSeenDaysAgo = randInt(rand(), 60, 180)
    } else if (i < 30) {
      // Casuais — 2x/semana
      visits = randInt(rand(), 10, 14)
      firstSeenDaysAgo = randInt(rand(), 30, 90)
    } else if (i < 38) {
      // Novos — 5-8 visitas no ultimo mes, primeira vez
      visits = randInt(rand(), 6, 9)
      firstSeenDaysAgo = randInt(rand(), 1, 25)
    } else {
      // Sumidos — só appointments antigos (60-120d ago); precisam de
      // appointments pra aparecer no filtro "Sumidos" (que detecta via
      // último appointment > 60d ago, não customer.created_at)
      visits = randInt(rand(), 1, 3)
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
  console.log(`👤 Criando ${customers.length} customers + clients globais...`)
  const ids: { id: string; clientId: string | null; name: string; phone: string; email: string | null; isSumido: boolean; visits: number }[] = []
  for (let i = 0; i < customers.length; i++) {
    const c = customers[i]
    const createdAt = new Date(today().getTime() - c.firstSeenDaysAgo * 86400000)

    // 1. Cria row em `clients` (tabela GLOBAL — compartilhada entre
    //    todos os businesses, identifica cliente por phone). Sem isso,
    //    appointments ficam órfãos (client_id NULL) e a página /admin/
    //    clientes filtra `WHERE client_id IS NOT NULL` — bug descoberto
    //    via CIC: filtro "Sumidos" mostrava 0.
    let clientId: string | null = null
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('phone', c.phone)
      .maybeSingle()
    if (existingClient) {
      clientId = existingClient.id
    } else {
      const { data: newClient, error: clientErr } = await supabase
        .from('clients')
        .insert({ name: c.name, phone: c.phone, email: c.email })
        .select('id')
        .single()
      if (clientErr) {
        console.warn(`  ⚠ erro client ${c.name}: ${clientErr.message}`)
      } else {
        clientId = newClient.id
      }
    }

    // 2. Cria customer (relação business↔cliente, com pontos)
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
      console.warn(`  ⚠ erro customer ${c.name}: ${error.message}`)
      continue
    }
    ids.push({
      id: data.id,
      clientId,
      name: data.name,
      phone: c.phone,
      email: c.email,
      isSumido: c.isSumido,
      visits: c.visits,
    })
  }
  console.log(`  ✓ ${ids.length} customers + clients (${customers.filter((c) => c.isSumido).length} sumidos)`)
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
  customers: { id: string; clientId: string | null; name: string; phone: string; email: string | null; isSumido: boolean; visits: number }[]
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

  // Distribuicao uniforme em 30 dias rolling (mesmo range do filtro
  // "Mes" do FinanceiroView — assim filtro captura tudo). Demanda
  // por dia da semana respeitada (sabado pico, segunda fraca).
  const appointmentsToInsert: Array<Record<string, unknown>> = []
  const todayDate = today()
  const todayMs = todayDate.getTime()
  const startMs = todayMs - 30 * 86400000
  const endMs = todayMs + 7 * 86400000
  const dayWeights: { day: Date; weight: number }[] = []
  for (let ms = startMs; ms <= endMs; ms += 86400000) {
    const d = new Date(ms)
    const dow = d.getDay()
    if (DEMAND_BY_DOW[dow] > 0) {
      const isFuture = d.getTime() > todayMs
      // Futuros peso 30% pra nao saturar agenda futura (cliente publico
      // precisa ver slots livres em /agendar).
      const futurePenalty = isFuture ? 0.3 : 1
      const weight = DEMAND_BY_DOW[dow] * futurePenalty
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

  // Plan armazena dados de cada appointment ANTES do insert.
  // Estratégia chave (V2): inserir TODOS como 'confirmed' inicial,
  // depois UPDATE em batch pra status final. Trigger V15 dispara em
  // UPDATE OF status — só assim points_transactions é criada e
  // customers.total_points é atualizado.
  type Plan = {
    insertData: Record<string, unknown>
    serviceId: string
    serviceName: string
    servicePrice: number
    serviceDuration: number
    finalStatus: 'confirmed' | 'completed' | 'cancelled' | 'no_show'
    paid_at: string | null
    payment_method: string | null
  }
  const plans: Plan[] = []

  function tryFindSlot(profId: string, dateStrVal: string, duration: number): { startMin: number; endMin: number } | null {
    // Aumentado pra 60 tentativas — versao anterior com 30 rejeitava
    // ~83% das visitas (so 68 saiam de 384), demo ficava magra.
    for (let try_ = 0; try_ < 60; try_++) {
      const isAfternoon = rand() < 0.6
      let startMin: number
      if (isAfternoon) {
        startMin = (13 * 60) + Math.floor(rand() * 10) * 30
      } else {
        startMin = (8 * 60) + Math.floor(rand() * 8) * 30
      }
      const endMin = startMin + duration
      if (startMin < 12 * 60 && endMin > 12 * 60) continue
      if (endMin > 18 * 60) continue
      if (slotFree(profId, dateStrVal, startMin, endMin)) {
        reserveSlot(profId, dateStrVal, startMin, endMin)
        return { startMin, endMin }
      }
    }
    return null
  }

  // Loop principal — clientes ATIVOS (não-sumidos)
  let attempts = 0
  for (const visit of visitPool) {
    // Mais tentativas (5 -> 10) — visitas que perdem slot agora tem
    // mais chance de re-tentar em outro dia/prof antes de desistir.
    if (attempts > visitPool.length * 10) break
    attempts++

    const customer = customers[visit.customerIdx]
    if (!customer || customer.isSumido) continue // sumidos vão em loop separado

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
    const prof = profIds[Math.floor(rand() * profIds.length)]
    const service = pickWeighted(serviceIds, rand())
    const slot = tryFindSlot(prof.id, dateStrVal, service.duration)
    if (!slot) continue

    const startTime = `${pad(Math.floor(slot.startMin / 60))}:${pad(slot.startMin % 60)}`
    const endTime = `${pad(Math.floor(slot.endMin / 60))}:${pad(slot.endMin % 60)}`
    const isFuture = chosenDay.getTime() > todayMs

    let finalStatus: Plan['finalStatus']
    let paid_at: string | null = null
    let payment_method: string | null = null

    if (isFuture) {
      finalStatus = 'confirmed'
    } else {
      const r = rand()
      // Calibragem demo: 85% pagos (vs 75% antes) — barbearia de bairro
      // bem operada cobra na hora. Subir taxa de pagamento engorda o
      // KPI Realizado (lucro real) que dono ve primeiro.
      if (r < 0.85) {
        finalStatus = 'completed'
        const m = rand()
        if (m < 0.55) payment_method = 'pix'
        else if (m < 0.85) payment_method = 'cash'
        else if (m < 0.97) payment_method = 'card'
        else payment_method = 'courtesy'
        const paidDt = new Date(chosenDay)
        paidDt.setHours(Math.floor(slot.endMin / 60), slot.endMin % 60, 0, 0)
        paid_at = paidDt.toISOString()
      } else if (r < 0.93) {
        // Atendeu mas nao pagou (cliente foi embora, vai voltar pra pagar)
        finalStatus = 'completed'
      } else if (r < 0.98) {
        finalStatus = 'cancelled'
      } else {
        finalStatus = 'no_show'
      }
    }

    plans.push({
      insertData: {
        business_id: businessId,
        professional_id: prof.id,
        client_id: customer.clientId,  // CRÍTICO: ClientesView filtra WHERE client_id IS NOT NULL
        client_name: customer.name,
        client_phone: customer.phone,
        client_email: customer.email,
        service_name: service.name,
        service_id: service.id,
        total_price: service.price,
        appointment_date: dateStrVal,
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed',  // sempre confirmed inicial — UPDATE depois pra disparar trigger
        paid_at,
        payment_method,
      },
      serviceId: service.id,
      serviceName: service.name,
      servicePrice: service.price,
      serviceDuration: service.duration,
      finalStatus,
      paid_at,
      payment_method,
    })
  }

  // Loop separado — SUMIDOS com appointments antigos (60-120d ago).
  // Pra aparecerem no filtro "Sumidos" do ClientesView, precisam de
  // appointments completed cuja última data > 60d ago.
  let sumidosCriados = 0
  for (const customer of customers) {
    if (!customer.isSumido) continue
    for (let v = 0; v < customer.visits; v++) {
      const daysAgo = randInt(rand(), 60, 120)
      const oldDay = new Date(todayMs - daysAgo * 86400000)
      // Pula domingo (fechado)
      if (oldDay.getDay() === 0) continue
      const dateStrVal = dateStr(oldDay)
      const prof = profIds[Math.floor(rand() * profIds.length)]
      const service = pickWeighted(serviceIds, rand())
      const slot = tryFindSlot(prof.id, dateStrVal, service.duration)
      if (!slot) continue

      const startTime = `${pad(Math.floor(slot.startMin / 60))}:${pad(slot.startMin % 60)}`
      const endTime = `${pad(Math.floor(slot.endMin / 60))}:${pad(slot.endMin % 60)}`
      const m = rand()
      const payment_method = m < 0.5 ? 'pix' : m < 0.8 ? 'cash' : 'card'
      const paidDt = new Date(oldDay)
      paidDt.setHours(Math.floor(slot.endMin / 60), slot.endMin % 60, 0, 0)

      plans.push({
        insertData: {
          business_id: businessId,
          professional_id: prof.id,
          client_id: customer.clientId,  // CRÍTICO pro filtro Sumidos
          client_name: customer.name,
          client_phone: customer.phone,
          client_email: customer.email,
          service_name: service.name,
          service_id: service.id,
          total_price: service.price,
          appointment_date: dateStrVal,
          start_time: startTime,
          end_time: endTime,
          status: 'confirmed',
          paid_at: paidDt.toISOString(),
          payment_method,
        },
        serviceId: service.id,
        serviceName: service.name,
        servicePrice: service.price,
        serviceDuration: service.duration,
        finalStatus: 'completed',
        paid_at: paidDt.toISOString(),
        payment_method,
      })
      sumidosCriados++
    }
  }

  // INSERT em batches — todos com status='confirmed' (não dispara trigger ainda)
  console.log(`  · inserindo ${plans.length} appointments (incluindo ${sumidosCriados} sumidos)...`)
  const insertedIds: string[] = []
  for (let i = 0; i < plans.length; i += 50) {
    const batch = plans.slice(i, i + 50).map((p) => p.insertData)
    const { error, data } = await supabase
      .from('appointments')
      .insert(batch)
      .select('id')
    if (error) {
      console.warn(`  ⚠ erro batch ${i}: ${error.message}`)
      // Pra alinhar índices, push placeholder vazio
      for (let j = 0; j < batch.length; j++) insertedIds.push('')
      continue
    }
    for (const row of data || []) insertedIds.push(row.id as string)
  }

  // INSERT appointment_services — necessário pra trigger V15 calcular pontos
  // (V15 lê SUM(s.points) FROM appointment_services aps JOIN services s)
  const apptServicesBatch: Array<Record<string, unknown>> = []
  for (let i = 0; i < plans.length; i++) {
    const id = insertedIds[i]
    if (!id) continue
    const p = plans[i]
    apptServicesBatch.push({
      appointment_id: id,
      service_id: p.serviceId,
      service_name: p.serviceName,
      price: p.servicePrice,
      duration_minutes: p.serviceDuration,
    })
  }
  for (let i = 0; i < apptServicesBatch.length; i += 50) {
    const batch = apptServicesBatch.slice(i, i + 50)
    const { error } = await supabase.from('appointment_services').insert(batch)
    if (error) console.warn(`  ⚠ erro appt_services batch ${i}: ${error.message}`)
  }
  console.log(`  · ${apptServicesBatch.length} appointment_services criados (pra trigger V15)`)

  // Categoriza IDs por finalStatus pra UPDATE em batch
  const completedIds: string[] = []
  const cancelledIds: string[] = []
  const noShowIds: string[] = []
  for (let i = 0; i < plans.length; i++) {
    const id = insertedIds[i]
    if (!id) continue
    const p = plans[i]
    if (p.finalStatus === 'completed') completedIds.push(id)
    else if (p.finalStatus === 'cancelled') cancelledIds.push(id)
    else if (p.finalStatus === 'no_show') noShowIds.push(id)
    // confirmed: já está, skip
  }

  // UPDATE → 'completed' em batches (dispara trigger V15 → cria points_transactions
  // + UPDATE customers.total_points). Esse é O passo crítico pro sistema de
  // fidelidade aparecer em ação no demo.
  console.log(`  · UPDATE → completed em ${completedIds.length} (dispara trigger pontos)...`)
  for (let i = 0; i < completedIds.length; i += 50) {
    const batch = completedIds.slice(i, i + 50)
    const { error } = await supabase.from('appointments').update({ status: 'completed' }).in('id', batch)
    if (error) console.warn(`  ⚠ erro UPDATE completed ${i}: ${error.message}`)
  }

  // UPDATE → 'cancelled' / 'no_show' (sem trigger relevante)
  if (cancelledIds.length > 0) {
    for (let i = 0; i < cancelledIds.length; i += 50) {
      await supabase.from('appointments').update({ status: 'cancelled' }).in('id', cancelledIds.slice(i, i + 50))
    }
  }
  if (noShowIds.length > 0) {
    for (let i = 0; i < noShowIds.length; i += 50) {
      await supabase.from('appointments').update({ status: 'no_show' }).in('id', noShowIds.slice(i, i + 50))
    }
  }

  // Stats finais
  const realizado = plans
    .filter((p) => p.finalStatus === 'completed' && p.paid_at)
    .reduce((s, p) => s + p.servicePrice, 0)
  const aReceber = plans
    .filter((p) => p.finalStatus === 'completed' && !p.paid_at)
    .reduce((s, p) => s + p.servicePrice, 0)
  const cancelado = cancelledIds.length + noShowIds.length
  const futuro = plans.filter((p) => p.finalStatus === 'confirmed').length
  const paidCount = plans.filter((p) => p.finalStatus === 'completed' && p.paid_at).length
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  📊 Realizado:   R$ ${realizado.toFixed(2)} (${paidCount} pagos)`)
  console.log(`     A receber:   R$ ${aReceber.toFixed(2)}`)
  console.log(`     Faturado:    R$ ${(realizado + aReceber).toFixed(2)}`)
  console.log(`     Sumidos:     ${sumidosCriados} appointments antigos (60-120d)`)
  console.log(`     Cancelados:  ${cancelado}`)
  console.log(`     Futuros:     ${futuro}`)
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

/**
 * Garante 4-6 atendimentos HOJE pro Carlos (admin-prof).
 * Sem isso, aba "Eu" do Carlos pode ficar vazia se a distribuição
 * aleatória não escolhe ele pra hoje.
 */
async function boostCarlosToday(
  businessId: string,
  carlosId: string,
  serviceIds: { id: string; name: string; price: number; duration: number; points: number; weight: number }[],
  customers: { id: string; clientId: string | null; name: string; phone: string; email: string | null; isSumido: boolean }[]
) {
  console.log('💪 Boost: garantindo 5 atendimentos HOJE pro Carlos...')
  const todayDate = today()
  const dateStrToday = dateStr(todayDate)
  const ativos = customers.filter((c) => !c.isSumido)

  // Limpa appointments do Carlos hoje pra evitar conflito com EXCLUSION
  // CONSTRAINT v40 (no_overlap_appointments). Sem essa limpeza, boost
  // colide com appointments que o seed principal ja colocou no Carlos
  // hoje em horarios random.
  await supabase
    .from('appointments')
    .delete()
    .eq('business_id', businessId)
    .eq('professional_id', carlosId)
    .eq('appointment_date', dateStrToday)
  // Escolhe 5 horários distribuídos no dia
  const slots = [
    { startMin: 9 * 60, paid: true, isPast: true },        // 09:00 — concluído + pago
    { startMin: 10 * 60 + 30, paid: true, isPast: true },  // 10:30 — concluído + pago
    { startMin: 11 * 60 + 30, paid: false, isPast: true }, // 11:30 — concluído, a receber
    { startMin: 14 * 60 + 30, paid: false, isPast: false },// 14:30 — confirmado (futuro do dia)
    { startMin: 16 * 60, paid: false, isPast: false },     // 16:00 — confirmado
  ]

  const plans: Array<{
    insertData: Record<string, unknown>
    serviceId: string
    serviceName: string
    servicePrice: number
    serviceDuration: number
    finalStatus: 'confirmed' | 'completed'
  }> = []

  for (let i = 0; i < slots.length; i++) {
    const s = slots[i]
    const customer = ativos[i % ativos.length]
    const service = pickWeighted(serviceIds, rand())
    const startMin = s.startMin
    const endMin = startMin + service.duration
    if (endMin > 18 * 60) continue
    const startTime = `${pad(Math.floor(startMin / 60))}:${pad(startMin % 60)}`
    const endTime = `${pad(Math.floor(endMin / 60))}:${pad(endMin % 60)}`

    let paid_at: string | null = null
    let payment_method: string | null = null
    if (s.paid) {
      const m = rand()
      payment_method = m < 0.5 ? 'pix' : m < 0.8 ? 'cash' : 'card'
      const paidDt = new Date(todayDate)
      paidDt.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0)
      paid_at = paidDt.toISOString()
    }

    plans.push({
      insertData: {
        business_id: businessId,
        professional_id: carlosId,
        client_id: customer.clientId,
        client_name: customer.name,
        client_phone: customer.phone,
        client_email: customer.email,
        service_name: service.name,
        service_id: service.id,
        total_price: service.price,
        appointment_date: dateStrToday,
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed',
        paid_at,
        payment_method,
      },
      serviceId: service.id,
      serviceName: service.name,
      servicePrice: service.price,
      serviceDuration: service.duration,
      finalStatus: s.isPast ? 'completed' : 'confirmed',
    })
  }

  const { data: inserted, error } = await supabase.from('appointments').insert(plans.map((p) => p.insertData)).select('id')
  if (error || !inserted) {
    console.warn(`  ⚠ erro boost Carlos: ${error?.message}`)
    return
  }

  // appointment_services pra cada
  const apptSvcs = inserted.map((row, idx) => ({
    appointment_id: row.id,
    service_id: plans[idx].serviceId,
    service_name: plans[idx].serviceName,
    price: plans[idx].servicePrice,
    duration_minutes: plans[idx].serviceDuration,
  }))
  await supabase.from('appointment_services').insert(apptSvcs)

  // UPDATE → completed os que devem
  const completedIds = inserted.filter((row, idx) => plans[idx].finalStatus === 'completed').map((r) => r.id)
  if (completedIds.length > 0) {
    await supabase.from('appointments').update({ status: 'completed' }).in('id', completedIds)
  }
  console.log(`  ✓ ${plans.length} atendimentos hoje pro Carlos (3 concluídos · 2 confirmados)`)
}

/**
 * Cria pontos extras de PUNCTUALITY e REFERRAL via inserts diretos
 * (não dispara via API — é seed). Trigger V15 só credita 'service'
 * automaticamente. Pra demo mostrar fidelidade completa.
 */
async function createBonusPoints(
  businessId: string,
  customers: { id: string; name: string; phone: string; isSumido: boolean }[]
) {
  console.log('⭐ Criando pontos bonus (punctuality + referral)...')
  // Busca appointments completed pra atrelar punctuality em ~50 deles
  const { data: completedAppts } = await supabase
    .from('appointments')
    .select('id, client_phone, professional_id')
    .eq('business_id', businessId)
    .eq('status', 'completed')
    .limit(50)

  const phoneToCustomer = new Map(customers.map((c) => [c.phone.replace(/\D/g, ''), c.id]))

  let punctualityCreated = 0
  for (const a of completedAppts || []) {
    const cphone = (a.client_phone || '').replace(/\D/g, '')
    const customerId = phoneToCustomer.get(cphone)
    if (!customerId) continue
    const { error } = await supabase.from('points_transactions').insert({
      customer_id: customerId,
      business_id: businessId,
      points: 10,
      reason: 'punctuality',
      appointment_id: a.id,
      professional_id: a.professional_id,
    })
    if (!error) {
      // SELECT atual + UPDATE (incremento atômico do saldo)
      const { data: c } = await supabase.from('customers').select('total_points').eq('id', customerId).single()
      if (c) {
        await supabase.from('customers').update({ total_points: (c.total_points ?? 0) + 10 }).eq('id', customerId)
      }
      punctualityCreated++
    }
  }
  console.log(`  ✓ ${punctualityCreated} pontos punctuality (10pts cada)`)

  // 10 pontos referral (clientes que indicaram outros)
  const ativos = customers.filter((c) => !c.isSumido).slice(0, 10)
  let referralCreated = 0
  for (let i = 0; i < ativos.length; i++) {
    const customer = ativos[i]
    const { error } = await supabase.from('points_transactions').insert({
      customer_id: customer.id,
      business_id: businessId,
      points: 30,
      reason: 'referral',
    })
    if (!error) {
      const { data: c } = await supabase.from('customers').select('total_points').eq('id', customer.id).single()
      if (c) {
        await supabase.from('customers').update({ total_points: (c.total_points ?? 0) + 30 }).eq('id', customer.id)
      }
      referralCreated++
    }
  }
  console.log(`  ✓ ${referralCreated} pontos referral (30pts cada)`)

  // Pontos por review aprovado (5 review_claims aprovados → 50pts cada)
  const { data: approvedClaims } = await supabase
    .from('review_claims')
    .select('id, customer_id, points_awarded')
    .eq('business_id', businessId)
    .eq('status', 'approved')

  let reviewCreated = 0
  for (const claim of approvedClaims || []) {
    if (!claim.customer_id) continue
    const pts = claim.points_awarded ?? 50
    const { error } = await supabase.from('points_transactions').insert({
      customer_id: claim.customer_id,
      business_id: businessId,
      points: pts,
      reason: 'review',
    })
    if (!error) {
      const { data: c } = await supabase.from('customers').select('total_points').eq('id', claim.customer_id).single()
      if (c) {
        await supabase.from('customers').update({ total_points: (c.total_points ?? 0) + pts }).eq('id', claim.customer_id)
      }
      reviewCreated++
    }
  }
  console.log(`  ✓ ${reviewCreated} pontos review (50pts cada)`)
}

/**
 * Activity log — histórico de ações da equipe nos últimos 30 dias.
 * "Carlos confirmou agendamento de Lucas", "Rafael concluiu agendamento
 * de João", etc. Aparece no painel admin > "Atividade da equipe".
 */
async function createActivityLog(
  businessId: string,
  profIds: { id: string; name: string }[]
) {
  console.log('📝 Criando activity log (histórico equipe)...')
  const todayMs = today().getTime()
  const actions = ['confirm', 'complete', 'cancel'] as const
  const verbs: Record<typeof actions[number], string> = {
    confirm: 'confirmou',
    complete: 'concluiu',
    cancel: 'cancelou',
  }

  // Busca alguns appointments recentes pra referenciar
  const { data: recentAppts } = await supabase
    .from('appointments')
    .select('id, client_name, appointment_date, start_time')
    .eq('business_id', businessId)
    .order('appointment_date', { ascending: false })
    .limit(80)

  if (!recentAppts || recentAppts.length === 0) {
    console.log('  ⚠ sem appointments pra referenciar — pulando')
    return
  }

  const logs: Array<Record<string, unknown>> = []
  for (let i = 0; i < 40; i++) {
    const appt = recentAppts[Math.floor(rand() * recentAppts.length)]
    const prof = profIds[Math.floor(rand() * profIds.length)]
    const action = actions[Math.floor(rand() * actions.length)]
    const daysAgo = randInt(rand(), 0, 25)
    const at = new Date(todayMs - daysAgo * 86400000 - randInt(rand(), 0, 8) * 3600000)
    logs.push({
      business_id: businessId,
      professional_id: prof.id,
      action,
      target_type: 'appointment',
      target_id: appt.id,
      description: `${prof.name} ${verbs[action]} agendamento de ${appt.client_name} (${appt.appointment_date} às ${(appt.start_time as string).slice(0, 5)})`,
      created_at: at.toISOString(),
    })
  }

  for (let i = 0; i < logs.length; i += 50) {
    const batch = logs.slice(i, i + 50)
    const { error } = await supabase.from('activity_log').insert(batch)
    if (error) console.warn(`  ⚠ erro activity_log: ${error.message}`)
  }
  console.log(`  ✓ ${logs.length} entradas de activity log (últimos 25 dias)`)
}

async function createExpenses(businessId: string) {
  console.log('💸 Criando despesas (mês passado completo + mês corrente parcial)...')
  const todayDate = today()
  const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
  const lastMonthStart = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1)

  // Mês passado: despesas completas (mês fechado, lucro real bonito)
  // Mês corrente: só fixas que já caíram (Aluguel + Internet) — proporcional aos dias
  const expenses = [
    // ========== MÊS PASSADO (completo) ==========
    { name: 'Aluguel', category: 'rent', amount: 2500, recurring: true, occurred_at: dateStr(addDays(lastMonthStart, 4)), notes: 'Pago via PIX dia 5' },
    { name: 'Energia + Água', category: 'utilities', amount: 320, recurring: true, occurred_at: dateStr(addDays(lastMonthStart, 8)), notes: null },
    { name: 'Internet/Wi-Fi', category: 'utilities', amount: 99, recurring: true, occurred_at: dateStr(addDays(lastMonthStart, 9)), notes: null },
    { name: 'Pomadas + Cera (estoque)', category: 'products', amount: 580, recurring: false, occurred_at: dateStr(addDays(lastMonthStart, 6)), notes: 'Reposição mensal' },
    { name: 'Tintas pra pigmentação', category: 'products', amount: 280, recurring: false, occurred_at: dateStr(addDays(lastMonthStart, 14)), notes: null },
    { name: 'Toalhas + capas (estoque)', category: 'products', amount: 150, recurring: false, occurred_at: dateStr(addDays(lastMonthStart, 17)), notes: null },
    { name: 'Tráfego pago Instagram', category: 'marketing', amount: 200, recurring: true, occurred_at: dateStr(addDays(lastMonthStart, 2)), notes: 'Meta Ads — campanha mensal' },
    { name: 'Contador (mensalidade)', category: 'taxes', amount: 250, recurring: true, occurred_at: dateStr(addDays(lastMonthStart, 7)), notes: null },
    { name: 'Material de limpeza', category: 'other', amount: 85, recurring: false, occurred_at: dateStr(addDays(lastMonthStart, 19)), notes: null },
    { name: 'Conserto máquina', category: 'other', amount: 120, recurring: false, occurred_at: dateStr(addDays(lastMonthStart, 22)), notes: 'Quebrou polia' },

    // ========== MÊS CORRENTE (so 1 fixa caida — demo lucro alto) ==========
    // Soh aluguel ainda — outras despesas caem mais tarde no mes (10/15/20).
    // Demo: dono ve "lucro real do mes" alto pq despesas estao no inicio.
    { name: 'Aluguel', category: 'rent', amount: 2500, recurring: true, occurred_at: dateStr(monthStart), notes: 'Pago via PIX dia 1' },
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

async function createCoupons(
  businessId: string,
  customers: { id: string; name: string; phone: string; isSumido: boolean }[]
) {
  console.log('🎟 Criando cupons (campanha de reativação)...')
  const todayMs = today().getTime()
  const sumidos = customers.filter((c) => c.isSumido)
  const ativos = customers.filter((c) => !c.isSumido)

  const coupons: Array<Record<string, unknown>> = []
  const campaignId = `camp_${Date.now()}`

  // 5 cupons ATIVOS — gerados pra sumidos, ainda não usados, expira em 14d
  for (let i = 0; i < Math.min(5, sumidos.length); i++) {
    const c = sumidos[i]
    const code = `VOLTE${String.fromCharCode(65 + i)}${randInt(rand(), 100, 999)}`
    const sentAt = new Date(todayMs - randInt(rand(), 1, 5) * 86400000)
    const expiresAt = new Date(todayMs + 14 * 86400000)
    coupons.push({
      business_id: businessId,
      customer_id: c.id,
      code,
      discount_type: 'fixed',
      discount_value: 10,
      expires_at: expiresAt.toISOString(),
      campaign_id: campaignId,
      whatsapp_message: `Oi ${c.name.split(' ')[0]}! Notei que faz um tempinho que a gente não se vê. Pra te receber de volta, separei um cupom de R$10 OFF. Válido por 14 dias. Use o código ${code} ao agendar.`,
      sent_at: sentAt.toISOString(),
    })
  }

  // 3 USADOS — sumidos que voltaram (used_at preenchido)
  for (let i = 0; i < Math.min(3, sumidos.length - 5); i++) {
    const c = sumidos[5 + i]
    if (!c) break
    const code = `RECUP${String.fromCharCode(65 + i)}${randInt(rand(), 100, 999)}`
    const sentAt = new Date(todayMs - randInt(rand(), 20, 35) * 86400000)
    const usedAt = new Date(todayMs - randInt(rand(), 5, 18) * 86400000)
    const expiresAt = new Date(usedAt.getTime() + 5 * 86400000)
    coupons.push({
      business_id: businessId,
      customer_id: c.id,
      code,
      discount_type: 'fixed',
      discount_value: 10,
      expires_at: expiresAt.toISOString(),
      used_at: usedAt.toISOString(),
      campaign_id: campaignId,
      whatsapp_message: `Oi ${c.name.split(' ')[0]}! ...`,
      sent_at: sentAt.toISOString(),
    })
  }

  // 2 EXPIRADOS — campanha antiga, cliente não usou
  for (let i = 0; i < 2; i++) {
    const c = ativos[i]
    if (!c) break
    const code = `OLD${String.fromCharCode(65 + i)}${randInt(rand(), 100, 999)}`
    const sentAt = new Date(todayMs - 60 * 86400000)
    const expiresAt = new Date(todayMs - 35 * 86400000)
    coupons.push({
      business_id: businessId,
      customer_id: c.id,
      code,
      discount_type: 'percent',
      discount_value: 15,
      expires_at: expiresAt.toISOString(),
      campaign_id: 'camp_old',
      whatsapp_message: `Promoção antiga ...`,
      sent_at: sentAt.toISOString(),
    })
  }

  for (const c of coupons) {
    const { error } = await supabase.from('coupons').insert(c)
    if (error) console.warn(`  ⚠ erro cupom ${c.code}: ${error.message}`)
  }
  console.log(`  ✓ ${coupons.length} cupons (5 ativos · 3 usados · 2 expirados)`)
}

async function createReviewClaims(
  businessId: string,
  customers: { id: string; name: string; phone: string; isSumido: boolean }[]
) {
  console.log('⭐ Criando review claims (pedidos de pontos por review Google)...')
  const todayMs = today().getTime()
  const ativos = customers.filter((c) => !c.isSumido).slice(0, 5)

  const claims: Array<Record<string, unknown>> = []
  // 3 PENDENTES (badge laranja na home admin)
  for (let i = 0; i < 3; i++) {
    const c = ativos[i]
    if (!c) break
    claims.push({
      business_id: businessId,
      customer_id: c.id,
      customer_phone: c.phone,
      customer_name: c.name,
      status: 'pending',
      requested_at: new Date(todayMs - randInt(rand(), 1, 5) * 86400000).toISOString(),
    })
  }
  // 2 APROVADOS (já receberam pontos — histórico)
  for (let i = 3; i < 5; i++) {
    const c = ativos[i]
    if (!c) break
    const requested = new Date(todayMs - randInt(rand(), 7, 14) * 86400000)
    const resolved = new Date(requested.getTime() + 86400000)
    claims.push({
      business_id: businessId,
      customer_id: c.id,
      customer_phone: c.phone,
      customer_name: c.name,
      status: 'approved',
      points_awarded: 50,
      requested_at: requested.toISOString(),
      resolved_at: resolved.toISOString(),
    })
  }

  for (const claim of claims) {
    const { error } = await supabase.from('review_claims').insert(claim)
    if (error) console.warn(`  ⚠ erro review_claim: ${error.message}`)
  }
  console.log(`  ✓ ${claims.length} review claims (3 pendentes · 2 aprovados)`)
}

async function validateSeed(businessId: string) {
  console.log('🔍 Validação SQL pós-seed...')
  const { data: ptStats } = await supabase
    .from('points_transactions')
    .select('points')
    .eq('business_id', businessId)
  const totalPts = (ptStats || []).reduce((s, t) => s + (t.points || 0), 0)

  const { data: custStats } = await supabase
    .from('customers')
    .select('total_points')
    .eq('business_id', businessId)
  const sumCustPts = (custStats || []).reduce((s, c) => s + (c.total_points || 0), 0)

  const { count: couponsCount } = await supabase
    .from('coupons')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)

  const { count: claimsCount } = await supabase
    .from('review_claims')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)

  console.log(`  · points_transactions: ${ptStats?.length || 0} rows, total ${totalPts} pts`)
  console.log(`  · customers.total_points (soma): ${sumCustPts} pts`)
  console.log(`  · coupons: ${couponsCount || 0}`)
  console.log(`  · review_claims: ${claimsCount || 0}`)

  if (totalPts === 0) {
    console.warn('  ⚠ ATENÇÃO: nenhum ponto criado. Trigger V15 pode não ter disparado.')
  } else {
    console.log(`  ✅ Pontos OK — sistema fidelidade ativo`)
  }
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
  // Carlos é o owner (1º profissional)
  const carlosId = profIds[0].id
  await boostCarlosToday(businessId, carlosId, serviceIds, customers)
  await createExpenses(businessId)
  await createCoupons(businessId, customers)
  await createReviewClaims(businessId, customers)
  await createBonusPoints(businessId, customers)
  await createActivityLog(businessId, profIds)
  await validateSeed(businessId)

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ SEED COMPLETO')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('🔑 CREDENCIAIS:')
  console.log('   ┌── DONO (admin completo) ──────────────────┐')
  console.log(`   │ Email: ${DEMO.email}`)
  console.log(`   │ Senha: ${DEMO.password}`)
  console.log('   ├── PROFISSIONAIS COMISSIONADOS ────────────┤')
  for (const p of PROFESSIONALS) {
    if (!p.isOwner && p.email) {
      console.log(`   │ ${p.name.padEnd(18)} → ${p.email}`)
    }
  }
  console.log(`   │ Senha (todos):       AgendaPRO@2026`)
  console.log('   └───────────────────────────────────────────┘')
  console.log('')
  console.log('🌐 LINKS:')
  console.log(`   Admin:        https://agendapro.net.br/admin/login`)
  console.log(`   Profissional: https://agendapro.net.br/profissional/login`)
  console.log(`   Público:      https://agendapro.net.br/${DEMO.slug}`)
  console.log(`   Agendar:      https://agendapro.net.br/${DEMO.slug}/agendar`)
  console.log('')
}

main().catch((err) => {
  console.error('❌ ERRO FATAL:', err)
  process.exit(1)
})
