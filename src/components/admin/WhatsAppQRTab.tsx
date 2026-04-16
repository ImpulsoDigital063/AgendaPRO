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
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
        <p className="text-gray-400 text-sm">
          Cadastre um número de WhatsApp nas configurações do negócio para gerar o QR Code.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Card principal */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-1">QR Code WhatsApp</h3>
        <p className="text-gray-400 text-xs mb-6 leading-relaxed">
          Imprima e cole no seu estabelecimento. O cliente escaneia e abre o WhatsApp direto com você — sem custo de API.
        </p>

        {/* QR Code */}
        <div
          ref={qrRef}
          className="flex justify-center p-6 bg-white rounded-2xl border-2 border-gray-100"
        >
          <QRCode
            value={waUrl}
            size={200}
            bgColor="#ffffff"
            fgColor="#111827"
            level="M"
          />
        </div>

        <p className="text-center text-xs text-gray-400 mt-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> {phone}
        </p>
      </div>

      {/* Mensagem pré-definida */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs text-gray-500 font-medium mb-1">Mensagem que o cliente recebe ao escanear:</p>
        <p className="text-sm text-gray-700 italic">
          "Olá! Quero agendar um horário na {businessName}."
        </p>
      </div>

      {/* Ações */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-2xl text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Baixar PNG
        </button>

        <button
          onClick={handleCopyLink}
          className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 rounded-2xl text-sm font-semibold hover:bg-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copiar link
        </button>
      </div>

      {/* Dica */}
      <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
        <p className="text-xs text-green-700 leading-relaxed">
          <strong>Como usar:</strong> Baixe o PNG, imprima em tamanho A5 ou A6 e posicione na recepção, espelho ou balcão. Clientes com celular na mão escaneiam e já caem no WhatsApp — sem precisar digitar o número.
        </p>
      </div>
    </div>
  )
}
