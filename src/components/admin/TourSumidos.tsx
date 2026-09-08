'use client'

/**
 * Tour da aba Sumidos · roda uma vez, no primeiro acesso (Eduardo, 08/09/2026).
 *
 * O motivo tem prova: o próprio Eduardo, que mandou construir a tela, olhou o
 * print e perguntou o que a caixinha de presente fazia. Se ele não sabia, a
 * Rosy também não vai saber.
 *
 * Como funciona: cada passo aponta pra um elemento REAL da tela pelo
 * data-tour, escurece o resto e mostra o balão ao lado. Sem biblioteca —
 * é getBoundingClientRect e posicionamento absoluto.
 *
 * Sai a qualquer momento pelo "pular" ou pelo Esc. Marcado por NEGÓCIO
 * (businesses.tour_sumidos_em), não por navegador: no localStorage a dona
 * veria tudo de novo ao trocar de celular.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from '@/components/ui/Icon'
import { exemploPrazoPorNicho } from '@/lib/coupon-templates'

type Passo = {
  /** data-tour do elemento destacado. Vazio = balão centralizado, sem alvo. */
  alvo: string
  titulo: string
  corpo: string
}

/* Sem numero no titulo: o selo "N de 6" ja numera, e a propria pagina tem uma
   secao "COMO FUNCIONA · 4 PASSOS". Eram tres numeracoes competindo — o
   Eduardo viu "3 DE 6" ao lado de "2. Veja quantas sao" (08/09). */
function montarPassos(descricao: string | null | undefined): Passo[] {
  return [
  {
    alvo: '',
    titulo: 'Quem sumiu, e o que fazer',
    corpo:
      'Esta aba mostra quem parou de voltar e te dá o caminho pra chamar cada pessoa. Vou te mostrar rapidinho.',
  },
  {
    alvo: 'faixa',
    titulo: 'Escolha o prazo',
    corpo:
      'Cada botão é uma faixa fechada: 15–19 traz só quem sumiu de 15 a 19 dias, 20–24 traz a próxima, e assim por diante. "Todos" mostra a base inteira. ' +
      exemploPrazoPorNicho(descricao),
  },
  {
    alvo: 'contador',
    titulo: 'Veja quantas são',
    corpo:
      'O número acompanha a faixa escolhida. Quem já tem horário marcado à frente não entra aqui — não sumiu.',
  },
  {
    alvo: 'legenda',
    titulo: 'Dois jeitos de chamar',
    corpo:
      'O botão do WhatsApp abre a conversa com um texto pronto, sem desconto nenhum. A caixinha de presente gera um cupom só pra essa pessoa e manda o texto com o link do desconto.',
  },
  {
    alvo: 'linha',
    titulo: 'Uma cliente por vez',
    corpo:
      'Cada linha mostra há quantos dias sumiu e a última visita. Se já houver um cupom ativo, o código aparece aqui e o botão vira Reenviar — assim você não dá dois descontos pra mesma pessoa.',
  },
  {
    alvo: 'cupons',
    titulo: 'Acompanhe o que você mandou',
    corpo:
      'Toque em Ativos, Usados ou Expirados pra ver a lista de cada estado, com o nome de quem recebeu e um botão pra reenviar.',
    },
  ]
}

type Props = {
  /** Só monta quando a dona ainda não viu. */
  aberto: boolean
  /** businesses.description · define a frase de prazo por nicho. */
  descricao?: string | null
}

type Caixa = { top: number; left: number; width: number; height: number }

