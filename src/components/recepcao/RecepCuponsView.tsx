'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { fillTemplate, formatDiscount, formatValidity } from '@/lib/coupon-templates'
import { IconWhatsapp, IconCheck, IconCopy, IconSearch, IconTrash, IconPlus, IconExternalLink } from '@/components/ui/Icon'

type Promocao = {
  id: string
  code: string
  discount_type: 'fixed' | 'percent'
  discount_value: number
  expires_at: string
  standalone_label: string | null
  professional_name: string | null
  uses: number
  share_url: string
}

type Customer = { id: string; name: string; phone: string }
type Coupon = {
  id: string
  code: string
  discount_type: 'fixed' | 'percent'
  discount_value: number
  expires_at: string
  sent_at: string | null
  used_at: string | null
  whatsapp_message: string | null
  customer: Customer
}

type FilterKey = 'pendentes' | 'enviados' | 'usados' | 'todos'

const FILTER_CHIPS: { value: FilterKey; label: string }[] = [
  { value: 'pendentes', label: 'Pendentes' },
  { value: 'enviados', label: 'Enviados' },
  { value: 'usados', label: 'Usados' },
  { value: 'todos', label: 'Todos' },
]

/** Quando standalone_label vier null/vazio, gera fallback descritivo.
 *  Antes mostrava literal "Promoção sem nome" 3x quando Eduardo testou. */
