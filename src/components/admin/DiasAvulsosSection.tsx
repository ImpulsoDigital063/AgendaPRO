'use client'

/* ═══════════════════════════════════════════════════════════════
   DIAS AVULSOS — abrir (ou mudar o horário de) UMA data específica (v153)

   Wanessa, 30/09/2026: "não quero atender toda sexta, mas quero que na
   sexta 09/10 tenha atendimento, porque na quinta não vou poder atender".
   A semana acima é a regra; isto é a exceção de um dia.

   Neste dia vale SÓ o horário daqui, no lugar do da semana (regra do
   Eduardo, 02/10). Pra FECHAR um dia, o caminho continua sendo Bloqueios
   — o aviso no rodapé manda pra lá em vez de duplicar a função.

   Componente separado do HorariosTab de propósito: aquele arquivo tem
   1.800 linhas e serve dono, recepção e profissional; aqui é só encaixe.
   ═══════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { todayBR } from '@/lib/date-br'
import type { Professional } from '@/lib/types'

const DURATIONS = [5, 10, 15, 20, 30, 40, 45, 60, 75, 90, 120]

function formatDuration(min: number) {
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

function dataLegivel(ymd: string) {
  const d = new Date(`${ymd}T12:00:00`)
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

type Linha = { id: string; professional_id: string; date: string; start_time: string; end_time: string; slot_duration: number }

export default function DiasAvulsosSection({
  professionals,
  selectedProfId,
  isAdmin = false,
}: {
  professionals: Professional[]
  selectedProfId: string
  isAdmin?: boolean
}) {
  const supabase = useMemo(() => createClient(), [])
  const hoje = todayBR()
  // Chave em texto: o HorariosTab recria a lista a cada render, e depender do
  // array em si faria a lista recarregar sem parar.
  const idsKey = professionals.map((p) => p.id).join(',')
  const ids = useMemo(() => (idsKey ? idsKey.split(',') : []), [idsKey])
  const nomeDe = (id: string) => professionals.find((p) => p.id === id)?.name ?? 'Profissional'

  const [linhas, setLinhas] = useState<Linha[]>([])
  const [aberto, setAberto] = useState(false)
  const [data, setData] = useState('')
  const [quem, setQuem] = useState<string[]>([])
  const [abre, setAbre] = useState('09:00')
  const [fecha, setFecha] = useState('18:00')
  const [comPausa, setComPausa] = useState(false)
  const [pausaIni, setPausaIni] = useState('12:00')
  const [pausaFim, setPausaFim] = useState('13:00')
  const [intervalo, setIntervalo] = useState(30)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  // Recarrega quando muda a versão (depois de salvar/remover)
  const [versao, setVersao] = useState(0)
  const carregar = useCallback(() => setVersao((v) => v + 1), [])
  useEffect(() => {
    if (ids.length === 0) return
    let vivo = true
    supabase
      .from('working_hours_dates')
      .select('id, professional_id, date, start_time, end_time, slot_duration')
      .in('professional_id', ids)
      .gte('date', hoje)
      .order('date')
      .order('start_time')
      .then(({ data: d }) => { if (vivo) setLinhas((d ?? []) as Linha[]) })
    return () => { vivo = false }
  }, [supabase, ids, hoje, versao])

  function abrirForm() {
    setErro(null); setOk(null)
    setData(''); setQuem(selectedProfId ? [selectedProfId] : ids.slice(0, 1))
    setAbre('09:00'); setFecha('18:00'); setComPausa(false); setIntervalo(30)
    setAberto(true)
  }

  async function salvar() {
    setErro(null); setOk(null)
    if (!data || data < hoje) { setErro('Escolha uma data de hoje em diante.'); return }
    if (quem.length === 0) { setErro('Escolha quem vai atender.'); return }
    if (fecha <= abre) { setErro('O fechamento tem que ser depois da abertura.'); return }
    if (comPausa && !(pausaIni > abre && pausaFim > pausaIni && pausaFim < fecha)) {
      setErro('A pausa tem que ficar dentro do horário, com fim depois do início.'); return
    }
    const periodos = comPausa
      ? [{ start_time: abre, end_time: pausaIni }, { start_time: pausaFim, end_time: fecha }]
      : [{ start_time: abre, end_time: fecha }]

    setSalvando(true)
    for (const profId of quem) {
      const prof = professionals.find((p) => p.id === profId)
      if (!prof) continue
      // Mesma data de novo = substitui (não empilha dois horários pro mesmo dia)
      const { error: delErr } = await supabase.from('working_hours_dates').delete().eq('professional_id', profId).eq('date', data)
      if (delErr) { setSalvando(false); setErro(`Não foi possível salvar: ${delErr.message}`); return }
      const { error: insErr } = await supabase.from('working_hours_dates').insert(
        periodos.map((p) => ({ business_id: prof.business_id, professional_id: profId, date: data, ...p, slot_duration: intervalo })),
      )
      if (insErr) { setSalvando(false); setErro(`Não foi possível salvar: ${insErr.message}`); return }
    }
    // Prova na fonte: relê o que gravou antes de dizer "salvo"
    const { count } = await supabase.from('working_hours_dates').select('id', { count: 'exact', head: true }).in('professional_id', quem).eq('date', data)
    setSalvando(false)
    if ((count ?? 0) < quem.length * periodos.length) { setErro('O horário não ficou salvo. Tente de novo.'); return }
    setOk(`${dataLegivel(data)} aberto. Já aparece no link de agendamento.`)
    setAberto(false)
    carregar()
  }

  async function remover(profId: string, date: string) {
    setErro(null); setOk(null)
    const { error } = await supabase.from('working_hours_dates').delete().eq('professional_id', profId).eq('date', date)
    if (error) { setErro(`Não foi possível remover: ${error.message}`); return }
    carregar()
  }

  // Agrupa por profissional + data (pausa = 2 períodos no mesmo dia)
  const grupos = useMemo(() => {
    const m = new Map<string, Linha[]>()
    for (const l of linhas) {
      const k = `${l.date}|${l.professional_id}`
      m.set(k, [...(m.get(k) ?? []), l])
    }
    return [...m.entries()].map(([k, ls]) => ({ date: k.split('|')[0], profId: k.split('|')[1], periodos: ls }))
  }, [linhas])

  const podeEscolherQuem = isAdmin && professionals.length > 1

  return (
    <div className="rounded-2xl p-4 mt-4 space-y-3" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
      <div>
        <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>Dias avulsos</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
          Abrir uma data específica, ou mudar o horário de um dia só, sem mexer na semana.
        </p>
      </div>

      {grupos.length > 0 && (
        <ul className="space-y-1.5">
          {grupos.map((g) => (
            <li key={`${g.date}-${g.profId}`} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}>
              <span className="min-w-0">
                <span className="block text-sm font-semibold capitalize" style={{ color: 'var(--admin-text)' }}>{dataLegivel(g.date)}</span>
                <span className="block text-xs truncate" style={{ color: 'var(--admin-text-mute)' }}>
                  {podeEscolherQuem ? `${nomeDe(g.profId)} · ` : ''}
                  {g.periodos.map((p) => `${p.start_time.slice(0, 5)}–${p.end_time.slice(0, 5)}`).join(' e ')}
                  {' · '}{formatDuration(g.periodos[0].slot_duration)}
                </span>
              </span>
              <button type="button" onClick={() => remover(g.profId, g.date)} className="text-xs font-semibold flex-shrink-0" style={{ color: '#DC2626' }}>
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}

      {ok && <p className="text-xs font-semibold" style={{ color: '#16A34A' }}>{ok}</p>}

      {!aberto ? (
        <button
          type="button"
          onClick={abrirForm}
          className="w-full py-2.5 rounded-xl text-sm font-bold"
          style={{ background: 'color-mix(in srgb, var(--admin-accent) 10%, transparent)', color: 'var(--admin-accent)', border: '1px dashed color-mix(in srgb, var(--admin-accent) 45%, transparent)' }}
        >
          + Abrir um dia avulso
        </button>
      ) : (
        <div className="space-y-2.5 rounded-xl p-3" style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}>
          <label className="block">
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Data</span>
            <input type="date" min={hoje} value={data} onChange={(e) => setData(e.target.value)} className="admin-input w-full mt-1 px-3 py-2 text-sm" />
          </label>

          {podeEscolherQuem && (
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Quem atende</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {professionals.map((p) => {
                  const marcado = quem.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setQuem((q) => (marcado ? q.filter((x) => x !== p.id) : [...q, p.id]))}
                      className="px-3 py-1.5 rounded-full text-xs font-bold"
                      style={marcado
                        ? { background: 'var(--admin-accent)', color: '#fff' }
                        : { background: 'var(--admin-surface)', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}
                    >
                      {p.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Abertura</span>
              <input type="time" value={abre} onChange={(e) => setAbre(e.target.value)} className="admin-input w-full mt-1 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Fechamento</span>
              <input type="time" value={fecha} onChange={(e) => setFecha(e.target.value)} className="admin-input w-full mt-1 px-3 py-2 text-sm" />
            </label>
          </div>

          {comPausa ? (
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Pausa · início</span>
                <input type="time" value={pausaIni} onChange={(e) => setPausaIni(e.target.value)} className="admin-input w-full mt-1 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Pausa · fim</span>
                <input type="time" value={pausaFim} onChange={(e) => setPausaFim(e.target.value)} className="admin-input w-full mt-1 px-3 py-2 text-sm" />
              </label>
              <button type="button" onClick={() => setComPausa(false)} className="col-span-2 text-xs text-left underline" style={{ color: 'var(--admin-text-mute)' }}>Tirar pausa</button>
            </div>
          ) : (
            <button type="button" onClick={() => setComPausa(true)} className="text-xs font-semibold" style={{ color: 'var(--admin-accent)' }}>
              + Adicionar pausa (almoço, intervalo)
            </button>
          )}

          <label className="block">
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Intervalo entre horários</span>
            <select value={intervalo} onChange={(e) => setIntervalo(Number(e.target.value))} className="admin-input w-full mt-1 px-3 py-2 text-sm">
              {DURATIONS.map((d) => <option key={d} value={d}>{formatDuration(d)}</option>)}
            </select>
          </label>

          <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
            Neste dia vale só este horário, no lugar do horário da semana.
          </p>

          {erro && <p className="text-xs font-semibold" style={{ color: '#DC2626' }}>{erro}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={salvar} disabled={salvando} className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50" style={{ background: 'var(--admin-accent)', color: '#fff' }}>
              {salvando ? 'Salvando…' : 'Abrir este dia'}
            </button>
            <button type="button" onClick={() => setAberto(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ color: 'var(--admin-text-mute)' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
        Pra <strong>fechar</strong> um dia ou um horário (folga, compromisso), use <strong>Bloqueios</strong>.
      </p>
    </div>
  )
}
