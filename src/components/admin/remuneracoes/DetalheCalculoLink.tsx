'use client'

import { useState } from 'react'
import DetalheCalculoModal from './DetalheCalculoModal'

type Props = {
  valorVenda: number
  percent: number
  valorBruto: number
  valorTotal: number
}

export default function DetalheCalculoLink({ valorVenda, percent, valorBruto, valorTotal }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11px] font-semibold underline hover:opacity-80"
        style={{ color: 'var(--admin-accent)' }}
      >
        Detalhes
      </button>
      {open && (
        <DetalheCalculoModal
          valorVenda={valorVenda}
          percent={percent}
          valorBruto={valorBruto}
          valorTotal={valorTotal}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
