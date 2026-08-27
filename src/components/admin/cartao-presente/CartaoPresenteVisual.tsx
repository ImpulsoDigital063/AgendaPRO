'use client'

import { useEffect, useRef, useState } from 'react'
import { IconWhatsapp } from '@/components/ui/Icon'

// ── Paleta oficial Palace Nail Spa ────────────────────────────────
/* v140 · O cartão do Palace era pintado na marca DELE (teal/dourado e a logo
   em /brand/palace). Portando pro SaaS isso vira marca do NEGÓCIO: cada salão
   recebe o cartão com a própria logo e as próprias cores, e cliente novo não
   exige código novo. Os valores abaixo são só o fallback de quem ainda não
   configurou marca — o mesmo tom neutro do resto do painel. */
const TEAL_FALLBACK = '#1AA9A8'
const DARK_FALLBACK = '#0A2424'
const GOLD_FALLBACK = '#C9A87C'
const CREAM_FALLBACK = '#FAF7F2'

export type CartaoPresenteVisualData = {
  code: string
  recipientName: string
  buyerName?: string | null
  mode: 'services' | 'value'
  services?: { service_name: string; sessions_total: number }[]
  valueTotal?: number | null
  expiresAt?: string | null
  businessName: string
  /** v140 · marca do negócio: sem isso o cartão sai no tom neutro do painel. */
  brandLogoUrl?: string | null
  brandPrimary?: string | null
  brandSecondary?: string | null
  giftMessage?: string | null
  recipientPhone?: string | null
  buyerPhone?: string | null
  onSent?: () => void
}

function formatDate(iso?: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ── Ícones inline (sem emoji) ─────────────────────────────────────
function PrinterIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  )
}

function DownloadIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

// Normaliza telefone pro formato do wa.me (só dígitos, com DDI 55 no Brasil)
function normalizePhone(p?: string | null): string {
  if (!p) return ''
  let d = p.replace(/\D/g, '')
  if (!d) return ''
  if (!d.startsWith('55')) d = '55' + d
  return d
}

