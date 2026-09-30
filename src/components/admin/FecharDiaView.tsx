'use client'

/* "Quem veio hoje?" — fecha o dia em dois toques por cliente.
   Ver o porquê em app/admin/(protected)/fechar-dia/page.tsx.

   Veio  → status 'completed' (o mesmo update do card da agenda). NÃO mexe
           em dinheiro: a comanda continua aberta pra receber no balcão.
   Faltou → status 'no_show' — os gatilhos do banco aplicam a regra de
           falta do negócio (pontos/multa), igual ao botão "Não veio".
   Os dois avisam o /api/notify-client, como o card já fazia. */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IconArrowLeft, IconCheck, IconClose, IconWhatsapp } from '@/components/ui/Icon'

export type AtendimentoAberto = {
  id: string
  cliente: string
  servico: string
  hora: string
  profissional: string | null
  confirmouPeloWhatsApp: boolean
}

function dataLegivel(ymd: string, hoje: string, ontem: string) {
  if (ymd === hoje) return 'hoje'
  if (ymd === ontem) return 'ontem'
  const [a, m, d] = ymd.split('-')
  return `${d}/${m}/${a}`
}

export default function FecharDiaView({
  dia, hoje, ontem, atendimentos,
}: { dia: string; hoje: string; ontem: string; atendimentos: AtendimentoAberto[] }) {
  const router = useRouter()
  const [feitos, setFeitos] = useState<Record<string, 'veio' | 'faltou'>>({})
  const [salvando, setSalvando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function marcar(id: string, resp: 'veio' | 'faltou') {
    setSalvando(id)
    setErro(null)
    const status = resp === 'veio' ? 'completed' : 'no_show'
    const { error } = await createClient().from('appointments').update({ status }).eq('id', id)
    setSalvando(null)
    if (error) { setErro('Não foi possível salvar. Tente de novo.'); return }
    setFeitos((f) => ({ ...f, [id]: resp }))
    fetch('/api/notify-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: id, status }),
    }).catch(() => {})
  }

  const pendentes = atendimentos.filter((a) => !feitos[a.id]).length
  const rotulo = dataLegivel(dia, hoje, ontem)

  return (
    <div className="max-w-lg mx-auto px-4 py-5">
      <Link href="/admin/atendimentos" className="inline-flex items-center gap-1.5 text-sm mb-3" style={{ color: 'var(--admin-text-mute)' }}>
        <IconArrowLeft size={14} /> Agenda
      </Link>

      <h1 className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>Quem veio {rotulo}?</h1>
      <p className="text-sm mt-1 mb-4" style={{ color: 'var(--admin-text-2)' }}>
        Marque cada cliente. É com isso que o sistema mostra quantas faltas os avisos evitaram.
      </p>

      <div className="flex gap-2 mb-4">
        {[{ d: hoje, r: 'Hoje' }, { d: ontem, r: 'Ontem' }].map((x) => (
          <Link
            key={x.d}
            href={`/admin/fechar-dia?data=${x.d}`}
            className="px-3 py-1.5 rounded-full text-xs font-bold"
            style={dia === x.d
              ? { background: 'var(--admin-accent)', color: '#fff' }
              : { background: 'var(--admin-surface)', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}
          >
            {x.r}
          </Link>
        ))}
      </div>

      {atendimentos.length === 0 ? (
        <p className="text-sm py-8 text-center rounded-2xl" style={{ color: 'var(--admin-text-mute)', background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
          Nada pra fechar {rotulo}. Tudo em dia.
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {atendimentos.map((a) => {
              const feito = feitos[a.id]
              return (
                <li key={a.id} className="rounded-2xl p-3" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[15px] font-semibold truncate" style={{ color: 'var(--admin-text)' }}>{a.cliente}</p>
                    <p className="text-xs tabular-nums flex-shrink-0" style={{ color: 'var(--admin-text-faded)' }}>{a.hora}</p>
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--admin-text-mute)' }}>
                    {a.servico}{a.profissional ? ` · ${a.profissional}` : ''}
                  </p>
                  {a.confirmouPeloWhatsApp && (
                    <p className="inline-flex items-center gap-1 text-[11px] font-semibold mt-1" style={{ color: '#16A34A' }}>
                      <IconWhatsapp size={12} /> confirmou pelo WhatsApp
                    </p>
                  )}
                  {feito ? (
                    <p className="mt-2 text-sm font-bold" style={{ color: feito === 'veio' ? '#16A34A' : '#DC2626' }}>
                      {feito === 'veio' ? 'Veio ✓' : 'Faltou'}
                    </p>
                  ) : (
                    <div className="flex gap-2 mt-2.5">
                      <button
                        type="button"
                        disabled={salvando === a.id}
                        onClick={() => marcar(a.id, 'veio')}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                        style={{ background: '#16A34A', color: '#fff' }}
                      >
                        <IconCheck size={14} /> Veio
                      </button>
                      <button
                        type="button"
                        disabled={salvando === a.id}
                        onClick={() => marcar(a.id, 'faltou')}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                        style={{ background: 'var(--admin-surface)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.35)' }}
                      >
                        <IconClose size={14} /> Faltou
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          {erro && <p className="text-xs font-semibold mt-3" style={{ color: '#DC2626' }}>{erro}</p>}
          {pendentes === 0 && (
            <button type="button" onClick={() => router.push('/admin/atendimentos')} className="w-full mt-4 py-3 rounded-xl text-sm font-bold" style={{ background: 'var(--admin-accent)', color: '#fff' }}>
              Pronto, dia fechado
            </button>
          )}
          <p className="text-[11px] mt-3" style={{ color: 'var(--admin-text-faded)' }}>
            &quot;Veio&quot; não recebe pagamento: a comanda continua aberta pra você cobrar no balcão.
          </p>
        </>
      )}
    </div>
  )
}
