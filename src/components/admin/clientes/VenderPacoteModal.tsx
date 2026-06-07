'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { IconClose, IconGift } from '@/components/ui/Icon'

type PackageOption = {
  id: string
  name: string
  price: number
  validity_kind: 'none' | 'days' | 'weeks' | 'months' | 'years'
  validity_value: number | null
  package_items: {
    quantity: number
    product_id: string | null
    services: { name: string } | { name: string }[] | null
    products: { name: string } | { name: string }[] | null
  }[] | null
}

type Professional = {
  id: string
  name: string
}

type Props = {
  customerId: string
  customerName: string
  onClose: () => void
  onSold: () => void
}

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function validityLabel(kind: PackageOption['validity_kind'], value: number | null): string {
  if (kind === 'none') return 'Sem prazo de validade'
  const v = value ?? 0
  const m: Record<'days' | 'weeks' | 'months' | 'years', string> = {
    days: v === 1 ? '1 dia' : `${v} dias`,
    weeks: v === 1 ? '1 semana' : `${v} semanas`,
    months: v === 1 ? '1 mês' : `${v} meses`,
    years: v === 1 ? '1 ano' : `${v} anos`,
  }
  return `Válido por ${m[kind]}`
}

export default function VenderPacoteModal({ customerId, customerName, onClose, onSold }: Props) {
  const [portalReady, setPortalReady] = useState(false)
  const [packages, setPackages] = useState<PackageOption[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [packageId, setPackageId] = useState('')
  const [professionalId, setProfessionalId] = useState('')

  useEffect(() => { setPortalReady(true) }, [])
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const [{ data: pks }, { data: profs }] = await Promise.all([
        sb
          .from('packages')
          .select('id, name, price, validity_kind, validity_value, package_items(quantity, product_id, services(name), products(name))')
          .eq('active', true)
          .order('name'),
        sb
          .from('professionals')
          .select('id, name')
          .eq('active', true)
          .order('name'),
      ])
      setPackages((pks ?? []) as unknown as PackageOption[])
      setProfessionals((profs ?? []) as Professional[])
      setLoading(false)
    }
    load()
  }, [])

  if (!portalReady) return null

  const selected = packages.find((p) => p.id === packageId)
  const sessoesTotal = selected
    ? (selected.package_items ?? []).filter((it) => !it.product_id).reduce((s, it) => s + Number(it.quantity ?? 0), 0)
    : 0
  const produtosTotal = selected
    ? (selected.package_items ?? []).filter((it) => it.product_id).reduce((s, it) => s + Number(it.quantity ?? 0), 0)
    : 0
  const resumoLinha = [
    sessoesTotal > 0 ? `${sessoesTotal} ${sessoesTotal === 1 ? 'sessão' : 'sessões'}` : null,
    produtosTotal > 0 ? `${produtosTotal} ${produtosTotal === 1 ? 'produto' : 'produtos'}` : null,
  ].filter(Boolean).join(' · ')

  async function submit() {
    setError(null)
    if (!packageId) { setError('Selecione um pacote'); return }
    setSubmitting(true)
    const r = await fetch('/api/admin/packages/sell', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        package_id: packageId,
        customer_id: customerId,
        professional_id: professionalId || null,
      }),
    })
    setSubmitting(false)
    if (!r.ok) {
      const j = await r.json().catch(() => ({}))
      setError(j.error ?? 'Erro ao vender pacote')
      return
    }
    onSold()
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
        className="w-full sm:max-w-md md:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
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
            <p className="text-lg font-bold inline-flex items-center gap-1.5" style={{ color: 'var(--admin-text)' }}>
              <IconGift size={16} /> Pra {customerName}
            </p>
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
          {loading && (
            <p className="text-sm text-center py-4" style={{ color: 'var(--admin-text-mute)' }}>Carregando...</p>
          )}

          {!loading && packages.length === 0 && (
            <div className="rounded-xl p-4 text-sm text-center" style={{ background: 'var(--admin-surface-hi)' }}>
              <p style={{ color: 'var(--admin-text)' }}>Nenhum pacote cadastrado ainda</p>
              <a href="/admin/pacotes" className="text-xs underline mt-1 inline-block" style={{ color: 'var(--admin-accent)' }}>
                Ir em Pacotes → cadastrar
              </a>
            </div>
          )}

          {!loading && packages.length > 0 && (
            <>
              <div>
                <label className="admin-label">Pacote</label>
                <select
                  value={packageId}
                  onChange={(e) => setPackageId(e.target.value)}
                  className="admin-input w-full px-3 py-2.5 rounded-xl text-sm"
                >
                  <option value="">Selecione...</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {brl(p.price)}
                    </option>
                  ))}
                </select>
              </div>

              {selected && (
                <div className="rounded-xl p-3 text-sm space-y-2"
                  style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-divider)' }}
                >
                  <div className="flex justify-between font-semibold" style={{ color: 'var(--admin-text)' }}>
                    <span>{selected.name}</span>
                    <span className="tabular-nums">{brl(selected.price)}</span>
                  </div>
                  <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
                    {validityLabel(selected.validity_kind, selected.validity_value)}{resumoLinha ? ` · ${resumoLinha}` : ''}
                  </p>
                  <ul className="text-[12px] space-y-0.5 mt-2 pt-2" style={{ borderTop: '1px solid var(--admin-divider)' }}>
                    {(selected.package_items ?? []).map((it, i) => {
                      const isProduct = !!it.product_id
                      const ent = isProduct
                        ? (Array.isArray(it.products) ? it.products[0] : it.products)
                        : (Array.isArray(it.services) ? it.services[0] : it.services)
                      return (
                        <li key={i} className="flex justify-between items-center gap-2" style={{ color: 'var(--admin-text-2)' }}>
                          <span className="inline-flex items-center gap-1.5">
                            <b>{it.quantity}x</b> {ent?.name ?? (isProduct ? 'Produto' : 'Serviço')}
                            {isProduct && (
                              <span
                                className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded"
                                style={{ color: '#9333EA', background: 'rgba(147,51,234,0.10)' }}
                              >
                                Produto
                              </span>
                            )}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

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
                <b style={{ color: 'var(--admin-accent)' }}>O que vai acontecer:</b> uma comanda nova será aberta com este pacote · você fecha ela com o pagamento normal (Pix/Cartão/Dinheiro) na tela de Comandas. O cliente já fica com saldo de sessões disponível pra consumir.{produtosTotal > 0 ? ' Os produtos do combo já saem do estoque na venda (entregues na hora).' : ''}
              </div>
            </>
          )}

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
            disabled={submitting || !packageId || loading}
            className="px-5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
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
