import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
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
import { todayBR } from '@/lib/date-br'

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
  if (!business) redirect(await destinoSemNegocio())

  const onboarding = await getOnboardingState(business.id, user.id, business)

  // Data selecionada pra grade (?date=YYYY-MM-DD · default = hoje em Brasília).
  // NÃO usar toISOString() aqui: o server roda em UTC e, após 21h BRT, a grade
  // pulava pro dia seguinte (bug Olímpio 04/06). todayBR() fixa o fuso.
  const sp = await searchParams
  const gradeDate = sp.date ?? todayBR()

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
            'radial-gradient(ellipse 100% 80% at 50% 50%, transparent 55%, rgba(15,23,42,0.05) 100%)',
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
      {/* v143 · a dona pode fechar de vez (businesses.onboarding_dispensado) */}
      {!onboarding.done && business.onboarding_dispensado !== true && (
        <div className="relative px-3 md:px-6 pt-3 md:pt-6">
          <OnboardingChecklist
            items={onboarding.items}
            percent={onboarding.percent}
            done={onboarding.done}
            slug={business.slug}
            businessId={business.id}
          />
        </div>
      )}

      {/* AVISOS SAÍRAM DAQUI (Eduardo, 31/08/2026) · cada aba tem um papel:
          Início é a casa da informação e dos avisos, Atendimentos é a grade.

          Isto reverte de propósito a decisão de 28/07, que tinha posto o push
          aqui por ser "a tela que todos usam". O motivo mudou: medido no
          celular (363×794), a primeira linha da grade começava em y=760 — 34px
          de sobra, ZERO hora de agenda visível. O banner que garantia alcance
          estava custando a tela inteira do produto.

          Nada se perde: PushEnableBanner e NovidadeSinalCard já estão montados
          em inicio/page.tsx. Aqui eram cópias.
          (NovidadeSinalCard expira sozinho em 2026-08-31T23:59:59-03:00.)

          Some junto o padding do wrapper (pt-3/md:pt-6), que sobrava mesmo
          quando os dois banners não apareciam. Vale nos dois breakpoints. */}

      {/* Agenda · GradeTimeline em todos os breakpoints (mobile = scroll horizontal) */}
      <div className="relative px-3 md:px-6 pt-3 md:pt-6 pb-8">
        <Suspense fallback={<div className="h-96 rounded-2xl" style={{ background: 'var(--admin-surface)' }} />}>
          {/* hideKpis (Eduardo, 31/08/2026) · os três cards Recebido / A receber /
              Pendentes saíram do topo da agenda. Métrica é informação, e informação
              mora no Início — que JÁ os mostra, então nada se perde.

              Ganho duplo: além dos ~55px de altura no celular, o prop também
              impede 3 queries que só alimentavam esses cards. Em 4G lento isso
              é tempo de tela, não só pixel.

              ATENÇÃO: prop de servidor, não tem breakpoint — some no desktop
              também. Foi decisão consciente (a mesma regra de aba vale nos dois),
              e volta tirando esta palavra. */}
          <GradeTimeline businessId={business.id} date={gradeDate} hideKpis />
        </Suspense>
      </div>
    </main>
  )
}
