'use client'

import { IconAlert, IconGift } from '@/components/ui/Icon'

export default function TrialBanner({ daysLeft }: { daysLeft: number }) {
  const urgent = daysLeft <= 3

  return (
    <div
      className="w-full px-4 py-2.5 text-center text-xs font-medium inline-flex items-center justify-center gap-2"
      style={
        urgent
          ? { background: 'linear-gradient(90deg, #DC2626, #EF4444)', color: '#fff' }
          : { background: 'linear-gradient(90deg, #F59E0B, #FBBF24)', color: '#78350F' }
      }
    >
      {urgent ? <IconAlert size={14} /> : <IconGift size={14} />}
      {urgent
        ? `Seu período gratuito termina em ${daysLeft} dia${daysLeft === 1 ? '' : 's'}. Entre em contato para continuar.`
        : `Trial gratuito — ${daysLeft} dias restantes`}
    </div>
  )
}
