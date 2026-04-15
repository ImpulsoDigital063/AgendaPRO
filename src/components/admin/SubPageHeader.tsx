import Link from 'next/link'
import type { ReactNode } from 'react'
import ThemeToggle from './ThemeToggle'
import LogoutButton from '@/components/LogoutButton'
import { IconArrowLeft } from '@/components/ui/Icon'

export default function SubPageHeader({
  title,
  subtitle,
  back = '/admin',
  right,
}: {
  title: string
  subtitle?: string
  back?: string
  right?: ReactNode
}) {
  return (
    <div
      className="sticky top-0 z-20 backdrop-blur-xl border-b"
      style={{
        background: 'var(--admin-bottomnav-bg)',
        borderColor: 'var(--admin-border)',
      }}
    >
      <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
        <Link
          href={back}
          aria-label="Voltar"
          className="flex-shrink-0 inline-flex items-center justify-center rounded-full transition-transform hover:scale-105"
          style={{
            width: 36,
            height: 36,
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
            color: 'var(--admin-text-2)',
          }}
        >
          <IconArrowLeft size={16} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-lg leading-tight truncate" style={{ color: 'var(--admin-text)' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs truncate" style={{ color: 'var(--admin-text-mute)' }}>
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {right}
          <ThemeToggle compact />
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}
