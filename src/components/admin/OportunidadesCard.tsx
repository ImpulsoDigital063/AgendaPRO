import Link from 'next/link'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { IconStar, IconWhatsapp } from '@/components/ui/Icon'

/**
 * Widget "Oportunidades" da Home · ativa cliente parado + lembra de aniversariantes.
 * 2 seções compactas:
 *  - Aniversariantes (próximos 7 dias)
 *  - Sumidos (último atendimento > 60 dias)
 *
 * Click no nome abre ?customer=ID (cliente drawer)
 * Botão WhatsApp abre wa.me com mensagem pré-pronta.
 *
 * Salão99 NÃO tem esse widget na home · diferencial do AgendaPRO.
 */

type Props = {
  businessId: string
  businessName: string
}

type Customer = {
  id: string
  name: string
  phone: string | null
  birthday: string | null
  last_visit_at?: string | null
}

function todayMMDD(): string {
  const d = new Date()
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function in7DaysMMDD(): string[] {
  const out: string[] = []
  const d = new Date()
  for (let i = 0; i < 7; i++) {
    const x = new Date(d)
    x.setDate(d.getDate() + i)
    out.push(`${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`)
  }
  return out
}

function birthdayLabel(birthday: string | null): string | null {
  if (!birthday) return null
  // birthday é YYYY-MM-DD
  const parts = birthday.split('-')
  if (parts.length !== 3) return null
  const mm = parts[1]
  const dd = parts[2]
  const today = new Date()
  const isToday = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}` === `${mm}-${dd}`
  if (isToday) return 'Hoje'
  // calcula distância em dias
  const thisYear = today.getFullYear()
  const target = new Date(`${thisYear}-${mm}-${dd}`)
  if (target < today) target.setFullYear(thisYear + 1)
  const days = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (days === 1) return 'Amanhã'
  return `Em ${days}d`
}

function whatsappUrl(phone: string | null, msg: string): string | null {
  if (!phone) return null
  const clean = phone.replace(/\D/g, '')
  if (!clean) return null
  return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`
}

