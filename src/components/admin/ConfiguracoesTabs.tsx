'use client'

import { useState } from 'react'
import type { Business, Professional, Service, WorkingHours } from '@/lib/types'
import ProfissionaisTab from './ProfissionaisTab'
import ServicosTab from './ServicosTab'
import HorariosTab from './HorariosTab'
import WhatsAppQRTab from './WhatsAppQRTab'

type Tab = 'profissionais' | 'servicos' | 'horarios' | 'whatsapp'

type Props = {
  business: Business
  initialProfessionals: Professional[]
  initialServices: Service[]
  initialWorkingHours: WorkingHours[]
}

export default function ConfiguracoesTabs({
  business,
  initialProfessionals,
  initialServices,
  initialWorkingHours,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('profissionais')
  const [professionals, setProfessionals] = useState(initialProfessionals)

  const tabs: { id: Tab; label: string }[] = [
    { id: 'profissionais', label: 'Profissionais' },
    { id: 'servicos', label: 'Serviços' },
    { id: 'horarios', label: 'Horários' },
    { id: 'whatsapp', label: 'WhatsApp' },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div className="flex bg-white rounded-2xl border border-gray-100 p-1 mb-6 overflow-x-auto gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
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

      {activeTab === 'whatsapp' && (
        <WhatsAppQRTab
          phone={business.phone || ''}
          businessName={business.name}
        />
      )}
    </div>
  )
}
