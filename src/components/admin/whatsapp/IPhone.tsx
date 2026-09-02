/* ═══════════════════════════════════════════════════════════════
   MOLDURA DE IPHONE — o aparelho, não a tela

   Eduardo (01/09), sobre a tela de venda dos pacotes: "colocar um mockup
   de iPhone, utilizar SVGs, ou seja vamos deixar essa tela com cara de LP".

   Separado de `TelaWhatsApp` de propósito: aquele componente é o CONTEÚDO
   (cabeçalho do contato, balão, barra de digitar) e já existia; este é só
   o aparelho em volta. A mesma conversa aparece com moldura na LP e sem
   moldura onde o espaço é curto, sem duplicar a encenação da mensagem
   chegando.

   ─── Por que a moldura virou imagem ───────────────────────────
   A primeira versão desenhava o aparelho em CSS: aro com gradiente, ilha,
   botões. Nunca convenceu — o aro saía chapado e a proporção só ficava
   certa por acaso. Eduardo mandou um mockup pronto e perguntou "que tal
   esse", e ele é melhor que qualquer coisa que dê pra fazer com borda e
   sombra: iPhone 14 Pro de frente, aro de duas camadas com reflexo,
   ilha com a lente desenhada.

   O arquivo veio como JPG com fundo cinza e tela branca. O que foi feito:
     1. recorte no corpo do aparelho
     2. fundo cinza vazado por distância de cor (o aro fica com a borda
        suavizada, sem serrilha)
     3. a ÁREA DA TELA vazada à parte, só onde é branco — assim a ilha,
        que é preta, sobrevive e continua por cima do conteúdo

   Resultado: 58 KB de PNG que a gente empilha por cima do conteúdo. O
   conteúdo entra ATRÁS, no retângulo medido abaixo.

   ─── A barra de status não é enfeite ──────────────────────────
   Sem ela a ilha cai em cima do cabeçalho do WhatsApp e come o nome do
   remetente — no primeiro print do mobile lia "Ag…" com a pílula preta
   por cima. No aparelho real a hora fica à ESQUERDA da ilha e os ícones à
   DIREITA, e a barra herda a cor do app aberto. Resolve por geometria.

   ─── Licença ─────────────────────────────────────────────────
   O mockup veio de um pacote de vetor baixado. Vale conferir a licença
   antes de isso ir pra produção — é imagem de terceiro num produto pago.
   ═══════════════════════════════════════════════════════════════ */

import type { CSSProperties, ReactNode } from 'react'

/* Onde a tela mora dentro do PNG, medido pixel a pixel no arquivo (o
   branco puro da tela contra o aro preto). Em porcentagem pra escalar com
   qualquer largura. A proporção da tela deu 2,173 — a do iPhone 14 Pro de
   verdade é 2,164, então o mockup é honesto. */
const TELA = { left: '6.48%', top: '2.72%', width: '87.04%', height: '88.80%' }

/* ── Os glifos da barra de status ──────────────────────────────────
   SVG e não emoji: 📶 e 🔋 mudam de desenho em cada sistema e entregam o
   mockup como colagem. Herdam `currentColor` e escalam com o aparelho. */
function Sinal({ t }: { t: number }) {
  return (
    <svg width={t} height={t} viewBox="0 0 16 12" fill="currentColor" aria-hidden="true">
      <rect x="0" y="8" width="3" height="4" rx="1" />
      <rect x="4.3" y="5.5" width="3" height="6.5" rx="1" />
      <rect x="8.6" y="3" width="3" height="9" rx="1" />
      <rect x="12.9" y="0" width="3" height="12" rx="1" />
    </svg>
  )
}

function Wifi({ t }: { t: number }) {
  return (
    <svg width={t} height={t} viewBox="0 0 16 12" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M1 4.2a10 10 0 0 1 14 0" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3.6 6.9a6.2 6.2 0 0 1 8.8 0" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="10" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function Bateria({ t }: { t: number }) {
  return (
    <svg width={t * 1.6} height={t} viewBox="0 0 26 12" fill="none" aria-hidden="true">
      <rect x="0.6" y="0.6" width="21" height="10.8" rx="3" stroke="currentColor" strokeWidth="1.1" opacity="0.5" />
      <rect x="2.2" y="2.2" width="16" height="7.6" rx="1.8" fill="currentColor" />
      <path d="M23.4 4.4v3.2a2.2 2.2 0 0 0 0-3.2z" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

export default function IPhone({
  children,
  largura = 260,
  className = '',
  style,
  corStatus = '#075E54',
  hora = '9:41',
}: {
  children: ReactNode
  /** Largura do aparelho inteiro, aro incluído. */
  largura?: number
  className?: string
  style?: CSSProperties
  /** Fundo da barra de status. Casa com o cabeçalho do app que está dentro
   *  — no WhatsApp é o verde escuro, como no aparelho de verdade. */
  corStatus?: string
  hora?: string
}) {
  /* A barra precisa ser mais alta que a ilha, senão o cabeçalho volta a
     aparecer por baixo dela. 15% da largura cobre a ilha com folga. */
  const alturaBarra = largura * 0.15
  const glifo = Math.max(6, largura * 0.04)

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: largura, ...style }}
      aria-hidden="true"
    >
      {/* ── O conteúdo, ATRÁS da moldura ────────────────────────
          Fica em `z-0` e a moldura em `z-10`. A área da tela do PNG está
          vazada, então o conteúdo aparece por ali; a ilha, que continua
          opaca no arquivo, passa por cima — que é o que acontece no
          aparelho. Foi assim pra não ter que redesenhar a ilha em CSS. */}
      <div
        className="absolute overflow-hidden"
        style={{
          ...TELA,
          borderRadius: largura * 0.12,
          background: '#fff',
          zIndex: 0,
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{
            background: corStatus,
            height: alturaBarra,
            paddingLeft: largura * 0.09,
            paddingRight: largura * 0.08,
            color: '#fff',
          }}
        >
          <span
            className="font-semibold tabular-nums leading-none"
            style={{ fontSize: Math.max(7, largura * 0.046) }}
          >
            {hora}
          </span>
          <span className="flex items-center" style={{ gap: largura * 0.016 }}>
            <Sinal t={glifo} />
            <Wifi t={glifo} />
            <Bateria t={glifo} />
          </span>
        </div>

        {children}
      </div>

      {/* ── A moldura ───────────────────────────────────────────
          `pointer-events-none` porque ela cobre o conteúdo inteiro: sem
          isso, nada dentro da tela receberia clique. Hoje o conteúdo é
          decorativo, mas isso muda no dia em que virar demo clicável. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/lp/iphone-frame.png"
        alt=""
        className="relative w-full pointer-events-none select-none"
        width={560}
        height={1193}
        style={{ zIndex: 10 }}
        draggable={false}
      />
    </div>
  )
}
