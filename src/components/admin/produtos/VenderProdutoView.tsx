'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { IconArrowLeft, IconPlus, IconClose, IconCheck, IconDollar, IconSearch, IconUser } from '@/components/ui/Icon'
import { getAreaPrefix } from '@/lib/area-prefix'
import { todayBR } from '@/lib/date-br'
import PaymentMethodModal, { type PaymentMethodChoice, type CardPaymentDetails } from '@/components/admin/PaymentMethodModal'

type Product = {
  id: string
  name: string
  variant: string | null
  unit: string
  price: number | null
  quantity: number
  trackStock: boolean
  commissionType: 'percent' | 'fixed' | null
  commissionValue: number | null
}

type Professional = { id: string; name: string }

type Customer = { id: string; name: string; phone: string }

type Line = {
  uid: string
  productId: string
  quantity: string
  unitPrice: string
  discount: string
}

function newLine(): Line {
  return {
    uid: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}${Math.random()}`,
    productId: '',
    quantity: '1',
    unitPrice: '',
    discount: '',
  }
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const selectStyle = {
  background: `var(--admin-input-bg) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>") no-repeat right 0.625rem center`,
  border: '1px solid var(--admin-border)',
  color: 'var(--admin-text)',
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
  MozAppearance: 'none' as const,
}

type Props = {
  businessId: string
  products: Product[]
  professionals: Professional[]
  defaultProfId: string | null
  /** Quando vem do drawer do produto via ?prefill=ID · já abre com aquela linha pronta */
  prefillProductId?: string | null
}

