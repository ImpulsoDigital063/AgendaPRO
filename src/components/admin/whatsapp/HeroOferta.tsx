'use client'

/* ═══════════════════════════════════════════════════════════════
   HERO DA OFERTA — a abertura da LP de dentro do sistema

   Eduardo (01/09), depois de mandar a landing da Trinks: "a tela de vendas
   de pacotes tem que funcionar como uma LP, pois ali vamos ter que vender
   essa ideia pra nossa cliente que já está dentro da nossa plataforma...
   vamos humanizar também, colocar uma imagem de uma mulher segurando um
   celular, colocar um mockup de iPhone, utilizar SVGs".

   ─── O que a Trinks faz e a gente copiou ──────────────────────
   Selo pequeno em cima ("Solução adicional"), título grande, uma linha de
   explicação, CTA, e uma pessoa de verdade à direita. O selo é a parte
   esperta: dizer "módulo adicional" ANTES de pedir dinheiro desarma o
   "por que eu pago mais?" melhor do que qualquer parágrafo depois.

   ─── O que a gente faz e ela não pode ────────────────────────
   O celular mostra a mensagem QUE ELA JÁ CONFIGUROU (`previa`), com o
   nome do negócio dela dentro. A Trinks mostra "Salão Carioca", que é
   fictício pra todo mundo que lê. A nossa é a dela. Nenhum concorrente
   consegue isso porque nenhum sabe o que ela escreveu.

   ─── Por que NÃO tem foto de pessoa ──────────────────────────
   Ele pediu "uma mulher segurando um celular" e eu levei duas do Unsplash,
   curadas e conferidas no olho. Recusou as duas. Na terceira rodada, em
   vez de garimpar de novo, a decisão foi tirar a pessoa: a prova desta
   tela é a mensagem dela, com o nome do cliente dela e o serviço que ela
   vende. Foto de banco não prova e dá exatamente o ar genérico que a gente
   está tentando tirar do sistema.

   Fica registrado pro caso de voltar: foto RECORTADA em fundo liso, que é
   o que a Trinks usa, não existe no Unsplash. É gênero de banco pago
   (Freepik, Adobe), onde o arquivo já vem com fundo transparente.

   ─── Cor ─────────────────────────────────────────────────────
   Verde do WhatsApp (`WA`), não `--admin-accent`. Seis negócios da base
   têm accent quase preto — a Marcela tem `#0F172A` — e o hero inteiro
   saía preto sobre branco. Aqui o verde não é marca, é o canal.
   ═══════════════════════════════════════════════════════════════ */

import type { CSSProperties } from 'react'
import { IconWhatsapp } from '@/components/ui/Icon'
import type { TermoPessoa } from '@/lib/segmento'
import { WA } from './ui'
import TelaWhatsApp from './TelaWhatsApp'
import IPhone from './IPhone'

const entra = (ms: number) => ({ '--enter-delay': `${ms}ms` }) as CSSProperties

/** Rola até a âncora respeitando quem pediu menos movimento. */
function irPara(id: string) {
  const alvo = document.getElementById(id)
  if (!alvo) return
  const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  alvo.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' })
}

