'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Business, Professional, Service, WorkingHours, Reward, Customer } from '@/lib/types'
import ProfissionaisTab from './ProfissionaisTab'
import ServicosTab from './ServicosTab'
import HorariosTab from './HorariosTab'
import WhatsAppQRTab from './WhatsAppQRTab'
import NegocioTab from './NegocioTab'
import MensagensTab from './MensagensTab'
import FidelidadeTab from './FidelidadeTab'
import FidelidadeOnboardingCard from './onboarding/FidelidadeOnboardingCard'
import OnboardingMarker from './onboarding/OnboardingMarker'
import AparenciaTab from './AparenciaTab'
import DivulgacaoTab from './DivulgacaoTab'
import PlanoCard from './PlanoCard'
import ImportarView from './ImportarView'
import MaquininhasTab from './MaquininhasTab'
import BloqueiosTab from './BloqueiosTab'
import FichasModeloTab from './FichasModeloTab'

type Tab = 'negocio' | 'profissionais' | 'servicos' | 'horarios' | 'qr-code' | 'fidelidade' | 'aparencia' | 'divulgacao' | 'plano' | 'importar' | 'maquininhas' | 'bloqueios' | 'fichas-modelo' | 'mensagens'

// Alias retrocompat: URLs antigas com ?tab=whatsapp continuam funcionando.
const TAB_ALIASES: Record<string, Tab> = {
  whatsapp: 'qr-code',
}

type Props = {
  business: Business
  initialProfessionals: Professional[]
  initialServices: Service[]
  initialWorkingHours: WorkingHours[]
  initialRewards: Reward[]
  initialCustomers: Customer[]
  subscriptionPlan: 'solo' | 'equipe'
  /** v78 · slots extras vendidos · soma ao limite do plano (default 0) */
  extraProfessionalSlots?: number
}

