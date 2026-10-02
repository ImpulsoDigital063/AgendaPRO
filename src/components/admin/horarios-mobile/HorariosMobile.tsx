'use client'

/* ═══════════════════════════════════════════════════════════════
   HORÁRIOS — CELULAR (v155)

   Eduardo, 02/10/2026, testando o "Dias avulsos" no celular: a tela de
   Horários estava confusa — 7 dias abertos um embaixo do outro, campo de
   hora estourando o cartão, aviso de "alterações não salvas" sem ninguém
   ter mexido e nenhum calendário. Protótipo aprovado no mesmo dia:
   claude.ai/artifact/7BD8xz5UZiTPvBiBZSqEhu

   Duas abas:
   · Semana     — uma linha por dia; ligar/desligar salva na hora; tocar
                  abre o painel do dia. Sem barra de "salvar" global.
   · Calendário — o mês com a cor de cada dia. Tocar numa data: abrir,
                  mudar o horário só dela, ou dar folga. Junta num lugar
                  só o que antes era Dias avulsos + Bloqueios por data.

   Grava nas mesmas tabelas de sempre: working_hours (RPC
   replace_professional_hours), working_hours_dates (v153) e
   business_blocks. Toda escrita relê o banco antes de dizer "salvo".
   Desktop (sm+) não usa este arquivo.
   ═══════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addDaysBR, todayBR } from '@/lib/date-br'
import type { Professional, WorkingHours } from '@/lib/types'
import {
  DAYS, DURATIONS, COMMERCIAL_DAYS, COMMERCIAL_PLUS_SAT_DAYS,
  COMMERCIAL_START, COMMERCIAL_LUNCH_START, COMMERCIAL_LUNCH_END, COMMERCIAL_END, COMMERCIAL_SLOT,
  buildSchedule, diffHoursPerWeek, formatDuration, suggestNewPeriodFromExisting,
  type DayConfig, type Schedule,
} from '@/lib/horarios-semana'
import {
  dataPorExtenso, diaDaSemana, horaCurta, horarioDeCostume, nomeDoMes, periodosValidos, resumoPeriodos, statusDoDia,
  type Bloqueio, type LinhaData, type Periodo, type StatusDia,
} from './dados'
import { Aviso, BotaoPrincipal, BotaoSecundario, CampoHora, Segmento, Sheet, Switch, Toast } from './ui'

type Props = {
  professionals: Professional[]
  initialWorkingHours: WorkingHours[]
  isAdmin?: boolean
}

type Painel =
  | null
  | { tipo: 'semana'; dia: number; rascunho: DayConfig }
  | { tipo: 'fecharSemana'; dia: number }
  | { tipo: 'dia'; data: string }
  | { tipo: 'novo' }
  | { tipo: 'ajustes' }

/** Formulário de UM dia (painel do dia e "+ Dia personalizado") */
type FormDia = { abre: string; fecha: string; comPausa: boolean; pausaIni: string; pausaFim: string; slot: number }

function formDe(periodos: Periodo[], slot: number): FormDia {
  const p = periodos.length ? periodos : [{ start_time: '09:00', end_time: '18:00' }]
  return {
    abre: p[0].start_time,
    fecha: p[p.length - 1].end_time,
    comPausa: p.length > 1,
    pausaIni: p.length > 1 ? p[0].end_time : '12:00',
    pausaFim: p.length > 1 ? p[1].start_time : '13:00',
    slot,
  }
}

function periodosDe(f: FormDia): Periodo[] {
  return f.comPausa
    ? [{ start_time: f.abre, end_time: f.pausaIni }, { start_time: f.pausaFim, end_time: f.fecha }]
    : [{ start_time: f.abre, end_time: f.fecha }]
}

function buildHoursArray(s: Schedule) {
  const out: { day_of_week: number; start_time: string; end_time: string; slot_duration: number }[] = []
  for (const d of DAYS) {
    const c = s[d.id]
    if (!c.active) continue
    for (const p of c.periods) {
      if (p.start_time >= p.end_time) continue
      out.push({ day_of_week: d.id, start_time: p.start_time, end_time: p.end_time, slot_duration: c.slot_duration })
    }
  }
  return out
}

const COR_DIA: Record<StatusDia['tipo'], { bg: string; fg: string; borda: string }> = {
  passado: { bg: 'transparent', fg: '#CBD5E1', borda: 'transparent' },
  normal: { bg: '#FFFFFF', fg: '#0F172A', borda: '1px solid #E2E8F0' },
  fechado: { bg: 'transparent', fg: '#94A3B8', borda: '1px dashed #CBD5E1' },
  especial: { bg: 'var(--admin-accent)', fg: '#FFFFFF', borda: 'transparent' },
  folga: { bg: '#FECACA', fg: '#7F1D1D', borda: 'transparent' },
}

