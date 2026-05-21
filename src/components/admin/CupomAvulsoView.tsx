'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconWhatsapp, IconCopy, IconCheck } from '@/components/ui/Icon'
import { formatDiscount, formatValidity, buildStandaloneWhatsappText } from '@/lib/coupon-templates'

type Professional = {
  id: string
  name: string
}

type StandaloneCoupon = {
  id: string
  code: string
  discount_type: 'fixed' | 'percent'
  discount_value: number
  expires_at: string
  standalone_label: string | null
  professional_id: string | null
  professional_name: string | null
  uses: number
  share_url: string
  created_at: string
}

type Props = {
  businessSlug: string
  businessName: string
  professionals: Professional[]
  initialCoupons: StandaloneCoupon[]
  ticketMedio?: number
}

export default function CupomAvulsoView({
  businessSlug,
  businessName,
  professionals,
  initialCoupons,
  ticketMedio = 50,
}: Props) {
  const router = useRouter()
  const [coupons, setCoupons] = useState<StandaloneCoupon[]>(initialCoupons)
  const [showFAQ, setShowFAQ] = useState(false)
  const [label, setLabel] = useState('')
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('percent')
  const [discountValue, setDiscountValue] = useState('20')
  const [validityDays, setValidityDays] = useState('30')
  const [professionalId, setProfessionalId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdCoupon, setCreatedCoupon] = useState<{
    code: string
    share_url: string
    whatsapp_text: string
  } | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const mountedRef = useRef(true)
  useEffect(() => { return () => { mountedRef.current = false } }, [])

  async function gerar() {
    setError(null)
    const v = Number(discountValue)
    if (!Number.isFinite(v) || v <= 0) {
      setError('Valor de desconto inválido')
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
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/coupons/standalone', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          discount_type: discountType,
          discount_value: v,
          validity_days: days,
          label: label.trim() || null,
          professional_id: professionalId || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (mountedRef.current) setError(data.error || 'Erro ao criar cupom')
        return
      }
      if (mountedRef.current) {
        setCreatedCoupon({
          code: data.coupon.code,
          share_url: data.share_url,
          whatsapp_text: data.whatsapp_text,
        })
        // Refetch lista
        const listRes = await fetch('/api/admin/coupons/standalone', { cache: 'no-store' })
        if (listRes.ok) {
          const listData = await listRes.json()
          if (mountedRef.current) setCoupons(listData.coupons || [])
        }
        router.refresh()
      }
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      if (mountedRef.current) setSubmitting(false)
    }
  }

  async function copiarLink(url: string, code: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedCode(code)
      setTimeout(() => {
        if (mountedRef.current) setCopiedCode(null)
      }, 2000)
    } catch {
      // Fallback: cria um textarea temporário
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
      setCopiedCode(code)
      setTimeout(() => {
        if (mountedRef.current) setCopiedCode(null)
      }, 2000)
    }
  }

  function whatsappShareUrl(text: string): string {
    return `https://wa.me/?text=${encodeURIComponent(text)}`
  }

  function buildWhatsappText(c: StandaloneCoupon): string {
    return buildStandaloneWhatsappText({
      businessName,
      code: c.code,
      shareUrl: c.share_url,
      discountType: c.discount_type,
      discountValue: c.discount_value,
      expiresAt: new Date(c.expires_at),
      label: c.standalone_label,
    })
  }

  // Preview do texto WhatsApp · usa cupom ficticio EXEMPLO123 pra mostrar
  // como o cliente vai receber. Recalcula quando muda nome/desconto/validade.
  // CRITICO: hooks no topo (antes do early return de createdCoupon) ·
  // violacao de Rules of Hooks introduzida no V2 (commit b71eae6) causava
  // "Rendered fewer hooks than expected" crash quando setCreatedCoupon
  // disparava re-render · pagina inteira virava tela de erro.
  const previewText = useMemo(() => {
    const v = Number(discountValue) || 0
    const d = Number(validityDays) || 30
    if (v <= 0) return null
    return buildStandaloneWhatsappText({
      businessName,
      code: 'EXEMPLO123',
      shareUrl: `https://agendapro.net.br/${businessSlug}?cupom=EXEMPLO123`,
      discountType,
      discountValue: v,
      expiresAt: new Date(Date.now() + d * 86400000),
      label: label || null,
    })
  }, [businessName, businessSlug, label, discountType, discountValue, validityDays])

  const symbolUnit = discountType === 'fixed' ? 'R$' : '%'

  // Após criar cupom, mostra card de sucesso. Botão "Criar outro" reseta.
  if (createdCoupon) {
    return (
      <div className="space-y-5">
        <div
          className="rounded-2xl p-4 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.18) 0%, color-mix(in srgb, var(--brand-primary) 12%, var(--admin-surface)) 100%)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
            Cupom criado
          </p>
          <p className="text-3xl font-extrabold mt-2 tabular-nums tracking-wider" style={{ color: 'var(--admin-text)' }}>
            {createdCoupon.code}
          </p>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => copiarLink(createdCoupon.share_url, createdCoupon.code)}
            className="w-full py-3 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2"
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
              color: 'var(--admin-text)',
            }}
          >
            {copiedCode === createdCoupon.code ? (
              <>
                <IconCheck size={14} /> Link copiado
              </>
            ) : (
              <>
                <IconCopy size={14} /> Copiar link
              </>
            )}
          </button>

          <a
            href={whatsappShareUrl(createdCoupon.whatsapp_text)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2"
            style={{
              background: 'rgba(37,211,102,0.12)',
              border: '1px solid rgba(37,211,102,0.30)',
              color: '#16A34A',
            }}
          >
            <IconWhatsapp size={14} /> Compartilhar no WhatsApp
          </a>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreatedCoupon(null)
            setLabel('')
            setDiscountValue('20')
            setValidityDays('30')
            setProfessionalId('')
            setError(null)
          }}
          className="w-full py-2.5 rounded-xl text-sm font-semibold"
          style={{
            background: 'var(--admin-accent-bg)',
            color: 'var(--admin-text)',
            border: '1px solid var(--admin-border)',
          }}
        >
          Criar outro cupom
        </button>

        {coupons.length > 0 && (
          <CouponList
            coupons={coupons}
            copiedCode={copiedCode}
            onCopy={copiarLink}
            buildWhatsappText={buildWhatsappText}
            whatsappShareUrl={whatsappShareUrl}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
          🎉 Crie promoções rápidas
        </p>
        <h2 className="text-lg lg:text-xl font-bold leading-snug" style={{ color: 'var(--admin-text)' }}>
          Black Friday · Inauguração · Dia parado · Vaga aberta na agenda.
        </h2>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
          Gera <strong>1 link único compartilhável</strong> com desconto · uso ilimitado dentro da validade · você divulga onde quiser (Stories, WhatsApp, panfleto, QR Code). Cliente clica → agenda → desconto aplicado automático.
        </p>
      </div>

      {/* CARD ROI · oportunidade · não pressão */}
      {ticketMedio > 0 && (
        <div
          className="rounded-2xl p-4 lg:p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))',
            border: '1px solid rgba(16,185,129,0.30)',
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-3xl flex-shrink-0">📣</span>
            <div className="flex-1 min-w-0 space-y-1.5">
              <p className="text-base font-bold" style={{ color: '#059669' }}>
                Quando usar?
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
                <strong>Dia parado</strong> (quinta vazia? cria cupom 20% só hoje · posta no Stories) ·
                <strong> Lançamento de serviço</strong> (primeiras 10 pessoas X% off) ·
                <strong> Indicação</strong> (cliente leva cupom pra amiga).
              </p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-mute)' }}>
                💸 Link funciona pra qualquer pessoa · custo zero · você só dá desconto pra quem usar.
              </p>
            </div>
          </div>
        </div>
      )}

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
            { icon: '🎁', title: 'Você define o desconto e pra quem vale', desc: 'Valor + dias de validade + opcionalmente restringe a 1 profissional só' },
            { icon: '🔗', title: 'Sistema cria 1 link compartilhável', desc: 'URL curta + texto pronto pra WhatsApp · você só copia e divulga' },
            { icon: '📲', title: 'Você divulga onde quiser', desc: 'Stories, WhatsApp, panfleto, QR Code · 1 link serve pra tudo' },
            { icon: '💰', title: 'Cliente clica, agenda e o desconto entra', desc: 'Sem trabalho seu · desconto aplicado automático · 1 uso por telefone (evita abuso)' },
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
              { q: 'Qual a diferença pra cupom de sumidos/aniversário?', a: 'Sumidos e aniversário são 1 cupom POR cliente (personalizado). Promoção é 1 link ÚNICO compartilhável pra qualquer pessoa.' },
              { q: 'Quantas pessoas podem usar?', a: 'Ilimitado dentro da validade. Mas cada telefone só usa 1x (evita 1 cliente burlar várias vezes).' },
              { q: 'Posso fazer promoção só pra serviço X?', a: 'Hoje vale pra qualquer serviço. Filtro por serviço entra em breve.' },
              { q: 'Quanto de desconto ofereço?', a: 'Pra dia parado · 20-30% off chama atenção. Pra indicação · 15% off. Sempre teste e veja o que funciona melhor pra ti.' },
              { q: 'Cliente precisa cadastrar pra usar?', a: 'Sim, ele agenda normalmente (cadastra telefone) e o desconto aplica automático no caixa.' },
            ].map((item, i) => (
              <div key={i}>
                <p className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>{item.q}</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>{item.a}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card do form · destaque visual sólido */}
      <div
        className="rounded-2xl p-5 space-y-5"
        style={{
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
          boxShadow: '0 1px 0 0 color-mix(in srgb, white 5%, transparent) inset',
        }}
      >
        {/* Header amigável */}
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
            Nova promoção
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
            Cupom livre pra divulgar onde quiser · panfleto, WhatsApp, Stories
          </p>
        </div>

        {/* Nome */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--admin-text-2)' }}>
            Nome
            <span className="ml-1.5 text-[11px] font-normal" style={{ color: 'var(--admin-text-faded)' }}>opcional</span>
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: Inauguração · Indicação · Black Friday"
            maxLength={80}
            className="admin-input w-full px-3.5 py-3 text-sm"
          />
        </div>

        {/* Para quem */}
        {professionals.length > 0 && (
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--admin-text-2)' }}>
              Para quem
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProfessionalId('')}
                className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                style={{
                  background: professionalId === '' ? 'var(--admin-accent-bg)' : 'var(--admin-input-bg)',
                  border: `1.5px solid ${professionalId === '' ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                  color: professionalId === '' ? 'var(--admin-accent)' : 'var(--admin-text)',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Todo o salão
              </button>
              <button
                type="button"
                onClick={() => {
                  if (professionalId === '') setProfessionalId(professionals[0].id)
                }}
                className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                style={{
                  background: professionalId !== '' ? 'var(--admin-accent-bg)' : 'var(--admin-input-bg)',
                  border: `1.5px solid ${professionalId !== '' ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                  color: professionalId !== '' ? 'var(--admin-accent)' : 'var(--admin-text)',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Profissional
              </button>
            </div>
            {professionalId !== '' && (
              <select
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                className="admin-input w-full mt-2 px-3.5 py-3 text-sm"
              >
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Desconto */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--admin-text-2)' }}>
            Desconto
          </label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              type="button"
              onClick={() => setDiscountType('fixed')}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
              style={{
                background: discountType === 'fixed' ? 'var(--admin-accent)' : 'var(--admin-input-bg)',
                color: discountType === 'fixed' ? '#fff' : 'var(--admin-text)',
                border: `1.5px solid ${discountType === 'fixed' ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
              }}
            >
              <span className="text-base font-bold tabular-nums">R$</span>
              Valor fixo
            </button>
            <button
              type="button"
              onClick={() => setDiscountType('percent')}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
              style={{
                background: discountType === 'percent' ? 'var(--admin-accent)' : 'var(--admin-input-bg)',
                color: discountType === 'percent' ? '#fff' : 'var(--admin-text)',
                border: `1.5px solid ${discountType === 'percent' ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
              }}
            >
              <span className="text-base font-bold">%</span>
              Porcentagem
            </button>
          </div>
          {/* Input com sufixo inline · valor + unidade juntos */}
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              min={1}
              className="admin-input w-full pl-3.5 pr-14 py-3 text-base font-bold tabular-nums"
              placeholder={discountType === 'percent' ? '20' : '15'}
            />
            <span
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold pointer-events-none"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              {symbolUnit}
            </span>
          </div>
        </div>

        {/* Validade */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--admin-text-2)' }}>
            Validade
          </label>
          <div className="relative w-32">
            <input
              type="number"
              inputMode="numeric"
              value={validityDays}
              onChange={(e) => setValidityDays(e.target.value)}
              min={1}
              max={365}
              className="admin-input w-full pl-3.5 pr-12 py-3 text-sm font-semibold tabular-nums"
            />
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              dias
            </span>
          </div>
        </div>

        {/* Preview WhatsApp · como o cliente vai receber */}
        {previewText && (
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--admin-text-2)' }}>
              Como o cliente vai receber
            </label>
            <p className="text-[11px] mb-2" style={{ color: 'var(--admin-text-mute)' }}>
              Exemplo do texto que vai junto com o link de divulgação.
            </p>
            <div
              className="rounded-xl p-3 text-sm whitespace-pre-wrap leading-relaxed"
              style={{
                background: 'rgba(37,211,102,0.08)',
                border: '1px solid rgba(37,211,102,0.20)',
                color: 'var(--admin-text)',
              }}
            >
              {previewText}
            </div>
          </div>
        )}

        {error && <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>}

        <button
          type="button"
          onClick={gerar}
          disabled={submitting}
          className="w-full py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, var(--admin-accent), color-mix(in srgb, var(--admin-accent) 70%, black))',
            color: '#fff',
            boxShadow: '0 6px 18px -4px color-mix(in srgb, var(--admin-accent) 40%, transparent)',
          }}
        >
          {submitting ? 'Criando...' : 'Criar promoção e ver link'}
        </button>
      </div>

      {coupons.length > 0 && (
        <CouponList
          coupons={coupons}
          copiedCode={copiedCode}
          onCopy={copiarLink}
          buildWhatsappText={buildWhatsappText}
          whatsappShareUrl={whatsappShareUrl}
        />
      )}
    </div>
  )
}

function CouponList({
  coupons,
  copiedCode,
  onCopy,
  buildWhatsappText,
  whatsappShareUrl,
}: {
  coupons: StandaloneCoupon[]
  copiedCode: string | null
  onCopy: (url: string, code: string) => void
  buildWhatsappText: (c: StandaloneCoupon) => string
  whatsappShareUrl: (text: string) => string
}) {
  return (
    <div className="space-y-2 pt-2">
      <p
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--admin-text-mute)' }}
      >
        Cupons avulsos ativos · {coupons.length}
      </p>
      {coupons.map((c) => {
        const valueStr = formatDiscount(c.discount_type, c.discount_value)
        return (
          <div
            key={c.id}
            className="admin-card p-3 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-sm tabular-nums tracking-wider" style={{ color: 'var(--admin-text)' }}>
                  {c.code}
                </p>
                <p className="text-[11px] truncate" style={{ color: 'var(--admin-text-faded)' }}>
                  {c.standalone_label || 'Sem nome'} · {valueStr}
                  {c.professional_name && ` · ${c.professional_name}`}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block"
                  style={{
                    background: 'rgba(124,58,237,0.12)',
                    color: '#7C3AED',
                    border: '1px solid rgba(124,58,237,0.25)',
                  }}
                >
                  {c.uses} {c.uses === 1 ? 'uso' : 'usos'}
                </p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
                  vence {new Date(c.expires_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onCopy(c.share_url, c.code)}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold inline-flex items-center justify-center gap-1"
                style={{
                  background: 'var(--admin-surface)',
                  border: '1px solid var(--admin-border)',
                  color: 'var(--admin-text-mute)',
                }}
              >
                {copiedCode === c.code ? (
                  <>
                    <IconCheck size={11} /> Copiado
                  </>
                ) : (
                  <>
                    <IconCopy size={11} /> Link
                  </>
                )}
              </button>
              <a
                href={whatsappShareUrl(buildWhatsappText(c))}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold inline-flex items-center justify-center gap-1"
                style={{
                  background: 'rgba(37,211,102,0.12)',
                  border: '1px solid rgba(37,211,102,0.25)',
                  color: '#16A34A',
                }}
              >
                <IconWhatsapp size={11} /> WhatsApp
              </a>
            </div>
          </div>
        )
      })}
    </div>
  )
}
