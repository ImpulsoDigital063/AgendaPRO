'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { GRUPOS, PERGUNTAS, PERGUNTA_POR_ID, PERIODOS_FIXOS, RELACIONADAS, type Grupo, type Pergunta, type PeriodoId, type Resposta } from '@/lib/perguntas/catalogo'
import { entender, type Profissional } from '@/lib/perguntas/entender'
import type { Atalho } from '@/lib/perguntas/atalhos'
import { IconAlert, IconArrowRight, IconCalendar, IconChevronRight, IconSearch, IconSparkles, IconStar, IconTrendingUp, IconUsers, IconWallet } from '@/components/ui/Icon'

/* "Pergunte ao seu negócio" (21/10/2026) · tela única: busca do jeito da
   pessoa + perguntas prontas por grupo + resposta com período e filtros.
   26/10: visual novo (grupos em cartões, resposta com "pergunte também"),
   atalhos "como faço" e aviso de dado faltando. Chega do Início com
   ?q= (busca) ou ?p= (pergunta pronta). */

type Estado = {
  pergunta: Pergunta
  periodo: PeriodoId | null
  profissionalId: string | null
  dias: number | null
}

const NOMES_MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const ICONE_DO_GRUPO: Record<Grupo, (p: { size?: number }) => React.ReactElement> = {
  faturamento: IconTrendingUp,
  despesas: IconWallet,
  equipe: IconUsers,
  clientes: IconStar,
  agenda: IconCalendar,
}

