'use client'

/**
 * Acesso à ficha do cliente de DENTRO do atendimento (agenda → clica no
 * atendimento → abre a ficha). Reusa o FichasTab — mesma área de Clientes,
 * zero duplicação. Usado no AppointmentDrawer (desktop) e na página
 * /admin/atendimentos/[id] (mobile). Só renderiza se houver customer_id.
 */

import { useState } from 'react'
import FichasTab from './FichasTab'
import { IconChevronDown } from '@/components/ui/Icon'

export default function ClientFichaSection({ customerId }: { customerId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
      >
        <span>Ficha do cliente</span>
        <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--admin-text-mute)' }}>
          {open ? 'Fechar' : 'Abrir'}
          <IconChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
        </span>
      </button>
      {open && (
        <div className="mt-3">
          <FichasTab customerId={customerId} />
        </div>
      )}
    </div>
  )
}