export default function HorariosMobile({ professionals, initialWorkingHours, isAdmin = false }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const hoje = todayBR()
  const ate = addDaysBR(hoje, 180)

  const [profId, setProfId] = useState(professionals[0]?.id ?? '')
  const prof = professionals.find((p) => p.id === profId)
  const primeiroNome = (prof?.name ?? 'Profissional').split(' ')[0]

  const [workingHours, setWorkingHours] = useState(initialWorkingHours)
  const semana = useMemo(() => buildSchedule(workingHours, profId), [workingHours, profId])

  const [aba, setAba] = useState<'semana' | 'calendario'>('semana')
  const [mes, setMes] = useState(hoje.slice(0, 7))
  const [painel, setPainel] = useState<Painel>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Datas especiais + bloqueios da profissional (e os do salão inteiro)
  const [datas, setDatas] = useState<LinhaData[]>([])
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([])
  const [versao, setVersao] = useState(0)
  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  useEffect(() => {
    if (!prof) return
    let vivo = true
    Promise.all([
      supabase
        .from('working_hours_dates')
        .select('id, professional_id, date, start_time, end_time, slot_duration')
        .eq('professional_id', prof.id)
        .gte('date', hoje)
        .lte('date', ate),
      supabase
        .from('business_blocks')
        .select('id, professional_id, block_type, day_of_week, block_date, start_time, end_time, reason')
        .eq('business_id', prof.business_id)
        .eq('active', true)
        .or(`professional_id.eq.${prof.id},professional_id.is.null`)
        .or(`block_type.eq.recurring,block_date.gte.${hoje}`),
    ]).then(([d, b]) => {
      if (!vivo) return
      setDatas((d.data ?? []) as LinhaData[])
      setBloqueios((b.data ?? []) as Bloqueio[])
    })
    return () => { vivo = false }
  }, [supabase, prof, hoje, ate, versao])

  useEffect(() => () => { if (toastRef.current) clearTimeout(toastRef.current) }, [])

  function avisar(msg: string) {
    setToast(msg)
    if (toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(''), 2600)
  }

  function fecharPainel() {
    if (salvando) return
    setPainel(null)
    setErro(null)
  }

  // ─── Semana (working_hours) ─────────────────────────────────────
  async function salvarSemana(next: Schedule, msg: string): Promise<boolean> {
    if (!profId) return false
    setSalvando(true)
    setErro(null)
    const { data, error } = await supabase.rpc('replace_professional_hours', {
      p_professional_id: profId,
      p_hours: buildHoursArray(next),
      p_updated_by_name: isAdmin ? 'Admin' : (prof?.name ?? 'Profissional'),
    })
    setSalvando(false)
    if (error) {
      setErro(error.message || 'Não consegui salvar. Tente de novo.')
      return false
    }
    // A RPC devolve as linhas gravadas: é o banco respondendo, não o estado local
    const linhas = (data ?? []) as WorkingHours[]
    setWorkingHours((prev) => [...prev.filter((w) => w.professional_id !== profId), ...linhas])
    setPainel(null)
    avisar(msg)
    return true
  }

  function ligarDia(dia: number) {
    const cfg = semana[dia]
    if (cfg.active) {
      setPainel({ tipo: 'fecharSemana', dia })
      return
    }
    salvarSemana({ ...semana, [dia]: { ...cfg, active: true } }, `${DAYS[dia].full} aberta · salvo`)
  }

  function preset(dias: number[], msg: string) {
    const next: Schedule = { ...semana }
    for (const d of DAYS) {
      next[d.id] = dias.includes(d.id)
        ? { active: true, slot_duration: COMMERCIAL_SLOT, periods: [{ start_time: COMMERCIAL_START, end_time: COMMERCIAL_LUNCH_START }, { start_time: COMMERCIAL_LUNCH_END, end_time: COMMERCIAL_END }] }
        : { ...semana[d.id], active: false }
    }
    salvarSemana(next, msg)
  }

  const [almoco, setAlmoco] = useState({ ini: '12:00', fim: '13:00' })
  function aplicarAlmoco() {
    if (almoco.fim <= almoco.ini) { setErro('O fim do almoço tem que ser depois do início.'); return }
    const next: Schedule = { ...semana }
    for (const d of DAYS) {
      const c = semana[d.id]
      if (!c.active || c.periods.length === 0) continue
      const abre = c.periods[0].start_time
      const fecha = c.periods[c.periods.length - 1].end_time
      if (!(almoco.ini > abre && almoco.fim < fecha)) continue
      next[d.id] = { ...c, periods: [{ start_time: abre, end_time: almoco.ini }, { start_time: almoco.fim, end_time: fecha }] }
    }
    salvarSemana(next, `Almoço ${horaCurta(almoco.ini)}–${horaCurta(almoco.fim)} nos dias abertos · salvo`)
  }

  // ─── Um dia (working_hours_dates / business_blocks) ─────────────
  async function salvarEspecial(data: string, periodos: Periodo[], slot: number, msg: string) {
    if (!prof) return
    const problema = periodosValidos(periodos)
    if (problema) { setErro(problema); return }
    setSalvando(true)
    setErro(null)
    const del = await supabase.from('working_hours_dates').delete().eq('professional_id', prof.id).eq('date', data)
    if (del.error) { setSalvando(false); setErro(`Não consegui salvar: ${del.error.message}`); return }
    const ins = await supabase.from('working_hours_dates').insert(
      periodos.map((p) => ({ business_id: prof.business_id, professional_id: prof.id, date: data, ...p, slot_duration: slot })),
    )
    if (ins.error) { setSalvando(false); setErro(`Não consegui salvar: ${ins.error.message}`); return }
    // Prova na fonte: relê antes de dizer "salvo"
    const { count } = await supabase.from('working_hours_dates').select('id', { count: 'exact', head: true }).eq('professional_id', prof.id).eq('date', data)
    setSalvando(false)
    if ((count ?? 0) !== periodos.length) { setErro('O horário não ficou salvo. Tente de novo.'); return }
    setPainel(null)
    recarregar()
    avisar(msg)
  }

  async function voltarAoNormal(data: string, msg: string) {
    if (!prof) return
    setSalvando(true)
    setErro(null)
    const del = await supabase.from('working_hours_dates').delete().eq('professional_id', prof.id).eq('date', data)
    const { count } = await supabase.from('working_hours_dates').select('id', { count: 'exact', head: true }).eq('professional_id', prof.id).eq('date', data)
    setSalvando(false)
    if (del.error || (count ?? 0) > 0) { setErro('Não consegui desfazer. Tente de novo.'); return }
    setPainel(null)
    recarregar()
    avisar(msg)
  }

  // Folga: antes de gravar, conta quem já está marcado nesse dia
  const [folgaPendente, setFolgaPendente] = useState<{ data: string; marcados: number } | null>(null)

  async function pedirFolga(data: string) {
    if (!prof) return
    setErro(null)
    const { count } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('professional_id', prof.id)
      .eq('appointment_date', data)
      .not('status', 'in', '(cancelled,no_show)')
    if ((count ?? 0) > 0) { setFolgaPendente({ data, marcados: count ?? 0 }); return }
    darFolga(data)
  }

  async function darFolga(data: string) {
    if (!prof) return
    setSalvando(true)
    setErro(null)
    if (isAdmin) {
      const ins = await supabase.from('business_blocks').insert({
        business_id: prof.business_id,
        block_type: 'specific',
        professional_id: prof.id,
        day_of_week: null,
        block_date: data,
        start_time: '00:00:00',
        end_time: '23:59:00',
        reason: 'Folga',
      })
      if (ins.error) { setSalvando(false); setErro(`Não consegui dar a folga: ${ins.error.message}`); return }
    } else {
      // Profissional grava pela API dela (RLS não deixa inserir direto)
      const res = await fetch('/api/profissional/bloqueio', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ block_type: 'specific', date: data, start_time: '00:00', end_time: '23:59', reason: 'Folga' }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setSalvando(false)
        setErro(d.detail || 'Não consegui dar a folga. Tente de novo.')
        return
      }
    }
    // Folga manda no dia: um horário especial que existisse fica sem sentido
    await supabase.from('working_hours_dates').delete().eq('professional_id', prof.id).eq('date', data)
    const { count } = await supabase
      .from('business_blocks')
      .select('id', { count: 'exact', head: true })
      .eq('professional_id', prof.id)
      .eq('block_type', 'specific')
      .eq('block_date', data)
    setSalvando(false)
    if ((count ?? 0) === 0) { setErro('A folga não ficou salva. Tente de novo.'); return }
    setFolgaPendente(null)
    setPainel(null)
    recarregar()
    avisar(`Folga em ${dataPorExtenso(data).split(',')[1].trim()} · salvo`)
  }

  async function tirarFolga(data: string, blocos: Bloqueio[]) {
    if (!prof || blocos.length === 0) return
    setSalvando(true)
    setErro(null)
    const ids = blocos.map((b) => b.id)
    if (isAdmin) {
      const del = await supabase.from('business_blocks').delete().in('id', ids)
      if (del.error) { setSalvando(false); setErro(`Não consegui tirar a folga: ${del.error.message}`); return }
    } else {
      for (const id of ids) {
        const res = await fetch(`/api/profissional/bloqueio?id=${id}`, { method: 'DELETE' })
        if (!res.ok) { setSalvando(false); setErro('Não consegui tirar a folga. Tente de novo.'); return }
      }
    }
    const { count } = await supabase.from('business_blocks').select('id', { count: 'exact', head: true }).in('id', ids)
    setSalvando(false)
    if ((count ?? 0) > 0) { setErro('A folga continua lá. Tente de novo.'); return }
    setPainel(null)
    recarregar()
    avisar(`${dataPorExtenso(data).split(',')[1].trim()} voltou ao normal · salvo`)
  }

  // ─── Derivados ──────────────────────────────────────────────────
  const status = useCallback(
    (ymd: string) => statusDoDia(ymd, hoje, profId, semana, datas, bloqueios),
    [hoje, profId, semana, datas, bloqueios],
  )
  const costume = useMemo(() => horarioDeCostume(semana), [semana])
  const diasAbertos = DAYS.filter((d) => semana[d.id]?.active).length
  const horasSemana = Math.round(diffHoursPerWeek(semana))

  const celulas = useMemo(() => {
    const [y, m] = mes.split('-').map(Number)
    const total = new Date(y, m, 0).getDate()
    const primeiro = new Date(y, m - 1, 1).getDay()
    const out: ({ ymd: string; dia: number; st: StatusDia } | null)[] = Array(primeiro).fill(null)
    for (let d = 1; d <= total; d++) {
      const ymd = `${mes}-${String(d).padStart(2, '0')}`
      out.push({ ymd, dia: d, st: status(ymd) })
    }
    return out
  }, [mes, status])

  const excecoesDoMes = celulas.filter((c): c is { ymd: string; dia: number; st: StatusDia } => !!c && (c.st.tipo === 'especial' || c.st.tipo === 'folga'))
  const mesMin = hoje.slice(0, 7)
  const mesMax = addDaysBR(hoje, 150).slice(0, 7)
  function andarMes(n: number) {
    const [y, m] = mes.split('-').map(Number)
    const d = new Date(y, m - 1 + n, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (ym < mesMin || ym > mesMax) return
    setMes(ym)
  }

  // ─── Formulário de um dia ───────────────────────────────────────
  const [form, setForm] = useState<FormDia>(formDe(costume.periodos, costume.slot))
  const [editandoDia, setEditandoDia] = useState(false)
  const [novo, setNovo] = useState<{ data: string; modo: 'abrir' | 'folga' }>({ data: '', modo: 'abrir' })

  function abrirDia(ymd: string) {
    if (ymd < hoje) return
    const st = status(ymd)
    const base = st.tipo === 'especial' || st.tipo === 'normal' ? st : { periodos: costume.periodos, slot: costume.slot }
    setForm(formDe(base.periodos, base.slot))
    setEditandoDia(false)
    setFolgaPendente(null)
    setErro(null)
    setPainel({ tipo: 'dia', data: ymd })
  }

  function abrirNovo() {
    setForm(formDe(costume.periodos, costume.slot))
    setNovo({ data: '', modo: 'abrir' })
    setFolgaPendente(null)
    setErro(null)
    setPainel({ tipo: 'novo' })
  }

  function salvarNovo() {
    if (!novo.data || novo.data < hoje) { setErro('Escolha uma data de hoje em diante.'); return }
    if (novo.modo === 'folga') { pedirFolga(novo.data); return }
    salvarEspecial(novo.data, periodosDe(form), form.slot, `${dataPorExtenso(novo.data).split(',')[1].trim()} das ${horaCurta(form.abre)} às ${horaCurta(form.fecha)} · salvo`)
  }

  if (professionals.length === 0) return null

  // ─── Tela ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 pb-8" style={{ color: 'var(--admin-text)' }}>
      {professionals.length > 1 && (
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
          {professionals.map((p) => {
            const on = p.id === profId
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => { setProfId(p.id); setErro(null) }}
                className="shrink-0 min-h-[40px] px-4 rounded-full text-sm font-semibold whitespace-nowrap"
                style={on
                  ? { background: 'var(--admin-accent)', color: '#FFFFFF' }
                  : { background: 'var(--admin-surface)', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}
              >
                {p.name}
              </button>
            )
          })}
        </div>
      )}

      <Segmento
        valor={aba}
        opcoes={[{ id: 'semana', label: 'Semana' }, { id: 'calendario', label: 'Calendário' }]}
        onChange={(v) => { setAba(v); setErro(null) }}
      />

      {erro && !painel && <Aviso texto={erro} tom="erro" />}

      {aba === 'semana' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <span className="text-[13px]" style={{ color: 'var(--admin-text-mute)' }}>Horário fixo · vale toda semana</span>
            <span className="text-[13px] font-semibold" style={{ color: 'var(--admin-text-2)' }}>{diasAbertos} dias · {horasSemana}h</span>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
            {DAYS.map((d, i) => {
              const c = semana[d.id]
              return (
                <div
                  key={d.id}
                  className="flex items-center gap-3.5 px-3.5 py-2 min-h-[60px]"
                  style={{ borderBottom: i < 6 ? '1px solid #EEF2F6' : undefined }}
                >
                  <Switch on={c.active} onClick={() => !salvando && ligarDia(d.id)} label={`${c.active ? 'Fechar' : 'Abrir'} ${d.full.toLowerCase()}`} />
                  <button
                    type="button"
                    onClick={() => { setErro(null); setPainel({ tipo: 'semana', dia: d.id, rascunho: { ...c, periods: c.periods.map((p) => ({ ...p })) } }) }}
                    className="flex-1 min-w-0 flex items-center gap-3 min-h-[44px] text-left"
                  >
                    <span className="w-11 shrink-0 text-[15px] font-bold">{d.label}</span>
                    <span className="flex-1 min-w-0 text-[15px] truncate" style={{ color: c.active ? 'var(--admin-text-2)' : 'var(--admin-text-faded)' }}>
                      {c.active ? resumoPeriodos(c.periods) : 'Fechado'}
                    </span>
                    <Seta />
                  </button>
                </div>
              )
            })}
          </div>

          <BotaoSecundario onClick={() => { setErro(null); setPainel({ tipo: 'ajustes' }) }}>Ajustes rápidos</BotaoSecundario>
          <BotaoSecundario tom="destaque" onClick={abrirNovo}>+ Dia personalizado</BotaoSecundario>
          <p className="text-[13px] leading-relaxed px-1" style={{ color: 'var(--admin-text-mute)' }}>
            Abrir um dia que é fechado, mudar o horário de um dia só ou dar folga. As outras semanas não mudam.
          </p>
        </div>
      )}

      {aba === 'calendario' && (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl px-3 pt-3.5 pb-3" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
            <div className="flex items-center justify-between px-1 pb-2.5">
              <BotaoMes direcao="ant" desabilitado={mes <= mesMin} onClick={() => andarMes(-1)} />
              <span className="text-[17px] font-bold">{nomeDoMes(mes)}</span>
              <BotaoMes direcao="prox" desabilitado={mes >= mesMax} onClick={() => andarMes(1)} />
            </div>
            <div className="grid grid-cols-7 gap-1 pb-1.5">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((l, i) => (
                <span key={i} className="text-center text-xs font-semibold" style={{ color: 'var(--admin-text-mute)' }}>{l}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {celulas.map((c, i) => {
                if (!c) return <span key={`v${i}`} />
                const cor = COR_DIA[c.st.tipo]
                const sub = c.st.tipo === 'especial'
                  ? `${horaCurta(c.st.periodos[0].start_time)}–${horaCurta(c.st.periodos[c.st.periodos.length - 1].end_time)}`
                  : c.st.tipo === 'folga' ? 'Folga' : ''
                return (
                  <button
                    key={c.ymd}
                    type="button"
                    disabled={c.st.tipo === 'passado'}
                    onClick={() => abrirDia(c.ymd)}
                    aria-label={`${dataPorExtenso(c.ymd)}${sub ? ` · ${sub}` : ''}`}
                    className="min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-px text-[15px] font-semibold"
                    style={{ background: cor.bg, color: cor.fg, border: cor.borda === 'transparent' ? 'none' : cor.borda, boxShadow: c.ymd === hoje ? 'inset 0 0 0 2px #0F172A' : undefined }}
                  >
                    <span>{c.dia}</span>
                    <span className="text-[10px] font-bold leading-none" style={{ visibility: sub ? 'visible' : 'hidden' }}>{sub || '·'}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-x-3.5 gap-y-2 px-1 pt-3 text-xs" style={{ color: 'var(--admin-text-2)' }}>
              <Legenda estilo={{ background: '#FFFFFF', border: '1px solid #CBD5E1' }} texto="Aberto" />
              <Legenda estilo={{ border: '1px dashed #CBD5E1' }} texto="Fechado" />
              <Legenda estilo={{ background: 'var(--admin-accent)' }} texto="Horário especial" />
              <Legenda estilo={{ background: '#FECACA' }} texto="Folga" />
            </div>
          </div>

          <BotaoPrincipal onClick={abrirNovo}>+ Dia personalizado</BotaoPrincipal>

          <span className="text-[13px] font-bold px-1 pt-1" style={{ color: 'var(--admin-text-2)' }}>Dias diferentes neste mês</span>
          {excecoesDoMes.length === 0 ? (
            <p className="text-sm px-1" style={{ color: 'var(--admin-text-mute)' }}>Nenhum. Todo dia segue o horário da semana.</p>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
              {excecoesDoMes.map((c, i) => (
                <button
                  key={c.ymd}
                  type="button"
                  onClick={() => abrirDia(c.ymd)}
                  className="w-full flex items-center gap-3 px-3.5 py-3 min-h-[60px] text-left"
                  style={{ borderBottom: i < excecoesDoMes.length - 1 ? '1px solid #EEF2F6' : undefined }}
                >
                  <span className="w-3 h-3 rounded shrink-0" style={{ background: c.st.tipo === 'especial' ? 'var(--admin-accent)' : '#FCA5A5' }} />
                  <span className="flex-1 flex flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">{dataPorExtenso(c.ymd)}</span>
                    <span className="text-[13px]" style={{ color: 'var(--admin-text-mute)' }}>
                      {c.st.tipo === 'especial' ? `Horário especial · ${resumoPeriodos(c.st.periodos)}` : 'Folga · fechado o dia todo'}
                    </span>
                  </span>
                  <Seta />
                </button>
              ))}
            </div>
          )}
          <p className="text-[13px] leading-relaxed px-1" style={{ color: 'var(--admin-text-mute)' }}>
            Toque em qualquer dia pra abrir, mudar o horário ou dar folga só naquele dia.
          </p>
        </div>
      )}

      {/* ─── Painel: um dia da semana ─── */}
      <Sheet open={painel?.tipo === 'semana'} onClose={fecharPainel}>
        {painel?.tipo === 'semana' && (
          <PainelSemana
            dia={painel.dia}
            rascunho={painel.rascunho}
            nome={primeiroNome}
            salvando={salvando}
            erro={erro}
            onChange={(r) => setPainel({ ...painel, rascunho: r })}
            onCancelar={fecharPainel}
            onSalvar={() => {
              const r = painel.rascunho
              if (r.active) {
                const problema = periodosValidos(r.periods)
                if (problema) { setErro(problema); return }
              }
              salvarSemana({ ...semana, [painel.dia]: r }, `${DAYS[painel.dia].full} salva`)
            }}
            onCopiarParaAbertos={() => {
              const r = painel.rascunho
              const problema = periodosValidos(r.periods)
              if (problema) { setErro(problema); return }
              const next: Schedule = { ...semana }
              for (const d of DAYS) {
                if (d.id === painel.dia || semana[d.id].active) next[d.id] = { ...r, active: true, periods: r.periods.map((p) => ({ start_time: p.start_time, end_time: p.end_time })) }
              }
              salvarSemana(next, 'Mesmo horário em todos os dias abertos · salvo')
            }}
          />
        )}
      </Sheet>

      {/* ─── Painel: confirmar fechar um dia da semana ─── */}
      <Sheet open={painel?.tipo === 'fecharSemana'} onClose={fecharPainel}>
        {painel?.tipo === 'fecharSemana' && (
          <>
            <Titulo titulo={`Fechar toda ${DAYS[painel.dia].full.toLowerCase()}?`} sub={`Some do link de agendamento de ${primeiroNome}. Quem já marcou continua marcado.`} />
            {erro && <Aviso texto={erro} tom="erro" />}
            <div className="grid grid-cols-2 gap-2.5">
              <BotaoSecundario onClick={fecharPainel} disabled={salvando}>Voltar</BotaoSecundario>
              <BotaoPrincipal
                disabled={salvando}
                onClick={() => salvarSemana({ ...semana, [painel.dia]: { ...semana[painel.dia], active: false } }, `${DAYS[painel.dia].full} fechada · salvo`)}
              >
                {salvando ? 'Salvando…' : 'Fechar'}
              </BotaoPrincipal>
            </div>
          </>
        )}
      </Sheet>

      {/* ─── Painel: uma data do calendário ─── */}
      <Sheet open={painel?.tipo === 'dia'} onClose={fecharPainel}>
        {painel?.tipo === 'dia' && (() => {
          const ymd = painel.data
          const st = status(ymd)
          const nomeSemana = DAYS[diaDaSemana(ymd)].full.toLowerCase()
          const diaNum = Number(ymd.slice(8, 10))
          const semanaAberta = semana[diaDaSemana(ymd)].active
          return (
            <>
              <Titulo titulo={dataPorExtenso(ymd)} sub={prof?.name ?? ''} />
              <Etiqueta st={st} nomeSemana={nomeSemana} />
              {st.parciais.length > 0 && (
                <Aviso tom="info" texto={`Bloqueio nesse dia: ${st.parciais.map((b) => `${horaCurta(b.start_time)}–${horaCurta(b.end_time)}${b.reason ? ` (${b.reason})` : ''}`).join(', ')}. Muda em Bloqueios.`} />
              )}
              {erro && <Aviso texto={erro} tom="erro" />}

              {folgaPendente?.data === ymd ? (
                <ConfirmaFolga
                  nome={primeiroNome}
                  marcados={folgaPendente.marcados}
                  salvando={salvando}
                  onVoltar={() => setFolgaPendente(null)}
                  onConfirmar={() => darFolga(ymd)}
                />
              ) : editandoDia ? (
                <>
                  <EditorDia form={form} onChange={setForm} />
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
                    Só o dia {diaNum} muda. As outras {nomeSemana}s continuam iguais.
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <BotaoSecundario onClick={() => { setEditandoDia(false); setErro(null) }} disabled={salvando}>Cancelar</BotaoSecundario>
                    <BotaoPrincipal
                      disabled={salvando}
                      onClick={() => salvarEspecial(ymd, periodosDe(form), form.slot, `Dia ${diaNum} das ${horaCurta(form.abre)} às ${horaCurta(form.fecha)} · salvo`)}
                    >
                      {salvando ? 'Salvando…' : 'Salvar este dia'}
                    </BotaoPrincipal>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {st.tipo === 'fechado' && (
                    <>
                      <BotaoPrincipal
                        disabled={salvando}
                        onClick={() => salvarEspecial(ymd, costume.periodos, costume.slot, `Dia ${diaNum} aberto · ${resumoPeriodos(costume.periodos)}`)}
                      >
                        {salvando ? 'Abrindo…' : `Abrir este dia · ${resumoPeriodos(costume.periodos)}`}
                      </BotaoPrincipal>
                      <BotaoSecundario onClick={() => setEditandoDia(true)} disabled={salvando}>Abrir com outro horário</BotaoSecundario>
                    </>
                  )}
                  {(st.tipo === 'normal' || st.tipo === 'especial') && (
                    <BotaoPrincipal onClick={() => setEditandoDia(true)} disabled={salvando}>
                      {st.tipo === 'especial' ? 'Editar o horário deste dia' : 'Mudar o horário só deste dia'}
                    </BotaoPrincipal>
                  )}
                  {(st.tipo === 'normal' || st.tipo === 'especial') && (
                    <BotaoSecundario tom="perigo" onClick={() => pedirFolga(ymd)} disabled={salvando}>Dar folga neste dia</BotaoSecundario>
                  )}
                  {st.tipo === 'especial' && (
                    <BotaoSecundario
                      onClick={() => voltarAoNormal(ymd, `Dia ${diaNum} voltou ao horário da semana · salvo`)}
                      disabled={salvando}
                    >
                      {semanaAberta ? 'Voltar ao horário da semana' : 'Voltar a ficar fechado'}
                    </BotaoSecundario>
                  )}
                  {st.tipo === 'folga' && st.folgaRemovivel.length > 0 && !st.folgaDeFora && (
                    <BotaoPrincipal onClick={() => tirarFolga(ymd, st.folgaRemovivel)} disabled={salvando}>
                      {salvando ? 'Salvando…' : 'Tirar a folga'}
                    </BotaoPrincipal>
                  )}
                  {st.tipo === 'folga' && st.folgaDeFora && (
                    <Aviso
                      tom="info"
                      texto={st.folgaDeFora.professional_id === null
                        ? 'Esse dia está fechado pra todo o salão. Pra reabrir, mude em Bloqueios.'
                        : `Esse dia está fechado por uma folga de toda ${nomeSemana}. Pra mudar, use Bloqueios.`}
                    />
                  )}
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
                    {st.tipo === 'fechado' && `Abre só o dia ${diaNum}. As outras ${nomeSemana}s continuam fechadas.`}
                    {st.tipo === 'normal' && `Qualquer mudança vale só pro dia ${diaNum}. As outras ${nomeSemana}s continuam iguais.`}
                    {st.tipo === 'especial' && 'Esse dia já está com horário diferente da semana.'}
                    {st.tipo === 'folga' && 'Ninguém consegue agendar nesse dia.'}
                  </p>
                </div>
              )}
            </>
          )
        })()}
      </Sheet>

      {/* ─── Painel: + Dia personalizado ─── */}
      <Sheet open={painel?.tipo === 'novo'} onClose={fecharPainel}>
        {painel?.tipo === 'novo' && (
          <>
            <Titulo titulo="Dia personalizado" sub="Vale só pra data escolhida. A semana não muda." />
            <label className="flex flex-col gap-1.5 text-xs font-bold tracking-wide" style={{ color: 'var(--admin-text-mute)' }}>
              DATA
              {/* iPhone mostra o campo de data vazio como uma caixa em branco:
                  o texto por cima diz o que fazer até escolher */}
              <span className="relative block">
                <input
                  type="date"
                  min={hoje}
                  max={ate}
                  value={novo.data}
                  onChange={(e) => { setNovo({ ...novo, data: e.target.value }); setFolgaPendente(null) }}
                  className="w-full min-w-0 h-[52px] rounded-xl px-3.5 text-[17px] font-semibold"
                  style={{ WebkitAppearance: 'none', appearance: 'none', boxSizing: 'border-box', background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
                />
                {!novo.data && (
                  <span
                    className="absolute inset-y-0 left-3.5 right-3.5 flex items-center justify-between pointer-events-none text-[17px] font-semibold tracking-normal"
                    style={{ color: 'var(--admin-text-faded)', background: 'var(--admin-input-bg)' }}
                  >
                    Toque pra escolher o dia
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                  </span>
                )}
              </span>
            </label>
            {professionals.length > 1 && (
              <>
                <span className="text-xs font-bold tracking-wide" style={{ color: 'var(--admin-text-mute)' }}>QUEM</span>
                <div className="flex gap-2 overflow-x-auto -mx-4 px-4 -mt-1.5" style={{ scrollbarWidth: 'none' }}>
                  {professionals.map((p) => {
                    const on = p.id === profId
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setProfId(p.id); setFolgaPendente(null) }}
                        className="shrink-0 min-h-[40px] px-4 rounded-full text-sm font-semibold whitespace-nowrap"
                        style={on ? { background: 'var(--admin-accent)', color: '#FFFFFF' } : { background: 'var(--admin-surface)', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}
                      >
                        {p.name}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
            <Segmento
              valor={novo.modo}
              opcoes={[{ id: 'abrir', label: 'Atender' }, { id: 'folga', label: 'Folga' }]}
              onChange={(v) => { setNovo({ ...novo, modo: v }); setFolgaPendente(null); setErro(null) }}
            />
            {novo.modo === 'abrir' && <EditorDia form={form} onChange={setForm} />}
            {erro && <Aviso texto={erro} tom="erro" />}
            {folgaPendente && folgaPendente.data === novo.data ? (
              <ConfirmaFolga
                nome={primeiroNome}
                marcados={folgaPendente.marcados}
                salvando={salvando}
                onVoltar={() => setFolgaPendente(null)}
                onConfirmar={() => darFolga(novo.data)}
              />
            ) : (
              <>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
                  {!novo.data
                    ? 'Escolha a data.'
                    : novo.modo === 'folga'
                      ? `Ninguém agenda com ${primeiroNome} em ${dataPorExtenso(novo.data).toLowerCase()}.`
                      : `Só ${dataPorExtenso(novo.data).toLowerCase()} fica com esse horário. As outras ${DAYS[diaDaSemana(novo.data)].full.toLowerCase()}s não mudam.`}
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <BotaoSecundario onClick={fecharPainel} disabled={salvando}>Cancelar</BotaoSecundario>
                  <BotaoPrincipal onClick={salvarNovo} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</BotaoPrincipal>
                </div>
              </>
            )}
          </>
        )}
      </Sheet>

      {/* ─── Painel: ajustes rápidos ─── */}
      <Sheet open={painel?.tipo === 'ajustes'} onClose={fecharPainel}>
        {painel?.tipo === 'ajustes' && (
          <>
            <Titulo titulo="Ajustes rápidos" sub={`Muda a semana inteira de ${primeiroNome} de uma vez.`} />
            {erro && <Aviso texto={erro} tom="erro" />}
            <BotaoSecundario onClick={() => preset(COMMERCIAL_DAYS, 'Seg a Sex, 8h às 18h · salvo')} disabled={salvando}>Seg a Sex, das 8h às 18h</BotaoSecundario>
            <BotaoSecundario onClick={() => preset(COMMERCIAL_PLUS_SAT_DAYS, 'Seg a Sáb, 8h às 18h · salvo')} disabled={salvando}>Seg a Sáb, das 8h às 18h</BotaoSecundario>
            <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl" style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}>
              <span className="text-[15px] font-semibold">Pausa de almoço nos dias abertos</span>
              <div className="grid grid-cols-2 gap-2.5">
                <CampoHora label="INÍCIO" value={almoco.ini} onChange={(v) => setAlmoco({ ...almoco, ini: v })} />
                <CampoHora label="FIM" value={almoco.fim} onChange={(v) => setAlmoco({ ...almoco, fim: v })} />
              </div>
              <BotaoPrincipal onClick={aplicarAlmoco} disabled={salvando}>Aplicar o almoço</BotaoPrincipal>
            </div>
            <button
              type="button"
              onClick={() => preset([], 'Todos os dias fechados · salvo')}
              disabled={salvando}
              className="min-h-[48px] text-[15px] font-semibold"
              style={{ color: '#B91C1C' }}
            >
              Fechar todos os dias
            </button>
          </>
        )}
      </Sheet>

      <Toast texto={toast} />
    </div>
  )
}

// ─── Pedaços ──────────────────────────────────────────────────────

function Seta() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function BotaoMes({ direcao, desabilitado, onClick }: { direcao: 'ant' | 'prox'; desabilitado: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={direcao === 'ant' ? 'Mês anterior' : 'Próximo mês'}
      disabled={desabilitado}
      onClick={onClick}
      className="w-10 h-10 rounded-full flex items-center justify-center"
      style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-surface)', color: desabilitado ? '#CBD5E1' : 'var(--admin-text-2)' }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={direcao === 'ant' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
      </svg>
    </button>
  )
}

function Legenda({ estilo, texto }: { estilo: CSSProperties; texto: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-3.5 h-3.5 rounded" style={estilo} />
      {texto}
    </span>
  )
}

function Titulo({ titulo, sub }: { titulo: string; sub: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xl font-extrabold">{titulo}</span>
      {sub && <span className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>{sub}</span>}
    </div>
  )
}

function Etiqueta({ st, nomeSemana }: { st: StatusDia; nomeSemana: string }) {
  const base = 'self-start px-3 py-2 rounded-[10px] text-sm font-semibold'
  if (st.tipo === 'normal') return <span className={base} style={{ background: '#F1F5F9', color: '#334155' }}>Horário da semana · {resumoPeriodos(st.periodos)}</span>
  if (st.tipo === 'fechado') return <span className={base} style={{ background: '#F1F5F9', color: '#64748B' }}>Fechado · {nomeSemana} é dia de folga</span>
  if (st.tipo === 'especial') return <span className={base} style={{ background: 'var(--admin-accent)', color: '#FFFFFF' }}>Horário especial · {resumoPeriodos(st.periodos)}</span>
  if (st.tipo === 'folga') return <span className={base} style={{ background: '#FECACA', color: '#7F1D1D' }}>Folga · fechado o dia todo</span>
  return null
}

function ConfirmaFolga({ nome, marcados, salvando, onVoltar, onConfirmar }: { nome: string; marcados: number; salvando: boolean; onVoltar: () => void; onConfirmar: () => void }) {
  return (
    <>
      <Aviso
        tom="info"
        texto={`${nome} tem ${marcados} ${marcados === 1 ? 'atendimento marcado' : 'atendimentos marcados'} nesse dia. A folga não desmarca ninguém: avise ${marcados === 1 ? 'a cliente' : 'as clientes'} ou remarque antes.`}
      />
      <div className="grid grid-cols-2 gap-2.5">
        <BotaoSecundario onClick={onVoltar} disabled={salvando}>Voltar</BotaoSecundario>
        <BotaoPrincipal onClick={onConfirmar} disabled={salvando}>{salvando ? 'Salvando…' : 'Dar folga mesmo assim'}</BotaoPrincipal>
      </div>
    </>
  )
}

function EditorDia({ form, onChange }: { form: FormDia; onChange: (f: FormDia) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2.5">
        <CampoHora label="ABRE" value={form.abre} onChange={(v) => onChange({ ...form, abre: v })} />
        <CampoHora label="FECHA" value={form.fecha} onChange={(v) => onChange({ ...form, fecha: v })} />
      </div>
      {form.comPausa ? (
        <div className="flex flex-col gap-2 p-3 rounded-2xl" style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wide" style={{ color: 'var(--admin-text-mute)' }}>PAUSA NO MEIO</span>
            <button type="button" onClick={() => onChange({ ...form, comPausa: false })} className="min-h-[32px] px-1 text-[13px] font-semibold" style={{ color: '#B91C1C' }}>Tirar</button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <CampoHora label="DE" value={form.pausaIni} onChange={(v) => onChange({ ...form, pausaIni: v })} />
            <CampoHora label="ATÉ" value={form.pausaFim} onChange={(v) => onChange({ ...form, pausaFim: v })} />
          </div>
        </div>
      ) : (
        <BotaoSecundario tom="destaque" onClick={() => onChange({ ...form, comPausa: true })}>+ Pausa no meio (almoço)</BotaoSecundario>
      )}
      <Intervalo valor={form.slot} onChange={(v) => onChange({ ...form, slot: v })} />
    </div>
  )
}

function Intervalo({ valor, onChange }: { valor: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-[15px]" style={{ color: 'var(--admin-text-2)' }}>
      Um horário a cada
      <select
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 rounded-xl px-3 text-[15px]"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
      >
        {DURATIONS.map((d) => <option key={d} value={d}>{formatDuration(d)}</option>)}
      </select>
    </label>
  )
}

function PainelSemana({
  dia, rascunho, nome, salvando, erro, onChange, onCancelar, onSalvar, onCopiarParaAbertos,
}: {
  dia: number
  rascunho: DayConfig
  nome: string
  salvando: boolean
  erro: string | null
  onChange: (r: DayConfig) => void
  onCancelar: () => void
  onSalvar: () => void
  onCopiarParaAbertos: () => void
}) {
  const nomeDia = DAYS[dia].full
  const rotulo = (i: number) => (rascunho.periods.length === 1 ? 'HORÁRIO' : i === 0 ? 'MANHÃ' : i === 1 ? 'TARDE' : `PERÍODO ${i + 1}`)
  const mudarPeriodo = (i: number, campo: 'start_time' | 'end_time', v: string) =>
    onChange({ ...rascunho, periods: rascunho.periods.map((p, j) => (j === i ? { ...p, [campo]: v } : p)) })
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Titulo titulo={nomeDia} sub={`Toda ${nomeDia.toLowerCase()} · ${nome}`} />
        <Switch on={rascunho.active} onClick={() => onChange({ ...rascunho, active: !rascunho.active })} label="Atende neste dia" />
      </div>
      {rascunho.active ? (
        <div className="flex flex-col gap-2.5">
          {rascunho.periods.map((p, i) => (
            <div key={i} className="flex flex-col gap-2 p-3 rounded-2xl" style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wide" style={{ color: 'var(--admin-text-mute)' }}>{rotulo(i)}</span>
                {rascunho.periods.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...rascunho, periods: rascunho.periods.filter((_, j) => j !== i) })}
                    className="min-h-[32px] px-1 text-[13px] font-semibold"
                    style={{ color: '#B91C1C' }}
                  >
                    Tirar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <CampoHora label="ABRE" value={p.start_time} onChange={(v) => mudarPeriodo(i, 'start_time', v)} />
                <CampoHora label="FECHA" value={p.end_time} onChange={(v) => mudarPeriodo(i, 'end_time', v)} />
              </div>
            </div>
          ))}
          <BotaoSecundario tom="destaque" onClick={() => onChange({ ...rascunho, periods: suggestNewPeriodFromExisting(rascunho.periods) })}>
            + Pausa no meio (almoço)
          </BotaoSecundario>
          <Intervalo valor={rascunho.slot_duration} onChange={(v) => onChange({ ...rascunho, slot_duration: v })} />
          <BotaoSecundario onClick={onCopiarParaAbertos} disabled={salvando}>Usar este horário em todos os dias abertos</BotaoSecundario>
        </div>
      ) : (
        <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
          Fechado toda {nomeDia.toLowerCase()}. Pra abrir só uma {nomeDia.toLowerCase()} específica, use o Calendário.
        </p>
      )}
      {erro && <Aviso texto={erro} tom="erro" />}
      <div className="grid grid-cols-2 gap-2.5">
        <BotaoSecundario onClick={onCancelar} disabled={salvando}>Cancelar</BotaoSecundario>
        <BotaoPrincipal onClick={onSalvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</BotaoPrincipal>
      </div>
    </>
  )
}
