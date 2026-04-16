'use client'

import { useRef } from 'react'
import QRCode from 'react-qr-code'

type Props = {
  phone: string
  businessName: string
}

export default function WhatsAppQRTab({ phone, businessName }: Props) {
  const qrRef = useRef<HTMLDivElement>(null)

  const phoneClean = phone.replace(/\D/g, '')
  const waMessage = encodeURIComponent(`Olá! Quero agendar um horário na ${businessName}.`)
  const waUrl = `https://wa.me/55${phoneClean}?text=${waMessage}`

  function handleDownload() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512

    const img = new Image()
    img.onload = () => {
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 512, 512)
      ctx.drawImage(img, 0, 0, 512, 512)

      const link = document.createElement('a')
      link.download = `qrcode-whatsapp-${businessName.toLowerCase().replace(/\s+/g, '-')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(waUrl)
      .then(() => alert('Link copiado!'))
      .catch(() => {})
  }

  if (!phoneClean) {
    return (
      <div className="admin-card p-6 text-center">
        <p className="text-sm" style={{ color: 'var(--admin-text-faded)' }}>
          Cadastre um numero de WhatsApp nas configuracoes do negocio para gerar o QR Code.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Card principal */}
      <div className="admin-card p-6">
        <h3 className="font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>QR Code WhatsApp</h3>
        <p className="text-xs mb-6 leading-relaxed" style={{ color: 'var(--admin-text-faded)' }}>
          Imprima e cole no seu estabelecimento. O cliente escaneia e abre o WhatsApp direto com você — sem custo de API.
        </p>

        {/* QR Code */}
        <div
          ref={qrRef}
          className="flex justify-center p-6 rounded-2xl"
          style={{ background: '#ffffff', border: '2px solid var(--admin-border)' }}
        >
          <QRCode
            value={waUrl}
            size={200}
            bgColor="#ffffff"
            fgColor="#111827"
            level="M"
          />
        </div>

        <p className="text-center text-xs mt-3 flex items-center justify-center gap-1" style={{ color: 'var(--admin-text-faded)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> {phone}
        </p>
      </div>

      {/* Mensagem pre-definida */}
      <div className="admin-card p-4">
        <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-text-mute)' }}>Mensagem que o cliente recebe ao escanear:</p>
        <p className="text-sm italic" style={{ color: 'var(--admin-text-2)' }}>
          "Ola! Quero agendar um horario na {businessName}."
        </p>
      </div>

      {/* Acoes */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-colors"
          style={{ background: 'var(--admin-accent)', color: '#fff' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Baixar PNG
        </button>

        <button
          onClick={handleCopyLink}
          className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-colors"
          style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copiar link
        </button>
      </div>

      {/* Dica */}
      <div className="rounded-2xl p-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-success)' }}>
          <strong>Como usar:</strong> Baixe o PNG, imprima em tamanho A5 ou A6 e posicione na recepcao, espelho ou balcao. Clientes com celular na mao escaneiam e ja caem no WhatsApp — sem precisar digitar o numero.
        </p>
      </div>
    </div>
  )
}
