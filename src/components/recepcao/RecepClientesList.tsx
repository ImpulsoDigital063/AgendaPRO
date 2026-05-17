'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { IconSearch, IconPlus, IconClose } from '@/components/ui/Icon'
import { maskPhone } from '@/lib/client-display'

type Customer = {
  id: string
  name: string
  phone: string
  email: string | null
  total_points: number | null
  birthday: string | null
  notes: string | null
}

type Props = {
  businessId: string
  initial: Customer[]
}

export default function RecepClientesList({ businessId, initial }: Props) {
  const [customers, setCustomers] = useState<Customer[]>(initial)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Customer | null>(null)
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.replace(/\D/g, '').includes(q.replace(/\D/g, '')),
    )
  }, [customers, query])

  return (
    <div className="relative max-w-lg mx-auto px-4 pb-10 space-y-4">
      {/* Busca + botão criar */}
      <div className="flex gap-2">
        <div
          className="flex-1 relative flex items-center"
          style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
            borderRadius: 12,
          }}
        >
          <span className="absolute left-3" style={{ color: 'var(--admin-text-faded)' }}>
            <IconSearch size={16} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou telefone…"
            className="w-full bg-transparent outline-none text-sm py-2.5 pl-9 pr-3"
            style={{ color: 'var(--admin-text)' }}
          />
        </div>
        <button
          onClick={() => setCreating(true)}
          className="px-3 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--admin-accent)', color: '#fff' }}
        >
          <span className="inline-flex items-center gap-1.5">
            <IconPlus size={16} /> Novo
          </span>
        </button>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="admin-card p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--admin-text-2)' }}>
            {query ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setEditing(c)}
              className="w-full text-left admin-card p-3.5 flex items-center justify-between transition-opacity hover:opacity-90"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
                  {c.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                  {maskPhone(c.phone) || c.phone}
                </p>
              </div>
              {typeof c.total_points === 'number' && c.total_points > 0 && (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
                  style={{
                    background: 'var(--admin-accent-bg)',
                    color: 'var(--admin-accent)',
                  }}
                >
                  {c.total_points} pts
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Modal criar */}
      {creating && (
        <CustomerModal
          businessId={businessId}
          customer={null}
          onClose={() => setCreating(false)}
          onSaved={(c) => {
            setCustomers((prev) => [c, ...prev])
            setCreating(false)
          }}
        />
      )}

      {/* Modal editar */}
      {editing && (
        <CustomerModal
          businessId={businessId}
          customer={editing}
          onClose={() => setEditing(null)}
          onSaved={(c) => {
            setCustomers((prev) => prev.map((p) => (p.id === c.id ? c : p)))
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function CustomerModal({
  businessId,
  customer,
  onClose,
  onSaved,
}: {
  businessId: string
  customer: Customer | null
  onClose: () => void
  onSaved: (c: Customer) => void
}) {
  const [name, setName] = useState(customer?.name ?? '')
  const [phone, setPhone] = useState(customer?.phone ?? '')
  const [birthday, setBirthday] = useState(customer?.birthday ?? '')
  const [notes, setNotes] = useState(customer?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setError(null)
    if (!name.trim() || !phone.trim()) {
      setError('Nome e telefone são obrigatórios')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const payload = {
      business_id: businessId,
      name: name.trim(),
      phone: phone.trim(),
      birthday: birthday || null,
      notes: notes || null,
    }

    if (customer) {
      const { data, error } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', customer.id)
        .select()
        .single()
      setLoading(false)
      if (error) return setError(error.message)
      onSaved(data as Customer)
    } else {
      const { data, error } = await supabase
        .from('customers')
        .insert(payload)
        .select()
        .single()
      setLoading(false)
      if (error) return setError(error.message)
      onSaved(data as Customer)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-5"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--admin-text)' }}>
            {customer ? 'Editar cliente' : 'Novo cliente'}
          </h2>
          <button onClick={onClose} aria-label="Fechar" style={{ color: 'var(--admin-text-mute)' }}>
            <IconClose size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Nome">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="recep-input"
              autoFocus
            />
          </Field>
          <Field label="Telefone">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="recep-input"
              placeholder="(22) 99999-9999"
            />
          </Field>
          <Field label="Aniversário (opcional)">
            <input
              type="date"
              value={birthday ?? ''}
              onChange={(e) => setBirthday(e.target.value)}
              className="recep-input"
            />
          </Field>
          <Field label="Anotações (opcional)">
            <textarea
              value={notes ?? ''}
              onChange={(e) => setNotes(e.target.value)}
              className="recep-input"
              rows={3}
            />
          </Field>
        </div>

        {error && (
          <p className="text-xs mt-3" style={{ color: 'var(--admin-danger)' }}>
            {error}
          </p>
        )}

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
            style={{
              background: 'transparent',
              color: 'var(--admin-text-2)',
              border: '1px solid var(--admin-border)',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: 'var(--admin-accent)', color: '#fff', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Salvando…' : 'Salvar'}
          </button>
        </div>

        <style jsx>{`
          :global(.recep-input) {
            width: 100%;
            background: var(--admin-bg);
            border: 1px solid var(--admin-border);
            border-radius: 10px;
            padding: 10px 12px;
            color: var(--admin-text);
            font-size: 14px;
            outline: none;
          }
          :global(.recep-input:focus) {
            border-color: var(--admin-accent);
          }
        `}</style>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--admin-text-mute)' }}>
        {label}
      </span>
      {children}
    </label>
  )
}
