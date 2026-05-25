'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { IconChevronLeft, IconTrash, IconCheck, IconPlus, IconStar, IconGift, IconClose } from '@/components/ui/Icon'
import AdicionarServicoComandaModal from './AdicionarServicoComandaModal'
import SplitPaymentModal from './SplitPaymentModal'
import ConfirmActionModal from '@/components/admin/ConfirmActionModal'

export type RewardOption = {
  id: string
  name: string
  description: string | null
  points_required: number
}

export type InvoiceFull = {
  id: string
  invoice_number: number
  status: 'open' | 'closed' | 'cancelled'
  subtotal: number
  discount: number
  total: number
  notes: string | null
  created_at: string
  closed_at: string | null
  cancelled_at: string | null
  customer: { id: string; name: string | null; phone: string | null } | null
  items: {
    id: string
    item_type: 'appointment' | 'product' | 'package' | 'credit'
    description: string
    quantity: number
    unit_price: number
    discount: number
    total: number
    professional_name: string | null
  }[]
  payments: {
    id: string
    payment_method: string
    amount: number
    paid_at: string
    installments: number | null
    card_brand: string | null
    card_type: string | null
    fee_percent: number
  }[]
}

const STATUS_LABEL: Record<InvoiceFull['status'], string> = {
  open: 'Aberta',
  closed: 'Paga',
  cancelled: 'Cancelada',
}

const STATUS_COLOR: Record<InvoiceFull['status'], { bg: string; fg: string }> = {
  open: { bg: '#FEF3C7', fg: '#B45309' },
  closed: { bg: '#DCFCE7', fg: '#166534' },
  cancelled: { bg: '#FEE2E2', fg: '#991B1B' },
}

