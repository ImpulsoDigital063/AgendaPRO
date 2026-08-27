'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import {
  IconGift, IconPlus, IconCopy, IconCheck, IconSearch, IconClose, IconCalendar, IconEye, IconUser, IconTrash, IconClock,
} from '@/components/ui/Icon'
import { createClient } from '@/lib/supabase/client'
import CartaoPresenteVisual, { type CartaoPresenteVisualData } from './CartaoPresenteVisual'

// ── Tipos (espelham o schema v104) ────────────────────────────────
type GiftCardServiceRow = {
  id: string
  service_id: string
  service_name: string
  sessions_total: number
  sessions_used: number
}

export type GiftCardRow = {
  id: string
  code: string
  mode: 'services' | 'value'
  buyer_name: string | null
  recipient_name: string
  recipient_customer_id: string | null
  price_paid: number
  value_total: number | null
  value_used: number
  status: 'active' | 'expired' | 'used_up' | 'cancelled'
  expires_at: string | null
  created_at: string
  sold_by_name?: string | null
  sold_by_role?: 'admin' | 'reception' | null
  gift_card_services: GiftCardServiceRow[] | null
}

type Service = { id: string; name: string; price: number | null }
type Customer = { id: string; name: string; phone: string | null }
type Professional = { id: string; name: string }

// Vales com data de envio agendada, prontos pra disparar (send_on <= hoje+3, sent_at null)
export type PendingSendRow = {
  id: string
  code: string
  recipient_name: string
  buyer_name: string | null
  recipient_phone: string | null
  buyer_phone: string | null
  gift_message: string | null
  send_on: string
  expires_at: string | null
  gift_card_services: { service_name: string; sessions_total: number }[] | null
}

type Props = {
  initialGiftCards: GiftCardRow[]
  services: Service[]
  customers: Customer[]
  professionals: Professional[]
  businessName: string
  /** v140 · marca do salão no cartão (logo + cores). */
  brandLogoUrl?: string | null
  brandPrimary?: string | null
  brandSecondary?: string | null
  pendingSends?: PendingSendRow[]
}

// Mapeia um vale já carregado para os dados da peça visual
function cardToVisual(card: GiftCardRow, businessName: string, marca: Marca): CartaoPresenteVisualData {
  return {
    code: card.code,
    recipientName: card.recipient_name,
    buyerName: card.buyer_name,
    mode: card.mode,
    services: (card.gift_card_services ?? []).map((gs) => ({
      service_name: gs.service_name,
      sessions_total: gs.sessions_total,
    })),
    valueTotal: card.value_total,
    expiresAt: card.expires_at,
    businessName,
    ...marca,
  }
}

type ValidityKind = 'none' | 'days' | 'weeks' | 'months' | 'years'

