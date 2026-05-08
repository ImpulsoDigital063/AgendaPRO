'use client'

import { useEffect, useRef } from 'react'

/**
 * Componente invisível que dispara POST /api/admin/onboarding/mark
 * uma única vez ao montar — usado pra marcar passos do checklist
 * que sinalizam "admin visitou esta aba" (ex: horários, QR Code).
 *
 * Plug-and-play: importa, renderiza com `field={...}`, pronto.
 * Não modifica lógica existente dos tabs.
 *
 * Pra evitar chamadas desnecessárias, recebe `alreadyMarked` —
 * se já está true, nem dispara o fetch.
 */
type Props = {
  field: 'onboarding_horarios_revisado' | 'qr_code_compartilhado'
  alreadyMarked: boolean
}

export default function OnboardingMarker({ field, alreadyMarked }: Props) {
  const fired = useRef(false)

  useEffect(() => {
    if (alreadyMarked || fired.current) return
    fired.current = true
    fetch('/api/admin/onboarding/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field }),
    }).catch(() => {})
  }, [field, alreadyMarked])

  return null
}
