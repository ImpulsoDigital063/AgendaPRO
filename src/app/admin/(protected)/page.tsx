import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import {
  getCurrentUser,
  getCurrentBusiness,
  getOnboardingState,
} from '@/lib/admin-data'
import WelcomeModal from '@/components/admin/onboarding/WelcomeModal'
import OnboardingChecklist from '@/components/admin/onboarding/OnboardingChecklist'
import GradeTimeline from '@/components/admin/desktop/GradeTimeline'

// Garante revalidação imediata após mutações (router.refresh tras cancel/payment).
// Sem isso o RSC cache de Next 16 pode devolver lista antiga.
export const dynamic = 'force-dynamic'

/* ============================================================
 * /admin · HOME = a AGENDA (GradeTimeline) em TODOS os breakpoints.
 *
 * Cravado 03/06: a home mobile virou o grid premium por profissional
 * (igual desktop), no lugar do dashboard antigo em lista. O painel/
 * analytics (KPIs, Foco do Dia, Top profs/serviços, relatório) vive na
 * aba "Início" (/admin/inicio); os ganhos do Adm-que-atende em /admin/eu.
 * Aqui é só a agenda — no mobile a grade scrolla horizontal.
 * ============================================================ */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  const business = await getCurrentBusiness(user.id)
  if (!business) redirect('/cadastro')

  const onboarding = await getOnboardingState(business.id, user.id, business)

  // Data selecionada pra grade (?date=YYYY-MM-DD · default = hoje)
  const sp = await searchParams
  const gradeDate = sp.date ?? new Date().toISOString().slice(0, 10)

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      {/* Glow orbs de fundo */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="admin-orb-1 absolute -top-32 left-1/2 w-[520px] h-[520px] rounded-full blur-[120px]"
          style={{ background: 'var(--admin-bg-orb-1)' }}
        />
        <div
          className="admin-orb-2 absolute top-[40%] -right-24 w-72 h-72 rounded-full blur-[80px]"
          style={{ background: 'var(--admin-bg-orb-2)' }}
        />
        <div
          className="admin-orb-3 absolute bottom-0 -left-20 w-64 h-64 rounded-full blur-[80px]"
          style={{ background: 'var(--admin-bg-orb-3)' }}
        />
      </div>

      {/* Vignette suave nos cantos */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.18) 100%)',
        }}
      />

      {/* Welcome modal · 1ª vez */}
      {!onboarding.welcomeModalSeen && (
        <WelcomeModal
          businessName={business.name}
          category={business.description ?? null}
        />
      )}

      {/* Onboarding checklist · só enquanto não completou tudo · acima da agenda */}
      {!onboarding.done && (
        <div className="relative px-3 md:px-6 pt-3 md:pt-6">
          <OnboardingChecklist
            items={onboarding.items}
            percent={onboarding.percent}
            done={onboarding.done}
            slug={business.slug}
          />
        </div>
      )}

      {/* Agenda · GradeTimeline em todos os breakpoints (mobile = scroll horizontal) */}
      <div className="relative px-3 md:px-6 pt-3 md:pt-6 pb-8">
        <Suspense fallback={<div className="h-96 rounded-2xl" style={{ background: 'var(--admin-surface)' }} />}>
          <GradeTimeline businessId={business.id} date={gradeDate} />
        </Suspense>
      </div>
    </main>
  )
}
