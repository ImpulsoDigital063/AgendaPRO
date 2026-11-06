/* ═══════════════════════════════════════════════════════════════
   ABA METAS · 3 CAMINHOS de composição (protótipo 05–06/11/2026)

   /admin/metas?visual=A|B|C mostra a mesma tela com outro layout, logada e
   com os dados de montarMetas (nada novo no banco). Sem o parâmetro a tela
   atual (MetasView) não muda. Mesmos dados e mesmos links; muda a
   COMPOSIÇÃO. Eduardo escolhe um (ou combina) e aí vira a tela de verdade.

     A · Placar do mês ......... meio-arco único com a marca "meta de hoje",
                                  linha do mês colada; blocos de tamanhos
                                  diferentes (Hoje largo + quadrados).
     B · Faixa de status ....... faixa na cor do negócio com a FRASE de
                                  status grande; Hoje como cartão maior;
                                  computador = cartão principal + Hoje à direita.
     C · Cartões de progresso .. mês, sonho e top serviços como cartões de %
                                  grande + barra; Hoje vira cartões de ação.

   Regras: tela clara, destaque = --admin-accent (cor do negócio), número
   grande + rótulo curto, bloco sem dado some, começo de mês (R$ 0) mostra
   o "por dia" e nunca um R$ 0 gigante. Celular = sem prefixo; computador
   (lg: ≥1024) usa a largura toda.
   ═══════════════════════════════════════════════════════════════ */

import Link from 'next/link'
import type { ReactNode } from 'react'
import { IconCalendar, IconChevronRight, IconPencil, IconPlus, IconTarget, IconTrendingUp, IconSparkles, IconCheck } from '@/components/ui/Icon'
import type { MetasViewProps } from './MetasView'
import { Comparacao, Fatia, IconeAcao, Trilha } from './MetasView'
import { BarraMeta } from './BarraMeta'
import { GraficoMes } from './GraficoMes'
import Cofrinho from './Cofrinho'
import { guardarPorMes } from '@/lib/metas/traducao'

