import { createClient as createServiceClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import CancelarConfirm from './CancelarConfirm'
import { verifyCancelToken } from '@/lib/token'
import { IconCalendar, IconClock, IconUsers, IconSparkles } from '@/components/ui/Icon'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function CancelarPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; token?: string }>
}) {
  const { id, token } = await searchParams

  if (!id) notFound()
  if (!token || !verifyCancelToken(id, token)) notFound()

  const supabase = getAdminClient()

  const { data: appointment } = await supabase
    .from('appointments')
    .select(
      'id, client_name, appointment_date, start_time, end_time, status, service_name, business:businesses(name, slug, brand_primary, brand_secondary, brand_mode), professional:professionals(name)'
    )
    .eq('id', id)
    .single()

  if (!appointment) notFound()

  const [year, month, day] = appointment.appointment_date.split('-')
  const dateFormatted = `${day}/${month}/${year}`
  const business = appointment.business as unknown as {
    name: string
    slug: string
    brand_primary: string | null
    brand_secondary: string | null
    brand_mode: 'dark' | 'light' | null
  } | null
  const professional = appointment.professional as unknown as { name: string } | null

  const primary = business?.brand_primary || '#3B82F6'
  const secondary = business?.brand_secondary || '#06B6D4'
  const mode = business?.brand_mode || 'light'
  const isDark = mode === 'dark'
  const cover = `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`

  // Formata data por extenso (capitaliza depois no estilo PT-BR)
  const dateObj = new Date(Number(year), Number(month) - 1, Number(day))
  const dateLong = dateObj.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const statusLabel =
    appointment.status === 'confirmed'
      ? 'Confirmado'
      : appointment.status === 'cancelled'
      ? 'Já cancelado'
      : 'Pendente'
  const statusColor =
    appointment.status === 'confirmed'
      ? { fg: isDark ? '#86EFAC' : '#15803D', bg: isDark ? 'rgba(34,197,94,0.15)' : 'rgb(220,252,231)' }
      : appointment.status === 'cancelled'
      ? { fg: isDark ? '#FCA5A5' : '#B91C1C', bg: isDark ? 'rgba(239,68,68,0.15)' : 'rgb(254,226,226)' }
      : { fg: isDark ? '#FCD34D' : '#B45309', bg: isDark ? 'rgba(251,191,36,0.15)' : 'rgb(254,243,199)' }

  return (
    <main
      className="min-h-screen"
      style={
        {
          background: isDark ? '#050713' : '#F8FAFC',
          color: isDark ? '#F8FAFC' : '#0F172A',
          ['--brand-primary' as string]: primary,
          ['--brand-secondary' as string]: secondary,
        } as React.CSSProperties
      }
    >
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* HERO branded */}
        <div
          className="relative overflow-hidden rounded-3xl p-6 text-white"
          style={{ background: cover, boxShadow: '0 18px 40px -18px rgba(0,0,0,0.45)' }}
        >
          <div
            aria-hidden
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)', filter: 'blur(14px)' }}
          />
          <div
            aria-hidden
            className="absolute -bottom-14 -left-10 w-44 h-44 rounded-full"
            style={{ background: 'rgba(255,255,255,0.08)', filter: 'blur(16px)' }}
          />
          <div className="relative flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(255,255,255,0.22)',
                border: '1px solid rgba(255,255,255,0.4)',
                backdropFilter: 'blur(6px)',
              }}
            >
              <IconCalendar size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
                Confira antes de cancelar
              </p>
              <h1 className="text-lg font-bold truncate">{business?.name || 'Agendamento'}</h1>
            </div>
          </div>
        </div>

        {/* DADOS do agendamento */}
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{
            background: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
              Agendamento
            </span>
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{ color: statusColor.fg, background: statusColor.bg }}
            >
              {statusLabel}
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            <Row
              icon={<IconCalendar size={16} />}
              label="Data"
              value={<span className="capitalize">{dateLong}</span>}
              hint={dateFormatted}
              isDark={isDark}
            />
            <Row
              icon={<IconClock size={16} />}
              label="Horário"
              value={`${appointment.start_time.slice(0, 5)} – ${appointment.end_time.slice(0, 5)}`}
              isDark={isDark}
            />
            {appointment.service_name && (
              <Row
                icon={<IconSparkles size={16} />}
                label="Serviço"
                value={appointment.service_name}
                isDark={isDark}
              />
            )}
            {professional?.name && (
              <Row
                icon={<IconUsers size={16} />}
                label="Profissional"
                value={professional.name}
                isDark={isDark}
              />
            )}
            <Row
              icon={<IconUsers size={16} />}
              label="Cliente"
              value={appointment.client_name}
              isDark={isDark}
            />
          </div>
        </div>

        <CancelarConfirm
          appointmentId={id}
          token={token}
          alreadyCancelled={appointment.status === 'cancelled'}
          businessSlug={business?.slug}
          isDark={isDark}
        />

        {/* Rodapé AgendaPRO */}
        <div className="text-center space-y-2 pt-6 pb-4">
          <Link href="/" className="inline-flex items-center opacity-70 hover:opacity-100 transition-opacity">
            <Image
              src="/logo-agendapro-dark.svg"
              alt="AgendaPRO"
              width={100}
              height={20}
              style={{ filter: isDark ? 'none' : 'invert(0.85)' }}
            />
          </Link>
          <p className="text-xs" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
            Agendamento por AgendaPRO · Impulso Digital
          </p>
        </div>
      </div>
    </main>
  )
}

function Row({
  icon,
  label,
  value,
  hint,
  isDark,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  hint?: string
  isDark: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2 flex-shrink-0">
        <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>{icon}</span>
        <span className="text-xs" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
          {label}
        </span>
      </div>
      <div className="text-right min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
          {value}
        </div>
        {hint && (
          <div className="text-[10px] tabular-nums" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
            {hint}
          </div>
        )}
      </div>
    </div>
  )
}
