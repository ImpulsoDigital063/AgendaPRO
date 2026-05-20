/**
 * SEED — Agendamentos de TESTE pra Eduardo testar bugs B1/B2 + feature F1
 *
 * Cobre: HOJE + resto desta semana + próxima semana inteira (11 dias úteis).
 * Domingos pulados (Império fechado).
 *
 * Por dia, 5 cenários estratégicos rotacionados (cobrem B1 e B2):
 *   1. Corte Simples              (1 serviço · controle)
 *   2. Corte + Barba              (1 serviço combinado pré-pronto)
 *   3. Corte Degradê + Sobranc    (2 svc · B2)
 *   4. Corte + Barba Trad + Sob   (3 svc · B2)
 *   5. Pigmentação + Corte + Bar + Sob  (4 svc · B1 + B2)
 *
 * Slots: 09:00 · 10:30 · 11:30 · 14:00 · 15:30
 *
 * Status:
 *   · Slots PASSADOS (date+end_time < now)  → INSERT confirmed → UPDATE completed → paid_at preenchido
 *   · Slots FUTUROS                          → status='confirmed'
 *
 * Idempotente: apaga todos os agendamentos cujo client_name começa com "TESTE "
 * antes de recriar.
 *
 * Roda: npx tsx scripts/seed-agendamentos-teste.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf8')
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1')
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('ERRO: faltam env vars'); process.exit(1) }
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

const SLUG = 'imperio-barbershop'

function pad(n: number) { return String(n).padStart(2, '0') }
function dateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function dmStr(d: Date) { return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}` }
function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}
function timeToMin(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🧪 SEED — Agendamentos TESTE · 2 semanas')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // ─── Discovery ──────────────────────────────────────────────
  const { data: biz } = await supabase
    .from('businesses').select('id, name').eq('slug', SLUG).single()
  if (!biz) { console.error(`Business ${SLUG} não encontrado.`); process.exit(1) }
  console.log(`✓ business: ${biz.name}`)

  const { data: profs } = await supabase
    .from('professionals').select('id, name, role')
    .eq('business_id', biz.id).eq('active', true)
  const carlos = profs?.find((p) => p.role === 'owner') ?? profs?.[0]
  if (!carlos) { console.error('Sem profissional ativo'); process.exit(1) }
  console.log(`✓ profissional: ${carlos.name}`)

  const { data: services } = await supabase
    .from('services').select('id, name, price, duration_minutes, points')
    .eq('business_id', biz.id).eq('active', true)
  if (!services || services.length === 0) { console.error('Sem serviços'); process.exit(1) }
  const byName = (n: string) => {
    const s = services.find((x) => x.name === n)
    if (!s) throw new Error(`Serviço "${n}" não encontrado`)
    return s
  }

  // ─── Cleanup TESTE * antigos ───────────────────────────────
  const { data: existing } = await supabase
    .from('appointments').select('id').eq('business_id', biz.id).like('client_name', 'TESTE %')
  const oldIds = (existing || []).map((a) => a.id)
  if (oldIds.length > 0) {
    await supabase.from('appointment_services').delete().in('appointment_id', oldIds)
    await supabase.from('appointments').delete().in('id', oldIds)
    console.log(`🧹 ${oldIds.length} TESTE antigos apagados`)
  }

  // ─── Calendário: hoje + resto semana + próxima semana, pula domingo ─
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dias: Date[] = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    if (d.getDay() === 0) continue // domingo fechado
    dias.push(d)
  }
  console.log(`📅 ${dias.length} dias úteis: ${dmStr(dias[0])} → ${dmStr(dias[dias.length - 1])}`)

  // ─── Cenários (combinações de serviços) ────────────────────
  const cenarios: { svc: string[]; label: string }[] = [
    { svc: ['Corte Simples'],                                                                  label: 'Corte simples' },
    { svc: ['Corte + Barba'],                                                                   label: 'Corte+Barba' },
    { svc: ['Corte Degradê', 'Sobrancelha'],                                                    label: 'Degradê+Sobr' },
    { svc: ['Corte Simples', 'Barba Tradicional', 'Sobrancelha'],                               label: 'Corte+Barba+Sobr' },
    { svc: ['Pigmentação Capilar', 'Corte Simples', 'Barba Tradicional', 'Sobrancelha'],        label: 'Pig+Corte+Barba+Sobr' },
  ]
  const slots = ['09:00', '10:30', '11:30', '14:00', '15:30']

  // ─── Geração ──────────────────────────────────────────────
  const nowMs = Date.now()
  const futuroIds: string[] = []
  const passadoIds: string[] = []
  // Pra cada passado, guardamos paid_at + payment_method pra aplicar pós-UPDATE
  const passadoMeta = new Map<string, { paid_at: string; payment_method: string }>()
  let contador = 0
  let inseridos = 0
  let pulados = 0

  for (let dIdx = 0; dIdx < dias.length; dIdx++) {
    const d = dias[dIdx]
    const dateString = dateStr(d)
    for (let sIdx = 0; sIdx < slots.length; sIdx++) {
      const startTime = slots[sIdx]
      const cenIdx = (dIdx + sIdx) % cenarios.length // rotaciona pra variar combinação
      const cen = cenarios[cenIdx]
      const svcs = cen.svc.map(byName)
      const totalDur = svcs.reduce((s, x) => s + x.duration_minutes, 0)
      const totalPrice = svcs.reduce((s, x) => s + Number(x.price), 0)
      const endTime = addMinutes(startTime, totalDur)
      if (timeToMin(endTime) > 18 * 60) { pulados++; continue }

      contador++
      const idxStr = pad(contador)
      const clientName = `TESTE ${dmStr(d)} ${startTime} · ${cen.label}`
      const phone = `63999990${idxStr.padStart(3, '0')}`

      // Determina se passado: endTime do dia já passou
      const [eh, em] = endTime.split(':').map(Number)
      const apptEnd = new Date(d)
      apptEnd.setHours(eh, em, 0, 0)
      const isPassado = apptEnd.getTime() < nowMs

      const { data: appt, error } = await supabase
        .from('appointments')
        .insert({
          business_id: biz.id,
          professional_id: carlos.id,
          client_name: clientName,
          client_phone: phone,
          client_email: null,
          service_id: svcs[0].id,
          service_name: svcs[0].name,
          total_price: totalPrice,
          appointment_date: dateString,
          start_time: startTime,
          end_time: endTime,
          status: 'confirmed',
        })
        .select('id').single()
      if (error || !appt) { console.warn(`  ⚠ ${clientName}: ${error?.message}`); continue }
      inseridos++

      // appointment_services — todos os serviços (mesmo se 1 só, mantém consistência)
      const apptSvcsRows = svcs.map((s) => ({
        appointment_id: appt.id,
        service_id: s.id,
        service_name: s.name,
        price: s.price,
        duration_minutes: s.duration_minutes,
      }))
      await supabase.from('appointment_services').insert(apptSvcsRows)

      if (isPassado) {
        passadoIds.push(appt.id)
        // método pagamento determinístico baseado no contador (60% pix · 25% cash · 15% card)
        const r = (contador * 7) % 100
        const pm = r < 60 ? 'pix' : r < 85 ? 'cash' : 'card'
        const paidDt = new Date(d)
        paidDt.setHours(eh, em, 0, 0)
        passadoMeta.set(appt.id, { paid_at: paidDt.toISOString(), payment_method: pm })
      } else {
        futuroIds.push(appt.id)
      }
    }
  }

  console.log(`✓ ${inseridos} agendamentos inseridos (confirmed) · ${pulados} pulados por horário > 18h`)

  // ─── Confirmar pagamentos dos passados ────────────────────
  console.log(`💸 Marcando ${passadoIds.length} passados como completed + pagos...`)
  let completed = 0
  for (const id of passadoIds) {
    const meta = passadoMeta.get(id)!
    // UPDATE status pra completed (dispara trigger V15, mas como customer NULL não credita)
    const { error: e1 } = await supabase
      .from('appointments').update({ status: 'completed' }).eq('id', id)
    if (e1) { console.warn(`  ⚠ update status ${id}: ${e1.message}`); continue }
    const { error: e2 } = await supabase
      .from('appointments')
      .update({ paid_at: meta.paid_at, payment_method: meta.payment_method })
      .eq('id', id)
    if (e2) { console.warn(`  ⚠ paid_at ${id}: ${e2.message}`); continue }
    completed++
  }
  console.log(`  ✓ ${completed} passados marcados como pagos`)

  // ─── Resumo ──────────────────────────────────────────────
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ TOTAL: ${inseridos} agendamentos · ${completed} pagos · ${futuroIds.length} confirmados (futuros)`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('🌐 https://agendapro.net.br/admin/login')
  console.log('   demo-imperio@agendapro.net.br · AgendaPRO@2026')
  console.log('')
  console.log('🎯 Pra testar bugs Olímpio:')
  console.log('   B1 modal rola      → /admin/agenda → futuros 4 ou 5 svcs · clica lápis')
  console.log('   B2 sobranc no card → cards com "Sobr" no nome devem listar sobrancelha')
  console.log('   F1 editar valor    → marcar passado como atendido · ajustar valor +/-')
}

main().catch((err) => { console.error('❌ ERRO:', err); process.exit(1) })
