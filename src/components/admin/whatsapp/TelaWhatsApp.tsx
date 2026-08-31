'use client'

/* ═══════════════════════════════════════════════════════════════
   A TELA DO CELULAR DELA — com a mensagem chegando

   Ideia de Eduardo (31/08), lembrando o mockup que a gente fez no site do
   Vida em Equilíbrio. A estrutura vem de lá (cabeçalho com avatar, área de
   conversa, balão, barra de digitar decorativa); o que muda é o ponto de
   vista e o movimento.

   ─── Duas decisões que fazem a peça valer ─────────────────────

   1. É O CELULAR DA CLIENTE, NÃO O DA DONA. Por isso o balão é BRANCO e
      alinhado à esquerda: no WhatsApp, mensagem que CHEGA é branca; a verde
      à direita é a que você mandou. Se a gente pintasse de verde, estaria
      mostrando a tela errada — e a dona não reconheceria como "o que a
      minha cliente vê".

   2. A MENSAGEM CHEGA, não está lá. Balão parado é ilustração; balão que
      chega é demonstração. A sequência é digitando → mensagem → botões, que
      é exatamente a ordem em que acontece de verdade no aparelho dela.

   O verde só existe aqui dentro. É a mesma regra que a gente usou no Vida em
   Equilíbrio: dentro do mockup o verde não é decisão de marca, é
   representação de uma tela real — fora dele, a paleta é a do negócio.

   `prefers-reduced-motion` pula a encenação inteira e entrega a tela pronta.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react'

/* Cores do WhatsApp de verdade. Ficam cravadas de propósito: representar
   uma tela alheia com a paleta do AgendaPRO seria representar errado. */
const VERDE_CABECALHO = '#075E54'
const PAPEL_DE_PAREDE = '#ECE5DD'
const AZUL_BOTAO = '#1d9bf0'

function querMenosMovimento() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export default function TelaWhatsApp({
  negocio,
  texto,
  botoes,
  hora = '14:32',
}: {
  negocio: string
  texto: string
  botoes?: string[]
  hora?: string
}) {
  /* 0 = digitando · 1 = mensagem chegou · 2 = botões */
  const [etapa, setEtapa] = useState(0)

  useEffect(() => {
    if (querMenosMovimento()) {
      setEtapa(2)
      return
    }
    const t1 = setTimeout(() => setEtapa(1), 1100)
    const t2 = setTimeout(() => setEtapa(2), 1600)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  const inicial = (negocio.trim()[0] ?? 'A').toUpperCase()

  return (
    <div
      className="w-full max-w-sm rounded-[26px] overflow-hidden"
      style={{
        border: '1px solid var(--admin-border)',
        boxShadow: '0 30px 60px -24px rgba(15,23,42,0.35)',
      }}
    >
      {/* ── Cabeçalho da conversa ─────────────────────────────── */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-2.5"
        style={{ background: VERDE_CABECALHO, color: '#fff' }}
      >
        <span
          className="flex-shrink-0 inline-flex items-center justify-center rounded-full text-[13px] font-bold"
          style={{ width: 34, height: 34, background: 'rgba(255,255,255,0.22)' }}
        >
          {inicial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight truncate">{negocio}</p>
          <p className="text-[10px] leading-tight" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {etapa === 0 ? 'digitando…' : 'online'}
          </p>
        </div>
      </div>

      {/* ── A conversa ────────────────────────────────────────── */}
      <div
        className="px-3 py-4 flex flex-col gap-2"
        style={{ background: PAPEL_DE_PAREDE, minHeight: 210 }}
      >
        {etapa === 0 ? (
          /* Pontinhos de "digitando". Reusa o keyframe admin-dot-pulse que
             já existe no globals, com atraso diferente em cada bolinha. */
          <div
            className="self-start rounded-2xl px-3.5 py-3 flex items-center gap-1"
            style={{ background: '#fff', borderTopLeftRadius: 4, boxShadow: '0 1px 1px rgba(0,0,0,0.08)' }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  background: '#9aa3a8',
                  animation: 'admin-dot-pulse 1.1s ease-in-out infinite',
                  animationDelay: `${i * 160}ms`,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="self-start max-w-[88%] admin-enter">
            {/* Balão BRANCO: é mensagem que chega. Verde seria a tela da
                dona, não a da cliente. */}
            <div
              className="px-3 py-2.5 text-[12.5px] leading-relaxed whitespace-pre-line"
              style={{
                background: '#fff',
                color: '#111b21',
                borderRadius: 12,
                borderTopLeftRadius: 4,
                boxShadow: '0 1px 1px rgba(0,0,0,0.10)',
              }}
            >
              {texto}
              <span
                className="block text-right text-[10px] mt-1"
                style={{ color: '#667781' }}
              >
                {hora}
              </span>
            </div>

            {botoes?.length && etapa >= 2 ? (
              <div className="mt-1 admin-enter" style={{ '--enter-delay': '0ms' } as React.CSSProperties}>
                {botoes.map((b, i) => (
                  <div
                    key={b}
                    className="text-center text-[12.5px] font-medium py-2"
                    style={{
                      background: '#fff',
                      color: AZUL_BOTAO,
                      borderRadius: 12,
                      marginTop: i === 0 ? 0 : 2,
                      boxShadow: '0 1px 1px rgba(0,0,0,0.10)',
                    }}
                  >
                    {b}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* ── Barra de digitar, decorativa ──────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 py-2.5"
        style={{ background: '#F0F2F5', borderTop: '1px solid rgba(0,0,0,0.06)' }}
      >
        <div
          className="flex-1 rounded-full px-3.5 py-2 text-[12px]"
          style={{ background: '#fff', color: '#8696a0' }}
        >
          Mensagem
        </div>
        <span
          className="flex-shrink-0 inline-flex items-center justify-center rounded-full"
          style={{ width: 32, height: 32, background: '#00A884', color: '#fff' }}
          aria-hidden="true"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </span>
      </div>
    </div>
  )
}
