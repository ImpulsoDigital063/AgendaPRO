'use client'

/* ═══════════════════════════════════════════════════════════════
   Definir a meta · 2 passos (04/11/2026)
   1. "Quanto você quer faturar em <mês>?" · UM valor sugerido + base em 1 linha
   2. Sonho OPCIONAL (nome, custo, até quando) com Pular visível
   Celular = folha cheia (sem prefixo). Computador (sm: ≥640) = cartão
   centralizado de até 520 px.
   ═══════════════════════════════════════════════════════════════ */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { IconArrowLeft } from '@/components/ui/Icon'
import { guardarPorMes, traduzirMeta } from '@/lib/metas/traducao'

type Sugestao = { valor: number | null; base: string; origem: 'historico' | 'agendado' | 'nenhuma'; ticket: number | null; ticketOrigem: 'historico' | 'servicos' | null }
type Sonho = { titulo: string; custo: number | null; ateMes: string | null }

export type DefinirMetaProps = {
  ym: string
  mesNome: string
  passoInicial: 1 | 2
  soSonho: boolean
  metaAtual: number | null
  sugestao: Sugestao | null
  faturado: number
  diasRestantes: number
  diasTrabalhoMes: number
  diasNoMes: number
  agendados: number
  sonhoAtual: Sonho | null
  /** saldo do cofrinho do sonho atual (0 sem sonho) */
  guardado: number
  /** 'AAAA-MM' de hoje */
  mesAtual: string
  mesesPrazo: { ym: string; rotulo: string }[]
  nicho: { perguntaMeta: string; perguntaSonho: string; pular: string; exemplosSonho: string[]; placeholderSonho: string; imagem: string }
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0, minimumFractionDigits: 0 })
const soDigitos = (s: string) => Number(s.replace(/\D/g, '')) || 0

