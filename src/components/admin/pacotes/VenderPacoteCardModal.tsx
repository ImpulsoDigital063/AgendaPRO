'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { IconClose, IconGift, IconSearch } from '@/components/ui/Icon'

// Venda de pacote PARTINDO do card (pacote fixo · escolhe a cliente). É o inverso
// do VenderPacoteModal da ficha do cliente (cliente fixa · escolhe o pacote).
// Reusa a mesma rota /api/admin/packages/sell. Só pacote (kind='pacote') — combo
// não é vendido assim (aplica no agendamento).

type CustomerHit = { id: string; name: string; phone: string | null }
type Professional = { id: string; name: string }

type Props = {
  packageId: string
  packageName: string
  price: number
  onClose: () => void
  onSold: (customerName: string) => void
}

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function VenderPacoteCardModal({ packageId, packageName, price, onClose, onSold }: Props) {
  const [portalReady, setPortalReady] = useState(false)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<CustomerHit[]>([])
  const [searching, setSearching] = useState(false)
  const [customer, setCustomer] = useState<CustomerHit | null>(null)
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [professionalId, setProfessionalId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setPortalReady(true) }, [])
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // profissionais (opcional · pra comissão da venda)
  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data } = await sb.from('professionals').select('id, name').eq('active', true).order('name')
      setProfessionals((data ?? []) as Professional[])
    })()
  }, [])

  // busca de cliente por nome (debounce). RLS escopa ao negócio.
  useEffect(() => {
    const q = query.trim()
    if (customer) return // já escolheu · não busca
    if (q.length < 2) { setHits([]); return }
    let cancelled = false
    setSearching(true)
    const t = setTimeout(async () => {
      const sb = createClient()
      const { data } = await sb
        .from('customers')
        .select('id, name, phone')
        .ilike('name', `%${q}%`)
        .order('name')
        .limit(8)
      if (cancelled) return
      setHits((data ?? []) as CustomerHit[])
      setSearching(false)
    }, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query, customer])

  if (!portalReady) return null

  async function submit() {
    setError(null)
    if (!customer) { setError('Escolha a cliente'); return }
    setSubmitting(true)
    const r = await fetch('/api/admin/packages/sell', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        package_id: packageId,
        customer_id: customer.id,
        professional_id: professionalId || null,
      }),
    })
    setSubmitting(false)
    if (!r.ok) {
      const j = await r.json().catch(() => ({}))
      setError(j.detail ?? j.error ?? 'Erro ao vender pacote')
      return
    }
    onSold(customer.name)
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
          maxHeight: '92vh',
        }}
      >
        <header className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--admin-divider)' }}
        >
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--admin-text-faded)' }}>
              Vender pacote
            </p>
            <p className="text-lg font-bold inline-flex items-center gap-1.5 min-w-0" style={{ color: 'var(--admin-text)' }}>
              <IconGift size={16} /> <span className="truncate">{packageName}</span>
            </p>
            <p className="text-[12px] font-semibold tabular-nums mt-0.5" style={{ color: 'var(--admin-accent)' }}>{brl(price)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--admin-input-bg)] disabled:opacity-50"
            style={{ color: 'var(--admin-text-mute)' }}
            aria-label="Fechar"
          >
            <IconClose size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Cliente · busca OU chip da escolhida */}
          <div>
            <label className="admin-label">Cliente</label>
            {customer ? (
              <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5"
                style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-divider)' }}
              >
                <span className="text-sm font-semibold min-w-0" style={{ color: 'var(--admin-text)' }}>
                  <span className="truncate">{customer.name}</span>
                  {customer.phone && <span className="text-[11px] font-normal ml-1.5" style={{ color: 'var(--admin-text-mute)' }}>{customer.phone}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => { setCustomer(null); setQuery(''); setHits([]) }}
                  className="text-[11px] font-bold flex-shrink-0"
                  style={{ color: 'var(--admin-accent)' }}
                >
                  Trocar
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <input
                    autoFocus
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar cliente por nome..."
                    className="admin-input w-full pl-9 pr-3 py-2.5 rounded-xl text-sm"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--admin-accent)' }}>
                    <IconSearch size={15} />
                  </span>
                </div>
                {query.trim().length >= 2 && (
                  <div className="mt-1.5 rounded-xl overflow-hidden" style={{ border: '1px solid var(--admin-divider)' }}>
                    {searching && <p className="text-xs px-3 py-2.5" style={{ color: 'var(--admin-text-mute)' }}>Buscando...</p>}
                    {!searching && hits.length === 0 && <p className="text-xs px-3 py-2.5" style={{ color: 'var(--admin-text-mute)' }}>Nenhuma cliente encontrada</p>}
                    {hits.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => { setCustomer(h); setHits([]) }}
                        className="w-full text-left px-3 py-2.5 text-sm flex items-center justify-between gap-2 hover:bg-[var(--admin-surface-hi)]"
                        style={{ color: 'var(--admin-text)', borderTop: '1px solid var(--admin-divider)' }}
                      >
                        <span className="truncate font-medium">{h.name}</span>
                        {h.phone && <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--admin-text-mute)' }}>{h.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Profissional (opcional) */}
          <div>
            <label className="admin-label">Profissional que vendeu (opcional · pra comissão)</label>
            <select
              value={professionalId}
              onChange={(e) => setProfessionalId(e.target.value)}
              className="admin-input w-full px-3 py-2.5 rounded-xl text-sm"
            >
              <option value="">Sem profissional</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="rounded-xl p-3 text-xs leading-relaxed"
            style={{ background: 'color-mix(in srgb, var(--admin-accent) 8%, transparent)', color: 'var(--admin-text-2)' }}
          >
            <b style={{ color: 'var(--admin-accent)' }}>O que vai acontecer:</b> abre uma comanda nova com este pacote · você fecha ela com o pagamento (Pix/Cartão/Dinheiro) na tela de Comandas. A cliente já fica com o saldo de sessões pra resgatar no agendamento.
          </div>

          {error && (
            <div className="rounded-lg px-3 py-2 text-xs"
              style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}
            >
              {error}
            </div>
          )}
        </div>

        <footer className="flex-shrink-0 px-5 py-4 flex gap-2 justify-end" style={{ borderTop: '1px solid var(--admin-divider)', background: 'var(--admin-surface)' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !customer}
            className="px-5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)',
              color: '#fff',
            }}
          >
            {submitting ? 'Vendendo...' : 'Confirmar venda'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