export default async function OportunidadesCard({ businessId, businessName }: Props) {
  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Aniversariantes nos próximos 7 dias
  // Como birthday é YYYY-MM-DD e ano varia, fazemos match no MM-DD com regex
  const week = in7DaysMMDD()
  const { data: birthdayCustomers } = await sb
    .from('customers')
    .select('id, name, phone, birthday')
    .eq('business_id', businessId)
    .not('birthday', 'is', null)
    .limit(200)

  const aniversariantes: Customer[] = ((birthdayCustomers ?? []) as Customer[])
    .filter((c) => {
      if (!c.birthday) return false
      const mmdd = c.birthday.split('-').slice(1).join('-')
      return week.includes(mmdd)
    })
    .sort((a, b) => {
      const ammdd = a.birthday!.split('-').slice(1).join('-')
      const bmmdd = b.birthday!.split('-').slice(1).join('-')
      const today = todayMMDD()
      // ordena: hoje primeiro, depois cronológico
      if (ammdd === today && bmmdd !== today) return -1
      if (bmmdd === today && ammdd !== today) return 1
      return ammdd.localeCompare(bmmdd)
    })
    .slice(0, 5)

  // Clientes sumidos · último appointment > 60 dias atrás
  const sessenta = new Date()
  sessenta.setDate(sessenta.getDate() - 60)
  const sessentaIso = sessenta.toISOString().slice(0, 10)

  // Pega clientes com último atendimento entre 60-180 dias atrás (não muito antigos pra reativar)
  const cento80 = new Date()
  cento80.setDate(cento80.getDate() - 180)
  const cento80Iso = cento80.toISOString().slice(0, 10)

  // RPC seria ideal · vou fazer 2 queries (todos com appt no range + agrupar pelo último)
  const { data: oldAppts } = await sb
    .from('appointments')
    .select('customer_id, appointment_date')
    .eq('business_id', businessId)
    .gte('appointment_date', cento80Iso)
    .lt('appointment_date', sessentaIso)
    .in('status', ['completed', 'confirmed'])
    .order('appointment_date', { ascending: false })
    .limit(500)

  // Pega últimos atendimentos pra cada customer · só conta como sumido se o ULTIMO foi > 60 dias
  const recentAppts = await sb
    .from('appointments')
    .select('customer_id')
    .eq('business_id', businessId)
    .gte('appointment_date', sessentaIso)
    .in('status', ['completed', 'confirmed', 'pending'])
    .limit(1000)

  const customersWithRecentVisit = new Set(
    ((recentAppts.data ?? []) as { customer_id: string | null }[]).map((a) => a.customer_id).filter(Boolean),
  )

  // De oldAppts, pega 1ª ocorrência de cada customer (= último atendimento dele)
  const lastAppointmentByCustomer = new Map<string, string>()
  for (const a of (oldAppts ?? []) as { customer_id: string | null; appointment_date: string }[]) {
    if (!a.customer_id) continue
    if (customersWithRecentVisit.has(a.customer_id)) continue
    if (!lastAppointmentByCustomer.has(a.customer_id)) {
      lastAppointmentByCustomer.set(a.customer_id, a.appointment_date)
    }
  }

  const sumidosIds = Array.from(lastAppointmentByCustomer.keys()).slice(0, 20)
  let sumidos: Customer[] = []
  if (sumidosIds.length > 0) {
    const { data: sumidoCustomers } = await sb
      .from('customers')
      .select('id, name, phone, birthday')
      .in('id', sumidosIds)
      .eq('business_id', businessId)
    sumidos = ((sumidoCustomers ?? []) as Customer[])
      .map((c) => ({ ...c, last_visit_at: lastAppointmentByCustomer.get(c.id) ?? null }))
      .sort((a, b) => (b.last_visit_at ?? '').localeCompare(a.last_visit_at ?? ''))
      .slice(0, 5)
  }

  const nada = aniversariantes.length === 0 && sumidos.length === 0

  if (nada) {
    return null // não mostra widget se não há oportunidades
  }

  return (
    <section
      className="rounded-2xl p-4"
      style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <header className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold inline-flex items-center gap-1.5" style={{ color: 'var(--admin-text)' }}>
          <span style={{ color: 'var(--admin-accent)' }}>★</span> Oportunidades hoje
        </h3>
      </header>

      <div className="space-y-4">
        {aniversariantes.length > 0 && (
          <OportunidadeSubsection
            label="Aniversariantes da semana"
            count={aniversariantes.length}
            items={aniversariantes.map((c) => ({
              id: c.id,
              name: c.name,
              sublabel: birthdayLabel(c.birthday) ?? '',
              waUrl: whatsappUrl(
                c.phone,
                `Oi ${c.name}! ${birthdayLabel(c.birthday) === 'Hoje' ? 'Hoje é seu dia!' : 'Tá chegando seu aniversário!'} A ${businessName} quer te dar um mimo. Vem comemorar com a gente?`,
              ),
            }))}
          />
        )}

        {sumidos.length > 0 && (
          <OportunidadeSubsection
            label="Clientes sumidos"
            count={sumidos.length}
            items={sumidos.map((c) => {
              const dias = c.last_visit_at
                ? Math.floor((Date.now() - new Date(c.last_visit_at).getTime()) / (1000 * 60 * 60 * 24))
                : 0
              return {
                id: c.id,
                name: c.name,
                sublabel: `Última visita há ${dias} dias`,
                waUrl: whatsappUrl(
                  c.phone,
                  `Oi ${c.name}, tudo bem? Vimos que faz um tempinho que não te encontramos por aqui na ${businessName}. Bora marcar um horário?`,
                ),
              }
            })}
          />
        )}
      </div>
    </section>
  )
}

// Sub-bloco genérico · garante visual idêntico entre Aniversariantes e Sumidos.
function OportunidadeSubsection({
  label,
  count,
  items,
}: {
  label: string
  count: number
  items: { id: string; name: string; sublabel: string; waUrl: string | null }[]
}) {
  return (
    <div>
      <p
        className="text-[10px] font-bold uppercase tracking-widest mb-2 inline-flex items-center gap-1.5"
        style={{ color: 'var(--admin-text-faded)' }}
      >
        <IconStar size={11} /> {label} · {count}
      </p>
      <ul className="space-y-1.5">
        {items.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <Link
              href={`/admin/clientes?customer=${c.id}`}
              className="flex-1 min-w-0 flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--admin-input-bg)]"
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{
                  background: 'color-mix(in srgb, var(--admin-accent) 18%, transparent)',
                  color: 'var(--admin-accent)',
                }}
              >
                {c.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
                  {c.name}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--admin-text-faded)' }}>
                  {c.sublabel}
                </p>
              </div>
            </Link>
            {c.waUrl && (
              <a
                href={c.waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#25D366', color: '#fff' }}
                title="Mandar mensagem"
              >
                <IconWhatsapp size={12} />
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
