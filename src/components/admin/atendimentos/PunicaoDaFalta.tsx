'use client'

import { useEffect, useState } from 'react'

/* Falta com desconto de pontos, na gaveta da grade (25/10, "A semana").
   Mesmas rotas do cartão antigo: penalty-info diz se houve desconto e se já
   foi devolvido; relevar devolve (emergência real). Some quando não houve
   desconto nenhum. */
export default function PunicaoDaFalta({ appointmentId }: { appointmentId: string }) {
  const [info, setInfo] = useState<{ pontos: number | null; devolvido: boolean } | null>(null)
  const [devolvendo, setDevolvendo] = useState(false)

  useEffect(() => {
    let vivo = true
    fetch(`/api/admin/appointments/${appointmentId}/penalty-info`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (vivo && d?.hasPenalty) setInfo({ pontos: d.penaltyPoints ?? null, devolvido: !!d.alreadyRelevado })
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [appointmentId])

  if (!info) return null

  async function devolver() {
    setDevolvendo(true)
    const r = await fetch(`/api/admin/appointments/${appointmentId}/relevar`, { method: 'POST' })
    setDevolvendo(false)
    if (r.ok) setInfo((i) => (i ? { ...i, devolvido: true } : i))
  }

  return (
    <div className="rounded-xl p-3.5 text-[13px]" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
      {info.devolvido ? (
        <p style={{ color: 'var(--admin-text-mute)' }}>Os pontos descontados pela falta foram devolvidos.</p>
      ) : (
        <>
          <p style={{ color: 'var(--admin-text)' }}>
            A cliente perdeu {info.pontos ? `${info.pontos} pontos` : 'pontos'} por não comparecer.
          </p>
          <button
            type="button"
            onClick={devolver}
            disabled={devolvendo}
            className="mt-2 text-[13px] font-semibold disabled:opacity-50"
            style={{ color: 'var(--admin-accent)' }}
          >
            {devolvendo ? 'Devolvendo…' : 'Devolver os pontos (emergência real)'}
          </button>
        </>
      )}
    </div>
  )
}
