import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import LogoutButton from '@/components/LogoutButton'
import ThemeToggle from '@/components/admin/ThemeToggle'
import RecepAppointmentCard from '@/components/recepcao/RecepAppointmentCard'
import RecepMarcarFAB from '@/components/recepcao/RecepMarcarFAB'
import {
  IconCalendar,
  IconInbox,
} from '@/components/ui/Icon'

export const dynamic = 'force-dynamic'

export default async function RecepcaoAgendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/profissional/login')

  // Recepcionista logada — pega business via tabela professionals
  const { data: recep } = await supabase
    .from('professionals')
    .select('id, name, business:businesses(id, name, slug, points_per_professional)')
    .eq('auth_user_id', user.id)
    .eq('is_receptionist', true)
    .single()

  if (!recep || !recep.business) redirect('/profissional/login')

  const business = recep.business as unknown as {
    id: string
    name: string
    slug: string
    points_per_professional: boolean | null
  }

  const today = new Date().toISOString().split('T')[0]
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextWeekStr = nextWeek.toISOString().split('T')[0]

  // Hoje e próximos 7 dias do BUSINESS inteiro (RLS já garante via is_receptionist=true)
  // + join nos profissionais pra mostrar quem atende cada agendamento
  const { data: todayAppts } = await supabase
    .from('appointments')
    .select('*, professional:professionals(id, name)')
    .eq('business_id', business.id)
    .eq('appointment_date', today)
    .order('start_time', { ascending: true })

  const { data: upcoming } = await supabase
    .from('appointments')
    .select('*, professional:professionals(id, name)')
    .eq('business_id', business.id)
    .gt('appointment_date', today)
    .lte('appointment_date', nextWeekStr)
    .in('status', ['pending', 'confirmed'])
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(40)

  const list = todayAppts ?? []
  const active = list.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show')
  const pending = active.filter((a) => a.status === 'pending')

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full blur-[120px]"
          style={{ background: 'var(--admin-bg-orb-1)' }}
        />
      </div>

      {/* Header */}
      <header className="relative max-w-lg mx-auto px-4 pt-7 pb-6">
        <div className="flex items-center justify-between mb-6">
          <Image
            src="/logo-agendapro-dark.svg"
            alt="AgendaPRO"
            width={130}
            height={26}
            priority
            style={{ filter: 'var(--admin-logo-filter)' }}
          />
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <LogoutButton />
          </div>
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-faded)' }}>
          Recepção
        </p>
        <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--admin-text)' }}>
          {business.name}
        </h1>
        <p className="text-sm capitalize mt-1" style={{ color: 'var(--admin-text-mute)' }}>
          <span className="inline-flex items-center gap-1.5">
            <IconCalendar size={14} /> {todayFormatted}
          </span>
        </p>
      </header>

      <div className="relative max-w-lg mx-auto px-4 pb-10 space-y-6">
        {/* Pendentes em destaque */}
        {pending.length > 0 && (
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-warn)' }}>
              Aguardando confirmação · {pending.length}
            </p>
            <div className="space-y-3">
              {pending.map((a) => (
                <RecepAppointmentCard key={a.id} appointment={a} businessId={business.id} />
              ))}
            </div>
          </section>
        )}

        {/* Hoje */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>
              Hoje
            </p>
            {active.length > 0 && (
              <span
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                style={{
                  background: 'var(--admin-accent-bg)',
                  color: 'var(--admin-accent)',
                  border: '1px solid var(--admin-accent-border)',
                }}
              >
                {active.length} agendamento{active.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {active.length === 0 ? (
            <div className="admin-card p-8 text-center">
              <div
                className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3"
                style={{
                  background: 'var(--admin-accent-bg)',
                  color: 'var(--admin-accent)',
                }}
              >
                <IconInbox size={26} />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--admin-text-2)' }}>
                Nenhum agendamento hoje
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--admin-text-faded)' }}>
                Toque em "Marcar novo" pra começar
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {active.filter((a) => a.status !== 'pending').map((a) => (
                <RecepAppointmentCard key={a.id} appointment={a} businessId={business.id} />
              ))}
            </div>
          )}
        </section>

        {/* Próximos dias */}
        {upcoming && upcoming.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>
                Próximos dias
              </p>
              <span className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
                7 dias
              </span>
            </div>
            <div className="space-y-3">
              {upcoming.map((a) => (
                <RecepAppointmentCard key={a.id} appointment={a} businessId={business.id} showDate />
              ))}
            </div>
          </section>
        )}

        <p className="text-center text-xs pb-2" style={{ color: 'var(--admin-text-faded)' }}>
          AgendaPRO · Impulso Digital
        </p>
      </div>

      {/* Botão flutuante "Marcar novo" */}
      <RecepMarcarFAB businessId={business.id} />
    </main>
  )
}
