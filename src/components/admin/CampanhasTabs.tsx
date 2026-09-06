'use client'

import { useState } from 'react'
import ReativarSumidosView from './ReativarSumidosView'
import AniversariantesView from './AniversariantesView'
import CupomAvulsoView from './CupomAvulsoView'

type StandaloneCoupon = {
  id: string
  code: string
  discount_type: 'fixed' | 'percent'
  discount_value: number
  expires_at: string
  standalone_label: string | null
  professional_id: string | null
  professional_name: string | null
  uses: number
  share_url: string
  created_at: string
}

type Props = {
  businessSlug: string
  businessName: string
  businessDescription: string | null
  /** Prazo de "sumido" escolhido pela dona · vem da page via searchParam. */
  dias: number

  // Sumidos
  existingCoupons: {
    id: string
    code: string
    sent_at: string | null
    used_at: string | null
    expires_at: string
    customer_id: string | null
  }[]
  sumidosTotal: number
  sumidosWithoutCoupon: number
  orphanCoupons: number

  // Aniversariantes
  aniversariantesTotal: number
  aniversariantesWithoutCoupon: number
  mesAtualNome: string

  // Avulso (v44)
  professionals: Array<{ id: string; name: string }>
  standaloneCoupons: StandaloneCoupon[]
  standaloneAtivos: number

  initialTab: 'sumidos' | 'aniversariantes' | 'avulso'

  /** Ticket médio do business (últimos 90 dias) · pra ROI estimado. */
  ticketMedio?: number
}

type Tab = 'sumidos' | 'aniversariantes' | 'avulso'

export default function CampanhasTabs({
  businessSlug,
  businessName,
  businessDescription,
  dias,
  existingCoupons,
  sumidosTotal,
  sumidosWithoutCoupon,
  orphanCoupons,
  aniversariantesTotal,
  aniversariantesWithoutCoupon,
  mesAtualNome,
  professionals,
  standaloneCoupons,
  standaloneAtivos,
  initialTab,
  ticketMedio = 50,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)

  return (
    <div>
      <div
        className="flex rounded-2xl p-1.5 mb-6 gap-1"
        style={{
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
          boxShadow: '0 1px 0 0 color-mix(in srgb, white 5%, transparent) inset',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('sumidos')}
          className={`admin-tab flex-1 ${activeTab === 'sumidos' ? 'admin-tab-active' : ''}`}
        >
          Sumidos
          {sumidosWithoutCoupon > 0 && (
            <span
              className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(239,68,68,0.20)', color: '#EF4444' }}
            >
              {sumidosWithoutCoupon}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('aniversariantes')}
          className={`admin-tab flex-1 ${activeTab === 'aniversariantes' ? 'admin-tab-active' : ''}`}
        >
          Aniversário
          {aniversariantesWithoutCoupon > 0 && (
            <span
              className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(59,130,246,0.20)', color: '#3B82F6' }}
            >
              {aniversariantesWithoutCoupon}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('avulso')}
          className={`admin-tab flex-1 ${activeTab === 'avulso' ? 'admin-tab-active' : ''}`}
        >
          Promoção
          {standaloneAtivos > 0 && (
            <span
              className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(124,58,237,0.20)', color: '#7C3AED' }}
            >
              {standaloneAtivos}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'sumidos' && (
        <ReativarSumidosView
          businessSlug={businessSlug}
          businessName={businessName}
          businessDescription={businessDescription}
          dias={dias}
          existingCoupons={existingCoupons}
          sumidosTotal={sumidosTotal}
          sumidosWithoutCoupon={sumidosWithoutCoupon}
          orphanCoupons={orphanCoupons}
          ticketMedio={ticketMedio}
        />
      )}

      {activeTab === 'aniversariantes' && (
        <AniversariantesView
          businessSlug={businessSlug}
          businessName={businessName}
          businessDescription={businessDescription}
          aniversariantesTotal={aniversariantesTotal}
          aniversariantesWithoutCoupon={aniversariantesWithoutCoupon}
          mesAtualNome={mesAtualNome}
          ticketMedio={ticketMedio}
        />
      )}

      {activeTab === 'avulso' && (
        <CupomAvulsoView
          businessSlug={businessSlug}
          businessName={businessName}
          professionals={professionals}
          initialCoupons={standaloneCoupons}
          ticketMedio={ticketMedio}
        />
      )}
    </div>
  )
}
