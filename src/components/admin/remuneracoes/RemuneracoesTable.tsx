'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export type ProfRow = {
  id: string
  name: string
  default_commission_percent: number
  valorTotal: number
  pago: number
  pendente: number
  valesPendentes: number
}

type Props = {
  rows: ProfRow[]
  monthIso: string
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function RemuneracoesTable({ rows, monthIso }: Props) {
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Fecha menu ao clicar fora
  useEffect(() => {
    if (!menuFor) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuFor(null)
      }
    }
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuFor(null)
    }
    window.addEventListener('mousedown', handler)
    window.addEventListener('keydown', escHandler)
    return () => {
      window.removeEventListener('mousedown', handler)
      window.removeEventListener('keydown', escHandler)
    }
  }, [menuFor])

  const selected = rows.find((r) => r.id === menuFor)

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden mb-6 relative"
        style={{
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  background: 'var(--admin-surface-hi)',
                  borderBottom: '1px solid var(--admin-border)',
                }}
              >
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                  Profissional
                </th>
                <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                  Valor Total (R$)
                </th>
                <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                  Valor Pago (R$)
                </th>
                <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                  Pendente Pagamento (R$)
                </th>
                <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                  Vales Pendentes (R$)
                </th>
                <th className="w-12 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={r.id}
                  onDoubleClick={() => setMenuFor(r.id)}
                  className="cursor-pointer"
                  style={{
                    borderBottom: idx < rows.length - 1 ? '1px solid var(--admin-divider)' : 'none',
                    background: menuFor === r.id ? 'color-mix(in srgb, var(--admin-accent) 6%, transparent)' : 'transparent',
                  }}
                >
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: 'var(--admin-surface-hi)', color: 'var(--admin-text-mute)' }}
                      >
                        {r.name.slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-semibold" style={{ color: 'var(--admin-text)' }}>
                          {r.name}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
                          Comissão {r.default_commission_percent}%
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: 'var(--admin-text)' }}>
                    {formatBRL(r.valorTotal)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: r.pago > 0 ? '#059669' : 'var(--admin-text-mute)' }}>
                    {formatBRL(r.pago)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold" style={{ color: r.pendente > 0 ? 'var(--admin-accent)' : 'var(--admin-text-mute)' }}>
                    {formatBRL(r.pendente)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: r.valesPendentes > 0 ? 'var(--admin-warning,#F59E0B)' : 'var(--admin-text-mute)' }}>
                    {formatBRL(r.valesPendentes)}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuFor(menuFor === r.id ? null : r.id)
                      }}
                      aria-label="Ações"
                      className="p-1.5 rounded-lg"
                      style={{ color: 'var(--admin-text-mute)' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Menu de contexto · modal-style overlay */}
      {selected && (
        <div
          className="fixed inset-0 z-[100]"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.3)' }}
            onClick={() => setMenuFor(null)}
          />
          <div
            ref={menuRef}
            className="absolute rounded-xl overflow-hidden"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              minWidth: 280,
              maxWidth: 320,
            }}
          >
            {/* Header com nome */}
            <div
              className="px-4 py-3"
              style={{
                background: 'var(--admin-surface-hi)',
                borderBottom: '1px solid var(--admin-divider)',
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                Ações
              </p>
              <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
                {selected.name}
              </p>
              <p className="text-xs tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>
                Pendente: <b style={{ color: 'var(--admin-accent)' }}>{formatBRL(selected.pendente)}</b>
              </p>
            </div>

            {/* Opções */}
            <div className="py-1">
              <button
                type="button"
                disabled
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: 'var(--admin-text)' }}
                title="Em breve (etapa 3.4)"
              >
                <span style={{ color: 'var(--admin-text-mute)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </span>
                Exibir Detalhes
              </button>
              <button
                type="button"
                disabled
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: 'var(--admin-text)' }}
                title="Em breve (etapa 3.5)"
              >
                <span style={{ color: 'var(--admin-text-mute)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </span>
                Registrar Pagamento
              </button>
              <button
                type="button"
                disabled
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: 'var(--admin-text)' }}
                title="Em breve"
              >
                <span style={{ color: 'var(--admin-text-mute)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </span>
                Histórico de Pagamentos
              </button>
              <Link
                href={`/admin/configuracoes?tab=profissionais`}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-[var(--admin-surface-hi)]"
                style={{ color: 'var(--admin-text)' }}
                onClick={() => setMenuFor(null)}
              >
                <span style={{ color: 'var(--admin-text-mute)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                Abrir Colaborador
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMenuFor(null)
                  // Recalcular = só refresh (a tabela já recalcula on render)
                  window.location.reload()
                }}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-[var(--admin-surface-hi)]"
                style={{ color: 'var(--admin-text)' }}
              >
                <span style={{ color: 'var(--admin-text-mute)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                </span>
                Recalcular Remunerações
              </button>
            </div>

            {/* Footer */}
            <div
              className="px-4 py-2"
              style={{ borderTop: '1px solid var(--admin-divider)' }}
            >
              <button
                type="button"
                onClick={() => setMenuFor(null)}
                className="text-xs font-semibold w-full text-center"
                style={{ color: 'var(--admin-text-mute)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
