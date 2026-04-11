'use client'

export default function TrialBanner({ daysLeft }: { daysLeft: number }) {
  const urgent = daysLeft <= 3

  return (
    <div className={`w-full px-4 py-2.5 text-center text-xs font-medium ${
      urgent
        ? 'bg-red-500 text-white'
        : 'bg-amber-400 text-amber-900'
    }`}>
      {urgent
        ? `⚠️ Seu período gratuito termina em ${daysLeft} dia${daysLeft === 1 ? '' : 's'}. Entre em contato para continuar.`
        : `🎁 Trial gratuito — ${daysLeft} dias restantes`
      }
    </div>
  )
}