function brl(n: number) {
  return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function statusLabel(s: GiftCardRow['status']): { text: string; color: string; bg: string } {
  switch (s) {
    case 'active': return { text: 'Ativo', color: '#059669', bg: 'rgba(16,185,129,0.12)' }
    case 'used_up': return { text: 'Esgotado', color: 'var(--admin-text-faded)', bg: 'var(--admin-input-bg)' }
    case 'expired': return { text: 'Vencido', color: '#DC2626', bg: 'rgba(239,68,68,0.10)' }
    case 'cancelled': return { text: 'Cancelado', color: 'var(--admin-text-faded)', bg: 'var(--admin-input-bg)' }
    default: return { text: s, color: 'var(--admin-text-mute)', bg: 'var(--admin-input-bg)' }
  }
}

function servicesBalance(card: GiftCardRow): number {
  return (card.gift_card_services ?? []).reduce((s, r) => s + Math.max(0, r.sessions_total - r.sessions_used), 0)
}

// ── Componente principal ──────────────────────────────────────────
// Mapeia um vale pendente de envio pros dados da peça visual
function pendingToVisual(p: PendingSendRow, businessName: string, marca: Marca): CartaoPresenteVisualData {
  return {
    code: p.code,
    recipientName: p.recipient_name,
    buyerName: p.buyer_name,
    mode: 'services',
    services: (p.gift_card_services ?? []).map((gs) => ({
      service_name: gs.service_name,
      sessions_total: gs.sessions_total,
    })),
    valueTotal: null,
    expiresAt: p.expires_at,
    businessName,
    ...marca,
    giftMessage: p.gift_message,
    recipientPhone: p.recipient_phone,
    buyerPhone: p.buyer_phone,
  }
}

function formatDateShort(iso?: string | null) {
  if (!iso) return ''
  // send_on é DATE (YYYY-MM-DD) — evita fuso interpretando como local puro
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR')
}

type Marca = {
  brandLogoUrl?: string | null
  brandPrimary?: string | null
  brandSecondary?: string | null
}

export default function CartaoPresenteView({ initialGiftCards, services, customers, professionals, businessName, pendingSends, brandLogoUrl, brandPrimary, brandSecondary }: Props) {
  const marca: Marca = { brandLogoUrl, brandPrimary, brandSecondary }
  const router = useRouter()

  // Marca sent_at ao enviar (RLS libera recep + owner) e recarrega — some do lembrete
  async function markSent(giftCardId: string) {
    try {
      const sb = createClient()
      await sb.from('gift_cards').update({ sent_at: new Date().toISOString() }).eq('id', giftCardId)
    } catch { /* falha silenciosa — próximo refresh mantém no lembrete */ }
    router.refresh()
  }

  // Modal "Ver cartão" de um vale pendente (carrega onSent que marca como enviado)
  const [viewPending, setViewPending] = useState<{ data: CartaoPresenteVisualData; id: string } | null>(null)

  // ── EMITIR (form) · cartão-presente é SÓ modo 'services' (modo 'value' removido do produto) ──
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [recipientCustomerId, setRecipientCustomerId] = useState<string | null>(null)
  const [showCustomerList, setShowCustomerList] = useState(false)
  const [serviceQty, setServiceQty] = useState<Record<string, number>>({})
  const [pricePaid, setPricePaid] = useState('')
  const [validityKind, setValidityKind] = useState<ValidityKind>('none')
  const [validityValue, setValidityValue] = useState('')
  const [giftMessage, setGiftMessage] = useState('')
  const [sendOn, setSendOn] = useState('')
  // Forma de pagamento no ato: '' = deixa a comanda aberta (paga depois em Comandas)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [issuing, setIssuing] = useState(false)
  const [issueError, setIssueError] = useState<string | null>(null)
  // Resultado do recebimento no ato: null = não tentou; true = pago; string = falhou (msg)
  const [issuedPaid, setIssuedPaid] = useState<boolean | null>(null)
  const [issuePayError, setIssuePayError] = useState<string | null>(null)
  const [issuedCode, setIssuedCode] = useState<string | null>(null)
  const [issuedGiftCardId, setIssuedGiftCardId] = useState<string | null>(null)
  const [issuedVisual, setIssuedVisual] = useState<CartaoPresenteVisualData | null>(null)
  const [viewCard, setViewCard] = useState<CartaoPresenteVisualData | null>(null)
  const [copied, setCopied] = useState(false)

  const customerMatches = useMemo(() => {
    const q = recipientName.trim().toLowerCase()
    if (!q || recipientCustomerId) return []
    return customers.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6)
  }, [recipientName, recipientCustomerId, customers])

  const servicesSum = useMemo(() => {
    return services.reduce((sum, s) => {
      const q = serviceQty[s.id] ?? 0
      return sum + q * Number(s.price ?? 0)
    }, 0)
  }, [serviceQty, services])

  // Serviços já adicionados ao vale (qty > 0), na ordem do catálogo
  const addedServices = useMemo(
    () => services.filter((s) => (serviceQty[s.id] ?? 0) > 0),
    [services, serviceQty],
  )
  // Serviços ainda disponíveis pro dropdown "Adicionar serviço"
  const availableServices = useMemo(
    () => services.filter((s) => (serviceQty[s.id] ?? 0) === 0),
    [services, serviceQty],
  )

  function setQty(id: string, delta: number) {
    setServiceQty((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + delta)
      return { ...prev, [id]: next }
    })
  }

  // Escolher no seletor já adiciona (qty 1) — sem clique extra. O próprio select
  // reseta pra '' e vira "adicionar outro serviço".
  function addService(id: string) {
    if (!id) return
    setServiceQty((prev) => ({ ...prev, [id]: (prev[id] ?? 0) || 1 }))
  }

  function removeService(id: string) {
    setServiceQty((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function resetForm() {
    setBuyerName(''); setBuyerPhone(''); setRecipientName(''); setRecipientPhone(''); setRecipientCustomerId(null)
    setServiceQty({}); setPricePaid(''); setValidityKind('none'); setValidityValue('')
    setGiftMessage(''); setSendOn(''); setPaymentMethod('')
  }

  // Mapeia a escolha do seletor pro payload da rota de pagamento (mesma da tela
  // de Comandas). Cartão manda card_type — a rota aplica a taxa padrão sozinha.
  function paymentPayload(pm: string): { method: string; card_type?: string } | null {
    switch (pm) {
      case 'cash': return { method: 'cash' }
      case 'pix': return { method: 'pix' }
      case 'card_credit': return { method: 'card', card_type: 'credit' }
      case 'card_debit': return { method: 'card', card_type: 'debit' }
      default: return null
    }
  }

  async function handleIssue() {
    setIssueError(null)
    setIssuedCode(null)
    setIssuedPaid(null)
    setIssuePayError(null)
    if (!recipientName.trim()) { setIssueError('Informe o nome da presenteada'); return }

    const body: Record<string, unknown> = {
      mode: 'services',
      buyer_name: buyerName.trim() || undefined,
      buyer_phone: buyerPhone.trim() || undefined,
      recipient_name: recipientName.trim(),
      recipient_phone: recipientPhone.trim() || undefined,
      recipient_customer_id: recipientCustomerId || undefined,
      validity_kind: validityKind,
      validity_value: validityKind !== 'none' ? Number(validityValue) || undefined : undefined,
      gift_message: giftMessage.trim() || undefined,
      send_on: sendOn || undefined,
    }
    if (pricePaid.trim() !== '') body.price_paid = Number(pricePaid)

    const chosen = services
      .filter((s) => (serviceQty[s.id] ?? 0) > 0)
      .map((s) => ({ service_id: s.id, quantity: serviceQty[s.id] }))
    if (chosen.length === 0) { setIssueError('Escolha ao menos um serviço'); return }
    body.services = chosen

    setIssuing(true)
    const r = await fetch('/api/admin/gift-cards/issue', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    setIssuing(false)
    const j = await r.json().catch(() => ({}))
    if (!r.ok || !j.ok) {
      setIssueError(j.error ?? 'Erro ao emitir o vale')
      return
    }
    setIssuedCode(j.code)
    setIssuedGiftCardId((j.gift_card_id as string | undefined) ?? null)

    // Recebe no ato (se escolheu forma de pagamento) reusando a rota de caixa.
    // A comanda foi criada aberta pela emissão; aqui ela é paga e fecha o caixa.
    // Se falhar, o vale continua válido e a comanda fica aberta pra fechar em Comandas.
    const pay = paymentPayload(paymentMethod)
    if (pay && j.invoice_id) {
      try {
        const pr = await fetch(`/api/admin/invoices/${j.invoice_id}/pay`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(pay),
        })
        const pj = await pr.json().catch(() => ({}))
        if (pr.ok && pj.ok) {
          setIssuedPaid(true)
        } else {
          setIssuedPaid(false)
          setIssuePayError(pj.error ?? 'Vale emitido, mas o pagamento não confirmou — feche a comanda na tela de Comandas.')
        }
      } catch {
        setIssuedPaid(false)
        setIssuePayError('Vale emitido, mas o pagamento não confirmou — feche a comanda na tela de Comandas.')
      }
    }

    // Snapshot dos dados do form pra montar a peça visual (form é resetado a seguir)
    const chosenServices = services
      .filter((s) => (serviceQty[s.id] ?? 0) > 0)
      .map((s) => ({ service_name: s.name, sessions_total: serviceQty[s.id] }))
    setIssuedVisual({
      code: j.code,
      recipientName: recipientName.trim(),
      buyerName: buyerName.trim() || null,
      mode: 'services',
      services: chosenServices,
      valueTotal: null,
      expiresAt: (j.expires_at as string | undefined) ?? null,
      businessName,
    ...marca,
      giftMessage: giftMessage.trim() || null,
      recipientPhone: recipientPhone.trim() || null,
      buyerPhone: buyerPhone.trim() || null,
    })

    resetForm()
    router.refresh()
  }

  async function copyCode() {
    if (!issuedCode) return
    try {
      await navigator.clipboard.writeText(issuedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard bloqueado */ }
  }

  return (
    <div className="space-y-6">
      {/* ══ SEÇÃO A · EMITIR ══ */}
      <section className="admin-card rounded-2xl p-5" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex w-9 h-9 rounded-xl items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--admin-accent) 14%, transparent)', color: 'var(--admin-accent)' }}>
            <IconGift size={18} />
          </span>
          <div>
            <h2 className="font-bold text-base leading-tight" style={{ color: 'var(--admin-text)' }}>Emitir cartão presente</h2>
            <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>Gera o código que vai impresso no cartão</p>
          </div>
        </div>

        {/* Código emitido em destaque */}
        {issuedCode && (
          <div className="rounded-2xl p-5 mb-4 text-center"
            style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--admin-accent) 12%, transparent) 0%, color-mix(in srgb, var(--admin-accent) 4%, transparent) 100%)', border: '1px solid color-mix(in srgb, var(--admin-accent) 30%, transparent)' }}>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--admin-accent)' }}>Vale emitido · código</p>
            <div className="flex items-center justify-center gap-3">
              <span className="font-black tabular-nums tracking-[0.15em]" style={{ fontSize: '2.2rem', color: 'var(--admin-text)' }}>
                {issuedCode}
              </span>
              <button type="button" onClick={copyCode}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', color: copied ? '#059669' : 'var(--admin-accent)' }}>
                {copied ? <><IconCheck size={14} /> Copiado</> : <><IconCopy size={14} /> Copiar</>}
              </button>
            </div>
            {issuedPaid === true ? (
              <p className="text-[11px] mt-2 font-semibold inline-flex items-center gap-1 justify-center" style={{ color: '#059669' }}>
                <IconCheck size={12} /> Pago · valor no caixa. Escreva o código no cartão-presente físico.
              </p>
            ) : issuedPaid === false ? (
              <p className="text-[11px] mt-2 font-semibold" style={{ color: '#DC2626' }}>
                {issuePayError ?? 'Vale emitido, mas o pagamento não confirmou — feche a comanda na tela de Comandas.'}
              </p>
            ) : (
              <p className="text-[11px] mt-2" style={{ color: 'var(--admin-text-mute)' }}>
                Escreva esse código no cartão-presente físico. Feche a comanda gerada na tela de Comandas pra o valor entrar no caixa.
              </p>
            )}
          </div>
        )}

        {/* Peça visual do presente — pronta pra imprimir/baixar */}
        {issuedVisual && (
          <div className="rounded-2xl p-5 mb-4"
            style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-3 text-center" style={{ color: 'var(--admin-accent)' }}>
              Cartão-presente pronto
            </p>
            <CartaoPresenteVisual {...issuedVisual} onSent={issuedGiftCardId ? () => markSent(issuedGiftCardId) : undefined} />
          </div>
        )}

        {/* Comprador */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="admin-label">Comprador (opcional)</label>
            <input value={buyerName} onChange={(e) => setBuyerName(e.target.value)}
              placeholder="Quem está presenteando"
              className="admin-input w-full px-3 py-2.5 rounded-xl text-sm" />
          </div>
          <div>
            <label className="admin-label">Telefone do comprador (opcional)</label>
            <input value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)}
              placeholder="(00) 00000-0000"
              className="admin-input w-full px-3 py-2.5 rounded-xl text-sm" />
          </div>
        </div>

        {/* Presenteada */}
        <div className="mb-4 relative">
          <label className="admin-label">Presenteada (obrigatório)</label>
          <input
            value={recipientName}
            onChange={(e) => { setRecipientName(e.target.value); setRecipientCustomerId(null); setShowCustomerList(true) }}
            onFocus={() => setShowCustomerList(true)}
            placeholder="Nome de quem vai usar o vale"
            className="admin-input w-full px-3 py-2.5 rounded-xl text-sm" />
          {recipientCustomerId && (
            <p className="text-[11px] mt-1 inline-flex items-center gap-1" style={{ color: '#059669' }}>
              <IconCheck size={12} /> Cliente existente selecionada
            </p>
          )}
          {!recipientCustomerId && recipientName.trim() && (
            <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-mute)' }}>
              Novo nome — a presenteada será cadastrada como cliente ao resgatar.
            </p>
          )}
          {showCustomerList && customerMatches.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl overflow-hidden max-h-52 overflow-y-auto"
              style={{ background: 'var(--admin-popover-bg, #FFF)', border: '1px solid var(--admin-border)', boxShadow: '0 12px 30px -12px rgba(0,0,0,0.35)' }}>
              {customerMatches.map((c) => (
                <button key={c.id} type="button"
                  onClick={() => { setRecipientCustomerId(c.id); setRecipientName(c.name); setRecipientPhone(c.phone ?? ''); setShowCustomerList(false) }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--admin-input-bg)]"
                  style={{ color: 'var(--admin-text)' }}>
                  {c.name}{c.phone ? <span style={{ color: 'var(--admin-text-mute)' }}> · {c.phone}</span> : null}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Telefone da presenteada */}
        <div className="mb-4">
          <label className="admin-label">Telefone da presenteada (opcional)</label>
          <input value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)}
            placeholder="(00) 00000-0000"
            className="admin-input w-full px-3 py-2.5 rounded-xl text-sm" />
        </div>

        {/* Serviços do vale */}
        <div className="mb-4">
            <label className="admin-label">Serviços do vale</label>
            {services.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>Nenhum serviço ativo cadastrado.</p>
            ) : (
              <>
                {/* Seletor · escolher já adiciona (sem clique extra) e vira "adicionar outro" */}
                {availableServices.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => addService(e.target.value)}
                    className="admin-input w-full px-3 py-2.5 rounded-xl text-sm">
                    <option value="">
                      {addedServices.length === 0 ? 'Escolha um serviço...' : '+ Adicionar outro serviço...'}
                    </option>
                    {availableServices.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} · {brl(Number(s.price ?? 0))}</option>
                    ))}
                  </select>
                )}

                {/* Lista só dos serviços já adicionados */}
                {addedServices.length === 0 ? (
                  <p className="text-[12px] mt-2" style={{ color: 'var(--admin-text-mute)' }}>
                    Escolha um serviço acima — ele já entra no vale.
                  </p>
                ) : (
                  <div className="rounded-xl divide-y mt-2" style={{ border: '1px solid var(--admin-border)', borderColor: 'var(--admin-border)' }}>
                    {addedServices.map((s) => {
                      const q = serviceQty[s.id] ?? 0
                      return (
                        <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2"
                          style={{ borderColor: 'var(--admin-divider)' }}>
                          <div className="min-w-0">
                            <p className="text-sm truncate" style={{ color: 'var(--admin-text-2)' }}>{s.name}</p>
                            <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>{brl(Number(s.price ?? 0))}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button type="button" onClick={() => setQty(s.id, -1)} disabled={q <= 1}
                              className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-base font-bold disabled:opacity-30"
                              style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text)' }}>−</button>
                            <span className="w-6 text-center text-sm font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>{q}</span>
                            <button type="button" onClick={() => setQty(s.id, 1)}
                              className="w-7 h-7 rounded-lg inline-flex items-center justify-center"
                              style={{ background: 'color-mix(in srgb, var(--admin-accent) 12%, transparent)', color: 'var(--admin-accent)' }}>
                              <IconPlus size={13} />
                            </button>
                            <button type="button" onClick={() => removeService(s.id)}
                              className="w-7 h-7 rounded-lg inline-flex items-center justify-center ml-0.5"
                              style={{ color: '#DC2626' }} aria-label={`Remover ${s.name}`}>
                              <IconTrash size={13} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
            {servicesSum > 0 && (
              <p className="text-[12px] mt-2 text-right" style={{ color: 'var(--admin-text-mute)' }}>
                Valor cheio dos serviços: <b style={{ color: 'var(--admin-text)' }}>{brl(servicesSum)}</b>
              </p>
            )}
        </div>

        {/* Preço cobrado + validade */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="admin-label">Preço cobrado (opcional)</label>
            <input type="number" min="0" step="0.01" value={pricePaid} onChange={(e) => setPricePaid(e.target.value)}
              placeholder="Deixe vazio = soma"
              className="admin-input w-full px-3 py-2.5 rounded-xl text-sm" />
            <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-mute)' }}>
              Deixe vazio pra cobrar a soma dos serviços.
            </p>
          </div>
          <div>
            <label className="admin-label">Validade</label>
            <select value={validityKind} onChange={(e) => setValidityKind(e.target.value as ValidityKind)}
              className="admin-input w-full px-3 py-2.5 rounded-xl text-sm">
              <option value="none">Sem prazo</option>
              <option value="days">Dias</option>
              <option value="weeks">Semanas</option>
              <option value="months">Meses</option>
              <option value="years">Anos</option>
            </select>
          </div>
          <div>
            <label className="admin-label">Prazo {validityKind === 'none' ? '' : `(nº de ${{ days: 'dias', weeks: 'semanas', months: 'meses', years: 'anos' }[validityKind]})`}</label>
            <input type="number" min="1" step="1" value={validityValue} onChange={(e) => setValidityValue(e.target.value)}
              disabled={validityKind === 'none'}
              placeholder={{ none: '—', days: 'Ex: 90', weeks: 'Ex: 8', months: 'Ex: 3', years: 'Ex: 1' }[validityKind]}
              className="admin-input w-full px-3 py-2.5 rounded-xl text-sm disabled:opacity-40" />
          </div>
        </div>

        {/* Mensagem + data pra enviar (opcionais) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="sm:col-span-2">
            <label className="admin-label">Mensagem (opcional)</label>
            <textarea value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)}
              rows={2} maxLength={180}
              placeholder="Uma mensagem carinhosa que sai impressa no cartão"
              className="admin-input w-full px-3 py-2.5 rounded-xl text-sm resize-none" />
          </div>
          <div>
            <label className="admin-label">Data pra enviar (opcional)</label>
            <input type="date" value={sendOn} onChange={(e) => setSendOn(e.target.value)}
              className="admin-input w-full px-3 py-2.5 rounded-xl text-sm" />
            <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-mute)' }}>
              Vira lembrete em &quot;Pra enviar&quot;.
            </p>
          </div>
        </div>

        {/* Forma de pagamento · recebe no ato (fecha a comanda no caixa) */}
        <div className="mb-4">
          <label className="admin-label">Forma de pagamento (opcional)</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
            className="admin-input w-full sm:max-w-xs px-3 py-2.5 rounded-xl text-sm">
            <option value="">Receber depois (deixa a comanda aberta)</option>
            <option value="cash">Dinheiro</option>
            <option value="pix">Pix</option>
            <option value="card_credit">Cartão de crédito</option>
            <option value="card_debit">Cartão de débito</option>
          </select>
          <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-mute)' }}>
            {paymentMethod
              ? <>Ao emitir, cobra <b style={{ color: 'var(--admin-text)' }}>{brl(pricePaid.trim() !== '' ? Number(pricePaid) : servicesSum)}</b> e já entra no caixa.</>
              : 'Em branco: o vale nasce com a comanda aberta pra fechar na tela de Comandas.'}
          </p>
        </div>

        {issueError && (
          <div className="rounded-lg px-3 py-2 text-xs font-semibold mb-3"
            style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}>
            {issueError}
          </div>
        )}

        <button type="button" onClick={handleIssue} disabled={issuing}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
            color: '#fff', boxShadow: '0 4px 12px -4px rgba(59,130,246,0.5)',
          }}>
          <IconGift size={14} /> {issuing ? 'Emitindo...' : 'Emitir vale e gerar código'}
        </button>
      </section>

      {/* ══ SEÇÃO A2 · PRA ENVIAR (lembrete) ══ */}
      {pendingSends && pendingSends.length > 0 && (
        <section className="admin-card rounded-2xl p-5" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex w-9 h-9 rounded-xl items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--admin-accent) 14%, transparent)', color: 'var(--admin-accent)' }}>
              <IconClock size={17} />
            </span>
            <div>
              <h2 className="font-bold text-base leading-tight" style={{ color: 'var(--admin-text)' }}>Pra enviar</h2>
              <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>Vales com data de envio chegando — abra e mande no WhatsApp</p>
            </div>
          </div>
          <div className="space-y-2">
            {pendingSends.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5"
                style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-divider)' }}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>{p.recipient_name}</p>
                  <p className="text-[11px] inline-flex items-center gap-1" style={{ color: 'var(--admin-text-mute)' }}>
                    <IconCalendar size={11} /> Enviar em {formatDateShort(p.send_on)} · {p.code}
                  </p>
                </div>
                <button type="button"
                  onClick={() => setViewPending({ data: pendingToVisual(p, businessName, marca), id: p.id })}
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex-shrink-0"
                  style={{ background: 'color-mix(in srgb, var(--admin-accent) 12%, transparent)', color: 'var(--admin-accent)' }}>
                  <IconEye size={12} /> Ver cartão
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══ SEÇÃO B · LISTAR ══ */}
      <section>
        <h2 className="font-bold text-base mb-3" style={{ color: 'var(--admin-text)' }}>Vales emitidos</h2>
        {initialGiftCards.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--admin-surface)', border: '1px dashed var(--admin-border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Nenhum cartão presente emitido ainda</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {initialGiftCards.map((card) => {
              const st = statusLabel(card.status)
              const restante = card.mode === 'value'
                ? Number(card.value_total ?? 0) - Number(card.value_used ?? 0)
                : servicesBalance(card)
              return (
                <article key={card.id} className="admin-card rounded-2xl p-4"
                  style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
                  <header className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-black tabular-nums tracking-widest text-lg leading-none" style={{ color: 'var(--admin-text)' }}>{card.code}</p>
                      <p className="text-[12px] mt-1" style={{ color: 'var(--admin-text-2)' }}>Para <b>{card.recipient_name}</b></p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ background: st.bg, color: st.color }}>{st.text}</span>
                      <button type="button" onClick={() => setViewCard(cardToVisual(card, businessName, marca))}
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg"
                        style={{ background: 'color-mix(in srgb, var(--admin-accent) 12%, transparent)', color: 'var(--admin-accent)' }}>
                        <IconEye size={12} /> Ver cartão
                      </button>
                    </div>
                  </header>

                  <div className="flex items-center gap-2 flex-wrap text-[11px] mb-2">
                    <span className="px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text-mute)' }}>
                      {card.mode === 'value' ? 'Valor em R$' : 'Serviços'}
                    </span>
                    {card.buyer_name && (
                      <span style={{ color: 'var(--admin-text-mute)' }}>de {card.buyer_name}</span>
                    )}
                  </div>

                  {card.mode === 'value' ? (
                    <div className="rounded-xl p-3" style={{ background: 'var(--admin-surface-hi)' }}>
                      <div className="flex justify-between text-[12px]" style={{ color: 'var(--admin-text-mute)' }}>
                        <span>Valor do vale</span><span className="tabular-nums">{brl(Number(card.value_total ?? 0))}</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm pt-1 mt-1"
                        style={{ borderTop: '1px solid var(--admin-divider)', color: 'var(--admin-text)' }}>
                        <span>Saldo restante</span><span className="tabular-nums">{brl(restante)}</span>
                      </div>
                    </div>
                  ) : (
                    <ul className="text-[12px] space-y-1 rounded-xl p-3" style={{ background: 'var(--admin-surface-hi)' }}>
                      {(card.gift_card_services ?? []).map((gs) => (
                        <li key={gs.id} className="flex justify-between" style={{ color: 'var(--admin-text-2)' }}>
                          <span>{gs.service_name}</span>
                          <span className="tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>
                            {Math.max(0, gs.sessions_total - gs.sessions_used)}/{gs.sessions_total} restam
                          </span>
                        </li>
                      ))}
                      <li className="flex justify-between font-bold pt-1 mt-1"
                        style={{ borderTop: '1px solid var(--admin-divider)', color: 'var(--admin-text)' }}>
                        <span>Sessões disponíveis</span><span className="tabular-nums">{restante}</span>
                      </li>
                    </ul>
                  )}

                  {card.sold_by_role && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold mt-2 px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text-mute)' }}>
                      <IconUser size={10} /> Vendido por {card.sold_by_name} · {card.sold_by_role === 'admin' ? 'Adm' : 'Recepção'}
                    </span>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* ══ SEÇÃO C · RESGATAR ══ */}
      <ResgatarSection professionals={professionals} onScheduled={() => router.refresh()} />

      {/* Modal · Ver cartão de um vale da lista */}
      {viewCard && <VerCartaoModal data={viewCard} onClose={() => setViewCard(null)} />}

      {/* Modal · Ver cartão de um vale pendente de envio (marca sent_at ao enviar) */}
      {viewPending && (
        <VerCartaoModal
          data={viewPending.data}
          onSent={() => { markSent(viewPending.id); setViewPending(null) }}
          onClose={() => setViewPending(null)}
        />
      )}
    </div>
  )
}

