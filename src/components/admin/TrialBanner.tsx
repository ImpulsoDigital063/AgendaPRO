'use client'

import { IconAlert, IconGift } from '@/components/ui/Icon'

export default function TrialBanner({ daysLeft }: { daysLeft: number }) {
  const urgent = daysLeft <= 3

  return (
    <div
      className="w-full px-4 py-2.5 text-center text-xs font-semibold inline-flex items-center justify-center gap-2 relative"
      style={
        urgent
          ? {
              background:
                'linear-gradient(90deg, #B91C1C 0%, #DC2626 40%, #EF4444 60%, #DC2626 100%)',
              color: '#FFF5F5',
              boxShadow: '0 6px 20px -10px rgba(220, 38, 38, 0.7)',
              textShadow: '0 1px 0 rgba(0,0,0,0.15)',
            }
          : {
              background:
                'linear-gradient(90deg, #D97706 0%, #F59E0B 45%, #FB923C 60%, #F59E0B 100%)',
              color: '#3B1F00',
              boxShadow: '0 6px 20px -10px rgba(245, 158, 11, 0.55)',
              textShadow: '0 1px 0 rgba(255,255,255,0.15)',
            }
      }
    >
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full"
        style={{
          background: 'rgba(255,255,255,0.2)',
          backdropFilter: 'blur(4px)',
        }}
      >
        {urgent ? <IconAlert size={12} /> : <IconGift size={12} />}
      </span>
      {urgent
        ? `Seu período gratuito termina em ${daysLeft} dia${daysLeft === 1 ? '' : 's'}. Entre em contato para continuar.`
        : `Trial gratuito — ${daysLeft} dias restantes`}
    </div>
  )
}
