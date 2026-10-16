'use client'

/* ═══════════════════════════════════════════════════════════════
   BOTÃO DE CONFIRMAR — quantas vezes ele vai (v162 · 16/10/2026)

   Eduardo: "botão confirmar deve ir na primeira msg, mas não nas outras, e
   isso deve virar decisão do dono... se sim quantas vezes".

   Era uma caixinha DENTRO de cada lembrete, e não funcionava: desmarcada,
   o botão continuava na tela da cliente (é parte do template aprovado). E
   a pergunta não é de um aviso — "só na primeira" é uma regra ENTRE os
   avisos. Por isso virou uma escolha só, do negócio, logo abaixo da régua.

   Quatro respostas, e não um liga/desliga, porque o dado pede: o lembrete
   da véspera confirma 27 de 77, a confirmação 26 de 105. Tirar o botão da
   véspera custa confirmação pra quem não respondeu a primeira — então
   "até confirmar" existe pra quem quer insistir sem repetir pra quem já
   respondeu.
   ═══════════════════════════════════════════════════════════════ */

import type { TermoPessoa } from '@/lib/segmento'
import type { ModoBotao } from '@/lib/mensagens/botao-confirmar'
import { TituloSecao } from './ui'

function opcoes(T: TermoPessoa): { modo: ModoBotao; titulo: string; detalhe: string }[] {
  return [
    {
      modo: 'primeira',
      titulo: 'Só na primeira mensagem',
      detalhe: 'O botão vai no primeiro aviso do horário. Os lembretes seguintes saem sem ele.',
    },
    {
      modo: 'ate_confirmar',
      titulo: `Até ${T.pron} confirmar`,
      detalhe: `Vai em cada aviso até ${T.pron} tocar em "Confirmar presença". Depois, os próximos saem sem.`,
    },
    {
      modo: 'sempre',
      titulo: 'Em todos os avisos',
      detalhe: `Vai sempre, mesmo depois de ${T.pron} já ter confirmado.`,
    },
    {
      modo: 'nao',
      titulo: 'Não pedir confirmação',
      detalhe: 'Nenhuma mensagem leva o botão. Serve pra quem confirma por ligação ou atende por ordem de chegada.',
    },
  ]
}

export default function BotaoConfirmar({
  T,
  modo,
  salvando,
  onMudar,
}: {
  T: TermoPessoa
  modo: ModoBotao
  salvando: boolean
  onMudar: (m: ModoBotao) => void
}) {
  return (
    <div data-tour="avisos-botao">
      <TituloSecao>Botão de confirmar</TituloSecao>
      <p
        className="text-[13.5px] leading-relaxed mb-2.5 px-1"
        style={{ color: 'var(--admin-text-2)' }}
      >
        {`${T.art === 'a' ? 'A' : 'O'} ${T.s} toca em "Confirmar presença" e o horário fica confirmado na sua agenda. Escolha quantas vezes esse pedido vai.`}
      </p>
      <div className="admin-card px-2 py-1.5" role="radiogroup" aria-label="Botão de confirmar">
        {opcoes(T).map((o, i) => {
          const marcado = o.modo === modo
          return (
            <button
              key={o.modo}
              type="button"
              role="radio"
              aria-checked={marcado}
              disabled={salvando}
              onClick={() => !marcado && onMudar(o.modo)}
              className="w-full flex items-start gap-3 text-left px-2.5 py-3 rounded-xl transition-colors disabled:opacity-60"
              style={{
                borderTop: i === 0 ? undefined : '1px solid var(--admin-border)',
                background: marcado ? 'var(--admin-accent-bg)' : 'transparent',
              }}
            >
              <span
                aria-hidden="true"
                className="flex-shrink-0 mt-0.5 rounded-full inline-flex items-center justify-center"
                style={{
                  width: 18,
                  height: 18,
                  border: `2px solid ${marcado ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                }}
              >
                {marcado && (
                  <span className="rounded-full" style={{ width: 8, height: 8, background: 'var(--admin-accent)' }} />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold leading-snug" style={{ color: 'var(--admin-text)' }}>
                  {o.titulo}
                </span>
                <span className="block text-[12px] leading-snug mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>
                  {o.detalhe}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
