'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  qrImage: string | null    // base64 PNG
  qrPayload: string | null  // chave PIX copia-cola
  valorReais: number
  modalidade: string         // mensal_pix, semestral_pix, anual_pix
  coberturaMeses: number
  paymentId: string
}

const MODALIDADE_LABEL: Record<string, string> = {
  mensal_pix: 'Mensalidade · PIX',
  semestral_pix: 'Semestral à vista · PIX',
  anual_pix: 'Anual à vista · PIX',
}

export default function PixInlineCheckout({
  qrImage,
  qrPayload,
  valorReais,
  modalidade,
  coberturaMeses,
  paymentId,
}: Props) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [statusMessage, setStatusMessage] = useState('Aguardando pagamento…')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Polling: a cada 5s pergunta /api/billing/status. Quando virar active,
  // refresh da pagina (server vai redirecionar pra /admin).
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/billing/status', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (data?.subscription?.status === 'active') {
          setStatusMessage('Pagamento confirmado! Liberando seu painel…')
          if (pollRef.current) clearInterval(pollRef.current)
          // Espera 1.5s pra cliente ver o feedback antes do refresh
          setTimeout(() => router.refresh(), 1500)
        }
      } catch {
        // silencioso — proxima rodada tenta de novo
      }
    }, 5000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [router])

  async function handleCopy() {
    if (!qrPayload) return
    try {
      await navigator.clipboard.writeText(qrPayload)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // fallback: seleciona o texto pra cliente copiar manual
      const el = document.getElementById(`pix-payload-${paymentId}`) as HTMLInputElement | null
      el?.select()
    }
  }

  const valorFmt = valorReais.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  return (
    <div className="space-y-4">
      {/* Header — valor em destaque */}
      <div className="text-center space-y-1 pt-1">
        <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
          {MODALIDADE_LABEL[modalidade] ?? 'PIX'}
          {coberturaMeses > 1 ? ` · cobre ${coberturaMeses} meses` : ''}
        </p>
        <p className="text-3xl font-bold text-emerald-300">{valorFmt}</p>
      </div>

      {/* QR Code */}
      {qrImage ? (
        <div
          className="rounded-2xl p-4 flex items-center justify-center"
          style={{
            background: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* Importante: img normal, nao Image — base64 inline nao precisa de loader */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${qrImage}`}
            alt="QR Code PIX"
            width={240}
            height={240}
            style={{ width: 240, height: 240, display: 'block' }}
          />
        </div>
      ) : (
        <div
          className="rounded-2xl p-6 text-center text-xs text-amber-300"
          style={{
            background: 'rgba(245,158,11,0.10)',
            border: '1px solid rgba(245,158,11,0.30)',
          }}
        >
          QR Code não chegou. Usa o código PIX abaixo no app do banco.
        </div>
      )}

      {/* Instruções rápidas */}
      <ol className="space-y-1.5 text-xs text-slate-300 pl-4 list-decimal">
        <li>Abre o app do seu banco</li>
        <li>Escolhe pagar com PIX → escaneia o QR ou cola o código</li>
        <li>A gente libera seu painel automático em segundos</li>
      </ol>

      {/* Chave PIX copia-cola */}
      {qrPayload && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
            Ou cola no banco:
          </p>
          <div className="flex items-stretch gap-2">
            <input
              id={`pix-payload-${paymentId}`}
              type="text"
              readOnly
              value={qrPayload}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 min-w-0 px-3 py-2.5 rounded-lg text-[11px] font-mono"
              style={{
                background: 'rgba(0,0,0,0.30)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: '#cbd5e1',
              }}
            />
            <button
              type="button"
              onClick={handleCopy}
              className="flex-shrink-0 px-4 rounded-lg font-bold text-xs transition-all"
              style={{
                background: copied
                  ? 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)'
                  : 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
                color: '#fff',
              }}
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
      )}

      {/* Status — polling feedback */}
      <div
        className="rounded-lg px-3 py-2.5 flex items-center gap-2"
        style={{
          background: 'rgba(16,185,129,0.10)',
          border: '1px solid rgba(16,185,129,0.30)',
        }}
      >
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <p className="text-[11px] text-emerald-200 leading-snug">
          {statusMessage}
        </p>
      </div>

      <p className="text-[10px] text-slate-500 text-center leading-snug">
        Pagamento PIX processado pelo Asaas. Sem fidelidade · Garantia de 7 dias.
      </p>
    </div>
  )
}