export type Visual = 'A' | 'B' | 'C'
type Props = MetasViewProps & { mesAtual: string }

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0, minimumFractionDigits: 0 })
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const SUPERFICIE = { background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', boxShadow: 'var(--admin-shadow)' }
const TRILHO = 'color-mix(in srgb, var(--admin-accent) 13%, var(--admin-surface))'
const KICKER = 'text-[11px] font-bold uppercase tracking-widest'
const COR_TXT = { color: 'var(--admin-text)' }
const COR_MUTE = { color: 'var(--admin-text-mute)' }
const COR_FADED = { color: 'var(--admin-text-faded)' }

/* ── conta comum aos 3 caminhos (mesma regra da tela atual) ── */
type Tom = 'bateu' | 'frente' | 'ritmo' | 'atras' | 'comeco' | 'semmeta'
function derivar(p: Props) {
  const temMeta = p.meta !== null && p.meta > 0
  const meta = p.meta ?? 0
  const faltam = Math.max(0, meta - p.faturado)
  const bateu = temMeta && p.faturado >= meta
  const pct = temMeta ? Math.floor((p.faturado / meta) * 100) : 0
  const dias = Math.max(1, p.diasRestantes)
  const porDia = faltam > 0 ? Math.ceil(faltam / dias / 10) * 10 : 0
  const atendFaltam = p.ticket && faltam > 0 ? Math.ceil(faltam / p.ticket) : null
  const pctRitmo = temMeta && p.ritmo && p.ritmo > 0 ? Math.min(100, (p.ritmo / meta) * 100) : null
  const dif = temMeta && p.ritmo !== null ? p.faturado - p.ritmo : null
  const tol = meta * 0.03
  const diasTxt = p.diasRestantes === 1 ? 'último dia de trabalho' : `${p.diasRestantes} dias de trabalho`

  let tom: Tom
  let frase: string
  let sub: string
  if (!temMeta) { tom = 'semmeta'; frase = `Sem meta em ${p.mesNome}`; sub = 'Defina e veja todo dia se está no caminho' }
  else if (bateu) { tom = 'bateu'; frase = 'Meta batida!'; sub = p.faturado > meta ? `${brl(p.faturado - meta)} acima da meta` : p.bateuTexto }
  else if (p.faturado <= 0) { tom = 'comeco'; frase = 'O mês está começando'; sub = `${brl(porDia)} por dia fecha os ${brl(meta)}` }
  else if (dif === null || (p.ritmo ?? 0) <= 0 || Math.abs(dif) <= tol) { tom = 'ritmo'; frase = 'No caminho'; sub = `${brl(porDia)} por dia até o fim do mês` }
  else if (dif > 0) { tom = 'frente'; frase = `${brl(dif)} à frente`; sub = `do que devia ter hoje · ${brl(porDia)} por dia fecha` }
  else { tom = 'atras'; frase = `${brl(-dif)} atrás`; sub = `${brl(porDia)} por dia ainda fecha a meta` }

  const corTom = tom === 'bateu' || tom === 'frente' || tom === 'ritmo' ? 'var(--admin-success)' : tom === 'atras' ? 'var(--admin-danger)' : 'var(--admin-accent)'
  const pctPrevisao = temMeta && p.previsao ? Math.floor((p.previsao / meta) * 100) : null
  const c = p.composicao
  const totalComp = c.servicos + c.produtos + c.outros
  const historico = p.historico.filter((h) => h.feito > 0 || h.meta)
  const temGrafico = p.faturado > 0 && p.acumulado.length > 1
  return { temMeta, meta, faltam, bateu, pct, porDia, atendFaltam, pctRitmo, tom, frase, sub, corTom, diasTxt, pctPrevisao, totalComp, historico, temGrafico }
}
type D = ReturnType<typeof derivar>

/* ── barra de troca A / B / C (só aparece com ?visual=) ── */
export function TrocaVisual({ atual }: { atual: Visual }) {
  const nomes: Record<Visual, string> = { A: 'Placar', B: 'Faixa', C: 'Cartões' }
  return (
    <nav aria-label="Comparar caminhos" className="sticky top-0 z-30 flex justify-center px-4 pt-3">
      <div className="inline-flex items-center gap-1 rounded-full p-1 text-[12px] font-bold" style={{ ...SUPERFICIE, boxShadow: '0 6px 20px rgba(15,23,42,.10)' }}>
        <span className="px-2" style={COR_FADED}>Caminho</span>
        {(['A', 'B', 'C'] as Visual[]).map((v) => (
          <Link key={v} href={`/admin/metas?visual=${v}`} className="rounded-full px-3 py-1.5" style={v === atual ? { background: 'var(--admin-accent)', color: '#fff' } : COR_MUTE}>
            {v} · {nomes[v]}
          </Link>
        ))}
        <Link href="/admin/metas" className="rounded-full px-3 py-1.5" style={COR_FADED}>Atual</Link>
      </div>
    </nav>
  )
}

/* ── peças comuns ── */
function Cabecalho({ p, d, claro }: { p: Props; d: D; claro?: boolean }) {
  return (
    <header className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <p className={`${KICKER} truncate`} style={claro ? { color: 'rgba(255,255,255,.8)' } : COR_FADED}>{p.negocio}</p>
        <h1 className="text-[26px] font-bold tracking-tight leading-tight inline-flex items-center gap-2" style={claro ? { color: '#fff' } : COR_TXT}>
          <IconTarget size={22} /> Metas
        </h1>
      </div>
      {d.temMeta && (
        <Link href="/admin/metas/definir" className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl shrink-0"
          style={claro ? { color: '#fff', background: 'rgba(255,255,255,.16)' } : { color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)', background: 'var(--admin-surface)' }}>
          <IconPencil size={15} /> Editar meta
        </Link>
      )}
    </header>
  )
}

function BotaoDefinir({ p, claro }: { p: Props; claro?: boolean }) {
  return (
    <Link href="/admin/metas/definir" className="inline-flex items-center justify-center gap-2 w-full lg:w-auto px-5 py-3 rounded-2xl text-[15px] font-bold"
      style={claro ? { background: '#fff', color: 'var(--admin-accent)' } : { background: 'var(--admin-accent)', color: '#fff' }}>
      Definir minha meta de {p.mesNome} <IconChevronRight size={16} />
    </Link>
  )
}

function Bloco({ children, className = '', testid }: { children: ReactNode; className?: string; testid?: string }) {
  return <section data-testid={testid} className={`rounded-3xl p-5 lg:p-6 ${className}`} style={SUPERFICIE}>{children}</section>
}

/** quadrado: número grande + rótulo curto */
function Quadrado({ rotulo, numero, rodape, testid }: { rotulo: string; numero: ReactNode; rodape?: ReactNode; testid?: string }) {
  return (
    <section data-testid={testid} className="rounded-3xl p-4 lg:p-5 flex flex-col justify-between min-h-[124px]" style={SUPERFICIE}>
      <span className="text-[13px] font-semibold leading-tight" style={COR_MUTE}>{rotulo}</span>
      <div className="mt-2">
        <b className="block text-[24px] lg:text-[28px] font-extrabold tracking-tight tabular-nums leading-none" style={COR_TXT}>{numero}</b>
        {rodape ? <span className="block mt-1.5 text-[12px] font-semibold leading-tight">{rodape}</span> : null}
      </div>
    </section>
  )
}

function AcaoLinha({ a, grande }: { a: Props['acoes'][number]; grande?: boolean }) {
  const t = grande ? 52 : 44
  return (
    <li data-testid={`acao-${a.tipo}`} className="flex items-center gap-3 py-3">
      <span className="flex items-center justify-center rounded-2xl shrink-0" style={{ width: t, height: t, background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}>
        {a.numero !== null ? <b className={`${grande ? 'text-[22px]' : 'text-[18px]'} font-extrabold tabular-nums`}>{a.numero}</b> : <IconeAcao tipo={a.tipo} />}
      </span>
      <div className="min-w-0 flex-1">
        <b className="block text-[15px] leading-snug" style={COR_TXT}>{a.titulo}</b>
        <small className="block text-[12px] mt-0.5 truncate" style={COR_MUTE}>{a.detalhe}</small>
      </div>
      {a.botao && (
        <Link href={a.botao.href} aria-label={a.botao.rotulo} className="shrink-0 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-[13px] font-bold whitespace-nowrap" style={{ background: 'var(--admin-accent)', color: '#fff' }}>
          {a.botao.rotulo} <IconChevronRight size={14} />
        </Link>
      )}
    </li>
  )
}

function ListaHoje({ p, grande }: { p: Props; grande?: boolean }) {
  return (
    <ul className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
      {p.acoes.map((a) => <AcaoLinha key={a.tipo} a={a} grande={grande} />)}
    </ul>
  )
}

function Grafico({ p, d, largura = 780 }: { p: Props; d: D; largura?: number }) {
  return (
    <>
      <div className="lg:hidden"><GraficoMes acumulado={p.acumulado} meta={d.temMeta ? d.meta : null} diasNoMes={p.diasNoMes} /></div>
      <div className="hidden lg:block"><GraficoMes acumulado={p.acumulado} meta={d.temMeta ? d.meta : null} diasNoMes={p.diasNoMes} largura={largura} altura={200} /></div>
    </>
  )
}

function DeOndeVem({ p, d }: { p: Props; d: D }) {
  const c = p.composicao
  const corProduto = 'color-mix(in srgb, var(--admin-accent) 45%, var(--admin-surface))'
  const precisam = d.atendFaltam !== null ? c.atendimentos + d.atendFaltam : null
  return (
    <Bloco testid="de-onde-vem">
      <p className={KICKER} style={COR_FADED}>De onde vem</p>
      <div className="mt-3 flex w-full overflow-hidden rounded-full" style={{ height: 10, gap: 2 }}>
        {c.servicos > 0 && <i style={{ width: `${(c.servicos / d.totalComp) * 100}%`, background: 'var(--admin-accent)' }} />}
        {c.produtos > 0 && <i style={{ width: `${(c.produtos / d.totalComp) * 100}%`, background: corProduto }} />}
        {c.outros > 0 && <i style={{ width: `${(c.outros / d.totalComp) * 100}%`, background: 'var(--admin-border-hi)' }} />}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Fatia cor="var(--admin-accent)" rotulo="Serviços" valor={c.servicos} />
        {c.produtos > 0 && <Fatia cor={corProduto} rotulo="Produtos" valor={c.produtos} />}
        {c.outros > 0 && <Fatia cor="var(--admin-border-hi)" rotulo="Pacotes e sinais" valor={c.outros} />}
      </div>
      {c.atendimentos > 0 && (
        <div className="mt-4 pt-4 grid grid-cols-2 gap-3" style={{ borderTop: '1px solid var(--admin-border)' }}>
          <div>
            <span className="block text-[12px]" style={COR_MUTE}>Ticket médio</span>
            <b className="block text-[22px] font-extrabold tabular-nums mt-1" style={COR_TXT}>{brl(c.ticketMedio)}</b>
          </div>
          <div data-testid="atendimentos">
            <span className="block text-[12px]" style={COR_MUTE}>Atendimentos</span>
            <b className="block text-[22px] font-extrabold tabular-nums mt-1" style={COR_TXT}>
              {c.atendimentos}{precisam ? <span className="text-[14px] font-semibold" style={COR_MUTE}> de ~{precisam}</span> : null}
            </b>
          </div>
        </div>
      )}
    </Bloco>
  )
}

function TopServicos({ p }: { p: Props }) {
  const max = p.topServicos[0]?.valor ?? 0
  return (
    <Bloco testid="top-servicos">
      <p className={KICKER} style={COR_FADED}>O que mais trouxe dinheiro</p>
      <ol className="mt-3 space-y-3">
        {p.topServicos.map((s, i) => (
          <li key={s.nome}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[14px] font-semibold" style={COR_TXT}><span className="tabular-nums mr-1.5" style={{ color: 'var(--admin-accent)' }}>{i + 1}</span>{s.nome}</span>
              <b className="text-[15px] tabular-nums shrink-0" style={COR_TXT}>{brl(s.valor)}</b>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ background: TRILHO }}>
                <i className="block h-full rounded-full" style={{ width: `${max > 0 ? (s.valor / max) * 100 : 0}%`, background: 'var(--admin-accent)' }} />
              </div>
              <small className="text-[11px] tabular-nums shrink-0" style={COR_FADED}>{s.qtd}×</small>
            </div>
          </li>
        ))}
      </ol>
    </Bloco>
  )
}

/** meses anteriores como colunas: altura = quanto fez, cor cheia = bateu */
function MesesColunas({ d }: { d: D }) {
  const lista = d.historico.slice(-6)
  const max = Math.max(1, ...lista.map((h) => Math.max(h.feito, h.meta ?? 0)))
  return (
    <Bloco testid="meses-anteriores">
      <p className={KICKER} style={COR_FADED}>Meses anteriores</p>
      <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${lista.length}, minmax(0, 1fr))` }}>
        {lista.map((h) => {
          const bateuMes = h.meta ? h.feito >= h.meta : false
          const alt = Math.max(4, (h.feito / max) * 100)
          return (
            <div key={h.ym} className="flex flex-col items-center gap-1.5 min-w-0">
              <b className="text-[12px] lg:text-[13px] tabular-nums whitespace-nowrap" style={COR_TXT}>{h.feito >= 10000 ? `${(h.feito / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : brl(h.feito).replace('R$ ', '')}</b>
              <div className="relative w-full max-w-[44px] h-[96px] rounded-xl overflow-hidden flex items-end" style={{ background: TRILHO }}>
                <i className="block w-full rounded-xl" style={{ height: `${alt}%`, background: bateuMes ? 'var(--admin-success)' : 'var(--admin-accent)' }} />
              </div>
              <span className="text-[12px] font-bold uppercase" style={COR_MUTE}>{MESES_CURTOS[Number(h.ym.slice(5, 7)) - 1]}</span>
              <span className="text-[11px] font-bold h-4" style={{ color: bateuMes ? 'var(--admin-success)' : 'var(--admin-text-faded)' }}>
                {h.meta ? (bateuMes ? <span className="inline-flex items-center gap-0.5"><IconCheck size={11} strokeWidth={3} />bateu</span> : `${Math.floor((h.feito / h.meta) * 100)}%`) : ''}
              </span>
            </div>
          )
        })}
      </div>
    </Bloco>
  )
}

