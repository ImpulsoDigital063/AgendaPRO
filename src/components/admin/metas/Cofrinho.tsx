'use client'

/* ═══════════════════════════════════════════════════════════════
   COFRINHO MANUAL DO SONHO (Eduardo, 04/11/2026)
   O sistema NUNCA mexe em dinheiro: só anota o que a dona informa.
   [Guardei] [Retirei] · saldo vem do banco (cofrinho_saldo) · últimos
   lançamentos com "desfazer" só no mais recente · ao bater a meta, oferece
   guardar o que passou dela (pré-preenchido) · guardado ≥ custo → marcar
   como conquistado. Mesma copy em todo nicho (Guardei/Retirei).
   ═══════════════════════════════════════════════════════════════ */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BarraMeta } from './BarraMeta'

export type Movimento = { id: string; tipo: 'guardei' | 'retirei'; valor: number; motivo: string | null; criado_em: string }

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2, minimumFractionDigits: 0 })
const soDigitos = (s: string) => Number(s.replace(/\D/g, '')) || 0
const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })

export default function Cofrinho(p: {
  custo: number | null
  saldo: number
  movimentos: Movimento[]
  /** "guarde R$ X por mês" (null = sem custo/prazo) */
  porMes: number | null
  /** passou da meta do mês: sugestão de quanto guardar */
  sobraDaMeta: number
  conquistado: boolean
}) {
  const router = useRouter()
  const [saldo, setSaldo] = useState(p.saldo)
  const [movs, setMovs] = useState<Movimento[]>(p.movimentos)
  const [aberto, setAberto] = useState<null | 'guardei' | 'retirei'>(null)
  const [valor, setValor] = useState(0)
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [conquistado, setConquistado] = useState(p.conquistado)

  const atingiu = !!p.custo && saldo >= p.custo

  function abrir(tipo: 'guardei' | 'retirei', pre = 0) {
    setAberto(tipo)
    setValor(pre)
    setMotivo('')
    setErro(null)
  }

  async function chamar(metodo: 'POST' | 'DELETE', corpo?: unknown, query = '') {
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
      return j
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu pra salvar.')
      return null
    } finally {
      setSalvando(false)
    }
  }

  async function lancar() {
    if (!aberto) return
    if (valor <= 0) { setErro('Coloque o valor.'); return }
    if (aberto === 'retirei' && valor > saldo) { setErro('Não dá pra retirar mais do que está guardado.'); return }
    const j = await chamar('POST', { tipo: 'cofrinho', mov: aberto, valor, motivo: aberto === 'retirei' ? motivo : null })
    if (!j) return
    setSaldo(j.saldo)
    setMovs(j.movimentos)
    setAberto(null)
    router.refresh()
  }

  async function desfazer(id: string) {
    const j = await chamar('DELETE', undefined, `?tipo=cofrinho&id=${id}`)
    if (!j) return
    setSaldo(j.saldo)
    setMovs(j.movimentos)
    router.refresh()
  }

  async function marcarConquistado() {
    const j = await chamar('POST', { tipo: 'conquistado' })
    if (!j) return
    setConquistado(true)
    router.refresh()
  }

  const btn = 'flex-1 px-4 py-2.5 rounded-2xl text-sm font-bold disabled:opacity-60'

  if (conquistado) {
    return (
      <div className="mt-4 rounded-2xl px-4 py-3 text-sm" style={{ background: 'color-mix(in srgb, var(--admin-success) 14%, var(--admin-surface))', color: 'var(--admin-text)' }} data-testid="cofrinho-conquistado">
        <b>Conquistado!</b> {brl(saldo)} guardados.{' '}
        <Link href="/admin/metas/definir?passo=2" className="font-semibold underline">Escolher o próximo sonho</Link>
      </div>
    )
  }

  return (
    <div className="mt-4" data-testid="cofrinho">
      <p className="text-[15px]" style={{ color: 'var(--admin-text)' }} data-testid="cofrinho-saldo">
        <b className="tabular-nums">{brl(saldo)}</b>
        {p.custo ? <span style={{ color: 'var(--admin-text-mute)' }}> de {brl(p.custo)} guardados</span> : <span style={{ color: 'var(--admin-text-mute)' }}> guardados</span>}
      </p>
      {p.custo ? <div className="mt-2"><BarraMeta atual={saldo} alvo={p.custo} alto={8} /></div> : null}
      {p.porMes ? <p className="text-xs mt-1.5" style={{ color: 'var(--admin-text-mute)' }}>guarde {brl(p.porMes)} por mês pra chegar no prazo</p> : null}

      {atingiu ? (
        <div className="mt-3 rounded-2xl px-4 py-3" style={{ background: 'color-mix(in srgb, var(--admin-success) 14%, var(--admin-surface))' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Você juntou o valor do sonho.</p>
          <button type="button" disabled={salvando} onClick={marcarConquistado} className="mt-2 w-full px-4 py-2.5 rounded-2xl text-sm font-bold" style={{ background: 'var(--admin-success)', color: '#fff' }}>
            Marcar como conquistado
          </button>
        </div>
      ) : p.sobraDaMeta > 0 && !aberto ? (
        <button type="button" onClick={() => abrir('guardei', Math.floor(p.sobraDaMeta))} className="mt-3 w-full text-left rounded-2xl px-4 py-3 text-sm" style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-text)' }} data-testid="cofrinho-sobra">
          Quer guardar <b>{brl(Math.floor(p.sobraDaMeta))}</b> do que passou da meta?
        </button>
      ) : null}

      {aberto ? (
        <div className="mt-3 rounded-2xl p-3" style={{ border: '1px solid var(--admin-border)' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>{aberto === 'guardei' ? 'Guardei' : 'Retirei'}</p>
          <input
            inputMode="numeric"
            autoFocus
            aria-label={aberto === 'guardei' ? 'Valor guardado' : 'Valor retirado'}
            className="mt-2 w-full rounded-xl px-3 py-2.5 text-lg font-bold outline-none tabular-nums"
            style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
            placeholder="R$ 0"
            value={valor > 0 ? `R$ ${valor.toLocaleString('pt-BR')}` : ''}
            onChange={(e) => setValor(Math.min(99_999_999, soDigitos(e.target.value)))}
          />
          {aberto === 'retirei' && (
            <input
              aria-label="Motivo (opcional)"
              maxLength={60}
              className="mt-2 w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
              placeholder="Motivo (opcional)"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          )}
          {erro && <p className="text-xs mt-2 font-semibold" style={{ color: 'var(--admin-danger)' }}>{erro}</p>}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setAberto(null)} className={btn} style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-mute)' }}>Cancelar</button>
            <button type="button" disabled={salvando} onClick={lancar} className={btn} style={{ background: 'var(--admin-accent)', color: '#fff' }}>{salvando ? 'Salvando…' : 'Salvar'}</button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => abrir('guardei')} className={btn} style={{ background: 'var(--admin-accent)', color: '#fff' }}>Guardei</button>
          <button type="button" disabled={saldo <= 0} onClick={() => abrir('retirei')} className={btn} style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}>Retirei</button>
        </div>
      )}
      {!aberto && erro && <p className="text-xs mt-2 font-semibold" style={{ color: 'var(--admin-danger)' }}>{erro}</p>}

      {movs.length > 0 && (
        <ul className="mt-3 space-y-1.5" data-testid="cofrinho-movimentos">
          {movs.slice(0, 3).map((m, i) => (
            <li key={m.id} className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--admin-text-mute)' }}>
              <span className="tabular-nums w-11 shrink-0">{dataCurta(m.criado_em)}</span>
              <b className="tabular-nums" style={{ color: m.tipo === 'guardei' ? 'var(--admin-success)' : 'var(--admin-text)' }}>
                {m.tipo === 'guardei' ? '+' : '−'}{brl(m.valor)}
              </b>
              <span className="truncate flex-1">{m.motivo ?? ''}</span>
              {i === 0 && (
                <button type="button" disabled={salvando} onClick={() => desfazer(m.id)} className="text-xs font-semibold shrink-0" style={{ color: 'var(--admin-text-faded)' }}>
                  Desfazer
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
