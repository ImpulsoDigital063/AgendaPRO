import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getApptChargedMap } from '@/lib/queries/appointment-charged-total'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import LogoutButton from '@/components/LogoutButton'
import ThemeToggle from '@/components/admin/ThemeToggle'
import Greeting from '@/components/admin/Greeting'
import BrandHeaderLogo from '@/components/admin/BrandHeaderLogo'
import CountUp from '@/components/admin/CountUp'
import RecepAppointmentCard from '@/components/recepcao/RecepAppointmentCard'
import RecepMarcarFAB from '@/components/recepcao/RecepMarcarFAB'
import RecepFocoDoDia from '@/components/recepcao/RecepFocoDoDia'
import RecepProximoAtendimento from '@/components/recepcao/RecepProximoAtendimento'
import RecepCaixaQuick from '@/components/recepcao/RecepCaixaQuick'
import RecepAniversariantesCard from '@/components/recepcao/RecepAniversariantesCard'
import GradeTimeline from '@/components/admin/desktop/GradeTimeline'
import { todayBR } from '@/lib/date-br'
import PushEnableBanner from '@/components/admin/PushEnableBanner'
import { Suspense } from 'react'
import {
  IconCalendar,
  IconClock,
  IconDollar,
  IconCheck,
  IconInbox,
} from '@/components/ui/Icon'

export const dynamic = 'force-dynamic'

function SectionHeader({ label, tone = 'mute' }: { label: string; tone?: 'mute' | 'warn' }) {
  return (
    <p
      className="text-[11px] font-semibold uppercase tracking-widest mb-4"
      style={{ color: tone === 'warn' ? 'var(--admin-warn)' : 'var(--admin-text-mute)' }}
    >
      {label}
    </p>
  )
}

