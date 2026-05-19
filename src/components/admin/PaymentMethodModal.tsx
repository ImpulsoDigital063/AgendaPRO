'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { IconClose, IconCheck, IconArrowLeft } from '@/components/ui/Icon'
import {
  CARD_BRANDS,
  CARD_BRAND_LABEL,
  type CardBrand,
  type CardType,
  type MerchantDevice,
  type MerchantDeviceFee,
} from '@/lib/types'

export type PaymentMethodChoice = 'pix' | 'cash' | 'card' | 'points' | null

export type CardPaymentDetails = {
  device_id: string | null
  card_brand: CardBrand
  card_type: CardType
  fee_percent: number
  installments: number
}

type Props = {
  open: boolean
  clientName: string
  totalPrice?: number | null
  /** Quando fornecido, ao escolher 'card' abre step de detalhes (maquininha + bandeira). */
  businessId?: string
  /** Modo "Atendi +bonus" altera o copy e a cor do header. */
  withPunctualityBonus?: boolean
  punctualityPoints?: number
  loading?: boolean
  /** null = "Pagar depois". Pra cartão, vem segundo argumento com detalhes da taxa. */
  onChoose: (method: PaymentMethodChoice, cardDetails?: CardPaymentDetails) => void
  onClose: () => void
}

type MethodOption = {
  id: NonNullable<PaymentMethodChoice>
  label: string
  symbol: string
  color: string
  glow: string
}

const METHODS: MethodOption[] = [
  { id: 'pix',    label: 'Pix',      symbol: 'PIX', color: '#10B981', glow: 'rgba(16,185,129,0.18)' },
  { id: 'cash',   label: 'Dinheiro', symbol: '$',   color: '#16A34A', glow: 'rgba(22,163,74,0.18)' },
  { id: 'card',   label: 'Cartão',   symbol: '▭',   color: '#3B82F6', glow: 'rgba(59,130,246,0.18)' },
  { id: 'points', label: 'Pontos',   symbol: '★',   color: '#F59E0B', glow: 'rgba(245,158,11,0.18)' },
]

