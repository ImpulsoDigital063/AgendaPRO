'use client'

import { useState } from 'react'

type Cliente = {
  id: string
  name: string
  phone: string
  email: string | null
  created_at: string
  count: number
  lastDate: string
  totalSpent: number
}

type Props = {
  clients: Cliente[]
}

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function ClientesView({ clients }: Props) {
  const [search, setSearch] = useState('')

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false)
    )
  })

  return (
    <div className="space-y-4">
      {/* Busca */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nome, telefone ou email..."
        className="admin-input w-full px-4 py-3 text-sm"
      />

      {clients.length === 0 ? (
        <div className="admin-card p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--admin-text-faded)' }}>Nenhum cliente cadastrado ainda.</p>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>Os clientes aparecem aqui quando fazem o primeiro agendamento.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-card p-6 text-center">
          <p className="text-sm" style={{ color: 'var(--admin-text-faded)' }}>Nenhum cliente encontrado para "{search}".</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => (
            <div key={client.id} className="admin-card px-4 py-3">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold" style={{ color: 'var(--admin-text)' }}>{client.name}</p>
                  <a
                    href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-500 hover:underline flex items-center gap-1"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>{client.phone}
                  </a>
                  {client.email && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>{client.email}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
                    {client.count} agendamento{client.count !== 1 ? 's' : ''}
                  </p>
                  {client.totalSpent > 0 && (
                    <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{formatPrice(client.totalSpent)}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--admin-divider)' }}>
                <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
                  Ultimo agendamento: <span style={{ color: 'var(--admin-text-2)' }}>{formatDate(client.lastDate)}</span>
                </p>
                <a
                  href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}
                >
                  Enviar mensagem
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
