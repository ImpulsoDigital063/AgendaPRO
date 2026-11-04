'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { IconBell, IconCalendar, IconStar, IconChevronRight } from '@/components/ui/Icon'

/**
 * Sininho do dono (04/11/2026, Eduardo).
 *
 * Cinza quando não há nada; vermelho com número quando há coisa pedindo ação.
 * O número usa SÓ contagens que o layout do admin já carrega (cache de 30s):
 * nenhuma consulta nova (CPU da Vercel no limite).
 *  - pendingAppointments: agendamentos com status 'pending' (a confirmar),
 *    o mesmo número do badge de Atendimentos no menu.
 *  - pendingClaims: pedidos de pontos por avaliação (review_claims pending),
 *    o mesmo número do badge de Clientes. Aprovar/recusar fica no topo do Início.
 * Sinal pendente/vencendo NÃO entra: não há contagem pronta no layout e
 * incluir exigiria consulta nova em toda tela.
 */
type Props = {
  pendingAppointments?: number
  pendingClaims?: number
  /** onde o painel abre: 'direita' alinha pela borda direita (topo do celular) */
  alinhar?: 'direita' | 'esquerda'
}

export default function SininhoNotificacoes({ pendingAppointments = 0, pendingClaims = 0, alinhar = 'direita' }: Props) {
  const [aberto, setAberto] = useState(false)
  const caixaRef = useRef<HTMLDivElement>(null)

  const total = pendingAppointments + pendingClaims
  const grupos = [
    {
      id: 'confirmar',
      n: pendingAppointments,
      titulo: pendingAppointments === 1 ? 'Agendamento a confirmar' : 'Agendamentos a confirmar',
      desc: 'Toque pra ver a lista e confirmar',
      href: '/admin/consultas?status=pending',
      Icon: IconCalendar,
    },
    {
      id: 'avaliacao',
      n: pendingClaims,
      titulo: pendingClaims === 1 ? 'Pedido de pontos por avaliação' : 'Pedidos de pontos por avaliação',
      desc: 'Aprovar ou recusar no Início',
      href: '/admin/inicio',
      Icon: IconStar,
    },
  ].filter((g) => g.n > 0)

  useEffect(() => {
    if (!aberto) return
    function fora(e: MouseEvent | TouchEvent) {
      if (caixaRef.current && !caixaRef.current.contains(e.target as Node)) setAberto(false)
    }
    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    document.addEventListener('touchstart', fora)
    window.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('touchstart', fora)
      window.removeEventListener('keydown', tecla)
    }
  }, [aberto])

  const rotulo = total > 0
    ? `Notificações, ${total} ${total === 1 ? 'pendente' : 'pendentes'}`
    : 'Notificações, nada pendente'

  return (
    <div ref={caixaRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-label={rotulo}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        title={rotulo}
        className="relative w-11 h-11 rounded-lg flex items-center justify-center"
        style={{ color: total > 0 ? 'var(--admin-text)' : 'var(--admin-text-mute)' }}
      >
        <IconBell size={20} />
        {total > 0 && (
          <span
            aria-hidden
            className="absolute flex items-center justify-center text-[10px] font-bold"
            style={{
              top: 6,
              right: 4,
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 9,
              background: 'var(--admin-danger,#DC2626)',
              color: '#fff',
              boxShadow: '0 0 0 2px var(--admin-surface)',
            }}
          >
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label="Notificações"
          className="absolute z-[60] mt-1 rounded-2xl overflow-hidden"
          style={{
            top: '100%',
            ...(alinhar === 'direita' ? { right: -4 } : { left: -4 }),
            width: 300,
            maxWidth: 'calc(100vw - 24px)',
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
          }}
        >
          <p
            className="px-4 pt-3 pb-2 text-[10px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--admin-text-faded)' }}
          >
            Pede sua atenção
          </p>

          {grupos.length === 0 ? (
            <p className="px-4 pb-4 text-sm" style={{ color: 'var(--admin-text-mute)' }}>
              Nada pendente agora.
            </p>
          ) : (
            <div className="px-2 pb-2">
              {grupos.map((g) => (
                <Link
                  key={g.id}
                  href={g.href}
                  prefetch={false}
                  onClick={() => setAberto(false)}
                  className="flex items-center gap-3 px-2 rounded-xl"
                  style={{ minHeight: 56, color: 'var(--admin-text)' }}
                >
                  <span
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}
                  >
                    <g.Icon size={18} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold leading-tight">{g.titulo}</span>
                    <span className="block text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>{g.desc}</span>
                  </span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--admin-danger,#DC2626)', color: '#fff' }}
                  >
                    {g.n}
                  </span>
                </Link>
              ))}
            </div>
          )}

          <Link
            href="/admin/configuracoes?tab=notificacoes"
            prefetch={false}
            onClick={() => setAberto(false)}
            className="flex items-center gap-2 px-4 text-sm font-medium"
            style={{ minHeight: 48, borderTop: '1px solid var(--admin-divider)', color: 'var(--admin-accent)' }}
          >
            <span className="flex-1">Notificações no celular</span>
            <IconChevronRight size={16} />
          </Link>
        </div>
      )}
    </div>
  )
}
