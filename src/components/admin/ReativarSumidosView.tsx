'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  suggestTemplates,
  fillTemplate,
  formatValidity,
  formatDiscount,
  sampleNameFor,
} from '@/lib/coupon-templates'
import { initialsFor, avatarGradient } from '@/lib/client-display'
import { IconWhatsapp, IconCheck } from '@/components/ui/Icon'

type Props = {
  businessSlug: string
  businessName: string
  businessDescription: string | null
  existingCoupons: {
    id: string
    code: string
    sent_at: string | null
    used_at: string | null
    expires_at: string
    customer_id: string | null
  }[]
}

type Coupon = {
  id: string
  code: string
  customer_id: string | null
  discount_type: 'fixed' | 'percent'
  discount_value: number
  expires_at: string
  whatsapp_message: string | null
  sent_at: string | null
  used_at: string | null
}

type Customer = {
  id: string
  name: string
  phone: string
  email: string | null
}

type CouponWithCustomer = {
  coupon: Coupon
  customer: Customer | undefined
}

export default function ReativarSumidosView({
  businessSlug,
  businessName,
  businessDescription,
  existingCoupons,
}: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'config' | 'send'>('config')
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed')
  const [discountValue, setDiscountValue] = useState('10')
  const [validityDays, setValidityDays] = useState('14')
  const [templateIdx, setTemplateIdx] = useState(0)
  const [customMessage, setCustomMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [campaignResult, setCampaignResult] = useState<CouponWithCustomer[] | null>(null)
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({})
  // Paginação da lista de cupons gerados — campanha pode ter 50+ sumidos.
  const [showAllCoupons, setShowAllCoupons] = useState(false)

  const templates = useMemo(() => suggestTemplates(businessDescription), [businessDescription])

  // Sync customMessage com template selecionado
  useEffect(() => {
    if (!customMessage || customMessage === templates[templateIdx]) {
      setCustomMessage(templates[templateIdx] || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateIdx])

  // Nome do preview coerente com o nicho do business — barbearia
  // mostra "Lucas", salão "Camila" etc. Sem isso, dono via "Maria"
  // mesmo em barbearia (clientela masculina), gerando ruído
  // cognitivo no preview.
  const sampleName = useMemo(() => sampleNameFor(businessDescription), [businessDescription])

  const previewMessage = useMemo(() => {
    const sample = customMessage || templates[templateIdx] || ''
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (Number(validityDays) || 14))
    const discountStr = formatDiscount(discountType, Number(discountValue) || 0)
    const validityStr = formatValidity(expiresAt)
    return fillTemplate(sample, {
      nome: sampleName,
      negocio: businessName,
      desconto: discountStr,
      validade: validityStr,
      link: `${typeof window !== 'undefined' ? window.location.origin : ''}/${businessSlug}?cupom=OIABC123`,
    })
  }, [customMessage, templates, templateIdx, validityDays, discountType, discountValue, businessName, businessSlug, sampleName])

  // Stats dos cupons existentes
  const couponStats = useMemo(() => {
    const now = new Date().toISOString()
    let active = 0, used = 0, expired = 0, sent = 0
    for (const c of existingCoupons) {
      if (c.used_at) used++
      else if (c.expires_at < now) expired++
      else active++
      if (c.sent_at) sent++
    }
    return { active, used, expired, sent, total: existingCoupons.length }
  }, [existingCoupons])

  async function gerarCampanha() {
    setError(null)
    const v = Number(discountValue)
    if (!Number.isFinite(v) || v <= 0) {
      setError('Valor do desconto inválido')
      return
    }
    if (discountType === 'percent' && v > 100) {
      setError('Percentual máximo 100%')
      return
    }
    const days = Number(validityDays)
    if (!Number.isFinite(days) || days < 1 || days > 365) {
      setError('Validade entre 1 e 365 dias')
      return
    }
    if (!customMessage.trim()) {
      setError('Mensagem obrigatória')
      return
    }

    setSubmitting(true)
    const res = await fetch('/api/admin/coupons/campaign', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        discount_type: discountType,
        discount_value: v,
        validity_days: days,
        message_template: customMessage,
      }),
    })
    setSubmitting(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Erro')
      return
    }
    const data = await res.json()
    setCampaignResult(data.coupons || [])
    setStep('send')
  }

  async function abrirWhatsApp(item: CouponWithCustomer) {
    if (!item.customer) return
    const phoneDigits = item.customer.phone.replace(/\D/g, '')
    if (phoneDigits.length < 10) return

    const expiresAt = new Date(item.coupon.expires_at)
    const discountStr = formatDiscount(item.coupon.discount_type, Number(item.coupon.discount_value))
    const validityStr = formatValidity(expiresAt)
    const link = `${window.location.origin}/${businessSlug}?cupom=${item.coupon.code}`

    const msg = fillTemplate(item.coupon.whatsapp_message || '', {
      nome: item.customer.name,
      negocio: businessName,
      desconto: discountStr,
      validade: validityStr,
      link,
    })

    const url = `https://wa.me/55${phoneDigits}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank', 'noopener,noreferrer')

    // Marca como enviado (otimista + API)
    setSentMap((prev) => ({ ...prev, [item.coupon.id]: true }))
    fetch(`/api/admin/coupons/${item.coupon.id}/sent`, { method: 'POST' })
      .catch(() => { /* silently */ })
  }

  if (step === 'send' && campaignResult) {
    return (
      <div className="space-y-4">
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.18) 0%, color-mix(in srgb, var(--brand-primary) 12%, var(--admin-surface)) 100%)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
            Campanha criada
          </p>
          <p className="text-xl font-extrabold mt-1 leading-tight" style={{ color: 'var(--admin-text)' }}>
            {campaignResult.length} cupom{campaignResult.length === 1 ? '' : 's'} pronto{campaignResult.length === 1 ? '' : 's'}
          </p>
          <p className="text-[11px] mt-2" style={{ color: 'var(--admin-text-mute)' }}>
            Toque em &quot;WhatsApp&quot; em cada cliente pra abrir conversa pré-formatada. Você confirma o envio.
          </p>
        </div>

        <div className="space-y-2">
          {(showAllCoupons ? campaignResult : campaignResult.slice(0, 10)).map((item) => {
            if (!item.customer) return null
            const sent = !!sentMap[item.coupon.id]
            const phoneClean = item.customer.phone.replace(/\D/g, '')
            const validPhone = phoneClean.length >= 10
            return (
              <div
                key={item.coupon.id}
                className="admin-card p-3 flex items-center gap-3"
                style={sent ? { opacity: 0.7 } : undefined}
              >
                <span
                  aria-hidden
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
                  style={{ background: avatarGradient(item.customer.name) }}
                >
                  {initialsFor(item.customer.name)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--admin-text)' }}>
                    {item.customer.name}
                  </p>
                  <p className="text-[11px] truncate" style={{ color: 'var(--admin-text-faded)' }}>
                    Cupom {item.coupon.code}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => abrirWhatsApp(item)}
                  disabled={!validPhone || sent}
                  className="text-[11px] font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                  style={{
                    background: sent ? 'var(--admin-success-bg, rgba(16,185,129,0.12))' : 'rgba(37,211,102,0.12)',
                    color: sent ? 'var(--admin-success, #16A34A)' : '#16A34A',
                    border: '1px solid rgba(37,211,102,0.25)',
                  }}
                >
                  {sent ? <IconCheck size={11} /> : <IconWhatsapp size={11} />}
                  {sent ? 'Enviado' : 'WhatsApp'}
                </button>
              </div>
            )
          })}
          {!showAllCoupons && campaignResult.length > 10 && (
            <button
              type="button"
              onClick={() => setShowAllCoupons(true)}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 transition-opacity hover:opacity-90 text-sm font-semibold mt-1"
              style={{
                background: 'var(--admin-surface)',
                color: 'var(--admin-accent)',
                border: '1px solid var(--admin-divider)',
              }}
            >
              Ver mais {campaignResult.length - 10} {campaignResult.length - 10 === 1 ? 'cliente' : 'clientes'}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => router.push('/admin/clientes')}
          className="w-full py-3 rounded-xl text-sm font-semibold"
          style={{
            background: 'var(--admin-accent-bg)',
            color: 'var(--admin-text)',
            border: '1px solid var(--admin-border)',
          }}
        >
          Voltar pra Clientes
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Stats existentes (se houver) */}
      {couponStats.total > 0 && (
        <div className="admin-card p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--admin-text-mute)' }}>
            Cupons disparados
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--admin-accent)' }}>
                {couponStats.active}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--admin-text-faded)' }}>Ativos</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--admin-success, #10B981)' }}>
                {couponStats.used}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--admin-text-faded)' }}>Usados</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--admin-text-faded)' }}>
                {couponStats.expired}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--admin-text-faded)' }}>Expirados</p>
            </div>
          </div>
        </div>
      )}

      {/* Como funciona — explicação visual do fluxo, antes do form */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(168,85,247,0.06))',
          border: '1px solid var(--admin-border)',
        }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--admin-accent)' }}>
          Como funciona
        </p>
        <ol className="space-y-2 text-xs leading-relaxed">
          <li className="flex gap-2.5" style={{ color: 'var(--admin-text-2)' }}>
            <span className="font-bold flex-shrink-0" style={{ color: 'var(--admin-accent)' }}>1.</span>
            <span>Você define o desconto e escolhe a mensagem aqui</span>
          </li>
          <li className="flex gap-2.5" style={{ color: 'var(--admin-text-2)' }}>
            <span className="font-bold flex-shrink-0" style={{ color: 'var(--admin-accent)' }}>2.</span>
            <span>Sistema cria <strong>1 cupom único por cliente sumido</strong> (substitui automaticamente nome, valor e link)</span>
          </li>
          <li className="flex gap-2.5" style={{ color: 'var(--admin-text-2)' }}>
            <span className="font-bold flex-shrink-0" style={{ color: 'var(--admin-accent)' }}>3.</span>
            <span>Aparece a lista de clientes com botão <strong>WhatsApp</strong> em cada — você clica pra abrir conversa pronta</span>
          </li>
          <li className="flex gap-2.5" style={{ color: 'var(--admin-text-2)' }}>
            <span className="font-bold flex-shrink-0" style={{ color: 'var(--admin-accent)' }}>4.</span>
            <span>Cliente clica no link, agenda, e o desconto é aplicado automático</span>
          </li>
        </ol>
      </div>

      {/* Form de campanha */}
      <div className="admin-card p-4 space-y-5">
        {/* Etapa 1: Desconto */}
        <div>
          <p className="text-sm font-bold mb-1" style={{ color: 'var(--admin-text)' }}>
            1. Quanto de desconto vai dar?
          </p>
          <p className="text-[11px] mb-2.5" style={{ color: 'var(--admin-text-mute)' }}>
            Escolha valor fixo (R$) ou porcentagem, e quantos dias o cupom vale.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              type="button"
              onClick={() => setDiscountType('fixed')}
              className="py-2 rounded-lg text-xs font-semibold transition-colors"
              style={
                discountType === 'fixed'
                  ? { background: 'var(--admin-accent)', color: '#fff' }
                  : { background: 'var(--admin-input-bg)', color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }
              }
            >
              R$ fixo
            </button>
            <button
              type="button"
              onClick={() => setDiscountType('percent')}
              className="py-2 rounded-lg text-xs font-semibold transition-colors"
              style={
                discountType === 'percent'
                  ? { background: 'var(--admin-accent)', color: '#fff' }
                  : { background: 'var(--admin-input-bg)', color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }
              }
            >
              % off
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === 'percent' ? '10' : '10,00'}
              className="admin-input flex-1 px-3 py-2.5 text-sm"
            />
            <input
              type="number"
              inputMode="numeric"
              value={validityDays}
              onChange={(e) => setValidityDays(e.target.value)}
              min={1}
              max={365}
              className="admin-input w-20 px-3 py-2.5 text-sm text-center"
              aria-label="Dias de validade"
            />
            <span className="self-center text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
              dias
            </span>
          </div>
        </div>

        {/* Etapa 2: Mensagem */}
        <div>
          <p className="text-sm font-bold mb-1" style={{ color: 'var(--admin-text)' }}>
            2. Como vai chamar o cliente de volta?
          </p>
          <p className="text-[11px] mb-2.5" style={{ color: 'var(--admin-text-mute)' }}>
            Escolha 1 dos {templates.length} modelos prontos ou edite à vontade. <strong style={{ color: 'var(--admin-accent)' }}>{'{nome}'}, {'{negocio}'}, {'{desconto}'}, {'{validade}'} e {'{link}'}</strong> são preenchidos automaticamente — cada cliente recebe a mensagem com os dados dele.
          </p>
          <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
            {templates.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setTemplateIdx(i)
                  setCustomMessage(templates[i])
                }}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                style={
                  templateIdx === i
                    ? { background: 'var(--admin-accent)', color: '#fff' }
                    : { background: 'var(--admin-input-bg)', color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }
                }
              >
                Modelo {i + 1}
              </button>
            ))}
          </div>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={4}
            className="admin-input w-full px-3 py-2 text-sm resize-none"
            placeholder="Sua mensagem aqui..."
          />
        </div>

        {/* Etapa 3: Preview */}
        <div>
          <p className="text-sm font-bold mb-1" style={{ color: 'var(--admin-text)' }}>
            3. Veja como vai chegar pro cliente
          </p>
          <p className="text-[11px] mb-2.5" style={{ color: 'var(--admin-text-mute)' }}>
            Exemplo com o nome <strong>{sampleName}</strong>. Cada cliente sumido recebe a mensagem com o nome dele e um cupom único.
          </p>
          <div
            className="rounded-xl p-3 text-sm whitespace-pre-wrap leading-relaxed"
            style={{
              background: 'rgba(37,211,102,0.08)',
              border: '1px solid rgba(37,211,102,0.2)',
              color: 'var(--admin-text)',
            }}
          >
            {previewMessage}
          </div>
        </div>

        {error && (
          <p className="text-xs" style={{ color: 'var(--admin-danger, #EF4444)' }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={gerarCampanha}
          disabled={submitting}
          className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
            color: '#fff',
            boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
          }}
        >
          {submitting ? 'Gerando cupons...' : 'Gerar cupons e ver lista de envio →'}
        </button>
      </div>
    </div>
  )
}