function Sonho({ p, d }: { p: Props; d: D }) {
  if (!p.sonho) {
    if (!d.temMeta) return null
    return (
      <Link href="/admin/metas/definir?passo=2" className="flex items-center justify-center gap-2 rounded-3xl p-5 text-sm font-semibold" style={{ color: 'var(--admin-text-mute)', border: '1.5px dashed var(--admin-border-hi)' }}>
        <IconPlus size={16} /> Adicionar um sonho (opcional)
      </Link>
    )
  }
  const s = p.sonho
  return (
    <Bloco>
      <div className="flex items-center justify-between">
        <p className={KICKER} style={COR_FADED}>Pra que essa meta?</p>
        <Link href="/admin/metas/definir?passo=2" className="text-xs font-semibold" style={COR_MUTE}>Editar</Link>
      </div>
      <div className="mt-3 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.imagemSonho} alt="" width={72} height={54} loading="lazy" className="rounded-xl object-cover shrink-0" style={{ width: 72, height: 54 }} />
        <div className="min-w-0">
          <b className="block text-[15px] leading-snug truncate" style={COR_TXT}>{s.titulo}</b>
          <small className="block text-[13px]" style={COR_MUTE}>
            {[s.custo ? brl(s.custo) : null, s.ateMes ? `até ${MESES[Number(s.ateMes.slice(5, 7)) - 1]}${s.ateMes.slice(0, 4) !== p.mesAtual.slice(0, 4) ? ` de ${s.ateMes.slice(0, 4)}` : ''}` : null].filter(Boolean).join(' · ') || 'sem prazo'}
          </small>
        </div>
      </div>
      {s.ateMes && !s.conquistado && <Trilha desde={s.desdeMes < p.mesAtual ? s.desdeMes : p.mesAtual} ate={s.ateMes} atual={p.mesAtual} />}
      <Cofrinho custo={s.custo} saldo={s.saldo} movimentos={s.movimentos} porMes={guardarPorMes(s.custo, s.saldo, s.ateMes, p.mesAtual)} sobraDaMeta={d.bateu ? p.faturado - d.meta : 0} conquistado={s.conquistado} />
    </Bloco>
  )
}

