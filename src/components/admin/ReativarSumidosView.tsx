'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
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
  /** Prazo escolhido pela dona · a pagina recalcula tudo em cima dele. */
  dias: number
  existingCoupons: {
    id: string
    code: string
    sent_at: string | null
    used_at: string | null
    expires_at: string
    customer_id: string | null
  }[]
  sumidosTotal: number
  sumidosWithoutCoupon: number
  orphanCoupons: number
  /** Ticket médio do business (últimos 90 dias) · pra calcular ROI */
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

export default function ReativarSumidosView({
  businessSlug,
  businessName,
  businessDescription,
  dias,
  existingCoupons,
  sumidosTotal,
  sumidosWithoutCoupon,
  orphanCoupons,
  ticketMedio = 50,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  /* Preserva os outros params (ex: ?tab=sumidos na tela de Campanhas) —
     o mesmo componente e' montado em /clientes/reativar e /clientes/campanhas. */
  function irParaPrazo(d: number) {
    const p = new URLSearchParams(searchParams.toString())
    p.set('dias', String(d))
    router.push(`${pathname}?${p.toString()}`)
  }
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
  // FAQ colapsável · default fechado (não distrai usuário experiente)
  const [showFAQ, setShowFAQ] = useState(false)

  const templates = useMemo(() => suggestTemplates(businessDescription), [businessDescription])

  // ROI estimado · taxa de conversão típica 20% (1 em 5 sumidos volta)
  // Custo zero — só o desconto que o dono define
  const sumidosCount = sumidosWithoutCoupon > 0 ? sumidosWithoutCoupon : sumidosTotal
  const retornoEsperado = Math.floor(sumidosCount * 0.2)
  const receitaEstimada = retornoEsperado * ticketMedio
  const formatBRL = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })

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
        dias,
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
            {campaignResult.length} {campaignResult.length === 1 ? 'cupom pronto' : 'cupons prontos'}
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
      {/* PRAZO · a dona escolhe, e a pagina inteira recalcula (Eduardo, 06/09).
          Navega por searchParam pra reaproveitar o calculo do server component:
          sumidos, cupons orfaos e ROI saem todos coerentes com o prazo. */}
      <div className="admin-card p-3 lg:p-4">
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
            Considerar sumido quem não vem há mais de
          </p>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
            quem tem hora marcada não conta
          </p>
        </div>
        <div
          className="grid grid-cols-6 rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--admin-border)' }}
          role="group"
          aria-label="Prazo"
        >
          {[15, 20, 25, 30, 40, 60].map((d, i) => {
            const ativo = d === dias
            return (
              <button
                key={d}
                type="button"
                onClick={() => irParaPrazo(d)}
                aria-pressed={ativo}
                className="py-2.5 text-sm font-semibold transition-colors"
                style={{
                  background: ativo ? 'var(--admin-accent)' : 'transparent',
                  color: ativo ? '#fff' : 'var(--admin-text-2)',
                  borderLeft: i === 0 ? 'none' : '1px solid var(--admin-border)',
                }}
              >
                {d}
                <span className="hidden sm:inline text-[11px] font-normal opacity-75">{' '}dias</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* HERO EDUCATIVO · explica O QUE É e PRA QUE SERVE em 2 frases */}
      <div
        className="rounded-2xl p-5 lg:p-6"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 14%, var(--admin-surface)) 0%, color-mix(in srgb, var(--brand-secondary) 10%, var(--admin-surface)) 100%)',
          border: '1px solid var(--admin-border)',
        }}
      >
        <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--admin-accent)' }}>
          Traga de volta seus clientes sumidos
        </p>
        <h2 className="text-lg lg:text-xl font-bold leading-snug" style={{ color: 'var(--admin-text)' }}>
          Cliente que não vem há mais de {dias} dias é dinheiro parado.
        </h2>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
          Aqui você manda <strong>1 cupom único de desconto por cliente via WhatsApp</strong> · sistema gera o link
          pronto · você só clica e envia. Mede automaticamente quem voltou.
        </p>
      </div>

      {/* CARD ROI · substitui o alerta vermelho · tom de OPORTUNIDADE não DOR */}
      {sumidosCount > 0 && (
        <div
          className="rounded-2xl p-4 lg:p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))',
            border: '1px solid rgba(16,185,129,0.30)',
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-3xl flex-shrink-0">🎯</span>
            <div className="flex-1 min-w-0 space-y-1.5">
              <p className="text-base font-bold" style={{ color: '#059669' }}>
                Você tem {sumidosCount} cliente{sumidosCount === 1 ? '' : 's'} sumido{sumidosCount === 1 ? '' : 's'}{sumidosWithoutCoupon !== sumidosTotal && sumidosWithoutCoupon > 0 ? ' sem cupom' : ''}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
                Se só <strong>1 em cada 5</strong> voltar (taxa típica), são <strong>{retornoEsperado} atendimento{retornoEsperado === 1 ? '' : 's'}</strong> de volta.
              </p>
              {receitaEstimada > 0 && (
                <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
                  No teu ticket médio ({formatBRL(ticketMedio)}), ~<strong style={{ color: '#059669' }}>{formatBRL(receitaEstimada)}</strong> de receita extra.
                </p>
              )}
              <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-mute)' }}>
                💸 Custo: 0 · você só dá o desconto pra quem voltar.
              </p>
            </div>
          </div>
        </div>
      )}

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
              <p className="text-[10px]" style={{ color: 'var(--admin-text-faded)' }}>
                Ativos{orphanCoupons > 0 && (
                  <span title="Cliente reativou-se mas cupom segue válido"> · {orphanCoupons} órfão{orphanCoupons === 1 ? '' : 's'}</span>
                )}
              </p>
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

      {/* COMO FUNCIONA · 4 passos com ícone grande · cada passo enfatiza BENEFÍCIO */}
      <div
        className="rounded-2xl p-4 lg:p-5"
        style={{
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
        }}
      >
        <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--admin-text-mute)' }}>
          Como funciona · 4 passos
        </p>
        <div className="space-y-3">
          {[
            { icon: '🎁', title: 'Você escolhe o desconto', desc: 'Valor fixo (R$) ou porcentagem · e quantos dias o cupom dura' },
            { icon: '✍️', title: 'Escolhe a mensagem', desc: 'Templates prontos pro seu nicho · você pode editar à vontade' },
            { icon: '📱', title: 'Sistema gera 1 link WhatsApp por cliente', desc: 'Cada um com nome, valor e cupom único · pronto pra enviar' },
            { icon: '💰', title: 'Cliente clica, agenda e o desconto entra', desc: 'Sem trabalho seu · desconto é aplicado automaticamente no caixa' },
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

      {/* FAQ COLAPSÁVEL · responde dúvidas comuns sem poluir tela */}
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
          <span style={{ color: 'var(--admin-text-mute)', fontSize: 14 }}>
            {showFAQ ? '▲' : '▼'}
          </span>
        </button>
        {showFAQ && (
          <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'var(--admin-divider)', paddingTop: 12 }}>
            {[
              {
                q: 'Por que cupom único por cliente?',
                a: 'Pra você saber EXATAMENTE quem voltou via campanha (relatório). Sem isso, fica difícil medir o que funcionou.',
              },
              {
                q: 'Vou ter que mandar 135 mensagens uma por uma?',
                a: 'Sim — mas cada uma é só 1 clique no botão WhatsApp da lista. Pra 100 clientes leva uns 20 minutos. Você pode fazer aos poucos.',
              },
              {
                q: 'E se o cliente não usar o cupom?',
                a: 'Sem prejuízo — o cupom expira sozinho na data que você definir. Você só perde o tempo de enviar.',
              },
              {
                q: 'Quanto fica de desconto?',
                a: 'Você decide. Sugestão pra esmalteria: R$ 10 fixo OU 15% off. O importante é ser tentador o suficiente pra ele voltar.',
              },
              {
                q: 'O que conta como "cliente sumido"?',
                a: `Quem não vem há mais de ${dias} dias e nem agendou nada futuro. Você escolhe esse prazo no topo da tela — cílios e unha costumam pedir 15 ou 20; corte, 30 ou 40.`,
              },
            ].map((item, i) => (
              <div key={i}>
                <p className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>
                  {item.q}
                </p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form de campanha · grid 2-col em desktop (Salão99-style)
          Mobile: tudo empilhado · Desktop: config esquerda · preview direita sticky */}
      <div className="lg:grid lg:grid-cols-[1.4fr_1fr] lg:gap-6 lg:items-start space-y-5 lg:space-y-0">
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
        </div>{/* fecha admin-card config (etapas 1+2) */}

        {/* Coluna direita · preview + CTA · sticky em desktop */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="admin-card p-4 space-y-4">

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
          </div>{/* fecha admin-card preview */}
        </div>{/* fecha lg:sticky wrapper */}
      </div>{/* fecha grid 2-col */}
    </div>
  )
}