export default function HeroOferta({
  T,
  remetente,
  numero,
  previa,
  atendimentosMes,
}: {
  T: TermoPessoa
  remetente: string
  numero: string
  /** A confirmação que ela já escreveu. Null = ela ainda não configurou. */
  previa: string | null
  atendimentosMes: number
}) {
  const Poss = `${T.poss.charAt(0).toUpperCase()}${T.poss.slice(1)}`

  return (
    <section className="relative overflow-hidden">
      {/* ── Clarão verde atrás ──────────────────────────────────
          Fica no canto do bloco visual, não centralizado: centralizado
          vira "fundo colorido", no canto vira luz. Não intercepta clique. */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          top: -140,
          right: -120,
          width: 460,
          height: 460,
          background: `radial-gradient(circle, ${WA.fundo} 0%, rgba(255,255,255,0) 70%)`,
        }}
        aria-hidden="true"
      />

      <div className="relative lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12 lg:items-center">
        {/* ═══ TEXTO ═══════════════════════════════════════════ */}
        <div className="pt-1">
          <span
            className="admin-enter inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider"
            style={{
              ...entra(0),
              background: WA.fundo,
              border: `1px solid ${WA.borda}`,
              color: WA.forte,
            }}
          >
            <IconWhatsapp size={13} />
            Módulo adicional
          </span>

          <h2
            className="admin-enter text-[30px] sm:text-[38px] lg:text-[42px] leading-[1.08] font-bold tracking-tight mt-4"
            style={{ ...entra(60), color: 'var(--admin-text)', textWrap: 'balance' }}
          >
            {Poss} {T.s} confirma sozinh{T.s === 'cliente' ? 'a' : 'o'}.
            <br />
            <span style={{ color: WA.forte }}>Você não digita nada.</span>
          </h2>

          <p
            className="admin-enter text-[15px] sm:text-[16px] leading-relaxed mt-4 max-w-[46ch]"
            style={{ ...entra(110), color: 'var(--admin-text-2)' }}
          >
            {`O AgendaPRO manda a confirmação no WhatsApp ${T.de} na hora que o horário é marcado, e o lembrete um dia antes. `}
            <strong style={{ color: 'var(--admin-text)' }}>
              {`Quando ${T.pron} toca em "Confirmar presença", o agendamento ganha o selo na sua agenda.`}
            </strong>
          </p>

          {/* ── Os dois botões ────────────────────────────────
              Primário rola pro preço, secundário pro "como funciona". Numa
              LP dentro do sistema, quem já entendeu quer o preço agora e
              quem não entendeu quer ver funcionando — os dois caminhos
              precisam estar na primeira dobra. */}
          <div className="admin-enter flex flex-wrap items-center gap-2.5 mt-6" style={entra(160)}>
            <button
              type="button"
              onClick={() => irPara('precos')}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-bold text-white transition-transform active:scale-[0.98]"
              style={{ background: WA.gradiente, boxShadow: WA.sombra }}
            >
              Ver os planos
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => irPara('como-funciona')}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-semibold transition-colors"
              style={{
                color: 'var(--admin-text)',
                border: '1px solid var(--admin-border)',
                background: 'var(--admin-surface)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                <path d="M10 8.5l6 3.5-6 3.5V8.5z" fill="currentColor" />
              </svg>
              Ver funcionando
            </button>
          </div>

          {/* Prova de escala, só quando existe. Sem movimento medido este
              bloco some — número inventado numa tela de venda é o começo
              da desconfiança. */}
          {atendimentosMes > 0 && (
            <p
              className="admin-enter text-[12.5px] mt-4"
              style={{ ...entra(210), color: 'var(--admin-text-faded)' }}
            >
              {`Sua agenda fez `}
              <strong style={{ color: 'var(--admin-text-2)' }}>
                {atendimentosMes} atendimentos
              </strong>
              {` no último mês. É esse movimento que a gente usa pra calcular o plano certo aqui embaixo.`}
            </p>
          )}
        </div>

        {/* ═══ VISUAL ══════════════════════════════════════════
            Eduardo escolheu tirar a pessoa (01/09), depois de duas fotos
            recusadas: "essa foto tá muito ruim". Ele tem razão, e o motivo
            é mais forte que gosto — a prova aqui é a mensagem DELA, com o
            nome do cliente dela e o serviço que ela vende. Uma modelo de
            banco não prova nada e é justamente o que dá cara de genérico.
            Nenhum concorrente consegue mostrar isso, porque nenhum sabe o
            que ela escreveu. */}
        <div
          className="admin-enter relative mt-10 lg:mt-0 flex justify-center"
          style={entra(240)}
        >
          {/* Base verde atrás do aparelho. Círculo e não retângulo: dá chão
              pro celular sem virar card, e some nas bordas em vez de
              cortar reto. */}
          <div
            className="absolute pointer-events-none rounded-full"
            style={{
              width: 340,
              height: 340,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle, ${WA.fundo} 0%, rgba(0,168,132,0.02) 62%, rgba(255,255,255,0) 74%)`,
            }}
            aria-hidden="true"
          />

          {/* Sem foto, o aparelho é o visual — então volta a ser grande.
              `origin-top` no scale pro topo não descolar do texto quando
              encolhe no mobile. */}
          <div className="relative origin-top scale-90 sm:scale-100">
            <IPhone largura={244}>
              <TelaWhatsApp
                remetente={remetente}
                numero={numero}
                texto={
                  previa ??
                  'Oi Ana, tudo bem? Seu horário ficou marcado.\n\nDia: sábado, 06/09\nHorário: 14:30'
                }
                botoes={['Confirmar presença', 'Preciso remarcar']}
              />
            </IPhone>
          </div>
        </div>
      </div>
    </section>
  )
}