export default function DefinirMeta(p: DefinirMetaProps) {
  const router = useRouter()
  const [passo, setPasso] = useState<1 | 2>(p.passoInicial)
  const inicial = p.metaAtual ?? p.sugestao?.valor ?? 0
  const [valor, setValor] = useState<number>(inicial)
  const [titulo, setTitulo] = useState(p.sonhoAtual?.titulo ?? '')
  const [custo, setCusto] = useState<number>(p.sonhoAtual?.custo ?? 0)
  const [ateMes, setAteMes] = useState<string>(p.sonhoAtual?.ateMes ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const faltam = Math.max(0, valor - p.faturado)
  const porDia = p.diasRestantes > 0 && faltam > 0 ? Math.ceil(faltam / p.diasRestantes / 10) * 10 : 0
  const traducao = traduzirMeta({
    valor,
    ticket: p.sugestao?.ticket ?? null,
    ticketOrigem: p.sugestao?.ticketOrigem ?? null,
    faturado: p.faturado,
    agendados: p.agendados,
    diasTrabalhoMes: p.diasTrabalhoMes,
    diasNoMes: p.diasNoMes,
  })
  const ehSugestao = p.sugestao?.valor != null && valor === p.sugestao.valor

  async function enviar(metodo: 'POST' | 'DELETE', corpo?: unknown, query = '') {
    setSalvando(true)
    setErro(null)
    try {
      const r = await fetch(`/api/admin/metas${query}`, {
        method: metodo,
        headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
        body: corpo ? JSON.stringify(corpo) : undefined,
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.ok) throw new Error(j.error || 'Não deu pra salvar. Tente de novo.')
      return true
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu pra salvar. Tente de novo.')
      return false
    } finally {
      setSalvando(false)
    }
  }

  async function salvarMeta() {
    if (valor <= 0) { setErro('Coloque um valor.'); return }
    const ok = await enviar('POST', { tipo: 'meta', mes: p.ym, valor, sugerido: p.sugestao?.valor ?? null, ticket: p.sugestao?.ticket ?? null })
    if (!ok) return
    // já tem sonho: volta direto pra aba; senão oferece o passo 2 (opcional)
    if (p.sonhoAtual) { router.push('/admin/metas'); router.refresh() } else setPasso(2)
  }

  async function salvarSonho() {
    if (!titulo.trim()) { setErro('Diga qual é o sonho, ou toque em ' + p.nicho.pular + '.'); return }
    const ok = await enviar('POST', { tipo: 'sonho', titulo: titulo.trim(), custo: custo > 0 ? custo : null, ateMes: ateMes || null })
    if (!ok) return
    router.push('/admin/metas')
    router.refresh()
  }

  async function tirarSonho() {
    const ok = await enviar('DELETE', undefined, '?tipo=sonho')
    if (!ok) return
    router.push('/admin/metas')
    router.refresh()
  }

  const rotulo = 'text-[11px] font-bold uppercase tracking-widest'
  const campo = 'w-full rounded-2xl px-4 py-3 text-base outline-none'
  const estiloCampo = { background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }
  const btnCheio = 'flex items-center justify-center w-full px-5 py-3.5 rounded-2xl text-[15px] font-bold disabled:opacity-60'
  const voltar = passo === 2 && !p.soSonho

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-32 sm:pt-10 sm:pb-12">
      <div
        className="sm:rounded-3xl sm:p-8 sm:max-w-[520px] sm:mx-auto"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 24, padding: 20, boxShadow: 'var(--admin-shadow)' }}
      >
        <div className="flex items-center justify-between mb-5">
          {voltar ? (
            <button type="button" onClick={() => setPasso(1)} aria-label="Voltar" className="flex items-center justify-center rounded-full" style={{ width: 36, height: 36, border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}>
              <IconArrowLeft size={18} />
            </button>
          ) : (
            <Link href="/admin/metas" aria-label="Sair" className="flex items-center justify-center rounded-full" style={{ width: 36, height: 36, border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}>
              <IconArrowLeft size={18} />
            </Link>
          )}
          {!p.soSonho && <span className="text-xs font-semibold" style={{ color: 'var(--admin-text-faded)' }}>{passo} de 2</span>}
        </div>

        {passo === 1 ? (
          <>
            <h1 className="text-[24px] sm:text-[26px] font-bold leading-tight tracking-tight" style={{ color: 'var(--admin-text)' }}>
              {p.nicho.perguntaMeta.replace('{mes}', p.mesNome)}
            </h1>
            {p.sugestao && <p className="text-sm mt-2" style={{ color: 'var(--admin-text-mute)' }}>{p.sugestao.base}</p>}

            <label className="block mt-6">
              <span className={rotulo} style={{ color: 'var(--admin-text-faded)' }}>Meta de {p.mesNome}</span>
              <div className="mt-2 flex items-center gap-2 rounded-2xl px-4 py-3" style={estiloCampo}>
                <em className="not-italic text-xl font-bold" style={{ color: 'var(--admin-text-mute)' }}>R$</em>
                <input
                  inputMode="numeric"
                  autoComplete="off"
                  className="flex-1 min-w-0 bg-transparent outline-none text-[30px] font-extrabold tabular-nums"
                  style={{ color: 'var(--admin-text)' }}
                  value={valor > 0 ? valor.toLocaleString('pt-BR') : ''}
                  placeholder="0"
                  onChange={(e) => setValor(Math.min(99_999_999, soDigitos(e.target.value)))}
                  aria-label={`Meta de faturamento de ${p.mesNome}`}
                />
              </div>
              {ehSugestao && <small className="block mt-1.5 text-xs font-semibold" style={{ color: 'var(--admin-accent)' }}>sugestão pelo seu histórico</small>}
            </label>

            {/* tradução ao vivo em atendimentos (Eduardo 04/11) */}
            {traducao && (
              <p className="text-sm mt-4 leading-relaxed rounded-2xl px-4 py-3" style={{ color: 'var(--admin-text)', background: 'var(--admin-accent-bg)' }} aria-live="polite" data-testid="traducao-meta">
                {traducao}
              </p>
            )}
            {valor > 0 && p.faturado > 0 && faltam > 0 && porDia > 0 && (
              <p className="text-xs mt-2" style={{ color: 'var(--admin-text-mute)' }}>
                Faltariam {brl(faltam)} · {brl(porDia)} por dia nos {p.diasRestantes} dias de trabalho que restam
              </p>
            )}

            {erro && <p className="text-sm mt-4 font-semibold" style={{ color: 'var(--admin-danger)' }}>{erro}</p>}
            <button type="button" disabled={salvando} onClick={salvarMeta} className={`${btnCheio} mt-6`} style={{ background: 'var(--admin-accent)', color: '#fff' }}>
              {salvando ? 'Salvando…' : p.sonhoAtual ? 'Salvar meta' : 'Continuar'}
            </button>
          </>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.nicho.imagem} srcSet={`${p.nicho.imagem} 640w, ${p.nicho.imagem.replace('-640.webp', '.webp')} 1280w`} sizes="(min-width: 640px) 456px, 100vw" alt="" className="w-full rounded-2xl object-cover mb-5" style={{ aspectRatio: '16 / 7' }} />
            <h1 className="text-[24px] sm:text-[26px] font-bold leading-tight tracking-tight" style={{ color: 'var(--admin-text)' }}>{p.nicho.perguntaSonho}</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--admin-text-mute)' }}>Opcional</p>

            {(() => {
              const pm = guardarPorMes(custo > 0 ? custo : null, p.guardado, ateMes || null, p.mesAtual)
              if (!pm || !ateMes) return null
              const nomeAte = p.mesesPrazo.find((m) => m.ym === ateMes)?.rotulo.split(' ')[0] ?? ''
              return (
                <p className="text-sm mt-4 rounded-2xl px-4 py-3" style={{ color: 'var(--admin-text)', background: 'var(--admin-accent-bg)' }} data-testid="guardar-por-mes">
                  Pra ter {brl(custo)} até {nomeAte}, guarde <b>{brl(pm)}</b> por mês
                </p>
              )
            })()}

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className={rotulo} style={{ color: 'var(--admin-text-faded)' }}>O quê</span>
                <input className={`${campo} mt-2`} style={estiloCampo} maxLength={80} placeholder={p.nicho.placeholderSonho} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.nicho.exemplosSonho.map((ex) => (
                    <button key={ex} type="button" onClick={() => setTitulo(ex)} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ border: '1px solid var(--admin-border)', color: titulo === ex ? 'var(--admin-accent)' : 'var(--admin-text-mute)', background: titulo === ex ? 'var(--admin-accent-bg)' : 'transparent' }}>
                      {ex}
                    </button>
                  ))}
                </div>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={rotulo} style={{ color: 'var(--admin-text-faded)' }}>Quanto custa</span>
                  <input inputMode="numeric" className={`${campo} mt-2`} style={estiloCampo} placeholder="R$ 0" value={custo > 0 ? `R$ ${custo.toLocaleString('pt-BR')}` : ''} onChange={(e) => setCusto(Math.min(99_999_999, soDigitos(e.target.value)))} />
                </label>
                <label className="block">
                  <span className={rotulo} style={{ color: 'var(--admin-text-faded)' }}>Até quando</span>
                  <select className={`${campo} mt-2`} style={estiloCampo} value={ateMes} onChange={(e) => setAteMes(e.target.value)}>
                    <option value="">sem prazo</option>
                    {p.mesesPrazo.map((m) => <option key={m.ym} value={m.ym}>{m.rotulo}</option>)}
                  </select>
                </label>
              </div>
            </div>

            {erro && <p className="text-sm mt-4 font-semibold" style={{ color: 'var(--admin-danger)' }}>{erro}</p>}
            <button type="button" disabled={salvando} onClick={salvarSonho} className={`${btnCheio} mt-6`} style={{ background: 'var(--admin-accent)', color: '#fff' }}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
            <Link href="/admin/metas" className={`${btnCheio} mt-2`} style={{ color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }}>
              {p.nicho.pular}
            </Link>
            {p.sonhoAtual && (
              <button type="button" disabled={salvando} onClick={tirarSonho} className="block mx-auto mt-4 text-xs font-semibold" style={{ color: 'var(--admin-text-faded)' }}>
                Tirar o sonho
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
