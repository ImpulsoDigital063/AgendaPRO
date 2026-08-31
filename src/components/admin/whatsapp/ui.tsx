'use client'

/* ═══════════════════════════════════════════════════════════════
   PEÇAS DA CENTRAL DE WHATSAPP

   Reescrito em 29/08 depois que Eduardo abriu a versão anterior: cinza sobre
   cinza, tudo em 11px, nenhum ícone, e no desktop uma coluna de 672px colada
   na esquerda. Parecia tela de configuração de sistema operacional, não uma
   parte do AgendaPRO.

   O erro de raiz não foi de gosto: a tela tinha inventado o próprio visual em
   vez de usar o do sistema. Aqui as peças usam os tokens `--admin-*` e as
   classes `admin-card` do globals.css, que é o que faz o resto do painel
   parecer acabado.

   Três decisões que valem pra tela inteira:

   1. LISTA AGRUPADA, NÃO CARD POR ITEM. Cinco cards com borda e sombra é o
      que fazia tudo ter o mesmo peso. Um container, divisores por dentro.

   2. O ÍCONE CARREGA O ESTADO. Ligado = ícone no tom do accent; desligado =
      neutro. A linha inteira muda de cor com o interruptor, então dá pra ver
      o que está ativo sem ler nada. Estado codificado na forma, não só na
      posição de um toggle de 44px.

   3. STATUS NUNCA SÓ POR COR. Bolinha verde sem palavra não diz nada pra
      quem não conhece a convenção — sempre bolinha + rótulo.
   ═══════════════════════════════════════════════════════════════ */

import type { ReactNode } from 'react'

/* ═══════════════════════════════════════════════════════════════
   A COR DESTA FEATURE E VERDE, NAO O ACCENT DO NEGOCIO

   Eduardo abriu a Marcela no celular: "essa tela esta morta, esse fundo
   cinza, os textos em cinza". Fui medir e a causa nao era gosto — era o
   accent dela. `brand_primary` da Marcela e #0F172A, luminancia 0,009:
   preto. Numero grande, preco, botao e selo, tudo que eu tinha pintado com
   `--admin-accent` saia PRETO.

   E nao e caso isolado: 6 dos 29 negocios tem accent quase preto, e sao os
   dois maiores da base (Marcela 105 atend/mes, Olimpio 163) mais Priscila,
   Isis, Vitoria e Viva Cacheada. Amarrar a cor da feature a marca deixa um
   quinto da base com tela cinza.

   Entao a feature ganhou cor propria, e a honesta aqui e o verde do
   WhatsApp: e a cor DA COISA, nao enfeite. Nao briga com marca nenhuma
   porque le como "o modulo do WhatsApp", do mesmo jeito que o verde dentro
   do mockup le como "tela do WhatsApp".

   Tons escolhidos pelo contraste sobre branco, nao pelo brilho: #008069 (o
   verde escuro oficial) passa em texto, o #00A884 so aparece em gradiente e
   em fundo suave.
   ═══════════════════════════════════════════════════════════════ */
export const WA = {
  /** Texto e numero. Escuro o bastante pra ler em corpo pequeno. */
  forte: '#008069',
  /** Botao principal e selo. */
  gradiente: 'linear-gradient(135deg, #00A884 0%, #008069 100%)',
  sombra: '0 10px 24px -10px rgba(0,128,105,0.65)',
  /** Fundo suave de card destacado. */
  fundo: 'rgba(0,168,132,0.09)',
  borda: 'rgba(0,168,132,0.30)',
} as const

/** Chip discreto: "Beta", "Em análise", "No ar". Nunca só cor. */
export function Chip({
  children,
  tom = 'neutro',
}: {
  children: ReactNode
  tom?: 'neutro' | 'ok' | 'atencao' | 'erro'
}) {
  const cores = {
    neutro: { bg: 'var(--admin-input-bg)', fg: 'var(--admin-text-mute)', bd: 'var(--admin-border)' },
    ok: { bg: 'rgba(5,150,105,0.10)', fg: 'var(--admin-success)', bd: 'rgba(5,150,105,0.22)' },
    atencao: { bg: 'rgba(217,119,6,0.10)', fg: 'var(--admin-warn)', bd: 'rgba(217,119,6,0.24)' },
    erro: { bg: 'rgba(220,38,38,0.10)', fg: 'var(--admin-danger)', bd: 'rgba(220,38,38,0.22)' },
  }[tom]
  return (
    <span
      className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: cores.bg, color: cores.fg, border: `1px solid ${cores.bd}` }}
    >
      {children}
    </span>
  )
}

/** Título de seção. Curto, caixa alta pequena, cor secundária. */
export function TituloSecao({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 mb-2 mt-6 px-1">
      {/* Era `--admin-text-faded` (#94A3B8): sobre o fundo do painel o titulo
          de secao praticamente sumia. Subiu pro tom de texto secundario. */}
      <p
        className="text-[11px] font-bold uppercase tracking-wider"
        style={{ color: 'var(--admin-text-mute)' }}
      >
        {children}
      </p>
      {acao}
    </div>
  )
}

/** O container das listas. Um card do sistema, divisores por dentro. */
export function Lista({ children }: { children: ReactNode }) {
  return <div className="admin-card overflow-hidden">{children}</div>
}

/**
 * Ícone da linha. Quadrado arredondado com fundo suave — é ele que dá
 * ancoragem visual pra varredura e que carrega o estado ligado/desligado.
 */