// ── Modal que exibe a peça visual de um vale ──────────────────────
function VerCartaoModal({ data, onClose, onSent }: { data: CartaoPresenteVisualData; onClose: () => void; onSent?: () => void }) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-[320] flex items-center justify-center p-4 no-print"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl rounded-3xl overflow-hidden flex flex-col"
        style={{ background: 'var(--admin-popover-bg, #FFFFFF)', border: '1px solid var(--admin-popover-border, #E2E8F0)', boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)', maxHeight: '92vh' }}>
        <header className="px-5 pt-5 pb-3 flex items-center justify-between gap-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
          <p className="text-lg font-bold inline-flex items-center gap-1.5" style={{ color: 'var(--admin-text)' }}>
            <IconGift size={16} /> Cartão-presente · {data.code}
          </p>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--admin-input-bg)]"
            style={{ color: 'var(--admin-text-mute)' }} aria-label="Fechar">
            <IconClose size={16} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">
          <CartaoPresenteVisual {...data} onSent={onSent} />
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── SEÇÃO C · Resgate ─────────────────────────────────────────────
type RedeemCard = {
  id: string
  code: string
  mode: 'services' | 'value'
  recipient_name: string
  status: string
  value_total: number | null
  value_used: number | null
  expires_at: string | null
  gift_card_services: GiftCardServiceRow[] | null
}

