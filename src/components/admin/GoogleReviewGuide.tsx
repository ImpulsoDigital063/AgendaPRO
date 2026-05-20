'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  onClose: () => void
}

export default function GoogleReviewGuide({ onClose }: Props) {
  const accent = '#4285F4'
  const accentBg = 'rgba(66,133,244,0.12)'

  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => { setPortalReady(true) }, [])
  if (!portalReady) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg mx-auto rounded-t-3xl sm:rounded-3xl p-6 pb-10 sm:pb-6 animate-slideUp max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />

        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: accentBg }}
          >
            {/* Estrela do Google */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill={accent}>
              <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.21 22 12 17.27 5.79 22l2.39-8.15L2 9.36h7.61L12 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Link de avaliação do Google</h2>
            <p className="text-xs text-gray-400">Em 3 passos pelo seu Perfil da Empresa</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {/* Passo 1 */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                style={{ background: accent }}
              >
                1
              </span>
              <p className="font-semibold text-gray-900 text-sm">
                Procure seu negócio no Google
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span className="text-xs text-gray-500 truncate">nome do seu negócio</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                Use o app do Google ou o navegador, logado na conta dona do negócio.
              </p>
            </div>
          </div>

          {/* Passo 2 */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                style={{ background: accent }}
              >
                2
              </span>
              <p className="font-semibold text-gray-900 text-sm">
                Toque em <span className="font-bold">&quot;Pedir avaliações&quot;</span>
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {['Editar perfil', 'Mensagens', 'Promover'].map((item) => (
                <div key={item} className="px-4 py-2.5 border-b border-gray-100 text-sm text-gray-400 flex items-center gap-3">
                  <div className="w-5 h-5 bg-gray-100 rounded" />
                  {item}
                </div>
              ))}
              <div
                className="px-4 py-2.5 text-sm font-bold flex items-center gap-3 border-l-4"
                style={{ background: accentBg, color: accent, borderColor: accent }}
              >
                <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'rgba(66,133,244,0.2)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill={accent}>
                    <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.21 22 12 17.27 5.79 22l2.39-8.15L2 9.36h7.61L12 2z" />
                  </svg>
                </div>
                Pedir avaliações
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              Esse botão aparece no painel do seu negócio (Perfil da Empresa do Google).
            </p>
          </div>

          {/* Passo 3 */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                style={{ background: accent }}
              >
                3
              </span>
              <p className="font-semibold text-gray-900 text-sm">
                Copie o link curto e cole aqui
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-700 font-mono truncate">
                  g.page/r/CXXXX/review
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-1 rounded-md flex-shrink-0"
                  style={{ background: accentBg, color: accent }}
                >
                  COPIAR
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                Esse formato (<span className="font-mono">g.page/r/.../review</span>) abre o formulário direto no navegador, sem pedir pra baixar o app.
              </p>
            </div>
          </div>

          {/* Aviso curto */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <p className="text-xs font-semibold text-amber-700">
              Não use link do Google Maps comum
            </p>
            <p className="text-[11px] text-amber-700/80 mt-1">
              Links começando com <span className="font-mono">maps.google.com</span> ou <span className="font-mono">goo.gl/maps</span> abrem o app do Maps no celular do cliente — fricção que faz desistir da avaliação.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 text-white py-3.5 rounded-2xl font-semibold text-sm active:scale-[0.98] transition-transform"
          style={{ background: accent }}
        >
          Entendi!
        </button>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>,
    document.body
  )
}
