'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconCheck, IconWhatsapp, IconClose, IconSettings } from '@/components/ui/Icon'
import ConfirmActionModal from '@/components/admin/ConfirmActionModal'
import PaymentMethodModal, { type PaymentMethodChoice, type CardPaymentDetails } from '@/components/admin/PaymentMethodModal'
import FaturarComandaModal from '@/components/admin/comandas/FaturarComandaModal'
import EditServicesModal from '@/components/admin/EditServicesModal'

type Props = {
  appointmentId: string
  isPaid: boolean
  backHref: string
  customerName: string
  customerPhone: string | null
  /** businessId obrigatório pra step de cartão (maquininha/bandeira/taxa). */
  businessId: string
  /** Hora de início (HH:MM) · necessária pro modal de editar serviços recalcular fim. */
  startTime: string
  totalPrice: number | null
  /** Nome do serviço · pré-pintado no modal FATURAR. */
  serviceName?: string | null
  /** Profissional default das vendas de produto adicionadas. */
  professionalId?: string | null
  /** Se passado, chamado após sucesso em vez de navegar pro backHref. Usado pelo drawer inline. */
  onDone?: () => void
}

export default function AppointmentActions({
  appointmentId,
  isPaid,
  backHref,
  customerName,
  customerPhone,
  businessId,
  startTime,
  totalPrice,
  serviceName,
  professionalId,
  onDone,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [faturarOpen, setFaturarOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Mensagens de WhatsApp (modelos editáveis) · carregadas sob demanda e
  // cacheadas. Envio é manual: abre o wa.me com o texto pronto.
  const [waMsgs, setWaMsgs] = useState<{ confirmation: string; reminder: string; phone: string; hasPhone: boolean } | null>(null)
  const [waLoading, setWaLoading] = useState<null | 'confirmation' | 'reminder'>(null)

  async function postPayment(body: Record<string, unknown>): Promise<boolean> {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/admin/appointments/${appointmentId}/payment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Erro ao atualizar pagamento')
      return false
    }
    return true
  }

  async function desmarcarPago() {
    const ok = await postPayment({ paid: false })
    if (!ok) return
    if (onDone) onDone()
    else router.refresh()
  }

  async function confirmarMetodo(method: PaymentMethodChoice, cardDetails?: CardPaymentDetails) {
    if (!method) {
      // null = "Pagar depois" — só fecha o modal
      setPaymentOpen(false)
      return
    }
    const body: Record<string, unknown> = { method }
    if (method === 'card' && cardDetails) {
      body.device_id = cardDetails.device_id
      body.card_brand = cardDetails.card_brand
      body.card_type = cardDetails.card_type
      body.fee_percent = cardDetails.fee_percent
      body.installments = cardDetails.installments
    }
    const ok = await postPayment(body)
    if (!ok) return
    setPaymentOpen(false)
    if (onDone) onDone()
    else router.refresh()
  }

  async function cancelar() {
    setLoading(true)
    setError(null)
    // Rota server-side com read-after-write · não dá pra confiar em supabase
    // client direto: RLS pode bloquear silenciosamente (0 rows · sem error).
    const res = await fetch(`/api/admin/appointments/${appointmentId}/cancel`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error === 'verification_failed'
        ? `Cancelamento não foi confirmado pelo banco (status atual: ${d.actual_status ?? 'desconhecido'})`
        : (d.detail || d.error || 'Erro ao cancelar'))
      return
    }
    setConfirmCancel(false)
    if (onDone) {
      onDone()
    } else {
      router.push(backHref)
      router.refresh()
    }
  }

  async function openWhatsApp(kind: 'confirmation' | 'reminder') {
    setError(null)
    let msgs = waMsgs
    if (!msgs) {
      setWaLoading(kind)
      try {
        const res = await fetch(`/api/admin/appointments/${appointmentId}/whatsapp-messages`)
        const d = await res.json()
        if (!res.ok) {
          setError(d.error || 'Erro ao montar a mensagem')
          setWaLoading(null)
          return
        }
        msgs = d
        setWaMsgs(d)
      } catch {
        setError('Erro de conexão')
        setWaLoading(null)
        return
      }
      setWaLoading(null)
    }
    if (!msgs || !msgs.hasPhone || !msgs.phone) {
      setError('Cliente sem telefone cadastrado')
      return
    }
    const phone = msgs.phone.startsWith('55') ? msgs.phone : `55${msgs.phone}`
    const text = kind === 'confirmation' ? msgs.confirmation : msgs.reminder
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      {error && (
        <div
          className="rounded-xl px-3 py-2 text-xs"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Faturar (abre modal de comanda com produtos) · ou desmarcar se já pago */}
        <button
          type="button"
          onClick={() => (isPaid ? desmarcarPago() : setFaturarOpen(true))}
          disabled={loading}
          className="w-full py-3.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 transition-all hover:-translate-y-px active:scale-[0.98] disabled:opacity-50"
          style={
            isPaid
              ? {
                  background: 'var(--admin-surface)',
                  color: 'var(--admin-text-mute)',
                  border: '1px solid var(--admin-border)',
                }
              : {
                  background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
                  color: '#fff',
                  borderTop: '1px solid rgba(255,255,255,0.25)',
                  boxShadow: '0 10px 24px -8px rgba(5,150,105,0.50), 0 2px 4px rgba(0,0,0,0.08)',
                }
          }
        >
          <IconCheck size={16} /> {isPaid ? 'Desmarcar pagamento' : 'Faturar atendimento'}
        </button>

        {/* WhatsApp · um botão só (lembrete · modelo editável · envio manual) */}
        <button
          type="button"
          onClick={() => openWhatsApp('reminder')}
          disabled={waLoading !== null}
          className="w-full py-3.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 transition-all hover:-translate-y-px active:scale-[0.98] disabled:opacity-50"
          style={{
            background: 'linear-gradient(180deg, #22C55E 0%, #1A8C45 100%)',
            color: '#fff',
            borderTop: '1px solid rgba(255,255,255,0.25)',
            boxShadow: '0 10px 24px -8px rgba(26,140,69,0.55), 0 2px 4px rgba(0,0,0,0.08)',
          }}
        >
          <IconWhatsapp size={16} /> {waLoading === 'reminder' ? 'Abrindo…' : 'Enviar WhatsApp'}
        </button>
      </div>

      {/* Editar atendimento · adiciona/troca serviços no MESMO agendamento
          (mesma data) · agiliza quando o dono adiciona serviço durante o
          atendimento sem criar venda solta. */}
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        disabled={loading}
        className="w-full py-3 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        style={{
          background: 'var(--admin-surface)',
          color: 'var(--admin-text)',
          border: '1px solid var(--admin-border)',
        }}
      >
        <IconSettings size={15} /> Editar atendimento
      </button>

      {/* Cancelar atendimento · ação destrutiva separada */}
      <button
        type="button"
        onClick={() => setConfirmCancel(true)}
        disabled={loading}
        className="w-full py-3 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        style={{
          background: 'transparent',
          color: '#DC2626',
          border: '1px solid rgba(220,38,38,0.30)',
        }}
      >
        <IconClose size={14} /> Cancelar atendimento
      </button>

      <ConfirmActionModal
        open={confirmCancel}
        title="Cancelar este atendimento?"
        message="O cliente vai ver como cancelado. Você pode reverter mudando o status manualmente depois."
        confirmLabel="Sim, cancelar"
        cancelLabel="Voltar"
        tone="danger"
        loading={loading}
        onConfirm={cancelar}
        onClose={() => setConfirmCancel(false)}
      />

      <PaymentMethodModal
        open={paymentOpen}
        clientName={customerName}
        totalPrice={totalPrice}
        businessId={businessId}
        loading={loading}
        onChoose={confirmarMetodo}
        onClose={() => setPaymentOpen(false)}
      />

      {editOpen && (
        <EditServicesModal
          appointmentId={appointmentId}
          startTime={startTime}
          onClose={() => {
            setEditOpen(false)
            if (onDone) onDone()
            else router.refresh()
          }}
        />
      )}

      <FaturarComandaModal
        open={faturarOpen}
        appointmentId={appointmentId}
        appointmentServiceName={serviceName ?? 'Atendimento'}
        appointmentTotal={totalPrice ?? 0}
        appointmentProfessionalId={professionalId ?? null}
        customerName={customerName}
        businessId={businessId}
        onClose={() => {
          setFaturarOpen(false)
          // O modal já navega pra /admin/comandas/[id] após sucesso · só atualiza UI local
          if (onDone) onDone()
          else router.refresh()
        }}
      />
    </>
  )
}
