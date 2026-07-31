'use client'

import { createContext, useContext, useCallback, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { IconArrowLeft } from '@/components/ui/Icon'

/**
 * Liga a seta de voltar do header ao passo atual do BookingFlow.
 *
 * Problema (reportado por Eduardo em 31/07/2026): a seta era um <Link> fixo pra
 * `/${slug}`. Quem entrava num dia lotado pra ver os horários e clicava em
 * voltar era jogado pro início do fluxo, perdendo serviço e data escolhidos.
 * Existia o "editar" nos cards de resumo, mas ninguém acha — e quem clicou num
 * dia cheio é justamente quem ainda quer marcar.
 *
 * O header é renderizado no server (page.tsx) e o passo vive no client
 * (BookingFlow). Este provider é client mas recebe o header como children
 * server-rendered, então nada precisa virar client por causa disso.
 *
 * Quando não há passo anterior (primeiro passo), a seta volta a ser o link de
 * sempre pra home do negócio.
 */

type Handler = () => void

const BookingBackCtx = createContext<{
  registrarVoltar: (h: Handler | null) => void
  voltar: Handler | null
}>({ registrarVoltar: () => {}, voltar: null })

export function BookingBackProvider({ children }: { children: ReactNode }) {
  const [voltar, setVoltar] = useState<Handler | null>(null)
  // setState com função precisa do wrapper: senão o React trata o handler
  // como updater e chama ele na hora.
  const registrarVoltar = useCallback((h: Handler | null) => {
    setVoltar(() => h)
  }, [])
  return (
    <BookingBackCtx.Provider value={{ registrarVoltar, voltar }}>
      {children}
    </BookingBackCtx.Provider>
  )
}

/** Usado pelo BookingFlow pra publicar "como voltar" a cada passo. */
export function useBookingBack() {
  return useContext(BookingBackCtx)
}

export function BookingBackButton({
  slug,
  className,
  style,
}: {
  slug: string
  className?: string
  style?: React.CSSProperties
}) {
  const { voltar } = useBookingBack()

  if (voltar) {
    return (
      <button type="button" onClick={voltar} className={className} style={style} aria-label="Voltar">
        <IconArrowLeft size={18} />
      </button>
    )
  }

  return (
    <Link href={`/${slug}`} className={className} style={style} aria-label="Voltar">
      <IconArrowLeft size={18} />
    </Link>
  )
}
