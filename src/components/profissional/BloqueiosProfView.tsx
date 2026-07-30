'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  IconPlus, IconTrash, IconClock, IconClose, IconCalendar, IconSun, IconCheck,
} from '@/components/ui/Icon'
import { formatDateBR, addDaysBR } from '@/lib/date-br'

type Bloco = {
  id: string
  block_type: string
  block_date: string | null
  day_of_week: number | null
  start_time: string
  end_time: string
  reason: string | null
  professional_id: string | null
  active: boolean
}

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const DIAS_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

type Form = {
  block_type: 'recurring' | 'specific'
  day_of_week: number
  block_date: string
  start_time: string
  end_time: string
  reason: string
}

/**
 * Bloqueios da própria profissional · mesmo padrão da aba da dona
 * (BloqueiosTab): presets rápidos, recorrente × data específica e badges
 * relativas. Eduardo 30/07: "não veio completa igual o padrão AgendaPRO".
 *
 * O que muda em relação à da dona, de propósito:
 *   · não tem preset "Feriado" — feriado bloqueia o salão inteiro, é da dona
 *   · não escolhe profissional: é sempre ela (o servidor ignora qualquer
 *     tentativa de mandar outra pessoa)
 *   · bloqueio do salão (sem dono) aparece na lista como informação, sem apagar
 */
