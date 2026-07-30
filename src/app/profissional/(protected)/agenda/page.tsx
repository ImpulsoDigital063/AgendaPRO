import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { todayBR, addDaysBR } from '@/lib/date-br'
import GradeTimeline from '@/components/admin/desktop/GradeTimeline'
import { IconArrowLeft, IconCalendar } from '@/components/ui/Icon'

export const dynamic = 'force-dynamic'

/**
 * /profissional/agenda — v92b · 30/07/2026
 *
 * A agenda dela no PADRÃO do sistema (a mesma grade do admin desktop e da
 * recepção), em vez da lista antiga do painel. Eduardo cravou 30/07 que o
 * painel da profissional tinha que seguir o padrão da grade.
 *
 * Reusa GradeTimeline com `onlyProfessionalId` — prop que já existia pra aba
 * "Eu" do dono que atende. Ela filtra colunas E agendamentos, então:
 *   · a grade mostra só a coluna dela
 *   · o "+ Agendar" de dentro só tem ela na lista de profissionais
 * Nenhum componente do desktop foi alterado — zero risco pro Palace/admin.
 *
 * Gate: `businesses.professionals_can_book_self` (grade é interativa).
 * Agenda das colegas fica em /profissional/agenda-equipe, leitura pura.
 */
export default async function ProfissionalAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const sp = await searchParams
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayBR()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/profissional/login')

  const { data: me } = await supabase
    .from('professionals')
    .select('id, name, business:businesses(id, name, professionals_can_book_self, professionals_can_book_others, professionals_see_team_agenda)')
    .eq('auth_user_id', user.id)
    .eq('is_receptionist', false)
    .single()

  if (!me || !me.business) redirect('/profissional/login')

  const business = me.business as unknown as {
    id: string
    name: string
    professionals_can_book_self?: boolean | null
    professionals_can_book_others?: boolean | null
    professionals_see_team_agenda?: boolean | null
  }

  if (!business.professionals_can_book_self) redirect('/profissional')

  // v98b · liberada pra marcar pras colegas → grade completa da equipe, com as
  // colunas de todas (é a tela do print que o Eduardo pediu). Sem a flag,
  // `onlyProfessionalId` mantém a grade na coluna dela e só nela.
  const podeMarcarPraColega = business.professionals_can_book_others === true

  // A coluna da dona sai da grade da equipe (cravado 30/07: ela administra, não
  // atende). Só busca quando a grade é da equipe — no modo "só a minha coluna"
  // isso não muda nada.
  const { data: donas } = podeMarcarPraColega
    ? await supabase
        .from('professionals')
        .select('id')
        .eq('business_id', business.id)
        .eq('role', 'owner')
    : { data: null }
  const idsDonas = (donas ?? []).map((d) => d.id as string)

  const label = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <header className="relative max-w-lg md:max-w-none mx-auto px-4 md:px-6 pt-7 pb-4">
        <Link
          href="/profissional"
          className="inline-flex items-center gap-1.5 text-sm mb-4"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          <IconArrowLeft size={16} /> Meu painel
        </Link>
        <h1 className="text-[24px] font-bold tracking-tight" style={{ color: 'var(--admin-text)' }}>
          {podeMarcarPraColega ? 'Agenda' : 'Minha agenda'}
        </h1>
        <p className="text-sm capitalize mt-1" style={{ color: 'var(--admin-text-mute)' }}>
          <span className="inline-flex items-center gap-1.5">
            <IconCalendar size={14} /> {label}
          </span>
        </p>
      </header>

      <section className="relative max-w-lg md:max-w-none mx-auto px-4 md:px-6 mb-4">
        <div className="admin-card p-3 flex items-center justify-between gap-2">
          <Link
            href={`/profissional/agenda?date=${addDaysBR(date, -1)}`}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold"
            style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}
          >
            ‹ Ontem
          </Link>
          {date !== todayBR() ? (
            <Link
              href="/profissional/agenda"
              className="text-xs font-bold px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}
            >
              HOJE
            </Link>
          ) : (
            <span className="text-xs font-bold" style={{ color: 'var(--admin-text-faded)' }}>
              HOJE
            </span>
          )}
          <Link
            href={`/profissional/agenda?date=${addDaysBR(date, 1)}`}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold"
            style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}
          >
            Amanhã ›
          </Link>
        </div>
      </section>

      <div className="relative mx-auto px-2 md:px-6 pb-10">
        <Suspense
          fallback={
            <p className="text-center text-sm py-10" style={{ color: 'var(--admin-text-faded)' }}>
              Carregando sua agenda…
            </p>
          }
        >
          {/* hideKpis: faturamento do dia do negócio não é assunto da profissional
              (o que é dela vive em /profissional/financeiro) */}
          <GradeTimeline
            businessId={business.id}
            date={date}
            hideKpis
            onlyProfessionalId={podeMarcarPraColega ? undefined : me.id}
            excludeProfessionalIds={idsDonas}
          />
        </Suspense>
      </div>

      {business.professionals_see_team_agenda && (
        <p className="text-center text-xs pb-8">
          <Link href="/profissional/agenda-equipe" style={{ color: 'var(--admin-accent)' }}>
            Ver a agenda da equipe →
          </Link>
        </p>
      )}
    </main>
  )
}
