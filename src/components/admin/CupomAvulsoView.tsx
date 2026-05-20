'use client'

import { useEffect, useRef, useState } from 'react'
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
}

export default function CupomAvulsoView({
  businessSlug,
  businessName,
  professionals,
  initialCoupons,
}: Props) {
  const router = useRouter()
  const [coupons, setCoupons] = useState<StandaloneCoupon[]>(initialCoupons)
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
    <div className="space-y-5">
      {/* Form */}
      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
            Nome da promoção (opcional)
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: Inauguração · Indicação de cliente · Black Friday"
            maxLength={80}
            className="admin-input w-full mt-1.5 px-3 py-2.5 text-sm"
          />
        </div>

        {professionals.length > 0 && (
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
              Para quem
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => setProfessionalId('')}
                className="py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: professionalId === '' ? 'var(--admin-accent-bg)' : 'var(--admin-input-bg)',
                  border: `1px solid ${professionalId === '' ? 'var(--admin-accent-border)' : 'var(--admin-border)'}`,
                  color: professionalId === '' ? 'var(--admin-accent)' : 'var(--admin-text)',
                }}
              >
                Todo o salão
              </button>
              <button
                type="button"
                onClick={() => {
                  // Default pro primeiro profissional ao clicar · operador
                  // troca no dropdown se quiser outro.
                  if (professionalId === '') setProfessionalId(professionals[0].id)
                }}
                className="py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: professionalId !== '' ? 'var(--admin-accent-bg)' : 'var(--admin-input-bg)',
                  border: `1px solid ${professionalId !== '' ? 'var(--admin-accent-border)' : 'var(--admin-border)'}`,
                  color: professionalId !== '' ? 'var(--admin-accent)' : 'var(--admin-text)',
                }}
              >
                Profissional
              </button>
            </div>
            {professionalId !== '' && (
              <select
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                className="admin-input w-full mt-2 px-3 py-2.5 text-sm"
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

        {error && <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>}

        <button
          type="button"
          onClick={gerar}
          disabled={submitting}
          className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
          style={{
            background: 'var(--admin-accent)',
            color: '#fff',
          }}
        >
          {submitting ? 'Gerando...' : 'Gerar cupom'}
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
