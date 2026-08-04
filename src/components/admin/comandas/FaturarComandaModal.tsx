'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname } from 'next/navigation'
import { IconClose, IconPlus, IconTrash, IconSearch } from '@/components/ui/Icon'
import PaymentMethodModal, { type PaymentMethodChoice, type CardPaymentDetails } from '@/components/admin/PaymentMethodModal'
import { getAreaPrefix, areaSemTelasInternas } from '@/lib/area-prefix'
import { createClient } from '@/lib/supabase/client'

type ServiceLite = { id: string; name: string; price: number | null; duration_minutes: number | null }
type ServiceCartLine = { service_id: string; service_name: string; unit_price: number; professional_id: string | null }

/**
 * FaturarComandaModal · cria uma comanda incluindo:
 *  - 1 atendimento (já existente · pré-pintado)
 *  - 0..N produtos avulsos (vendidos junto na mesma visita)
 *  - 1 pagamento (cash/pix/card/courtesy/points) OU deixa em aberto
 *
 * No POST /api/admin/invoices a API:
 *  - cria invoice + invoice_items
 *  - cria 1 sales+sale_items por produto (trigger v66 baixa estoque)
 *  - marca o appointment como completed+paid
 *  - cria invoice_payments se pagou
 */

type ProductLite = {
  id: string
  name: string
  variant: string | null
  unit: string
  quantity: number
  price: number | null
  track_stock: boolean
  sale_active: boolean
}

type CartLine = {
  product_id: string
  product_name: string
  unit: string
  quantity: number
  unit_price: number
  professional_id: string | null
  /** snapshot dos limites pra validação inline */
  available: number | null
  track_stock: boolean
}

type Props = {
  open: boolean
  appointmentId: string
  appointmentServiceName: string
  appointmentTotal: number
  appointmentProfessionalId: string | null
  customerName: string
  businessId: string
  /** v100b · libera editar o valor do serviço aqui. Fica com dono e recepção. */
  podeEditarValor?: boolean
  onClose: () => void
}