function promoFallbackName(p: Promocao): string {
  if (p.standalone_label && p.standalone_label.trim()) return p.standalone_label
  const desc = formatDiscount(p.discount_type, Number(p.discount_value))
  const exp = new Date(p.expires_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  return `${desc} OFF · até ${exp}`
}

/** Dias até expirar · negativo = expirado. Usado pra ordenar + badge de urgência. */
function daysToExpire(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

function expiryBadge(days: number): { label: string; bg: string; fg: string } | null {
  if (days <= 1) return { label: days <= 0 ? 'expirou hoje' : 'vence em 1d', bg: 'rgba(239,68,68,0.14)', fg: '#DC2626' }
  if (days <= 3) return { label: `vence em ${days}d`, bg: 'rgba(245,158,11,0.16)', fg: '#D97706' }
  if (days <= 7) return { label: `vence em ${days}d`, bg: 'rgba(245,158,11,0.10)', fg: '#B45309' }
  return null // > 7d não distrai
}

export default function RecepCuponsView({
  businessSlug,
  businessName,
  coupons,
  promocoes,
  canManage = false,
}: {
  businessSlug: string
  businessName: string
  coupons: Coupon[]
  promocoes: Promocao[]
  /** Adm vê botões de criar/excluir · Recep não. */
  canManage?: boolean
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'personalizados' | 'promocoes'>('personalizados')
  const [filter, setFilter] = useState<FilterKey>('pendentes')
  const [search, setSearch] = useState('')
  const [sentOptimistic, setSentOptimistic] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const enriched = coupons.map((c) => ({
    ...c,
    sent: !!c.sent_at || !!sentOptimistic[c.id],
    used: !!c.used_at,
    daysLeft: daysToExpire(c.expires_at),
  }))

  const counts = {
    pendentes: enriched.filter((c) => !c.sent && !c.used).length,
    enviados: enriched.filter((c) => c.sent && !c.used).length,
    usados: enriched.filter((c) => c.used).length,
    todos: enriched.length,
  }
  // Taxa de uso · só faz sentido se já enviou pelo menos 1
  const totalDisparados = counts.enviados + counts.usados
  const taxaUso = totalDisparados > 0 ? Math.round((counts.usados / totalDisparados) * 100) : null

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return enriched
      .filter((c) => {
        if (filter === 'pendentes') return !c.sent && !c.used
        if (filter === 'enviados') return c.sent && !c.used
        if (filter === 'usados') return c.used
        return true
      })
      .filter((c) => !q || c.customer.name.toLowerCase().includes(q))
      // Urgência primeiro: menor daysLeft no topo (mas usados sempre no fim)
      .sort((a, b) => {
        if (a.used !== b.used) return a.used ? 1 : -1
        return a.daysLeft - b.daysLeft
      })
  }, [enriched, filter, search])

  function abrirWhatsApp(c: typeof enriched[0]) {
    const phoneDigits = c.customer.phone.replace(/\D/g, '')
    if (phoneDigits.length < 10) {
      alert('Telefone inválido')
      return
    }
    const expires = new Date(c.expires_at)
    const discountStr = formatDiscount(c.discount_type, Number(c.discount_value))
    const validityStr = formatValidity(expires)
    const link = `${window.location.origin}/${businessSlug}?cupom=${c.code}`
    const msg = fillTemplate(c.whatsapp_message || '', {
      nome: c.customer.name,
      negocio: businessName,
      desconto: discountStr,
      validade: validityStr,
      link,
    })
    const url = `https://wa.me/55${phoneDigits}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank', 'noopener,noreferrer')

    setSentOptimistic((prev) => ({ ...prev, [c.id]: true }))
    fetch(`/api/admin/coupons/${c.id}/sent`, { method: 'POST' }).catch(() => {})
  }

  async function copyToClipboard(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      alert('Não consegui copiar · copia manualmente: ' + text)
    }
  }

  function compartilharPromo(p: Promocao) {
    const discountStr = formatDiscount(p.discount_type, Number(p.discount_value))
    const expires = new Date(p.expires_at)
    const text = `Tá rolando promoção no ${businessName}! ${discountStr} de desconto · vale até ${expires.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}.\n\nAgenda já: ${p.share_url}`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function excluirPromo(p: Promocao) {
    const label = promoFallbackName(p)
    if (!confirm(`Excluir "${label}"?\n\nQuem já clicou no link vai ver "cupom inválido".`)) return
    setDeletingId(p.id)
    try {
      const res = await fetch(`/api/admin/coupons/${p.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`Erro ao excluir: ${err.error ?? 'desconhecido'}`)
        return
      }
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-accent)' }}>
            Cupons ativos
          </p>
          <h1 className="text-xl lg:text-2xl font-bold mt-0.5" style={{ color: 'var(--admin-text)' }}>
            Cupons pra disparar
          </h1>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
            <strong>Personalizados</strong>: 1 por cliente · <strong>Promoções</strong>: link único.
          </p>
        </div>
        {canManage && (
          <Link
            href="/admin/clientes"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-px flex-shrink-0"
            style={{
              background: 'linear-gradient(180deg, var(--brand-primary, var(--admin-accent)) 0%, color-mix(in srgb, var(--brand-primary, var(--admin-accent)) 70%, black) 100%)',
              color: '#fff',
              boxShadow: '0 8px 22px -8px color-mix(in srgb, var(--admin-accent) 55%, transparent)',
            }}
            title="Cupons personalizados nascem dos clientes · gere via /admin/clientes ou via promoção avulsa"
          >
            <IconPlus size={14} /> Nova campanha
          </Link>
        )}
      </header>

      {/* Tabs principais */}
      <div
        className="flex rounded-2xl p-1 gap-1"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
      >
        <button
          type="button"
          onClick={() => setTab('personalizados')}
          className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors"
          style={
            tab === 'personalizados'
              ? { background: 'var(--admin-accent)', color: '#fff' }
              : { background: 'transparent', color: 'var(--admin-text-mute)' }
          }
        >
          Personalizados ({coupons.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('promocoes')}
          className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors"
          style={
            tab === 'promocoes'
              ? { background: 'var(--admin-accent)', color: '#fff' }
              : { background: 'transparent', color: 'var(--admin-text-mute)' }
          }
        >
          Promoções ({promocoes.length})
        </button>
      </div>

      {tab === 'promocoes' && (
        <PromocoesSection
          promocoes={promocoes}
          copiedId={copiedId}
          onCopy={copyToClipboard}
          onShare={compartilharPromo}
          onDelete={canManage ? excluirPromo : null}
          deletingId={deletingId}
        />
      )}

      {tab === 'personalizados' && (
        <PersonalizadosSection
          counts={counts}
          taxaUso={taxaUso}
          filter={filter}
          setFilter={setFilter}
          search={search}
          setSearch={setSearch}
          filtered={filtered}
          abrirWhatsApp={abrirWhatsApp}
        />
      )}
    </div>
  )
}

