'use client'

/**
 * Encerramento do tour "Conheça seu sistema".
 *
 * Primeira versão era um balão igual aos outros, por cima da tela de Plano
 * (teste 14/09/2026): sem cara de fim, botão azul sem jeito de WhatsApp, a
 * call de alinhamento perdida num parágrafo e os planos escurecidos atrás
 * parecendo cobrança. Agora é um card próprio, aberto na Início, com o que
 * ela viu, a call como benefício em destaque e o botão verde do WhatsApp.
 * Sem emoji: SVG.
 */
import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { chaveTourCardOculto } from '@/lib/tour-sistema'

function IconCheck({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

function IconVideo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="13" height="12" rx="2.5" />
      <path d="M16 10.5l5-3v9l-5-3z" />
    </svg>
  )
}

function IconWhatsApp({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91A9.85 9.85 0 0 0 12.04 2zm0 18.15h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 5.83 2.42 8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48a.92.92 0 0 0-.66.31c-.23.25-.87.85-.87 2.07s.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.25 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.29z" />
    </svg>
  )
}

type Props = {
  partes: string[]
  linkWhatsApp: string
  businessId: string
  onFechar: () => void
}

export default function TourFinal({ partes, linkWhatsApp, businessId, onFechar }: Props) {
  const [pronto, setPronto] = useState(false)
  useEffect(() => {
    setPronto(true)
    /* Chegou ao fim: o convite da Início não precisa mais aparecer. */
    try { localStorage.setItem(chaveTourCardOculto(businessId), '1') } catch {}
  }, [businessId])
  if (!pronto) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-3 py-6 overflow-y-auto"
      style={{ background: 'rgba(15,23,42,0.62)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-final-titulo"
    >
      <div
        className="admin-card w-full p-5 sm:p-6"
        style={{ maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.30)' }}
      >
        <div className="flex flex-col items-center text-center">
          <span
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'var(--admin-accent)', color: '#fff' }}
          >
            <IconCheck size={24} />
          </span>
          <p className="text-[11px] font-bold uppercase tracking-widest mt-3" style={{ color: 'var(--admin-accent)' }}>
            Tour concluído
          </p>
          <h2 id="tour-final-titulo" className="text-xl font-bold leading-tight mt-1" style={{ color: 'var(--admin-text)' }}>
            Pronto, você conheceu o AgendaPRO
          </h2>
          <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
            Agora é colocar o seu negócio aqui dentro. Se travar em alguma parte, chama a gente.
          </p>
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 mt-4">
          {partes.map((p) => (
            <li key={p} className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--admin-text-2)' }}>
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'color-mix(in srgb, var(--admin-accent) 15%, transparent)', color: 'var(--admin-accent)' }}
              >
                <IconCheck size={10} />
              </span>
              {p}
            </li>
          ))}
        </ul>

        <div
          className="rounded-2xl p-4 mt-4 flex items-start gap-3"
          style={{
            background: 'color-mix(in srgb, #25D366 10%, var(--admin-surface))',
            border: '1px solid color-mix(in srgb, #25D366 35%, transparent)',
          }}
        >
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#25D366', color: '#fff' }}
          >
            <IconVideo />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#128C4B' }}>
              Incluído pra você
            </p>
            <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--admin-text)' }}>
              Call de alinhamento e personalização
            </p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
              A gente conversa com você, ajusta o sistema ao seu jeito de trabalhar e personaliza o que precisar.
            </p>
          </div>
        </div>

        <a
          href={linkWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onFechar}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold no-underline"
          style={{ background: '#25D366', color: '#fff', boxShadow: '0 8px 20px -8px rgba(37,211,102,0.65)' }}
        >
          <IconWhatsApp /> Marcar minha call no WhatsApp
        </a>
        <button
          type="button"
          onClick={onFechar}
          className="mt-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ color: 'var(--admin-text-faded)' }}
        >
          Voltar pro painel
        </button>
      </div>
    </div>,
    document.body,
  )
}
