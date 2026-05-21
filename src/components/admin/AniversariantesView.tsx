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
  /** Ticket médio do business (últimos 90 dias) · pra ROI. Default R$ 50. */
  ticketMedio?: number
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
  ticketMedio = 50,
}: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'config' | 'send'>('config')
  const [showFAQ, setShowFAQ] = useState(false)

  // ROI estimado · taxa de conversão alta (aniversário tem ~40% retorno) ·
  // mais que sumidos (20%) porque cliente sente atenção e quer comemorar
  const aniversariantesCount = aniversariantesWithoutCoupon > 0 ? aniversariantesWithoutCoupon : aniversariantesTotal
  const retornoEsperado = Math.floor(aniversariantesCount * 0.4)
  const receitaEstimada = retornoEsperado * ticketMedio
  const formatBRL = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
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
      {/* HERO EDUCATIVO · O QUE É e PRA QUE SERVE */}
      <div
        className="rounded-2xl p-5 lg:p-6"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 14%, var(--admin-surface)) 0%, color-mix(in srgb, var(--brand-secondary) 10%, var(--admin-surface)) 100%)',
          border: '1px solid var(--admin-border)',
        }}
      >
        <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--admin-accent)' }}>
          🎂 Mande um mimo de aniversário
        </p>
        <h2 className="text-lg lg:text-xl font-bold leading-snug" style={{ color: 'var(--admin-text)' }}>
          Cliente que recebe carinho no aniversário volta 3x mais.
        </h2>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
          Você define o desconto especial · sistema gera <strong>1 cupom único por aniversariante do mês</strong> · você dispara WhatsApp com mensagem personalizada. Carinho + desconto = volta certa.
        </p>
      </div>

      {/* CARD ROI · verde (oportunidade · não alerta) */}
      {aniversariantesCount > 0 ? (
        <div
          className="rounded-2xl p-4 lg:p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))',
            border: '1px solid rgba(16,185,129,0.30)',
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-3xl flex-shrink-0">🎁</span>
            <div className="flex-1 min-w-0 space-y-1.5">
              <p className="text-base font-bold" style={{ color: '#059669' }}>
                {aniversariantesCount} aniversariante{aniversariantesCount === 1 ? '' : 's'} em {mesAtualNome}{aniversariantesWithoutCoupon !== aniversariantesTotal && aniversariantesWithoutCoupon > 0 ? ' sem cupom' : ''}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
                Taxa de retorno típica de aniversário: <strong>40% (2 em cada 5)</strong> → ~<strong>{retornoEsperado}</strong> atendimento{retornoEsperado === 1 ? '' : 's'}.
              </p>
              {receitaEstimada > 0 && (
                <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
                  No teu ticket médio ({formatBRL(ticketMedio)}), ~<strong style={{ color: '#059669' }}>{formatBRL(receitaEstimada)}</strong> de receita extra.
                </p>
              )}
              <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-mute)' }}>
                💸 Custo: 0 · só o desconto pra quem voltar comemorar com você.
              </p>
            </div>
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
            Pra cliente entrar nessa lista, precisa ter data de nascimento cadastrada (importação ou cadastro manual no perfil).
          </p>
        </div>
      ) : null}

      {/* COMO FUNCIONA · 4 passos com ícones */}
      <div
        className="rounded-2xl p-4 lg:p-5"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
      >
        <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--admin-text-mute)' }}>
          Como funciona · 4 passos
        </p>
        <div className="space-y-3">
          {[
            { icon: '🎁', title: 'Você define o desconto de aniversário', desc: 'Sugestão: 20% off ou R$ 15 — mais generoso que sumidos (é especial)' },
            { icon: '✍️', title: 'Escolhe a mensagem de carinho', desc: 'Templates prontos com tom afetivo · você edita à vontade' },
            { icon: '🎂', title: 'Sistema gera 1 cupom por aniversariante do mês', desc: 'Cada link já vem com nome do cliente e cupom único · pronto pra enviar' },
            { icon: '💚', title: 'Cliente recebe mimo, agenda, e volta feliz', desc: 'Desconto entra automático no caixa · ele sente que importou pra você' },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className="w-10 h-10 lg:w-11 lg:h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                style={{ background: 'var(--admin-accent-bg)' }}
              >
                {step.icon}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
                  {i + 1}. {step.title}
                </p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ COLAPSÁVEL */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
      >
        <button
          type="button"
          onClick={() => setShowFAQ((v) => !v)}
          className="w-full px-4 py-3 flex items-center justify-between transition-colors"
        >
          <span className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            💬 Perguntas frequentes
          </span>
          <span style={{ color: 'var(--admin-text-mute)', fontSize: 14 }}>{showFAQ ? '▲' : '▼'}</span>
        </button>
        {showFAQ && (
          <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'var(--admin-divider)', paddingTop: 12 }}>
            {[
              { q: 'Quando mandar a mensagem?', a: 'No dia do aniversário ou 1-2 dias antes (cliente sente lembrança). Se mandar muito antes, ele esquece.' },
              { q: 'Quanto de desconto vale?', a: 'Sugestão: 20% off ou R$ 15-30 fixo. Aniversário pede generosidade · vale mais que sumidos. O retorno emocional compensa.' },
              { q: 'E se ele não respondeu pela primeira mensagem?', a: 'Mande lembrete 3 dias antes do cupom vencer. Geralmente quem não respondeu agenda no segundo toque.' },
              { q: 'Posso mandar pra quem nasceu hoje só?', a: 'Por enquanto a campanha é do mês todo. Em breve vai ter filtro de "hoje + 7 dias" pra disparos mais cirúrgicos.' },
              { q: 'O cliente precisa ter aniversário cadastrado?', a: 'Sim. Quem não tem data não entra na lista. Cadastra no perfil dele em Clientes.' },
            ].map((item, i) => (
              <div key={i}>
                <p className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>{item.q}</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>{item.a}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form de campanha · grid 2-col em desktop · config esquerda · preview direita sticky */}
      <div className="lg:grid lg:grid-cols-[1.4fr_1fr] lg:gap-6 lg:items-start space-y-4 lg:space-y-0">
        <div className="admin-card p-4 space-y-4">
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
        </div>{/* fecha admin-card config (desconto+validade+mensagem) */}

        {/* Coluna direita · preview + CTA · sticky em desktop */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="admin-card p-4 space-y-4">

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
          </div>{/* fecha admin-card preview */}
        </div>{/* fecha lg:sticky wrapper */}
      </div>{/* fecha grid 2-col */}
    </div>
  )
}
