import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import GradeTimeline from '@/components/admin/desktop/GradeTimeline'
import { todayBR } from '@/lib/date-br'
import { IconWallet } from '@/components/ui/Icon'

export const dynamic = 'force-dynamic'

/**
 * /recepcao/eu · a agenda DELA, separada da grade do salão (28/08).
 *
 * Pedido da Isis: a Josi opera o balcão (onde vê todas) mas também atende, e
 * precisava enxergar os próprios atendimentos sem caçar a coluna dela no meio
 * das cinco. Espelha a aba "Eu" que a dona tem em /admin/eu — mesma grade,
 * só a coluna da pessoa.
 *
 * Só existe pra quem acumula os dois papéis: recepção que não atende não tem
 * agenda pra ver aqui.
 */
export default async function RecepEuPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/profissional/login')

  const { data: prof } = await supabase
    .from('professionals')
    .select('id, name, business_id, does_appointments, business:businesses(id, name)')
    .eq('auth_user_id', user.id)
    .eq('is_receptionist', true)
    .single()

  if (!prof || !prof.business) redirect('/profissional/login')
  // Recepção pura não atende — não há agenda dela pra mostrar.
  if (prof.does_appointments !== true) redirect('/recepcao')

  const business = prof.business as unknown as { id: string; name: string }
  const today = todayBR()

  return (
    <main className="relative max-w-5xl mx-auto px-4 pt-6 pb-28">
      <header className="mb-5">
        <p
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--admin-text-faded)' }}
        >
          {prof.name}
        </p>
        <h1
          className="text-2xl font-bold tracking-tight leading-tight"
          style={{ color: 'var(--admin-text)' }}
        >
          Meus atendimentos
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
          Só a sua agenda. A do salão inteiro fica no Início.
        </p>
      </header>

      <Suspense
        fallback={<div className="h-96 rounded-2xl" style={{ background: 'var(--admin-surface)' }} />}
      >
        <GradeTimeline
          businessId={business.id}
          date={today}
          onlyProfessionalId={prof.id}
          hideKpis
        />
      </Suspense>

      <Link
        href="/profissional/financeiro"
        className="admin-card p-4 flex items-center gap-3 mt-5"
        style={{ color: 'var(--admin-text)' }}
      >
        <span
          className="w-9 h-9 rounded-xl inline-flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--admin-surface-hi)', color: 'var(--admin-accent)' }}
        >
          <IconWallet size={16} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">Meus ganhos</span>
          <span className="block text-xs" style={{ color: 'var(--admin-text-mute)' }}>
            Comissão e faturamento dos seus atendimentos
          </span>
        </span>
      </Link>
    </main>
  )
}
