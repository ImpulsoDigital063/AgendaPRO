'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'

type Props = {
  currentCount: number
  totalCount: number
  pageSize: number
}

export default function VendasLoadMore({ currentCount, totalCount, pageSize }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  if (currentCount >= totalCount) return null

  const remaining = totalCount - currentCount

  function loadMore() {
    const params = new URLSearchParams(searchParams)
    const currentOffset = parseInt(params.get('offset') ?? '0', 10)
    params.set('offset', String(currentOffset + pageSize))
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  return (
    <div className="flex justify-center mt-4">
      <button
        onClick={loadMore}
        disabled={isPending}
        className="px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
        style={{
          background: 'var(--admin-surface)',
          color: 'var(--admin-accent)',
          border: '1px solid var(--admin-border)',
        }}
      >
        {isPending ? 'Carregando…' : `Ver mais ${Math.min(remaining, pageSize)} vendas (${remaining} restantes)`}
      </button>
    </div>
  )
}
