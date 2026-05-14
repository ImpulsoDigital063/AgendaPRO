'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  suggestBirthdayTemplates,
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
  /** Total de aniversariantes do mês atual. Calculado server-side. */
  aniversariantesTotal: number
  /** Aniversariantes que ainda não têm cupom ativo (alvo direto da campanha). */
  aniversariantesWithoutCoupon: number
  /** Nome do mês atual em pt-BR (ex: "maio"). */
  mesAtualNome: string
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

export default function AniversariantesView({
  businessSlug,
  businessName,
  businessDescription,
  aniversariantesTotal,
  aniversariantesWithoutCoupon,
  mesAtualNome,
}: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'config' | 'send'>('config')
  // Defaults mais generosos que Oi Sumido — aniversário é mais especial.
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('percent')
  const [discountValue, setDiscountValue] = useState('20')
  const [validityDays, setValidityDays] = useState('30')
  const [templateIdx, setTemplateIdx] = useState(0)
  const [customMessage, setCustomMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [campaignResult, setCampaignResult] = useState<CouponWithCustomer[] | null>(null)
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({})
  const [showAllCoupons, setShowAllCoupons] = useState(false)

  const templates = useMemo(() => suggestBirthdayTemplates(businessDescription), [businessDescription])

  useEffect(() => {
    if (!customMessage || customMessage === templates[templateIdx]) {
      setCustomMessage(templates[templateIdx] || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateIdx])

  const sampleName = useMemo(() => sampleNameFor(businessDescription), [businessDescription])

  const previewMessage = useMemo(() => {
    const sample = customMessage || templates[templateIdx] || ''
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (Number(validityDays) || 30))
    const discountStr = formatDiscount(discountType, Number(discountValue) || 0)
    const validityStr = formatValidity(expiresAt)
    return fillTemplate(sample, {
      nome: sampleName,
      negocio: businessName,
      desconto: discountStr,
      validade: validityStr,
      link: `${typeof window !== 'undefined' ? window.location.origin : ''}/${businessSlug}?cupom=PROABC12`,
    })
  }, [customMessage, templates, templateIdx, validityDays, discountType, discountValue, businessName, businessSlug, sampleName])

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
        target: 'aniversariantes_mes',
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
            background: 'linear-gradient(135deg, rgba(59,130,246,0.18) 0%, color-mix(in srgb, var(--brand-primary) 12%, var(--admin-surface)) 100%)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
            Campanha de aniversário criada
          </p>
          <p className="text-xl font-extrabold mt-1 leading-tight" style={{ color: 'var(--admin-text)' }}>
            {campaignResult.length} {campaignResult.length === 1 ? 'cupom pronto' : 'cupons prontos'}
          </p>
          <p className="text-[11px] mt-2" style={{ color: 'var(--admin-text-mute)' }}>
            Toque em &quot;WhatsApp&quot; em cada aniversariante pra abrir conversa pré-formatada. Você confirma o envio.
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
              Ver mais {campaignResult.length - 10} {campaignResult.length - 10 === 1 ? 'aniversariante' : 'aniversariantes'}
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
      {/* Card prioritário — aniversariantes do mês sem cupom ativo. */}
      {aniversariantesWithoutCoupon > 0 ? (
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.10), rgba(59,130,246,0.04))',
            border: '1px solid rgba(59,130,246,0.30)',
          }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold" style={{ color: '#3B82F6' }}>
              {aniversariantesWithoutCoupon} aniversariante{aniversariantesWithoutCoupon === 1 ? '' : 's'} em {mesAtualNome}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
              {aniversariantesTotal === aniversariantesWithoutCoupon
                ? 'Sem cupom ativo · pronto pra disparar campanha.'
                : `${aniversariantesTotal - aniversariantesWithoutCoupon} já têm cupom · ${aniversariantesWithoutCoupon} ainda sem`}
            </p>
          </div>
        </div>
      ) : aniversariantesTotal === 0 ? (
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-divider)',
          }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Nenhum aniversariante em {mesAtualNome}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
            Pra cliente entrar nessa lista, precisa ter data de nascimento cadastrada
            (importação ou cadastro manual no perfil).
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.30)',
          }}
        >
          <p className="text-sm font-bold" style={{ color: '#10B981' }}>
            Todos os {aniversariantesTotal} aniversariante{aniversariantesTotal === 1 ? '' : 's'} de {mesAtualNome} já têm cupom ativo
          </p>
        </div>
      )}

      {/* Form de campanha */}
      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
            Desconto
          </label>
          <div className="flex gap-2 mt-1.5">
            <button
              type="button"
              onClick={() => setDiscountType('fixed')}
              className="flex-1 py-2 rounded-lg text-xs font-semibold"
              style={{
                background: discountType === 'fixed' ? 'var(--admin-accent)' : 'var(--admin-input-bg)',
                color: discountType === 'fixed' ? '#fff' : 'var(--admin-text)',
                border: '1px solid var(--admin-border)',
              }}
            >
              R$ (valor fixo)
            </button>
            <button
              type="button"
              onClick={() => setDiscountType('percent')}
              className="flex-1 py-2 rounded-lg text-xs font-semibold"
              style={{
                background: discountType === 'percent' ? 'var(--admin-accent)' : 'var(--admin-input-bg)',
                color: discountType === 'percent' ? '#fff' : 'var(--admin-text)',
                border: '1px solid var(--admin-border)',
              }}
            >
              % (porcentagem)
            </button>
          </div>
          <input
            type="number"
            inputMode="numeric"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            min={1}
            className="admin-input w-full mt-2 px-3 py-2.5 text-sm"
            placeholder={discountType === 'percent' ? '20' : '15'}
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
            Validade
          </label>
          <div className="flex items-center gap-2 mt-1.5">
            <input
              type="number"
              inputMode="numeric"
              value={validityDays}
              onChange={(e) => setValidityDays(e.target.value)}
              min={1}
              max={365}
              className="admin-input w-24 px-3 py-2.5 text-sm"
            />
            <span className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>dias</span>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
            Mensagem · WhatsApp
          </label>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {templates.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setTemplateIdx(idx)
                  setCustomMessage(templates[idx])
                }}
                className="text-[11px] px-2.5 py-1 rounded-md font-semibold"
                style={{
                  background: templateIdx === idx ? 'var(--admin-accent)' : 'var(--admin-input-bg)',
                  color: templateIdx === idx ? '#fff' : 'var(--admin-text-mute)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                Modelo {idx + 1}
              </button>
            ))}
          </div>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={4}
            maxLength={2000}
            className="admin-input w-full mt-2 px-3 py-2.5 text-sm resize-y"
            placeholder="Mensagem que será enviada via WhatsApp"
          />
          <p className="text-[10px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
            Placeholders: {'{nome}'} · {'{negocio}'} · {'{desconto}'} · {'{validade}'} · {'{link}'}
          </p>
        </div>

        <div
          className="rounded-xl p-3"
          style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-faded)' }}>
            Preview · como {sampleName} vai receber
          </p>
          <p className="text-xs whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>
            {previewMessage}
          </p>
        </div>

        {error && (
          <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>
        )}

        <button
          type="button"
          onClick={gerarCampanha}
          disabled={submitting || aniversariantesWithoutCoupon === 0}
          className="w-full py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-50"
          style={{
            background: 'var(--admin-accent)',
            color: '#fff',
          }}
        >
          {submitting
            ? 'Gerando cupons...'
            : aniversariantesWithoutCoupon === 0
              ? 'Sem aniversariantes pra acionar'
              : `Gerar ${aniversariantesWithoutCoupon} cupom${aniversariantesWithoutCoupon === 1 ? '' : 's'} de aniversário`}
        </button>
      </div>
    </div>
  )
}