function Rodape() {
  return (
    <p className="mt-6 text-xs text-center inline-flex w-full items-center justify-center gap-1.5" style={COR_FADED}>
      <IconCalendar size={12} /> Faturamento pela data do atendimento e da venda, igual ao Relatório financeiro
    </p>
  )
}

/** quadrados comuns: por dia, atendimentos, com o agendado, mês passado */
function quadrados(p: Props, d: D): ReactNode[] {
  const out: ReactNode[] = []
  if (d.temMeta && !d.bateu && d.porDia > 0) {
    out.push(<Quadrado key="dia" testid="por-dia" rotulo="Por dia, daqui pra frente" numero={brl(d.porDia)} rodape={<span style={COR_FADED}>{d.diasTxt}</span>} />)
  }
  if (d.atendFaltam) {
    out.push(<Quadrado key="at" testid="faltam-atendimentos" rotulo="Atendimentos pra fechar" numero={`≈ ${d.atendFaltam}`} rodape={<span style={COR_FADED}>no seu ticket médio</span>} />)
  }
  if (p.previsao) {
    out.push(<Quadrado key="prev" testid="previsao" rotulo="Com o agendado, chega a" numero={brl(p.previsao)}
      rodape={d.pctPrevisao !== null ? <span style={{ color: d.pctPrevisao >= 100 ? 'var(--admin-success)' : 'var(--admin-accent)' }}>{d.pctPrevisao}% da meta</span> : null} />)
  }
  if (p.comparacao) {
    out.push(<Quadrado key="cmp" testid="comparacao" rotulo={`${cap(p.comparacao.nomeMes)} até dia ${p.comparacao.dia}`} numero={brl(p.comparacao.valor)} rodape={<Comparacao agora={p.faturado} antes={p.comparacao.valor} />} />)
  }
  return out
}

