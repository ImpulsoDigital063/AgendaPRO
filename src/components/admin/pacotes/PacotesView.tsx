'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconPlus, IconTrash, IconGift, IconPencil } from '@/components/ui/Icon'
import ConfirmActionModal from '@/components/admin/ConfirmActionModal'
import PacoteFormModal, { type PackageFormValue } from './PacoteFormModal'

type Service = { id: string; name: string; price: number | null; active: boolean }
type Product = { id: string; name: string; price: number | null }

type PackageItemRow = {
  id: string
  service_id: string | null
  product_id: string | null
  quantity: number
  unit_price: number | null
  services: { name: string; price: number | null } | null
  products: { name: string; price: number | null } | null
}

export type PackageRow = {
  id: string
  name: string
  price: number
  validity_kind: 'none' | 'days' | 'weeks' | 'months' | 'years'
  validity_value: number | null
  active: boolean
  description: string | null
  created_at: string
  package_items: PackageItemRow[] | null
}

type Props = {
  initialPackages: PackageRow[]
  services: Service[]
  products: Product[]
  /** 'combo' = serviço+produto (em Produtos) · 'pacote' = multi-serviço resgatável (aba Pacotes). Default 'pacote'. */
  kind?: 'combo' | 'pacote'
}

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function validityLabel(kind: PackageRow['validity_kind'], value: number | null): string {
  if (kind === 'none') return 'Sem prazo de validade'
  const v = value ?? 0
  const map: Record<'days' | 'weeks' | 'months' | 'years', string> = {
    days: v === 1 ? '1 dia' : `${v} dias`,
    weeks: v === 1 ? '1 semana' : `${v} semanas`,
    months: v === 1 ? '1 mês' : `${v} meses`,
    years: v === 1 ? '1 ano' : `${v} anos`,
  }
  return `Válido por ${map[kind]}`
}

// Só serviços contam como "sessões" (produto é entregue, não tem sessão)
function totalSessions(items: PackageItemRow[] | null): number {
  return (items ?? []).filter((it) => it.service_id).reduce((s, it) => s + Number(it.quantity ?? 0), 0)
}

function totalProducts(items: PackageItemRow[] | null): number {
  return (items ?? []).filter((it) => it.product_id).reduce((s, it) => s + Number(it.quantity ?? 0), 0)
}

function sumItems(items: PackageItemRow[] | null): number {
  return (items ?? []).reduce((s, it) => {
    const unit = it.unit_price ?? it.products?.price ?? it.services?.price ?? 0
    return s + Number(unit) * Number(it.quantity ?? 0)
  }, 0)
}

