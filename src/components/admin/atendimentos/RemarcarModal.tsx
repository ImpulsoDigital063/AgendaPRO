'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { IconCalendar, IconCheck } from '@/components/ui/Icon'
import { addDaysBR, formatDateBR } from '@/lib/date-br'

type Props = {
  open: boolean
  appointmentId: string
  clientName: string
  dataAtual: string   // YYYY-MM-DD
  horaAtual: string   // HH:MM
  onClose: () => void
  onDone?: () => void
}

/**
 * Remarcar atendimento (30/07/2026).
 *
 * Até hoje o produto não tinha isso — nem pra dona. Mudar horário era cancelar
 * e criar de novo, o que apagava histórico, matava a comanda e fazia o
 * atendimento sumir da agenda como desistência.
 *
 * A tela é curta de propósito: o que muda é QUANDO. Serviço, profissional,
 * cliente e duração seguem iguais — o servidor recalcula o fim mantendo a
 * duração original.
 */
export default function RemarcarModal({
  open, appointmentId, clientName, dataAtual, horaAtual, onClose, onDone,
}: Props) {
  const router = useRouter()
  const [portalReady, setPortalReady] = useState(false)
  const [data, setData] = useState(dataAtual)
  const [hora, setHora] = useState(horaAtual)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { setPortalReady(true) }, [])

  useEffect(() => {
    if (!open) return
    setData(dataAtual)
    setHora(horaAtual)
    setErro(null)
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, dataAtual, horaAtual, onClose])

  if (!open || !portalReady) return null

  async function salvar() {
    setSalvando(true)
    setErro(null)
    const res = await fetch(`/api/admin/appointments/${appointmentId}/remarcar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date: data, start_time: hora }),
    })
    setSalvando(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setErro(d.detail || 'Não consegui remarcar. Tenta de novo.')
      return
    }
    if (onDone) onDone()
    else router.refresh()
  }

  const mudou = data !== dataAtual || hora !== horaAtual

  return createPortal(
    <div
      className="fixed inset-0 z-[340] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 space-y-4"
        style={{
          background: 'var(--admin-popover-bg, #fff)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
            Remarcar
          </p>
          <p className="text-lg font-bold" style={{ color: 'var(--admin-text)' }}>{clientName}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
            Hoje está em {formatDateBR(dataAtual)} às {horaAtual}
          </p>
        </div>

        {/* Atalhos de dia · o caso mais comum é empurrar 1 dia ou 1 semana */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Amanhã', v: addDaysBR(dataAtual, 1) },
            { label: 'Em 2 dias', v: addDaysBR(dataAtual, 2) },
            { label: 'Semana que vem', v: addDaysBR(dataAtual, 7) },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => setData(o.v)}
              className="py-2.5 rounded-xl text-[11px] font-bold leading-tight"
              style={
                data === o.v
                  ? { background: 'var(--admin-accent)', color: '#fff' }
                  : { background: 'var(--admin-input-bg)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)' }
              }
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Novo dia</span>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 rounded-xl text-sm"
              style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Novo horário</span>
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 rounded-xl text-sm"
              style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
            />
          </label>
        </div>

        <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
          A duração e o serviço continuam os mesmos. Depois de remarcar, avise a
          cliente pelo WhatsApp.
        </p>

        {erro && <p className="text-xs" style={{ color: 'var(--admin-danger, #DC2626)' }}>{erro}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={salvando || !mudou}
            className="flex-1 py-3 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              background: 'linear-gradient(180deg, var(--brand-primary, #3B82F6) 0%, color-mix(in srgb, var(--brand-primary, #3B82F6) 72%, black) 100%)',
              color: '#fff',
            }}
          >
            {salvando ? 'Remarcando…' : <><IconCheck size={15} /> Remarcar</>}
          </button>
        </div>

        {!mudou && (
          <p className="text-[11px] text-center inline-flex items-center justify-center gap-1 w-full" style={{ color: 'var(--admin-text-faded)' }}>
            <IconCalendar size={12} /> Escolha um dia ou horário diferente
          </p>
        )}
      </div>
    </div>,
    document.body,
  )
}
