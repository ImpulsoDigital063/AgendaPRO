'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IconGift, IconPlus } from '@/components/ui/Icon'
import VenderPacoteModal from './VenderPacoteModal'

type Balance = {
  id: string
  service_name: string
  sessions_total: number
  sessions_used: number
}

type CustomerPackage = {
  id: string
  package_name: string
  price_paid: number
  purchased_at: string
  expires_at: string | null
  status: 'active' | 'expired' | 'used_up' | 'cancelled'
  notes: string | null
  customer_package_balances: Balance[] | null
}

type Props = {
  customerId: string
  customerName: string
}

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export default function PacotesClienteTab({ customerId, customerName }: Props) {
  const router = useRouter()
  const [packages, setPackages] = useState<CustomerPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [showSellModal, setShowSellModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    const sb = createClient()
    const { data } = await sb
      .from('customer_packages')
      .select(`
        id, package_name, price_paid, purchased_at, expires_at, status, notes,
        customer_package_balances (id, service_name, sessions_total, sessions_used)
      `)
      .eq('customer_id', customerId)
      .order('purchased_at', { ascending: false })
    setPackages((data ?? []) as unknown as CustomerPackage[])
    setLoading(false)
  }

  useEffect(() => { reload() }, [customerId])

  // Categoriza (considerando expiração na hora · não confia só em status)
  const now = Date.now()
  const ativos = packages.filter((p) => {
    if (p.status !== 'active') return false
    if (p.expires_at && new Date(p.expires_at).getTime() < now) return false
    return true
  })
  const consumidos = packages.filter((p) => p.status === 'used_up')
  const expirados = packages.filter((p) => {
    if (p.status === 'expired') return true
    if (p.status === 'active' && p.expires_at && new Date(p.expires_at).getTime() < now) return true
    return false
  })
  const cancelados = packages.filter((p) => p.status === 'cancelled')

  return (
    <div className="space-y-4">
      {/* Botão Vender pacote */}
      <button
        type="button"
        onClick={() => setShowSellModal(true)}
        className="w-full md:w-auto px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5"
        style={{
          background: 'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
          color: '#fff',
          boxShadow: '0 4px 12px -4px rgba(59,130,246,0.5)',
        }}
      >
        <IconPlus size={14} /> Vender novo pacote
      </button>

      {error && (
        <div className="rounded-xl px-3 py-2 text-xs"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}
        >
          {error}
        </div>
      )}

      {loading && (
        <p className="text-xs text-center py-4" style={{ color: 'var(--admin-text-mute)' }}>Carregando pacotes...</p>
      )}

      {!loading && packages.length === 0 && (
        <div className="rounded-2xl p-8 text-center"
          style={{ background: 'var(--admin-surface)', border: '1px dashed var(--admin-border)' }}
        >
          <span className="inline-flex w-12 h-12 rounded-2xl items-center justify-center mb-3"
            style={{ background: 'color-mix(in srgb, var(--admin-accent) 14%, transparent)', color: 'var(--admin-accent)' }}
          >
            <IconGift size={20} />
          </span>
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Cliente ainda não tem pacotes
          </p>
          <p className="text-xs mt-1 max-w-sm mx-auto leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
            Vender pacote é a melhor forma de garantir retorno: cliente paga 1x e volta N vezes.
          </p>
        </div>
      )}

      {/* ATIVOS */}
      {ativos.length > 0 && (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--admin-text-faded)' }}>
            Ativos · {ativos.length}
          </p>
          <div className="space-y-2">
            {ativos.map((p) => <PacoteCard key={p.id} pkg={p} variant="active" />)}
          </div>
        </section>
      )}

      {/* EXPIRADOS */}
      {expirados.length > 0 && (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--admin-warning,#F59E0B)' }}>
            Expirados · {expirados.length}
          </p>
          <div className="space-y-2">
            {expirados.map((p) => <PacoteCard key={p.id} pkg={p} variant="expired" />)}
          </div>
        </section>
      )}

      {/* CONSUMIDOS */}
      {consumidos.length > 0 && (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--admin-success,#059669)' }}>
            Totalmente consumidos · {consumidos.length}
          </p>
          <div className="space-y-2">
            {consumidos.map((p) => <PacoteCard key={p.id} pkg={p} variant="used_up" />)}
          </div>
        </section>
      )}

      {/* CANCELADOS */}
      {cancelados.length > 0 && (
        <details>
          <summary className="text-[10px] font-bold uppercase tracking-widest cursor-pointer mb-2" style={{ color: 'var(--admin-text-faded)' }}>
            Cancelados · {cancelados.length}
          </summary>
          <div className="space-y-2 mt-2">
            {cancelados.map((p) => <PacoteCard key={p.id} pkg={p} variant="cancelled" />)}
          </div>
        </details>
      )}

      {showSellModal && (
        <VenderPacoteModal
          customerId={customerId}
          customerName={customerName}
          onClose={() => setShowSellModal(false)}
          onSold={async () => {
            setShowSellModal(false)
            await reload()
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function PacoteCard({ pkg, variant }: { pkg: CustomerPackage; variant: 'active' | 'expired' | 'used_up' | 'cancelled' }) {
  const total = (pkg.customer_package_balances ?? []).reduce((s, b) => s + b.sessions_total, 0)
  const used = (pkg.customer_package_balances ?? []).reduce((s, b) => s + b.sessions_used, 0)
  const remaining = total - used
  const pct = total > 0 ? (used / total) * 100 : 0
  const days = daysUntil(pkg.expires_at)

  const isActive = variant === 'active'
  const isExpired = variant === 'expired'
  const isUsedUp = variant === 'used_up'

  const borderColor = isActive
    ? 'color-mix(in srgb, var(--admin-success,#059669) 32%, transparent)'
    : isExpired
      ? 'color-mix(in srgb, var(--admin-warning,#F59E0B) 32%, transparent)'
      : 'var(--admin-border)'

  return (
    <article
      className="rounded-xl p-3"
      style={{
        background: 'var(--admin-surface)',
        border: `1px solid ${borderColor}`,
        opacity: variant === 'cancelled' ? 0.55 : 1,
      }}
    >
      <header className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-sm leading-tight" style={{ color: 'var(--admin-text)' }}>
            {pkg.package_name}
          </h4>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
            Comprado em {fmtDate(pkg.purchased_at)} · {brl(pkg.price_paid)}
          </p>
        </div>
        {isActive && days !== null && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
            style={{
              background: days <= 7
                ? 'color-mix(in srgb, var(--admin-warning,#F59E0B) 18%, transparent)'
                : 'color-mix(in srgb, var(--admin-success,#059669) 14%, transparent)',
              color: days <= 7 ? 'var(--admin-warning,#F59E0B)' : 'var(--admin-success,#059669)',
            }}
          >
            {days <= 0 ? 'Expirando hoje' : days === 1 ? 'Expira amanhã' : `${days}d restantes`}
          </span>
        )}
        {isExpired && pkg.expires_at && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
            style={{
              background: 'color-mix(in srgb, var(--admin-warning,#F59E0B) 18%, transparent)',
              color: 'var(--admin-warning,#F59E0B)',
            }}
          >
            Expirou em {fmtDate(pkg.expires_at)}
          </span>
        )}
        {isUsedUp && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
            style={{
              background: 'color-mix(in srgb, var(--admin-success,#059669) 14%, transparent)',
              color: 'var(--admin-success,#059669)',
            }}
          >
            100% usado
          </span>
        )}
      </header>

      {/* Progress bar geral */}
      <div className="rounded-full h-1.5 overflow-hidden mb-2" style={{ background: 'var(--admin-input-bg)' }}>
        <div
          className="h-full transition-all"
          style={{
            width: `${Math.min(100, pct)}%`,
            background: isUsedUp ? 'var(--admin-success,#059669)' : 'var(--admin-accent)',
          }}
        />
      </div>
      <p className="text-[11px] mb-2" style={{ color: 'var(--admin-text-mute)' }}>
        {used} de {total} sessões usadas
        {isActive && remaining > 0 && ` · restam ${remaining}`}
      </p>

      {/* Saldo por serviço */}
      <ul className="text-[11px] space-y-0.5 mt-2">
        {(pkg.customer_package_balances ?? []).map((b) => {
          const rem = b.sessions_total - b.sessions_used
          return (
            <li key={b.id} className="flex justify-between" style={{ color: 'var(--admin-text-2)' }}>
              <span>{b.service_name}</span>
              <span className="tabular-nums">
                <b style={{ color: rem === 0 ? 'var(--admin-text-faded)' : 'var(--admin-text)' }}>{rem}</b>
                <span style={{ color: 'var(--admin-text-faded)' }}> de {b.sessions_total}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </article>
  )
}
