import { createClient as createServiceClient } from '@supabase/supabase-js'
import GradeTimelineHeader from './GradeTimelineHeader'

type Props = {
  businessId: string
  date: string
}

type ApptRow = {
  id: string
  professional_id: string
  start_time: string
  end_time: string
  status: string
  client_name: string | null
  service_name: string | null
  total_price: number | null
  paid_at: string | null
}

const SLOT_HEIGHT = 56 // px por slot de 30min
const HOUR_START = 7 // 07:00 começa a grade (ajuste futuro: business_hours)
const HOUR_END = 22 // 22:00 termina

// 8 cores curadas pra cards · hash do service_name → cor consistente
const SERVICE_COLORS = [
  '#01A197', // teal Palace
  '#C9A961', // dourado Palace
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
]

function colorFor(seed: string | null): string {
  if (!seed) return SERVICE_COLORS[0]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h << 5) - h + seed.charCodeAt(i)
  return SERVICE_COLORS[Math.abs(h) % SERVICE_COLORS.length]
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function buildSlots(): string[] {
  const out: string[] = []
  for (let h = HOUR_START; h < HOUR_END; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`)
    out.push(`${String(h).padStart(2, '0')}:30`)
  }
  return out
}

export default async function GradeTimeline({ businessId, date }: Props) {
  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const [{ data: profsData }, { data: apptsData }] = await Promise.all([
    sb
      .from('professionals')
      .select('id, name, photo_url, is_receptionist')
      .eq('business_id', businessId)
      .eq('active', true)
      .order('name'),
    sb
      .from('appointments')
      .select('id, professional_id, start_time, end_time, status, client_name, service_name, total_price, paid_at')
      .eq('business_id', businessId)
      .eq('appointment_date', date)
      .neq('status', 'cancelled')
      .order('start_time'),
  ])

  const profs = (profsData ?? []).filter((p) => !p.is_receptionist)
  const appts = (apptsData ?? []) as ApptRow[]
  const slots = buildSlots()
  const gridHeight = slots.length * SLOT_HEIGHT
  const dayStartMin = HOUR_START * 60

  return (
    <div className="grade-timeline">
      <GradeTimelineHeader date={date} totalAppts={appts.length} />

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
        }}
      >
        {/* Header de profs (sticky) */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: `64px repeat(${profs.length}, minmax(140px, 1fr))`,
            background: 'var(--admin-surface-hi)',
            borderBottom: '1px solid var(--admin-border)',
            position: 'sticky',
            top: 0,
            zIndex: 5,
          }}
        >
          <div /> {/* corner vazio */}
          {profs.map((p) => (
            <div key={p.id} className="px-3 py-3 flex items-center gap-2 min-w-0">
              <span
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden"
                style={{ background: colorFor(p.id), color: '#fff' }}
              >
                {p.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  p.name.slice(0, 1).toUpperCase()
                )}
              </span>
              <span
                className="text-sm font-semibold truncate"
                style={{ color: 'var(--admin-text)' }}
                title={p.name}
              >
                {p.name}
              </span>
            </div>
          ))}
        </div>

        {/* Grade */}
        <div
          className="grid relative overflow-auto"
          style={{
            gridTemplateColumns: `64px repeat(${profs.length}, minmax(140px, 1fr))`,
            maxHeight: 'calc(100svh - 220px)',
          }}
        >
          {/* Coluna de horas */}
          <div className="relative" style={{ height: gridHeight }}>
            {slots.map((s, i) => (
              <div
                key={s}
                className="text-[11px] font-medium tabular-nums px-2 flex items-start pt-1"
                style={{
                  position: 'absolute',
                  top: i * SLOT_HEIGHT,
                  left: 0,
                  right: 0,
                  height: SLOT_HEIGHT,
                  color: s.endsWith(':00') ? 'var(--admin-text-mute)' : 'var(--admin-text-faded)',
                  borderTop: s.endsWith(':00') ? '1px solid var(--admin-divider)' : 'none',
                }}
              >
                {s.endsWith(':00') ? s : ''}
              </div>
            ))}
          </div>

          {/* Colunas por prof */}
          {profs.map((p) => {
            const profAppts = appts.filter((a) => a.professional_id === p.id)
            return (
              <div
                key={p.id}
                className="relative"
                style={{
                  height: gridHeight,
                  borderLeft: '1px solid var(--admin-divider)',
                }}
              >
                {/* Linhas de fundo · uma por slot · linha mais escura nas horas cheias */}
                {slots.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      top: i * SLOT_HEIGHT,
                      left: 0,
                      right: 0,
                      height: SLOT_HEIGHT,
                      borderTop: s.endsWith(':00')
                        ? '1px solid var(--admin-divider)'
                        : '1px dashed color-mix(in srgb, var(--admin-divider) 50%, transparent)',
                    }}
                  />
                ))}

                {/* Cards de agendamento */}
                {profAppts.map((a) => {
                  const startMin = timeToMinutes(a.start_time)
                  const endMin = timeToMinutes(a.end_time)
                  const top = ((startMin - dayStartMin) / 30) * SLOT_HEIGHT
                  const height = ((endMin - startMin) / 30) * SLOT_HEIGHT
                  const color = colorFor(a.service_name)
                  const isPaid = !!a.paid_at
                  const isPending = a.status === 'pending'
                  return (
                    <a
                      key={a.id}
                      href={`/admin/atendimentos/${a.id}`}
                      className="absolute left-1 right-1 rounded-lg p-2 flex flex-col overflow-hidden hover:scale-[1.02] transition-transform"
                      style={{
                        top,
                        height: Math.max(height - 2, 24),
                        background: `color-mix(in srgb, ${color} 20%, var(--admin-surface))`,
                        borderLeft: `3px solid ${color}`,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                        zIndex: 2,
                      }}
                      title={`${a.start_time.slice(0, 5)} · ${a.client_name ?? 'Cliente'} · ${a.service_name ?? 'Serviço'}`}
                    >
                      <span
                        className="text-[11px] font-bold tabular-nums leading-tight"
                        style={{ color }}
                      >
                        {a.start_time.slice(0, 5)} · {a.end_time.slice(0, 5)}
                      </span>
                      <span
                        className="text-xs font-semibold truncate"
                        style={{ color: 'var(--admin-text)' }}
                      >
                        {a.client_name ?? 'Cliente'}
                      </span>
                      {height >= SLOT_HEIGHT * 1.5 && (
                        <span
                          className="text-[11px] truncate"
                          style={{ color: 'var(--admin-text-mute)' }}
                        >
                          {a.service_name ?? '—'}
                        </span>
                      )}
                      {isPending && (
                        <span
                          className="text-[9px] font-bold uppercase mt-auto inline-block w-fit px-1 py-0.5 rounded"
                          style={{ background: 'var(--admin-warning,#F59E0B)', color: '#000' }}
                        >
                          A confirmar
                        </span>
                      )}
                      {isPaid && (
                        <span
                          className="text-[9px] font-bold uppercase mt-auto inline-block w-fit px-1 py-0.5 rounded"
                          style={{ background: 'var(--admin-success,#10B981)', color: '#fff' }}
                        >
                          Pago
                        </span>
                      )}
                    </a>
                  )
                })}

                {/* Vazio · profs sem appointments */}
                {profAppts.length === 0 && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{ color: 'var(--admin-text-faded)' }}
                  >
                    <span className="text-xs">Livre</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
