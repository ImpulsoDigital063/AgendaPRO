'use client'

/**
 * Dúvidas frequentes · fim da aba Avisos (10/09/2026).
 *
 * Pedido do Eduardo depois do tour: o que o tour não cobre vira pergunta e
 * resposta, começando por "por que pacote" — a Meta cobra por mensagem.
 *
 * 🔴 Cada resposta afirma só o que o código faz HOJE. Conferido antes:
 *   · pacote acaba → avisos NÃO param (franquia.ts: "NÃO CORTA")
 *   · o que sobra soma na renovação (ativarPacote: compradas + antes.saldo)
 *   · mensagem que falha não conta (consumoDoMes ignora falhou_em)
 *   · aniversário gasta 7 (unidadesDaFranquia: MARKETING = 7)
 *   · resposta da cliente chega na aba e no celular, número oficial não é lido
 * E o que NÃO está aqui de propósito: cobrança de excedente. A conta existe
 * (custoExcedente), mas nenhuma rota de cobrança soma o excedente — prometer
 * "R$ 0,12 cada na fatura" seria afirmar uma cobrança que não acontece.
 *
 * Uma pergunta aberta por vez: com oito, abrir todas vira parede de texto.
 */

import { useState } from 'react'
import { IconChevronRight } from '@/components/ui/Icon'
import { termoPessoa } from '@/lib/segmento'
import { TituloSecao } from './ui'

const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function perguntas(categoria: string | null): { q: string; a: string }[] {
  const t = termoPessoa(categoria)
  return [
    {
      q: 'Por que as mensagens são por pacote?',
      a: 'Porque a Meta, dona do WhatsApp, cobra por cada mensagem entregue pelo número oficial. O pacote organiza essa conta: você sabe quantas mensagens tem no mês, em vez de pagar a cada envio.',
    },
    {
      q: 'O que acontece se o pacote acabar?',
      a: `Os avisos não param de sair: ${t.art} ${t.s} não fica sem lembrete no meio do mês. Antes de chegar lá, a conta do mês aqui em cima avisa, pra você trocar de pacote se precisar.`,
    },
    {
      q: 'Mensagem que sobra se perde?',
      a: 'Não. Quando o pacote renova, o que sobrou soma no novo.',
    },
    {
      q: 'Mensagem que não chega gasta do pacote?',
      a: 'Não. Só conta mensagem entregue. Se o número não tem WhatsApp ou a entrega falha, nada sai do seu pacote.',
    },
    {
      q: 'Por que o aviso de aniversário gasta mais?',
      a: 'A Meta classifica aniversário como mensagem de divulgação, que custa bem mais que um lembrete. Por isso cada envio gasta 7 mensagens do pacote.',
    },
    {
      q: 'Por que as mensagens não saem do meu número?',
      a: 'Mensagem automática saindo de WhatsApp pessoal é o que mais leva a bloqueio. Pelo número oficial, a Meta aprova cada texto antes e nada sai do seu número, então o seu WhatsApp não corre esse risco.',
    },
    {
      q: `${maiuscula(t.art)} ${t.s} pode responder a mensagem?`,
      a: 'Pode. A resposta aparece aqui na aba e no seu celular. Mas ninguém lê o número oficial: pra conversar, toque em Responder no WhatsApp e a conversa abre no seu número.',
    },
    {
      q: 'Posso mudar o texto de um aviso?',
      a: 'Pode. Toque no aviso e depois em escrever o seu texto. Todo texto novo passa pela aprovação da Meta e leva em média um dia, às vezes mais. Enquanto isso, sai o texto padrão.',
    },
  ]
}

export default function PerguntasAvisos({ categoria = null }: { categoria?: string | null }) {
  const [aberta, setAberta] = useState<number | null>(null)
  const lista = perguntas(categoria)

  return (
    <section className="mt-6">
      <TituloSecao>Dúvidas frequentes</TituloSecao>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
      >
        {lista.map((item, i) => {
          const abre = aberta === i
          return (
            <div key={i} style={i > 0 ? { borderTop: '1px solid var(--admin-divider)' } : undefined}>
              <button
                type="button"
                onClick={() => setAberta(abre ? null : i)}
                aria-expanded={abre}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left"
              >
                <span className="text-[13.5px] font-semibold leading-snug" style={{ color: 'var(--admin-text)' }}>
                  {item.q}
                </span>
                <span
                  aria-hidden="true"
                  className="flex-shrink-0 transition-transform duration-200"
                  style={{ color: 'var(--admin-text-faded)', transform: abre ? 'rotate(90deg)' : 'none' }}
                >
                  <IconChevronRight size={16} />
                </span>
              </button>
              {abre && (
                <p className="px-4 pb-3.5 -mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
                  {item.a}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
