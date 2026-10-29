'use client'

import { useSyncExternalStore } from 'react'
import GoogleReviewSection from '@/components/GoogleReviewSection'

/* O ?c= (id da ficha) é lido no navegador pra página continuar em cache. */
const nadaMuda = () => () => {}
function useFichaDaUrl(): string | null {
  const search = useSyncExternalStore(nadaMuda, () => window.location.search, () => '')
  return new URLSearchParams(search).get('c')
}

type Props = Omit<React.ComponentProps<typeof GoogleReviewSection>, 'customerId'>

export default function AvaliarClient(props: Props) {
  const customerId = useFichaDaUrl()
  return <GoogleReviewSection {...props} customerId={customerId} />
}
