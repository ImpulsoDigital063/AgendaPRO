'use client'

/* VITRINE DA CLÍNICA · 1ª etapa do agendamento (escolher o procedimento).
   Mesmo padrão visual das etapas seguintes do BookingFlow no tema vitrine
   (barra de 5 etapas, "1 de 5 · Serviço", cartões brancos com borda, escolhido
   em dourado) — pedido do Eduardo 22/10: "tem que estar na mesma estética da
   tela de agendamento". 46 serviços → 7 categorias → procedimentos agrupados
   → técnica/área. A barra de Continuar fica sempre na tela. */
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { textoDoSinal } from '@/lib/texto-do-sinal'
import { valorDoSinal } from '@/lib/pix-brcode'
import type { Business } from '@/lib/types'
import { normalizar, type Grupo, type Opcao } from '@/lib/vitrine/grupos'

/* mesma paleta do BookingFlow com tema="vitrine" */
const C = { text: '#2A2520', body: '#4A433B', mute: '#7C7266', surface: '#FFFFFF', surfaceHi: '#FDFBF8', border: '#E7DECF', borderHi: '#D9CCB6' }
const SERIF = 'font-[family-name:var(--font-vitrine)]'
const SANS = 'font-[family-name:var(--font-vitrine-sans)]'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
const tempo = (m: number | null) => (!m ? '' : m < 60 ? `${m}min` : `${Math.floor(m / 60)}h${m % 60 ? `${String(m % 60).padStart(2, '0')}min` : ''}`)

function precoDoGrupo(g: Grupo): string {
  const precos = g.opcoes.map((o) => o.preco).filter((p): p is number => p !== null)
  if (!precos.length) return 'Sob avaliação'
  const min = Math.min(...precos)
  return precos.length > 1 && Math.max(...precos) !== min ? `a partir de ${brl(min)}` : brl(min)
}

/* "labio" acha "labial", "cilio" acha "cílios": compara pelo começo da palavra. */
function combina(texto: string, busca: string) {
  const t = normalizar(texto)
  return normalizar(busca).split(/\s+/).filter(Boolean).every((p) => t.includes(p.length > 4 ? p.slice(0, Math.max(3, p.length - 2)) : p))
}

