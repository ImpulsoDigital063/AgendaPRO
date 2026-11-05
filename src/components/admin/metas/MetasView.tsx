/* ═══════════════════════════════════════════════════════════════
   ABA METAS · a tela (04/11/2026, caminho "J" · Jornada enxuta)

   Objetivo (Eduardo): a dona sabe em 5 segundos se o mês está no caminho e
   o que pode fazer HOJE. Ordem fixa: número do mês (ritmo + previsão +
   mês passado) → até 3 ações de hoje → gráfico, de onde vem, top serviços,
   meses anteriores → sonho por último e opcional. Número grande + rótulo
   curto; bloco sem dado SOME (negócio novo não vê nada zerado). 05/11/2026.

   Só props (sem banco): a página monta os dados; a prova visual usa a
   mesma view com dados fictícios.

   Layout: celular = coluna única (sem prefixo). Computador (lg: ≥1024) =
   mesma ordem; ações de hoje em 3 colunas, "De onde vem" e "Top serviços"
   lado a lado.
   ═══════════════════════════════════════════════════════════════ */

import Link from 'next/link'
import { IconCalendar, IconCheck, IconChevronRight, IconClock, IconGift, IconPencil, IconPlus, IconUsers, IconTarget } from '@/components/ui/Icon'
import type { AcaoItem } from '@/lib/metas/acao'
import { BarraMeta } from './BarraMeta'
import { GraficoMes } from './GraficoMes'
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

  // ritmo: tolerância de 3% da meta (diferença pequena não vira "atrás")
  const difRitmo = temMeta && p.ritmo !== null ? p.faturado - p.ritmo : null
  const tolerancia = meta * 0.03
  const ritmoTxt = difRitmo === null || bateu || (p.ritmo ?? 0) <= 0
    ? null
    : Math.abs(difRitmo) <= tolerancia
      ? { txt: 'No ritmo', cor: 'var(--admin-success)' }
      : difRitmo < 0
        ? { txt: `${brl(-difRitmo)} atrás`, cor: 'var(--admin-danger)' }
        : { txt: `${brl(difRitmo)} à frente`, cor: 'var(--admin-success)' }

  const pctPrevisao = temMeta && p.previsao ? Math.floor((p.previsao / meta) * 100) : null
  const c = p.composicao
  const totalComp = c.servicos + c.produtos + c.outros
  // "precisa": os feitos + os ≈ que faltam (o mesmo número do cartão de cima)
  const precisam = atendFaltam !== null ? c.atendimentos + atendFaltam : null
  const historico = p.historico.filter((h) => h.feito > 0 || h.meta)
  const topMax = p.topServicos[0]?.valor ?? 0

  const cartao = 'rounded-3xl p-5 lg:p-6'
  const estiloCartao = { background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', boxShadow: 'var(--admin-shadow)' }
  const kicker = 'text-[11px] font-bold uppercase tracking-widest'
  const miniRotulo = 'block text-[12px] leading-tight'
  const miniNumero = 'block text-[20px] lg:text-[22px] font-extrabold tracking-tight tabular-nums leading-tight mt-1'
  const corProduto = 'color-mix(in srgb, var(--admin-accent) 45%, var(--admin-surface))'
  const trilhoClaro = 'color-mix(in srgb, var(--admin-accent) 12%, var(--admin-surface))'

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

      {/* 1 · o número do mês + ritmo + previsão + mês passado */}
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
              <div className="flex-1"><BarraMeta atual={p.faturado} alvo={meta} alto={14} ritmo={p.ritmo} /></div>
              <b className="text-sm tabular-nums" style={{ color: 'var(--admin-text)' }}>{pct}%</b>
            </div>
            {ritmoTxt && (
              <p className="mt-2 flex items-center gap-1.5 text-[13px] font-bold" data-testid="ritmo" style={{ color: ritmoTxt.cor }}>
                <span aria-hidden className="inline-block rounded-full" style={{ width: 3, height: 12, background: 'var(--admin-text)' }} />
                {ritmoTxt.txt}
                <span className="font-medium" style={{ color: 'var(--admin-text-faded)' }}>· a marca é onde devia estar hoje</span>
              </p>
            )}
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

        {(p.previsao || p.comparacao) && (
          <div className={`mt-4 pt-4 grid ${p.previsao && p.comparacao ? 'grid-cols-2' : 'grid-cols-1'} gap-3`} style={{ borderTop: '1px solid var(--admin-border)' }}>
            {p.previsao ? (
              <div data-testid="previsao">
                <span className={miniRotulo} style={{ color: 'var(--admin-text-mute)' }}>Com o agendado, chega a</span>
                <b className={miniNumero} style={{ color: 'var(--admin-text)' }}>{brl(p.previsao)}</b>
                {pctPrevisao !== null && (
                  <span className="text-[12px] font-bold" style={{ color: pctPrevisao >= 100 ? 'var(--admin-success)' : 'var(--admin-accent)' }}>{pctPrevisao}% da meta</span>
                )}
              </div>
            ) : null}
            {p.comparacao ? (
              <div data-testid="comparacao">
                <span className={miniRotulo} style={{ color: 'var(--admin-text-mute)' }}>{cap(p.comparacao.nomeMes)} até dia {p.comparacao.dia}</span>
                <b className={miniNumero} style={{ color: 'var(--admin-text)' }}>{brl(p.comparacao.valor)}</b>
                <Comparacao agora={p.faturado} antes={p.comparacao.valor} />
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* 2 · ações de hoje (até 3) */}
      <section className={`mt-4 ${cartao}`} style={estiloCartao}>
        <p className={kicker} style={{ color: 'var(--admin-text-faded)' }}>Hoje</p>
        <ul className={`mt-2 grid grid-cols-1 ${p.acoes.length > 1 ? 'lg:grid-cols-3' : ''} lg:gap-4 lg:mt-4`}>
          {p.acoes.map((a, i) => (
            <li key={a.tipo} data-testid={`acao-${a.tipo}`} className={`flex items-center gap-3 py-3 lg:py-0 ${i > 0 ? 'border-t lg:border-t-0' : ''} ${p.acoes.length > 1 ? 'lg:flex-col lg:items-stretch' : ''}`} style={{ borderColor: 'var(--admin-border)' }}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="flex items-center justify-center rounded-2xl shrink-0" style={{ width: 44, height: 44, background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}>
                  {a.numero !== null ? <b className="text-[18px] font-extrabold tabular-nums">{a.numero}</b> : <IconeAcao tipo={a.tipo} />}
                </span>
                <div className="min-w-0">
                  <b className="block text-[15px] leading-snug" style={{ color: 'var(--admin-text)' }}>{a.titulo}</b>
                  <small className="block text-[12px] mt-0.5 truncate" style={{ color: 'var(--admin-text-mute)' }}>{a.detalhe}</small>
                </div>
              </div>
              {a.botao && (
                <Link href={a.botao.href} className="shrink-0 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-[13px] font-bold whitespace-nowrap" style={{ background: 'var(--admin-accent)', color: '#fff' }}>
                  {a.botao.rotulo} <IconChevronRight size={14} />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* 3 · gráfico do mês: uma linha só */}
      {p.faturado > 0 && p.acumulado.length > 1 && (
        <section className={`mt-4 ${cartao}`} style={estiloCartao} data-testid="grafico-mes">
          <p className={kicker} style={{ color: 'var(--admin-text-faded)' }}>O mês dia a dia</p>
          <div className="mt-3 lg:hidden"><GraficoMes acumulado={p.acumulado} meta={temMeta ? meta : null} diasNoMes={p.diasNoMes} /></div>
          <div className="mt-3 hidden lg:block"><GraficoMes acumulado={p.acumulado} meta={temMeta ? meta : null} diasNoMes={p.diasNoMes} largura={780} altura={200} /></div>
        </section>
      )}

      {(totalComp > 0 || p.topServicos.length > 0) && (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 lg:items-start gap-4">
          {/* 4 · de onde vem o dinheiro */}
          {totalComp > 0 && (
            <section className={cartao} style={estiloCartao} data-testid="de-onde-vem">
              <p className={kicker} style={{ color: 'var(--admin-text-faded)' }}>De onde vem</p>
              <div className="mt-3 flex w-full overflow-hidden rounded-full" style={{ height: 10, gap: 2 }}>
                {c.servicos > 0 && <i style={{ width: `${(c.servicos / totalComp) * 100}%`, background: 'var(--admin-accent)' }} />}
                {c.produtos > 0 && <i style={{ width: `${(c.produtos / totalComp) * 100}%`, background: corProduto }} />}
                {c.outros > 0 && <i style={{ width: `${(c.outros / totalComp) * 100}%`, background: 'var(--admin-border-hi)' }} />}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Fatia cor="var(--admin-accent)" rotulo="Serviços" valor={c.servicos} />
                {c.produtos > 0 && <Fatia cor={corProduto} rotulo="Produtos" valor={c.produtos} />}
                {c.outros > 0 && <Fatia cor="var(--admin-border-hi)" rotulo="Pacotes e sinais" valor={c.outros} />}
              </div>
              {c.atendimentos > 0 && (
                <div className="mt-4 pt-4 grid grid-cols-2 gap-3" style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <div>
                    <span className={miniRotulo} style={{ color: 'var(--admin-text-mute)' }}>Ticket médio</span>
                    <b className={miniNumero} style={{ color: 'var(--admin-text)' }}>{brl(c.ticketMedio)}</b>
                  </div>
                  <div data-testid="atendimentos">
                    <span className={miniRotulo} style={{ color: 'var(--admin-text-mute)' }}>Atendimentos</span>
                    <b className={miniNumero} style={{ color: 'var(--admin-text)' }}>
                      {c.atendimentos}{precisam ? <span className="text-[14px] font-semibold" style={{ color: 'var(--admin-text-mute)' }}> de ~{precisam}</span> : null}
                    </b>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 5 · top serviços do mês */}
          {p.topServicos.length > 0 && (
            <section className={cartao} style={estiloCartao} data-testid="top-servicos">
              <p className={kicker} style={{ color: 'var(--admin-text-faded)' }}>O que mais trouxe dinheiro</p>
              <ol className="mt-3 space-y-3">
                {p.topServicos.map((s, i) => (
                  <li key={s.nome}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>
                        <span className="tabular-nums mr-1.5" style={{ color: 'var(--admin-accent)' }}>{i + 1}</span>{s.nome}
                      </span>
                      <b className="text-[15px] tabular-nums shrink-0" style={{ color: 'var(--admin-text)' }}>{brl(s.valor)}</b>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ background: trilhoClaro }}>
                        <i className="block h-full rounded-full" style={{ width: `${topMax > 0 ? (s.valor / topMax) * 100 : 0}%`, background: 'var(--admin-accent)' }} />
                      </div>
                      <small className="text-[11px] tabular-nums shrink-0" style={{ color: 'var(--admin-text-faded)' }}>{s.qtd}×</small>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}

      {/* 6 · meses anteriores */}
      {historico.length > 0 && (
        <section className={`mt-4 ${cartao}`} style={estiloCartao} data-testid="meses-anteriores">
          <p className={kicker} style={{ color: 'var(--admin-text-faded)' }}>Meses anteriores</p>
          <ul className="mt-2 grid grid-cols-1 lg:grid-cols-2 lg:gap-x-8">
            {historico.slice().reverse().map((h) => {
              const bateuMes = h.meta ? h.feito >= h.meta : false
              return (
                <li key={h.ym} className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  <span className="w-9 shrink-0 text-[13px] font-bold uppercase" style={{ color: 'var(--admin-text-mute)' }}>{MESES_CURTOS[Number(h.ym.slice(5, 7)) - 1]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <b className="text-[15px] tabular-nums" style={{ color: 'var(--admin-text)' }}>{brl(h.feito)}</b>
                      {h.meta ? <span className="text-[12px] tabular-nums" style={{ color: 'var(--admin-text-faded)' }}>de {brl(h.meta)}</span> : null}
                    </div>
                    {h.meta ? (
                      <div className="mt-1 h-[5px] rounded-full overflow-hidden" style={{ background: trilhoClaro }}>
                        <i className="block h-full rounded-full" style={{ width: `${Math.min(100, (h.feito / h.meta) * 100)}%`, background: bateuMes ? 'var(--admin-success)' : 'var(--admin-accent)' }} />
                      </div>
                    ) : null}
                  </div>
                  {h.meta ? (
                    bateuMes ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-bold shrink-0" style={{ color: 'var(--admin-success)' }}><IconCheck size={14} strokeWidth={3} /> bateu</span>
                    ) : (
                      <span className="text-[12px] font-bold tabular-nums shrink-0" style={{ color: 'var(--admin-text-mute)' }}>{Math.floor((h.feito / h.meta) * 100)}%</span>
                    )
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* 7 · sonho (opcional, por último) */}
      <div className="mt-4 lg:max-w-[calc(50%-8px)]">
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
            <Link href="/admin/metas/definir?passo=2" className="flex items-center justify-center gap-2 rounded-3xl p-5 text-sm font-semibold" style={{ color: 'var(--admin-text-mute)', border: '1.5px dashed var(--admin-border-hi)' }}>
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

function Fatia({ cor, rotulo, valor }: { cor: string; rotulo: string; valor: number }) {
  return (
    <div>
      <span className="flex items-center gap-1.5 text-[12px] leading-tight" style={{ color: 'var(--admin-text-mute)' }}>
        <i className="inline-block rounded-full shrink-0" style={{ width: 8, height: 8, background: cor }} />{rotulo}
      </span>
      <b className="block text-[20px] lg:text-[22px] font-extrabold tracking-tight tabular-nums leading-tight mt-1" style={{ color: 'var(--admin-text)' }}>{brl(valor)}</b>
    </div>
  )
}

function Comparacao({ agora, antes }: { agora: number; antes: number }) {
  const dif = agora - antes
  if (Math.abs(dif) < 1) return <span className="text-[12px] font-bold" style={{ color: 'var(--admin-text-mute)' }}>igual a este mês</span>
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-bold" style={{ color: 'var(--admin-text)' }}>
      <Seta sobe={dif > 0} /> este mês: {brl(Math.abs(dif))} {dif > 0 ? 'a mais' : 'a menos'}
    </span>
  )
}
