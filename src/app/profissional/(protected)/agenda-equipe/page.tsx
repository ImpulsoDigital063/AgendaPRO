import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { todayBR, addDaysBR } from '@/lib/date-br'
import { IconArrowLeft, IconCalendar, IconInbox } from '@/components/ui/Icon'

export const dynamic = 'force-dynamic'

/**
 * /profissional/agenda-equipe — v92 · 29/07/2026
 *
 * Agenda das colegas em LEITURA PURA. Nasceu da Realli Studio Nails, onde as
 * profissionais atendem em dupla e precisam saber se a colega tem horário
 * livre antes de marcar.
 *
 * Zero botão de ação de propósito (regra Eduardo 29/07): criar e cancelar de
 * colega segue exclusivo da dona. Aqui ela olha, não encosta.
 *
 * Sem valores: horário + cliente + serviço. Comissão e faturamento da colega
 * não são da conta dela — isso vive em /profissional/financeiro, que é individual.
 *
 * Gate por negócio: `businesses.professionals_see_team_agenda`.
 * Datas via date-br (servidor roda em UTC na Vercel — λ.fuso).
 */
export default async function AgendaEquipePage({
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
    .select('id, name, business:businesses(id, name, professionals_see_team_agenda)')
    .eq('auth_user_id', user.id)
    .eq('is_receptionist', false)
    .single()

  if (!me || !me.business) redirect('/profissional/login')

  const business = me.business as unknown as {
    id: string
    name: string
    professionals_see_team_agenda?: boolean | null
  }

  if (!business.professionals_see_team_agenda) redirect('/profissional')

  const [{ data: profs }, { data: appts }] = await Promise.all([
    supabase
      .from('professionals')
      .select('id, name')
      .eq('business_id', business.id)
      .eq('active', true)
      .eq('is_receptionist', false)
      // dona fora da lista (cravado 30/07 · ela administra, não atende)
      .neq('role', 'owner')
      .order('name'),
    supabase
      .from('appointments')
      .select('id, professional_id, client_name, service_name, start_time, end_time, status')
      .eq('business_id', business.id)
      .eq('appointment_date', date)
      .order('start_time', { ascending: true }),
  ])

  const lista = profs ?? []
  const porProf = new Map<string, typeof appts>()
  for (const p of lista) porProf.set(p.id, [])
  for (const a of appts ?? []) {
    const bucket = porProf.get(a.professional_id as string)
    if (bucket) bucket.push(a)
  }

  const isHoje = date === todayBR()
  const label = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
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

      <header className="relative max-w-lg md:max-w-2xl mx-auto px-4 md:px-6 pt-7 pb-4">
        <Link
          href="/profissional"
          className="inline-flex items-center gap-1.5 text-sm mb-4"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          <IconArrowLeft size={16} /> Meu painel
        </Link>
        <h1 className="text-[24px] font-bold tracking-tight" style={{ color: 'var(--admin-text)' }}>
          Agenda da equipe
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--admin-text-mute)' }}>
          Só pra consultar — quem marca ou cancela pra outra pessoa é a administração.
        </p>
      </header>

      {/* Navegação de dia */}
      <section className="relative max-w-lg md:max-w-2xl mx-auto px-4 md:px-6 mb-5">
        <div className="admin-card p-3 flex items-center justify-between gap-2">
          <Link
            href={`/profissional/agenda-equipe?date=${addDaysBR(date, -1)}`}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold"
            style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}
          >
            ‹ Ontem
          </Link>
          <div className="text-center min-w-0">
            <p className="text-sm font-bold capitalize truncate" style={{ color: 'var(--admin-text)' }}>
              <span className="inline-flex items-center gap-1.5">
                <IconCalendar size={14} /> {label}
              </span>
            </p>
            {!isHoje && (
              <Link
                href="/profissional/agenda-equipe"
                className="text-[11px] font-semibold"
                style={{ color: 'var(--admin-accent)' }}
              >
                voltar pra hoje
              </Link>
            )}
          </div>
          <Link
            href={`/profissional/agenda-equipe?date=${addDaysBR(date, 1)}`}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold"
            style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}
          >
            Amanhã ›
          </Link>
        </div>
      </section>

      <div className="relative max-w-lg md:max-w-2xl mx-auto px-4 md:px-6 pb-10 space-y-4">
        {lista.map((p) => {
          const doDia = (porProf.get(p.id) ?? []).filter(
            (a) => a.status !== 'cancelled' && a.status !== 'no_show'
          )
          const souEu = p.id === me.id
          return (
            <section key={p.id} className="admin-card p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
                  {p.name}
                  {souEu && (
                    <span
                      className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full align-middle"
                      style={{
                        background: 'var(--admin-accent-bg)',
                        color: 'var(--admin-accent)',
                      }}
                    >
                      VOCÊ
                    </span>
                  )}
                </p>
                <span className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
                  {doDia.length === 0
                    ? 'livre'
                    : `${doDia.length} atendimento${doDia.length > 1 ? 's' : ''}`}
                </span>
              </div>

              {doDia.length === 0 ? (
                <div className="flex items-center gap-2 py-2">
                  <span style={{ color: 'var(--admin-text-faded)' }}>
                    <IconInbox size={16} />
                  </span>
                  <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
                    Nenhum horário ocupado nesse dia
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {doDia.map((a) => (
                    <li
                      key={a.id as string}
                      className="flex items-start gap-3 py-2"
                      style={{ borderTop: '1px solid var(--admin-divider)' }}
                    >
                      <span
                        className="text-xs font-bold tabular-nums px-2 py-1 rounded-lg flex-shrink-0"
                        style={{
                          background: 'var(--admin-accent-bg)',
                          color: 'var(--admin-accent)',
                        }}
                      >
                        {String(a.start_time).slice(0, 5)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: 'var(--admin-text)' }}
                        >
                          {a.client_name || 'Cliente'}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--admin-text-mute)' }}>
                          {a.service_name || 'Serviço'}
                          {a.status === 'completed' && ' · atendido'}
                          {a.status === 'pending' && ' · a confirmar'}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}

        <p className="text-center text-xs pb-2" style={{ color: 'var(--admin-text-faded)' }}>
          AgendaPRO · Impulso Digital
        </p>
      </div>
    </main>
  )
}
