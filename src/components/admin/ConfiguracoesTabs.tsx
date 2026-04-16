'use client'

import { useState } from 'react'
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
}

export default function ConfiguracoesTabs({
  business,
  initialProfessionals,
  initialServices,
  initialWorkingHours,
  initialRewards,
  initialCustomers,
}: Props) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as Tab | null
  const validTabs: Tab[] = ['negocio', 'profissionais', 'servicos', 'horarios', 'whatsapp', 'fidelidade', 'aparencia']
  const [activeTab, setActiveTab] = useState<Tab>(tabParam && validTabs.includes(tabParam) ? tabParam : 'negocio')
  const [professionals, setProfessionals] = useState(initialProfessionals)

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
        />
      )}

      {activeTab === 'servicos' && (
        <ServicosTab
          businessId={business.id}
          initialServices={initialServices}
        />
      )}

      {activeTab === 'horarios' && (
        <HorariosTab
          professionals={professionals}
          initialWorkingHours={initialWorkingHours}
        />
      )}

      {activeTab === 'fidelidade' && (
        <FidelidadeTab
          businessId={business.id}
          initialRewards={initialRewards}
          initialCustomers={initialCustomers}
          pointsForReferral={business.points_for_referral ?? 0}
        />
      )}

      {activeTab === 'aparencia' && (
        <AparenciaTab business={business} />
      )}

      {activeTab === 'whatsapp' && (
        <WhatsAppQRTab
          phone={business.phone || ''}
          businessName={business.name}
        />
      )}
    </div>
  )
}
