import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { IconArrowLeft, IconCalendar, IconClock, IconDollar, IconUser } from '@/components/ui/Icon'
import AppointmentActions from '@/components/admin/atendimentos/AppointmentActions'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando confirmação',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Não compareceu',
}

const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#1AA9A8',
  completed: '#3B82F6',
  cancelled: '#EF4444',
  no_show: '#94A3B8',
}

function formatBRL(v: number | null): string {
  if (v == null) return 'R$ 0,00'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDateLong(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
}

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()
  if (!business) redirect('/cadastro')

  const { data: appt } = await supabase
    .from('appointments')
    .select(`
      id, appointment_date, start_time, end_time, status, paid_at,
      payment_method, total_price, notes,
      client_name, client_phone, customer_id,
      service_name, service_id,
      professional_id,
      professional:professionals(id, name),
      customer:customers(id, name, phone, email)
    `)
    .eq('id', id)
    .eq('business_id', business.id)
    .maybeSingle()

  if (!appt) notFound()

  const prof = Array.isArray(appt.professional) ? appt.professional[0] : appt.professional
  const customer = Array.isArray(appt.customer) ? appt.customer[0] : appt.customer
  const status = appt.status as string
  const statusLabel = STATUS_LABEL[status] ?? status
  const statusColor = STATUS_COLOR[status] ?? '#94A3B8'
  const isPaid = !!appt.paid_at
  const isCancelled = status === 'cancelled' || status === 'no_show'

  // Voltar pra timeline na data do agendamento
  const backHref = `/admin?date=${appt.appointment_date}`

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <div className="max-w-lg lg:max-w-3xl mx-auto px-4 lg:px-8 py-6 space-y-5">
        {/* Header com voltar */}
        <header className="flex items-center gap-3">
          <Link
            href={backHref}
            aria-label="Voltar pra timeline"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-[var(--admin-surface-hi)]"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            <IconArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
              Atendimento
            </p>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight" style={{ color: 'var(--admin-text)' }}>
              {appt.service_name ?? 'Serviço'}
            </h1>
          </div>
        </header>

        {/* Card principal · padrão B-híbrido premium 3D */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, var(--admin-surface) 0%, color-mix(in srgb, var(--admin-surface-hi) 70%, var(--admin-surface)) 100%)',
            border: '1px solid var(--admin-border)',
            borderTopColor: 'rgba(255,255,255,0.5)',
            boxShadow: '0 10px 28px -10px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.04)',
          }}
        >
          {/* Status bar */}
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{
              background: `linear-gradient(135deg, color-mix(in srgb, ${statusColor} 14%, var(--admin-surface)) 0%, color-mix(in srgb, ${statusColor} 8%, var(--admin-surface)) 100%)`,
              borderBottom: '1px solid var(--admin-divider)',
            }}
          >
            <span
              className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{
                background: `linear-gradient(135deg, ${statusColor} 0%, color-mix(in srgb, ${statusColor} 75%, black) 100%)`,
                color: '#fff',
                boxShadow: `0 2px 6px -1px color-mix(in srgb, ${statusColor} 50%, transparent), inset 0 1px 0 rgba(255,255,255,0.3)`,
              }}
            >
              {statusLabel}
            </span>
            {isPaid && (
              <span
                className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#fff',
                  boxShadow: '0 2px 6px -1px rgba(5,150,105,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                }}
              >
                ✓ Pago
              </span>
            )}
          </div>

          {/* Detalhe */}
          <div className="p-5 space-y-4">
            <Row icon={<IconUser size={16} />} label="Cliente" value={appt.client_name ?? customer?.name ?? '—'} sub={appt.client_phone ?? customer?.phone ?? undefined} />
            <Row icon={<IconCalendar size={16} />} label="Quando" value={<span className="capitalize">{formatDateLong(appt.appointment_date)}</span>} sub={`${appt.start_time.slice(0, 5)} até ${appt.end_time.slice(0, 5)}`} />
            <Row icon={<IconClock size={16} />} label="Profissional" value={prof?.name ?? '—'} />
            <Row icon={<IconDollar size={16} />} label="Valor" value={<span className="font-bold text-lg" style={{ color: 'var(--admin-text)' }}>{formatBRL(appt.total_price)}</span>} sub={appt.payment_method ?? undefined} />
            {appt.notes && (
              <div className="pt-3 border-t" style={{ borderColor: 'var(--admin-divider)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                  Observação
                </p>
                <p className="text-sm" style={{ color: 'var(--admin-text-2)' }}>{appt.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Ações · client component */}
        {!isCancelled && (
          <AppointmentActions
            appointmentId={appt.id}
            isPaid={isPaid}
            backHref={backHref}
            customerName={appt.client_name ?? customer?.name ?? 'Cliente'}
            customerPhone={appt.client_phone ?? customer?.phone ?? null}
            businessId={business.id}
            totalPrice={appt.total_price}
            serviceName={appt.service_name as string | null}
            professionalId={prof?.id ?? null}
          />
        )}
      </div>
    </main>
  )
}

function Row({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text-mute)' }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
          {label}
        </p>
        <div className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{value}</div>
        {sub && (
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>{sub}</p>
        )}
      </div>
    </div>
  )
}
