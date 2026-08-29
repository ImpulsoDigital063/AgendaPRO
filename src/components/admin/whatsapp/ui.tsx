'use client'

/* ═══════════════════════════════════════════════════════════════
   PEÇAS DA CENTRAL DE WHATSAPP

   Três decisões que valem pra tela inteira e que estão aqui pra não se
   perderem em cada arquivo:

   1. LISTA AGRUPADA, NÃO CARD POR ITEM. Cinco cards com borda e sombra é o
      que fazia tudo ter o mesmo peso — o Polaris (Shopify) chegou a
      depreciar o componente de toggle "em caixinha" por isso. Um container,
      divisores de 1px dentro.

   2. HIERARQUIA POR ESTRUTURA, NÃO POR COR. Estado do sistema é FAIXA sem
      card; configuração é lista agrupada; compra é outra tela. A cor de
      destaque aparece no máximo duas vezes por tela.

   3. STATUS NUNCA SÓ POR COR. Bolinha verde sem palavra falha em
      acessibilidade e não diz nada pra quem não conhece a convenção —
      sempre bolinha + rótulo.

   Mobile e desktop dividem tudo isso: o que muda é a largura máxima e o
   grid, declarados com `sm:` onde precisa.
   ═══════════════════════════════════════════════════════════════ */

import type { ReactNode } from 'react'

/** Chip discreto: "Beta", "Em análise", "No ar". Nunca só cor. */
export function Chip({
  children,
  tom = 'neutro',
}: {
  children: ReactNode
  tom?: 'neutro' | 'ok' | 'atencao' | 'erro'
}) {
  const cores = {
    neutro: { bg: 'var(--admin-surface-hi)', fg: 'var(--admin-text-mute)' },
    ok: { bg: 'rgba(34,197,94,0.12)', fg: '#15803d' },
    atencao: { bg: 'rgba(245,158,11,0.14)', fg: '#b45309' },
    erro: { bg: 'rgba(239,68,68,0.12)', fg: '#b91c1c' },
  }[tom]
  return (
    <span
      className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded whitespace-nowrap"
      style={{ background: cores.bg, color: cores.fg }}
    >
      {children}
    </span>
  )
}

/** Título de seção em varredura. Curto, caixa alta pequena, cor secundária. */
export function TituloSecao({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[11px] font-semibold uppercase tracking-wider mb-2 mt-5"
      style={{ color: 'var(--admin-text-faded)' }}
    >
      {children}
    </p>
  )
}

/** O container das listas. Um card, divisores por dentro. */
export function Lista({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
    >
      {children}
    </div>
  )
}

/**
 * Uma linha da lista. Altura confortável pro polegar (44px é o mínimo de
 * alvo de toque; aqui fica acima disso com o padding).
 *
 * `onClick` na linha inteira e `acao` à direita convivem: o toggle é
 * acionável sem entrar no detalhe — obrigar a abrir a tela só pra desligar
 * um aviso seria trocar um toque por três.
 */
export function Linha({
  titulo,
  snippet,
  meta,
  acao,
  onClick,
  destaque,
  primeira,
}: {
  titulo: ReactNode
  snippet?: string
  meta?: ReactNode
  acao?: ReactNode
  onClick?: () => void
  destaque?: 'atencao'
  primeira?: boolean
}) {
  const conteudo = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">{titulo}</div>
        {snippet && (
          /* UMA linha, truncada. Acordeão fechado sem resumo obriga abrir os
             cinco pra achar um — a NN/g lista isso como o erro clássico. */
          <p
            className="text-xs mt-0.5 truncate"
            style={{ color: 'var(--admin-text-mute)' }}
            title={snippet}
          >
            {snippet}
          </p>
        )}
        {meta && (
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>
            {meta}
          </p>
        )}
      </div>
      {acao && <div className="flex-shrink-0 flex items-center gap-2">{acao}</div>}
    </>
  )

  const estilo = {
    borderTop: primeira ? 'none' : '1px solid var(--admin-border)',
    background: destaque === 'atencao' ? 'rgba(245,158,11,0.06)' : undefined,
  }

  if (!onClick) {
    return (
      <div className="flex items-center gap-3 px-4 py-3" style={estilo}>
        {conteudo}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3 px-4 py-3" style={estilo}>
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        {conteudo}
      </button>
    </div>
  )
}

/** Seta de "abre outra tela". Sempre acompanha linha clicável. */
export function Seta() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 6l6 6-6 6"
        stroke="var(--admin-text-faded)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
      className="flex-shrink-0 w-11 h-6 rounded-full transition-colors relative disabled:opacity-50"
      style={{ background: ligado ? 'var(--admin-accent)' : 'var(--admin-border)' }}
    >
      <span
        className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-all"
        style={{ left: ligado ? 22 : 3 }}
      />
    </button>
  )
}

/**
 * Barra de consumo. Fina e neutra — barra grossa e colorida grita e compete
 * com o resto da tela. Vira âmbar só quando está acabando, que é quando ela
 * PRECISA chamar atenção.
 */
export function BarraConsumo({ usadas, total }: { usadas: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (usadas / total) * 100) : 0
  const acabando = total > 0 && usadas / total >= 0.8
  return (
    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--admin-border)' }}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: acabando ? '#f59e0b' : 'var(--admin-accent)' }}
      />
    </div>
  )
}

/** Cabeçalho das telas de dentro. X visível, não só o gesto de voltar. */
export function CabecalhoDetalhe({
  titulo,
  onVoltar,
  direita,
}: {
  titulo: string
  onVoltar: () => void
  direita?: ReactNode
}) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <button
        type="button"
        onClick={onVoltar}
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: 'var(--admin-surface-hi)' }}
        aria-label="Voltar"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M15 6l-6 6 6 6"
            stroke="var(--admin-text)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <h2 className="text-base font-semibold flex-1 min-w-0" style={{ color: 'var(--admin-text)' }}>
        {titulo}
      </h2>
      {direita}
    </div>
  )
}

/**
 * Balão de WhatsApp. A dona não lê template — ela reconhece a bolha.
 * Por isso a prévia vem renderizada com nome e horário de verdade, nunca
 * com {{1}}: merge tag crua é o que faz o produto parecer ferramenta de TI.
 */
export function Balao({ texto, botoes }: { texto: string; botoes?: string[] }) {
  return (
    <div
      className="rounded-xl rounded-tr-sm px-3 py-2.5 text-xs leading-relaxed whitespace-pre-line"
      style={{ background: 'rgba(37,211,102,0.10)', color: 'var(--admin-text)' }}
    >
      {texto}
      {botoes?.length ? (
        <div className="mt-2 -mx-1">
          {botoes.map((b) => (
            <div
              key={b}
              className="text-center text-xs py-1.5 font-medium"
              style={{ borderTop: '1px solid rgba(0,0,0,0.08)', color: '#1d9bf0' }}
            >
              {b}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
