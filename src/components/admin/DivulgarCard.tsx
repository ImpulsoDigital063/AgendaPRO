'use client'

import { useState } from 'react'
import {
  IconChevronDown,
  IconCopy,
  IconCheck,
  IconInstagram,
  IconWhatsapp,
} from '@/components/ui/Icon'

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
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
      }}
    >
      {/* Link + copiar */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--admin-text-faded)' }}>
            Link de agendamento
          </p>
          <p className="text-sm font-medium truncate" style={{ color: 'var(--admin-text)' }}>
            /{slug}/agendar
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
          style={
            copied
              ? {
                  background: 'rgba(16,185,129,0.15)',
                  color: 'var(--admin-success)',
                  border: '1px solid rgba(16,185,129,0.3)',
                }
              : {
                  background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                  color: '#fff',
                  boxShadow: '0 6px 16px rgba(59,130,246,0.35)',
                }
          }
        >
          {copied ? (
            <>
              <IconCheck size={14} /> Copiado
            </>
          ) : (
            <>
              <IconCopy size={14} /> Copiar
            </>
          )}
        </button>
      </div>

      {/* Toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-xs transition-colors hover:opacity-100"
        style={{
          borderTop: '1px solid var(--admin-divider)',
          color: 'var(--admin-text-mute)',
        }}
      >
        <span className="font-medium">Como divulgar esse link</span>
        <span
          style={{
            display: 'inline-flex',
            transition: 'transform 0.25s ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
          }}
        >
          <IconChevronDown size={14} />
        </span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--admin-divider)' }}>
          {/* Instagram */}
          <Section
            title="Instagram"
            icon={
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                style={{ background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}
              >
                <IconInstagram size={14} />
              </span>
            }
            steps={[
              <>Abra seu perfil → Editar perfil</>,
              <>No campo <strong style={{ color: 'var(--admin-text-2)' }}>Site</strong>, cole o link copiado</>,
              <>Na bio escreva: <em style={{ color: 'var(--admin-text-2)' }}>&quot;Agende pelo link aqui embaixo&quot;</em></>,
            ]}
          />
          {/* Google Meu Negócio */}
          <Section
            title="Google Meu Negócio"
            icon={
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                style={{ background: 'linear-gradient(135deg, #4285F4, #34A853)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
              </span>
            }
            steps={[
              <>Acesse business.google.com</>,
              <>Vá em <strong style={{ color: 'var(--admin-text-2)' }}>Editar perfil → Informações de contato</strong></>,
              <>No campo <strong style={{ color: 'var(--admin-text-2)' }}>Site</strong>, cole o link copiado</>,
              <>Salve — clientes já veem o botão de agendamento</>,
            ]}
          />
          {/* WhatsApp */}
          <Section
            title="WhatsApp"
            icon={
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                style={{ background: '#25D366' }}
              >
                <IconWhatsapp size={14} />
              </span>
            }
            steps={[
              <>Abra o WhatsApp → toque no seu nome</>,
              <>Edite o <strong style={{ color: 'var(--admin-text-2)' }}>Recado</strong> e cole o link</>,
              <>Quem ver seu perfil já pode agendar direto</>,
            ]}
            last
          />
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  icon,
  steps,
  last,
}: {
  title: string
  icon: React.ReactNode
  steps: React.ReactNode[]
  last?: boolean
}) {
  return (
    <div
      className="px-4 py-4"
      style={{ borderBottom: last ? 'none' : '1px solid var(--admin-divider)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <p className="text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
          {title}
        </p>
      </div>
      <ol className="space-y-1.5 text-xs" style={{ color: 'var(--admin-text-mute)' }}>
        {steps.map((step, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-semibold flex-shrink-0" style={{ color: 'var(--admin-text-faded)' }}>
              {i + 1}
            </span>
            <span className="flex-1">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