import { getApptCharged, type ChargedProduct } from '@/lib/queries/appointment-charged-total'

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Traduz códigos de erro da API pra linguagem do dono (nada de código cru
// tipo "invoice_already_paid" na tela · Rosy 19/06).
function friendlyError(d: { error?: string; detail?: string } | null | undefined): string {
  const code = d?.error
  const map: Record<string, string> = {
    invoice_already_paid: 'Esse atendimento já foi pago. Pra alterar, reabra a comanda em Comandas.',
    invoice_not_open: 'Essa comanda não está mais aberta.',
    insufficient_stock: 'Estoque insuficiente pra um dos produtos.',
    appointment_not_found: 'Atendimento não encontrado.',
  }
  return (code && map[code]) || d?.detail || d?.error || 'Erro ao faturar comanda'
}

const selectStyle: React.CSSProperties = {
  background: `var(--admin-input-bg) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>") no-repeat right 0.625rem center`,
  border: '1px solid var(--admin-border)',
  color: 'var(--admin-text)',
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
}

export default function FaturarComandaModal({
  open, appointmentId, appointmentServiceName, appointmentTotal, appointmentProfessionalId, podeEditarValor = false,
  customerName, businessId, onClose,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const areaPrefix = getAreaPrefix(pathname)
  /* Valor do serviço editável (v100b). Texto cru: o dono digita "450",
     "450,00" e "1.450,00". Converte só na hora de enviar. */
  const [valorServicoTexto, setValorServicoTexto] = useState('')
  useEffect(() => {
    // Prefill inclui o zero de propósito: negócio que fecha atendimento
    // sem valor (Viva Cacheada) não pode ser travado por causa disso.
    if (open) setValorServicoTexto(appointmentTotal > 0 ? String(appointmentTotal).replace('.', ',') : '0')
  }, [open, appointmentTotal])
  const valorServico = (() => {
    const limpo = valorServicoTexto.replace(/\./g, '').replace(',', '.').trim()
    if (!limpo) return 0
    const n = Number(limpo)
    return Number.isFinite(n) && n >= 0 ? n : 0
  })()
  const valorServicoEfetivo = podeEditarValor && appointmentTotal <= 0 ? valorServico : appointmentTotal
  /* Regra cravada por Eduardo em 04/08: serviço criado SEM valor fixo tem o
     preço definido na hora de fechar a comanda; serviço com valor já
     definido só é ajustado se o final ficou diferente. A página pública já
     mostra 'sob consulta' pra esses — aqui fecha o outro lado do fluxo.
     DN Diogo (instalação orçada por metragem) é o caso que originou. */
  const servicoSemValorFixo = appointmentTotal <= 0

  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => { setPortalReady(true) }, [])

  const [products, setProducts] = useState<ProductLite[]>([])
  const [canSellProducts, setCanSellProducts] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [cart, setCart] = useState<CartLine[]>([])
  // Produtos JÁ lançados na comanda (combo aplicado no agendamento, ou produto
  // vendido junto). Este modal nunca lia a comanda — mostrava só o serviço e
  // fechava conta de R$290 dizendo R$195 (Eduardo 22/07).
  const [jaNaComanda, setJaNaComanda] = useState<ChargedProduct[]>([])
  const [search, setSearch] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  // Serviços extra (cliente fez serviço a mais na hora · Olímpio 06/06)
  const supabase = useMemo(() => createClient(), [])
  const [services, setServices] = useState<ServiceLite[]>([])
  const [serviceCart, setServiceCart] = useState<ServiceCartLine[]>([])
  const [svcPickerOpen, setSvcPickerOpen] = useState(false)
  const [svcSearch, setSvcSearch] = useState('')

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    setLoadingProducts(true)
    fetch('/api/admin/products')
      .then((r) => r.json())
      .then((d) => {
        setCanSellProducts(d.canSellProducts === true)
        const list: ProductLite[] = (d.products ?? [])
          .filter((p: ProductLite) => p.sale_active !== false)
          .map((p: ProductLite) => ({
            id: p.id, name: p.name, variant: p.variant ?? null, unit: p.unit ?? 'un',
            quantity: Number(p.quantity ?? 0), price: p.price == null ? null : Number(p.price),
            track_stock: p.track_stock !== false, sale_active: p.sale_active !== false,
          }))
        setProducts(list)
      })
      .finally(() => setLoadingProducts(false))
  }, [open])

  // Produtos que já estão na comanda deste atendimento · sem isso o total
  // exibido fica menor que o cobrado e o caixa não fecha.
  useEffect(() => {
    if (!open || !appointmentId) return
    let cancelled = false
    ;(async () => {
      setJaNaComanda([])
      const charged = await getApptCharged(supabase, appointmentId)
      if (!cancelled) setJaNaComanda(charged?.produtos ?? [])
    })()
    return () => { cancelled = true }
  }, [open, appointmentId, supabase])

  // Carrega serviços do negócio (pro picker de serviço extra)
  useEffect(() => {
    if (!open) return
    supabase
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('business_id', businessId)
      .eq('active', true)
      .order('name')
      .then(({ data }) => setServices((data ?? []) as ServiceLite[]))
  }, [open, businessId, supabase])

  const subtotalProds = useMemo(() => cart.reduce((s, l) => s + l.quantity * l.unit_price, 0), [cart])
  const subtotalServices = useMemo(() => serviceCart.reduce((s, l) => s + l.unit_price, 0), [serviceCart])
  // Já lançado na comanda entra no total · é o que a cliente paga.
  const subtotalJaNaComanda = useMemo(() => jaNaComanda.reduce((s, p) => s + p.total, 0), [jaNaComanda])
  const total = valorServicoEfetivo + subtotalJaNaComanda + subtotalProds + subtotalServices

  const svcDisponiveis = useMemo(() => {
    const q = svcSearch.trim().toLowerCase()
    const list = q ? services.filter((s) => s.name.toLowerCase().includes(q)) : services
    return list.slice(0, 30)
  }, [services, svcSearch])

  function addService(s: ServiceLite) {
    setServiceCart((prev) => [...prev, {
      service_id: s.id,
      service_name: s.name,
      unit_price: s.price ?? 0,
      professional_id: appointmentProfessionalId,
    }])
    setSvcSearch('')
    setSvcPickerOpen(false)
  }
  function updateSvcLine(idx: number, patch: Partial<ServiceCartLine>) {
    setServiceCart((prev) => prev.map((l, i) => i === idx ? { ...l, ...patch } : l))
  }
  function removeSvcLine(idx: number) {
    setServiceCart((prev) => prev.filter((_, i) => i !== idx))
  }

  const disponiveis = useMemo(() => {
    const usedIds = new Set(cart.map((l) => l.product_id))
    const free = products.filter((p) => !usedIds.has(p.id))
    const q = search.trim().toLowerCase()
    if (!q) return free.slice(0, 30)
    return free.filter((p) => p.name.toLowerCase().includes(q) || (p.variant ?? '').toLowerCase().includes(q)).slice(0, 30)
  }, [products, cart, search])

  function addProduct(p: ProductLite) {
    setCart((prev) => [...prev, {
      product_id: p.id,
      product_name: p.variant ? `${p.name} · ${p.variant}` : p.name,
      unit: p.unit,
      quantity: 1,
      unit_price: p.price ?? 0,
      professional_id: appointmentProfessionalId,
      available: p.track_stock ? p.quantity : null,
      track_stock: p.track_stock,
    }])
    setSearch('')
    setPickerOpen(false)
  }

  function updateLine(idx: number, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l, i) => i === idx ? { ...l, ...patch } : l))
  }
  function removeLine(idx: number) {
    setCart((prev) => prev.filter((_, i) => i !== idx))
  }

  function validateBeforeSubmit(): string | null {
    for (const l of cart) {
      if (!Number.isFinite(l.quantity) || l.quantity <= 0) return `Quantidade inválida em ${l.product_name}`
      if (!Number.isFinite(l.unit_price) || l.unit_price < 0) return `Preço inválido em ${l.product_name}`
      if (l.track_stock && l.available !== null && l.quantity > l.available) {
        return `${l.product_name}: pediu ${l.quantity} mas só tem ${l.available} em estoque`
      }
    }
    return null
  }

  async function submitInvoice(payment: PaymentMethodChoice | 'leave_open', cardDetails?: CardPaymentDetails) {
    const v = validateBeforeSubmit()
    if (v) { setError(v); return }
    setError(null)
    setSubmitting(true)

    const body: Record<string, unknown> = {
      appointmentIds: [appointmentId],
      // Rota ignora quando igual ao atual; grava antes de montar os itens.
      ...(podeEditarValor && servicoSemValorFixo ? { appointmentTotals: { [appointmentId]: valorServicoEfetivo } } : {}),
      productSales: cart.map((l) => ({
        product_id: l.product_id,
        product_name: l.product_name,
        quantity: l.quantity,
        unit_price: l.unit_price,
        professional_id: l.professional_id,
      })),
      extraServices: serviceCart.map((l) => ({
        service_id: l.service_id,
        unit_price: l.unit_price,
        quantity: 1,
        professional_id: l.professional_id,
      })),
    }
    if (payment !== 'leave_open' && payment !== null) {
      const pay: Record<string, unknown> = { method: payment }
      if (payment === 'card' && cardDetails) {
        pay.device_id = cardDetails.device_id
        pay.card_brand = cardDetails.card_brand
        pay.card_type = cardDetails.card_type
        pay.fee_percent = cardDetails.fee_percent
        pay.installments = cardDetails.installments
      }
      body.payment = pay
    }

    const r = await fetch('/api/admin/invoices', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSubmitting(false)
    setPaymentOpen(false)
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      setError(friendlyError(d))
      return
    }
    const d = await r.json()
    const invoiceId = d?.invoice?.id
    onClose()
    // A área da profissional não tem tela de comandas — mandar ela pra
    // /admin/comandas/[id] fazia o layout do admin chutar quem não é dona pra
    // /cadastro ("cadastre seu negócio em 2 minutos"), com o pagamento já
    // gravado (bug 30/07). Aqui ela fica na própria agenda, que atualiza.
    if (invoiceId && !areaSemTelasInternas(areaPrefix)) {
      router.push(`${areaPrefix}/comandas/${invoiceId}`)
    } else {
      router.refresh()
    }
  }

  function openPagamento() {
    const v = validateBeforeSubmit()
    if (v) { setError(v); return }
    setError(null)
    setPaymentOpen(true)
  }

  if (!portalReady || !open) return null

  return createPortal(
    <>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
          style={{
            background: 'var(--admin-popover-bg, #FFFFFF)',
            border: '1px solid var(--admin-popover-border, #E2E8F0)',
            boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
            maxHeight: '92vh',
          }}
        >
          {/* Header */}
          <header className="flex items-start justify-between p-5 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--admin-text-faded)' }}>
                Faturar
              </p>
              <h3 className="text-lg font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>
                Comanda · {customerName}
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
                Adicione produtos ou serviços feitos na hora antes de finalizar
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--admin-input-bg)]"
              style={{ color: 'var(--admin-text-mute)' }}
              aria-label="Fechar"
            >
              <IconClose size={16} />
            </button>
          </header>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Linha do atendimento · fixa */}
            <div className="rounded-xl p-3" style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                    {servicoSemValorFixo ? 'Serviço · valor a definir' : 'Serviço'}
                  </p>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>{appointmentServiceName}</p>
                </div>
                {podeEditarValor && servicoSemValorFixo ? (
                  /* Valor definido na hora do atendimento (DN Diogo: instalação
                     orçada por metragem; salão: cabelo que pediu mais produto).
                     Mesmo campo em mobile e desktop — a necessidade é a mesma. */
                  <div className="relative flex-shrink-0" style={{ width: 118 }}>
                    <span
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold pointer-events-none"
                      style={{ color: 'var(--admin-text-faded)' }}
                    >
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={valorServicoTexto}
                      onChange={(e) => setValorServicoTexto(e.target.value.replace(/[^\d.,]/g, ''))}
                      placeholder="0,00"
                      aria-label="Valor do serviço"
                      className="admin-input w-full text-sm font-bold tabular-nums text-right py-1.5 pl-8 pr-2.5"
                      style={servicoSemValorFixo ? { borderColor: '#F59E0B', boxShadow: '0 0 0 3px rgba(245,158,11,0.12)' } : undefined}
                    />
                  </div>
                ) : (
                  <p className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: 'var(--admin-text)' }}>
                    {brl(appointmentTotal)}
                  </p>
                )}
              </div>
              {podeEditarValor && servicoSemValorFixo && (
                <p className="text-[11px] mt-2" style={{ color: 'var(--admin-text-faded)' }}>
                  {valorServicoEfetivo <= 0
                    ? '⚠ Sem valor, este atendimento não entra no seu faturamento nem gera comissão.'
                    : servicoSemValorFixo
                      ? 'Serviço sem preço fixo — o valor é o que você cobrou neste atendimento.'
                      : 'Ajuste se o valor final ficou diferente do combinado.'}
                </p>
              )}
            </div>

            {/* JÁ na comanda · veio do combo aplicado no agendamento ou de
                produto vendido junto. Não dá pra remover aqui (já está
                lançado e o estoque já baixou) — pra mexer, abre a comanda. */}
            {jaNaComanda.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                  Já lançado nesta comanda
                </p>
                {jaNaComanda.map((p, idx) => (
                  <div
                    key={`ja-${idx}`}
                    className="rounded-xl p-3 flex items-center justify-between gap-3"
                    style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}
                  >
                    <p className="text-sm font-semibold truncate min-w-0" style={{ color: 'var(--admin-text)' }}>
                      {p.quantity !== 1 && (
                        <span className="tabular-nums" style={{ color: 'var(--admin-accent)' }}>
                          {p.quantity.toLocaleString('pt-BR')}× </span>
                      )}
                      {p.description}
                    </p>
                    <p className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: 'var(--admin-text)' }}>
                      {brl(p.total)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Produtos no carrinho · só plano Equipe */}
            {canSellProducts && cart.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                  Produtos vendidos
                </p>
                {cart.map((line, idx) => (
                  <div
                    key={`${line.product_id}-${idx}`}
                    className="rounded-xl p-3 grid grid-cols-[1fr_70px_100px_32px] gap-2 items-center"
                    style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>{line.product_name}</p>
                      {line.track_stock && line.available !== null && (
                        <p className="text-[11px]" style={{ color: line.quantity > line.available ? '#DC2626' : 'var(--admin-text-mute)' }}>
                          Estoque: {line.available} {line.unit}{line.quantity > line.available ? ' · insuficiente' : ''}
                        </p>
                      )}
                    </div>
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })}
                      className="admin-input px-2 py-1.5 rounded-lg text-sm text-center tabular-nums"
                      aria-label={`Quantidade ${line.product_name}`}
                    />
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.unit_price}
                      onChange={(e) => updateLine(idx, { unit_price: Number(e.target.value) })}
                      className="admin-input px-2 py-1.5 rounded-lg text-sm text-right tabular-nums"
                      aria-label={`Preço unitário ${line.product_name}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="w-7 h-7 rounded-full flex items-center justify-center mx-auto"
                      style={{ color: '#DC2626' }}
                      aria-label={`Remover ${line.product_name}`}
                    >
                      <IconTrash size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Picker de produto · exclusivo do plano Equipe */}
            {canSellProducts && (
            <div
              className="rounded-2xl p-3 space-y-2"
              style={{ background: 'color-mix(in srgb, var(--admin-accent) 6%, transparent)', border: '1px dashed color-mix(in srgb, var(--admin-accent) 40%, transparent)' }}
            >
              {!pickerOpen ? (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2"
                  style={{ background: 'var(--admin-accent)', color: '#fff' }}
                >
                  <IconPlus size={14} /> Adicionar produto
                </button>
              ) : (
                <>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--admin-text-faded)' }}>
                      <IconSearch size={14} />
                    </span>
                    <input
                      autoFocus
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar produto por nome..."
                      className="admin-input w-full pl-9 pr-3 py-2 rounded-xl text-sm"
                    />
                  </div>
                  {loadingProducts ? (
                    <p className="text-xs text-center py-3" style={{ color: 'var(--admin-text-mute)' }}>Carregando produtos...</p>
                  ) : disponiveis.length === 0 ? (
                    <p className="text-xs text-center py-3" style={{ color: 'var(--admin-text-mute)' }}>
                      {search ? 'Nenhum produto bate com a busca' : 'Cadastre produtos em Produtos pra usar aqui'}
                    </p>
                  ) : (
                    <ul className="space-y-1 max-h-56 overflow-y-auto">
                      {disponiveis.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => addProduct(p)}
                            className="w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-3 hover:bg-[color-mix(in_srgb,var(--admin-accent)_10%,transparent)]"
                            style={{ background: 'var(--admin-surface)' }}
                          >
                            <span className="min-w-0">
                              <span className="text-sm font-semibold block truncate" style={{ color: 'var(--admin-text)' }}>
                                {p.name}{p.variant ? <span style={{ color: 'var(--admin-text-mute)' }}> · {p.variant}</span> : null}
                              </span>
                              <span className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
                                {p.track_stock ? `${p.quantity} ${p.unit} em estoque` : 'Sem controle de estoque'}
                              </span>
                            </span>
                            <span className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: 'var(--admin-text)' }}>
                              {p.price != null ? brl(p.price) : '—'}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => setPickerOpen(false)}
                    className="text-xs underline"
                    style={{ color: 'var(--admin-text-mute)' }}
                  >
                    fechar busca
                  </button>
                </>
              )}
            </div>
            )}

            {/* Serviços extra no carrinho */}
            {serviceCart.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                  Serviços extra
                </p>
                {serviceCart.map((line, idx) => (
                  <div
                    key={`${line.service_id}-${idx}`}
                    className="rounded-xl p-3 grid grid-cols-[1fr_100px_32px] gap-2 items-center"
                    style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}
                  >
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>{line.service_name}</p>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.unit_price}
                      onChange={(e) => updateSvcLine(idx, { unit_price: Number(e.target.value) })}
                      className="admin-input px-2 py-1.5 rounded-lg text-sm text-right tabular-nums"
                      aria-label={`Preço ${line.service_name}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeSvcLine(idx)}
                      className="w-7 h-7 rounded-full flex items-center justify-center mx-auto"
                      style={{ color: '#DC2626' }}
                      aria-label={`Remover ${line.service_name}`}
                    >
                      <IconTrash size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Picker de serviço extra */}
            <div
              className="rounded-2xl p-3 space-y-2"
              style={{ background: 'color-mix(in srgb, var(--admin-accent) 6%, transparent)', border: '1px dashed color-mix(in srgb, var(--admin-accent) 40%, transparent)' }}
            >
              {!svcPickerOpen ? (
                <button
                  type="button"
                  onClick={() => setSvcPickerOpen(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2"
                  style={{ background: 'var(--admin-surface)', color: 'var(--admin-accent)', border: '1px solid var(--admin-accent-border)' }}
                >
                  <IconPlus size={14} /> Adicionar serviço
                </button>
              ) : (
                <>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--admin-text-faded)' }}>
                      <IconSearch size={14} />
                    </span>
                    <input
                      autoFocus
                      type="search"
                      value={svcSearch}
                      onChange={(e) => setSvcSearch(e.target.value)}
                      placeholder="Buscar serviço por nome..."
                      className="admin-input w-full pl-9 pr-3 py-2 rounded-xl text-sm"
                    />
                  </div>
                  {svcDisponiveis.length === 0 ? (
                    <p className="text-xs text-center py-3" style={{ color: 'var(--admin-text-mute)' }}>
                      {svcSearch ? 'Nenhum serviço bate com a busca' : 'Sem serviços cadastrados'}
                    </p>
                  ) : (
                    <ul className="space-y-1 max-h-56 overflow-y-auto">
                      {svcDisponiveis.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => addService(s)}
                            className="w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-3 hover:bg-[color-mix(in_srgb,var(--admin-accent)_10%,transparent)]"
                            style={{ background: 'var(--admin-surface)' }}
                          >
                            <span className="text-sm font-semibold block truncate" style={{ color: 'var(--admin-text)' }}>{s.name}</span>
                            <span className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: 'var(--admin-text)' }}>
                              {s.price != null ? brl(s.price) : '—'}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => setSvcPickerOpen(false)}
                    className="text-xs underline"
                    style={{ color: 'var(--admin-text-mute)' }}
                  >
                    fechar busca
                  </button>
                </>
              )}
            </div>

            {error && (
              <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}>
                {error}
              </div>
            )}
          </div>

          {/* Footer · totais + ações */}
          <footer className="flex-shrink-0 border-t px-5 py-4 space-y-3" style={{ borderColor: 'var(--admin-divider)', background: 'var(--admin-surface)' }}>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>Total</p>
                <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>{brl(total)}</p>
              </div>
              {(cart.length > 0 || serviceCart.length > 0) && (
                <p className="text-xs text-right" style={{ color: 'var(--admin-text-mute)' }}>
                  Serviço {brl(appointmentTotal)}
                  {serviceCart.length > 0 && ` + Extra ${brl(subtotalServices)}`}
                  {cart.length > 0 && ` + Produtos ${brl(subtotalProds)}`}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => submitInvoice('leave_open')}
                className="py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background: 'var(--admin-surface)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)' }}
              >
                {submitting ? 'Salvando...' : 'Salvar em aberto'}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={openPagamento}
                className="py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{
                  background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
                  color: '#fff',
                  borderTop: '1px solid rgba(255,255,255,0.25)',
                  boxShadow: '0 10px 24px -8px rgba(5,150,105,0.50)',
                }}
              >
                Receber pagamento
              </button>
            </div>
          </footer>
        </div>
      </div>

      <PaymentMethodModal
        open={paymentOpen}
        clientName={customerName}
        totalPrice={total}
        businessId={businessId}
        loading={submitting}
        onChoose={(method, card) => {
          if (method === null) { setPaymentOpen(false); return }
          submitInvoice(method, card)
        }}
        onClose={() => setPaymentOpen(false)}
      />
    </>,
    document.body,
  )
}
