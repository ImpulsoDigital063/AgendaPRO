'use client'

/**
 * Tour "Conheça seu sistema" · montado no layout do painel.
 *
 * Lê ?tour=<parada> da URL e, se a tela atual for a da parada, abre o
 * TourGuiado com os balões dela. O último balão leva pra próxima parada
 * trocando a URL; fechar ou "Agora não" tira o ?tour e sai do roteiro.
 * O roteiro em si mora em src/lib/tour-sistema.ts.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import TourGuiado, { type PassoTour } from './TourGuiado'
import { hrefDaParada, montarRoteiro, TOTAL_PARTES } from '@/lib/tour-sistema'

type Props = { categoria: string | null; vendeProduto: boolean }

export default function TourSistema({ categoria, vendeProduto }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const tourId = params.get('tour')
  const tab = params.get('tab')

  const roteiro = useMemo(() => montarRoteiro({ categoria, vendeProduto }), [categoria, vendeProduto])
  const idx = roteiro.findIndex((p) => p.id === tourId)
  const parada = idx >= 0 ? roteiro[idx] : null
  const proxima = idx >= 0 ? roteiro[idx + 1] ?? null : null

  /* Só abre na tela da parada. Se a dona navegou pra outro lugar com o
     ?tour ainda na URL, o balão não aparece fora de contexto. */
  const naTela = useMemo(() => {
    if (!parada) return false
    const [rota, query] = parada.href.split('?')
    if (pathname !== rota) return false
    const tabEsperada = new URLSearchParams(query ?? '').get('tab')
    return !tabEsperada || tabEsperada === tab
  }, [parada, pathname, tab])

  /* Espera a tela desenhar antes de medir o alvo; sem isso o botão ainda
     não existe e o balão cai no centro. */
  const [pronto, setPronto] = useState(false)
  useEffect(() => {
    setPronto(false)
    if (!naTela) return
    const t = setTimeout(() => setPronto(true), 450)
    return () => clearTimeout(t)
  }, [naTela, tourId])

  const avancando = useRef(false)

  const passos: PassoTour[] = useMemo(() => {
    if (!parada) return []
    return parada.baloes.map((b, n) => {
      const ultimo = n === parada.baloes.length - 1
      if (!ultimo) return b
      return {
        ...b,
        acao: {
          rotulo: parada.seguir,
          executar: () => {
            avancando.current = true
            if (proxima) router.push(hrefDaParada(proxima))
            else sair()
          },
        },
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parada, proxima])

  function sair() {
    const q = new URLSearchParams(params.toString())
    q.delete('tour')
    const s = q.toString()
    router.replace(s ? `${pathname}?${s}` : pathname)
  }

  if (!parada || !naTela || !pronto) return null

  const contador = parada.parte === 0
    ? 'Conheça seu sistema'
    : `Parte ${parada.parte} de ${TOTAL_PARTES} · ${parada.nomeParte}`

  return (
    <TourGuiado
      key={parada.id}
      aberto
      passos={passos}
      rotulo="Tour do sistema"
      contador={contador}
      aoEncerrar={() => {
        /* O TourGuiado chama aoEncerrar ANTES de executar a ação do botão.
           Adia a saída um tique: se foi "Próximo", o executar marca
           avancando e a URL vai pra próxima parada em vez de limpar. */
        setTimeout(() => {
          if (avancando.current) { avancando.current = false; return }
          sair()
        }, 0)
      }}
    />
  )
}