const caixa = { background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }
const seletor = { background: 'var(--admin-bg, #fff)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }

export default function PerguntasView({ profissionais, liberadas, hoje, inicial }: {
  profissionais: Profissional[]
  liberadas: string[]
  hoje: string
  inicial?: { q?: string; p?: string }
}) {
  const [texto, setTexto] = useState(inicial?.q ?? '')
  const [estado, setEstado] = useState<Estado | null>(null)
  const [resposta, setResposta] = useState<Resposta | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sugestoes, setSugestoes] = useState<Pergunta[] | null>(null)
  const [atalho, setAtalho] = useState<Atalho | null>(null)
  const [abertos, setAbertos] = useState<Set<string>>(new Set())
  const respostaRef = useRef<HTMLDivElement>(null)

  const permitidas = useMemo(() => new Set(liberadas), [liberadas])
  const grupos = GRUPOS.map((g) => ({ ...g, perguntas: PERGUNTAS.filter((p) => p.grupo === g.id && permitidas.has(p.id)) })).filter((g) => g.perguntas.length > 0)
  const primeiroNome = profissionais[0]?.name.split(' ')[0] || 'Ana'
  const exemplos = [
    `Quanto faturei em ${NOMES_MES[(Number(hoje.slice(5, 7)) + 10) % 12].toLowerCase()}?`,
    'Quem sumiu há 90 dias?',
    profissionais.length > 0 ? `Comissão da ${primeiroNome} no mês passado` : 'Qual meu horário mais cheio?',
  ]

  // Últimos 6 meses fechados, pra escolher "setembro", "agosto"...
  const mesesPassados = useMemo(() => {
    const out: { id: PeriodoId; rotulo: string }[] = []
    let y = Number(hoje.slice(0, 4)), m = Number(hoje.slice(5, 7))
    for (let i = 0; i < 6; i++) {
      m--; if (m === 0) { m = 12; y-- }
      out.push({ id: `m:${y}-${String(m).padStart(2, '0')}`, rotulo: `${NOMES_MES[m - 1]}${y !== Number(hoje.slice(0, 4)) ? ` ${y}` : ''}` })
    }
    return out
  }, [hoje])

  const limpar = () => { setSugestoes(null); setAtalho(null); setErro(null) }
  const rolarPraResposta = () => setTimeout(() => respostaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)

  async function perguntar(e: Estado, origem: 'botao' | 'busca', textoDigitado?: string) {
    limpar(); setEstado(e); setCarregando(true)
    rolarPraResposta()
    try {
      const r = await fetch('/api/admin/perguntas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: e.pergunta.id, periodo: e.periodo, profissionalId: e.profissionalId, dias: e.dias, texto: textoDigitado, origem }),
      })
      const j = await r.json()
      if (!r.ok) { setResposta(null); setErro(j.error ?? 'Não consegui responder agora.'); return }
      setResposta(j.resposta)
    } catch {
      setResposta(null); setErro('Sem conexão. Tenta de novo.')
    } finally {
      setCarregando(false)
    }
  }

  function buscar(bruto = texto) {
    const t = bruto.trim()
    if (!t) return
    const ent = entender(t, profissionais, hoje)
    if (ent.atalho) {
      setEstado(null); setResposta(null); limpar(); setAtalho(ent.atalho)
      rolarPraResposta()
      fetch('/api/admin/perguntas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ atalhoId: ent.atalho.id, texto: t, origem: 'busca' }) }).catch(() => {})
      return
    }
    if (!ent.pergunta || !permitidas.has(ent.pergunta.id)) {
      setEstado(null); setResposta(null); limpar()
      setSugestoes((ent.sugestoes.length ? ent.sugestoes : []).filter((p) => permitidas.has(p.id)))
      rolarPraResposta()
      fetch('/api/admin/perguntas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ naoEntendeu: true, texto: t, origem: 'busca' }) }).catch(() => {})
      return
    }
    const p = ent.pergunta
    perguntar({
      pergunta: p,
      periodo: p.periodo ? ent.periodo ?? p.periodo : null,
      profissionalId: p.profissional ? ent.profissional?.id ?? null : null,
      dias: p.dias ? ent.dias ?? p.dias : null,
    }, 'busca', t)
  }

  const tocar = (p: Pergunta) => perguntar({ pergunta: p, periodo: p.periodo ?? null, profissionalId: null, dias: p.dias ?? null }, 'botao')

  // Veio do card do Início: já responde.
  const jaAbriu = useRef(false)
  useEffect(() => {
    if (jaAbriu.current) return
    jaAbriu.current = true
    if (inicial?.p && PERGUNTA_POR_ID[inicial.p] && permitidas.has(inicial.p)) tocar(PERGUNTA_POR_ID[inicial.p])
    else if (inicial?.q) buscar(inicial.q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const relacionadas = estado ? (RELACIONADAS[estado.pergunta.id] ?? []).filter((id) => permitidas.has(id)).map((id) => PERGUNTA_POR_ID[id]) : []

  return (
    <div className="space-y-5">
      {/* Busca */}
      <form
        onSubmit={(ev) => { ev.preventDefault(); buscar() }}
        className="rounded-2xl p-4 lg:p-5"
        style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--admin-accent) 10%, var(--admin-surface)) 0%, var(--admin-surface) 75%)',
          border: '1px solid color-mix(in srgb, var(--admin-accent) 28%, var(--admin-border))',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--admin-accent)', color: '#fff' }}>
            <IconSparkles size={16} />
          </span>
          <label htmlFor="pergunta" className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
            O que você quer saber?
          </label>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 min-w-0 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--admin-text-faded)' }}>
              <IconSearch size={16} />
            </span>
            <input
              id="pergunta"
              value={texto}
              onChange={(ev) => setTexto(ev.target.value)}
              placeholder="Pergunte do seu jeito"
              className="w-full rounded-xl pl-9 pr-3 py-3 text-sm outline-none"
              style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            className="px-4 lg:px-5 rounded-xl text-sm font-bold text-white flex-shrink-0"
            style={{ background: 'var(--admin-accent)' }}
          >
            Perguntar
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <span className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>Experimente:</span>
          {exemplos.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => { setTexto(ex); buscar(ex) }}
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      <div ref={respostaRef} className="scroll-mt-4 space-y-5">
        {/* Pedido de ação: leva pra tela certa */}
        {atalho && (
          <div className="rounded-2xl p-4 lg:p-5" style={{ ...caixa, border: '1.5px solid var(--admin-accent)' }}>
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>Como fazer</p>
            <p className="text-lg font-bold leading-snug mt-2" style={{ color: 'var(--admin-text)' }}>{atalho.titulo}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--admin-text-2, var(--admin-text))' }}>{atalho.passo}</p>
            <Link
              href={atalho.href}
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: 'var(--admin-accent)' }}
            >
              {atalho.rotulo} <IconArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* Não entendeu */}
        {sugestoes && (
          <div className="rounded-2xl p-4 lg:p-5" style={caixa}>
            <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Não entendi essa. Você quis dizer:</p>
            <div className="flex flex-col gap-1.5 mt-3">
              {sugestoes.map((p) => <LinhaPergunta key={p.id} onClick={() => tocar(p)}>{p.texto}</LinhaPergunta>)}
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--admin-text-mute)' }}>Anotei sua pergunta pra ensinar o sistema a entender.</p>
          </div>
        )}

        {/* Resposta */}
        {estado && (
          <div className="rounded-2xl p-4 lg:p-6" style={{ ...caixa, border: '1.5px solid var(--admin-accent)', boxShadow: '0 8px 24px -16px color-mix(in srgb, var(--admin-accent) 60%, transparent)' }}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <p className="text-[11px] font-bold uppercase tracking-widest pt-1.5" style={{ color: 'var(--admin-text-faded)' }}>
                {estado.pergunta.texto}
              </p>

              {/* Filtros da pergunta */}
              {(estado.pergunta.periodo || estado.pergunta.profissional || estado.pergunta.dias) && (
                <div className="flex flex-wrap gap-2">
                  {estado.pergunta.periodo && (
                    <select
                      aria-label="Período"
                      value={estado.periodo ?? estado.pergunta.periodo}
                      onChange={(ev) => perguntar({ ...estado, periodo: ev.target.value }, 'botao')}
                      className="rounded-lg px-2 py-1.5 text-xs font-semibold"
                      style={seletor}
                    >
                      {PERIODOS_FIXOS.map((p) => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
                      {mesesPassados.map((p) => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
                    </select>
                  )}
                  {estado.pergunta.profissional && profissionais.length > 0 && (
                    <select
                      aria-label="Profissional"
                      value={estado.profissionalId ?? ''}
                      onChange={(ev) => perguntar({ ...estado, profissionalId: ev.target.value || null }, 'botao')}
                      className="rounded-lg px-2 py-1.5 text-xs font-semibold"
                      style={seletor}
                    >
                      <option value="">Todo o negócio</option>
                      {profissionais.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                  {estado.pergunta.dias && (
                    <select
                      aria-label="Dias sem voltar"
                      value={estado.dias ?? estado.pergunta.dias}
                      onChange={(ev) => perguntar({ ...estado, dias: Number(ev.target.value) }, 'botao')}
                      className="rounded-lg px-2 py-1.5 text-xs font-semibold"
                      style={seletor}
                    >
                      {[...new Set([30, 45, 60, 90, 120, 180, estado.dias ?? 60])].sort((a, b) => a - b).map((d) => <option key={d} value={d}>Há mais de {d} dias</option>)}
                    </select>
                  )}
                </div>
              )}
            </div>

            {carregando ? (
              <div className="mt-4 space-y-2.5" aria-label="Calculando">
                <div className="h-5 w-4/5 rounded-md animate-pulse" style={{ background: 'var(--admin-border)' }} />
                <div className="h-5 w-3/5 rounded-md animate-pulse" style={{ background: 'var(--admin-border)' }} />
                <div className="h-4 w-full rounded-md animate-pulse mt-4" style={{ background: 'var(--admin-border)' }} />
                <div className="h-4 w-full rounded-md animate-pulse" style={{ background: 'var(--admin-border)' }} />
              </div>
            ) : erro ? (
              <p className="text-sm mt-4" style={{ color: '#DC2626' }}>{erro}</p>
            ) : resposta ? (
              <>
                <p className="text-lg lg:text-xl font-bold leading-snug mt-3" style={{ color: 'var(--admin-text)' }}>{resposta.frase}</p>

                {resposta.aviso && (
                  <div
                    className="mt-3 rounded-xl px-3 py-2.5 flex items-start gap-2"
                    style={{ background: 'color-mix(in srgb, var(--admin-warn) 10%, var(--admin-surface))', border: '1px solid color-mix(in srgb, var(--admin-warn) 35%, transparent)' }}
                  >
                    <span className="flex-shrink-0 mt-0.5" style={{ color: 'var(--admin-warn)' }}><IconAlert size={16} /></span>
                    <div className="min-w-0">
                      <p className="text-sm" style={{ color: 'var(--admin-text)' }}>{resposta.aviso.texto}</p>
                      {resposta.aviso.link && (
                        <Link href={resposta.aviso.link.href} className="inline-block mt-1 text-sm font-bold" style={{ color: 'var(--admin-warn)' }}>
                          {resposta.aviso.link.rotulo} →
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {resposta.itens && resposta.itens.length > 0 && (
                  <ul className="mt-4 rounded-xl overflow-hidden" style={{ border: '1px solid var(--admin-border)' }}>
                    {resposta.itens.map((it, i) => (
                      <li
                        key={i}
                        className="flex items-baseline justify-between gap-3 px-3 py-2.5 text-sm"
                        style={{ background: i % 2 ? 'var(--admin-input-bg, transparent)' : 'transparent', borderTop: i ? '1px solid var(--admin-border)' : 'none' }}
                      >
                        <span className="min-w-0 truncate" style={{ color: 'var(--admin-text-2, var(--admin-text))' }}>{it.rotulo}</span>
                        <span className="flex-shrink-0 font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>{it.valor}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                  {resposta.nota && <p className="text-xs flex-1 min-w-[200px]" style={{ color: 'var(--admin-text-mute)' }}>{resposta.nota}</p>}
                  {resposta.link && (
                    <Link
                      href={resposta.link.href}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0"
                      style={{ background: 'var(--admin-accent)' }}
                    >
                      {resposta.link.rotulo} <IconArrowRight size={14} />
                    </Link>
                  )}
                </div>

                {relacionadas.length > 0 && (
                  <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--admin-border)' }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--admin-text-faded)' }}>Pergunte também</p>
                    <div className="flex flex-wrap gap-2">
                      {relacionadas.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => tocar(p)}
                          className="text-sm font-medium px-3 py-1.5 rounded-full"
                          style={{ background: 'color-mix(in srgb, var(--admin-accent) 10%, var(--admin-surface))', color: 'var(--admin-text)', border: '1px solid color-mix(in srgb, var(--admin-accent) 30%, transparent)' }}
                        >
                          {p.texto}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Perguntas prontas · um cartão por grupo, 4 visíveis e o resto no
          "ver mais" (33 empilhadas viravam uma rolagem sem fim no celular) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {grupos.map((g) => {
          const aberto = abertos.has(g.id)
          const visiveis = aberto ? g.perguntas : g.perguntas.slice(0, 4)
          const resto = g.perguntas.length - visiveis.length
          const Icone = ICONE_DO_GRUPO[g.id]
          return (
            <section key={g.id} className="rounded-2xl p-3 lg:p-4" style={caixa}>
              <h2 className="flex items-center gap-2 px-1 mb-2 text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
                <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--admin-accent) 14%, transparent)', color: 'var(--admin-accent)' }}>
                  <Icone size={15} />
                </span>
                {g.titulo}
              </h2>
              <div className="flex flex-col gap-1">
                {visiveis.map((p) => (
                  <LinhaPergunta key={p.id} ativo={estado?.pergunta.id === p.id} onClick={() => tocar(PERGUNTA_POR_ID[p.id])}>{p.texto}</LinhaPergunta>
                ))}
              </div>
              {resto > 0 && (
                <button
                  type="button"
                  onClick={() => setAbertos((s) => new Set(s).add(g.id))}
                  className="text-sm font-bold px-2 pt-2"
                  style={{ color: 'var(--admin-accent)' }}
                >
                  + {resto} {resto === 1 ? 'pergunta' : 'perguntas'}
                </button>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function LinhaPergunta({ children, onClick, ativo }: { children: React.ReactNode; onClick: () => void; ativo?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between gap-2 text-left text-sm font-medium px-3 py-2.5 rounded-xl transition-colors"
      style={{
        background: ativo ? 'var(--admin-accent)' : 'var(--admin-input-bg, transparent)',
        color: ativo ? '#fff' : 'var(--admin-text)',
      }}
    >
      <span className="min-w-0">{children}</span>
      <span className="flex-shrink-0 opacity-50"><IconChevronRight size={16} /></span>
    </button>
  )
}