export default function CartaoPresenteVisual({
  code,
  recipientName,
  buyerName,
  services,
  expiresAt,
  businessName,
  giftMessage,
  recipientPhone,
  buyerPhone,
  brandLogoUrl,
  brandPrimary,
  brandSecondary,
  onSent,
}: CartaoPresenteVisualData) {
  /* Marca do negócio com fallback: salão que ainda não subiu logo nem escolheu
     cor recebe o cartão no tom neutro, e ele fica bonito do mesmo jeito. */
  const TEAL = brandPrimary || TEAL_FALLBACK
  const GOLD = brandSecondary || GOLD_FALLBACK
  const DARK = DARK_FALLBACK
  const CREAM = CREAM_FALLBACK
  const cardRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [canShareFiles, setCanShareFiles] = useState(false)

  const validUntil = formatDate(expiresAt)

  const msg = (giftMessage && giftMessage.trim())
    ? giftMessage.trim()
    : `Você recebeu um Vale-Presente do ${businessName}! Código: ${code}. Apresente na recepção pra agendar seu horário.`

  // Detecta suporte a compartilhar arquivos (tablet/celular) pra escolher o fluxo
  useEffect(() => {
    try {
      const testFile = new File([new Blob(['x'], { type: 'image/png' })], 'vale-test.png', { type: 'image/png' })
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [testFile] })) {
        setCanShareFiles(true)
      }
    } catch {
      /* sem suporte */
    }
  }, [])

  function handlePrint() {
    window.print()
  }

  async function makePngBlob(): Promise<Blob | null> {
    const node = cardRef.current
    if (!node) return null
    const { toBlob } = await import('html-to-image')
    return await toBlob(node, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: CREAM,
    })
  }

  async function handleDownload() {
    const node = cardRef.current
    if (!node) return
    setDownloading(true)
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: CREAM,
      })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `vale-${code}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      /* falha silenciosa — imagem não gerada */
    } finally {
      setDownloading(false)
    }
  }

  async function handleWhatsapp(phone?: string | null) {
    if (sending) return
    setSending(true)
    setNotice(null)
    try {
      const blob = await makePngBlob()
      // Tablet/celular: share sheet nativo — usuário escolhe o contato no WhatsApp
      if (blob && typeof navigator !== 'undefined' && navigator.canShare) {
        const file = new File([blob], `vale-${code}.png`, { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], text: msg })
            onSent?.()
            return
          } catch {
            // usuário cancelou o share — não dispara fallback nem onSent
            return
          }
        }
      }
      // Desktop: baixa a imagem E abre o WhatsApp Web em nova aba
      if (blob) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `vale-${code}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
      const num = normalizePhone(phone)
      const waUrl = num
        ? `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/?text=${encodeURIComponent(msg)}`
      window.open(waUrl, '_blank', 'noopener,noreferrer')
      setNotice('Imagem baixada — anexe no WhatsApp')
      setTimeout(() => setNotice(null), 4500)
      onSent?.()
    } catch {
      /* falha silenciosa */
    } finally {
      setSending(false)
    }
  }

  const hasRecipientPhone = !!(recipientPhone && recipientPhone.trim())
  const hasBuyerPhone = !!(buyerPhone && buyerPhone.trim())
  // No desktop, com ambos os telefones, oferece envio direcionado
  const twoTargets = !canShareFiles && hasRecipientPhone && hasBuyerPhone

  return (
    <div className="flex flex-col items-center gap-4">
      {/* CSS de impressão: isola só o cartão */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #cartao-presente, #cartao-presente * { visibility: visible !important; }
          #cartao-presente {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          @page { margin: 12mm; }
        }
      `}</style>

      {/* ══ O CARTÃO ══ */}
      <div
        id="cartao-presente"
        ref={cardRef}
        style={{
          width: 640,
          maxWidth: '100%',
          aspectRatio: '640 / 400',
          position: 'relative',
          background: CREAM,
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 24px 60px -24px rgba(10,36,36,0.45)',
          fontFamily: 'Georgia, "Times New Roman", serif',
          color: DARK,
        }}
      >
        {/* Moldura dourada dupla (filetes) */}
        <div
          style={{
            position: 'absolute',
            inset: 14,
            border: `1.5px solid ${GOLD}`,
            borderRadius: 12,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 20,
            border: `0.75px solid ${GOLD}99`,
            borderRadius: 9,
            pointerEvents: 'none',
          }}
        />

        {/* Ornamento translúcido — marca d'água canto inferior direito.
            v140 · usa a logo do próprio salão; sem logo, não desenha nada. */}
        {brandLogoUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={brandLogoUrl}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: -40,
            bottom: -46,
            width: 240,
            height: 240,
            objectFit: 'contain',
            opacity: 0.1,
            pointerEvents: 'none',
          }}
        />
        )}

        {/* Conteúdo */}
        <div
          style={{
            position: 'absolute',
            inset: 20,
            padding: '22px 30px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Topo: logo + nome do salão */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {brandLogoUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={brandLogoUrl}
                alt={businessName}
                style={{ height: 46, width: 'auto', objectFit: 'contain' }}
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: TEAL,
                }}
              >
                {businessName}
              </span>
              <span style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: GOLD }}>
                Cartão presente
              </span>
            </div>
          </div>

          {/* Miolo */}
          <div style={{ textAlign: 'center', marginTop: -6 }}>
            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: '0.18em',
                color: GOLD,
                textTransform: 'uppercase',
                lineHeight: 1.1,
              }}
            >
              Vale-Presente
            </div>

            <div style={{ marginTop: 10, fontSize: 13, color: `${DARK}B3`, fontStyle: 'italic' }}>
              Para
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: DARK, marginTop: 1 }}>
              {recipientName}
            </div>

            {/* Conteúdo do vale · sempre lista os serviços */}
            <div style={{ marginTop: 10, fontSize: 14, color: TEAL, fontWeight: 700 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                {(services ?? []).map((s, i) => (
                  <span key={i}>
                    {s.sessions_total}x {s.service_name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Código em faixa forte */}
          <div style={{ textAlign: 'center' }}>
            {giftMessage && giftMessage.trim() && (
              <div
                style={{
                  fontStyle: 'italic',
                  fontSize: 12,
                  lineHeight: 1.3,
                  color: `${DARK}99`,
                  marginBottom: 8,
                  maxHeight: 32,
                  overflow: 'hidden',
                  padding: '0 8px',
                }}
              >
                {giftMessage.trim()}
              </div>
            )}
            <div
              style={{
                display: 'inline-block',
                background: `linear-gradient(135deg, ${TEAL} 0%, ${DARK} 100%)`,
                borderRadius: 10,
                padding: '9px 26px',
                boxShadow: `0 6px 16px -6px ${TEAL}`,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  color: `${GOLD}`,
                  fontFamily: 'Georgia, serif',
                }}
              >
                Código do vale
              </div>
              <div
                style={{
                  fontFamily: '"Courier New", ui-monospace, monospace',
                  fontSize: 30,
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  color: '#FFFFFF',
                  lineHeight: 1.15,
                }}
              >
                {code}
              </div>
            </div>

            {/* Rodapé: validade + de */}
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                fontSize: 11,
                color: `${DARK}99`,
              }}
            >
              <span>{validUntil ? `Válido até ${validUntil}` : 'Sem prazo de validade'}</span>
              <span>{buyerName ? `De: ${buyerName}` : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Botões (fora do cartão, não entram na impressão/imagem) ══ */}
      <div className="flex flex-wrap items-center justify-center gap-2 no-print">
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold"
          style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
        >
          <PrinterIcon /> Imprimir
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
          style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${DARK} 100%)`, color: '#fff' }}
        >
          <DownloadIcon /> {downloading ? 'Gerando...' : 'Baixar imagem'}
        </button>

        {twoTargets ? (
          <>
            <button
              type="button"
              onClick={() => handleWhatsapp(recipientPhone)}
              disabled={sending}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
              style={{ background: '#25D366', color: '#fff' }}
            >
              <IconWhatsapp size={15} /> Pra presenteada
            </button>
            <button
              type="button"
              onClick={() => handleWhatsapp(buyerPhone)}
              disabled={sending}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
              style={{ background: '#128C7E', color: '#fff' }}
            >
              <IconWhatsapp size={15} /> Pro comprador
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => handleWhatsapp(hasRecipientPhone ? recipientPhone : (hasBuyerPhone ? buyerPhone : null))}
            disabled={sending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
            style={{ background: '#25D366', color: '#fff' }}
          >
            <IconWhatsapp size={15} /> {sending ? 'Enviando...' : 'Enviar no WhatsApp'}
          </button>
        )}
      </div>

      {notice && (
        <p className="no-print text-[11px] font-semibold text-center" style={{ color: 'var(--admin-text-mute)' }}>
          {notice}
        </p>
      )}
    </div>
  )
}
