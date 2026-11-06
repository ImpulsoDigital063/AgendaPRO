/* ═══════════════════════════════════════════════════════════════
   ABA METAS · a tela (caminho B "Faixa de status", escolhido pelo Eduardo
   em 06/11/2026 entre 3 caminhos testados em produção, sw v223)

   Objetivo: a dona sabe em 5 segundos se o mês está no caminho e o que
   fazer HOJE. Topo = faixa na cor do negócio (--admin-accent) com a FRASE
   de status grande ("No caminho", "R$ 996 atrás", "Meta batida!") e o
   número menor, barra branca com a marca "hoje". Começo de mês (R$ 0)
   mostra "R$ X por dia fecha os R$ Y", nunca um R$ 0 gigante. Depois:
   "O que fazer hoje", quadrados (por dia, atendimentos, agendado, mês
   passado), gráfico, de onde vem, top serviços, meses anteriores, sonho
   e o interruptor de avisos. Número grande + rótulo curto; bloco sem dado
   SOME (negócio novo não vê nada zerado).

   Só props (sem banco): a página monta os dados (lib/metas/montar).

   Layout: celular = coluna única, max-w-lg (sem prefixo). Computador
   (lg: ≥1024) = grade até 1360px: faixa + quadrados + gráfico + de onde
   vem/top à esquerda; "O que fazer hoje", meses anteriores, sonho e
   avisos numa coluna à direita (fixa ao rolar).
   ═══════════════════════════════════════════════════════════════ */

import Link from 'next/link'
import type { ReactNode } from 'react'
import { IconCalendar, IconCheck, IconChevronRight, IconClock, IconGift, IconPencil, IconPlus, IconTarget, IconUsers } from '@/components/ui/Icon'
import type { AcaoItem } from '@/lib/metas/acao'
import { GraficoMes } from './GraficoMes'
import Cofrinho, { type Movimento } from './Cofrinho'
import AvisosMetas from './AvisosMetas'
import { guardarPorMes } from '@/lib/metas/traducao'

export type SonhoView = {
  titulo: string
  custo: number | null
  /** 'AAAA-MM' ou null */
  ateMes: string | null
  desdeMes: string
  /** cofrinho: saldo calculado no banco + últimos lançamentos */
  saldo: number
  movimentos: Movimento[]
  conquistado: boolean
}

export type MetasViewProps = {
  negocio: string
  tom: string
  bateuTexto: string
  imagemSonho: string
  mesNome: string
  /** null = sem meta no mês */
  meta: number | null
  faturado: number
  diasRestantes: number
  /** até 3 ações de hoje (sempre ≥ 1) */
  acoes: AcaoItem[]
  /** onde a barra deveria estar hoje (null = sem meta) */
  ritmo: number | null
  /** faturado + o que está marcado até o fim do mês (null = nada marcado) */
  previsao: number | null
  /** mês passado do dia 1º ao mesmo dia (null = mês passado sem faturamento) */
  comparacao: { nomeMes: string; dia: number; valor: number } | null
  composicao: { servicos: number; produtos: number; outros: number; atendimentos: number; ticketMedio: number }
  acumulado: { ymd: string; valor: number }[]
  diasNoMes: number
  topServicos: { nome: string; valor: number; qtd: number }[]
  /** 6 meses fechados, do mais antigo ao mais recente */
  historico: { ym: string; meta: number | null; feito: number }[]
  sonho: SonhoView | null
  /** ticket médio salvo ao definir a meta (traduz "faltam" em atendimentos) */
  ticket: number | null
}

type Props = MetasViewProps & { mesAtual: string; ehDona: boolean }

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
const BRANCO_SUAVE = { color: 'rgba(255,255,255,.82)' }

