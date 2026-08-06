'use client'

/* QR + botão que copia SÓ o código.
   ───────────────────────────────────────────────────────────────────
   É a razão de esta página existir. No WhatsApp, tocar e segurar copia
   a mensagem inteira; aqui um toque põe no clipboard exatamente o que
   o banco espera.

   O QR vem primeiro porque quem paga pelo celular do banco em outro
   aparelho resolve sem tocar em nada. Quem paga no mesmo aparelho usa
   o botão — e é por isso que os dois existem. */

import { useState } from 'react'
import QRCode from 'react-qr-code'
import { IconCheck } from '@/components/ui/Icon'

export default function CopiarPix({ codigo, isDark }: { codigo: string; isDark: boolean }) {
  const [copiado, setCopiado] = useState(false)
  const [falhou, setFalhou] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(true)
      setFalhou(false)
      setTimeout(() => setCopiado(false), 4000)
    } catch {
      /* Safari antigo e webview dentro do WhatsApp às vezes bloqueiam o
         clipboard. Em vez de falhar calado, abre o código pra ela
         selecionar — pior que copiar num toque, melhor que nada. */
      setFalhou(true)
    }
  }

  const text = isDark ? '#F1F5F9' : '#0F172A'
  const mute = isDark ? '#94A3B8' : '#64748B'
  const surface = isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF'
  const border = isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0'

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: surface, border: `1px solid ${border}` }}>
      <div>
        <p className="text-xs font-semibold text-center mb-3" style={{ color: mute }}>
          Escaneie no app do seu banco
        </p>
        {/* Fundo branco fixo mesmo no tema escuro: leitor de QR não lê
            código invertido. */}
        <div className="mx-auto w-fit rounded-xl p-3" style={{ background: '#FFFFFF' }}>
          <QRCode value={codigo} size={180} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="flex-1 h-px" style={{ background: border }} />
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: mute }}>
          ou
        </span>
        <span className="flex-1 h-px" style={{ background: border }} />
      </div>

      <button
        type="button"
        onClick={copiar}
        className="w-full rounded-xl py-3.5 text-sm font-bold transition-transform active:scale-[0.98]"
        style={{
          background: copiado
            ? '#10B981'
            : 'linear-gradient(135deg, var(--brand-primary, #3B82F6), var(--brand-secondary, #06B6D4))',
          color: '#fff',
        }}
      >
        {copiado ? (
          <span className="inline-flex items-center gap-2">
            <IconCheck size={16} /> Código copiado
          </span>
        ) : (
          'Copiar código PIX'
        )}
      </button>

      {copiado && (
        <p className="text-xs text-center" style={{ color: mute }}>
          Agora é só abrir o app do banco, escolher <strong>PIX Copia e Cola</strong> e colar.
        </p>
      )}

      {falhou && (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: mute }}>
            Seu navegador não deixou copiar sozinho. Segure no código abaixo e copie:
          </p>
          <p
            className="text-[11px] break-all p-3 rounded-lg font-mono select-all"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', color: text }}
          >
            {codigo}
          </p>
        </div>
      )}
    </div>
  )
}
