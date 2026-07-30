'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  businessId: string
  /** Estado inicial vindo do SSR (v98a/b). */
  initialCanBookSelf: boolean
  initialCanBookOthers: boolean
  initialSeeTeamAgenda: boolean
}

/**
 * Card "Autonomia da equipe" (v92 · 29/07/2026).
 *
 * Nasceu da Realli Studio Nails: 5 profissionais, nenhuma recepcionista, e a
 * dona virando gargalo porque só ela marcava. Aqui ela decide sozinha quanto
 * de autonomia dar — sem precisar chamar a Impulso.
 *
 * Tudo opt-in · default OFF · negócio que não ligar não vê diferença nenhuma.
 *
 * Limites cravados com Eduardo 29/07/2026:
 *   · marcar = SÓ na própria agenda. Nunca na da colega.
 *   · ver agenda da equipe = leitura pura. Nenhum botão de ação.
 *   · cancelar/remarcar de colega continua exclusivo da dona.
 */
export default function AutonomiaEquipeCard({
  businessId,
  initialCanBookSelf,
  initialCanBookOthers,
  initialSeeTeamAgenda,
}: Props) {
  const [canBookSelf, setCanBookSelf] = useState(initialCanBookSelf)
  const [canBookOthers, setCanBookOthers] = useState(initialCanBookOthers)
  const [seeTeamAgenda, setSeeTeamAgenda] = useState(initialSeeTeamAgenda)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  useEffect(() => { return () => { mountedRef.current = false } }, [])

  async function persist(update: Record<string, boolean>) {
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: e } = await supabase
      .from('businesses')
      .update(update)
      .eq('id', businessId)
    if (!mountedRef.current) return
    setSaving(false)
    if (e) setError('Não salvou. Tenta de novo.')
    else setSavedAt(Date.now())
  }

  async function onToggleBook() {
    const next = !canBookSelf
    setCanBookSelf(next)
    // Desligar "marcar pra si" derruba "marcar pra colega" junto — sem isso
    // ficaria um estado impossível no banco (marca pra colega mas não pra si).
    if (!next && canBookOthers) {
      setCanBookOthers(false)
      await persist({ professionals_can_book_self: false, professionals_can_book_others: false })
      return
    }
    await persist({ professionals_can_book_self: next })
  }

  async function onToggleOthers() {
    const next = !canBookOthers
    setCanBookOthers(next)
    await persist({ professionals_can_book_others: next })
  }

  async function onToggleAgenda() {
    const next = !seeTeamAgenda
    setSeeTeamAgenda(next)
    await persist({ professionals_see_team_agenda: next })
  }

  const showSaved = !saving && savedAt && Date.now() - savedAt < 2000

  return (
    <div className="admin-card p-4 space-y-3">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Autonomia da equipe
          </p>
          {saving && (
            <span className="text-[10px]" style={{ color: 'var(--admin-text-faded)' }}>
              salvando…
            </span>
          )}
          {showSaved && (
            <span className="text-[10px] font-semibold" style={{ color: 'var(--admin-success)' }}>
              salvo
            </span>
          )}
        </div>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
          O que cada profissional pode fazer no painel dela.
        </p>
      </div>

      <div
        className="pt-3 space-y-3"
        style={{ borderTop: '1px solid var(--admin-divider)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
              Marcar na própria agenda
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
              Ela agenda as clientes dela sem depender de você. Na agenda da colega,
              não encosta.
            </p>
          </div>
          <Toggle checked={canBookSelf} onChange={onToggleBook} label="Marcar na própria agenda" />
        </div>

        {/* v98b · só faz sentido se ela já pode marcar pra si */}
        {canBookSelf && (
          <div
            className="flex items-start justify-between gap-3 pl-3"
            style={{ borderLeft: '2px solid var(--admin-divider)' }}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                Marcar também na agenda das colegas
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                Serve pra quem atende em dupla e encaixa cliente uma da outra.
                Cancelar e remarcar continua só com você.
              </p>
            </div>
            <Toggle
              checked={canBookOthers}
              onChange={onToggleOthers}
              label="Marcar na agenda das colegas"
            />
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
              Ver a agenda da equipe
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
              Só leitura — serve pra quem atende em dupla saber se a colega tem
              horário livre.
            </p>
          </div>
          <Toggle checked={seeTeamAgenda} onChange={onToggleAgenda} label="Ver a agenda da equipe" />
        </div>
      </div>

      {error && (
        <p className="text-[11px]" style={{ color: 'var(--admin-danger)' }}>
          {error}
        </p>
      )}
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="relative w-11 h-6 rounded-full flex-shrink-0 transition-colors"
      style={{
        background: checked ? 'var(--admin-success)' : 'var(--admin-border)',
      }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full transition-transform"
        style={{
          left: 2,
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
          background: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        }}
      />
    </button>
  )
}
