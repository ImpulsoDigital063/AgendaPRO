/* ═══════════════════════════════════════════════════════════════
   ABA METAS · a tela (04/11/2026, caminho "J" · Jornada enxuta)

   Objetivo (Eduardo): a dona sabe em 5 segundos se o mês está no caminho e
   o que pode fazer HOJE. Ordem fixa: número do mês → falta e por dia → 1
   ação de hoje → sonho por último e opcional. Texto mínimo.

   Só props (sem banco): a página monta os dados; a prova visual usa a
   mesma view com dados fictícios.

   Layout: celular = coluna única (sem prefixo). Computador (lg: ≥1024) =
   mesma ordem, "Hoje" e "Sonho" lado a lado abaixo do número.
   ═══════════════════════════════════════════════════════════════ */

import Link from 'next/link'
import { IconCalendar, IconCheck, IconChevronRight, IconClock, IconPencil, IconPlus, IconUsers, IconTarget } from '@/components/ui/Icon'
import type { AcaoDeHoje } from '@/lib/metas/acao'
import { BarraMeta } from './BarraMeta'
import Cofrinho, { type Movimento } from './Cofrinho'
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
  acao: AcaoDeHoje
  sonho: SonhoView | null
  /** ticket médio salvo ao definir a meta (traduz "faltam" em atendimentos) */
  ticket: number | null
}

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

function brl(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0, minimumFractionDigits: 0 })
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

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

