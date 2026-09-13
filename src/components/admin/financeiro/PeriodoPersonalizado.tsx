'use client'

/**
 * Período personalizado do Financeiro — pedido da Letícia (Viva Cacheada,
 * 06/08/2026): "sinto falta de pôr a data personalizada". Os três atalhos
 * (Hoje / 7 dias / Mês) continuam iguais; aqui entra o intervalo escolhido
 * na mão, que vira `?periodo=custom&de=AAAA-MM-DD&ate=AAAA-MM-DD`.
 *
 * Mesmo componente nos dois fronts (mobile e desktop) — muda só o `estilo`,
 * porque o desktop usa pílulas quadradas e o mobile abas arredondadas.
 *
 * λ.fuso: o teto do calendário é `todayBR()`, não `new Date()`. Depois das 21h
 * o runtime em UTC já está no dia seguinte e o cliente conseguiria escolher um
 * "amanhã" que não existe pra ele.
 */

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { todayBR } from '@/lib/date-br'

type Props = {
  /** intervalo já aplicado (vem da URL), pra reabrir o painel preenchido */
  de?: string
  ate?: string
  ativo: boolean
  estilo: 'aba' | 'pilula'
}

export default function PeriodoPersonalizado({ de, ate, ativo, estilo }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const hoje = todayBR()

  const [aberto, setAberto] = useState(false)
  const [inicio, setInicio] = useState(de ?? '')
  const [fim, setFim] = useState(ate ?? '')

  const invertido = !!inicio && !!fim && inicio > fim
  const podeAplicar = !!inicio && !!fim && !invertido

  function aplicar() {
    if (!podeAplicar) return
    router.push(`${pathname}?periodo=custom&de=${inicio}&ate=${fim}`)
    setAberto(false)
  }

  const rotulo =
    ativo && de && ate
      ? `${de.slice(8, 10)}/${de.slice(5, 7)} a ${ate.slice(8, 10)}/${ate.slice(5, 7)}`
      : 'Personalizado'

  const botaoBase =
    estilo === 'aba'
      ? 'flex-1 py-2 text-sm font-semibold rounded-xl transition-all'
      : 'px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider'

  const botaoStyle = ativo
    ? estilo === 'aba'
      ? {
          background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
          color: '#fff',
          boxShadow: '0 6px 14px rgba(59,130,246,0.3)',
        }
      : { background: 'var(--admin-accent)', color: '#fff' }
    : { background: 'transparent', color: 'var(--admin-text-mute)' }

  return (
    <div className={estilo === 'aba' ? 'flex-1 relative' : 'relative'}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className={botaoBase + (estilo === 'aba' ? ' w-full' : '')}
        style={botaoStyle}
      >
        {rotulo}
      </button>

      {aberto && (
        <div
          className="absolute z-30 mt-2 p-3 rounded-2xl w-[17rem] max-w-[calc(100vw-2rem)]"
          style={{
            top: '100%',
            left: 0,
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
            boxShadow: '0 18px 40px -12px rgba(0,0,0,0.25)',
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
                De
              </span>
              <input
                type="date"
                value={inicio}
                max={hoje}
                onChange={(e) => setInicio(e.target.value)}
                className="w-full mt-1 px-2 py-2 rounded-lg text-sm"
                style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
                Até
              </span>
              <input
                type="date"
                value={fim}
                max={hoje}
                onChange={(e) => setFim(e.target.value)}
                className="w-full mt-1 px-2 py-2 rounded-lg text-sm"
                style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
              />
            </label>
          </div>

          {invertido && (
            <p className="text-[11px] mt-2" style={{ color: '#DC2626' }}>
              A data inicial tem que vir antes da final.
            </p>
          )}

          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={aplicar}
              disabled={!podeAplicar}
              className="flex-1 py-2 rounded-xl text-sm font-bold"
              style={{
                background: podeAplicar ? 'var(--admin-accent)' : 'var(--admin-surface-hi)',
                color: podeAplicar ? '#fff' : 'var(--admin-text-faded)',
              }}
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={() => {
                setAberto(false)
                router.push(pathname)
              }}
              className="px-3 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'transparent', color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }}
            >
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
