'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CHECKLIST_ITEMS } from '@/lib/onboarding-content'
import type { OnboardingChecklistKey } from '@/lib/admin-data'
import InstallChecklistItem from './InstallChecklistItem'

/**
 * Checklist persistente no topo da home admin.
 *
 * Status de cada item vem do server (deriva do estado SQL).
 * Some inteiro quando todos estão concluídos (done=true).
 *
 * Mobile-first · max-w-lg como o resto da home.
 */
type Props = {
  items: Record<OnboardingChecklistKey, boolean>
  percent: number
  done: boolean
  /** v143 · pra dispensar o card de vez (negócio que já opera) */
  businessId?: string
  /** Slug pra abrir página pública do business (passo "agendamento") */
  slug: string
}

export default function OnboardingChecklist({ items, percent, done, slug, businessId }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [dispensando, setDispensando] = useState(false)
  const [oculto, setOculto] = useState(false)
  const router = useRouter()

  /* v143 · fechar de vez. Só quem já opera clica aqui — e pra essa dona o
     checklist virou ruído, não ajuda. Volta a aparecer só se alguém desmarcar
     a coluna no banco. */
  async function dispensar() {
    if (!businessId) return
    setDispensando(true)
    setOculto(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('businesses')
      .update({ onboarding_dispensado: true })
      .eq('id', businessId)
    if (error) {
      setOculto(false)
      setDispensando(false)
      return
    }
    router.refresh()
  }

  if (done || oculto) return null

  const doneCount = Object.values(items).filter(Boolean).length
  const total = Object.keys(items).length

  return (
    <section className="relative max-w-lg mx-auto px-4 mb-6">
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 10%, var(--admin-surface)) 0%, var(--admin-surface) 100%)',
          border: '1px solid var(--admin-border)',
          boxShadow: '0 4px 16px -8px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header · sempre visível */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-3.5 flex items-center justify-between gap-3 transition-opacity hover:opacity-90"
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
              style={{
                background: 'var(--admin-accent-bg)',
                border: '1px solid var(--admin-accent-border)',
              }}
            >
              🎯
            </span>
            <div className="text-left min-w-0">
              <p
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'var(--admin-accent)' }}
              >
                Primeiros passos
              </p>
              <p
                className="text-sm font-bold leading-tight truncate"
                style={{ color: 'var(--admin-text)' }}
              >
                {doneCount} de {total} concluídos
              </p>
            </div>
          </div>
          <span
            className="flex-shrink-0 text-xs font-bold tabular-nums"
            style={{ color: 'var(--admin-text-faded)' }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 200ms ease',
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </button>

        {businessId && (
          <button
            type="button"
            onClick={dispensar}
            disabled={dispensando}
            className="absolute top-2 right-2 p-1.5 rounded-lg disabled:opacity-40"
            style={{ color: 'var(--admin-text-faded)' }}
            aria-label="Não mostrar mais"
            title="Não mostrar mais"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        {/* Progress bar · sempre visível */}
        <div className="px-4 pb-3">
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${percent}%`,
                background:
                  'linear-gradient(90deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
              }}
            />
          </div>
        </div>

        {/* Lista de itens · só quando expanded */}
        {expanded && (
          <div
            className="px-3 pb-3 pt-1 space-y-1.5"
            style={{ borderTop: '1px solid var(--admin-border)' }}
          >
            {CHECKLIST_ITEMS.map((item, idx) => {
              const isDone = items[item.key]
              const href =
                item.key === 'agendamento' && !isDone
                  ? `/${slug}`
                  : item.ctaHref

              return (
                <ChecklistRow
                  key={item.key}
                  index={idx + 1}
                  emoji={item.emoji}
                  title={item.title}
                  subtitle={item.subtitle}
                  ctaLabel={item.ctaLabel}
                  ctaHref={href}
                  done={isDone}
                  external={item.key === 'agendamento'}
                />
              )
            })}

            {/* Item EXTRA · "Instalar como app" · gerenciado 100% client-side
                via display-mode + UA. Self-contained — não afeta os 5 items
                do server (CHECKLIST_ITEMS). Auto-detecta plataforma:
                Android = botão direto · iOS Safari = guide · iOS Chrome =
                aviso pra abrir no Safari. Desktop não renderiza. */}
            <InstallChecklistItem index={CHECKLIST_ITEMS.length + 1} />
          </div>
        )}
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────── */

function ChecklistRow({
  index,
  emoji,
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  done,
  external,
}: {
  index: number
  emoji: string
  title: string
  subtitle: string
  ctaLabel: string
  ctaHref: string
  done: boolean
  external?: boolean
}) {
  const linkProps = external
    ? { href: ctaHref, target: '_blank', rel: 'noopener' }
    : { href: ctaHref }

  return (
    <Link
      {...linkProps}
      className="flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.005]"
      style={{
        background: done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${done ? 'rgba(16,185,129,0.18)' : 'var(--admin-border)'}`,
      }}
    >
      {/* Status indicator */}
      <span
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
        style={{
          background: done ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${done ? 'rgba(16,185,129,0.30)' : 'var(--admin-border)'}`,
        }}
      >
        {done ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <span style={{ color: 'var(--admin-text-faded)', fontSize: '11px', fontWeight: 700 }}>{index}</span>
        )}
      </span>

      {/* Title + subtitle */}
      <div className="min-w-0 flex-1">
        <p
          className="text-sm font-semibold leading-tight"
          style={{
            color: done ? 'var(--admin-text-faded)' : 'var(--admin-text)',
            textDecoration: done ? 'line-through' : 'none',
          }}
        >
          <span className="mr-1.5">{emoji}</span>
          {title}
        </p>
        <p
          className="text-[11px] mt-0.5 leading-snug"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          {done ? '✓ Concluído' : subtitle}
        </p>
      </div>

      {/* CTA arrow */}
      {!done && (
        <span
          className="flex-shrink-0 text-xs font-semibold"
          style={{ color: 'var(--admin-accent)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      )}
    </Link>
  )
}