function normalizeRedeem(j: unknown): RedeemCard[] {
  if (!j || typeof j !== 'object') return []
  const o = j as Record<string, unknown>
  if (Array.isArray(o.gift_cards)) return o.gift_cards as RedeemCard[]
  if (Array.isArray(o.results)) return o.results as RedeemCard[]
  if (o.gift_card && typeof o.gift_card === 'object') return [o.gift_card as RedeemCard]
  return []
}

function ResgatarSection({ professionals, onScheduled }: { professionals: Professional[]; onScheduled: () => void }) {
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<RedeemCard[] | null>(null)
  const [scheduleFor, setScheduleFor] = useState<{ card: RedeemCard; svc: GiftCardServiceRow } | null>(null)

  async function search() {
    const term = q.trim()
    if (!term) return
    setError(null)
    setSearching(true)
    setResults(null)
    const r = await fetch(`/api/admin/gift-cards/redeem?q=${encodeURIComponent(term)}`)
    setSearching(false)
    const j = await r.json().catch(() => ({}))
    if (!r.ok) {
      setError(j.error ?? 'Erro ao buscar o vale')
      return
    }
    setResults(normalizeRedeem(j))
  }

  return (
    <section className="admin-card rounded-2xl p-5" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex w-9 h-9 rounded-xl items-center justify-center"
          style={{ background: 'color-mix(in srgb, var(--admin-accent) 14%, transparent)', color: 'var(--admin-accent)' }}>
          <IconSearch size={17} />
        </span>
        <div>
          <h2 className="font-bold text-base leading-tight" style={{ color: 'var(--admin-text)' }}>Resgatar vale</h2>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>Busque pelo código ou pelo nome da presenteada</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') search() }}
          placeholder="Código (ex: A7K2QP) ou nome..."
          className="admin-input flex-1 px-3 py-2.5 rounded-xl text-sm" />
        <button type="button" onClick={search} disabled={searching || !q.trim()}
          className="px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)', color: '#fff' }}>
          <IconSearch size={14} /> {searching ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg px-3 py-2 text-xs font-semibold mb-3"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}>
          {error}
        </div>
      )}

      {results && results.length === 0 && (
        <p className="text-sm text-center py-4" style={{ color: 'var(--admin-text-mute)' }}>Nenhum vale ativo encontrado pra essa busca.</p>
      )}

      {results && results.map((card) => {
        const restante = card.mode === 'value'
          ? Number(card.value_total ?? 0) - Number(card.value_used ?? 0)
          : (card.gift_card_services ?? []).reduce((s, r) => s + Math.max(0, r.sessions_total - r.sessions_used), 0)
        const vencido = !!card.expires_at && new Date(card.expires_at).getTime() < Date.now()
        return (
          <div key={card.id} className="rounded-xl p-4 mb-3" style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-divider)' }}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="font-black tabular-nums tracking-widest text-lg leading-none" style={{ color: 'var(--admin-text)' }}>{card.code}</p>
                <p className="text-[12px] mt-1" style={{ color: 'var(--admin-text-2)' }}>Para <b>{card.recipient_name}</b></p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {vencido && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(239,68,68,0.10)', color: '#DC2626' }}>Vencido</span>
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.12)', color: '#059669' }}>{card.status}</span>
              </div>
            </div>

            {card.mode === 'value' ? (
              <div className="flex justify-between items-center text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
                <span>Saldo restante</span><span className="tabular-nums">{brl(restante)}</span>
              </div>
            ) : (
              <ul className="space-y-2">
                {(card.gift_card_services ?? []).map((gs) => {
                  const avail = Math.max(0, gs.sessions_total - gs.sessions_used)
                  return (
                    <li key={gs.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm" style={{ color: 'var(--admin-text-2)' }}>
                        {gs.service_name}
                        <span className="text-[11px] ml-2 tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>{avail} disponível</span>
                      </span>
                      <button type="button" disabled={avail === 0 || vencido}
                        onClick={() => setScheduleFor({ card, svc: gs })}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-40"
                        style={{ background: 'color-mix(in srgb, var(--admin-accent) 12%, transparent)', color: 'var(--admin-accent)' }}>
                        <IconCalendar size={13} /> Agendar
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {card.mode === 'value' && (
              <p className="text-[11px] mt-2" style={{ color: 'var(--admin-text-mute)' }}>
                Vale em R$: a presenteada agenda o serviço normal e o crédito abate no pagamento.
              </p>
            )}
          </div>
        )
      })}

      {scheduleFor && (
        <AgendarModal
          card={scheduleFor.card}
          svc={scheduleFor.svc}
          professionals={professionals}
          onClose={() => setScheduleFor(null)}
          onDone={() => { setScheduleFor(null); onScheduled() }}
        />
      )}
    </section>
  )
}

// ── Modal de agendamento (vale modo serviços) ─────────────────────
function AgendarModal({ card, svc, professionals, onClose, onDone }: {
  card: RedeemCard
  svc: GiftCardServiceRow
  professionals: Professional[]
  onClose: () => void
  onDone: () => void
}) {
  const [professionalId, setProfessionalId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    if (!professionalId) { setError('Escolha a profissional'); return }
    if (!date) { setError('Escolha a data'); return }
    if (!time) { setError('Escolha o horário'); return }
    setSubmitting(true)
    const r = await fetch('/api/admin/gift-cards/schedule', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        gift_card_id: card.id,
        gift_card_service_id: svc.id,
        professional_id: professionalId,
        appointment_date: date,
        start_time: time,
      }),
    })
    setSubmitting(false)
    const j = await r.json().catch(() => ({}))
    if (!r.ok || !j.ok) {
      setError(j.error ?? 'Erro ao agendar a sessão')
      return
    }
    onDone()
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{ background: 'var(--admin-popover-bg, #FFFFFF)', border: '1px solid var(--admin-popover-border, #E2E8F0)', boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)', maxHeight: '92vh' }}>
        <header className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--admin-text-faded)' }}>
              Agendar sessão · {card.code}
            </p>
            <p className="text-lg font-bold inline-flex items-center gap-1.5" style={{ color: 'var(--admin-text)' }}>
              <IconCalendar size={16} /> {svc.service_name}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>Para {card.recipient_name}</p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--admin-input-bg)] disabled:opacity-50"
            style={{ color: 'var(--admin-text-mute)' }} aria-label="Fechar">
            <IconClose size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="admin-label">Profissional</label>
            <select value={professionalId} onChange={(e) => setProfessionalId(e.target.value)}
              className="admin-input w-full px-3 py-2.5 rounded-xl text-sm">
              <option value="">Selecione...</option>
              {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Data</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="admin-input w-full px-3 py-2.5 rounded-xl text-sm" />
            </div>
            <div>
              <label className="admin-label">Horário</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="admin-input w-full px-3 py-2.5 rounded-xl text-sm" />
            </div>
          </div>

          {error && (
            <div className="rounded-lg px-3 py-2 text-xs font-semibold"
              style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}>
              {error}
            </div>
          )}
        </div>

        <footer className="flex-shrink-0 px-5 py-4 flex gap-2 justify-end" style={{ borderTop: '1px solid var(--admin-divider)', background: 'var(--admin-surface)' }}>
          <button type="button" onClick={onClose} disabled={submitting}
            className="px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50" style={{ color: 'var(--admin-text-mute)' }}>
            Cancelar
          </button>
          <button type="button" onClick={submit} disabled={submitting}
            className="px-5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)', color: '#fff' }}>
            {submitting ? 'Agendando...' : 'Confirmar'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