/* ── a conta da tela (ritmo com tolerância de 3% da meta) ── */
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

  let frase: string
  let sub: string
  if (!temMeta) { frase = `Sem meta em ${p.mesNome}`; sub = 'Defina e veja todo dia se está no caminho' }
  else if (bateu) { frase = 'Meta batida!'; sub = p.faturado > meta ? `${brl(p.faturado - meta)} acima da meta` : p.bateuTexto }
  else if (p.faturado <= 0) { frase = 'O mês está começando'; sub = `${brl(porDia)} por dia fecha os ${brl(meta)}` }
  else if (dif === null || (p.ritmo ?? 0) <= 0 || Math.abs(dif) <= tol) { frase = 'No caminho'; sub = `${brl(porDia)} por dia até o fim do mês` }
  else if (dif > 0) { frase = `${brl(dif)} à frente`; sub = `do que devia ter hoje · ${brl(porDia)} por dia fecha` }
  else { frase = `${brl(-dif)} atrás`; sub = `${brl(porDia)} por dia ainda fecha a meta` }

  const pctPrevisao = temMeta && p.previsao ? Math.floor((p.previsao / meta) * 100) : null
  const c = p.composicao
  const totalComp = c.servicos + c.produtos + c.outros
  const historico = p.historico.filter((h) => h.feito > 0 || h.meta)
  const temGrafico = p.faturado > 0 && p.acumulado.length > 1
  return { temMeta, meta, bateu, pct, porDia, atendFaltam, pctRitmo, frase, sub, diasTxt, pctPrevisao, totalComp, historico, temGrafico }
}
type D = ReturnType<typeof derivar>

/* ── peças ── */
function IconeAcao({ tipo }: { tipo: AcaoItem['tipo'] }) {
  if (tipo === 'horarios-livres') return <IconClock size={20} />
  if (tipo === 'sumidos') return <IconUsers size={20} />
  if (tipo === 'aniversario') return <IconGift size={20} />
  if (tipo === 'definir-proximo') return <IconPlus size={20} />
  return <IconCheck size={20} />
}

/** seta ▲/▼ em SVG (texto do lado diz o mesmo: a cor nunca fala sozinha) */
function Seta({ sobe }: { sobe: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden style={{ color: sobe ? 'var(--admin-success)' : 'var(--admin-danger)' }}>
      <path d={sobe ? 'M6 2 L11 9 H1 Z' : 'M6 10 L11 3 H1 Z'} fill="currentColor" />
    </svg>
  )
}

function Comparacao({ agora, antes }: { agora: number; antes: number }) {
  const dif = agora - antes
  if (Math.abs(dif) < 1) return <span className="text-[12px] font-bold" style={COR_MUTE}>igual a este mês</span>
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-bold" style={COR_TXT}>
      <Seta sobe={dif > 0} /> {brl(Math.abs(dif))} {dif > 0 ? 'acima' : 'abaixo'}
    </span>
  )
}

function Fatia({ cor, rotulo, valor }: { cor: string; rotulo: string; valor: number }) {
  return (
    <div>
      <span className="flex items-center gap-1.5 text-[12px] leading-tight" style={COR_MUTE}>
        <i className="inline-block rounded-full shrink-0" style={{ width: 8, height: 8, background: cor }} />{rotulo}
      </span>
      <b className="block text-[20px] lg:text-[22px] font-extrabold tracking-tight tabular-nums leading-tight mt-1" style={COR_TXT}>{brl(valor)}</b>
    </div>
  )
}

function mesesEntre(de: string, ate: string): string[] {
  const out: string[] = []
  let y = Number(de.slice(0, 4))
  let m = Number(de.slice(5, 7))
  const fy = Number(ate.slice(0, 4))
  const fm = Number(ate.slice(5, 7))
  while ((y < fy || (y === fy && m <= fm)) && out.length < 37) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m++
    if (m > 12) { m = 1; y++ }
  }
  return out
}

/* Trilha discreta do sonho: pontos por mês, "você está aqui" no mês atual.
   Mais de 8 meses: mostra início, os 2 vizinhos do atual e o fim. */
