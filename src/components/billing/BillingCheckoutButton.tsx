'use client'

import { useState } from 'react'

type Props = {
  plan: 'solo' | 'equipe'
  label?: string
  className?: string
  style?: React.CSSProperties
}

export default function BillingCheckoutButton({
  plan,
  label = 'Pagar mensalidade com Mercado Pago',
  className,
  style,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()

      if (!res.ok || !data.url) {
        setError(data.error || 'Erro ao abrir checkout. Tente novamente.')
        setLoading(false)
        return
      }

      window.location.href = data.url
    } catch {
      setError('Falha de conexão. Tente de novo.')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={className}
        style={style}
      >
        {loading ? 'Abrindo checkout…' : label}
      </button>
      {error && (
        <p className="text-sm text-red-400 mt-2 text-center">{error}</p>
      )}
    </>
  )
}
