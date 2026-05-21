'use client'

import { useState } from 'react'
import { fillTemplate, formatDiscount, formatValidity } from '@/lib/coupon-templates'
import { IconWhatsapp, IconCheck, IconCopy } from '@/components/ui/Icon'

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

export default function RecepCuponsView({
  businessSlug,
  businessName,
  coupons,
  promocoes,
}: {
  businessSlug: string
  businessName: string
  coupons: Coupon[]
  promocoes: Promocao[]
}) {
  const [tab, setTab] = useState<'personalizados' | 'promocoes'>('personalizados')
  const [filter, setFilter] = useState<FilterKey>('pendentes')
  const [sentOptimistic, setSentOptimistic] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const enriched = coupons.map((c) => ({
    ...c,
    sent: !!c.sent_at || !!sentOptimistic[c.id],
    used: !!c.used_at,
  }))

  const counts = {
    pendentes: enriched.filter((c) => !c.sent && !c.used).length,
    enviados: enriched.filter((c) => c.sent && !c.used).length,
    usados: enriched.filter((c) => c.used).length,
    todos: enriched.length,
  }

  const filtered = enriched.filter((c) => {
    if (filter === 'pendentes') return !c.sent && !c.used
    if (filter === 'enviados') return c.sent && !c.used
    if (filter === 'usados') return c.used
    return true
  })

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

    // Marca enviado otimista + API
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <header>
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-accent)' }}>
          Cupons ativos
        </p>
        <h1 className="text-xl lg:text-2xl font-bold mt-0.5" style={{ color: 'var(--admin-text)' }}>
          Cupons pra disparar
        </h1>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
          Cupons criados pelo Adm. <strong>Personalizados</strong> são 1 por cliente (sumido/aniversário) · <strong>Promoções</strong> são links únicos compartilháveis.
        </p>
      </header>

      {/* Tabs principais · Personalizados / Promoções */}
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
          businessName={businessName}
          copiedId={copiedId}
          onCopy={copyToClipboard}
          onShare={compartilharPromo}
        />
      )}

      {tab === 'personalizados' && (
        <PersonalizadosSection
          enriched={enriched}
          counts={counts}
          filter={filter}
          setFilter={setFilter}
          filtered={filtered}
          abrirWhatsApp={abrirWhatsApp}
        />
      )}
    </div>
  )
}

function PersonalizadosSection({
  counts,
  filter,
  setFilter,
  filtered,
  abrirWhatsApp,
}: {
  enriched: Array<Coupon & { sent: boolean; used: boolean }>
  counts: Record<FilterKey, number>
  filter: FilterKey
  setFilter: (f: FilterKey) => void
  filtered: Array<Coupon & { sent: boolean; used: boolean }>
  abrirWhatsApp: (c: Coupon & { sent: boolean; used: boolean }) => void
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
        Toca em <strong>WhatsApp</strong> em cada cliente pra abrir conversa pronta. Sistema já personalizou nome, valor e link.
      </p>

      {/* Mini stats */}
      <div
        className="rounded-2xl p-3 grid grid-cols-3 gap-2 text-center"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
      >
        <div>
          <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--admin-accent)' }}>{counts.pendentes}</p>
          <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>Pendentes</p>
        </div>
        <div>
          <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>{counts.enviados}</p>
          <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>Enviados</p>
        </div>
        <div>
          <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--admin-success)' }}>{counts.usados}</p>
          <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>Usados</p>
        </div>
      </div>

      {/* Filtros chips */}
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
                Quando o Adm criar uma campanha de reativação, os cupons aparecem aqui pra você disparar.
              </p>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
              Nenhum cupom no filtro <strong>{filter}</strong>. Tente outro filtro acima.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const discountStr = formatDiscount(c.discount_type, Number(c.discount_value))
            const expires = new Date(c.expires_at)
            const initial = c.customer.name.slice(0, 1).toUpperCase()
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
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
                    {c.customer.name}
                  </p>
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
}: {
  promocoes: Promocao[]
  businessName: string
  copiedId: string | null
  onCopy: (text: string, id: string) => void
  onShare: (p: Promocao) => void
}) {
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
          Quando o Adm criar uma promoção (Black Friday, dia parado, etc), o link aparece aqui pra você compartilhar.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
        Promoções ativas no momento. Toca em <strong>Copiar link</strong> pra mandar via WhatsApp · Stories · qualquer canal.
      </p>
      {promocoes.map((p) => {
        const discountStr = formatDiscount(p.discount_type, Number(p.discount_value))
        const expires = new Date(p.expires_at)
        const isCopied = copiedId === p.id
        return (
          <div
            key={p.id}
            className="rounded-2xl p-4 space-y-3"
            style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: 'var(--admin-text)' }}>
                  {p.standalone_label || 'Promoção sem nome'}
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
            <div
              className="rounded-lg px-2.5 py-2 text-[11px] font-mono break-all"
              style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text-2)' }}
            >
              {p.share_url}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onCopy(p.share_url, p.id)}
                className="flex-1 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                style={{
                  background: isCopied ? 'rgba(16,185,129,0.15)' : 'var(--admin-surface-hi)',
                  color: isCopied ? 'var(--admin-success)' : 'var(--admin-text)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                {isCopied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                {isCopied ? 'Copiado!' : 'Copiar link'}
              </button>
              <button
                type="button"
                onClick={() => onShare(p)}
                className="flex-1 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                style={{ background: '#25D366', color: '#fff' }}
              >
                <IconWhatsapp size={14} />
                WhatsApp
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