const TYPE_LABEL: Record<InvoiceFull['items'][number]['item_type'], string> = {
  appointment: 'Serviço',
  product: 'Produto',
  package: 'Pacote',
  credit: 'Crédito',
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'PIX',
  card: 'Cartão',
  courtesy: 'Cortesia',
  points: 'Pontos',
}

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ComandaDetalhe({
  businessId, businessName, invoice, availableCredit = 0,
  loyaltyEnabled = false, customerPoints = 0, rewards = [],
}: {
  businessId: string
  businessName: string
  invoice: InvoiceFull
  availableCredit?: number
  loyaltyEnabled?: boolean
  customerPoints?: number
  rewards?: RewardOption[]
}) {
  const router = useRouter()
  const [acting, setActing] = useState<null | 'reopen' | 'cancel'>(null)
  const [removingItemId, setRemovingItemId] = useState<string | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paying, setPaying] = useState(false)
  const [addServiceOpen, setAddServiceOpen] = useState(false)
  const [courtesyLoading, setCourtesyLoading] = useState(false)
  const [rewardModalOpen, setRewardModalOpen] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  // Confirm modal genérico · troca window.confirm nativo (feio) por modal estilizado
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    title: string
    message: string
    tone: 'danger' | 'warn' | 'neutral'
    confirmLabel: string
    onConfirm: () => void
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const color = STATUS_COLOR[invoice.status]
  const canEditItems = invoice.status !== 'cancelled'
  const canReceivePayment = invoice.status === 'open' && invoice.total > 0
  const customerName = invoice.customer?.name ?? 'Cliente'

  async function receberPagamento(payments: { method: 'cash' | 'pix' | 'card' | 'courtesy' | 'points' | 'credit'; amount: number; card_type?: 'credit' | 'debit' | null }[]) {
    setPaying(true)
    setError(null)
    const r = await fetch(`/api/admin/invoices/${invoice.id}/pay`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ payments }),
    })
    setPaying(false)
    setPaymentOpen(false)
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      setError(d.error ?? 'Erro ao receber pagamento')
      return
    }
    router.refresh()
  }

  async function doAct(action: 'reopen' | 'cancel') {
    setActing(action)
    setError(null)
    const r = await fetch(`/api/admin/invoices/${invoice.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setActing(null)
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      setError(d.error ?? 'Erro ao executar ação')
      return
    }
    router.refresh()
  }

  function act(action: 'reopen' | 'cancel') {
    setConfirmModal({
      open: true,
      title: action === 'reopen' ? 'Reabrir essa comanda?' : 'Cancelar a comanda INTEIRA?',
      message: action === 'reopen'
        ? 'A comanda volta pra Aberta · você poderá adicionar/remover itens novamente.'
        : 'Vai reverter serviço + produto + estoque + marcar o atendimento como cancelado na agenda. Pra reverter só 1 item, use a lixeira na linha.',
      tone: action === 'reopen' ? 'neutral' : 'danger',
      confirmLabel: action === 'reopen' ? 'Sim, reabrir' : 'Sim, cancelar tudo',
      onConfirm: () => { setConfirmModal(null); doAct(action) },
    })
  }

  async function patchItem(itemId: string, body: { quantity?: number; unit_price?: number; discount?: number }) {
    const r = await fetch(`/api/admin/invoices/${invoice.id}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      setError(d.error ?? 'Erro ao atualizar item')
      return false
    }
    router.refresh()
    return true
  }

  async function doMarcarCortesia() {
    setCourtesyLoading(true)
    setError(null)
    const r = await fetch(`/api/admin/invoices/${invoice.id}/courtesy`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    setCourtesyLoading(false)
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      setError(d.error ?? 'Erro ao marcar como cortesia')
      return
    }
    router.refresh()
  }

  function marcarCortesia() {
    setConfirmModal({
      open: true,
      title: 'Marcar como cortesia?',
      message: 'A comanda fecha como bonificação · sem cobrança · não conta como receita. Útil pra VIP, brinde ou amigo do salão.',
      tone: 'neutral',
      confirmLabel: 'Sim, é cortesia',
      onConfirm: () => { setConfirmModal(null); doMarcarCortesia() },
    })
  }

  async function doRedeemReward(rewardId: string) {
    setRedeeming(true)
    setError(null)
    const r = await fetch(`/api/admin/invoices/${invoice.id}/redeem-reward`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reward_id: rewardId }),
    })
    setRedeeming(false)
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      setError(d.error ?? 'Erro ao resgatar recompensa')
      return
    }
    setRewardModalOpen(false)
    router.refresh()
  }

  async function doRemoveItem(itemId: string) {
    setRemovingItemId(itemId)
    setError(null)
    const r = await fetch(`/api/admin/invoices/${invoice.id}/items/${itemId}`, {
      method: 'DELETE',
    })
    setRemovingItemId(null)
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      setError(d.error ?? 'Erro ao remover item')
      return
    }
    router.refresh()
  }

  function removeItem(itemId: string, description: string, type: InvoiceFull['items'][number]['item_type']) {
    const tipoLabel = type === 'product' ? 'produto (devolve ao estoque)' : 'serviço (libera o atendimento pra refaturar)'
    setConfirmModal({
      open: true,
      title: `Remover "${description}"?`,
      message: `Vai reverter só esse item · ${tipoLabel}.`,
      tone: 'danger',
      confirmLabel: 'Sim, remover',
      onConfirm: () => { setConfirmModal(null); doRemoveItem(itemId) },
    })
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl mx-auto space-y-5 comanda-detalhe">
      {/* Top bar · não imprime */}
      <div className="flex items-center justify-between gap-3 no-print">
        <Link
          href="/admin/comandas"
          className="inline-flex items-center gap-1 text-xs font-semibold"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          <IconChevronLeft size={14} /> Voltar
        </Link>
        <div className="flex gap-2 flex-wrap">
          {canReceivePayment && (
            <button
              type="button"
              disabled={paying}
              onClick={() => setPaymentOpen(true)}
              className="px-4 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
              style={{
                background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
                color: '#fff',
                borderTop: '1px solid rgba(255,255,255,0.25)',
                boxShadow: '0 6px 14px -4px rgba(5,150,105,0.55)',
              }}
            >
              <IconCheck size={12} /> {paying ? 'Processando...' : 'Receber pagamento'}
            </button>
          )}
          {canReceivePayment && (
            <button
              type="button"
              disabled={courtesyLoading}
              onClick={marcarCortesia}
              title="Comanda fica como bonificação · sem cobrança · não conta como receita"
              className="px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
              style={{
                background: 'linear-gradient(180deg, #EC4899 0%, #BE185D 100%)',
                color: '#fff',
                borderTop: '1px solid rgba(255,255,255,0.25)',
                boxShadow: '0 6px 14px -4px rgba(190,24,93,0.45)',
              }}
            >
              ♥ {courtesyLoading ? '...' : 'Cortesia'}
            </button>
          )}
          {/* Trocar recompensa · só se fidelidade ON + cliente vinculado + comanda aberta */}
          {canReceivePayment && loyaltyEnabled && invoice.customer && (
            <button
              type="button"
              disabled={redeeming || rewards.length === 0}
              onClick={() => setRewardModalOpen(true)}
              title={rewards.length === 0 ? 'Nenhuma recompensa cadastrada · vá em Configurações → Fidelidade' : 'Trocar pontos por recompensa'}
              className="px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
              style={{
                background: 'linear-gradient(180deg, #F59E0B 0%, #B45309 100%)',
                color: '#fff',
                borderTop: '1px solid rgba(255,255,255,0.25)',
                boxShadow: '0 6px 14px -4px rgba(180,83,9,0.45)',
              }}
            >
              <IconStar size={11} /> {redeeming ? '...' : 'Trocar pontos'}
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-lg text-xs font-bold border"
            style={{ background: 'var(--admin-surface)', color: 'var(--admin-text)', borderColor: 'var(--admin-border)' }}
          >
            Imprimir
          </button>
          {invoice.status === 'closed' && (
            <button
              type="button"
              disabled={acting !== null}
              onClick={() => act('reopen')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border disabled:opacity-50"
              style={{ background: 'var(--admin-surface)', color: 'var(--admin-text)', borderColor: 'var(--admin-border)' }}
            >
              {acting === 'reopen' ? '...' : 'Reabrir'}
            </button>
          )}
          {invoice.status !== 'cancelled' && (
            <button
              type="button"
              disabled={acting !== null}
              onClick={() => act('cancel')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
              style={{ background: '#FEE2E2', color: '#991B1B' }}
            >
              {acting === 'cancel' ? '...' : 'Cancelar'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg px-3 py-2 text-xs no-print" style={{ background: '#FEE2E2', color: '#991B1B' }}>
          {error}
        </div>
      )}

      {/* Recibo · imprimível */}
      <div
        className="rounded-2xl overflow-hidden print-card"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
      >
        <header className="px-6 py-5 flex items-start justify-between gap-4" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
              {businessName}
            </p>
            <h1 className="text-xl font-bold leading-tight mt-0.5" style={{ color: 'var(--admin-text)' }}>
              Comanda #{invoice.invoice_number}
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
              Aberta em {fmtDateTime(invoice.created_at)}
              {invoice.closed_at && ` · Paga em ${fmtDateTime(invoice.closed_at)}`}
              {invoice.cancelled_at && ` · Cancelada em ${fmtDateTime(invoice.cancelled_at)}`}
            </p>
          </div>
          <span
            className="inline-block px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex-shrink-0"
            style={{ background: color.bg, color: color.fg }}
          >
            {STATUS_LABEL[invoice.status]}
          </span>
        </header>

        {/* Cliente */}
        <section className="px-6 py-4" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-faded)' }}>
            Cliente
          </p>
          {invoice.customer ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm" style={{ color: 'var(--admin-text)' }}>
                <p className="font-semibold">{invoice.customer.name ?? 'Sem nome'}</p>
                {invoice.customer.phone && <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>{invoice.customer.phone}</p>}
              </div>
              {loyaltyEnabled && (
                <div className="flex items-center gap-2 no-print">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full tabular-nums"
                    style={{
                      background: customerPoints > 0
                        ? 'color-mix(in srgb, #F59E0B 18%, transparent)'
                        : 'var(--admin-input-bg)',
                      color: customerPoints > 0 ? '#B45309' : 'var(--admin-text-faded)',
                      border: `1px solid ${customerPoints > 0 ? 'color-mix(in srgb, #F59E0B 32%, transparent)' : 'var(--admin-border)'}`,
                    }}
                    title="Saldo de pontos do programa de fidelidade"
                  >
                    <IconStar size={11} />
                    {customerPoints.toLocaleString('pt-BR')} pts
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm italic" style={{ color: 'var(--admin-text-faded)' }}>Sem cliente vinculado</p>
          )}
        </section>

        {/* Itens */}
        <section className="px-6 py-4" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
              Itens
            </p>
            {canEditItems && invoice.status === 'open' && (
              <button
                type="button"
                onClick={() => setAddServiceOpen(true)}
                className="no-print text-[11px] font-bold inline-flex items-center gap-1 px-2 py-1 rounded-lg transition-colors hover:bg-[color-mix(in_srgb,var(--admin-accent)_10%,transparent)]"
                style={{ color: 'var(--admin-accent)' }}
              >
                <IconPlus size={11} /> Adicionar serviço
              </button>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--admin-text-faded)' }}>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider pb-1">Tipo</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider pb-1">Descrição</th>
                <th className="text-right text-[10px] font-bold uppercase tracking-wider pb-1 w-16">
                  {canEditItems && invoice.status === 'open' ? 'Editar qtd' : 'Qtd'}
                </th>
                <th className="text-right text-[10px] font-bold uppercase tracking-wider pb-1 w-28">
                  {canEditItems && invoice.status === 'open' ? 'Editar preço' : 'Preço'}
                </th>
                <th className="text-right text-[10px] font-bold uppercase tracking-wider pb-1 w-24">Desconto</th>
                <th className="text-right text-[10px] font-bold uppercase tracking-wider pb-1 w-24">Total</th>
                {canEditItems && <th className="w-8 no-print"></th>}
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it) => (
                <tr key={it.id} style={{ borderTop: '1px solid var(--admin-divider)' }}>
                  <td className="py-2 text-xs" style={{ color: 'var(--admin-text-mute)' }}>{TYPE_LABEL[it.item_type]}</td>
                  <td className="py-2">
                    <div style={{ color: 'var(--admin-text)' }}>{it.description}</div>
                    {it.professional_name && <div className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>com {it.professional_name}</div>}
                  </td>
                  <td className="py-2 text-right tabular-nums" style={{ color: 'var(--admin-text)' }}>
                    {canEditItems && invoice.status === 'open' ? (
                      <EditableNumber
                        value={it.quantity}
                        step={1}
                        min={1}
                        onSave={(v) => patchItem(it.id, { quantity: v })}
                        align="right"
                      />
                    ) : it.quantity}
                  </td>
                  <td className="py-2 text-right tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>
                    {canEditItems && invoice.status === 'open' ? (
                      <EditableNumber
                        value={it.unit_price}
                        step={0.01}
                        min={0}
                        prefix="R$ "
                        onSave={(v) => patchItem(it.id, { unit_price: v })}
                        align="right"
                      />
                    ) : brl(it.unit_price)}
                  </td>
                  <td className="py-2 text-right tabular-nums" style={{ color: it.discount > 0 ? '#DC2626' : 'var(--admin-text-mute)' }}>
                    {canEditItems && invoice.status === 'open' ? (
                      <EditableNumber
                        value={it.discount}
                        step={0.01}
                        min={0}
                        prefix="R$ "
                        onSave={(v) => patchItem(it.id, { discount: v })}
                        align="right"
                      />
                    ) : (it.discount > 0 ? `- ${brl(it.discount)}` : '—')}
                  </td>
                  <td className="py-2 text-right tabular-nums font-semibold" style={{ color: 'var(--admin-text)' }}>{brl(it.total)}</td>
                  {canEditItems && (
                    <td className="py-2 text-right no-print">
                      <button
                        type="button"
                        disabled={removingItemId !== null}
                        onClick={() => removeItem(it.id, it.description, it.item_type)}
                        className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-[color-mix(in_srgb,#DC2626_10%,transparent)] disabled:opacity-40"
                        style={{ color: '#DC2626' }}
                        title="Remover item"
                        aria-label={`Remover ${it.description}`}
                      >
                        {removingItemId === it.id ? '...' : <IconTrash size={12} />}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Totais */}
        <section className="px-6 py-4" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
          <div className="ml-auto max-w-xs space-y-1 text-sm">
            <Row label="Subtotal" value={brl(invoice.subtotal)} />
            {invoice.discount > 0 && <Row label="Desconto" value={`- ${brl(invoice.discount)}`} />}
            <Row label="Total" value={brl(invoice.total)} strong />
          </div>
        </section>

        {/* Pagamentos */}
        <section className="px-6 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--admin-text-faded)' }}>
            Pagamentos
          </p>
          {invoice.payments.length === 0 ? (
            <p className="text-sm italic" style={{ color: 'var(--admin-text-faded)' }}>
              {invoice.status === 'open' ? 'Aguardando pagamento' : 'Sem pagamento registrado'}
            </p>
          ) : (
            <ul className="text-sm space-y-1">
              {invoice.payments.map((p) => (
                <li key={p.id} className="flex justify-between gap-3" style={{ color: 'var(--admin-text)' }}>
                  <span>
                    {METHOD_LABEL[p.payment_method] ?? p.payment_method}
                    {p.payment_method === 'card' && p.card_type && ` · ${p.card_type === 'credit' ? 'Crédito' : 'Débito'}`}
                    {p.payment_method === 'card' && p.card_brand && ` · ${p.card_brand}`}
                    {p.installments && p.installments > 1 && ` · ${p.installments}x`}
                    <span className="text-[11px] ml-2" style={{ color: 'var(--admin-text-mute)' }}>{fmtDateTime(p.paid_at)}</span>
                  </span>
                  <span className="tabular-nums font-semibold">{brl(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {invoice.notes && (
          <section className="px-6 py-4" style={{ borderTop: '1px solid var(--admin-divider)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-faded)' }}>
              Observações
            </p>
            <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{invoice.notes}</p>
          </section>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .admin-desktop-sidebar,
          nav[class*="BottomNav"],
          [class*="DockNav"] {
            display: none !important;
          }
          .print-card {
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }
          .comanda-detalhe {
            max-width: none !important;
            padding: 0 !important;
          }
        }
      `}</style>

      <SplitPaymentModal
        open={paymentOpen}
        clientName={customerName}
        totalPrice={invoice.total}
        availableCredit={availableCredit}
        loading={paying}
        onConfirm={receberPagamento}
        onClose={() => setPaymentOpen(false)}
      />

      {addServiceOpen && (
        <AdicionarServicoComandaModal
          invoiceId={invoice.id}
          businessId={businessId}
          onClose={() => setAddServiceOpen(false)}
          onAdded={() => setAddServiceOpen(false)}
        />
      )}

      {confirmModal?.open && (
        <ConfirmActionModal
          open
          title={confirmModal.title}
          message={confirmModal.message}
          tone={confirmModal.tone}
          confirmLabel={confirmModal.confirmLabel}
          cancelLabel="Voltar"
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal(null)}
        />
      )}

      {rewardModalOpen && (
        <RedeemRewardModal
          customerName={customerName}
          customerPoints={customerPoints}
          rewards={rewards}
          loading={redeeming}
          onClose={() => setRewardModalOpen(false)}
          onConfirm={(rewardId) => doRedeemReward(rewardId)}
        />
      )}
    </div>
  )
}

function RedeemRewardModal({
  customerName, customerPoints, rewards, loading, onClose, onConfirm,
}: {
  customerName: string
  customerPoints: number
  rewards: RewardOption[]
  loading: boolean
  onClose: () => void
  onConfirm: (rewardId: string) => void
}) {
  const ordered = [...rewards].sort((a, b) => a.points_required - b.points_required)
  const affordable = ordered.filter((r) => customerPoints >= r.points_required)
  const tooExpensive = ordered.filter((r) => customerPoints < r.points_required)

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
          maxHeight: '92vh',
        }}
      >
        <header
          className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--admin-divider)' }}
        >
          <div className="min-w-0">
            <p
              className="text-[11px] font-bold uppercase tracking-widest mb-0.5"
              style={{ color: 'var(--admin-text-faded)' }}
            >
              Trocar pontos · {customerName}
            </p>
            <p
              className="text-2xl font-bold tabular-nums inline-flex items-center gap-1.5"
              style={{ color: '#B45309' }}
            >
              <IconStar size={20} /> {customerPoints.toLocaleString('pt-BR')} pts disponíveis
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
              A recompensa entra como item da comanda com desconto do valor total.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--admin-input-bg)] disabled:opacity-50"
            style={{ color: 'var(--admin-text-mute)' }}
            aria-label="Fechar"
          >
            <IconClose size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {ordered.length === 0 && (
            <div
              className="rounded-xl p-4 text-sm text-center"
              style={{
                background: 'var(--admin-surface-hi)',
                border: '1px dashed var(--admin-border)',
                color: 'var(--admin-text-mute)',
              }}
            >
              Nenhuma recompensa cadastrada ainda. Vá em <strong>Configurações → Fidelidade</strong> pra criar.
            </div>
          )}

          {affordable.length > 0 && (
            <section>
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: 'var(--admin-text-faded)' }}
              >
                Pode trocar agora · {affordable.length}
              </p>
              <div className="space-y-2">
                {affordable.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onConfirm(r.id)}
                    disabled={loading}
                    className="w-full text-left rounded-xl p-3 flex items-start gap-3 transition-all hover:translate-y-[-1px] disabled:opacity-50"
                    style={{
                      background: 'color-mix(in srgb, #F59E0B 10%, var(--admin-surface-hi))',
                      border: '1px solid color-mix(in srgb, #F59E0B 32%, transparent)',
                    }}
                  >
                    <span
                      className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
                      style={{
                        background: 'color-mix(in srgb, #F59E0B 24%, transparent)',
                        color: '#B45309',
                        border: '1px solid color-mix(in srgb, #F59E0B 40%, transparent)',
                      }}
                    >
                      <IconGift size={16} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
                        {r.name}
                      </p>
                      {r.description && (
                        <p className="text-[12px] mt-0.5 leading-snug" style={{ color: 'var(--admin-text-mute)' }}>
                          {r.description}
                        </p>
                      )}
                      <p
                        className="text-[11px] font-bold mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                        style={{
                          background: 'rgba(255,255,255,0.45)',
                          color: '#B45309',
                        }}
                      >
                        <IconStar size={10} /> {r.points_required.toLocaleString('pt-BR')} pts
                      </p>
                    </div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full self-start flex-shrink-0"
                      style={{
                        background: 'var(--admin-success)',
                        color: '#fff',
                      }}
                    >
                      Trocar
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {tooExpensive.length > 0 && (
            <section>
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: 'var(--admin-text-faded)' }}
              >
                Faltam pontos
              </p>
              <div className="space-y-2 opacity-70">
                {tooExpensive.map((r) => {
                  const faltam = r.points_required - customerPoints
                  return (
                    <div
                      key={r.id}
                      className="w-full rounded-xl p-3 flex items-start gap-3"
                      style={{
                        background: 'var(--admin-input-bg)',
                        border: '1px solid var(--admin-border)',
                      }}
                    >
                      <span
                        className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
                        style={{
                          background: 'var(--admin-surface)',
                          color: 'var(--admin-text-faded)',
                          border: '1px solid var(--admin-border)',
                        }}
                      >
                        <IconGift size={16} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--admin-text-mute)' }}>
                          {r.name}
                        </p>
                        <p
                          className="text-[11px] font-bold mt-1 inline-flex items-center gap-1"
                          style={{ color: 'var(--admin-text-faded)' }}
                        >
                          <IconStar size={10} /> {r.points_required.toLocaleString('pt-BR')} pts · faltam {faltam.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3" style={{ color: strong ? 'var(--admin-text)' : 'var(--admin-text-mute)', fontWeight: strong ? 700 : 400 }}>
      <span className={strong ? 'text-base' : ''}>{label}</span>
      <span className={`tabular-nums ${strong ? 'text-base' : ''}`}>{value}</span>
    </div>
  )
}

/**
 * Input numérico inline · parece span até o usuário focar.
 * Dispara onSave no blur ou Enter, se o valor mudou.
 */
function EditableNumber({
  value, step, min, prefix, onSave, align = 'left',
}: {
  value: number
  step: number
  min?: number
  prefix?: string
  onSave: (v: number) => Promise<boolean> | void
  align?: 'left' | 'right'
}) {
  const [local, setLocal] = useState<string>(String(value))
  const [saving, setSaving] = useState(false)

  // Sincroniza se o valor server mudar (após refresh)
  useEffect(() => { setLocal(String(value)) }, [value])

  async function commit() {
    const n = Number(local)
    if (!Number.isFinite(n) || n === value) {
      setLocal(String(value))
      return
    }
    if (min != null && n < min) {
      setLocal(String(value))
      return
    }
    setSaving(true)
    await onSave(n)
    setSaving(false)
  }

  return (
    <span className="inline-flex items-center gap-1 no-print">
      {prefix && <span style={{ color: 'var(--admin-text-faded)' }}>{prefix}</span>}
      <input
        type="number"
        step={step}
        min={min}
        value={local}
        disabled={saving}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
          if (e.key === 'Escape') { setLocal(String(value)); (e.currentTarget as HTMLInputElement).blur() }
        }}
        className="bg-transparent border-0 outline-none tabular-nums focus:bg-[var(--admin-input-bg)] focus:px-1 focus:rounded transition-colors"
        style={{
          width: prefix ? '5.5rem' : '3rem',
          textAlign: align,
          color: 'inherit',
          opacity: saving ? 0.5 : 1,
          appearance: 'textfield',
          MozAppearance: 'textfield',
        }}
      />
    </span>
  )
}