export default function VenderProdutoView({ businessId, products, professionals, defaultProfId, prefillProductId }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const areaPrefix = getAreaPrefix(pathname)
  const produtosHref = `${areaPrefix}/produtos`
  const supabase = useMemo(() => createClient(), [])

  const [cliente, setCliente] = useState<Customer | null>(null)
  const [avulso, setAvulso] = useState(false)
  const [avulsoName, setAvulsoName] = useState('')
  const [showClientPicker, setShowClientPicker] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [searching, setSearching] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)

  const [profId, setProfId] = useState<string>(defaultProfId ?? '')
  const [saleDate, setSaleDate] = useState(() => todayBR())
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>(() => {
    if (prefillProductId) {
      const p = products.find((x) => x.id === prefillProductId)
      if (p) {
        return [{
          uid: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`,
          productId: p.id,
          quantity: '1',
          unitPrice: p.price != null ? String(p.price) : '',
          discount: '',
        }]
      }
    }
    return [newLine()]
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ total: number; itens: number; method: PaymentMethodChoice } | null>(null)

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  // Busca cliente · debounced
  useEffect(() => {
    if (!showClientPicker) return
    const term = search.trim()
    if (term.length < 2) { setResults([]); return }
    let cancelled = false
    setSearching(true)
    const id = setTimeout(async () => {
      const digits = term.replace(/\D/g, '')
      let query = supabase
        .from('customers')
        .select('id, name, phone')
        .eq('business_id', businessId)
        .limit(20)
      if (digits.length >= 3) query = query.ilike('phone', `%${digits}%`)
      else query = query.ilike('name', `%${term}%`)
      const { data } = await query.order('name')
      if (!cancelled) {
        setResults((data ?? []) as Customer[])
        setSearching(false)
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(id) }
  }, [search, showClientPicker, businessId, supabase])

  function updateLine(uid: string, partial: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.uid === uid ? { ...l, ...partial } : l)))
  }

  function pickProduct(uid: string, productId: string) {
    const p = productById.get(productId)
    updateLine(uid, {
      productId,
      unitPrice: p?.price ? String(p.price) : '',
    })
  }

  function addLine() { setLines((prev) => [...prev, newLine()]) }
  function removeLine(uid: string) { setLines((prev) => prev.length <= 1 ? prev : prev.filter((l) => l.uid !== uid)) }

  const validLines = lines.filter((l) => l.productId && Number(l.quantity) > 0)
  const totalGross = validLines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.unitPrice || 0), 0)
  const totalDiscount = validLines.reduce((sum, l) => sum + Number(l.discount || 0), 0)
  const total = Math.max(0, totalGross - totalDiscount)

  // Comissão-aware: só faz sentido dizer "recebe comissão" se algum produto da
  // venda tem comissão configurada. Senão o campo profissional é só opcional.
  const anyCommission = validLines.some((l) => {
    const p = productById.get(l.productId)
    return p != null && Number(p.commissionValue ?? 0) > 0
  })

  // Validação de estoque suficiente (avisos visuais)
  const stockWarnings = validLines.map((l) => {
    const p = productById.get(l.productId)
    if (!p || !p.trackStock) return null
    const qty = Number(l.quantity)
    if (qty > p.quantity) return { uid: l.uid, name: p.name, atual: p.quantity, pedido: qty }
    return null
  }).filter(Boolean) as Array<{ uid: string; name: string; atual: number; pedido: number }>

  // Valida e abre o modal de pagamento. O modal traz "Pagar depois" embutido
  // (onChoose(null)) → venda pendente, como era antes.
  function handleRegister() {
    setError(null)
    if (!cliente && !avulso) { setError('Selecione um cliente ou marque venda avulsa'); return }
    if (validLines.length === 0) { setError('Adicione pelo menos 1 produto'); return }
    if (stockWarnings.length > 0) {
      setError(`Estoque insuficiente: ${stockWarnings.map((w) => `${w.name} (atual ${w.atual}, pedido ${w.pedido})`).join('; ')}`)
      return
    }
    setShowPayModal(true)
  }

  async function save(method: PaymentMethodChoice, cardDetails?: CardPaymentDetails) {
    setShowPayModal(false)
    setSaving(true)
    const res = await fetch('/api/admin/sales', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        customer_id: avulso ? null : cliente?.id ?? null,
        client_name: avulso ? (avulsoName.trim() || 'Cliente avulso') : undefined,
        professional_id: profId || null,
        sale_date: saleDate,
        notes: notes.trim() || null,
        payment_method: method, // null = pagar depois (venda pendente)
        card: cardDetails ?? null, // taxa/maquininha quando cartão (flui pro líquido)
        items: validLines.map((l) => ({
          product_id: l.productId,
          quantity: Number(l.quantity),
          unit_price: Number(l.unitPrice || 0),
          discount: Number(l.discount || 0),
        })),
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erro ao salvar')
      return
    }
    const d = await res.json()
    setCreated({ total: d.total, itens: d.items_count, method })
  }

  const METHOD_LABEL: Record<NonNullable<PaymentMethodChoice>, string> = {
    pix: 'Pix', cash: 'Dinheiro', card: 'Cartão', points: 'Pontos',
  }

  function novaVenda() {
    setCliente(null)
    setAvulso(false)
    setAvulsoName('')
    setProfId(defaultProfId ?? '')
    setSaleDate(todayBR())
    setNotes('')
    setLines([newLine()])
    setError(null)
    setCreated(null)
    router.refresh()
  }

  if (created) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: '#fff',
            boxShadow: '0 12px 28px -8px rgba(5,150,105,0.45)',
          }}
        >
          <IconCheck size={28} />
        </div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--admin-text)' }}>
          Venda registrada!
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--admin-text-mute)' }}>
          {created.itens} produto{created.itens === 1 ? '' : 's'} · Total <span className="font-bold tabular-nums">{formatBRL(created.total)}</span> · {created.method ? `Recebido via ${METHOD_LABEL[created.method]}` : 'Pendente (pagar depois)'} · Estoque atualizado
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button type="button" onClick={novaVenda} className="px-5 py-3 rounded-xl text-sm font-bold" style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}>
            Nova venda
          </button>
          <Link href={produtosHref} className="px-5 py-3 rounded-xl text-sm font-bold" style={{
            background: 'linear-gradient(180deg, var(--brand-primary, #1AA9A8) 0%, color-mix(in srgb, var(--brand-primary, #1AA9A8) 70%, black) 100%)',
            color: '#fff',
            boxShadow: '0 8px 22px -8px color-mix(in srgb, var(--brand-primary, #1AA9A8) 55%, transparent)',
          }}>
            Ver produtos
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6 space-y-5">
      <header className="flex items-center gap-3">
        <Link href={produtosHref} aria-label="Voltar" className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[var(--admin-surface-hi)]" style={{ color: 'var(--admin-text-mute)' }}>
          <IconArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
            Estoque
          </p>
          <h1 className="text-2xl font-bold tracking-tight inline-flex items-center gap-2" style={{ color: 'var(--admin-text)' }}>
            <IconDollar size={22} /> Vender Produto
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
            Registra venda · baixa o estoque · recebe na hora ou deixa pra depois
          </p>
        </div>
      </header>

      {/* Cliente */}
      <section className="rounded-2xl p-4" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
        <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--admin-text-faded)' }}>
          <IconUser size={12} /> Cliente
        </label>
        {cliente ? (
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>{cliente.name}</p>
              <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>{cliente.phone}</p>
            </div>
            <button type="button" onClick={() => { setCliente(null); setShowClientPicker(true) }} className="text-xs underline" style={{ color: 'var(--admin-accent)' }}>trocar</button>
          </div>
        ) : avulso ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={avulsoName}
              onChange={(e) => setAvulsoName(e.target.value)}
              placeholder="Nome do cliente (opcional)"
              className="admin-input flex-1 px-3 py-2.5 rounded-xl text-sm"
            />
            <button type="button" onClick={() => { setAvulso(false); setAvulsoName('') }} className="text-xs underline whitespace-nowrap" style={{ color: 'var(--admin-accent)' }}>usar cadastro</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button type="button" onClick={() => setShowClientPicker(true)} className="w-full px-3 py-2.5 rounded-xl text-sm text-left" style={{
              background: 'var(--admin-input-bg)',
              border: '1px dashed var(--admin-border)',
              color: 'var(--admin-text-mute)',
            }}>
              Selecionar cliente
            </button>
            <button type="button" onClick={() => setAvulso(true)} className="w-full px-3 py-2.5 rounded-xl text-sm text-left" style={{
              background: 'var(--admin-input-bg)',
              border: '1px dashed var(--admin-border)',
              color: 'var(--admin-text-mute)',
            }}>
              Cliente avulso (balcão)
            </button>
          </div>
        )}
      </section>

      {/* Profissional + Data */}
      <section className="rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>{anyCommission ? 'Profissional (recebe comissão)' : 'Profissional (opcional)'}</label>
          <select value={profId} onChange={(e) => setProfId(e.target.value)} className="w-full px-3 py-2.5 pr-9 rounded-xl text-sm" style={selectStyle}>
            <option value="">Sem profissional</option>
            {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>Data da venda</label>
          <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="admin-input w-full px-3 py-2.5 rounded-xl text-sm" />
        </div>
      </section>

      {/* Produtos */}
      <section className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
          Produtos vendidos
        </p>
        {lines.map((line, idx) => {
          const product = productById.get(line.productId)
          const subtotal = Number(line.quantity || 0) * Number(line.unitPrice || 0) - Number(line.discount || 0)
          const stockWarn = stockWarnings.find((w) => w.uid === line.uid)
          return (
            <div
              key={line.uid}
              className="rounded-2xl p-3 space-y-2"
              style={{
                background: 'var(--admin-surface-hi)',
                border: stockWarn ? '1px solid #EF4444' : '1px solid var(--admin-border)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                  Item {idx + 1}
                </span>
                {lines.length > 1 && (
                  <button type="button" onClick={() => removeLine(line.uid)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ color: '#DC2626' }}>
                    <IconClose size={12} />
                  </button>
                )}
              </div>
              <select value={line.productId} onChange={(e) => pickProduct(line.uid, e.target.value)} className="w-full px-3 py-2.5 pr-9 rounded-xl text-sm" style={selectStyle}>
                <option value="">Selecionar produto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.variant ? ` · ${p.variant}` : ''} · {p.trackStock ? `${p.quantity} ${p.unit} em estoque` : 'sem controle'}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>Qtd</label>
                  <input type="number" min={0} step={0.01} value={line.quantity} onChange={(e) => updateLine(line.uid, { quantity: e.target.value })} className="admin-input w-full px-2.5 py-2 rounded-lg text-sm tabular-nums" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>Preço un.</label>
                  <input type="number" min={0} step={0.01} value={line.unitPrice} onChange={(e) => updateLine(line.uid, { unitPrice: e.target.value })} className="admin-input w-full px-2.5 py-2 rounded-lg text-sm tabular-nums" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>Desconto</label>
                  <input type="number" min={0} step={0.01} value={line.discount} onChange={(e) => updateLine(line.uid, { discount: e.target.value })} placeholder="0" className="admin-input w-full px-2.5 py-2 rounded-lg text-sm tabular-nums" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>Subtotal</label>
                  <p className="text-sm font-bold tabular-nums px-2.5 py-2" style={{ color: 'var(--admin-text)' }}>{formatBRL(Math.max(0, subtotal))}</p>
                </div>
              </div>
              {stockWarn && (
                <p className="text-[11px] font-semibold flex items-center gap-1" style={{ color: '#DC2626' }}>
                  ⚠ Estoque insuficiente · atual {stockWarn.atual}, pedido {stockWarn.pedido}
                </p>
              )}
            </div>
          )
        })}
        <button type="button" onClick={addLine} className="w-full py-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2" style={{
          background: 'color-mix(in srgb, var(--admin-accent) 8%, transparent)',
          border: '1px dashed color-mix(in srgb, var(--admin-accent) 50%, transparent)',
          color: 'var(--admin-accent)',
        }}>
          <IconPlus size={14} /> Adicionar mais um produto
        </button>
      </section>

      {/* Observação */}
      <section>
        <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>Observação (opcional)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="admin-input w-full px-3 py-2.5 rounded-xl text-sm resize-none" />
      </section>

      {/* Footer · total + ações */}
      <section className="rounded-2xl p-4 sticky bottom-3" style={{
        background: 'var(--admin-surface-hi)',
        border: '1px solid var(--admin-border)',
        boxShadow: '0 10px 28px -10px rgba(0,0,0,0.10)',
      }}>
        {error && (
          <div className="mb-3 text-xs font-semibold flex items-start gap-2" style={{ color: '#DC2626' }}>
            <span aria-hidden style={{ fontSize: 16 }}>⚠</span>{error}
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>Total da venda</p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>{formatBRL(total)}</p>
            {totalDiscount > 0 && <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>Desconto: {formatBRL(totalDiscount)}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Link href={produtosHref} className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'transparent', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}>
              Cancelar
            </Link>
            <button type="button" onClick={handleRegister} disabled={saving || validLines.length === 0 || (!cliente && !avulso)} className="px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40" style={{
              background: 'linear-gradient(180deg, var(--brand-primary, #1AA9A8) 0%, color-mix(in srgb, var(--brand-primary, #1AA9A8) 70%, black) 100%)',
              color: '#fff',
              borderTop: '1px solid rgba(255,255,255,0.25)',
              boxShadow: '0 8px 22px -8px color-mix(in srgb, var(--brand-primary, #1AA9A8) 55%, transparent)',
            }}>
              {saving ? 'Salvando...' : 'Registrar venda'}
            </button>
          </div>
        </div>
      </section>

      {/* Pagamento · recebe na hora (pix/dinheiro/cartão/pontos) ou "pagar depois" */}
      <PaymentMethodModal
        open={showPayModal}
        clientName={cliente?.name ?? (avulso ? (avulsoName.trim() || 'Cliente avulso') : 'Cliente')}
        totalPrice={total}
        businessId={businessId}
        loading={saving}
        deferLabel="Pagar depois"
        onChoose={(method, cardDetails) => save(method, cardDetails)}
        onClose={() => setShowPayModal(false)}
      />

      {/* Popup picker de cliente */}
      {showClientPicker && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 pt-20" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowClientPicker(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col" style={{
            background: 'var(--admin-popover-bg, #FFFFFF)',
            border: '1px solid var(--admin-popover-border, #E2E8F0)',
            maxHeight: '70vh',
          }}>
            <div className="flex items-center gap-2 p-3" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
              <IconSearch size={16} />
              <input type="text" autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente por nome ou telefone" className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--admin-text)' }} />
              <button type="button" onClick={() => setShowClientPicker(false)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ color: 'var(--admin-text-mute)' }}>
                <IconClose size={14} />
              </button>
            </div>
            <div className="overflow-y-auto">
              {searching && <p className="text-xs text-center py-4" style={{ color: 'var(--admin-text-mute)' }}>Buscando...</p>}
              {!searching && search.trim().length < 2 && <p className="text-xs text-center py-4" style={{ color: 'var(--admin-text-mute)' }}>Digite pelo menos 2 letras</p>}
              {!searching && results.length === 0 && search.trim().length >= 2 && <p className="text-xs text-center py-4" style={{ color: 'var(--admin-text-mute)' }}>Nenhum cliente encontrado</p>}
              {results.map((c) => (
                <button key={c.id} type="button" onClick={() => { setCliente(c); setShowClientPicker(false); setSearch(''); setResults([]) }} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--admin-surface-hi)]" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>{c.name}</p>
                    <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>{c.phone}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
