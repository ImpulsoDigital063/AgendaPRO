'use client'

/* ═══════════════════════════════════════════════════════════════
   O QUE A CLIENTE RESPONDEU — registro, não caixa de entrada

   Eduardo vetou o card de caixa de entrada em 28/08: "isso de fato aumenta a
   fricção". Ele tinha razão — aquele card propunha que a dona ATENDESSE pelo
   AgendaPRO, criando uma segunda caixa pra cuidar além do WhatsApp dela.

   Em 01/09 ele bateu no outro extremo: tocou na notificação de resposta e não
   abriu nada, porque o push aponta pra `/admin/whatsapp` e lá não havia nada.

   A diferença desta tela pra aquele card, e é ela que faz valer:

   · NÃO tem marcar como lida, arquivar, status nem responder por aqui
   · O botão joga pro WhatsApp DELA, na conversa com aquela cliente
   · É lista de leitura. Nada aqui exige ação, nada acumula pendência

   Em outras palavras: mostra o que chegou e sai da frente.
   ═══════════════════════════════════════════════════════════════ */

import { useState } from 'react'
import { IconClose, IconWhatsapp } from '@/components/ui/Icon'
import type { TermoPessoa } from '@/lib/segmento'
import { Lista, TituloSecao, WA } from './ui'

export type Resposta = {
  id: string
  nome: string | null
  telefone: string
  texto: string
  quando: string
  appointmentId: string | null
}

/** "hoje 04:06" · "ontem 22:10" · "28/08 15:40" — o formato que a dona usa
 *  pra saber se aquilo ainda importa. */
function quando(iso: string): string {
  const d = new Date(iso)
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const hoje = new Date()
  const dia = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`
  const ontem = new Date(hoje.getTime() - 864e5)
  if (dia(d) === dia(hoje)) return `hoje ${hora}`
  if (dia(d) === dia(ontem)) return `ontem ${hora}`
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${hora}`
}

/** 556392920080 → (63) 99292-0080 */
function bonito(bruto: string): string {
  const d = (bruto || '').replace(/\D/g, '')
  const s = d.startsWith('55') ? d.slice(2) : d
  if (s.length < 10) return bruto
  return `(${s.slice(0, 2)}) ${s.slice(2, s.length - 4)}-${s.slice(-4)}`
}

export default function Respostas({
  T,
  respostas,
  onApagar,
}: {
  T: TermoPessoa
  respostas: Resposta[]
  onApagar: (id: string) => Promise<void>
}) {
  const [apagando, setApagando] = useState<string | null>(null)
  if (!respostas.length) return null

  return (
    <div className="mt-8">
      <TituloSecao>{`O que ${T.possP} ${T.p} responderam`}</TituloSecao>
      <p
        className="text-[13.5px] leading-relaxed mb-2.5 px-1"
        style={{ color: 'var(--admin-text-2)' }}
      >
        {`Quando ${T.art} ${T.s} responde um aviso, a mensagem chega aqui e no seu celular. Este número não é lido por ninguém — para responder, toque em `}
        <strong style={{ color: WA.forte }}>Responder no WhatsApp</strong> e a conversa abre no seu.
        Depois de ler, o <strong>×</strong> apaga de vez. O que sobrar some sozinho em 30 dias.
      </p>

      <Lista>
        {respostas.map((r, i) => (
          <div
            key={r.id}
            className="px-4 py-3.5"
            style={{ borderTop: i === 0 ? 'none' : '1px solid var(--admin-divider)' }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span
                className="text-[15px] font-semibold truncate"
                style={{ color: 'var(--admin-text)' }}
              >
                {r.nome || bonito(r.telefone)}
              </span>
              <span className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[11px] tabular-nums" style={{ color: 'var(--admin-text-faded)' }}>
                  {quando(r.quando)}
                </span>
                {/* Apaga de vez, nao "marca como lida": marcar guardaria o
                    dado do mesmo jeito. */}
                <button
                  type="button"
                  aria-label="Apagar esta resposta"
                  disabled={apagando === r.id}
                  onClick={async () => {
                    setApagando(r.id)
                    await onApagar(r.id)
                    setApagando(null)
                  }}
                  className="w-7 h-7 rounded-full inline-flex items-center justify-center disabled:opacity-40"
                  style={{ background: 'var(--admin-surface-hi)', color: 'var(--admin-text-faded)' }}
                >
                  <IconClose size={13} />
                </button>
              </span>
            </div>

            {/* A resposta em balão de recebida — é mensagem que CHEGOU. */}
            <div
              className="mt-1.5 inline-block max-w-full px-3 py-2 text-[13.5px] leading-relaxed whitespace-pre-line"
              style={{
                background: 'var(--admin-surface-hi)',
                border: '1px solid var(--admin-border)',
                borderRadius: 12,
                borderTopLeftRadius: 4,
                color: 'var(--admin-text)',
                wordBreak: 'break-word',
              }}
            >
              {r.texto}
            </div>

            <div className="mt-2">
              <a
                href={`https://wa.me/${r.telefone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold rounded-lg px-3 py-2"
                style={{ background: WA.fundo, border: `1px solid ${WA.borda}`, color: WA.forte }}
              >
                <IconWhatsapp size={15} />
                Responder no WhatsApp
              </a>
            </div>
          </div>
        ))}
      </Lista>
    </div>
  )
}
