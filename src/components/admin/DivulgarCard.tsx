'use client'

import { useState } from 'react'

type Props = {
  slug: string
  appUrl: string
}

export default function DivulgarCard({ slug, appUrl }: Props) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  const bookingLink = `${appUrl}/${slug}/agendar`

  function handleCopy() {
    navigator.clipboard.writeText(bookingLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Link + copiar */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 mb-0.5">Link de agendamento</p>
          <p className="text-sm text-gray-700 font-medium truncate">/{slug}/agendar</p>
        </div>
        <button
          onClick={handleCopy}
          className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
            copied
              ? 'bg-green-500 text-white'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          {copied ? '✓ Copiado!' : 'Copiar'}
        </button>
      </div>

      {/* Divisor + toggle "Como divulgar" */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-2.5 flex items-center justify-between border-t border-gray-50 text-xs text-gray-400 hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium">Como divulgar esse link</span>
        <svg
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-50 divide-y divide-gray-50">

          {/* Instagram */}
          <div className="px-4 py-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </div>
              <p className="text-xs font-semibold text-gray-800">Instagram</p>
            </div>
            <ol className="space-y-1.5 text-xs text-gray-500 list-none">
              <li className="flex gap-2"><span className="text-gray-300 font-medium">1</span> Abra seu perfil → Editar perfil</li>
              <li className="flex gap-2"><span className="text-gray-300 font-medium">2</span> No campo <strong className="text-gray-600">Site</strong>, cole o link copiado</li>
              <li className="flex gap-2"><span className="text-gray-300 font-medium">3</span> Na bio escreva: <em className="text-gray-600">"Agende pelo link 👇"</em></li>
            </ol>
          </div>

          {/* Google Meu Negócio */}
          <div className="px-4 py-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
              <p className="text-xs font-semibold text-gray-800">Google Meu Negócio</p>
            </div>
            <ol className="space-y-1.5 text-xs text-gray-500 list-none">
              <li className="flex gap-2"><span className="text-gray-300 font-medium">1</span> Acesse business.google.com</li>
              <li className="flex gap-2"><span className="text-gray-300 font-medium">2</span> Vá em <strong className="text-gray-600">Editar perfil → Informações de contato</strong></li>
              <li className="flex gap-2"><span className="text-gray-300 font-medium">3</span> No campo <strong className="text-gray-600">Site</strong>, cole o link copiado</li>
              <li className="flex gap-2"><span className="text-gray-300 font-medium">4</span> Salve — clientes já veem o botão de agendamento</li>
            </ol>
          </div>

          {/* WhatsApp Status */}
          <div className="px-4 py-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <p className="text-xs font-semibold text-gray-800">WhatsApp</p>
            </div>
            <ol className="space-y-1.5 text-xs text-gray-500 list-none">
              <li className="flex gap-2"><span className="text-gray-300 font-medium">1</span> Abra o WhatsApp → toque no seu nome</li>
              <li className="flex gap-2"><span className="text-gray-300 font-medium">2</span> Edite o <strong className="text-gray-600">Recado</strong> e cole o link</li>
              <li className="flex gap-2"><span className="text-gray-300 font-medium">3</span> Quem ver seu perfil já pode agendar direto</li>
            </ol>
          </div>

        </div>
      )}
    </div>
  )
}