function IconeAcao({ tipo }: { tipo: AcaoDeHoje['tipo'] }) {
  if (tipo === 'horarios-livres') return <IconClock size={20} />
  if (tipo === 'sumidos') return <IconUsers size={20} />
  if (tipo === 'definir-proximo') return <IconPlus size={20} />
  return <IconCheck size={20} />
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

export default function MetasView(p: MetasViewProps & { mesAtual: string }) {
  const temMeta = p.meta !== null && p.meta > 0
  const meta = p.meta ?? 0
  const faltam = Math.max(0, meta - p.faturado)
  const bateu = temMeta && p.faturado >= meta
  const pct = temMeta ? Math.floor((p.faturado / meta) * 100) : 0
  const dias = Math.max(1, p.diasRestantes)
  const porDia = faltam > 0 ? Math.ceil(faltam / dias / 10) * 10 : 0
  const atendFaltam = p.ticket && faltam > 0 ? Math.ceil(faltam / p.ticket) : null

  const cartao = 'rounded-3xl p-5 lg:p-6'
  const estiloCartao = { background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', boxShadow: 'var(--admin-shadow)' }
  const kicker = 'text-[11px] font-bold uppercase tracking-widest'

  return (
    <div className="max-w-lg lg:max-w-4xl mx-auto px-4 lg:px-8 pt-7 pb-32 lg:pb-12">
      <header className="mb-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className={kicker} style={{ color: 'var(--admin-text-faded)' }}>{p.negocio}</p>
          <h1 className="text-[26px] font-bold tracking-tight leading-tight inline-flex items-center gap-2" style={{ color: 'var(--admin-text)' }}>
            <IconTarget size={22} /> Metas
          </h1>
          <p className="text-sm mt-1 hidden lg:block" style={{ color: 'var(--admin-text-mute)' }}>{p.tom}</p>
        </div>
        {temMeta && (
          <Link href="/admin/metas/definir" className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl shrink-0" style={{ color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }}>
            <IconPencil size={15} /> Editar meta
          </Link>
        )}
      </header>

      {/* 1 · o número do mês */}
      <section className={cartao} style={estiloCartao}>
        <p className={kicker} style={{ color: bateu ? 'var(--admin-success)' : 'var(--admin-accent)' }}>
          {cap(p.mesNome)}{bateu ? ' · bateu!' : ''}
        </p>
        {temMeta ? (
          <>
            <p className="mt-2 flex items-baseline flex-wrap gap-x-2" style={{ color: 'var(--admin-text)' }}>
              <b className="text-[40px] lg:text-[52px] leading-none font-extrabold tracking-tight tabular-nums">{brl(p.faturado)}</b>
              <span className="text-base lg:text-lg" style={{ color: 'var(--admin-text-mute)' }}>de {brl(meta)}</span>
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1"><BarraMeta atual={p.faturado} alvo={meta} alto={14} /></div>
              <b className="text-sm tabular-nums" style={{ color: 'var(--admin-text)' }}>{pct}%</b>
            </div>
            {bateu ? (
              <p className="mt-3 text-[15px]" style={{ color: 'var(--admin-text)' }}>
                {p.bateuTexto} {p.faturado > meta && <><b>+{brl(p.faturado - meta)}</b> acima da meta</>}
              </p>
            ) : (
              <p className="mt-3 text-[15px]" style={{ color: 'var(--admin-text-mute)' }}>
                Faltam <b style={{ color: 'var(--admin-text)' }}>{brl(faltam)}</b>{atendFaltam ? <span data-testid="faltam-atendimentos"> (≈ {atendFaltam} {atendFaltam === 1 ? 'atendimento' : 'atendimentos'})</span> : null} · <b style={{ color: 'var(--admin-text)' }}>{brl(porDia)}</b> por dia
                <span className="block text-xs mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>
                  {p.diasRestantes === 1 ? 'último dia de trabalho do mês' : `${p.diasRestantes} dias de trabalho até o fim do mês`}
                </span>
              </p>
            )}
          </>
        ) : (
          <>
            <p className="mt-2" style={{ color: 'var(--admin-text)' }}>
              <b className="text-[34px] lg:text-[44px] leading-none font-extrabold tracking-tight tabular-nums">{brl(p.faturado)}</b>
              <span className="block text-sm mt-1" style={{ color: 'var(--admin-text-mute)' }}>faturado em {p.mesNome} até agora</span>
            </p>
            <Link href="/admin/metas/definir" className="mt-4 inline-flex items-center justify-center gap-2 w-full lg:w-auto px-5 py-3 rounded-2xl text-[15px] font-bold" style={{ background: 'var(--admin-accent)', color: '#fff' }}>
              Definir minha meta de {p.mesNome}
            </Link>
          </>
        )}
      </section>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 lg:items-start gap-4">
        {/* 2 · uma ação de hoje */}
        <section className={cartao} style={estiloCartao}>
          <p className={kicker} style={{ color: 'var(--admin-text-faded)' }}>{p.acao.tipo === 'definir-proximo' ? 'Próximo mês' : 'Hoje'}</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex items-center justify-center rounded-2xl shrink-0" style={{ width: 44, height: 44, background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}>
              <IconeAcao tipo={p.acao.tipo} />
            </span>
            <div className="min-w-0 flex-1">
              <b className="block text-[15px] leading-snug" style={{ color: 'var(--admin-text)' }}>{p.acao.titulo}</b>
              <small className="block text-[13px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>{p.acao.detalhe}</small>
            </div>
          </div>
          {p.acao.botao && (
            <Link href={p.acao.botao.href} className="mt-4 flex items-center justify-center gap-1.5 w-full px-4 py-3 rounded-2xl text-[15px] font-bold" style={{ background: 'var(--admin-accent)', color: '#fff' }}>
              {p.acao.botao.rotulo} <IconChevronRight size={16} />
            </Link>
          )}
        </section>

        {/* 3 · sonho (opcional, por último) */}
        {p.sonho ? (
          <section className={cartao} style={estiloCartao}>
            <div className="flex items-center justify-between">
              <p className={kicker} style={{ color: 'var(--admin-text-faded)' }}>Pra que essa meta?</p>
              <Link href="/admin/metas/definir?passo=2" className="text-xs font-semibold" style={{ color: 'var(--admin-text-mute)' }}>Editar</Link>
            </div>
            <div className="mt-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imagemSonho} alt="" width={72} height={54} loading="lazy" className="rounded-xl object-cover shrink-0" style={{ width: 72, height: 54 }} />
              <div className="min-w-0">
                <b className="block text-[15px] leading-snug truncate" style={{ color: 'var(--admin-text)' }}>{p.sonho.titulo}</b>
                <small className="block text-[13px]" style={{ color: 'var(--admin-text-mute)' }}>
                  {[p.sonho.custo ? brl(p.sonho.custo) : null, p.sonho.ateMes ? `até ${MESES[Number(p.sonho.ateMes.slice(5, 7)) - 1]}${p.sonho.ateMes.slice(0, 4) !== p.mesAtual.slice(0, 4) ? ` de ${p.sonho.ateMes.slice(0, 4)}` : ''}` : null].filter(Boolean).join(' · ') || 'sem prazo'}
                </small>
              </div>
            </div>
            {p.sonho.ateMes && !p.sonho.conquistado && <Trilha desde={p.sonho.desdeMes < p.mesAtual ? p.sonho.desdeMes : p.mesAtual} ate={p.sonho.ateMes} atual={p.mesAtual} />}
            <Cofrinho
              custo={p.sonho.custo}
              saldo={p.sonho.saldo}
              movimentos={p.sonho.movimentos}
              porMes={guardarPorMes(p.sonho.custo, p.sonho.saldo, p.sonho.ateMes, p.mesAtual)}
              sobraDaMeta={bateu ? p.faturado - meta : 0}
              conquistado={p.sonho.conquistado}
            />
          </section>
        ) : (
          temMeta && (
            <Link href="/admin/metas/definir?passo=2" className="flex items-center justify-center gap-2 rounded-3xl p-5 text-sm font-semibold lg:self-start" style={{ color: 'var(--admin-text-mute)', border: '1.5px dashed var(--admin-border-hi)' }}>
              <IconPlus size={16} /> Adicionar um sonho (opcional)
            </Link>
          )
        )}
      </div>

      <p className="mt-5 text-xs text-center inline-flex w-full items-center justify-center gap-1.5" style={{ color: 'var(--admin-text-faded)' }}>
        <IconCalendar size={12} /> Faturamento pela data do atendimento e da venda, igual ao Relatório financeiro
      </p>
    </div>
  )
}
