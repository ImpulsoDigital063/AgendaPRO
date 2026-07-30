'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconPlus, IconTrash, IconClock } from '@/components/ui/Icon'
import { formatDateBR } from '@/lib/date-br'

type Bloco = {
  id: string
  block_type: string
  block_date: string | null
  day_of_week: number | null
  start_time: string
  end_time: string
  reason: string | null
  active: boolean
}

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

/**
 * Bloqueios da própria profissional (30/07/2026).
 *
 * Espelha a aba que a dona tem em Configurações → Bloqueios, mas escopada nela.
 * Escrita via /api/profissional/bloqueio — a policy da v53 só deixa o dono
 * gravar direto em business_blocks, então o servidor confere e grava.
 */
export default function BloqueiosProfView({ blocos, hoje }: { blocos: Bloco[]; hoje: string }) {
  const router = useRouter()
  const [criando, setCriando] = useState(false)
  const [data, setData] = useState(hoje)
  const [inicio, setInicio] = useState('12:00')
  const [dur, setDur] = useState(60)
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [removendo, setRemovendo] = useState<string | null>(null)

  function fim(): string {
    const [h, m] = inicio.split(':').map(Number)
    const t = h * 60 + m + dur
    return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
  }

  async function salvar() {
    setSalvando(true)
    setErro(null)
    const res = await fetch('/api/profissional/bloqueio', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date: data, start_time: inicio, end_time: fim(), reason: motivo }),
    })
    setSalvando(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setErro(d.detail || 'Não consegui bloquear. Tenta de novo.')
      return
    }
    setCriando(false)
    setMotivo('')
    router.refresh()
  }

  async function remover(id: string) {
    setRemovendo(id)
    const res = await fetch(`/api/profissional/bloqueio?id=${id}`, { method: 'DELETE' })
    setRemovendo(null)
    if (res.ok) router.refresh()
  }

  return (
    <div className="space-y-4">
      {!criando ? (
        <button
          type="button"
          onClick={() => { setCriando(true); setErro(null) }}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold"
          style={{
            background: 'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
            color: '#fff',
          }}
        >
          <IconPlus size={16} /> Bloquear um horário
        </button>
      ) : (
        <div className="admin-card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Dia</span>
              <input
                type="date"
                value={data}
                min={hoje}
                onChange={(e) => setData(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 rounded-xl text-sm"
                style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Começa</span>
              <input
                type="time"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 rounded-xl text-sm"
                style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
              />
            </label>
          </div>

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Duração</span>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {[30, 60, 120, 240].map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setDur(min)}
                  className="py-2.5 rounded-xl text-sm font-bold"
                  style={
                    dur === min
                      ? { background: 'var(--admin-accent)', color: '#fff' }
                      : { background: 'var(--admin-input-bg)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)' }
                  }
                >
                  {min < 60 ? `${min}min` : `${min / 60}h`}
                </button>
              ))}
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-faded)' }}>
              Fica bloqueado das {inicio} às {fim()}
            </p>
          </div>

          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo (opcional) · almoço, médico…"
            maxLength={80}
            className="w-full px-3 py-2.5 rounded-xl text-sm"
            style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
          />

          {erro && <p className="text-xs" style={{ color: 'var(--admin-danger, #DC2626)' }}>{erro}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCriando(false)}
              className="flex-1 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text)' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ background: 'linear-gradient(180deg, #64748B 0%, #475569 100%)', color: '#fff' }}
            >
              {salvando ? 'Salvando…' : 'Bloquear'}
            </button>
          </div>
        </div>
      )}

      {blocos.length === 0 ? (
        <div className="admin-card p-8 text-center">
          <div
            className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}
          >
            <IconClock size={26} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--admin-text-2)' }}>
            Nenhum bloqueio ativo
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-faded)' }}>
            Sua agenda está livre nos horários de atendimento
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {blocos.map((b) => (
            <div key={b.id} className="admin-card p-3.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                  {b.block_type === 'recurring'
                    ? `Toda ${DIAS[b.day_of_week ?? 0]}`
                    : formatDateBR(b.block_date)}
                  {' · '}
                  {String(b.start_time).slice(0, 5)} às {String(b.end_time).slice(0, 5)}
                </p>
                <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                  {b.reason || 'Indisponível'}
                  {b.block_type === 'recurring' && ' · criado pela administração'}
                </p>
              </div>
              {/* Recorrente é da dona (folga fixa, horário do salão) — ela não remove */}
              {b.block_type !== 'recurring' && (
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