/* ═══════════════ A · PLACAR DO MÊS ═══════════════ */

/** meio-arco único: progresso + marca "meta de hoje" (lê sem legenda) */
function MeioArco({ pct, pctRitmo, bateu }: { pct: number; pctRitmo: number | null; bateu: boolean }) {
  const R = 100, cx = 140, cy = 128
  const pt = (t: number, r: number) => [cx - r * Math.cos(Math.PI * t), cy - r * Math.sin(Math.PI * t)] as const
  const arco = `M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`
  const cheio = Math.min(100, Math.max(0, pct))
  let marca: ReactNode = null
  if (pctRitmo !== null && !bateu) {
    const t = pctRitmo / 100
    const [x1, y1] = pt(t, R - 16)
    const [x2, y2] = pt(t, R + 16)
    const [lx, ly] = pt(t, R + 30)
    const anchor = t < 0.35 ? 'end' : t > 0.65 ? 'start' : 'middle'
    marca = (
      <g data-testid="marcador-ritmo">
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--admin-surface)" strokeWidth={7} strokeLinecap="round" />
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--admin-text)" strokeWidth={3.5} strokeLinecap="round" />
        <text x={lx} y={ly + 4} textAnchor={anchor} fontSize={12} fontWeight={700} fill="var(--admin-text-mute)">meta de hoje</text>
      </g>
    )
  }
  return (
    <svg viewBox="0 0 280 140" className="w-full" role="img" aria-label={`${pct}% da meta`}>
      <path d={arco} fill="none" stroke={TRILHO} strokeWidth={20} strokeLinecap="round" />
      {cheio > 0 && <path d={arco} fill="none" pathLength={100} strokeDasharray={`${cheio} 200`} stroke={bateu ? 'var(--admin-success)' : 'var(--admin-accent)'} strokeWidth={20} strokeLinecap="round" />}
      {marca}
    </svg>
  )
}

