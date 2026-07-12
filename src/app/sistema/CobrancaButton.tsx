'use client'

import { useState } from 'react'

/**
 * "Enviar cobrança" — pega a cobrança PIX aberta do negócio e abre o WhatsApp
 * do dono com a mensagem + link prontos. Ação segura (não cria cobrança). Se
 * não houver telefone, cai num modo que só mostra o link pra copiar.
 */
export default function CobrancaButton({ businessId }: { businessId: string }) {
  const [loading, setLoading] = useState(false)
  const [state, setState] = useState<'idle' | 'ok' | 'err'>('idle')
  const [msg, setMsg] = useState<string>('')

  async function go() {
    setLoading(true)
    setState('idle')
    try {
      const r = await fetch('/api/sistema/cobranca', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ businessId }),
      })
      const j = await r.json()
      if (!r.ok) {
        setState('err')
        setMsg(j.error ?? 'erro')
        return
      }
      if (j.waUrl) {
        window.open(j.waUrl, '_blank', 'noopener,noreferrer')
        setState('ok')
        setMsg('WhatsApp aberto')
      } else if (j.invoiceUrl) {
        // sem telefone: copia o link pra área de transferência
        try {
          await navigator.clipboard.writeText(j.invoiceUrl)
          setState('ok')
          setMsg('link copiado (sem telefone)')
        } catch {
          setState('err')
          setMsg('sem telefone — link: ' + j.invoiceUrl)
        }
      }
    } catch {
      setState('err')
      setMsg('falha de rede')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      className="sys-btn sys-guard"
      type="button"
      onClick={go}
      disabled={loading}
      title={state !== 'idle' ? msg : 'Enviar link de cobrança PIX pelo WhatsApp'}
    >
      {loading ? '…' : state === 'ok' ? '✓ enviado' : state === 'err' ? '⚠ ' + msg.slice(0, 24) : 'Enviar cobrança'}
    </button>
  )
}
