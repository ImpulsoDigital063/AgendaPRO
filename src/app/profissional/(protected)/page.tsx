import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Image from 'next/image'
import GradeTimeline from '@/components/admin/desktop/GradeTimeline'
import { todayBR, addDaysBR } from '@/lib/date-br'
import LogoutButton from '@/components/LogoutButton'
import ThemeToggle from '@/components/admin/ThemeToggle'
import BrandHeaderLogo from '@/components/admin/BrandHeaderLogo'
import ProfAppointmentCard from '@/components/profissional/ProfAppointmentCard'
import ProfTodayList from '@/components/profissional/ProfTodayList'
import WelcomeCard from '@/components/profissional/WelcomeCard'
import Link from 'next/link'
import {
  IconCalendar,
  IconChevronRight,
  IconDollar,
  IconCheck,
  IconClock,
  IconInbox,
  IconSettings,
  IconUsers,
  IconWallet,
} from '@/components/ui/Icon'

export default async function ProfissionalPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const sp = await searchParams
  // Data da grade · vem do ?date= que a própria grade usa pra navegar
  const gradeDate = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayBR()

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/profissional/login')

  // Busca o profissional logado · inclui brand_logo_url pra header
  const { data: professional } = await supabase
    .from('professionals')
    .select('*, business:businesses(id, name, slug, punctuality_bonus_points, brand_logo_url, professionals_can_book_self, professionals_can_book_others, professionals_see_team_agenda)')
    .eq('auth_user_id', user.id)
    .single()

  if (!professional) redirect('/profissional/login')

  const business = professional.business as {
    id: string
    name: string
    slug: string
    punctuality_bonus_points?: number
    brand_logo_url?: string | null
    // v98a/b · autonomia liberada pela dona nas Configurações
    professionals_can_book_self?: boolean | null
    professionals_can_book_others?: boolean | null
    professionals_see_team_agenda?: boolean | null
  }
  const punctualityBonus = business.punctuality_bonus_points ?? 10
  const canBookSelf = business.professionals_can_book_self === true
  const canBookOthers = business.professionals_can_book_others === true
  const seeTeamAgenda = business.professionals_see_team_agenda === true

  // v98d · com autonomia ligada, a HOME dela é a GRADE — mesmo padrão do /admin
  // da dona, que já é grade em todos os breakpoints (mobile = scroll horizontal).
  // Cravado por Eduardo 30/07: "é o que elas vão usar e precisar de verdade".
  // Sem autonomia, segue a lista antiga (negócio que não ligou não muda nada).
  const homeEhGrade = canBookSelf

  // λ.fuso · servidor da Vercel roda em UTC · depois das 21h no Brasil o
  // toISOString cru já estava no dia seguinte e a lista dela pulava um dia
  const today = todayBR()

  // v98o · TUDO em paralelo, e só o que a tela vai desenhar.
  //
  // Antes: 3 idas sequenciais ao banco (donas → hoje → próximos 7 dias) e as
  // duas últimas alimentavam a lista e os KPIs, que NÃO existem quando a grade
  // é a home. Era trabalho jogado fora somando latência em cima da grade.
  // Eduardo reportou lentidão em 30/07.
  const vazio = Promise.resolve({ data: null })
  const nextWeekStr = addDaysBR(today, 7)
  const [{ data: donas }, { data: appointments }, { data: upcoming }] = await Promise.all([
    // Coluna da dona fora da grade da equipe (30/07)
    homeEhGrade && canBookOthers
      ? supabase.from('professionals').select('id').eq('business_id', business.id).eq('role', 'owner')
      : vazio,
    // Lista "Hoje" + os 4 cards · só existem quando NÃO tem grade
    homeEhGrade ? vazio : supabase
      .from('appointments')
      .select('*, appointment_services(service_name)')
      .eq('professional_id', professional.id)
      .eq('appointment_date', today)
      .order('start_time', { ascending: true }),
    // "Próximos dias" · idem
    homeEhGrade ? vazio : supabase
      .from('appointments')
      .select('*, appointment_services(service_name)')
      .eq('professional_id', professional.id)
      .gt('appointment_date', today)
      .lte('appointment_date', nextWeekStr)
      .in('status', ['pending', 'confirmed'])
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(10),
  ])
  const idsDonas = (donas ?? []).map((d) => (d as { id: string }).id)

  // λ.fuso · formata a partir do dia BR já resolvido (ancorado ao meio-dia pra
   // não escorregar de novo na conversão) — antes era new Date() cru no servidor
  const todayFormatted = new Date(today + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const list = appointments || []
  // Estados separados — não confundir status do atendimento com status do
  // pagamento. Profissional vê o ciclo do atendimento DELE; pagamento é
  // marcado pelo admin no Financeiro (paid_at).
  const pending   = list.filter((a) => a.status === 'pending')
  const confirmed = list.filter((a) => a.status === 'confirmed')
  const completed = list.filter((a) => a.status === 'completed')
  // Recebido = appointments do profissional cujo pagamento já entrou
  // (admin marcou no Financeiro). Source of truth: paid_at != null.
  const recebido  = list
    .filter((a) => a.paid_at != null)
    .reduce((sum, a) => sum + (a.total_price || 0), 0)

  const isEmployed = (professional.employment_type ?? 'commissioned') === 'employed'

  const stats = ([
    !isEmployed && {
      value: recebido > 0
        ? 'R$' + recebido.toLocaleString('pt-BR', { minimumFractionDigits: 0 })
        : 'R$0',
      label: 'Recebido',
      icon: IconDollar,
      color: 'var(--admin-success)',
      glow: 'rgba(16,185,129,0.18)',
    },
    {
      value: pending.length,
      label: 'Pendentes',
      icon: IconClock,
      color: 'var(--admin-warn)',
      glow: 'rgba(245,158,11,0.18)',
    },
    {
      value: confirmed.length,
      label: 'Confirmados',
      icon: IconCheck,
      color: 'var(--admin-accent)',
      glow: 'rgba(59,130,246,0.18)',
    },
    {
      value: completed.length,
      label: 'Atendidos',
      icon: IconCheck,
      color: 'var(--admin-success)',
      glow: 'rgba(16,185,129,0.18)',
    },
  ].filter(Boolean)) as Array<{
    value: string | number
    label: string
    icon: typeof IconClock
    color: string
    glow: string
  }>

  const navItems = [
    // v98d · a grade virou a home, então o item que levava pra ela saiu daqui.
    // "Agenda da equipe" (lista de leitura) só faz sentido quando ela NÃO tem a
    // grade da equipe na home — senão é o mesmo dado duas vezes.
    seeTeamAgenda && !(homeEhGrade && canBookOthers) && {
      href: '/profissional/agenda-equipe',
      label: 'Agenda da equipe',
      desc: 'Veja o horário das colegas',
      icon: IconUsers,
    },
    !isEmployed && {
      href: '/profissional/horarios',
      label: 'Meus horários',
      desc: 'Dias e janelas de atendimento',
      icon: IconClock,
    },
    !isEmployed && {
      href: '/profissional/financeiro',
      label: 'Financeiro',
      desc: 'Comissão e faturamento',
      icon: IconWallet,
    },
    {
      href: '/profissional/trocar-senha',
      label: 'Trocar senha',
      desc: 'Atualize sua senha de acesso',
      icon: IconSettings,
    },
  ].filter(Boolean) as Array<{
    href: string
    label: string
    desc: string
    icon: typeof IconClock
  }>

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      {/* Glow orbs */}
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

      {/* Header · v98f (Eduardo 30/07: "essas informações só ocupam espaço, vamos
          manter o sistema mais focado"). Com a grade na home o topo é enxuto —
          primeiro nome, data curta, sem repetir o nome do negócio (já está na
          top bar) e sem os 4 cards de KPI (o dia inteiro está na grade logo
          abaixo, e número de comissão vive no Financeiro do bottom nav).
          Negócio sem autonomia mantém o header antigo inteiro. */}
      <header
        className={`relative max-w-lg mx-auto px-4 ${
          homeEhGrade ? 'pt-4 pb-3 md:max-w-none md:px-6' : 'pt-7 pb-6'
        }`}
      >
        <div className={`flex items-center justify-between ${homeEhGrade ? 'mb-3' : 'mb-6'}`}>
          <BrandHeaderLogo
            brandLogoUrl={business.brand_logo_url ?? null}
            businessName={business.name}
          />
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <LogoutButton />
          </div>
        </div>
        {homeEhGrade ? (
          // v98g · só o nome. A data completa e a contagem do dia já são o título
          // da grade logo abaixo — repetir aqui era a mesma informação 2x.
          <h1
            className="text-[19px] font-bold tracking-tight truncate"
            style={{ color: 'var(--admin-text)' }}
          >
            {professional.name.split(' ')[0]}
          </h1>
        ) : (
          <>
            <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--admin-text)' }}>
              {professional.name}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--admin-text-mute)' }}>
              {business.name}
            </p>
            <p className="text-sm capitalize mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
              <span className="inline-flex items-center gap-1.5">
                <IconCalendar size={14} /> {todayFormatted}
              </span>
            </p>
          </>
        )}
      </header>

      {/* Stats · saem quando a grade é a home (só ocupavam dobra) */}
      {!homeEhGrade && (
      <section className="relative max-w-lg mx-auto px-4 mb-6">
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="admin-card p-3.5 relative overflow-hidden">
                <div
                  className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-70 pointer-events-none"
                  style={{ background: stat.glow }}
                />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
                      {stat.label}
                    </p>
                    <p className="text-xl font-bold mt-1.5 leading-none" style={{ color: stat.color }}>
                      {stat.value}
                    </p>
                  </div>
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: stat.glow, color: stat.color }}
                  >
                    <Icon size={16} />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>
      )}

      {/* Com a grade na home, o container solta a largura NO DESKTOP (md:) pra as
          colunas respirarem. No mobile segue max-w-lg — a grade rola na horizontal,
          igual ao /admin da dona. Sem grade, nada muda em nenhum breakpoint. */}
      <div
        className={`relative max-w-lg mx-auto px-4 ${
          homeEhGrade ? 'md:max-w-none md:px-6 space-y-4 pb-2' : 'space-y-6 pb-10'
        }`}
      >
        {/* Boas-vindas · card de primeiro acesso (dispensável no X) */}
        <WelcomeCard professionalName={professional.name} />

        {/* v98g · O botão "Marcar cliente" que existia aqui SAIU: era a mesma
            função do "+ Agendar" que a própria grade tem no header, e apontado
            por Eduardo 30/07 ("qual sentido de ter esses dois botões?").
            Ficou o da grade porque é o padrão que a dona já usa no celular e
            respeita o dia selecionado na navegação. A tela /profissional/marcar
            foi removida junto. */}

        {/* v98d · A GRADE é a home · mesmo componente do /admin da dona e da
            recepção. hideCaixaActions: ela não vende produto nem abre balcão.
            hideKpis: faturamento do negócio não é assunto dela (o dela está
            nos cards acima e em /profissional/financeiro). */}
        {homeEhGrade && (
          <Suspense
            fallback={
              <div className="h-96 rounded-2xl" style={{ background: 'var(--admin-surface)' }} />
            }
          >
            <GradeTimeline
              businessId={business.id}
              date={gradeDate}
              hideKpis
              hideCaixaActions
              onlyProfessionalId={canBookOthers ? undefined : professional.id}
              excludeProfessionalIds={idsDonas}
              firstProfessionalId={professional.id}
            />
          </Suspense>
        )}

        {/* Hoje · só quando a home NÃO é a grade (senão é o mesmo dia duas vezes) */}
        {!homeEhGrade && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>
              Hoje
            </p>
            {list.length > 0 && (
              <span
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                style={{
                  background: 'var(--admin-accent-bg)',
                  color: 'var(--admin-accent)',
                  border: '1px solid var(--admin-accent-border)',
                }}
              >
                {list.length} agendamento{list.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {list.length === 0 ? (
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
                Seus agendamentos aparecem aqui automaticamente
              </p>
            </div>
          ) : (
            <ProfTodayList
              active={list.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show')}
              archived={list.filter((a) => a.status === 'cancelled' || a.status === 'no_show')}
              punctualityBonus={punctualityBonus}
            />
          )}
        </section>
        )}

        {/* Próximos dias · sai quando a grade é a home: a navegação de dia da
            própria grade já leva pra frente e pra trás (v98f · foco) */}
        {!homeEhGrade && upcoming && upcoming.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>
                Próximos dias
              </p>
              <span className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>7 dias</span>
            </div>
            <div className="space-y-3">
              {upcoming.map((a) => (
                <ProfAppointmentCard key={a.id} appointment={a} showDate punctualityBonus={punctualityBonus} />
              ))}
            </div>
          </section>
        )}

        {/* v98d · Com a grade na home, esse menu saiu: Horários, Financeiro e
            Conta já estão no bottom nav (ProfissionalBottomNav) — era o mesmo
            atalho duas vezes na mesma tela. Eduardo apontou 30/07.
            Negócio SEM autonomia continua com o menu, nada muda pra ele. */}
        {homeEhGrade && seeTeamAgenda && !canBookOthers && (
          <Link
            href="/profissional/agenda-equipe"
            className="block text-center text-sm font-semibold py-3 rounded-xl"
            style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}
          >
            Ver a agenda das colegas →
          </Link>
        )}

        {!homeEhGrade && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
          }}
        >
          {navItems.map((item, i, arr) => {
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-4 px-4 py-4 transition-colors hover:opacity-100"
                style={{
                  borderBottom: i < arr.length - 1 ? '1px solid var(--admin-divider)' : 'none',
                  color: 'var(--admin-text)',
                }}
              >
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--admin-accent-bg)',
                    color: 'var(--admin-accent)',
                  }}
                >
                  <Icon size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--admin-text)' }}>
                    {item.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                    {item.desc}
                  </p>
                </div>
                <span style={{ color: 'var(--admin-text-faded)' }}>
                  <IconChevronRight size={18} />
                </span>
              </Link>
            )
          })}
        </div>
        )}

        {/* Com a grade na home o rodapé some: ele empurrava a grade pra cima e
            criava o vão morto que o Eduardo apontou em 30/07. A marca já está
            na top bar. */}
        <p
          className={`text-center text-xs pb-2 ${homeEhGrade ? 'hidden' : ''}`}
          style={{ color: 'var(--admin-text-faded)' }}
        >
          AgendaPRO · Impulso Digital
        </p>
      </div>
    </main>
  )
}