function CaminhoA({ p }: { p: Props }) {
  const d = derivar(p)
  const qs = quadrados(p, d)
  const placar = (
    <Bloco className="lg:p-7" testid="placar">
      <div className="flex items-center justify-between gap-2">
        <p className={KICKER} style={{ color: 'var(--admin-accent)' }}>{cap(p.mesNome)}</p>
        {d.temMeta && <span className="text-[12px] font-semibold" style={COR_FADED}>meta {brl(d.meta)}</span>}
      </div>
      {d.temMeta ? (
        <>
          <div className="relative mx-auto mt-2 max-w-[340px] lg:max-w-[400px]">
            <MeioArco pct={d.pct} pctRitmo={d.pctRitmo} bateu={d.bateu} />
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center text-center">
              {d.tom === 'comeco' ? (
                <>
                  <b className="text-[34px] lg:text-[42px] leading-none font-extrabold tracking-tight tabular-nums" style={COR_TXT}>{brl(d.porDia)}</b>
                  <span className="mt-1 text-[13px] font-semibold" style={COR_MUTE}>por dia fecha o mês</span>
                </>
              ) : (
                <>
                  <b className="text-[44px] lg:text-[54px] leading-none font-extrabold tracking-tight tabular-nums" style={COR_TXT}>{d.pct}%</b>
                  <span className="mt-1 text-[13px] font-semibold tabular-nums" style={COR_MUTE}>{brl(p.faturado)} de {brl(d.meta)}</span>
                </>
              )}
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <span data-testid="ritmo" className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[15px] font-extrabold" style={{ color: d.corTom, background: `color-mix(in srgb, ${d.corTom} 10%, var(--admin-surface))` }}>
              {d.tom === 'comeco' ? <IconSparkles size={16} /> : d.tom === 'atras' ? null : <IconTrendingUp size={16} />}
              {d.frase}
            </span>
          </div>
          <p className="mt-2 text-center text-[13px]" style={COR_MUTE}>{d.sub}</p>
        </>
      ) : (
        <div className="mt-3">
          <b className="block text-[34px] lg:text-[42px] leading-none font-extrabold tracking-tight tabular-nums" style={COR_TXT}>{brl(p.faturado)}</b>
          <span className="block text-sm mt-1 mb-4" style={COR_MUTE}>faturado em {p.mesNome} até agora</span>
          <BotaoDefinir p={p} />
        </div>
      )}
      {d.temGrafico && (
        <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--admin-border)' }} data-testid="grafico-mes">
          <p className={KICKER} style={COR_FADED}>O mês dia a dia</p>
          <div className="mt-2"><Grafico p={p} d={d} largura={620} /></div>
        </div>
      )}
    </Bloco>
  )
  const hoje = (
    <Bloco testid="hoje">
      <p className={KICKER} style={COR_FADED}>Hoje</p>
      <div className="mt-1"><ListaHoje p={p} grande /></div>
    </Bloco>
  )
  return (
    <div className="px-4 lg:px-8 pt-5 pb-32 lg:pb-12 max-w-lg mx-auto lg:max-w-[1360px]">
      <Cabecalho p={p} d={d} />
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
        {placar}
        <div className="grid grid-cols-1 gap-4">
          {hoje}
          {qs.length > 0 && <div className="grid grid-cols-2 gap-4">{qs}</div>}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
        {d.totalComp > 0 && <DeOndeVem p={p} d={d} />}
        {p.topServicos.length > 0 && <TopServicos p={p} />}
        {d.historico.length > 0 && <MesesColunas d={d} />}
        <Sonho p={p} d={d} />
      </div>
      <Rodape />
    </div>
  )
}

/* ═══════════════ B · FAIXA DE STATUS + AÇÕES ═══════════════ */

