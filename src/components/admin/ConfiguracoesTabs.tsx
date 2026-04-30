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
import AparenciaTab from './AparenciaTab'

type Tab = 'negocio' | 'profissionais' | 'servicos' | 'horarios' | 'whatsapp' | 'fidelidade' | 'aparencia'

type Props = {
  business: Business
  initialProfessionals: Professional[]
  initialServices: Service[]
  initialWorkingHours: WorkingHours[]
  initialRewards: Reward[]
  initialCustomers: Customer[]
  subscriptionPlan: 'solo' | 'equipe'
}

export default function ConfiguracoesTabs({
  business,
  initialProfessionals,
  initialServices,
  initialWorkingHours,
  initialRewards,
  initialCustomers,
  subscriptionPlan,
}: Props) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as Tab | null
  const validTabs: Tab[] = ['negocio', 'profissionais', 'servicos', 'horarios', 'whatsapp', 'fidelidade', 'aparencia']
  const [activeTab, setActiveTab] = useState<Tab>(tabParam && validTabs.includes(tabParam) ? tabParam : 'negocio')
  const [professionals, setProfessionals] = useState(initialProfessionals)
  // Rewards lifted pro parent: FidelidadeTab desmonta ao trocar de
  // aba — se mantivesse o useState dentro dele, recompensa criada
  // sumia ao voltar (initialRewards do SSR continuava antigo).
  const [rewards, setRewards] = useState(initialRewards)

  useEffect(() => {
    setProfessionals(initialProfessionals)
  }, [initialProfessionals])
  useEffect(() => {
    setRewards(initialRewards)
  }, [initialRewards])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'negocio', label: 'Negócio' },
    { id: 'profissionais', label: 'Profissionais' },
    { id: 'servicos', label: 'Serviços' },
    { id: 'horarios', label: 'Horários' },
    { id: 'fidelidade', label: 'Fidelidade' },
    { id: 'aparencia', label: 'Aparência' },
    { id: 'whatsapp', label: 'WhatsApp' },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div
        className="flex rounded-2xl p-1.5 mb-6 overflow-x-auto gap-1"
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
        <HorariosTab
          professionals={professionals}
          initialWorkingHours={initialWorkingHours}
          isAdmin
        />
      )}

      {activeTab === 'fidelidade' && (
        <FidelidadeTab
          businessId={business.id}
          rewards={rewards}
          onRewardsChange={setRewards}
          initialCustomers={initialCustomers}
          initialServices={initialServices}
          businessCategory={business.description ?? null}
          pointsForReferral={business.points_for_referral ?? 0}
          pointsForReview={business.points_for_review ?? 0}
          pointsForPunctuality={business.punctuality_bonus_points ?? 10}
          pointsMode={business.points_mode ?? 'business'}
          onNavigateToNegocio={() => {
            setActiveTab('negocio')
            if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      )}

      {activeTab === 'aparencia' && (
        <AparenciaTab business={business} />
      )}

      {activeTab === 'whatsapp' && (
        <WhatsAppQRTab
          business={business}
          onNavigateToNegocio={() => {
            setActiveTab('negocio')
            if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      )}
    </div>
  )
}