function Chevron({ cor, aberto = false }: { cor: string; aberto?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 shrink-0 transition-transform duration-300 ${aberto ? 'rotate-90' : ''}`} fill="none" stroke={cor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

/* caixinha igual à da lista de serviços do BookingFlow */
function Caixa({ marcado }: { marcado: boolean }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors" style={{ borderColor: marcado ? '#FFFFFF' : C.borderHi, background: marcado ? '#FFFFFF' : 'transparent' }}>
      {marcado && (
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="var(--brand-primary)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      )}
    </span>
  )
}

export default function Escolha({
  slug, nome, cor, cor2, logoDourada, sinal, categorias, chegada = '',
}: {
  /** "cupom=X&ref=Y" do link de campanha, repassado ao /agendar */
  chegada?: string
  slug: string
  nome: string
  cor: string
  cor2: string
  logoDourada: string | null
  sinal: Partial<Business> | null
  categorias: { nome: string; frase: string | null; grupos: Grupo[] }[]
}) {
  const router = useRouter()
  const [cat, setCat] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState<string | null>(null)
  const [marcados, setMarcados] = useState<Opcao[]>([])
  // computador: as opções de um procedimento abrem num quadro (padrão Fresha);
  // no celular continuam abrindo na própria lista
  const [quadro, setQuadro] = useState<Grupo | null>(null)
  useEffect(() => {
    if (!quadro) return
    const fechar = (e: KeyboardEvent) => e.key === 'Escape' && setQuadro(null)
    window.addEventListener('keydown', fechar)
    return () => window.removeEventListener('keydown', fechar)
  }, [quadro])
  const ouro = `linear-gradient(135deg, ${cor} 0%, ${cor2} 100%)`
  const avisoSinal = sinal ? textoDoSinal(sinal as Business) : null // sinal só vem quando o negócio cobra

  const todos = useMemo(() => categorias.flatMap((c) => c.grupos), [categorias])
  const lista = busca.trim()
    ? todos.filter((g) => combina(`${g.nome} ${g.opcoes.map((o) => o.rotulo).join(' ')} ${g.categoria}`, busca))
    : cat
      ? categorias.find((c) => c.nome === cat)?.grupos ?? []
      : null

  const alternar = (o: Opcao) => setMarcados((m) => (m.some((x) => x.id === o.id) ? m.filter((x) => x.id !== o.id) : [...m, o]))
  const total = marcados.reduce((s, o) => s + (o.preco ?? 0), 0)
  const minutos = marcados.reduce((s, o) => s + (o.duracao ?? 0), 0)
  const sinalPrevisto = sinal && total ? valorDoSinal(total, sinal) : 0
  const abrirOpcoes = (g: Grupo, expandido: boolean) => {
    if (window.matchMedia('(min-width: 1024px)').matches) setQuadro(g)
    else setAberto(expandido ? null : g.chave)
  }
  const seguir = () => router.push(`/${slug}/agendar?servicos=${marcados.map((o) => o.id).join(',')}${chegada ? `&${chegada}` : ''}`)

  const cartao = (sel: boolean) =>
    sel
      ? { background: ouro, borderColor: 'transparent', color: '#FFFFFF', boxShadow: '0 8px 24px -10px rgba(164,126,59,0.55)' }
      : { background: C.surface, borderColor: C.border, color: C.text }

  return (
    <main
      className={`${SANS} min-h-screen pb-32 lg:pb-16`}
      style={{ background: '#FAF7F2', color: C.text, fontWeight: 500, ['--brand-primary' as string]: cor, ['--brand-secondary' as string]: cor2 } as React.CSSProperties}
    >
      {/* topo igual ao do /agendar no tema vitrine */}
      <div className="sticky top-0 z-30 border-b backdrop-blur-xl" style={{ background: '#FAF7F2E6', borderColor: C.border }}>
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-5 lg:max-w-5xl">
          <Link href={`/${slug}/clinica`} className="flex h-10 w-10 items-center justify-center rounded-full border" style={{ borderColor: C.border, color: C.text }} aria-label="Voltar">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
          </Link>
          <div className="relative h-9 w-[80px]">{logoDourada && <Image src={logoDourada} alt={nome} fill sizes="80px" className="object-contain" priority />}</div>
          <span className="w-10" />
        </div>
        <div className="h-px" style={{ background: ouro, opacity: 0.6 }} />
      </div>

      <div className="mx-auto max-w-lg px-4 py-5 lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-10 lg:px-6 lg:pt-8">
      <div className="space-y-4">
        {/* barra de etapas + título, igual ao BookingFlow */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i === 0 ? `linear-gradient(90deg, ${cor}, ${cor2})` : C.border }} />
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <h2 className={`${SERIF} text-[1.6rem] font-semibold leading-tight tracking-[-0.015em] sm:text-[1.8rem]`}>Escolha o serviço</h2>
            <span className="shrink-0 text-xs font-medium" style={{ color: C.mute }}>1 de 5 · Serviço</span>
          </div>
        </div>

        {avisoSinal && (
          <div className="flex items-start gap-2.5 rounded-2xl px-4 py-3" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
            <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke={cor} strokeWidth={1.6} strokeLinecap="round" aria-hidden><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /></svg>
            <p className="text-xs leading-relaxed" style={{ color: C.text }}>
              Para confirmar o horário, {nome} pede um sinal de <strong className="font-semibold">{avisoSinal}</strong>, pago no PIX ao fim do agendamento. O restante fica para o dia do atendimento.
            </p>
          </div>
        )}

        {/* busca */}
        <label className="flex items-center gap-3 rounded-2xl border px-4 py-3.5" style={{ background: C.surface, borderColor: C.border }}>
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke={C.mute} strokeWidth={1.8} aria-hidden><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" strokeLinecap="round" /></svg>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar procedimento" className="w-full bg-transparent text-[15px] outline-none placeholder:text-[#A89C8B]" aria-label="Buscar procedimento" />
          {busca && <button onClick={() => setBusca('')} className="text-xs font-semibold" style={{ color: cor }}>Limpar</button>}
        </label>

        {/* categorias */}
        {!lista && (
          <section>
            <p className="mb-3 text-xs" style={{ color: C.mute }}>Escolha uma categoria</p>
            <div className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
              {categorias.map((c) => (
                <button key={c.nome} onClick={() => { setCat(c.nome); setAberto(null); scrollTo({ top: 0 }) }} className="flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left transition-all hover:-translate-y-px" style={cartao(false)}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-bold">{c.nome}</span>
                    {c.frase && <span className="mt-1 block text-[13px] leading-snug" style={{ color: C.mute }}>{c.frase}</span>}
                    <span className="mt-1 block text-xs font-medium" style={{ color: cor }}>{c.grupos.length} {c.grupos.length === 1 ? 'procedimento' : 'procedimentos'}</span>
                  </span>
                  <Chevron cor={cor} />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* procedimentos da categoria (ou da busca) */}
        {lista && (
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              {!busca && cat ? (
                <button onClick={() => { setCat(null); setAberto(null) }} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: cor }}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
                  Todas as categorias
                </button>
              ) : (
                <span className="text-xs" style={{ color: C.mute }}>{lista.length} {lista.length === 1 ? 'resultado' : 'resultados'}</span>
              )}
              {!busca && cat && <span className="text-xs font-medium" style={{ color: C.mute }}>{cat}</span>}
            </div>

            <div key={`${cat}-${busca}`} className="space-y-2.5">
              {lista.map((g) => {
                const varios = g.opcoes.length > 1
                const unico = g.opcoes[0]
                const selUnico = !varios && marcados.some((x) => x.id === unico.id)
                const qtd = g.opcoes.filter((o) => marcados.some((x) => x.id === o.id)).length
                const expandido = aberto === g.chave
                return (
                  <div key={g.chave}>
                    <button
                      onClick={() => (varios ? abrirOpcoes(g, expandido) : alternar(unico))}
                      className="w-full rounded-2xl border px-4 py-3.5 text-left transition-all"
                      style={cartao(selUnico)}
                      aria-expanded={varios ? expandido : undefined}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          {!varios && <Caixa marcado={selUnico} />}
                          <div className="min-w-0">
                            <p className="text-[15px] font-semibold leading-snug">{g.nome}</p>
                            <p className="mt-0.5 text-xs" style={{ color: selUnico ? 'rgba(255,255,255,.85)' : C.mute }}>
                              {varios ? `${g.opcoes.length} opções${qtd ? ` · ${qtd} escolhida${qtd > 1 ? 's' : ''}` : ''}` : tempo(unico.duracao)}
                              {busca && ` · ${g.categoria}`}
                            </p>
                            {!varios && unico.descricao && <p className="mt-1 text-xs leading-relaxed" style={{ color: selUnico ? 'rgba(255,255,255,.85)' : C.mute }}>{unico.descricao}</p>}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={`text-right text-[15px] font-semibold ${varios ? 'text-xs' : ''}`} style={{ color: selUnico ? '#FFFFFF' : varios ? C.mute : C.text }}>
                            {varios ? precoDoGrupo(g) : unico.preco ? brl(unico.preco) : 'Sob avaliação'}
                          </span>
                          {varios && <Chevron cor={cor} aberto={expandido} />}
                        </div>
                      </div>
                    </button>

                    {varios && expandido && (
                      <div className="ml-3 mt-2 space-y-2 border-l-2 pl-3" style={{ borderColor: `${cor2}80` }}>
                        <p className="pt-1 text-xs font-medium" style={{ color: cor }}>{g.nome === 'Epilação' ? 'Escolha as áreas' : 'Escolha a opção'}</p>
                        {g.opcoes.map((o) => {
                          const sel = marcados.some((x) => x.id === o.id)
                          return (
                            <button key={o.id} onClick={() => alternar(o)} className="w-full rounded-2xl border px-4 py-3 text-left transition-all" style={cartao(sel)}>
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                  <Caixa marcado={sel} />
                                  <div className="min-w-0">
                                    <p className="text-[15px] font-semibold leading-snug">{o.rotulo}</p>
                                    <p className="mt-0.5 text-xs" style={{ color: sel ? 'rgba(255,255,255,.85)' : C.mute }}>{tempo(o.duracao)}</p>
                                    {o.descricao && <p className="mt-1 text-xs leading-relaxed" style={{ color: sel ? 'rgba(255,255,255,.85)' : C.mute }}>{o.descricao}</p>}
                                  </div>
                                </div>
                                <span className="shrink-0 text-[15px] font-semibold">{o.preco ? brl(o.preco) : 'Sob avaliação'}</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
              {busca && lista.length === 0 && <p className="rounded-2xl border px-4 py-4 text-sm" style={{ borderColor: C.border, color: C.mute, background: C.surface }}>Nada com esse nome. Tente outra palavra ou veja as categorias.</p>}
            </div>
          </section>
        )}
      </div>

      {/* computador: resumo fixo ao lado, preenchendo conforme ela escolhe */}
      <aside className="sticky top-24 hidden lg:block">
        <div className="overflow-hidden rounded-2xl border" style={{ background: C.surface, borderColor: C.border, boxShadow: '0 24px 48px -32px rgba(84,62,25,0.35)' }}>
          <div className="h-1" style={{ background: ouro }} />
          <div className="space-y-4 p-5">
            <div>
              <p className="text-[13px] font-semibold" style={{ color: C.mute }}>Seu agendamento</p>
              <p className={`${SERIF} mt-1 text-lg font-bold leading-tight`}>{nome}</p>
            </div>
            <div className="space-y-3 border-t pt-4" style={{ borderColor: C.border }}>
              {marcados.length === 0 ? (
                <p className="text-sm" style={{ color: '#A89C8B' }}>Nenhum procedimento escolhido ainda.</p>
              ) : (
                marcados.map((o) => (
                  <div key={o.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">{o.rotulo}</p>
                      <p className="mt-0.5 text-xs" style={{ color: C.mute }}>{tempo(o.duracao)}</p>
                    </div>
                    <div className="flex shrink-0 items-start gap-2">
                      <p className="whitespace-nowrap text-sm font-medium tabular-nums">{o.preco ? brl(o.preco) : 'sob avaliação'}</p>
                      <button onClick={() => alternar(o)} className="mt-0.5" style={{ color: C.mute }} aria-label={`Tirar ${o.rotulo}`}>
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {total > 0 && (
              <div className="space-y-1.5 border-t pt-4" style={{ borderColor: C.border }}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm" style={{ color: C.mute }}>Total{minutos ? ` · ${tempo(minutos)}` : ''}</span>
                  <span className="text-xl font-bold tabular-nums">{brl(total)}</span>
                </div>
                {sinalPrevisto > 0 && (
                  <p className="text-xs leading-relaxed" style={{ color: C.mute }}>
                    Sinal de <strong style={{ color: C.text }}>{brl(sinalPrevisto)}</strong> no Pix pra confirmar. O restante no dia.
                  </p>
                )}
              </div>
            )}
            <button onClick={seguir} disabled={!marcados.length} className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40" style={{ background: ouro, boxShadow: '0 8px 24px -10px rgba(164,126,59,0.6)' }}>
              Continuar
            </button>
            <p className="text-center text-[11px]" style={{ color: C.mute }}>Depois: profissional, dia e horário</p>
          </div>
        </div>
      </aside>
      </div>

      {/* computador: quadro "Escolha a opção" */}
      {quadro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label={quadro.nome}>
          <button className="absolute inset-0 cursor-default" style={{ background: 'rgba(42,37,32,0.45)' }} onClick={() => setQuadro(null)} aria-label="Fechar" />
          <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl" style={{ background: '#FAF7F2', boxShadow: '0 40px 80px -30px rgba(42,37,32,0.5)' }}>
            <div className="flex items-start justify-between gap-4 border-b px-6 pb-4 pt-6" style={{ borderColor: C.border }}>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: cor }}>{quadro.categoria}</p>
                <h3 className={`${SERIF} mt-1 text-[1.4rem] font-bold leading-tight tracking-[-0.015em]`}>{quadro.nome}</h3>
                <p className="mt-1 text-xs" style={{ color: C.mute }}>{quadro.nome === 'Epilação' ? 'Escolha uma ou mais áreas' : 'Escolha a opção'} · {precoDoGrupo(quadro)}</p>
              </div>
              <button onClick={() => setQuadro(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: C.border }} aria-label="Fechar">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto px-6 py-4">
              {quadro.opcoes.map((o) => {
                const sel = marcados.some((x) => x.id === o.id)
                return (
                  <button key={o.id} onClick={() => alternar(o)} className="w-full rounded-2xl border px-4 py-3.5 text-left transition-all" style={cartao(sel)}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Caixa marcado={sel} />
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold leading-snug">{o.rotulo}</p>
                          <p className="mt-0.5 text-xs" style={{ color: sel ? 'rgba(255,255,255,.85)' : C.mute }}>{tempo(o.duracao)}</p>
                          {o.descricao && <p className="mt-1 text-xs leading-relaxed" style={{ color: sel ? 'rgba(255,255,255,.85)' : C.mute }}>{o.descricao}</p>}
                        </div>
                      </div>
                      <span className="shrink-0 text-[15px] font-semibold">{o.preco ? brl(o.preco) : 'Sob avaliação'}</span>
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="border-t px-6 py-4" style={{ borderColor: C.border }}>
              <button onClick={() => setQuadro(null)} className="w-full rounded-xl py-3.5 text-sm font-semibold text-white" style={{ background: ouro }}>
                Pronto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* barra fixa: Continuar sempre na tela (no computador o resumo ao lado faz isso) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-xl lg:hidden"style={{ background: '#FAF7F2F0', borderColor: C.border }}>
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3">
          <div className="min-w-0 flex-1">
            {marcados.length ? (
              <>
                <p className="truncate text-sm font-semibold">{marcados.length === 1 ? marcados[0].rotulo : `${marcados.length} serviços`}</p>
                <p className="text-xs" style={{ color: C.mute }}>{total ? brl(total) : 'Sob avaliação'}{minutos ? ` · ${tempo(minutos)}` : ''}</p>
              </>
            ) : (
              <p className="text-sm" style={{ color: C.mute }}>Escolha um serviço</p>
            )}
          </div>
          <button onClick={seguir} disabled={!marcados.length} className="whitespace-nowrap rounded-2xl px-6 py-3.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40" style={{ background: ouro, boxShadow: '0 8px 24px -10px rgba(164,126,59,0.6)' }}>
            Continuar
          </button>
        </div>
      </div>
    </main>
  )
}
