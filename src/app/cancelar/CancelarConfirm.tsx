'use client'

import { useState } from 'react'
import Link from 'next/link'
import { IconCheck, IconClose, IconArrowRight } from '@/components/ui/Icon'

type Props = {
  appointmentId: string
  token: string
  alreadyCancelled: boolean
  businessSlug?: string
  businessPhone?: string | null
  /** v113 · o que acontece com o sinal se ela cancelar AGORA. */
  decisaoSinal?: {
    temSinal: boolean
    valor: number
    horasRestantes: number
    horasLimite: number
    viraCredito: boolean
    expiraEm: string | null
  } | null
  isDark: boolean
}

export default function CancelarConfirm({
  appointmentId,
  token,
  alreadyCancelled,
  businessSlug,
  businessPhone,
  decisaoSinal,
  isDark,
}: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(
    alreadyCancelled ? 'done' : 'idle'
  )
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleCancel() {
    setShowConfirm(false)
    setStatus('loading')
    try {
      const res = await fetch(
        `/api/appointment/action?id=${appointmentId}&action=cancelled&token=${token}`
      )
      if (res.ok) {
        setStatus('done')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  const surface = isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF'
  const surfaceHi = isDark ? 'rgba(255,255,255,0.07)' : '#F8FAFC'
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
  const text = isDark ? '#F1F5F9' : '#0F172A'
  const mute = isDark ? '#94A3B8' : '#64748B'

  if (status === 'done') {
    return (
      <div
        className="rounded-2xl p-5 space-y-4 text-center"
        style={{ background: surface, border: `1px solid ${border}` }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
          style={{
            background: isDark ? 'rgba(34,197,94,0.15)' : 'rgb(220,252,231)',
            color: '#22C55E',
            boxShadow: `0 12px 32px -10px ${isDark ? 'rgba(34,197,94,0.4)' : 'rgba(34,197,94,0.25)'}`,
          }}
        >
          <IconCheck size={28} />
        </div>
        <div>
          <p className="font-bold text-base" style={{ color: text }}>
            Agendamento cancelado
          </p>
          <p className="text-xs mt-1" style={{ color: mute }}>
            {alreadyCancelled
              ? 'Este agendamento já havia sido cancelado antes.'
              : 'O estabelecimento foi notificado e o horário voltou a ficar livre.'}
          </p>
        </div>
        {businessSlug && (
          <Link
            href={`/${businessSlug}`}
            className="inline-flex items-center justify-center gap-2 w-full rounded-2xl py-3 text-sm font-semibold transition-transform active:scale-[0.98]"
            style={{
              background:
                'linear-gradient(135deg, var(--brand-primary, #3B82F6), var(--brand-secondary, #06B6D4))',
              color: '#FFFFFF',
              boxShadow:
                '0 10px 22px -10px color-mix(in srgb, var(--brand-primary, #3B82F6) 70%, transparent)',
            }}
          >
            Fazer novo agendamento
            <IconArrowRight size={16} />
          </Link>
        )}
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{
          background: isDark ? 'rgba(239,68,68,0.1)' : 'rgb(254,242,242)',
          border: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : 'rgb(254,202,202)'}`,
        }}
      >
        <p className="text-sm font-semibold" style={{ color: isDark ? '#FCA5A5' : '#B91C1C' }}>
          Erro ao cancelar
        </p>
        <p className="text-xs" style={{ color: isDark ? '#FCA5A5' : '#B91C1C' }}>
          Tente novamente ou entre em contato com o estabelecimento.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="w-full rounded-xl py-2.5 text-sm font-semibold transition-transform active:scale-[0.98]"
          style={{ background: surfaceHi, color: text, border: `1px solid ${border}` }}
        >
          Tentar de novo
        </button>
      </div>
    )
  }

  const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const zap = (businessPhone || '').replace(/\D/g, '')
  const linkRemarcar = zap
    ? 'https://wa.me/' +
      (zap.startsWith('55') ? zap : '55' + zap) +
      '?text=' +
      encodeURIComponent('Oi! Preciso remarcar meu horário, pode me ajudar?')
    : null

  return (
    <div className="space-y-2">
      {/* O QUE ACONTECE COM O SINAL (v113) · dito ANTES de ela clicar, nunca
          depois. Reter dinheiro sem ter avisado é briga garantida — e a
          cliente tem razão quando não foi informada.

          O botão de remarcar vem junto de propósito: remarcar é o que o salão
          prefere (o dinheiro fica, o horário só muda) e o que resolve pra ela
          quando o problema é a data, não o serviço. */}
      {decisaoSinal?.temSinal && (
        <div
          className="rounded-2xl px-4 py-3 mb-1"
          style={{
            background: decisaoSinal.viraCredito ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
            border: decisaoSinal.viraCredito
              ? '1px solid rgba(16,185,129,0.32)'
              : '1px solid rgba(239,68,68,0.32)',
          }}
        >
          <p className="text-xs leading-relaxed" style={{ color: text }}>
            {decisaoSinal.viraCredito ? (
              <>
                Cancelando agora, o sinal de <strong>{brl(decisaoSinal.valor)}</strong> fica como{' '}
                <strong>crédito</strong> na sua ficha
                {decisaoSinal.expiraEm && (
                  <>
                    {' '}até <strong>{new Date(decisaoSinal.expiraEm).toLocaleDateString('pt-BR')}</strong>
                  </>
                )}
                , pra usar em outro horário.
              </>
            ) : (
              <>
                Faltam menos de <strong>{decisaoSinal.horasLimite}h</strong> para o seu horário.
                Cancelando agora, o sinal de <strong>{brl(decisaoSinal.valor)}</strong> não é
                devolvido.
              </>
            )}
          </p>
          {linkRemarcar && (
            <a
              href={linkRemarcar}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 block w-full rounded-xl py-2.5 text-center text-xs font-bold"
              style={{ background: '#25D366', color: '#fff' }}
            >
              Prefiro remarcar — falar no WhatsApp
            </a>
          )}
        </div>
      )}

      <button
        onClick={() => setShowConfirm(true)}
        disabled={status === 'loading'}
        className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
          boxShadow: '0 10px 22px -10px rgba(239,68,68,0.55)',
        }}
      >
        {status === 'loading' ? 'Cancelando...' : 'Sim, cancelar meu agendamento'}
      </button>

      {businessSlug && (
        <Link
          href={`/${businessSlug}`}
          className="block w-full text-center py-2.5 text-xs font-medium transition-opacity hover:opacity-80"
          style={{ color: mute }}
        >
          Voltar sem cancelar
        </Link>
      )}

      {/* Modal de confirmação */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl p-5"
            style={{
              background: isDark ? '#0B1220' : '#FFFFFF',
              border: `1px solid ${border}`,
              boxShadow: '0 24px 50px -20px rgba(0,0,0,0.6)',
            }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: isDark ? 'rgba(239,68,68,0.15)' : 'rgb(254,242,242)',
                  color: '#EF4444',
                }}
              >
                <IconClose size={20} />
              </div>
              <div>
                <p className="font-bold text-base" style={{ color: text }}>
                  Confirmar cancelamento?
                </p>
                <p className="text-xs mt-1" style={{ color: mute }}>
                  Essa ação não pode ser desfeita. Se mudar de ideia depois, basta fazer um novo agendamento.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-transform active:scale-[0.98]"
                style={{ background: surfaceHi, color: text, border: `1px solid ${border}` }}
              >
                Voltar
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
                style={{ background: '#EF4444' }}
              >
                Sim, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
