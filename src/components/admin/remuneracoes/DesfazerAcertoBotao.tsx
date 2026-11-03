'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Desfazer um acerto de comissão (03/11/2026). Dois toques, sem janela do
 * navegador: "Desfazer" vira "Confirmar?" por alguns segundos. Os atendimentos
 * voltam ao Pendente e os vales descontados voltam a ficar em aberto.
 */
export default function DesfazerAcertoBotao({ paymentId }: { paymentId: string }) {
  const router = useRouter()
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function desfazer() {
    setEnviando(true)
    setErro(null)
    const r = await fetch(`/api/admin/commission-payments?id=${encodeURIComponent(paymentId)}`, { method: 'DELETE' })
    setEnviando(false)
    if (!r.ok) {
      setErro('Não deu pra desfazer. Tente de novo.')
      setConfirmando(false)
      return
    }
    router.refresh()
  }

  if (!confirmando) {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            setConfirmando(true)
            setTimeout(() => setConfirmando(false), 6000)
          }}
          className="text-xs font-semibold underline underline-offset-2"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          Desfazer
        </button>
        {erro && <p className="text-[10px] mt-1" style={{ color: '#DC2626' }}>{erro}</p>}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={desfazer}
      disabled={enviando}
      className="text-xs font-bold px-2 py-1 rounded-md"
      style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}
    >
      {enviando ? 'Desfazendo…' : 'Confirmar: voltar ao Pendente'}
    </button>
  )
}
