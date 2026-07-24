'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { IconClose, IconGift, IconSearch, IconPlus } from '@/components/ui/Icon'
import PaymentMethodModal, { type PaymentMethodChoice, type CardPaymentDetails } from '@/components/admin/PaymentMethodModal'

// Venda de pacote PARTINDO do card (pacote fixo · escolhe a cliente). É o inverso
// do VenderPacoteModal da ficha do cliente (cliente fixa · escolhe o pacote).
// Reusa a mesma rota /api/admin/packages/sell + o PaymentMethodModal do caixa
// (pra cartão perguntar débito/crédito + maquininha + parcelas). Só pacote
// (kind='pacote') — combo não é vendido assim (aplica no agendamento).

type CustomerHit = { id: string; name: string; phone: string | null }

type Props = {
  packageId: string
  packageName: string
  price: number
  businessId: string
  onClose: () => void
  onSold: (customerName: string, paidMethod: PaymentMethodChoice, warn: string | null) => void
}

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function VenderPacoteCardModal({ packageId, packageName, price, businessId, onClose, onSold }: Props) {
  const [portalReady, setPortalReady] = useState(false)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<CustomerHit[]>([])
  const [searching, setSearching] = useState(false)
  const [customer, setCustomer] = useState<CustomerHit | null>(null)
  // Cadastro inline · cliente nova sem cadastro (balcão, primeira vez) sem sair do modal.
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [creatingLoad, setCreatingLoad] = useState(false)
  // Pacote é pago NA VENDA (não no resgate). 2 passos: escolhe cliente → pagamento
  // (reusa PaymentMethodModal · cartão pergunta débito/crédito + maquininha).
  const [step, setStep] = useState<'client' | 'payment'>('client')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setPortalReady(true) }, [])
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
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

  function openCreate() {
    setError(null)
    setNewName(query.trim()) // prefila com o que foi digitado na busca
    setNewPhone('')
    setCreating(true)
  }

  async function createAndUse() {
    setError(null)
    const nome = newName.trim()
    const fone = newPhone.replace(/\D/g, '')
    if (!nome) { setError('Nome obrigatório'); return }
    if (fone.length < 10) { setError('Telefone inválido (com DDD)'); return }
    setCreatingLoad(true)
    const r = await fetch('/api/admin/customers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: nome, phone: fone }),
    })
    const j = await r.json().catch(() => ({}))
    setCreatingLoad(false)
    if (!r.ok) {
      // 409 = telefone já cadastrado · aproveita e usa a cliente existente.
      if (r.status === 409 && j.existing_id) {
        setCustomer({ id: j.existing_id, name: nome, phone: null })
        setCreating(false)
        return
      }
      setError(j.error ?? 'Erro ao cadastrar cliente')
      return
    }
    const c = j.customer
    setCustomer({ id: c.id, name: c.name, phone: c.phone ?? null })
    setCreating(false)
  }

  // Chamado pelo PaymentMethodModal. method=null → "deixar em aberto" (recebe
  // depois no Caixa). Cartão vem com cardDetails (maquininha/tipo/bandeira/taxa).
  async function handlePay(method: PaymentMethodChoice, cardDetails?: CardPaymentDetails) {
    if (!customer) { setError('Escolha a cliente'); setStep('client'); return }
    setError(null)
    setSubmitting(true)
    // 1) vende (cria customer_package + saldo + abre a comanda) · sem profissional:
    //    a venda NÃO gera comissão (ela nasce no resgate).
    const r = await fetch('/api/admin/packages/sell', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ package_id: packageId, customer_id: customer.id }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) {
      setSubmitting(false)
      setError(j.detail ?? j.error ?? 'Erro ao vender pacote')
      setStep('client')
      return
    }
    // 2) recebe na hora (pacote é pago na venda) · a não ser que "em aberto" (method null)
    if (method && j.invoice_id) {
      const payBody = method === 'card' && cardDetails
        ? {
            method: 'card',
            device_id: cardDetails.device_id,
            card_brand: cardDetails.card_brand,
            card_type: cardDetails.card_type,
            installments: cardDetails.installments,
            fee_percent: cardDetails.fee_percent,
          }
        : { method }
      const pr = await fetch(`/api/admin/invoices/${j.invoice_id}/pay`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payBody),
      })
      setSubmitting(false)
      if (!pr.ok) {
        // Venda OK, saldo já criado · só o recebimento falhou. Não perde a venda.
        const pj = await pr.json().catch(() => ({}))
        onSold(customer.name, null, `Vendido, mas o recebimento falhou (${pj.detail ?? pj.error ?? 'erro'}). Feche a comanda no Caixa.`)
        return
      }
      onSold(customer.name, method, null)
      return
    }
    setSubmitting(false)
    onSold(customer.name, null, null)
  }

  // Passo 2 · pagamento · reusa o modal do caixa (cartão pergunta débito/crédito +
  // maquininha + parcelas). "Deixar em aberto" = recebe depois no Caixa.
  if (step === 'payment') {
    return (
      <PaymentMethodModal
        open
        clientName={customer?.name ?? 'a cliente'}
        totalPrice={price}
        businessId={businessId}
        eyebrow={`Venda de pacote · ${packageName}`}
        heading={`Como ${customer?.name ?? 'a cliente'} vai pagar?`}
        deferLabel="Deixar em aberto (receber depois)"
        loading={submitting}
        onChoose={handlePay}
        onClose={() => { if (!submitting) setStep('client') }}
      />
    )
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
            ) : creating ? (
              /* Cadastro inline · cliente nova sem sair do modal */
              <div className="space-y-2 rounded-xl p-3" style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-divider)' }}>
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>Nova cliente</p>
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nome"
                  className="admin-input w-full px-3 py-2.5 rounded-xl text-sm"
                />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Telefone com DDD"
                  className="admin-input w-full px-3 py-2.5 rounded-xl text-sm"
                />
                <div className="flex gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => { setCreating(false); setError(null) }}
                    disabled={creatingLoad}
                    className="px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50"
                    style={{ color: 'var(--admin-text-mute)' }}
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={createAndUse}
                    disabled={creatingLoad}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)', color: '#fff' }}
                  >
                    {creatingLoad ? 'Cadastrando...' : 'Cadastrar e usar'}
                  </button>
                </div>
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
                    {!searching && hits.length === 0 && <p className="text-xs px-3 py-2.5" style={{ color: 'var(--admin-text-mute)' }}>Nenhuma cliente encontrada com esse nome</p>}
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
                {/* Cliente nova · cadastro inline sem trocar de tela */}
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-2 w-full py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5"
                  style={{ color: 'var(--admin-accent)', background: 'color-mix(in srgb, var(--admin-accent) 8%, transparent)', border: '1px dashed color-mix(in srgb, var(--admin-accent) 40%, transparent)' }}
                >
                  <IconPlus size={13} /> {query.trim().length >= 2 ? `Cadastrar "${query.trim()}"` : 'Cadastrar nova cliente'}
                </button>
              </>
            )}
          </div>

          <div className="rounded-xl p-3 text-xs leading-relaxed"
            style={{ background: 'color-mix(in srgb, var(--admin-accent) 8%, transparent)', color: 'var(--admin-text-2)' }}
          >
            <b style={{ color: 'var(--admin-accent)' }}>Próximo passo:</b> escolher o pagamento — o pacote é <b>pago na venda</b> (entra no caixa de hoje). A cliente fica com o saldo de sessões pra <b>resgatar no agendamento</b>, e no resgate o serviço entra R$0 (já foi pago aqui).
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
            onClick={() => { if (customer) { setError(null); setStep('payment') } else setError('Escolha a cliente') }}
            disabled={submitting || !customer}
            className="px-5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)',
              color: '#fff',
            }}
          >
            Ir pro pagamento →
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
