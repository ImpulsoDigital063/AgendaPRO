'use client'

import Link from 'next/link'
import { IconPlus } from '@/components/ui/Icon'

type Props = {
  businessId: string
}

export default function RecepMarcarFAB({}: Props) {
  return (
    <Link
      href="/recepcao/marcar"
      aria-label="Marcar novo agendamento"
      style={{
        position: 'fixed',
        right: 'max(20px, calc(env(safe-area-inset-right) + 20px))',
        bottom: 'calc(108px + env(safe-area-inset-bottom) + 16px)',
        width: 56,
        height: 56,
        borderRadius: 28,
        background: 'var(--admin-accent)',
        color: '#fff',
        boxShadow: '0 8px 24px rgba(59,130,246,0.45), 0 2px 8px rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
      }}
    >
      <IconPlus size={24} />
    </Link>
  )
}
