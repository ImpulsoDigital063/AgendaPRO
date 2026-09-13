'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import PeriodoPersonalizado from './financeiro/PeriodoPersonalizado'

const TABS = [
  { key: 'hoje',   label: 'Hoje'   },
  { key: 'semana', label: '7 dias' },
  { key: 'mes',    label: 'Mês'    },
] as const

/**
 * `permitirCustom` nasce DESLIGADO de propósito: este seletor é compartilhado
 * com Despesas, Cancelados e o financeiro do profissional, e o servidor dessas
 * telas não entende `?de=&ate=`. Mostrar o botão lá viraria filtro que não
 * filtra. Só o Financeiro liga (Eduardo, 13/09/2026).
 */
export default function FinancePeriodTabs({
  periodo,
  permitirCustom = false,
}: {
  periodo: string
  permitirCustom?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const de = searchParams.get('de') ?? undefined
  const ate = searchParams.get('ate') ?? undefined

  return (
    <div
      className="flex rounded-2xl p-1 gap-1"
      style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {TABS.map((t) => {
        const active = periodo === t.key
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => router.push(`${pathname}?periodo=${t.key}`)}
            className="flex-1 min-w-0 py-2 text-[13px] sm:text-sm font-semibold rounded-xl transition-all"
            style={
              active
                ? {
                    background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                    color: '#fff',
                    boxShadow: '0 6px 14px rgba(59,130,246,0.3)',
                  }
                : {
                    background: 'transparent',
                    color: 'var(--admin-text-mute)',
                  }
            }
          >
            {t.label}
          </button>
        )
      })}

      {permitirCustom && (
        <PeriodoPersonalizado de={de} ate={ate} ativo={periodo === 'custom'} estilo="aba" />
      )}
    </div>
  )
}