export default function PacotesView({ initialPackages, services, products, kind = 'pacote' }: Props) {
  const isCombo = kind === 'combo'
  const noun = isCombo ? 'combo' : 'pacote'
  const router = useRouter()
  const [packages, setPackages] = useState(initialPackages)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<PackageRow | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<PackageRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const filtered = packages.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase().trim()),
  )

  async function reload() {
    const r = await fetch(`/api/admin/packages?kind=${kind}`)
    if (r.ok) {
      const j = await r.json()
      setPackages(j.packages ?? [])
    }
    router.refresh()
  }

  async function handleSave(value: PackageFormValue) {
    setError(null)
    setLoading(true)
    // Novo registro nasce com o kind da tela (combo em Produtos, pacote na aba).
    // Editar não muda kind (o back-end mantém o que já está).
    const body = JSON.stringify(editing ? value : { ...value, kind })
    const url = editing ? `/api/admin/packages/${editing.id}` : '/api/admin/packages'
    const method = editing ? 'PATCH' : 'POST'
    const r = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body })
    setLoading(false)
    if (!r.ok) {
      const j = await r.json().catch(() => ({}))
      setError(j.detail ?? j.error ?? 'Erro ao salvar')
      return
    }
    setShowForm(false)
    setEditing(null)
    await reload()
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setLoading(true)
    const r = await fetch(`/api/admin/packages/${confirmDelete.id}`, { method: 'DELETE' })
    setLoading(false)
    if (!r.ok) {
      const j = await r.json().catch(() => ({}))
      setError(j.error ?? 'Erro ao remover')
      return
    }
    setConfirmDelete(null)
    await reload()
  }

  return (
    <div className="space-y-5">
      {/* Header da página · busca + botão criar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar por nome..."
            className="admin-input w-full pl-9 pr-3 py-2.5 rounded-xl text-sm"
          />
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--admin-accent)' }}
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <button
          type="button"
          onClick={() => { setEditing(null); setShowForm(true); setError(null) }}
          className="px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
          style={{
            background: 'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
            color: '#fff',
            boxShadow: '0 4px 12px -4px rgba(59,130,246,0.5)',
          }}
        >
          <IconPlus size={14} /> Novo {noun}
        </button>
      </div>

      {error && (
        <div className="rounded-xl px-3 py-2 text-xs font-semibold"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}
        >
          {error}
        </div>
      )}

      {/* Empty state OU grid de pacotes */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl p-10 text-center"
          style={{ background: 'var(--admin-surface)', border: '1px dashed var(--admin-border)' }}
        >
          <span
            className="inline-flex w-12 h-12 rounded-2xl items-center justify-center mb-3"
            style={{
              background: 'color-mix(in srgb, var(--admin-accent) 14%, transparent)',
              color: 'var(--admin-accent)',
            }}
          >
            <IconGift size={20} />
          </span>
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            {packages.length === 0 ? `Nenhum ${noun} foi cadastrado` : `Nenhum ${noun} encontrado pra essa busca`}
          </p>
          {packages.length === 0 && (
            <p className="text-xs mt-2 leading-relaxed max-w-md mx-auto" style={{ color: 'var(--admin-text-mute)' }}>
              {isCombo
                ? <>Combo = serviço + produto vendidos juntos por um preço. Ex: <b>trança + cabelo por R$ 290</b>. Aparece na hora de agendar e na venda.</>
                : <>Pacote = vários serviços vendidos de uma vez, resgatados aos poucos. Ex: <b>4 manutenções por R$ 280</b> válido por 90 dias.</>}
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((pkg) => {
            const itemsTotal = sumItems(pkg.package_items)
            const desconto = Math.max(0, itemsTotal - pkg.price)
            const sessoes = totalSessions(pkg.package_items)
            const produtos = totalProducts(pkg.package_items)
            return (
              <article
                key={pkg.id}
                className="rounded-2xl p-4 relative"
                style={{
                  background: 'var(--admin-surface)',
                  border: '1px solid var(--admin-border)',
                  opacity: pkg.active ? 1 : 0.6,
                }}
              >
                <header className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-base leading-tight" style={{ color: 'var(--admin-text)' }}>
                      {pkg.name}
                    </h3>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                      {validityLabel(pkg.validity_kind, pkg.validity_value)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => { setEditing(pkg); setShowForm(true); setError(null) }}
                      className="w-7 h-7 rounded-full inline-flex items-center justify-center"
                      style={{ color: 'var(--admin-text-mute)' }}
                      title="Editar"
                    >
                      <IconPencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(pkg)}
                      className="w-7 h-7 rounded-full inline-flex items-center justify-center"
                      style={{ color: '#DC2626' }}
                      title="Remover"
                    >
                      <IconTrash size={12} />
                    </button>
                  </div>
                </header>

                {/* Itens do pacote */}
                <ul className="text-sm space-y-1 mt-3 mb-3">
                  {(pkg.package_items ?? []).map((it) => {
                    const isProduct = !!it.product_id
                    const nome = isProduct ? (it.products?.name ?? 'Produto') : (it.services?.name ?? 'Serviço')
                    const preco = it.unit_price ?? (isProduct ? it.products?.price : it.services?.price) ?? 0
                    return (
                      <li key={it.id} className="flex justify-between gap-2 items-center" style={{ color: 'var(--admin-text-2)' }}>
                        <span className="inline-flex items-center gap-1.5 min-w-0">
                          <b>{it.quantity}x</b>
                          <span className="truncate">{nome}</span>
                          {isProduct && (
                            <span
                              className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded flex-shrink-0"
                              style={{ color: '#9333EA', background: 'rgba(147,51,234,0.10)' }}
                            >
                              Produto
                            </span>
                          )}
                        </span>
                        <span className="tabular-nums text-[12px] flex-shrink-0" style={{ color: 'var(--admin-text-mute)' }}>
                          {brl(Number(preco))} ea
                        </span>
                      </li>
                    )
                  })}
                </ul>

                <div className="rounded-xl p-3 mt-3" style={{ background: 'var(--admin-surface-hi)' }}>
                  <div className="flex justify-between text-[12px]" style={{ color: 'var(--admin-text-mute)' }}>
                    <span>Valor cheio</span>
                    <span className="tabular-nums">{brl(itemsTotal)}</span>
                  </div>
                  {desconto > 0 && (
                    <div className="flex justify-between text-[12px]" style={{ color: '#DC2626' }}>
                      <span>Desconto</span>
                      <span className="tabular-nums">− {brl(desconto)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-1 mt-1" style={{ borderTop: '1px solid var(--admin-divider)', color: 'var(--admin-text)' }}>
                    <span>{isCombo ? 'Combo' : 'Pacote'}</span>
                    <span className="tabular-nums">{brl(pkg.price)}</span>
                  </div>
                  <p className="text-[10px] mt-1.5 text-right" style={{ color: 'var(--admin-text-faded)' }}>
                    {[
                      sessoes > 0 ? `${sessoes} ${sessoes === 1 ? 'sessão' : 'sessões'}` : null,
                      produtos > 0 ? `${produtos} ${produtos === 1 ? 'produto' : 'produtos'}` : null,
                    ].filter(Boolean).join(' + ')} no total
                  </p>
                </div>

                {!pkg.active && (
                  <span
                    className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text-faded)' }}
                  >
                    Arquivado
                  </span>
                )}
              </article>
            )
          })}
        </div>
      )}

      {/* Modal form (criar/editar) */}
      {showForm && (
        <PacoteFormModal
          kind={kind}
          initial={editing}
          services={services}
          products={products}
          loading={loading}
          onClose={() => { setShowForm(false); setEditing(null); setError(null) }}
          onSubmit={handleSave}
        />
      )}

      {/* Modal confirmar delete */}
      <ConfirmActionModal
        open={!!confirmDelete}
        title={`Remover "${confirmDelete?.name ?? noun}"?`}
        message={`Se este ${noun} já foi vendido a algum cliente, ele será arquivado (não some · histórico fica). Se nunca foi vendido, será removido de vez.`}
        confirmLabel="Sim, remover"
        cancelLabel="Voltar"
        tone="danger"
        loading={loading}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  )
}