function Trilha({ desde, ate, atual }: { desde: string; ate: string; atual: string }) {
  const todos = mesesEntre(desde, ate)
  if (todos.length < 2) return null
  let mostrar = todos
  if (todos.length > 8) {
    const i = Math.max(0, todos.indexOf(atual))
    const set = new Set([todos[0], todos[i - 1], todos[i], todos[i + 1], todos[todos.length - 1]].filter(Boolean) as string[])
    mostrar = todos.filter((m) => set.has(m))
  }
  const iAtual = mostrar.indexOf(atual)
  const pctLinha = iAtual <= 0 ? 0 : (iAtual / (mostrar.length - 1)) * 100
  return (
    <div className="relative mt-4 pt-1" aria-label={`Trilha até ${MESES[Number(ate.slice(5, 7)) - 1]}`}>
      <div className="absolute left-2 right-2 top-[9px] h-[2px] rounded" style={{ background: 'var(--admin-border)' }}>
        <i className="block h-full rounded" style={{ width: `${pctLinha}%`, background: 'var(--admin-accent)' }} />
      </div>
      <div className="relative flex justify-between">
        {mostrar.map((m) => {
          const feito = m < atual
          const aqui = m === atual
          return (
            <div key={m} className="flex flex-col items-center gap-1" style={{ minWidth: 28 }}>
              <span
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 18, height: 18,
                  background: feito || aqui ? 'var(--admin-accent)' : 'var(--admin-surface)',
                  border: `2px solid ${feito || aqui ? 'var(--admin-accent)' : 'var(--admin-border-hi)'}`,
                  color: '#fff',
                  boxShadow: aqui ? '0 0 0 4px var(--admin-accent-bg)' : undefined,
                }}
              >
                {feito ? <IconCheck size={10} strokeWidth={3.5} /> : null}
              </span>
              <small className="text-[11px]" style={{ color: aqui ? 'var(--admin-text)' : 'var(--admin-text-faded)', fontWeight: aqui ? 700 : 500 }}>
                {MESES_CURTOS[Number(m.slice(5, 7)) - 1]}
              </small>
              {aqui && <em className="not-italic text-[10px] font-semibold whitespace-nowrap" style={{ color: 'var(--admin-accent)' }}>você está aqui</em>}
            </div>
          )
        })}
      </div>
    </div>
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

