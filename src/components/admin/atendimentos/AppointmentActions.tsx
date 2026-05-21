'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconCheck, IconWhatsapp, IconClose } from '@/components/ui/Icon'
import ConfirmActionModal from '@/components/admin/ConfirmActionModal'
import PaymentMethodModal, { type PaymentMethodChoice, type CardPaymentDetails } from '@/components/admin/PaymentMethodModal'

type Props = {
  appointmentId: string
  isPaid: boolean
  backHref: string
  customerName: string
  customerPhone: string | null
  /** businessId obrigatório pra step de cartão (maquininha/bandeira/taxa). */
  businessId: string
  totalPrice: number | null
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
  totalPrice,
  onDone,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    // Update status direto via supabase client (RLS protege)
    const { createClient } = await import('@/lib/supabase/client')
    const sb = createClient()
    const { error: e } = await sb
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointmentId)
    setLoading(false)
    if (e) {
      setError('Erro ao cancelar')
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

  function enviarWhatsApp() {
    if (!customerPhone) {
      setError('Cliente sem telefone cadastrado')
      return
    }
    const phoneDigits = customerPhone.replace(/\D/g, '')
    const msg = `Oi ${customerName}! Confirmando seu atendimento.`
    window.open(`https://wa.me/55${phoneDigits}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer')
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
        {/* Marcar/Desmarcar pago · pago abre modal de método */}
        <button
          type="button"
          onClick={() => (isPaid ? desmarcarPago() : setPaymentOpen(true))}
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
          <IconCheck size={16} /> {isPaid ? 'Desmarcar pagamento' : 'Marcar como pago'}
        </button>

        {/* WhatsApp */}
        <button
          type="button"
          onClick={enviarWhatsApp}
          disabled={!customerPhone}
          className="w-full py-3.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 transition-all hover:-translate-y-px active:scale-[0.98] disabled:opacity-40"
          style={{
            background: 'linear-gradient(180deg, #22C55E 0%, #1A8C45 100%)',
            color: '#fff',
            borderTop: '1px solid rgba(255,255,255,0.25)',
            boxShadow: '0 10px 24px -8px rgba(26,140,69,0.55), 0 2px 4px rgba(0,0,0,0.08)',
          }}
        >
          <IconWhatsapp size={16} /> Enviar WhatsApp
        </button>
      </div>

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
    </>
  )
}
