'use client'

/* ═══════════════════════════════════════════════════════════════
   RECARREGAR — a compra, em tela própria

   O erro que essa tela conserta: cinco cards de plano empilhados na tela de
   configuração. Dois motivos, e nenhum é estético.

   1. Empilhar card de preço em celular funciona até QUATRO planos. São cinco
      — exatamente a faixa onde o padrão para de servir e vira rolagem.
   2. Comprar competia com configurar na mesma tela. A Fresha, que atende o
      mesmo público no mesmo problema, não mostra plano na tela de automação:
      mostra SALDO, e a recarga é um fluxo à parte. É o que está aqui.

   Lista de rádio, não carrossel: carrossel esconde quatro das cinco opções
   atrás de um gesto e tem a pior adoção medida. Lista mostra as cinco de uma
   vez, e é o padrão que a dona já conhece de recarga de celular.

   O preço vai DENTRO do botão fixo embaixo — ela nunca precisa rolar de volta
   pra lembrar quanto vai pagar.
   ═══════════════════════════════════════════════════════════════ */

import { useState } from 'react'
import { Chip, Lista } from './ui'

export type PacoteTela = {
  id: string
  nome: string
  unidades: number
  preco: number
  atendimentosQueCabem: number
  custoNoSeuMovimento: number
}

const reais = (n: number) => 'R$ ' + n.toFixed(2).replace('.', ',')

export default function Recarga({
  pacotes,
  atual,
  recomendado,
  temMovimento,
  podeContratar,
  liberado,
  onContratar,
  salvando,
  erro,
}: {
  pacotes: PacoteTela[]
  atual: string | null
  recomendado: string
  temMovimento: boolean
  podeContratar: boolean
  liberado: boolean
  onContratar: (id: string) => void
  salvando: boolean
  erro: string | null
}) {
  const [escolhido, setEscolhido] = useState<string>(atual ?? recomendado)
  const p = pacotes.find((x) => x.id === escolhido)

  return (
    <div className="pb-24 sm:pb-0">
      <p className="text-[13px] leading-relaxed mb-3" style={{ color: 'var(--admin-text-mute)' }}>
        {temMovimento
          ? 'Escolha quantas mensagens você quer por mês. Se passar, as extras saem por R$ 0,12 cada e os avisos não param.'
          : 'Escolha quantas mensagens você quer por mês. Quando a agenda tiver movimento, mostramos aqui qual pacote cobre o seu ritmo.'}
      </p>

      <Lista>
        {pacotes.map((x, i) => {
          const marcado = x.id === escolhido
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => setEscolhido(x.id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--admin-divider)' }}
            >
              <span
                className="flex-shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center"
                style={{
                  border: `2px solid ${marcado ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                }}
              >
                {marcado && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: 'var(--admin-accent)' }}
                  />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="text-[15px] font-bold" style={{ color: 'var(--admin-text)' }}>
                    {x.unidades} mensagens
                  </span>
                  {x.id === atual && <Chip tom="ok">seu pacote</Chip>}
                  {x.id !== atual && x.id === recomendado && temMovimento && (
                    <Chip tom="ok">mais barato pra você</Chip>
                  )}
                </span>
                <span className="block text-[11px] mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>
                  {x.nome} · dá para {x.atendimentosQueCabem} atendimentos por mês
                </span>
              </span>

              <span
                className="flex-shrink-0 text-[15px] font-semibold tabular-nums"
                style={{ color: 'var(--admin-text)' }}
              >
                {reais(x.preco)}
              </span>
            </button>
          )
        })}
      </Lista>

      {erro && (
        <p className="text-[13px] mt-3" style={{ color: 'var(--admin-danger)' }}>
          {erro}
        </p>
      )}

      {/* CTA fixo com o preço dentro. Ela nunca rola de volta pra conferir. */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 px-4 py-3 backdrop-blur-xl border-t sm:static sm:z-auto sm:px-0 sm:py-0 sm:mt-5 sm:backdrop-blur-none sm:border-0 sm:bg-transparent"
        style={{
          background: 'var(--admin-bottomnav-bg)',
          borderColor: 'var(--admin-border)',
        }}
      >
        <div className="max-w-2xl mx-auto sm:mx-0">
          {!liberado ? (
            <p className="text-xs text-center sm:text-left" style={{ color: 'var(--admin-text-faded)' }}>
              Disponível assim que o canal for liberado.
            </p>
          ) : !podeContratar ? (
            <p className="text-xs text-center sm:text-left" style={{ color: 'var(--admin-text-faded)' }}>
              Só o dono da conta contrata ou troca o pacote.
            </p>
          ) : (
            <button
              type="button"
              disabled={salvando || !p}
              onClick={() => p && onContratar(p.id)}
              className="w-full py-3.5 rounded-xl text-[15px] font-bold disabled:opacity-60 transition-transform hover:scale-[1.01]"
              style={{
                background: 'var(--admin-accent)',
                color: '#fff',
                boxShadow: '0 8px 20px -8px rgba(37,99,235,0.6)',
              }}
            >
              {salvando
                ? 'Gerando cobrança…'
                : `${atual ? 'Trocar' : 'Contratar'} · ${p ? reais(p.preco) : ''} por mês`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