export default async function RecepcaoAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const sp = await searchParams
  const gradeDate = sp.date ?? todayBR() // fuso BR — server roda em UTC (bug Olímpio)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/profissional/login')

  const { data: recep } = await supabase
    .from('professionals')
    .select('id, name, business:businesses(id, name, slug, brand_logo_url)')
    .eq('auth_user_id', user.id)
    .eq('is_receptionist', true)
    .single()

  if (!recep || !recep.business) redirect('/profissional/login')

  const business = recep.business as unknown as { id: string; name: string; slug: string; brand_logo_url: string | null }
  const recepName = (recep.name as string) || 'Recepção'
  const firstName = recepName.split(' ')[0]

  const today = todayBR()
  const nextWeek = new Date(today + 'T12:00:00') // meio-dia evita pulada de DST
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextWeekStr = `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`

  const { data: todayAppts } = await supabase
    .from('appointments')
    .select('*, professional:professionals(id, name), appointment_services(service_name)')
    .eq('business_id', business.id)
    .eq('appointment_date', today)
    .order('start_time', { ascending: true })

  const { data: upcoming } = await supabase
    .from('appointments')
    .select('*, professional:professionals(id, name), appointment_services(service_name)')
    .eq('business_id', business.id)
    .gt('appointment_date', today)
    .lte('appointment_date', nextWeekStr)
    .in('status', ['pending', 'confirmed'])
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(40)

  // Enriquece a lista UMA vez com o valor cobrado (comanda com produto) e
  // repassa pros cards/foco/caixa — evita cada um refazer a query.
  const sbRecepAdmin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const listRaw = todayAppts ?? []
  const chargedMap = await getApptChargedMap(sbRecepAdmin, listRaw.map((a) => a.id as string))
  const list = listRaw.map((a) => {
    const c = chargedMap[a.id as string]
    return { ...a, charged_total: c && c.produtos.length > 0 ? c.charged : null }
  })
  const active = list.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show')
  const pending = active.filter((a) => a.status === 'pending')
  const confirmed = active.filter((a) => a.status === 'confirmed')
  const completed = active.filter((a) => a.status === 'completed')

  const recebidos = list.filter((a) => a.paid_at != null && a.payment_method !== 'courtesy' && a.payment_method !== 'credit')
  // charged_total já veio injetado na list acima
  const recebidoTotal = recebidos.reduce((sum, a) => sum + (a.charged_total ?? a.total_price ?? 0), 0)

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  /* v144 · os KPIs do mobile saíram (a grade já os traz no topo). */

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full blur-[120px]"
          style={{ background: 'var(--admin-bg-orb-1)' }}
        />
        <div
          className="absolute top-[40%] -right-24 w-72 h-72 rounded-full blur-[80px]"
          style={{ background: 'var(--admin-bg-orb-2)' }}
        />
      </div>

      {/* Ativar notificação no aparelho da recepção (06/08 · "tem que estar
          ativo pra todo mundo"). Fica FORA dos blocos md:/md:hidden de
          propósito: é o mesmo convite nas duas experiências, tablet e celular.
          Vale mesmo pra quem não recebe push de agendamento (o aviso de
          agendamento vai pro profissional e pro dono) — é por esse device que
          chega o aviso de novidade do sistema. Some sozinha quando já ativo. */}
      <div className="relative px-4 md:px-6 pt-5 md:pt-6">
        <PushEnableBanner />
      </div>

      {/* ════════════════════════════════════════════════════
          TABLET + DESKTOP (≥md · Letícia opera em iPad)
          Grade Timeline · padrão visual /admin
          ════════════════════════════════════════════════════ */}
      {/* v144 · a grade era `hidden md:block`: no celular a recepção via só
          cards e NÃO enxergava a agenda de ninguém — sendo que o celular é o
          aparelho dela no balcão. O /admin já é grade em todo breakpoint
          (mobile rola na horizontal); o balcão passa a seguir o mesmo. */}
      <div className="block relative px-4 md:px-6 pt-6 pb-8">
        <Suspense fallback={<div className="h-96 rounded-2xl" style={{ background: 'var(--admin-surface)' }} />}>
          <GradeTimeline businessId={business.id} date={gradeDate} />
        </Suspense>
      </div>

      {/* ════════════════════════════════════════════════════
          MOBILE (<md) · caixa, QR, aniversariantes e pendências
          Fica ABAIXO da grade (que agora aparece nos dois tamanhos).
          ════════════════════════════════════════════════════ */}
      <div className="md:hidden relative max-w-7xl mx-auto px-4 pt-7 pb-32">
        <div className="space-y-5">
          {/* ════════════════════════════════════════════════════
              COLUNA ESQUERDA (sidebar) · mobile = topo
              ════════════════════════════════════════════════════ */}
          <aside className="lg:sticky lg:top-7 lg:self-start space-y-5">
            {/* v144 · Header e KPIs saíram daqui: a grade acima já traz data,
                navegação e os números do dia. Com os dois na tela, o celular
                mostrava dois cabeçalhos, dois conjuntos de KPIs e até duas
                datas diferentes. Aqui embaixo fica só o que a grade não cobre. */}

            {/* Foco do Dia */}
            <RecepFocoDoDia businessId={business.id} todayAppts={list} />

            {/* Caixa quick */}
            <RecepCaixaQuick todayAppts={list} />

            {/* Aniversariantes */}
            <RecepAniversariantesCard businessId={business.id} businessName={business.name} />

          </aside>

          {/* ════════════════════════════════════════════════════
              COLUNA DIREITA (main)
              ════════════════════════════════════════════════════ */}
          <div className="space-y-7 mt-6 lg:mt-0">
            {/* Próximo atendimento */}
            <RecepProximoAtendimento todayAppts={list} businessName={business.name} />

            {/* Pendentes em destaque */}
            {pending.length > 0 && (
              <section>
                <SectionHeader label={`Aguardando confirmação · ${pending.length}`} tone="warn" />
                <div className="space-y-3.5">
                  {pending.map((a) => (
                    <RecepAppointmentCard key={a.id} appointment={a} businessId={business.id} />
                  ))}
                </div>
              </section>
            )}

            {/* Hoje */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>
                  Hoje
                </p>
                {active.length > 0 && (
                  <span
                    className="text-[11px] font-semibold tabular-nums px-2.5 py-0.5 rounded-full"
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
                    style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}
                  >
                    <IconInbox size={26} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: 'var(--admin-text-2)' }}>
                    Nenhum agendamento hoje
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--admin-text-faded)' }}>
                    Toque em &quot;Marcar novo&quot; pra começar
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {active.filter((a) => a.status !== 'pending').map((a) => (
                    <RecepAppointmentCard key={a.id} appointment={a} businessId={business.id} />
                  ))}
                </div>
              )}
            </section>

            {/* Próximos dias */}
            {upcoming && upcoming.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>
                    Próximos dias
                  </p>
                  <span className="text-[11px] tabular-nums" style={{ color: 'var(--admin-text-faded)' }}>
                    7 dias
                  </span>
                </div>
                <div className="space-y-3.5">
                  {upcoming.map((a) => (
                    <RecepAppointmentCard key={a.id} appointment={a} businessId={business.id} showDate />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      <RecepMarcarFAB businessId={business.id} />
    </main>
  )
}