function CaminhoB({ p }: { p: Props }) {
  const d = derivar(p)
  const qs = quadrados(p, d)
  const branco70 = { color: 'rgba(255,255,255,.82)' }
  const faixa = (
    <section data-testid="faixa" className="relative overflow-hidden rounded-3xl p-5 pb-6 lg:p-8" style={{ background: 'var(--admin-accent)', color: '#fff', boxShadow: 'var(--admin-shadow)' }}>
      <span aria-hidden className="absolute -right-16 -top-20 rounded-full" style={{ width: 240, height: 240, background: 'rgba(255,255,255,.10)' }} />
      <span aria-hidden className="absolute right-10 -bottom-24 rounded-full" style={{ width: 180, height: 180, background: 'rgba(255,255,255,.07)' }} />
      <div className="relative">
        <Cabecalho p={p} d={d} claro />
        <p className={`${KICKER} mt-6`} style={branco70}>{cap(p.mesNome)}</p>
        <h2 data-testid="ritmo" className="mt-1 text-[34px] lg:text-[48px] leading-[1.05] font-extrabold tracking-tight">{d.frase}</h2>
        <p className="mt-2 text-[15px] lg:text-[17px] font-semibold" style={branco70}>{d.sub}</p>
        {d.temMeta ? (
          <div className="mt-5 lg:max-w-[640px]">
            <div className="flex items-baseline justify-between gap-3 text-[14px] font-bold tabular-nums">
              <span>{brl(p.faturado)} <span className="font-semibold" style={branco70}>de {brl(d.meta)}</span></span>
              <span>{d.pct}%</span>
            </div>
            <div className="relative mt-2">
              <div className="h-[10px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.25)' }}>
                <i className="block h-full rounded-full" style={{ width: `${Math.min(100, d.pct)}%`, background: '#fff' }} />
              </div>
              {d.pctRitmo !== null && !d.bateu && (
                <span data-testid="marcador-ritmo" aria-hidden className="absolute flex flex-col items-center" style={{ left: `${d.pctRitmo}%`, top: -5, transform: 'translateX(-50%)' }}>
                  <i className="block rounded-full" style={{ width: 4, height: 20, background: '#fff', boxShadow: '0 0 0 2px var(--admin-accent)' }} />
                  <small className="mt-1 text-[11px] font-bold whitespace-nowrap" style={branco70}>hoje</small>
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-5"><BotaoDefinir p={p} claro /></div>
        )}
      </div>
    </section>
  )
  const hoje = (
    <Bloco testid="hoje" className="lg:p-7">
      <div className="flex items-center justify-between">
        <h3 className="text-[20px] font-extrabold tracking-tight" style={COR_TXT}>O que fazer hoje</h3>
        <span className="text-[12px] font-bold rounded-full px-2.5 py-1" style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}>{p.acoes.length}</span>
      </div>
      <div className="mt-2"><ListaHoje p={p} grande /></div>
    </Bloco>
  )
  return (
    <div className="px-4 lg:px-8 pt-5 pb-32 lg:pb-12 max-w-lg mx-auto lg:max-w-[1360px]">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="grid grid-cols-1 gap-4">
          {faixa}
          <div className="lg:hidden">{hoje}</div>
          {qs.length > 0 && <div className={`grid grid-cols-2 gap-4 ${qs.length >= 3 ? 'lg:grid-cols-4' : ''}`}>{qs}</div>}
          {d.temGrafico && (
            <Bloco testid="grafico-mes">
              <p className={KICKER} style={COR_FADED}>O mês dia a dia</p>
              <div className="mt-3"><Grafico p={p} d={d} /></div>
            </Bloco>
          )}
          {(d.totalComp > 0 || p.topServicos.length > 0) && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
              {d.totalComp > 0 && <DeOndeVem p={p} d={d} />}
              {p.topServicos.length > 0 && <TopServicos p={p} />}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:sticky lg:top-16">
          <div className="hidden lg:block">{hoje}</div>
          {d.historico.length > 0 && <MesesColunas d={d} />}
          <Sonho p={p} d={d} />
        </div>
      </div>
      <Rodape />
    </div>
  )
}

/* ═══════════════ C · CARTÕES DE PROGRESSO ═══════════════ */

function CartaoProgresso({ kicker, numero, rotulo, pct, cor, ritmo, children, testid, destaque }: {
  kicker: string; numero: ReactNode; rotulo: ReactNode; pct: number | null; cor?: string; ritmo?: number | null; children?: ReactNode; testid?: string; destaque?: boolean
}) {
  return (
    <section data-testid={testid} className="rounded-3xl p-5 lg:p-6 flex flex-col" style={destaque ? { ...SUPERFICIE, borderColor: 'color-mix(in srgb, var(--admin-accent) 35%, var(--admin-border))' } : SUPERFICIE}>
      <p className={`${KICKER} truncate`} style={{ color: destaque ? 'var(--admin-accent)' : 'var(--admin-text-faded)' }}>{kicker}</p>
      <b className="mt-2 block text-[40px] lg:text-[46px] leading-none font-extrabold tracking-tight tabular-nums" style={{ color: cor ?? 'var(--admin-text)' }}>{numero}</b>
      <span className="mt-1.5 block text-[13px] font-semibold leading-snug" style={COR_MUTE}>{rotulo}</span>
      {pct !== null && (
        <div className="mt-4">
          {ritmo !== undefined
            ? <BarraMeta atual={pct} alvo={100} alto={12} ritmo={ritmo} />
            : <div className="h-[10px] rounded-full overflow-hidden" style={{ background: TRILHO }}><i className="block h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: 'var(--admin-accent)' }} /></div>}
        </div>
      )}
      {children}
    </section>
  )
}

function CaminhoC({ p }: { p: Props }) {
  const d = derivar(p)
  const s = p.sonho
  const pctSonho = s && s.custo ? Math.floor((s.saldo / s.custo) * 100) : null
  const tops = p.topServicos.slice(0, 3)

  const mes = d.temMeta ? (
    <CartaoProgresso
      testid="cartao-mes" destaque kicker={`${cap(p.mesNome)} · meta ${brl(d.meta)}`}
      numero={d.tom === 'comeco' ? brl(d.porDia) : `${d.pct}%`}
      rotulo={d.tom === 'comeco' ? `por dia fecha o mês · ${d.diasTxt}` : `${brl(p.faturado)} de ${brl(d.meta)}`}
      pct={d.tom === 'comeco' ? null : d.pct} ritmo={d.pctRitmo}
    >
      <p data-testid="ritmo" className="mt-3 text-[15px] font-extrabold" style={{ color: d.corTom }}>{d.frase}</p>
      {d.tom !== 'comeco' && <p className="text-[13px]" style={COR_MUTE}>{d.sub}</p>}
    </CartaoProgresso>
  ) : (
    <section className="rounded-3xl p-5 lg:p-6" style={SUPERFICIE}>
      <p className={KICKER} style={{ color: 'var(--admin-accent)' }}>{cap(p.mesNome)}</p>
      <b className="mt-2 block text-[36px] leading-none font-extrabold tabular-nums" style={COR_TXT}>{brl(p.faturado)}</b>
      <span className="mt-1.5 mb-4 block text-[13px] font-semibold" style={COR_MUTE}>faturado até agora</span>
      <BotaoDefinir p={p} />
    </section>
  )

  const extras: ReactNode[] = []
  if (p.previsao) extras.push(
    <CartaoProgresso key="prev" testid="previsao" kicker="Com o agendado" numero={d.pctPrevisao !== null ? `${d.pctPrevisao}%` : brl(p.previsao)} rotulo={`chega a ${brl(p.previsao)}`} pct={d.pctPrevisao} cor={d.pctPrevisao !== null && d.pctPrevisao >= 100 ? 'var(--admin-success)' : undefined} />,
  )
  if (p.comparacao) {
    const dif = p.faturado - p.comparacao.valor
    extras.push(
      <CartaoProgresso key="cmp" testid="comparacao" kicker={`${cap(p.comparacao.nomeMes)} até dia ${p.comparacao.dia}`} numero={brl(p.comparacao.valor)} rotulo={<Comparacao agora={p.faturado} antes={p.comparacao.valor} />} pct={null}>
        {Math.abs(dif) >= 1 && dif < 0 && d.tom !== 'bateu' && <p className="mt-3 text-[13px]" style={COR_FADED}>Cada atendimento de hoje encurta essa distância</p>}
      </CartaoProgresso>,
    )
  }
  if (s && pctSonho !== null && !s.conquistado) extras.push(
    <CartaoProgresso key="sonho" testid="cartao-sonho" kicker="Sonho" numero={`${pctSonho}%`} rotulo={`${brl(s.saldo)} de ${brl(s.custo ?? 0)} · ${s.titulo}`} pct={pctSonho} />,
  )

  return (
    <div className="px-4 lg:px-8 pt-5 pb-32 lg:pb-12 max-w-lg mx-auto lg:max-w-[1360px]">
      <Cabecalho p={p} d={d} />

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-2">{mes}</div>
        {extras}
      </div>

      <h3 className={`${KICKER} mt-7 mb-3`} style={COR_FADED}>Hoje</h3>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {p.acoes.map((a) => (
          <li key={a.tipo} data-testid={`acao-${a.tipo}`} className="rounded-3xl p-5 flex flex-col" style={SUPERFICIE}>
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center rounded-2xl shrink-0" style={{ width: 48, height: 48, background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}><IconeAcao tipo={a.tipo} /></span>
              {a.numero !== null && <b className="text-[34px] leading-none font-extrabold tabular-nums" style={COR_TXT}>{a.numero}</b>}
            </div>
            <b className="mt-3 block text-[16px] leading-snug" style={COR_TXT}>{a.titulo}</b>
            <small className="mt-0.5 block text-[12px] truncate" style={COR_MUTE}>{a.detalhe}</small>
            {a.botao && (
              <Link href={a.botao.href} className="mt-4 inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl text-[14px] font-bold" style={{ background: 'var(--admin-accent)', color: '#fff' }}>
                {a.botao.rotulo} <IconChevronRight size={15} />
              </Link>
            )}
          </li>
        ))}
      </ul>

      {(d.temGrafico || tops.length > 0) && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
          {d.temGrafico && (
            <Bloco testid="grafico-mes" className="lg:col-span-2">
              <p className={KICKER} style={COR_FADED}>O mês dia a dia</p>
              <div className="mt-3"><Grafico p={p} d={d} /></div>
            </Bloco>
          )}
          {tops.length > 0 && (
            <div className="grid grid-cols-1 gap-4" data-testid="top-servicos">
              {tops.map((t, i) => {
                const pctT = p.faturado > 0 ? Math.round((t.valor / p.faturado) * 100) : 0
                return (
                  <CartaoProgresso key={t.nome} kicker={`${i + 1}º · ${t.nome}`} numero={`${pctT}%`} rotulo={`do mês · ${brl(t.valor)} em ${t.qtd}×`} pct={pctT} />
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
        {d.totalComp > 0 && <DeOndeVem p={p} d={d} />}
        {d.historico.length > 0 && <MesesColunas d={d} />}
        <Sonho p={p} d={d} />
      </div>
      <Rodape />
    </div>
  )
}

export default function MetasCaminhos({ visual, ...p }: Props & { visual: Visual }) {
  return (
    <>
      <TrocaVisual atual={visual} />
      {visual === 'A' ? <CaminhoA p={p} /> : visual === 'B' ? <CaminhoB p={p} /> : <CaminhoC p={p} />}
    </>
  )
}
