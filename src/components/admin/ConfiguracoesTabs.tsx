'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Business, Professional, Service, WorkingHours, Reward, Customer } from '@/lib/types'
import ProfissionaisTab from './ProfissionaisTab'
import ServicosTab from './ServicosTab'
import HorariosTab from './HorariosTab'
import WhatsAppQRTab from './WhatsAppQRTab'
import NegocioTab from './NegocioTab'
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

type Tab = 'negocio' | 'profissionais' | 'servicos' | 'horarios' | 'qr-code' | 'fidelidade' | 'aparencia' | 'divulgacao' | 'plano' | 'importar' | 'maquininhas' | 'bloqueios' | 'fichas-modelo'

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
  const searchParams = useSearchParams()
  const rawTab = searchParams.get('tab')
  const validTabs: Tab[] = ['negocio', 'profissionais', 'servicos', 'horarios', 'qr-code', 'fidelidade', 'aparencia', 'divulgacao', 'plano', 'importar', 'maquininhas', 'bloqueios', 'fichas-modelo']
  // Resolve alias antes de validar (ex: ?tab=whatsapp → 'qr-code')
  const resolvedTab = rawTab ? (TAB_ALIASES[rawTab] ?? rawTab) : null
  const [activeTab, setActiveTab] = useState<Tab>(
    resolvedTab && validTabs.includes(resolvedTab as Tab) ? (resolvedTab as Tab) : 'negocio'
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

  const tabs: { id: Tab; label: string }[] = [
    { id: 'negocio', label: 'Negócio' },
    { id: 'profissionais', label: 'Profissionais' },
    { id: 'servicos', label: 'Serviços' },
    { id: 'horarios', label: 'Horários' },
    { id: 'fidelidade', label: 'Fidelidade' },
    { id: 'maquininhas', label: 'Maquininhas' },
    { id: 'bloqueios', label: 'Bloqueios' },
    { id: 'fichas-modelo', label: 'Fichas Modelo' },
    { id: 'aparencia', label: 'Aparência' },
    { id: 'qr-code', label: 'QR Code' },
    { id: 'divulgacao', label: 'Divulgação' },
    { id: 'plano', label: 'Plano' },
    { id: 'importar', label: 'Importar' },
  ]

  return (
    <div>
      {/* Tab bar — só em mobile/tablet. Em desktop (lg+), navegação
          pelas tabs vem direto da sidebar lateral · evita duplicar UX. */}
      <div
        className="lg:hidden flex flex-wrap rounded-2xl p-1.5 mb-6 gap-1"
        style={{
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
          boxShadow: '0 1px 0 0 color-mix(in srgb, white 5%, transparent) inset',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`admin-tab flex-shrink-0 ${activeTab === tab.id ? 'admin-tab-active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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

      {activeTab === 'plano' && <PlanoCard />}

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
    </div>
  )
}
