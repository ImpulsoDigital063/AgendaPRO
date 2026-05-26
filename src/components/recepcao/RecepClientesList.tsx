'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/activity-log'
import { IconSearch, IconPlus, IconClose, IconStar, IconGift } from '@/components/ui/Icon'
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
    <div className="relative max-w-lg md:max-w-7xl mx-auto px-4 md:px-6 pb-10 space-y-4">
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

type Reward = {
  id: string
  name: string
  description: string | null
  points_required: number
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

  // Resgate de pontos · só faz sentido pra cliente existente com saldo
  const [rewards, setRewards] = useState<Reward[]>([])
  const [currentPoints, setCurrentPoints] = useState<number>(customer?.total_points ?? 0)
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [redeemMessage, setRedeemMessage] = useState<string | null>(null)

  // Carrega rewards do business se editando cliente existente
  useEffect(() => {
    if (!customer) return
    let cancelled = false
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('rewards')
        .select('id, name, description, points_required')
        .eq('business_id', businessId)
        .eq('active', true)
        .order('points_required')
      if (!cancelled) setRewards((data ?? []) as Reward[])
    }
    load()
    return () => {
      cancelled = true
    }
  }, [customer, businessId])

  async function handleRedeem(reward: Reward) {
    if (!customer) return
    if (currentPoints < reward.points_required) {
      setRedeemMessage(`Saldo insuficiente (atual: ${currentPoints} · custa: ${reward.points_required})`)
      return
    }
    setRedeeming(reward.id)
    setRedeemMessage(null)
    const res = await fetch(`/api/admin/customers/${customer.id}/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reward_id: reward.id }),
    })
    const data = await res.json()
    setRedeeming(null)
    if (!res.ok) {
      setRedeemMessage(`Erro: ${data.error ?? 'falha'}`)
      return
    }
    setCurrentPoints(data.total_points)
    setRedeemMessage(`Resgate de "${reward.name}" registrado. Saldo: ${data.total_points} pts`)
    await logActionForCustomer(
      createClient(),
      businessId,
      'redeem_points',
      customer.id,
      `${customer.name} resgatou "${reward.name}" (${reward.points_required} pts)`,
    )
  }

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
      await logActionForCustomer(supabase, businessId, 'update_customer', data.id, `Editou ${data.name}`)
      onSaved(data as Customer)
    } else {
      const { data, error } = await supabase
        .from('customers')
        .insert(payload)
        .select()
        .single()
      setLoading(false)
      if (error) return setError(error.message)
      await logActionForCustomer(supabase, businessId, 'create_customer', data.id, `Cadastrou ${data.name}`)
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

        {/* Saldo de pontos + resgate · só pra cliente existente */}
        {customer && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--admin-divider)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                Saldo de pontos
              </p>
              <span className="text-xl font-bold tabular-nums inline-flex items-center gap-1.5" style={{ color: 'var(--admin-accent)' }}>
                <IconStar size={16} /> {currentPoints}
              </span>
            </div>

            {redeemMessage && (
              <p
                className="text-xs px-3 py-2 rounded-lg mb-2"
                style={{
                  background: redeemMessage.startsWith('Erro')
                    ? 'color-mix(in srgb, var(--admin-danger,#EF4444) 12%, transparent)'
                    : 'color-mix(in srgb, var(--admin-success,#10B981) 12%, transparent)',
                  color: redeemMessage.startsWith('Erro') ? 'var(--admin-danger,#EF4444)' : 'var(--admin-success,#10B981)',
                }}
              >
                {redeemMessage}
              </p>
            )}

            {rewards.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
                Nenhuma recompensa cadastrada · peça pra Adm criar em Fidelidade.
              </p>
            ) : (
              <div className="space-y-1.5">
                {rewards.map((r) => {
                  const canRedeem = currentPoints >= r.points_required
                  const isLoading = redeeming === r.id
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-2.5 rounded-lg"
                      style={{
                        background: 'var(--admin-surface-hi)',
                        border: '1px solid var(--admin-border)',
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                          {r.name}
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                          {r.points_required} pts {r.description ? `· ${r.description}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRedeem(r)}
                        disabled={!canRedeem || isLoading}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-30 inline-flex items-center gap-1"
                        style={{
                          background: canRedeem ? 'var(--admin-accent)' : 'transparent',
                          color: canRedeem ? '#fff' : 'var(--admin-text-faded)',
                          border: canRedeem ? 'none' : '1px solid var(--admin-border)',
                        }}
                      >
                        {isLoading ? '…' : (
                          <>
                            <IconGift size={12} /> Resgatar
                          </>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

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

async function logActionForCustomer(
  supabase: ReturnType<typeof createClient>,
  businessId: string,
  action: 'create_customer' | 'update_customer' | 'redeem_points',
  customerId: string,
  description: string,
) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data: prof } = await supabase
    .from('professionals')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  logActivity({
    business_id: businessId,
    professional_id: prof?.id,
    action,
    target_type: 'customer',
    target_id: customerId,
    description,
  })
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