/** quadrados: por dia, atendimentos, com o agendado, mês passado (somem sem dado) */
function quadrados(p: Props, d: D): ReactNode[] {
  const out: ReactNode[] = []
  /* "por dia" sai daqui: já está na faixa (Eduardo 06/11, não repetir) */
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

function AcaoLinha({ a }: { a: AcaoItem }) {
  return (
    <li data-testid={`acao-${a.tipo}`} className="flex items-center gap-3 py-3">
      <span className="flex items-center justify-center rounded-2xl shrink-0" style={{ width: 52, height: 52, background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}>
        {a.numero !== null ? <b className="text-[22px] font-extrabold tabular-nums">{a.numero}</b> : <IconeAcao tipo={a.tipo} />}
      </span>
      <div className="min-w-0 flex-1">
        <b className="block text-[15px] leading-snug" style={COR_TXT}>{a.titulo}</b>
        <small className="block text-[12px] mt-0.5 truncate" style={COR_MUTE}>{a.detalhe}</small>
      </div>
      {a.botao && (
        <Link href={a.botao.href} className="shrink-0 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-[13px] font-bold whitespace-nowrap" style={{ background: 'var(--admin-accent)', color: '#fff' }}>
          {a.botao.rotulo} <IconChevronRight size={14} />
        </Link>
      )}
    </li>
  )
}

function Grafico({ p, d }: { p: Props; d: D }) {
  return (
    <>
      <div className="lg:hidden"><GraficoMes acumulado={p.acumulado} meta={d.temMeta ? d.meta : null} diasNoMes={p.diasNoMes} /></div>
      <div className="hidden lg:block"><GraficoMes acumulado={p.acumulado} meta={d.temMeta ? d.meta : null} diasNoMes={p.diasNoMes} largura={780} altura={200} /></div>
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

/** meses anteriores como colunas: altura = quanto fez, verde = bateu */
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

/* ═══════════════ a tela ═══════════════ */

export default function MetasView(p: Props) {
  const d = derivar(p)
  const qs = quadrados(p, d)

  const faixa = (
    <section data-testid="faixa" className="relative overflow-hidden rounded-3xl p-5 pb-6 lg:p-8" style={{ background: 'var(--admin-accent)', color: '#fff', boxShadow: 'var(--admin-shadow)' }}>
      <span aria-hidden className="absolute -right-16 -top-20 rounded-full" style={{ width: 240, height: 240, background: 'rgba(255,255,255,.10)' }} />
      <span aria-hidden className="absolute right-10 -bottom-24 rounded-full" style={{ width: 180, height: 180, background: 'rgba(255,255,255,.07)' }} />
      <div className="relative">
        <header className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className={`${KICKER} truncate`} style={{ color: 'rgba(255,255,255,.8)' }}>{p.negocio}</p>
            <h1 className="text-[26px] font-bold tracking-tight leading-tight inline-flex items-center gap-2"><IconTarget size={22} /> Metas</h1>
          </div>
          {d.temMeta && (
            <Link href="/admin/metas/definir" className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl shrink-0" style={{ color: '#fff', background: 'rgba(255,255,255,.16)' }}>
              <IconPencil size={15} /> Editar meta
            </Link>
          )}
        </header>
        <p className={`${KICKER} mt-6`} style={BRANCO_SUAVE}>{cap(p.mesNome)}</p>
        <h2 data-testid="ritmo" className="mt-1 text-[34px] lg:text-[48px] leading-[1.05] font-extrabold tracking-tight">{d.frase}</h2>
        <p className="mt-2 text-[15px] lg:text-[17px] font-semibold" style={BRANCO_SUAVE}>{d.sub}</p>
        {d.temMeta ? (
          <div className="mt-5 lg:max-w-[640px]">
            <div className="flex items-baseline justify-between gap-3 text-[14px] font-bold tabular-nums">
              <span>{brl(p.faturado)} <span className="font-semibold" style={BRANCO_SUAVE}>de {brl(d.meta)}</span></span>
              <span>{d.pct}%</span>
            </div>
            <div className="relative mt-2">
              <div className="h-[10px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.25)' }} role="progressbar" aria-valuemin={0} aria-valuemax={Math.round(d.meta)} aria-valuenow={Math.round(p.faturado)}>
                <i className="block h-full rounded-full" style={{ width: `${Math.min(100, d.pct)}%`, background: '#fff' }} />
              </div>
              {d.pctRitmo !== null && !d.bateu && (
                <span data-testid="marcador-ritmo" aria-hidden className="absolute flex flex-col items-center" style={{ left: `${d.pctRitmo}%`, top: -5, transform: 'translateX(-50%)' }}>
                  <i className="block rounded-full" style={{ width: 4, height: 20, background: '#fff', boxShadow: '0 0 0 2px var(--admin-accent)' }} />
                  <small className="mt-1 text-[11px] font-bold whitespace-nowrap" style={BRANCO_SUAVE}>hoje</small>
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <Link href="/admin/metas/definir" className="inline-flex items-center justify-center gap-2 w-full lg:w-auto px-5 py-3 rounded-2xl text-[15px] font-bold" style={{ background: '#fff', color: 'var(--admin-accent)' }}>
              Definir minha meta de {p.mesNome} <IconChevronRight size={16} />
            </Link>
          </div>
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
      <ul className="mt-2 divide-y divide-[color:var(--admin-border)]">
        {p.acoes.map((a) => <AcaoLinha key={a.tipo} a={a} />)}
      </ul>
    </Bloco>
  )

  return (
    <div className="px-4 lg:px-8 pt-5 pb-32 lg:pb-12 max-w-lg mx-auto lg:max-w-[1360px]">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="grid grid-cols-1 gap-4">
          {faixa}
          <div className="lg:hidden">{hoje}</div>
          {qs.length > 0 && <div className={`grid grid-cols-2 gap-4 [&>*:last-child:nth-child(odd)]:col-span-2 ${qs.length >= 3 ? 'lg:grid-cols-3 lg:[&>*:last-child:nth-child(odd)]:col-span-1' : ''}`}>{qs}</div>}
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
          <AvisosMetas ehDona={p.ehDona} />
        </div>
      </div>
      <p className="mt-6 text-xs text-center inline-flex w-full items-center justify-center gap-1.5" style={COR_FADED}>
        <IconCalendar size={12} /> Faturamento pela data do atendimento e da venda, igual ao Relatório financeiro
      </p>
    </div>
  )
}
