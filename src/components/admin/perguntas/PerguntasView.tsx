'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { GRUPOS, PERGUNTAS, PERGUNTA_POR_ID, PERIODOS_FIXOS, type Pergunta, type PeriodoId, type Resposta } from '@/lib/perguntas/catalogo'
import { entender, type Profissional } from '@/lib/perguntas/entender'

/* "Pergunte ao seu negócio" (21/10/2026) · tela única: busca do jeito da
   pessoa + perguntas prontas por grupo + resposta com período e filtros. */

type Estado = {
  pergunta: Pergunta
  periodo: PeriodoId | null
  profissionalId: string | null
  dias: number | null
}

const NOMES_MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function PerguntasView({ profissionais, liberadas, hoje }: { profissionais: Profissional[]; liberadas: string[]; hoje: string }) {
  const [texto, setTexto] = useState('')
  const [estado, setEstado] = useState<Estado | null>(null)
  const [resposta, setResposta] = useState<Resposta | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sugestoes, setSugestoes] = useState<Pergunta[] | null>(null)
  const [abertos, setAbertos] = useState<Set<string>>(new Set())
  const respostaRef = useRef<HTMLDivElement>(null)

  const permitidas = useMemo(() => new Set(liberadas), [liberadas])
  const grupos = GRUPOS.map((g) => ({ ...g, perguntas: PERGUNTAS.filter((p) => p.grupo === g.id && permitidas.has(p.id)) })).filter((g) => g.perguntas.length > 0)

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

  async function perguntar(e: Estado, origem: 'botao' | 'busca', textoDigitado?: string) {
    setEstado(e); setSugestoes(null); setErro(null); setCarregando(true)
    setTimeout(() => respostaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
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

  function buscar() {
    const t = texto.trim()
    if (!t) return
    const ent = entender(t, profissionais, hoje)
    if (!ent.pergunta || !permitidas.has(ent.pergunta.id)) {
      setEstado(null); setResposta(null); setErro(null)
      setSugestoes((ent.sugestoes.length ? ent.sugestoes : []).filter((p) => permitidas.has(p.id)))
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

  return (
    <div className="space-y-5">
      {/* Busca */}
      <form
        onSubmit={(ev) => { ev.preventDefault(); buscar() }}
        className="rounded-2xl p-4"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
      >
        <label htmlFor="pergunta" className="block text-sm font-semibold mb-2" style={{ color: 'var(--admin-text)' }}>
          Pergunte do seu jeito
        </label>
        <div className="flex gap-2">
          <input
            id="pergunta"
            value={texto}
            onChange={(ev) => setTexto(ev.target.value)}
            placeholder="Ex.: quanto faturei em setembro?"
            className="flex-1 min-w-0 rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ background: 'var(--admin-bg, #fff)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
            autoComplete="off"
          />
          <button
            type="submit"
            className="px-4 rounded-xl text-sm font-bold text-white flex-shrink-0"
            style={{ background: 'var(--admin-accent)' }}
          >
            Perguntar
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--admin-text-mute)' }}>
          {`Dá pra citar período e profissional: “comissão da ${profissionais[0]?.name.split(' ')[0] || 'Ana'} no mês passado”.`}
        </p>
      </form>

      {/* Não entendeu */}
      {sugestoes && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Não entendi essa. Você quis dizer:</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {sugestoes.map((p) => <Chip key={p.id} onClick={() => tocar(p)}>{p.texto}</Chip>)}
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--admin-text-mute)' }}>Anotei sua pergunta pra ensinar o sistema a entender.</p>
        </div>
      )}

      {/* Resposta */}
      <div ref={respostaRef} className="scroll-mt-4">
        {estado && (
          <div className="rounded-2xl p-4 lg:p-5" style={{ background: 'var(--admin-surface)', border: '1.5px solid var(--admin-accent)' }}>
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
              {estado.pergunta.texto}
            </p>

            {/* Filtros da pergunta */}
            {(estado.pergunta.periodo || estado.pergunta.profissional || estado.pergunta.dias) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {estado.pergunta.periodo && (
                  <select
                    aria-label="Período"
                    value={estado.periodo ?? estado.pergunta.periodo}
                    onChange={(ev) => perguntar({ ...estado, periodo: ev.target.value }, 'botao')}
                    className="rounded-lg px-2 py-1.5 text-xs font-semibold"
                    style={{ background: 'var(--admin-bg, #fff)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
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
                    style={{ background: 'var(--admin-bg, #fff)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
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
                    style={{ background: 'var(--admin-bg, #fff)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
                  >
                    {[...new Set([30, 45, 60, 90, 120, 180, estado.dias ?? 60])].sort((a, b) => a - b).map((d) => <option key={d} value={d}>Há mais de {d} dias</option>)}
                  </select>
                )}
              </div>
            )}

            {carregando ? (
              <p className="text-sm mt-4" style={{ color: 'var(--admin-text-mute)' }}>Calculando…</p>
            ) : erro ? (
              <p className="text-sm mt-4" style={{ color: '#DC2626' }}>{erro}</p>
            ) : resposta ? (
              <>
                <p className="text-lg font-bold leading-snug mt-3" style={{ color: 'var(--admin-text)' }}>{resposta.frase}</p>
                {resposta.itens && resposta.itens.length > 0 && (
                  <ul className="mt-3 divide-y" style={{ borderColor: 'var(--admin-border)' }}>
                    {resposta.itens.map((it, i) => (
                      <li key={i} className="flex items-baseline justify-between gap-3 py-2 text-sm" style={{ borderColor: 'var(--admin-border)' }}>
                        <span className="min-w-0 truncate" style={{ color: 'var(--admin-text-2, var(--admin-text))' }}>{it.rotulo}</span>
                        <span className="flex-shrink-0 font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>{it.valor}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {resposta.nota && <p className="text-xs mt-3" style={{ color: 'var(--admin-text-mute)' }}>{resposta.nota}</p>}
                {resposta.link && (
                  <Link href={resposta.link.href} className="inline-block mt-3 text-sm font-bold" style={{ color: 'var(--admin-accent)' }}>
                    {resposta.link.rotulo} →
                  </Link>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Perguntas prontas · 4 por grupo, o resto no "ver mais" (33 empilhadas
          viravam uma rolagem sem fim no celular) */}
      {grupos.map((g) => {
        const aberto = abertos.has(g.id)
        const visiveis = aberto ? g.perguntas : g.perguntas.slice(0, 4)
        const resto = g.perguntas.length - visiveis.length
        return (
          <section key={g.id}>
            <h2 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--admin-text-faded)' }}>{g.titulo}</h2>
            <div className="flex flex-wrap gap-2">
              {visiveis.map((p) => (
                <Chip key={p.id} ativo={estado?.pergunta.id === p.id} onClick={() => tocar(PERGUNTA_POR_ID[p.id])}>{p.texto}</Chip>
              ))}
              {resto > 0 && (
                <button
                  type="button"
                  onClick={() => setAbertos((s) => new Set(s).add(g.id))}
                  className="text-sm font-bold px-3 py-2"
                  style={{ color: 'var(--admin-accent)' }}
                >
                  + {resto} {resto === 1 ? 'pergunta' : 'perguntas'}
                </button>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function Chip({ children, onClick, ativo }: { children: React.ReactNode; onClick: () => void; ativo?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left text-sm font-medium px-3 py-2 rounded-xl transition-colors"
      style={{
        background: ativo ? 'var(--admin-accent)' : 'var(--admin-surface)',
        color: ativo ? '#fff' : 'var(--admin-text)',
        border: `1px solid ${ativo ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
      }}
    >
      {children}
    </button>
  )
}
