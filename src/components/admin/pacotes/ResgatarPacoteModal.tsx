'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { IconClose, IconGift, IconSearch } from '@/components/ui/Icon'

// Resgatar pacote PARTINDO do cliente (o certo · Eduardo 24/07): digita o nome,
// vê os pacotes ATIVOS dela e clica "Resgatar" no serviço → o pai abre o
// agendamento já com cliente + serviço + resgate preenchidos. O profissional
// não precisa adivinhar o serviço.

type CustomerHit = { id: string; name: string; phone: string | null }
type Balance = { id: string; service_id: string | null; service_name: string; sessions_total: number; sessions_used: number }
type CustomerPackage = {
  id: string
  package_name: string
  expires_at: string | null
  status: string
  customer_package_balances: Balance[] | null
}

export type ResgateSelecionado = {
  customer: CustomerHit
  serviceId: string
  balanceId: string
  serviceName: string
  packageName: string
}

type Props = {
  onClose: () => void
  onResgatar: (r: ResgateSelecionado) => void
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export default function ResgatarPacoteModal({ onClose, onResgatar }: Props) {
  const [portalReady, setPortalReady] = useState(false)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<CustomerHit[]>([])
  const [searching, setSearching] = useState(false)
  const [customer, setCustomer] = useState<CustomerHit | null>(null)
  const [packages, setPackages] = useState<CustomerPackage[]>([])
  const [loadingPkgs, setLoadingPkgs] = useState(false)

  useEffect(() => { setPortalReady(true) }, [])
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // busca de cliente por nome (debounce)
  useEffect(() => {
    const q = query.trim()
    if (customer) return
    if (q.length < 2) { setHits([]); return }
    let cancelled = false
    setSearching(true)
    const t = setTimeout(async () => {
      const sb = createClient()
      const { data } = await sb.from('customers').select('id, name, phone').ilike('name', `%${q}%`).order('name').limit(8)
      if (cancelled) return
      setHits((data ?? []) as CustomerHit[])
      setSearching(false)
    }, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query, customer])

  // ao escolher a cliente · carrega pacotes ATIVOS com saldo
  useEffect(() => {
    if (!customer) { setPackages([]); return }
    let cancelled = false
    setLoadingPkgs(true)
    ;(async () => {
      const sb = createClient()
      const { data } = await sb
        .from('customer_packages')
        .select('id, package_name, expires_at, status, customer_package_balances (id, service_id, service_name, sessions_total, sessions_used)')
        .eq('customer_id', customer.id)
        .eq('status', 'active')
        .order('purchased_at', { ascending: false })
      if (cancelled) return
      setPackages((data ?? []) as unknown as CustomerPackage[])
      setLoadingPkgs(false)
    })()
    return () => { cancelled = true }
  }, [customer])

  if (!portalReady) return null

  // pacotes ativos, não expirados, com pelo menos 1 serviço com saldo
  const now = Date.now()
  const ativos = packages.filter((p) => !p.expires_at || new Date(p.expires_at).getTime() >= now)

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
        <header className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--admin-text-faded)' }}>Resgatar pacote</p>
            <p className="text-lg font-bold inline-flex items-center gap-1.5" style={{ color: 'var(--admin-text)' }}>
              <IconGift size={16} /> Sessão de pacote
            </p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--admin-input-bg)]" style={{ color: 'var(--admin-text-mute)' }} aria-label="Fechar">
            <IconClose size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Cliente · busca ou chip */}
          <div>
            <label className="admin-label">Cliente</label>
            {customer ? (
              <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5" style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-divider)' }}>
                <span className="text-sm font-semibold min-w-0 truncate" style={{ color: 'var(--admin-text)' }}>
                  {customer.name}
                  {customer.phone && <span className="text-[11px] font-normal ml-1.5" style={{ color: 'var(--admin-text-mute)' }}>{customer.phone}</span>}
                </span>
                <button type="button" onClick={() => { setCustomer(null); setQuery(''); setHits([]) }} className="text-[11px] font-bold flex-shrink-0" style={{ color: 'var(--admin-accent)' }}>Trocar</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  autoFocus
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Digite o nome do cliente..."
                  className="admin-input w-full pl-9 pr-3 py-2.5 rounded-xl text-sm"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--admin-accent)' }}><IconSearch size={15} /></span>
                {query.trim().length >= 2 && (
                  <div className="mt-1.5 rounded-xl overflow-hidden" style={{ border: '1px solid var(--admin-divider)' }}>
                    {searching && <p className="text-xs px-3 py-2.5" style={{ color: 'var(--admin-text-mute)' }}>Buscando...</p>}
                    {!searching && hits.length === 0 && <p className="text-xs px-3 py-2.5" style={{ color: 'var(--admin-text-mute)' }}>Nenhuma cliente com esse nome</p>}
                    {hits.map((h) => (
                      <button key={h.id} type="button" onClick={() => { setCustomer(h); setHits([]) }} className="w-full text-left px-3 py-2.5 text-sm flex items-center justify-between gap-2 hover:bg-[var(--admin-surface-hi)]" style={{ color: 'var(--admin-text)', borderTop: '1px solid var(--admin-divider)' }}>
                        <span className="truncate font-medium">{h.name}</span>
                        {h.phone && <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--admin-text-mute)' }}>{h.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pacotes ativos do cliente */}
          {customer && (
            <div>
              <label className="admin-label">Pacotes ativos</label>
              {loadingPkgs && <p className="text-xs py-2" style={{ color: 'var(--admin-text-mute)' }}>Carregando...</p>}
              {!loadingPkgs && ativos.length === 0 && (
                <div className="rounded-xl p-4 text-sm text-center" style={{ background: 'var(--admin-surface-hi)' }}>
                  <p style={{ color: 'var(--admin-text)' }}>Esta cliente não tem pacote ativo</p>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-mute)' }}>Venda um pacote na aba Pacotes pra ela poder resgatar.</p>
                </div>
              )}
              <div className="space-y-2">
                {ativos.map((pkg) => {
                  const days = daysUntil(pkg.expires_at)
                  const balances = (pkg.customer_package_balances ?? []).filter((b) => b.service_id && (b.sessions_total - b.sessions_used) > 0)
                  if (balances.length === 0) return null
                  return (
                    <article key={pkg.id} className="rounded-xl p-3" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h4 className="font-bold text-sm truncate" style={{ color: 'var(--admin-text)' }}>{pkg.package_name}</h4>
                        {days !== null && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex-shrink-0" style={{ background: days <= 7 ? 'color-mix(in srgb, var(--admin-warning,#F59E0B) 18%, transparent)' : 'color-mix(in srgb, var(--admin-success,#059669) 14%, transparent)', color: days <= 7 ? 'var(--admin-warning,#F59E0B)' : 'var(--admin-success,#059669)' }}>
                            {days <= 0 ? 'Expira hoje' : `${days}d`}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {balances.map((b) => {
                          const rem = b.sessions_total - b.sessions_used
                          return (
                            <div key={b.id} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2" style={{ background: 'var(--admin-surface-hi)' }}>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>{b.service_name}</p>
                                <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>Restam <b>{rem}</b> de {b.sessions_total} sessões</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => onResgatar({ customer, serviceId: b.service_id as string, balanceId: b.id, serviceName: b.service_name, packageName: pkg.package_name })}
                                className="px-3 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)', color: '#fff' }}
                              >
                                <IconGift size={13} /> Resgatar
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </article>
                  )
                })}
              </div>
              <p className="text-[11px] mt-3 leading-relaxed" style={{ color: 'var(--admin-text-faded)' }}>
                Ao resgatar, abre o agendamento já com o serviço e o resgate ligados · você só escolhe profissional e horário.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