export function IconeAviso({ children, ativo }: { children: ReactNode; ativo: boolean }) {
  return (
    <span
      className="flex-shrink-0 inline-flex items-center justify-center rounded-xl transition-colors"
      style={{
        width: 40,
        height: 40,
        background: ativo ? 'var(--admin-accent-bg)' : 'var(--admin-input-bg)',
        border: `1px solid ${ativo ? 'var(--admin-accent-border)' : 'var(--admin-border)'}`,
        color: ativo ? 'var(--admin-accent)' : 'var(--admin-text-faded)',
      }}
    >
      {children}
    </span>
  )
}

/**
 * Uma linha da lista. Alta o suficiente pro polegar (o alvo passa dos 44px
 * mínimos com o padding).
 *
 * `onClick` na linha inteira e `acao` à direita convivem: o interruptor é
 * acionável sem entrar no detalhe — obrigar a abrir a tela só pra desligar um
 * aviso seria trocar um toque por três.
 */
export function Linha({
  icone,
  titulo,
  snippet,
  meta,
  acao,
  onClick,
  destaque,
  primeira,
  delay,
}: {
  icone?: ReactNode
  titulo: ReactNode
  snippet?: string
  meta?: ReactNode
  acao?: ReactNode
  onClick?: () => void
  destaque?: 'atencao'
  primeira?: boolean
  /** Entrada em cascata, em ms. `.admin-enter` para sozinha quando o
   *  aparelho pede menos movimento. */
  delay?: number
}) {
  const conteudo = (
    <>
      {icone}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">{titulo}</div>
        {snippet && (
          /* UMA linha, truncada. Acordeão fechado sem resumo obriga abrir os
             cinco pra achar um — é o erro clássico de lista sanfonada. */
          <p
            className="text-[13px] mt-0.5 truncate"
            style={{ color: 'var(--admin-text-mute)' }}
            title={snippet}
          >
            {snippet}
          </p>
        )}
        {meta && (
          <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
            {meta}
          </p>
        )}
      </div>
    </>
  )

  const estilo = {
    borderTop: primeira ? 'none' : '1px solid var(--admin-divider)',
    background: destaque === 'atencao' ? 'rgba(217,119,6,0.06)' : undefined,
    ...(delay !== undefined ? ({ '--enter-delay': `${delay}ms` } as Record<string, string>) : {}),
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5${delay !== undefined ? ' admin-enter' : ''}`}
      style={estilo}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          {conteudo}
        </button>
      ) : (
        <div className="flex items-center gap-3 flex-1 min-w-0">{conteudo}</div>
      )}
      {acao && <div className="flex-shrink-0 flex items-center gap-2.5">{acao}</div>}
    </div>
  )
}

/** Interruptor. Salva na hora — tela de toggle não tem botão "Salvar". */
export function Toggle({
  ligado,
  onChange,
  desabilitado,
  rotulo,
}: {
  ligado: boolean
  onChange: () => void
  desabilitado?: boolean
  rotulo: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      disabled={desabilitado}
      onClick={onChange}
      className="flex-shrink-0 rounded-full transition-colors relative disabled:opacity-50"
      style={{
        width: 46,
        height: 27,
        background: ligado ? 'var(--admin-accent)' : 'var(--admin-border-hi)',
        boxShadow: ligado ? '0 2px 8px -2px rgba(37,99,235,0.5)' : 'none',
      }}
    >
      <span
        className="absolute rounded-full bg-white transition-all"
        style={{
          top: 3,
          width: 21,
          height: 21,
          left: ligado ? 22 : 3,
          boxShadow: '0 1px 3px rgba(15,23,42,0.28)',
        }}
      />
    </button>
  )
}

/**
 * Barra de consumo. Vira âmbar só quando está acabando, que é quando ela
 * PRECISA chamar atenção — barra colorida o tempo todo compete com o resto
 * da tela e ninguém olha quando importa.
 */
export function BarraConsumo({ usadas, total }: { usadas: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (usadas / total) * 100) : 0
  const acabando = total > 0 && usadas / total >= 0.8
  return (
    <div
      className="h-1.5 rounded-full overflow-hidden"
      style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${pct}%`,
          background: acabando ? 'var(--admin-warn)' : 'var(--admin-accent)',
        }}
      />
    </div>
  )
}

/**
 * Balão de WhatsApp. A dona não lê template — ela reconhece a bolha.
 * A prévia vem renderizada com nome e horário de verdade, nunca com {{1}}:
 * merge tag crua é o que faz o produto parecer ferramenta de TI.
 */
export function Balao({ texto, botoes }: { texto: string; botoes?: string[] }) {
  return (
    <div
      className="rounded-2xl px-4 py-3 text-[13px] leading-relaxed whitespace-pre-line"
      style={{
        background: 'rgba(37,211,102,0.10)',
        border: '1px solid rgba(37,211,102,0.22)',
        borderTopLeftRadius: 6,
        color: 'var(--admin-text)',
      }}
    >
      {texto}
      {botoes?.length ? (
        <div className="mt-2.5 -mx-1">
          {botoes.map((b) => (
            <div
              key={b}
              className="text-center text-[13px] py-2 font-semibold"
              style={{ borderTop: '1px solid rgba(15,23,42,0.08)', color: '#1d9bf0' }}
            >
              {b}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