export default function BloqueiosProfView({
  blocos,
  hoje,
  meuProfId,
}: {
  blocos: Bloco[]
  hoje: string
  meuProfId: string
}) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [form, setForm] = useState<Form>({
    block_type: 'specific',
    day_of_week: 1,
    block_date: hoje,
    start_time: '12:00',
    end_time: '13:00',
    reason: '',
  })
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [removendo, setRemovendo] = useState<string | null>(null)

  const PRESETS = [
    {
      label: 'Almoço',
      Icon: IconClock,
      color: '#F59E0B',
      desc: 'Toda semana · 12h-13h',
      apply: (): Partial<Form> => ({
        block_type: 'recurring', day_of_week: 1,
        start_time: '12:00', end_time: '13:00', reason: 'Intervalo de almoço',
      }),
    },
    {
      label: 'Folga semanal',
      Icon: IconClose,
      color: '#EF4444',
      desc: 'Um dia da semana inteiro',
      apply: (): Partial<Form> => ({
        block_type: 'recurring', day_of_week: 0,
        start_time: '00:00', end_time: '23:59', reason: 'Folga semanal',
      }),
    },
    {
      label: 'Dia inteiro',
      Icon: IconCalendar,
      color: '#A855F7',
      desc: 'Uma data · 00h-24h',
      apply: (): Partial<Form> => ({
        block_type: 'specific', block_date: hoje,
        start_time: '00:00', end_time: '23:59', reason: '',
      }),
    },
    {
      label: 'Férias',
      Icon: IconSun,
      color: '#10B981',
      desc: 'Começa amanhã · repita por dia',
      apply: (): Partial<Form> => ({
        block_type: 'specific', block_date: addDaysBR(hoje, 1),
        start_time: '00:00', end_time: '23:59', reason: 'Férias',
      }),
    },
  ]

  function aplicarPreset(p: (typeof PRESETS)[number]) {
    setForm((f) => ({ ...f, ...p.apply() }))
    setAberto(true)
    setErro(null)
  }

  async function salvar() {
    setSalvando(true)
    setErro(null)
    const res = await fetch('/api/profissional/bloqueio', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        block_type: form.block_type,
        date: form.block_date,
        day_of_week: form.day_of_week,
        start_time: form.start_time,
        end_time: form.end_time,
        reason: form.reason,
      }),
    })
    setSalvando(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setErro(d.detail || 'Não consegui bloquear. Tenta de novo.')
      return
    }
    setAberto(false)
    setForm((f) => ({ ...f, reason: '' }))
    router.refresh()
  }

  async function remover(id: string) {
    setRemovendo(id)
    const res = await fetch(`/api/profissional/bloqueio?id=${id}`, { method: 'DELETE' })
    setRemovendo(null)
    if (res.ok) router.refresh()
  }

  function badge(b: Bloco): { txt: string; cor: string; bg: string } | null {
    if (b.block_type === 'recurring') {
      return { txt: 'TODA SEMANA', cor: 'var(--admin-accent)', bg: 'var(--admin-accent-bg)' }
    }
    if (!b.block_date) return null
    const dias = Math.round(
      (new Date(b.block_date + 'T12:00:00Z').getTime() - new Date(hoje + 'T12:00:00Z').getTime()) / 86_400_000,
    )
    if (dias === 0) return { txt: 'HOJE', cor: '#D97706', bg: 'rgba(245,158,11,0.18)' }
    if (dias === 1) return { txt: 'AMANHÃ', cor: '#059669', bg: 'rgba(16,185,129,0.16)' }
    if (dias > 1) return { txt: `EM ${dias} DIAS`, cor: 'var(--admin-text-mute)', bg: 'var(--admin-surface-hi)' }
    return null
  }

  const meus = blocos.filter((b) => b.professional_id === meuProfId)
  const doSalao = blocos.filter((b) => b.professional_id !== meuProfId)

  return (
    <div className="space-y-5">
      {/* Presets · 1 toque pré-preenche */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--admin-text-faded)' }}>
          Atalhos
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => aplicarPreset(p)}
              className="admin-card p-3 text-left flex items-center gap-2.5"
            >
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${p.color}22`, color: p.color }}
              >
                <p.Icon size={16} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold truncate" style={{ color: 'var(--admin-text)' }}>{p.label}</span>
                <span className="block text-[10px] truncate" style={{ color: 'var(--admin-text-mute)' }}>{p.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {!aberto ? (
        <button
          type="button"
          onClick={() => { setAberto(true); setErro(null) }}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold"
          style={{
            background: 'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
            color: '#fff',
          }}
        >
          <IconPlus size={16} /> Novo bloqueio
        </button>
      ) : (
        <div className="admin-card p-4 space-y-3">
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-2">
            {(['specific', 'recurring'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm((f) => ({ ...f, block_type: t }))}
                className="py-2.5 rounded-xl text-sm font-bold"
                style={
                  form.block_type === t
                    ? { background: 'var(--admin-accent)', color: '#fff' }
                    : { background: 'var(--admin-input-bg)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)' }
                }
              >
                {t === 'specific' ? 'Uma data' : 'Toda semana'}
              </button>
            ))}
          </div>

          {form.block_type === 'specific' ? (
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Dia</span>
              <input
                type="date"
                value={form.block_date}
                min={hoje}
                onChange={(e) => setForm((f) => ({ ...f, block_date: e.target.value }))}
                className="w-full mt-1 px-3 py-2.5 rounded-xl text-sm"
                style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
              />
            </label>
          ) : (
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Dia da semana</span>
              <div className="grid grid-cols-7 gap-1 mt-1">
                {DIAS_CURTO.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, day_of_week: i }))}
                    className="py-2 rounded-lg text-[11px] font-bold"
                    style={
                      form.day_of_week === i
                        ? { background: 'var(--admin-accent)', color: '#fff' }
                        : { background: 'var(--admin-input-bg)', color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }
                    }
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Começa</span>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                className="w-full mt-1 px-3 py-2.5 rounded-xl text-sm"
                style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Termina</span>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                className="w-full mt-1 px-3 py-2.5 rounded-xl text-sm"
                style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
              />
            </label>
          </div>

          <input
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            placeholder="Motivo (opcional) · almoço, médico…"
            maxLength={80}
            className="w-full px-3 py-2.5 rounded-xl text-sm"
            style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
          />

          {erro && <p className="text-xs" style={{ color: 'var(--admin-danger, #DC2626)' }}>{erro}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="flex-1 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text)' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="flex-1 py-3 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(180deg, #64748B 0%, #475569 100%)', color: '#fff' }}
            >
              <IconCheck size={15} /> {salvando ? 'Salvando…' : 'Bloquear'}
            </button>
          </div>
        </div>
      )}

      {/* Meus bloqueios */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--admin-text-faded)' }}>
          Meus bloqueios
        </p>
        {meus.length === 0 ? (
          <div className="admin-card p-8 text-center">
            <div
              className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}
            >
              <IconClock size={26} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--admin-text-2)' }}>Nenhum bloqueio ativo</p>
            <p className="text-xs mt-1" style={{ color: 'var(--admin-text-faded)' }}>
              Sua agenda está livre nos horários de atendimento
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {meus.map((b) => {
              const bg = badge(b)
              return (
                <div key={b.id} className="admin-card p-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                        {b.block_type === 'recurring'
                          ? `Toda ${DIAS[b.day_of_week ?? 0].toLowerCase()}`
                          : formatDateBR(b.block_date)}
                      </p>
                      {bg && (
                        <span
                          className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: bg.bg, color: bg.cor }}
                        >
                          {bg.txt}
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                      {String(b.start_time).slice(0, 5)} às {String(b.end_time).slice(0, 5)} · {b.reason || 'Indisponível'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remover(b.id)}
                    disabled={removendo === b.id}
                    aria-label="Remover bloqueio"
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                    style={{ background: 'rgba(220,38,38,0.10)', color: '#DC2626' }}
                  >
                    <IconTrash size={15} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Do salão · informação, ela não mexe */}
      {doSalao.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--admin-text-faded)' }}>
            Do salão
          </p>
          <div className="space-y-2">
            {doSalao.map((b) => (
              <div key={b.id} className="admin-card p-3.5 opacity-80">
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-text-2)' }}>
                  {b.block_type === 'recurring'
                    ? `Toda ${DIAS[b.day_of_week ?? 0].toLowerCase()}`
                    : formatDateBR(b.block_date)}
                  {' · '}
                  {String(b.start_time).slice(0, 5)} às {String(b.end_time).slice(0, 5)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>
                  {b.reason || 'Indisponível'} · definido pela administração
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
