'use client'

/* NOTIFICAÇÕES (Eduardo 23/10: "essa quantidade de avisos… vamos criar uma
   aba e colocar lá, assim libera o espaço das telas pro que interessa").
   Começa na Ivna (painel da clínica); depois vai pro AgendaPRO inteiro.

   Como funciona: a central fica montada no layout o tempo todo, escondida.
   Cada aviso continua decidindo sozinho se aparece (a mesma lógica de antes,
   nada duplicado) e a central só CONTA quantos renderizaram alguma coisa.
   Esse número vai pro sininho. Na página <base>/notificacoes a central
   aparece e mostra a lista. Montada uma vez só: o convite de instalar o app
   depende de um evento do navegador que dispara uma vez, e remontar perderia.

   Fica de fora de propósito (decisão do Eduardo): mensalidade vencendo e
   pedidos de pontos por avaliação continuam na tela. */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

let totalAtual = 0
const ouvintes = new Set<(n: number) => void>()

function publicar(n: number) {
  if (n === totalAtual) return
  totalAtual = n
  ouvintes.forEach((f) => f(n))
}

export function useTotalNotificacoes() {
  const [n, setN] = useState(totalAtual)
  useEffect(() => {
    ouvintes.add(setN)
    setN(totalAtual)
    return () => { ouvintes.delete(setN) }
  }, [])
  return n
}

export default function CentralNotificacoes({ base, itens }: { base: string; itens: ReactNode[] }) {
  const pathname = usePathname()
  const visivel = pathname === `${base}/notificacoes`
  const lista = useRef<HTMLDivElement>(null)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const el = lista.current
    if (!el) return
    const contar = () => {
      const n = Array.from(el.children).filter((c) => c.childElementCount > 0).length
      setTotal(n)
      publicar(n)
    }
    contar()
    const obs = new MutationObserver(contar)
    obs.observe(el, { childList: true, subtree: true })
    return () => obs.disconnect()
  }, [])

  return (
    <section className={visivel ? 'relative mx-auto max-w-3xl px-4 pt-6 pb-10 md:px-6' : 'hidden'} aria-hidden={!visivel}>
      <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--admin-text)' }}>Notificações</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--admin-text-mute)' }}>
        {total === 0 ? 'Tudo em dia por aqui.' : total === 1 ? '1 notificação pra você ver.' : `${total} notificações pra você ver.`}
      </p>
      <div ref={lista} className="mt-5 space-y-4 [&>div:empty]:hidden">
        {itens.map((item, i) => (
          <div key={i}>{item}</div>
        ))}
      </div>
      {total === 0 && (
        <div className="mt-5 rounded-2xl border px-5 py-10 text-center" style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}>
          <SinoIcone className="mx-auto h-8 w-8" style={{ color: 'var(--admin-text-faded)' }} />
          <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Nenhuma notificação</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--admin-text-mute)' }}>Quando o sistema tiver algo pra te avisar, aparece aqui.</p>
          <Link href={base === '/admin' ? '/admin/inicio' : base} className="mt-4 inline-block text-sm font-semibold" style={{ color: 'var(--admin-accent)' }}>Voltar pro início</Link>
        </div>
      )}
    </section>
  )
}

export function SinoIcone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

/** sininho com o número (barra de cima no celular) */
export function SinoNotificacoes({ base }: { base: string }) {
  const n = useTotalNotificacoes()
  return (
    <Link
      href={`${base}/notificacoes`}
      prefetch={false}
      aria-label={n > 0 ? `Notificações: ${n}` : 'Notificações'}
      className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
      style={{ color: 'var(--admin-text)' }}
    >
      <SinoIcone className="h-[22px] w-[22px]" />
      {n > 0 && <ContagemNotificacoes n={n} className="absolute right-1.5 top-1.5" />}
    </Link>
  )
}

export function ContagemNotificacoes({ n, className = '' }: { n?: number; className?: string }) {
  const total = useTotalNotificacoes()
  const valor = n ?? total
  if (valor <= 0) return null
  return (
    <span
      className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none ${className}`}
      style={{ background: 'var(--admin-accent)', color: '#FFFFFF', boxShadow: '0 0 0 2px var(--admin-surface)' }}
    >
      {valor > 9 ? '9+' : valor}
    </span>
  )
}