function PersonalizadosSection({
  counts,
  taxaUso,
  filter,
  setFilter,
  search,
  setSearch,
  filtered,
  abrirWhatsApp,
}: {
  counts: Record<FilterKey, number>
  taxaUso: number | null
  filter: FilterKey
  setFilter: (f: FilterKey) => void
  search: string
  setSearch: (s: string) => void
  filtered: Array<Coupon & { sent: boolean; used: boolean; daysLeft: number }>
  abrirWhatsApp: (c: Coupon & { sent: boolean; used: boolean; daysLeft: number }) => void
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
        Toca em <strong>WhatsApp</strong> pra abrir conversa pronta. Quem vence antes aparece no topo.
      </p>

      {/* Mini stats · 4 colunas com Taxa de Uso */}
      <div
        className="rounded-2xl p-3 grid grid-cols-4 gap-2 text-center"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
      >
        <Stat label="Pendentes" value={String(counts.pendentes)} color="var(--admin-accent)" />
        <Stat label="Enviados" value={String(counts.enviados)} color="var(--admin-text-mute)" />
        <Stat label="Usados" value={String(counts.usados)} color="var(--admin-success)" />
        <Stat
          label="Taxa de uso"
          value={taxaUso == null ? '—' : `${taxaUso}%`}
          color={taxaUso == null ? 'var(--admin-text-faded)' : taxaUso >= 20 ? 'var(--admin-success)' : 'var(--admin-text)'}
          title={taxaUso == null ? 'Dispare ao menos 1 pra calcular' : `${counts.usados} de ${counts.enviados + counts.usados} disparados`}
        />
      </div>

      {/* Busca + filtros */}
      <div className="space-y-2">
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}
        >
          <IconSearch size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--admin-text)' }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-xs"
              style={{ color: 'var(--admin-text-faded)' }}
              aria-label="Limpar busca"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FILTER_CHIPS.map((chip) => {
            const active = filter === chip.value
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => setFilter(chip.value)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                style={
                  active
                    ? { background: 'var(--admin-accent)', color: '#fff' }
                    : { background: 'var(--admin-surface)', color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }
                }
              >
                {chip.label} ({counts[chip.value]})
              </button>
            )
          })}
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
        >
          {counts.todos === 0 ? (
            <>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
                Nenhum cupom pendente
              </p>
              <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                Quando o Adm criar uma campanha de reativação, os cupons aparecem aqui.
              </p>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
              {search ? <>Nada encontrado pra <strong>{search}</strong>.</> : <>Nenhum cupom no filtro <strong>{filter}</strong>.</>}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const discountStr = formatDiscount(c.discount_type, Number(c.discount_value))
            const expires = new Date(c.expires_at)
            const initial = c.customer.name.slice(0, 1).toUpperCase()
            const badge = !c.used ? expiryBadge(c.daysLeft) : null
            return (
              <div
                key={c.id}
                className="rounded-2xl p-3 flex items-center gap-3"
                style={{
                  background: 'var(--admin-surface)',
                  border: '1px solid var(--admin-border)',
                  opacity: c.used ? 0.55 : 1,
                }}
              >
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: 'var(--admin-surface-hi)', color: 'var(--admin-text-mute)' }}
                >
                  {initial}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
                      {c.customer.name}
                    </p>
                    {badge && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                        style={{ background: badge.bg, color: badge.fg }}
                      >
                        {badge.label}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] truncate" style={{ color: 'var(--admin-text-mute)' }}>
                    {discountStr} · vale até {expires.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
                {c.used ? (
                  <span
                    className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 flex-shrink-0"
                    style={{ background: 'rgba(16,185,129,0.14)', color: 'var(--admin-success)' }}
                  >
                    <IconCheck size={12} /> Usou
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => abrirWhatsApp(c)}
                    className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-transform active:scale-95"
                    style={{
                      background: c.sent ? 'rgba(37,211,102,0.14)' : '#25D366',
                      color: c.sent ? '#1A8C45' : '#fff',
                      border: c.sent ? '1px solid rgba(37,211,102,0.3)' : 'none',
                    }}
                  >
                    <IconWhatsapp size={14} />
                    {c.sent ? 'Reenviar' : 'WhatsApp'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PromocoesSection({
  promocoes,
  copiedId,
  onCopy,
  onShare,
  onDelete,
  deletingId,
}: {
  promocoes: Promocao[]
  copiedId: string | null
  onCopy: (text: string, id: string) => void
  onShare: (p: Promocao) => void
  onDelete: ((p: Promocao) => void) | null
  deletingId: string | null
}) {
  const [linkOpenFor, setLinkOpenFor] = useState<string | null>(null)

  if (promocoes.length === 0) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
      >
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
          Nenhuma promoção ativa
        </p>
        <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
          Quando o Adm criar uma promoção, o link aparece aqui pra compartilhar.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
        Toca em <strong>WhatsApp</strong> pra abrir conversa pronta. Mais opções no menu.
      </p>
      {promocoes.map((p) => {
        const discountStr = formatDiscount(p.discount_type, Number(p.discount_value))
        const expires = new Date(p.expires_at)
        const isCopied = copiedId === p.id
        const isDeleting = deletingId === p.id
        const linkOpen = linkOpenFor === p.id
        const label = promoFallbackName(p)
        return (
          <div
            key={p.id}
            className="rounded-2xl p-4 space-y-2"
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
              opacity: isDeleting ? 0.5 : 1,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: 'var(--admin-text)' }}>
                  {label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                  {discountStr} · vale até {expires.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  {p.professional_name && ` · só ${p.professional_name}`}
                </p>
              </div>
              <span
                className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0"
                style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}
              >
                {p.uses} uso{p.uses === 1 ? '' : 's'}
              </span>
            </div>

            {/* Linha de ações · WhatsApp dominante · Copiar + Ver link + Excluir secundários */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onShare(p)}
                disabled={isDeleting}
                className="flex-1 px-3 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                style={{ background: '#25D366', color: '#fff' }}
              >
                <IconWhatsapp size={15} />
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => onCopy(p.share_url, p.id)}
                disabled={isDeleting}
                title="Copiar link"
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform active:scale-95"
                style={{
                  background: isCopied ? 'rgba(16,185,129,0.15)' : 'var(--admin-surface-hi)',
                  color: isCopied ? 'var(--admin-success)' : 'var(--admin-text-mute)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                {isCopied ? <IconCheck size={15} /> : <IconCopy size={15} />}
              </button>
              <button
                type="button"
                onClick={() => setLinkOpenFor(linkOpen ? null : p.id)}
                title={linkOpen ? 'Esconder link' : 'Ver link'}
                disabled={isDeleting}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform active:scale-95"
                style={{
                  background: linkOpen ? 'var(--admin-accent-bg)' : 'var(--admin-surface-hi)',
                  color: linkOpen ? 'var(--admin-accent)' : 'var(--admin-text-mute)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                <IconExternalLink size={15} />
              </button>
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(p)}
                  disabled={isDeleting}
                  title="Excluir promoção"
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform active:scale-95"
                  style={{
                    background: 'transparent',
                    color: '#DC2626',
                    border: '1px solid rgba(220,38,38,0.25)',
                  }}
                >
                  <IconTrash size={15} />
                </button>
              )}
            </div>

            {/* URL crua só quando o usuário expandir */}
            {linkOpen && (
              <div
                className="rounded-lg px-2.5 py-2 text-[11px] font-mono break-all"
                style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text-2)' }}
              >
                {p.share_url}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Stat({
  label,
  value,
  color,
  title,
}: {
  label: string
  value: string
  color: string
  title?: string
}) {
  return (
    <div title={title}>
      <p className="text-xl font-bold tabular-nums" style={{ color }}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>{label}</p>
    </div>
  )
}
