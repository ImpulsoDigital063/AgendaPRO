'use client'

import { useEffect } from 'react'
import { IconClose } from '@/components/ui/Icon'

type Props = {
  valorVenda: number
  percent: number
  valorBruto: number
  valorTotal: number
  onClose: () => void
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function DetalheCalculoModal({ valorVenda, percent, valorBruto, valorTotal, onClose }: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[150]" role="dialog" aria-modal="true">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div
        className="absolute rounded-2xl p-5"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
          minWidth: 320,
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
            Detalhes do Cálculo
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 rounded-lg"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            <IconClose size={16} />
          </button>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span style={{ color: 'var(--admin-text-mute)' }}>Valor da Venda</span>
            <span className="tabular-nums font-semibold" style={{ color: 'var(--admin-text)' }}>
              {formatBRL(valorVenda)}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--admin-text-mute)' }}>Cálculo para Comissão</span>
            <span className="tabular-nums font-semibold" style={{ color: 'var(--admin-text)' }}>
              {percent}%
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--admin-text-mute)' }}>Valor Bruto da Comissão</span>
            <span className="tabular-nums font-semibold" style={{ color: 'var(--admin-text)' }}>
              {formatBRL(valorBruto)}
            </span>
          </div>
          <div
            className="flex justify-between pt-2 mt-1"
            style={{ borderTop: '1px solid var(--admin-divider)' }}
          >
            <span className="font-bold" style={{ color: 'var(--admin-text)' }}>
              Valor Total da Comissão
            </span>
            <span className="tabular-nums font-bold" style={{ color: 'var(--admin-accent)' }}>
              {formatBRL(valorTotal)}
            </span>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm font-bold uppercase tracking-wider"
            style={{ background: 'var(--admin-accent)', color: '#fff' }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