export default function ConfiguracoesTabs({
  business,
  initialProfessionals,
  initialServices,
  initialWorkingHours,
  initialRewards,
  initialCustomers,
  subscriptionPlan,
  extraProfessionalSlots = 0,
}: Props) {
  // Palace tem sistema próprio (R$2.997 one-shot · sem mensalidade).
  // Tab Plano esconde e tentativa de acesso direto via ?tab=plano cai em Negócio.
  const hidePlanoForBusiness = business.slug === 'palace-nail-spa'

  const searchParams = useSearchParams()
  const rawTab = searchParams.get('tab')
  const validTabs: Tab[] = ['negocio', 'profissionais', 'servicos', 'horarios', 'qr-code', 'fidelidade', 'aparencia', 'divulgacao', 'plano', 'importar', 'maquininhas', 'bloqueios', 'fichas-modelo', 'mensagens']
  // Resolve alias antes de validar (ex: ?tab=whatsapp → 'qr-code')
  const resolvedTab = rawTab ? (TAB_ALIASES[rawTab] ?? rawTab) : null
  const safeResolvedTab = resolvedTab === 'plano' && hidePlanoForBusiness ? 'negocio' : resolvedTab
  const [activeTab, setActiveTab] = useState<Tab>(
    safeResolvedTab && validTabs.includes(safeResolvedTab as Tab) ? (safeResolvedTab as Tab) : 'negocio'
  )
  const [professionals, setProfessionals] = useState(initialProfessionals)
  // Rewards lifted pro parent: FidelidadeTab desmonta ao trocar de
  // aba — se mantivesse o useState dentro dele, recompensa criada
  // sumia ao voltar (initialRewards do SSR continuava antigo).
  const [rewards, setRewards] = useState(initialRewards)

  // Pontos por indicação/pontualidade tambem lifted — mesmo bug:
  // FidelidadeTab inicializava useState com props do business SSR.
  // Ao salvar, banco atualizava mas prop continuava antiga em mounts
  // futuros. Resultado: trocar aba mostrava valor antigo ate reload.
  const [referralPoints, setReferralPoints] = useState(business.points_for_referral ?? 0)
  const [punctualityPoints, setPunctualityPoints] = useState(
    business.punctuality_bonus_points ?? 10
  )

  useEffect(() => {
    setProfessionals(initialProfessionals)
  }, [initialProfessionals])
  useEffect(() => {
    setRewards(initialRewards)
  }, [initialRewards])
  useEffect(() => {
    setReferralPoints(business.points_for_referral ?? 0)
  }, [business.points_for_referral])
  useEffect(() => {
    setPunctualityPoints(business.punctuality_bonus_points ?? 10)
  }, [business.punctuality_bonus_points])

  // Navegação das seções agora vem do drawer hambúrguer (Link pra ?tab=X).
  // Re-sincroniza a aba ativa quando o ?tab= muda em client-nav (sem isso
  // o useState inicial não atualizava e a seção não trocava).
  useEffect(() => {
    if (safeResolvedTab && validTabs.includes(safeResolvedTab as Tab)) {
      setActiveTab(safeResolvedTab as Tab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeResolvedTab])


  return (
    <div>
      {/* Navegação das seções (mobile/tablet) vem do drawer hambúrguer;
          desktop usa a sidebar. A barra de abas foi removida daqui (03/06). */}

      {/* Tab content */}
      {activeTab === 'negocio' && (
        <NegocioTab business={business} />
      )}

      {activeTab === 'profissionais' && (
        <ProfissionaisTab
          businessId={business.id}
          professionals={professionals}
          onChange={setProfessionals}
          subscriptionPlan={subscriptionPlan}
          extraProfessionalSlots={extraProfessionalSlots}
        />
      )}

      {activeTab === 'servicos' && (
        <ServicosTab
          businessId={business.id}
          initialServices={initialServices}
          category={business.description ?? null}
        />
      )}

      {activeTab === 'horarios' && (
        <>
          <OnboardingMarker
            field="onboarding_horarios_revisado"
            alreadyMarked={business.onboarding_horarios_revisado ?? false}
          />
          <HorariosTab
            professionals={professionals}
            initialWorkingHours={initialWorkingHours}
            isAdmin
          />
        </>
      )}

      {activeTab === 'fidelidade' && (
        <>
          <FidelidadeOnboardingCard
            category={business.description ?? null}
            initialDismissed={business.fidelidade_dica_lida ?? false}
          />
          <FidelidadeTab
            businessId={business.id}
          rewards={rewards}
          onRewardsChange={setRewards}
          initialCustomers={initialCustomers}
          initialServices={initialServices}
          businessCategory={business.description ?? null}
          referralPoints={referralPoints}
          onReferralPointsChange={setReferralPoints}
          punctualityPoints={punctualityPoints}
          onPunctualityPointsChange={setPunctualityPoints}
          pointsForReview={business.points_for_review ?? 0}
          pointsMode={business.points_mode ?? 'business'}
          onNavigateToNegocio={() => {
            setActiveTab('negocio')
            if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          initialNoShowEnabled={business.no_show_punishment_enabled ?? false}
          initialNoShowMode={business.no_show_penalty_mode ?? 'proportional'}
          initialNoShowFixedPoints={business.no_show_fixed_points ?? 20}
          initialLoyaltyEnabled={business.loyalty_enabled ?? false}
        />
        </>
      )}

      {activeTab === 'aparencia' && (
        <AparenciaTab
          business={business}
          services={initialServices}
          onNavigateToNegocio={() => {
            setActiveTab('negocio')
            if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      )}

      {activeTab === 'qr-code' && (
        <>
          <OnboardingMarker
            field="qr_code_compartilhado"
            alreadyMarked={business.qr_code_compartilhado ?? false}
          />
          <WhatsAppQRTab
            business={business}
            onNavigateToNegocio={() => {
              setActiveTab('negocio')
              if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        </>
      )}

      {activeTab === 'divulgacao' && <DivulgacaoTab business={business} />}

      {activeTab === 'plano' && !hidePlanoForBusiness && <PlanoCard />}

      {activeTab === 'importar' && (
        <ImportarView businessId={business.id} businessName={business.name} />
      )}

      {activeTab === 'maquininhas' && (
        <MaquininhasTab businessId={business.id} />
      )}

      {activeTab === 'bloqueios' && (
        <BloqueiosTab businessId={business.id} professionals={professionals} />
      )}

      {activeTab === 'fichas-modelo' && <FichasModeloTab />}

      {activeTab === 'mensagens' && <MensagensTab businessName={business.name ?? 'Seu Negócio'} />}
    </div>
  )
}
