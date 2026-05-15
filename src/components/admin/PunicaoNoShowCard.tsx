'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type PenaltyMode = 'proportional' | 'fixed'

type Props = {
  businessId: string
  /** Estado inicial vindo do SSR. */
  initialEnabled: boolean
  initialMode: PenaltyMode
  initialFixedPoints: number
}

/**
 * Card "Punição por não-comparecimento" (no-show).
 *
 * Tudo opt-in · default OFF · zero impacto em business que não ativar.
 * Auto-save com debounce (mesmo padrão do bônus de pontualidade).
 *
 * Decisões cravadas com Eduardo 14/05/2026:
 *   · Toggle ativa/desativa a feature pro business inteiro
 *   · 2 modos: 'proportional' (pontos que ganharia) ou 'fixed' (valor cravado)
 *   · Trigger SQL aplica a punição automaticamente quando status='no_show'
 *   · Lembrete 3h antes via cron warning o cliente (texto adapta)
 *   · Dono pode reverter caso a caso via botão no card do agendamento
 */
export default function PunicaoNoShowCard({
  businessId,
  initialEnabled,
  initialMode,
  initialFixedPoints,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [mode, setMode] = useState<PenaltyMode>(initialMode)
  const [fixedPoints, setFixedPoints] = useState(String(initialFixedPoints))
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)
  useEffect(() => { return () => { mountedRef.current = false } }, [])

  async function persist(next: { enabled?: boolean; mode?: PenaltyMode; fixedPoints?: number }) {
    setSaving(true)
    const supabase = createClient()
    const update: Record<string, unknown> = {}
    if (typeof next.enabled === 'boolean') update.no_show_punishment_enabled = next.enabled
    if (next.mode) update.no_show_penalty_mode = next.mode
    if (typeof next.fixedPoints === 'number') {
      // Clamp 0-10000 (mesmo CHECK da v45)
      const v = Math.max(0, Math.min(10000, Math.round(next.fixedPoints)))
      update.no_show_fixed_points = v
    }
    if (Object.keys(update).length === 0) {
      setSaving(false)
      return
    }
    const { error } = await supabase
      .from('businesses')
      .update(update)
      .eq('id', businessId)
    if (mountedRef.current) {
      setSaving(false)
      if (!error) setSavedAt(Date.now())
    }
  }

  async function onToggle() {
    const newEnabled = !enabled
    setEnabled(newEnabled)
    await persist({ enabled: newEnabled })
  }

  async function onModeChange(m: PenaltyMode) {
    setMode(m)
    await persist({ mode: m })
  }

  function onFixedPointsChange(raw: string) {
    setFixedPoints(raw)
    // Debounce 600ms (mesmo padrão da pontualidade)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const n = parseInt(raw, 10)
      if (Number.isFinite(n)) persist({ fixedPoints: n })
    }, 600)
  }

  // Indicador de status de salvamento (estável visualmente · mesmo padrão da Pontualidade)
  const showSaved = !saving && savedAt && Date.now() - savedAt < 2000

  return (
    <div className="admin-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Punição por não-comparecimento
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
            Cliente que não vem sem avisar perde pontos automaticamente.
          </p>
        </div>
        <Toggle checked={enabled} onChange={onToggle} />
      </div>

      {enabled && (
        <div className="pt-2 space-y-3" style={{ borderTop: '1px solid var(--admin-divider)' }}>
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              Quantos pontos perde
            </p>
            <div className="space-y-2">
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="no_show_mode"
                  checked={mode === 'proportional'}
                  onChange={() => onModeChange('proportional')}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium" style={{ color: 'var(--admin-text)' }}>
                    Proporcional (recomendado)
                  </span>
                  <span className="block text-[11px] mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>
                    Tira os pontos que ele ganharia naquele atendimento
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="no_show_mode"
                  checked={mode === 'fixed'}
                  onChange={() => onModeChange('fixed')}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium" style={{ color: 'var(--admin-text)' }}>
                    Valor fixo
                  </span>
                  <span className="block text-[11px] mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>
                    Tira o mesmo número de pontos independente do serviço
                  </span>
                </span>
              </label>
            </div>
          </div>

          {mode === 'fixed' && (
            <div>
              <label
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--admin-text-mute)' }}
              >
                Pontos a perder por falta
              </label>
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  type="number"
                  value={fixedPoints}
                  onChange={(e) => onFixedPointsChange(e.target.value)}
                  min="0"
                  max="10000"
                  className="admin-input flex-1 px-3 py-2 text-sm"
                  placeholder="20"
                />
                <span className="text-xs font-medium" style={{ color: 'var(--admin-text-mute)' }}>
                  pontos
                </span>
              </div>
            </div>
          )}

          <div
            className="rounded-lg p-2.5 text-[11px]"
            style={{
              background: 'rgba(245,158,11,0.10)',
              border: '1px solid rgba(245,158,11,0.25)',
              color: 'var(--admin-text-mute)',
            }}
          >
            Cliente recebe email 3h antes do horário · pode cancelar 1-click pra não perder pontos.
            Saldo nunca fica negativo (clamp em 0).
          </div>
        </div>
      )}

      <div className="flex justify-end">
        {saving && (
          <span className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
            Salvando...
          </span>
        )}
        {!saving && showSaved && (
          <span className="text-[11px]" style={{ color: 'var(--admin-success)' }}>
            Salvo
          </span>
        )}
      </div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="flex-shrink-0 relative inline-flex rounded-full transition-colors"
      style={{
        width: 40,
        height: 22,
        background: checked ? 'var(--admin-accent)' : 'var(--admin-input-bg)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <span
        className="absolute top-0.5 rounded-full transition-transform"
        style={{
          width: 16,
          height: 16,
          background: checked ? '#fff' : 'var(--admin-text-mute)',
          transform: checked ? 'translateX(20px)' : 'translateX(2px)',
        }}
      />
    </button>
  )
}
