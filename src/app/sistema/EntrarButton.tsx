'use client'

import { useState } from 'react'

/**
 * Botão "Entrar" — chama /api/sistema/entrar, recebe o magic link do dono e
 * abre numa aba nova, logado no /admin do cliente.
 *
 * Nota de sessão: o magic link compartilha cookie no mesmo navegador, então
 * abrir aqui te loga como o cliente TAMBÉM na aba do painel. Pra manter o
 * painel intacto, abra em aba anônima (o botão avisa no title).
 */
export default function EntrarButton({ businessId, name }: { businessId: string; name: string }) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function go() {
    setLoading(true)
    setErr(null)
    try {
      const r = await fetch('/api/sistema/entrar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ businessId }),
      })
      const j = await r.json()
      if (!r.ok) {
        setErr(j.error ?? 'erro')
        return
      }
      window.open(j.url, '_blank', 'noopener,noreferrer')
    } catch {
      setErr('falha de rede')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      className="sys-btn"
      type="button"
      onClick={go}
      disabled={loading}
      title={err ? `Erro: ${err}` : `Entrar no /admin de ${name} (abra em aba anônima pra não deslogar do painel)`}
    >
      {loading ? '…' : err ? '⚠ erro' : 'Entrar'}
    </button>
  )
}