export default function TourSumidos({ aberto, descricao }: Props) {
  const PASSOS = useMemo(() => montarPassos(descricao), [descricao])
  const [i, setI] = useState(0)
  const [caixa, setCaixa] = useState<Caixa | null>(null)
  const [pronto, setPronto] = useState(false)
  const [fechado, setFechado] = useState(false)

  useEffect(() => setPronto(true), [])

  const encerrar = useCallback(() => {
    setFechado(true)
    // Marca no banco. Se falhar, o tour volta na próxima — melhor que sumir
    // sem a dona ter visto.
    fetch('/api/admin/tour-sumidos', { method: 'POST' }).catch(() => {})
  }, [])

  /* Mede o alvo do passo atual. useLayoutEffect pra não piscar o balão numa
     posição errada antes de reposicionar. */
  useLayoutEffect(() => {
    if (!aberto || fechado) return
    const passo = PASSOS[i]
    if (!passo?.alvo) { setCaixa(null); return }
    const el = document.querySelector<HTMLElement>(`[data-tour="${passo.alvo}"]`)
    if (!el) { setCaixa(null); return }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const medir = () => {
      const r = el.getBoundingClientRect()
      setCaixa({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    medir()
    const t = setTimeout(medir, 350) // depois do scroll suave
    window.addEventListener('resize', medir)
    window.addEventListener('scroll', medir, true)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', medir)
      window.removeEventListener('scroll', medir, true)
    }
  }, [i, aberto, fechado])

  useEffect(() => {
    if (!aberto || fechado) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') encerrar()
      if (e.key === 'ArrowRight') setI((v) => Math.min(v + 1, PASSOS.length - 1))
      if (e.key === 'ArrowLeft') setI((v) => Math.max(v - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aberto, fechado, encerrar])

  if (!aberto || fechado || !pronto) return null

  const passo = PASSOS[i]
  const ultimo = i === PASSOS.length - 1
  const margem = 8

  /* Balão embaixo do alvo; se não couber, em cima. Sem alvo, centralizado. */
  const espacoAbaixo = caixa ? window.innerHeight - (caixa.top + caixa.height) : 0
  const acima = caixa ? espacoAbaixo < 220 : false
  const balao: React.CSSProperties = caixa
    ? {
        position: 'fixed',
        left: 12,
        right: 12,
        ...(acima
          ? { bottom: window.innerHeight - caixa.top + margem }
          : { top: caixa.top + caixa.height + margem }),
      }
    : { position: 'fixed', left: 12, right: 12, top: '50%', transform: 'translateY(-50%)' }

  return createPortal(
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label="Tour da aba Sumidos">
      {/* Escurece tudo; o recorte do alvo é feito com box-shadow gigante */}
      {caixa ? (
        <div
          className="absolute rounded-2xl pointer-events-none transition-all duration-200"
          style={{
            top: caixa.top - 6,
            left: caixa.left - 6,
            width: caixa.width + 12,
            height: caixa.height + 12,
            boxShadow: '0 0 0 9999px rgba(15,23,42,0.62)',
            border: '2px solid var(--admin-accent)',
          }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: 'rgba(15,23,42,0.62)' }} />
      )}

      <div
        className="admin-card p-4 mx-auto"
        style={{ ...balao, maxWidth: 420, boxShadow: '0 12px 40px rgba(0,0,0,0.28)' }}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-accent)' }}>
            {i + 1} de {PASSOS.length}
          </p>
          <button type="button" onClick={encerrar} aria-label="Fechar tour"
            style={{ color: 'var(--admin-text-faded)' }}>
            <IconClose size={16} />
          </button>
        </div>

        <p className="text-base font-bold leading-snug" style={{ color: 'var(--admin-text)' }}>
          {passo.titulo}
        </p>
        <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
          {passo.corpo}
        </p>

        {/* Bolinhas de progresso */}
        <div className="flex items-center gap-1.5 mt-3">
          {PASSOS.map((_, n) => (
            <span key={n} className="h-1.5 rounded-full transition-all"
              style={{
                width: n === i ? 18 : 6,
                background: n === i ? 'var(--admin-accent)' : 'var(--admin-border)',
              }} />
          ))}
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button type="button" onClick={encerrar}
            className="text-sm font-semibold px-2 py-2"
            style={{ color: 'var(--admin-text-faded)' }}>
            Pular
          </button>
          <div className="flex-1" />
          {i > 0 && (
            <button type="button" onClick={() => setI(i - 1)}
              className="px-3 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}>
              Voltar
            </button>
          )}
          <button type="button" onClick={() => (ultimo ? encerrar() : setI(i + 1))}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--admin-accent)', color: '#fff' }}>
            {ultimo ? 'Entendi' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
