'use client'

import { useState, useRef, useEffect } from 'react'

/* ═══════════════════════════════════════════
   PERGUNTAS DEFAULT (home + segments genéricos)
═══════════════════════════════════════════ */

const DEFAULT_FAQS: FAQItem[] = [
  {
    q: 'Meu cliente precisa baixar algum aplicativo?',
    a: 'Não. O cliente acessa pelo link direto no celular — abre no navegador, escolhe o horário e confirma. Sem cadastro, sem download, sem atrito.',
  },
  {
    q: 'É difícil de configurar?',
    a: 'Não precisa de técnico. Você preenche o nome do negócio, adiciona os serviços e horários, e em menos de 5 minutos já tem uma página pronta. A maioria dos clientes configura tudo no primeiro acesso.',
  },
  {
    q: 'Como meus clientes encontram a página de agendamento?',
    a: 'Você recebe um link personalizado (agendapro.app/seu-negocio) e cola onde quiser: bio do Instagram, Google Meu Negócio, status do WhatsApp ou manda direto nas conversas.',
  },
  {
    q: 'Como funciona o lembrete automático?',
    a: 'Na véspera do agendamento, o sistema manda um lembrete automático pro cliente. Isso reduz em até 50% as faltas. Automático — sem você precisar fazer nada.',
  },
  {
    q: 'Tenho mais de um profissional. Funciona?',
    a: 'Sim. No plano Equipe, cada profissional tem agenda e horários independentes. O cliente escolhe com quem quer ser atendido. Você acompanha a comissão de cada um pelo painel.',
  },
  {
    q: 'Preciso de cartão pra testar?',
    a: 'Não. São 14 dias grátis, sem cartão, sem compromisso. Você testa tudo e só decide depois.',
  },
  {
    q: 'O que acontece quando o teste acaba?',
    a: 'Você recebe um aviso antes do prazo. Para continuar, escolhe um plano. Se não contratar, o acesso ao painel é pausado — mas nenhum dado é apagado.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim. Sem multa, sem fidelidade, sem contrato anual. Se decidir cancelar, é pelo painel ou pelo WhatsApp.',
  },
]

/* ═══════════════════════════════════════════
   TIPO + ACCORDION ITEM
═══════════════════════════════════════════ */

export type FAQItem = { q: string; a: string }

function AccordionItem({
  faq,
  isOpen,
  toggle,
}: {
  faq: FAQItem
  isOpen: boolean
  toggle: () => void
}) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (bodyRef.current) {
      setHeight(bodyRef.current.scrollHeight)
    }
  }, [isOpen])

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: isOpen
          ? 'rgba(59,130,246,0.06)'
          : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isOpen ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors group"
      >
        <span className={`font-semibold text-sm pr-4 transition-colors ${isOpen ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
          {faq.q}
        </span>
        <span
          className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300"
          style={{
            background: isOpen
              ? 'linear-gradient(135deg, #3B82F6, #06B6D4)'
              : 'rgba(255,255,255,0.06)',
            border: `1px solid ${isOpen ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
            boxShadow: isOpen ? '0 0 12px rgba(59,130,246,0.4)' : 'none',
          }}
        >
          {/* Chevron SVG — roda 180deg quando aberto */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-300 ${isOpen ? 'text-white rotate-180' : 'text-slate-400'}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {/* Body com transição de height */}
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: isOpen ? `${height}px` : '0px' }}
      >
        <div ref={bodyRef} className="px-5 pb-5 pt-0">
          <p className="text-slate-400 text-sm leading-relaxed">{faq.a}</p>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   COMPONENTE EXPORTADO
═══════════════════════════════════════════ */

export default function FAQ({ items }: { items?: FAQItem[] } = {}) {
  const [open, setOpen] = useState<number | null>(null)
  const faqs = items ?? DEFAULT_FAQS

  return (
    <div className="max-w-2xl mx-auto">
      <div className="space-y-2.5">
        {faqs.map((faq, i) => (
          <AccordionItem
            key={i}
            faq={faq}
            isOpen={open === i}
            toggle={() => setOpen(open === i ? null : i)}
          />
        ))}
      </div>

      {/* CTA no final do FAQ */}
      <div
        className="mt-8 rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <p className="text-slate-400 text-sm">Ficou com alguma dúvida?</p>
        <a
          href="https://wa.me/5563992920080?text=Ol%C3%A1!%20Tenho%20uma%20d%C3%BAvida%20sobre%20o%20AgendaPRO."
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110"
          style={{
            background: 'linear-gradient(135deg, #22C55E, #16A34A)',
            boxShadow: '0 0 16px rgba(34,197,94,0.3)',
          }}
        >
          {/* WhatsApp SVG */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Falar no WhatsApp
        </a>
      </div>
    </div>
  )
}
