'use client'

import { useState } from 'react'
import ReativarSumidosView from './ReativarSumidosView'
import AniversariantesView from './AniversariantesView'

type Props = {
  businessSlug: string
  businessName: string
  businessDescription: string | null

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

  initialTab: 'sumidos' | 'aniversariantes'
}

type Tab = 'sumidos' | 'aniversariantes'

export default function CampanhasTabs({
  businessSlug,
  businessName,
  businessDescription,
  existingCoupons,
  sumidosTotal,
  sumidosWithoutCoupon,
  orphanCoupons,
  aniversariantesTotal,
  aniversariantesWithoutCoupon,
  mesAtualNome,
  initialTab,
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
      </div>

      {activeTab === 'sumidos' && (
        <ReativarSumidosView
          businessSlug={businessSlug}
          businessName={businessName}
          businessDescription={businessDescription}
          existingCoupons={existingCoupons}
          sumidosTotal={sumidosTotal}
          sumidosWithoutCoupon={sumidosWithoutCoupon}
          orphanCoupons={orphanCoupons}
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
        />
      )}
    </div>
  )
}