function formatPrice(value: number | null | undefined) {
  if (value == null || value <= 0) return null
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function PaymentMethodModal({
  open,
  clientName,
  totalPrice,
  businessId,
  withPunctualityBonus = false,
  punctualityPoints = 0,
  loading = false,
  onChoose,
  onClose,
}: Props) {
  // Step 2 — abre quando escolhe 'card' e businessId existe
  const [cardStep, setCardStep] = useState(false)

  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) {
        if (cardStep) setCardStep(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, loading, onClose, cardStep])

  // Reset cardStep ao fechar
  useEffect(() => {
    if (!open) setCardStep(false)
  }, [open])

  // Portal-mount guard: createPortal precisa de document. Sem essa flag,
  // SSR explode no build. Setado apos primeiro mount no client.
  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => { setPortalReady(true) }, [])

  if (!open || !portalReady) return null

  function handleMethodClick(method: NonNullable<PaymentMethodChoice>) {
    if (method === 'card' && businessId) {
      setCardStep(true)
      return
    }
    onChoose(method)
  }

  const priceLabel = formatPrice(totalPrice)

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={() => !loading && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
        }}
      >
        {cardStep && businessId ? (
          <CardStep
            businessId={businessId}
            totalPrice={totalPrice}
            clientName={clientName}
            loading={loading}
            onBack={() => setCardStep(false)}
            onConfirm={(details) => onChoose('card', details)}
            onClose={onClose}
          />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between p-5 pb-3">
              <div className="min-w-0">
                <p
                  className="text-[11px] font-semibold uppercase tracking-wider mb-1"
                  style={{ color: 'var(--admin-text-faded, #94A3B8)' }}
                >
                  {withPunctualityBonus ? `Atendido + ${punctualityPoints} pts pontualidade` : 'Atendimento concluído'}
                </p>
                <h3
                  id="payment-modal-title"
                  className="text-lg font-bold leading-tight"
                  style={{ color: 'var(--admin-text, #0F172A)' }}
                >
                  Como {clientName} pagou?
                </h3>
                {priceLabel && (
                  <p
                    className="text-sm font-semibold mt-1.5 tabular-nums"
                    style={{ color: 'var(--admin-text-2, #475569)' }}
                  >
                    {priceLabel}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                disabled={loading}
                aria-label="Fechar"
                className="p-1 rounded-full transition-opacity hover:opacity-70 disabled:opacity-30 flex-shrink-0"
                style={{ color: 'var(--admin-text-mute, #64748B)' }}
              >
                <IconClose size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 px-5 pb-3">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleMethodClick(m.id)}
                  disabled={loading}
                  className="relative rounded-2xl p-3.5 text-left transition-all disabled:opacity-40 hover:translate-y-[-1px] active:scale-[0.98]"
                  style={{
                    background: 'var(--admin-surface, #F8FAFC)',
                    border: `1.5px solid ${m.color}40`,
                    minHeight: 76,
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center mb-2 font-bold"
                    style={{
                      background: m.glow,
                      color: m.color,
                      fontSize: m.id === 'pix' ? 10 : 18,
                    }}
                  >
                    {m.symbol}
                  </div>
                  <p
                    className="text-sm font-bold leading-tight"
                    style={{ color: 'var(--admin-text, #0F172A)' }}
                  >
                    {m.label}
                  </p>
                </button>
              ))}
            </div>

            {loading && (
              <div className="px-5 pb-4">
                <p className="text-xs text-center" style={{ color: 'var(--admin-text-faded)' }}>
                  Salvando...
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

/* ============================================================
 * Step 2 · Detalhes do cartão (maquininha + bandeira + tipo)
 * Carrega devices+fees do business, calcula taxa e líquido.
 * ============================================================ */
function CardStep({
  businessId,
  totalPrice,
  clientName,
  loading,
  onBack,
  onConfirm,
  onClose,
}: {
  businessId: string
  totalPrice?: number | null
  clientName: string
  loading: boolean
  onBack: () => void
  onConfirm: (details: CardPaymentDetails) => void
  onClose: () => void
}) {
  const supabase = createClient()
  const [devices, setDevices] = useState<MerchantDevice[]>([])
  const [fees, setFees] = useState<MerchantDeviceFee[]>([])
  const [fetching, setFetching] = useState(true)

  const [deviceId, setDeviceId] = useState<string>('')
  const [cardType, setCardType] = useState<CardType>('credit')
  const [brand, setBrand] = useState<CardBrand>('visa')
  const [installments, setInstallments] = useState<number>(1)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: devs } = await supabase
        .from('merchant_devices')
        .select('*')
        .eq('business_id', businessId)
        .eq('active', true)
        .order('name')
      if (cancelled) return
      const list = (devs ?? []) as MerchantDevice[]
      setDevices(list)
      if (list.length === 0) {
        setFetching(false)
        return
      }
      setDeviceId(list[0].id)
      const { data: f } = await supabase
        .from('merchant_device_fees')
        .select('*')
        .in('device_id', list.map((d) => d.id))
        .eq('active', true)
      if (cancelled) return
      setFees((f ?? []) as MerchantDeviceFee[])
      setFetching(false)
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  // Taxa atual baseada em device + brand + cardType + installments
  const currentFee = fees.find(
    (f) => f.device_id === deviceId && f.brand === brand && f.card_type === cardType,
  )
  const isParcelado = installments > 1
  const rate =
    currentFee == null
      ? null
      : isParcelado && currentFee.installment_rate_percent != null
        ? currentFee.installment_rate_percent
        : currentFee.rate_percent
  const allowsInstallments = currentFee?.allows_installments && cardType === 'credit'
  const maxInstallments = allowsInstallments ? (currentFee?.installments_max ?? 1) : 1

  // Reset installments quando troca tipo ou bandeira (evita ficar com 3x num débito)
  // Hook simples · effect com deps
  useEffect(() => {
    if (!allowsInstallments && installments > 1) setInstallments(1)
    if (installments > maxInstallments) setInstallments(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardType, brand, deviceId, allowsInstallments, maxInstallments])

  const feeValue =
    totalPrice && rate != null ? (totalPrice * rate) / 100 : null
  const netValue = totalPrice && rate != null ? totalPrice - (feeValue ?? 0) : null

  function handleConfirm() {
    onConfirm({
      device_id: deviceId || null,
      card_brand: brand,
      card_type: cardType,
      fee_percent: rate ?? 0,
      installments,
    })
  }

  return (
    <>
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="min-w-0 flex items-start gap-2">
          <button
            onClick={onBack}
            aria-label="Voltar"
            className="p-1 -ml-1 rounded-full"
            style={{ color: 'var(--admin-text-mute, #64748B)', marginTop: 2 }}
          >
            <IconArrowLeft size={18} />
          </button>
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'var(--admin-text-faded, #94A3B8)' }}
            >
              Pagamento em cartão
            </p>
            <h3 className="text-lg font-bold leading-tight" style={{ color: 'var(--admin-text, #0F172A)' }}>
              {clientName}
            </h3>
            {totalPrice != null && totalPrice > 0 && (
              <p className="text-sm font-semibold mt-1.5 tabular-nums" style={{ color: 'var(--admin-text-2, #475569)' }}>
                Valor bruto: {totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          disabled={loading}
          aria-label="Fechar"
          className="p-1 rounded-full transition-opacity hover:opacity-70 disabled:opacity-30 flex-shrink-0"
          style={{ color: 'var(--admin-text-mute, #64748B)' }}
        >
          <IconClose size={18} />
        </button>
      </div>

      <div className="px-5 pb-3 space-y-3">
        {fetching ? (
          <p className="text-sm text-center py-3" style={{ color: 'var(--admin-text-mute)' }}>
            Carregando…
          </p>
        ) : devices.length === 0 ? (
          <div
            className="rounded-xl p-3 text-xs"
            style={{
              background: 'color-mix(in srgb, var(--admin-warn,#F59E0B) 12%, transparent)',
              color: 'var(--admin-text-2)',
              border: '1px solid color-mix(in srgb, var(--admin-warn,#F59E0B) 30%, transparent)',
            }}
          >
            Nenhuma maquininha cadastrada ainda. Você pode confirmar o pagamento sem taxa agora · cadastrar maquininhas em Configurações → Maquininhas pra começar a controlar.
          </div>
        ) : (
          <>
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--admin-text-mute)' }}
              >
                Maquininha
              </p>
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="admin-input w-full text-sm py-2 px-2"
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--admin-text-mute)' }}
              >
                Tipo
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(['credit', 'debit'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCardType(t)}
                    className="rounded-lg p-2 text-sm font-semibold transition-all"
                    style={{
                      background:
                        cardType === t
                          ? 'color-mix(in srgb, var(--admin-accent) 14%, transparent)'
                          : 'var(--admin-surface)',
                      border: `1.5px solid ${
                        cardType === t ? 'color-mix(in srgb, var(--admin-accent) 45%, transparent)' : 'var(--admin-border)'
                      }`,
                      color: cardType === t ? 'var(--admin-accent)' : 'var(--admin-text-2)',
                    }}
                  >
                    {t === 'credit' ? 'Crédito' : 'Débito'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--admin-text-mute)' }}
              >
                Bandeira
              </p>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value as CardBrand)}
                className="admin-input w-full text-sm py-2 px-2"
              >
                {CARD_BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {CARD_BRAND_LABEL[b]}
                  </option>
                ))}
              </select>
            </div>

            {/* Parcelas · só se permitido pra essa combinação */}
            {allowsInstallments && maxInstallments > 1 && (
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--admin-text-mute)' }}
                >
                  Parcelas
                </p>
                <select
                  value={installments}
                  onChange={(e) => setInstallments(parseInt(e.target.value, 10))}
                  className="admin-input w-full text-sm py-2 px-2"
                >
                  {Array.from({ length: maxInstallments }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n === 1 ? 'À vista' : `${n}x` + (totalPrice ? ` de ${(totalPrice / n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : '')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Display taxa + líquido */}
            <div
              className="rounded-xl p-3 space-y-1.5 text-sm"
              style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}
            >
              {rate == null ? (
                <p style={{ color: 'var(--admin-warn,#F59E0B)' }}>
                  Sem taxa cadastrada pra essa combinação. Será salvo como 0%.
                </p>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--admin-text-mute)' }}>Taxa aplicada</span>
                    <span className="tabular-nums font-bold" style={{ color: 'var(--admin-text)' }}>
                      {rate.toString().replace('.', ',')}%
                    </span>
                  </div>
                  {feeValue != null && totalPrice != null && (
                    <>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--admin-text-mute)' }}>Taxa em R$</span>
                        <span className="tabular-nums" style={{ color: 'var(--admin-danger,#EF4444)' }}>
                          − {feeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-1.5" style={{ borderColor: 'var(--admin-divider)' }}>
                        <span style={{ color: 'var(--admin-text)' }}>Você recebe</span>
                        <span className="tabular-nums" style={{ color: 'var(--admin-success,#10B981)' }}>
                          {netValue?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div className="px-5 pb-5">
        <button
          onClick={handleConfirm}
          disabled={loading || fetching}
          className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40"
          style={{
            background: 'linear-gradient(135deg, var(--brand-primary,#3B82F6), var(--brand-secondary,#06B6D4))',
            color: '#fff',
          }}
        >
          {loading ? 'Salvando…' : 'Confirmar pagamento em cartão'}
        </button>
      </div>
    </>
  )
}
