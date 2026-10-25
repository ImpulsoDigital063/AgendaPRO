'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppointmentDrawer from '@/components/admin/atendimentos/AppointmentDrawer'
import { IconWhatsapp } from '@/components/ui/Icon'
import type { DiaSemana, LinhaSemana } from '@/lib/semana'

/* "A SEMANA" (25/10/2026) · ver src/lib/semana.ts. Uma linha por atendimento,
   um título por dia. A linha abre a MESMA gaveta da grade (todas as ações num
   lugar só). Quem ainda não confirmou presença fica marcado e tem o lembrete
   do WhatsApp ali mesmo: é o trabalho de verdade da recepção na semana. */

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function tituloDoDia(data: string, i: number) {
  const d = new Date(`${data}T12:00:00`)
  const nome = i === 0 ? 'Amanhã' : DIAS[d.getDay()]
  return `${nome}, ${data.slice(8, 10)}/${data.slice(5, 7)}`
}

function Situacao({ l }: { l: LinhaSemana }) {
  const [cor, texto] = l.aprovar ? ['#B45309', 'Aguardando aprovação'] : l.confirmou ? ['#15803D', 'Confirmou'] : ['var(--admin-text-faded)', 'Não confirmou']
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold whitespace-nowrap" style={{ color: cor }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cor }} />
      {texto}
    </span>
  )
}

const TOM = { ok: '#15803D', atencao: '#B45309', alerta: '#DC2626', neutro: 'var(--admin-text-faded)' } as const

/* Status + comunicação numa faixa que quebra linha (25/10, Eduardo: "mostrar a
   comunicação, se foi enviado, respondido, sinal pago"). */
function Faixa({ l }: { l: LinhaSemana }) {
  return (
    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
      <Situacao l={l} />
      {l.comunicacao.map((c) => (
        <span key={c.texto} className="inline-flex items-center gap-1.5 text-[11.5px] font-medium whitespace-nowrap" style={{ color: TOM[c.tom] }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: TOM[c.tom] }} />
          {c.texto}
        </span>
      ))}
    </span>
  )
}

export default function SemanaLista({
  businessId,
  dias,
  mostrarProfissional,
}: {
  businessId: string
  dias: DiaSemana[]
  /** clínica toda (recepção): mostra de quem é cada atendimento */
  mostrarProfissional: boolean
}) {
  const router = useRouter()
  const [aberto, setAberto] = useState<string | null>(null)
  const [lembrando, setLembrando] = useState<string | null>(null)
  const total = dias.reduce((n, d) => n + d.linhas.length, 0)
  const semConfirmar = dias.reduce((n, d) => n + d.linhas.filter((l) => !l.confirmou && !l.aprovar).length, 0)

  // Mesmo lembrete do cartão antigo: texto montado pela rota, envio pelo WhatsApp da clínica.
  async function lembrar(id: string) {
    setLembrando(id)
    try {
      const r = await fetch(`/api/admin/appointments/${id}/whatsapp-messages`)
      const d = await r.json()
      if (r.ok && d.hasPhone && d.phone) {
        const fone = d.phone.startsWith('55') ? d.phone : `55${d.phone}`
        window.open(`https://wa.me/${fone}?text=${encodeURIComponent(d.reminder)}`, '_blank', 'noopener,noreferrer')
      }
    } catch {
      /* o botão volta ao normal */
    }
    setLembrando(null)
  }

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-bold" style={{ color: 'var(--admin-text)' }}>
          A semana
        </h2>
        <span className="text-[12px] tabular-nums" style={{ color: 'var(--admin-text-faded)' }}>
          {total === 0 ? 'nada marcado nos próximos 7 dias' : `${total} ${total === 1 ? 'atendimento' : 'atendimentos'}${semConfirmar ? ` · ${semConfirmar} sem confirmar` : ''}`}
        </span>
      </div>

      <div className="admin-card overflow-hidden">
        {dias.map((d, i) => (
          <div key={d.data} className={i > 0 ? 'border-t' : ''} style={{ borderColor: 'var(--admin-border)' }}>
            <div className="flex items-center justify-between px-4 pb-1.5 pt-3">
              <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: d.linhas.length ? 'var(--admin-text)' : 'var(--admin-text-faded)' }}>
                {tituloDoDia(d.data, i)}
              </p>
              <p className="text-[12px]" style={{ color: 'var(--admin-text-faded)' }}>
                {d.linhas.length ? `${d.linhas.length} ${d.linhas.length === 1 ? 'atendimento' : 'atendimentos'}` : d.aberto ? 'Sem atendimentos' : 'Fechado'}
              </p>
            </div>
            {d.linhas.length > 0 && (
              <ul className="pb-1.5">
                {d.linhas.map((l) => (
                  <li key={l.id} className="flex items-center gap-2 px-2">
                    <button
                      type="button"
                      onClick={() => setAberto(l.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-[var(--admin-surface)]"
                    >
                      <span className="w-[44px] shrink-0 text-[14px] font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                        {l.hora}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>
                          {l.cliente}
                        </span>
                        {/* profissional ANTES do serviço: no fim ela sumia nas reticências (25/10) */}
                        <span className="block truncate text-[12.5px]" style={{ color: 'var(--admin-text-mute)' }}>
                          {mostrarProfissional && l.profissional ? <strong className="font-semibold" style={{ color: 'var(--admin-text-2)' }}>{l.profissional.split(' ')[0]} · </strong> : null}
                          {l.servico}
                        </span>
                        <Faixa l={l} />
                      </span>
                    </button>
                    {!l.confirmou && !l.aprovar && (
                      <button
                        type="button"
                        onClick={() => lembrar(l.id)}
                        disabled={lembrando === l.id}
                        aria-label={`Mandar lembrete pra ${l.cliente} pelo WhatsApp`}
                        title="Mandar lembrete pelo WhatsApp"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-opacity disabled:opacity-50"
                        style={{ borderColor: 'rgba(22,163,74,.35)', color: '#16A34A' }}
                      >
                        <IconWhatsapp size={16} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <AppointmentDrawer
        appointmentId={aberto}
        businessId={businessId}
        onClose={(recarregar) => {
          setAberto(null)
          if (recarregar) router.refresh()
        }}
      />
    </section>
  )
}
