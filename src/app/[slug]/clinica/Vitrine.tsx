'use client'

/* VITRINE DA CLÍNICA · parte de tela, v4 (22/10/2026).
   Padrão das clínicas estudadas (REFERENCIAS-CLINICAS.md): serifa firme sem
   itálico nos títulos, texto em caixa normal, botão sólido escuro, lista de
   preço com fio fino, dourado só de acento. Movimento curto e discreto. Regra do Eduardo: o objetivo é o agendamento, então o botão
   "Agendar" fica visível o tempo todo (topo fixo + barra fixa no celular).
   Leve: vídeo da abertura começa pela foto, vídeos do carrossel só baixam no
   toque, mapa só no toque, movimento só com transform/opacity. */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import type { ConteudoVitrine, Texto } from '@/lib/vitrine/conteudo'
import GoogleReviewSection from '@/components/GoogleReviewSection'

export type DadosVitrine = {
  nome: string
  slug: string
  descricao: string | null
  telefone: string | null
  endereco: string | null
  logo: string | null
  capa: string | null
  instagram: string | null
  cor: string
  cor2: string
  categorias: { nome: string; servicos: { id: string; nome: string; descricao: string | null; preco: number | null; duracao: number | null; foto: string | null; avaliacao: boolean; ordem: number }[] }[]
  equipe: { id: string; nome: string; foto: string | null; dona: boolean }[]
  pacotes: {
    id: string
    nome: string
    preco: number
    descricao: string | null
    itens: { nome: string; qtd: number }[]
    separado: number | null
    sessoes: { servico: string | null; qtd: number } | null
    foto: string | null
  }[]
  conteudo: ConteudoVitrine
  /** horário de funcionamento montado do expediente da equipe (dias seguidos com a mesma faixa juntos) */
  horarios: { dias: string; faixa: string }[]
  businessId: string
  /** perguntas do conteúdo + a de preço montada do banco; a mesma lista vira o FAQPage */
  perguntas: { q: string; a: string }[]
  avaliacao: {
    businessId: string
    url: string
    nota: number | null
    total: number | null
    pontos: number
    premio: { name: string; pointsRequired: number } | null
  } | null
}

const TINTA = '#2A2520'
const SUAVE = '#7C7266'
const LINHA = '#E7DECF'
const CREME = '#FAF7F2'
const SERIF = 'font-[family-name:var(--font-vitrine)]'
const SANS = 'font-[family-name:var(--font-vitrine-sans)]'
const ROMANOS = ['I', 'II', 'III', 'IV', 'V']

/* "Pedra polida": brilhos radiais em creme e branco, sem imagem e sem filtro
   (o mármore por feTurbulence saiu como véu cinza no Chrome). */
const MARMORE = [
  'radial-gradient(ellipse 60% 45% at 12% 8%, rgba(255,255,255,.95), transparent 70%)',
  'radial-gradient(ellipse 50% 40% at 88% 92%, rgba(203,170,98,.10), transparent 70%)',
  'radial-gradient(ellipse 45% 35% at 70% 20%, rgba(236,226,212,.55), transparent 70%)',
].join(',')

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
const fone = (t: string) => {
  const n = t.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
  return n.length === 11 ? `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}` : n.length === 10 ? `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}` : t
}
const tempo = (m: number | null) => (!m ? '' : m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`)

const ICONES = {
  pino: 'M12 21s-6-5.6-6-11a6 6 0 1 1 12 0c0 5.4-6 11-6 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  whats: 'M4 20l1.3-3.9A8 8 0 1 1 8 19l-4 1Z',
  insta: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm5.5-1.5h.01',
  play: 'M9 6.5v11l9-5.5-9-5.5Z',
  seta: 'M4 12h16M14 6l6 6-6 6',
  // procedimentos (cartões de pacote): mesmo traço fino dos demais
  olho: 'M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 7.6 5 5.6M9.4 6.2 9 4M14.6 6.2 15 4M18 7.6l1-2',
  labios: 'M3 12c2.5-3.5 5-5 7-4.2.8.3 1.4.8 2 .8s1.2-.5 2-.8c2-.8 4.5.7 7 4.2-2.6 3.6-5.6 5.5-9 5.5S5.6 15.6 3 12Zm0 0h18',
  seringa: 'M18 3l3 3M19.5 4.5 15 9M16.5 7.5l-9 9-3 .5.5-3 9-9M7.5 13.5 9 15M10 11l1.5 1.5M3 21l1.5-1.5',
  brilho: 'M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21M12 8.5l1.2 2.3 2.3 1.2-2.3 1.2-1.2 2.3-1.2-2.3L8.5 12l2.3-1.2L12 8.5Z',
  folha: 'M5 19c0-8 5-14 15-14 0 10-6 15-14 15M5 19l7-7',
}

/** desenho do procedimento pelo nome (pacote primeiro, depois o 1º item) */
function iconeDoProcedimento(...nomes: string[]): keyof typeof ICONES {
  for (const n of nomes) {
    if (/c[íi]lio|sobrancelh|brow|blefaro|olhar|lash/i.test(n)) return 'olho'
    // injetável antes de lábios: "preenchimento labial" é seringa, não micropigmentação
    if (/toxina|preenchimento|botul/i.test(n)) return 'seringa'
    if (/l[áa]bi/i.test(n)) return 'labios'
    if (/spa|massagem|banho|escalda/i.test(n)) return 'folha'
    if (/pele|peeling|limpeza|microagulh/i.test(n)) return 'brilho'
  }
  return 'brilho'
}

function Icone({ nome, cor, className = 'h-5 w-5' }: { nome: keyof typeof ICONES; cor: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke={cor} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONES[nome]} />
    </svg>
  )
}

function Selo() {
  return (
    <span className={`${SANS} ml-2 inline-block translate-y-[-2px] rounded-full px-1.5 py-[1px] align-middle text-[9px] font-medium uppercase not-italic tracking-wider`} style={{ background: '#CBAA6226', color: '#8A6A2E' }}>
      exemplo
    </span>
  )
}

function T({ x }: { x: Texto }) {
  if (!x.ex) return <>{x.t}</>
  return (
    <span className="rounded-sm outline-1 outline-dashed outline-offset-4" style={{ outlineColor: '#CBAA6299' }}>
      {x.t}
      <Selo />
    </span>
  )
}

function useVisto<T extends HTMLElement>(margem = '0px 0px -12% 0px') {
  const ref = useRef<T>(null)
  const [visto, setVisto] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setVisto(true), io.disconnect()), { rootMargin: margem })
    io.observe(el)
    return () => io.disconnect()
  }, [margem])
  return [ref, visto] as const
}

/* Aparece devagar, subindo pouco. */
function Surge({ children, atraso = 0, className = '' }: { children: ReactNode; atraso?: number; className?: string }) {
  const [ref, visto] = useVisto<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-700 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${visto ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} ${className}`}
      style={{ transitionDelay: `${atraso}ms` }}
    >
      {children}
    </div>
  )
}

/* Título que sobe de dentro de uma "cortina" (máscara). */
function Revela({ children, atraso = 0, className = '' }: { children: ReactNode; atraso?: number; className?: string }) {
  const [ref, visto] = useVisto<HTMLSpanElement>()
  return (
    <span ref={ref} className={`block overflow-hidden pb-[0.12em] ${className}`}>
      <span
        className={`block transition-transform duration-1000 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${visto ? 'translate-y-0' : 'translate-y-[110%]'}`}
        style={{ transitionDelay: `${atraso}ms` }}
      >
        {children}
      </span>
    </span>
  )
}

/* Imagem que anda um pouco mais devagar que a rolagem (profundidade). */
function Profundidade({ children, forca = 50, className = '' }: { children: ReactNode; forca?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const mover = () => {
      raf = 0
      const r = el.parentElement!.getBoundingClientRect()
      const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight // -1..1 perto do centro
      el.style.transform = `translate3d(0, ${(p * forca).toFixed(1)}px, 0) scale(1.12)`
    }
    const pedir = () => { if (!raf) raf = requestAnimationFrame(mover) }
    mover()
    addEventListener('scroll', pedir, { passive: true })
    return () => { removeEventListener('scroll', pedir); cancelAnimationFrame(raf) }
  }, [forca])
  return <div ref={ref} className={`absolute inset-0 will-change-transform ${className}`}>{children}</div>
}

/* Logo OFICIAL do WhatsApp (o mesmo desenho do FAQ e da landing). O balão
   desenhado à mão que estava aqui parecia genérico (Eduardo, 25/10). */
function LogoWhatsApp({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#fff" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

/* Link secundário: texto com sublinhado dourado que cresce. */
function Sublinhado({ href, children, cor, externo = false }: { href: string; children: ReactNode; cor: string; externo?: boolean }) {
  const cls = `${SANS} group relative inline-flex w-fit items-center gap-2 whitespace-nowrap pb-1 text-[15px] font-semibold`
  const conteudo = (
    <>
      {children}
      <Icone nome="seta" cor={cor} className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1" />
      <span className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-100 transition-transform sm:scale-x-[.35] duration-700 group-hover:scale-x-100" style={{ background: cor }} />
    </>
  )
  return externo ? <a href={href} target="_blank" rel="noopener" className={cls} style={{ color: TINTA }}>{conteudo}</a> : <a href={href} className={cls} style={{ color: TINTA }}>{conteudo}</a>
}

/* 25/10 · Eduardo: "Como chegar" deixa a cliente escolher o app (Google Maps,
   Waze ou o Mapas da Apple, esse só no iPhone/Mac). Abre a lista ali embaixo. */
function ComoChegar({ lugar, nome, cor }: { lugar: string; nome: string; cor: string }) {
  const [aberto, setAberto] = useState(false)
  const [apple, setApple] = useState(false)
  useEffect(() => setApple(/iPhone|iPad|Macintosh/.test(navigator.userAgent)), [])
  const ll = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(lugar) ? lugar : null
  const q = encodeURIComponent(lugar)
  const apps = [
    { nome: 'Google Maps', href: `https://www.google.com/maps/dir/?api=1&destination=${q}` },
    { nome: 'Waze', href: ll ? `https://waze.com/ul?ll=${ll}&navigate=yes` : `https://waze.com/ul?q=${q}&navigate=yes` },
    ...(apple ? [{ nome: 'Mapas da Apple', href: `https://maps.apple.com/?daddr=${q}&q=${encodeURIComponent(nome)}` }] : []),
  ]
  return (
    <div>
      <button type="button" onClick={() => setAberto((a) => !a)} aria-expanded={aberto} className={`${SANS} group relative inline-flex w-fit items-center gap-2 whitespace-nowrap pb-1 text-[15px] font-semibold`} style={{ color: TINTA }}>
        Como chegar
        <Icone nome="seta" cor={cor} className={`h-3.5 w-3.5 transition-transform duration-500 ${aberto ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
        <span className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-100 transition-transform duration-700 sm:scale-x-[.35] sm:group-hover:scale-x-100" style={{ background: cor }} />
      </button>
      {aberto && (
        <div className="mt-4 flex flex-wrap gap-2.5">
          {apps.map((a) => (
            <a key={a.nome} href={a.href} target="_blank" rel="noopener" className={`${SANS} rounded-full border px-4 py-2.5 text-[14px] font-semibold transition-colors hover:bg-white`} style={{ borderColor: `${cor}66`, color: TINTA }}>
              {a.nome}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function BotaoAgendar({ href, children = 'Agendar atendimento', className = '' }: { href: string; children?: ReactNode; className?: string }) {
  return (
    <Link href={href} className={`${SANS} group relative inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-full px-8 py-4 text-[16px] font-semibold text-white transition-[transform,background] duration-300 hover:-translate-y-0.5 hover:bg-black ${className}`} style={{ background: TINTA }}>
      <span className="relative">{children}</span>
      <Icone nome="seta" cor="#fff" className="relative h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
    </Link>
  )
}

/* Entrada: o monograma da logo surge com brilho dourado. Só na 1ª visita da sessão, < 1 s. */
function Entrada({ monograma }: { monograma?: string }) {
  const [fase, setFase] = useState<'on' | 'saindo' | 'off'>('on')
  useEffect(() => {
    let visto = false
    try { visto = sessionStorage.getItem('vitrine-entrada') === '1'; sessionStorage.setItem('vitrine-entrada', '1') } catch {}
    if (visto || !monograma || matchMedia('(prefers-reduced-motion: reduce)').matches) { setFase('off'); return }
    const a = setTimeout(() => setFase('saindo'), 850)
    const b = setTimeout(() => setFase('off'), 1450)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [monograma])
  if (fase === 'off' || !monograma) return null
  return (
    <div aria-hidden className={`fixed inset-0 z-[60] flex items-center justify-center transition-opacity duration-500 ${fase === 'saindo' ? 'opacity-0' : 'opacity-100'}`} style={{ background: CREME }}>
      <div className="relative h-28 w-24 animate-[surgeMono_.9s_cubic-bezier(.16,1,.3,1)_both]">
        <Image src={monograma} alt="" fill sizes="96px" className="object-contain" priority />
        <span className="absolute inset-0 animate-[brilhoMono_1.1s_ease-in-out_.2s_both] bg-[linear-gradient(105deg,transparent_35%,rgba(255,255,255,.95)_50%,transparent_65%)] bg-[length:250%_100%] mix-blend-screen" style={{ WebkitMaskImage: `url(${monograma})`, maskImage: `url(${monograma})`, WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' }} />
      </div>
    </div>
  )
}

/* Logo que sobe: começa grande na abertura e, com a rolagem, vai encolhendo
   até o lugar dela no topo fixo. Um elemento fixo só, posicionado entre as
   duas "vagas" (abertura e topo) conforme o quanto a página rolou. */
function LogoQueSobe({ src, alt, vagaTopo, vagaAbertura }: { src: string; alt: string; vagaTopo: RefObject<HTMLElement | null>; vagaAbertura: RefObject<HTMLElement | null> }) {
  const ref = useRef<HTMLAnchorElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    let medida: { top0: number; left0: number; escala0: number; top1: number; left1: number } | null = null
    const medir = () => {
      const t = vagaTopo.current?.getBoundingClientRect()
      const a = vagaAbertura.current?.getBoundingClientRect()
      if (!t || !a || !t.width) return
      el.style.width = `${t.width}px`
      el.style.height = `${t.height}px`
      // celular: sem vaga na abertura, a logo já nasce pequena no topo
      if (!a.width) { medida = { top0: t.top, left0: t.left, escala0: 1, top1: t.top, left1: t.left }; return }
      medida = { top0: a.top + scrollY, left0: a.left, escala0: a.width / t.width, top1: t.top, left1: t.left }
    }
    const mover = () => {
      raf = 0
      if (!medida) return
      const { top0, left0, escala0, top1, left1 } = medida
      const p = Math.min(1, Math.max(0, scrollY / Math.max(1, top0 - top1)))
      const top = top0 - scrollY > top1 ? top0 - scrollY : top1
      const left = left0 + (left1 - left0) * p
      const escala = escala0 + (1 - escala0) * p
      el.style.transform = `translate3d(${left}px, ${top}px, 0) scale(${escala})`
      el.style.opacity = '1'
    }
    const pedir = () => { if (!raf) raf = requestAnimationFrame(mover) }
    const remedir = () => { medir(); mover() }
    remedir()
    addEventListener('scroll', pedir, { passive: true })
    addEventListener('resize', remedir)
    return () => { removeEventListener('scroll', pedir); removeEventListener('resize', remedir); cancelAnimationFrame(raf) }
  }, [vagaTopo, vagaAbertura])
  return (
    <a ref={ref} href="#topo" aria-label={alt} className="fixed left-0 top-0 z-50 block origin-top-left opacity-0 will-change-transform">
      <Image src={src} alt={alt} fill sizes="(min-width:640px) 240px, 182px" className="object-contain object-left" priority />
    </a>
  )
}

function VideoAbertura({ mp4, poster }: { mp4?: string; poster: string }) {
  const [pronto, setPronto] = useState(false)
  return (
    <>
      <Image src={poster} alt="" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover object-[50%_32%] lg:object-center" priority />
      {mp4 && (
        <video className={`absolute inset-0 h-full w-full object-cover object-[50%_32%] lg:object-center transition-opacity duration-[1500ms] ${pronto ? 'opacity-100' : 'opacity-0'}`} src={mp4} poster={poster} muted loop playsInline autoPlay preload="metadata" onCanPlay={() => setPronto(true)} />
      )}
    </>
  )
}

function CartaoVideo({ v, cor, ativo, onAtivar }: { v: { src: string; poster: string; titulo: string }; cor: string; ativo: boolean; onAtivar: () => void }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (ativo) el.play().catch(() => {})
    else el.pause()
  }, [ativo])
  return (
    <figure className="w-[64vw] max-w-[290px] shrink-0 snap-start sm:w-[260px] sm:snap-center">
      <button onClick={onAtivar} className="group relative block aspect-[9/16] w-full overflow-hidden rounded-t-[999px] rounded-b-[6px] bg-[#EFE8DC]" aria-label={`Assistir: ${v.titulo}`}>
        <video ref={ref} src={v.src} poster={v.poster} playsInline loop muted preload="none" className="h-full w-full object-cover transition-transform duration-[1500ms] group-hover:scale-105" />
        {!ativo && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/80 bg-white/20 backdrop-blur-sm transition-transform duration-500 group-hover:scale-110">
              <Icone nome="play" cor="#fff" className="ml-0.5 h-5 w-5" />
            </span>
          </span>
        )}
      </button>
      <figcaption className={`${SANS} mt-4 text-center text-[15px] font-medium`} style={{ color: SUAVE }}>
        <span style={{ color: cor }}>—</span> {v.titulo}
      </figcaption>
    </figure>
  )
}

/* 26/10 · com o pino da clínica (coords), o mapa já aparece pintado na cor da
   marca, sem toque (referência Marisa Vaz). Só baixa quando a seção chega perto
   da tela. Sem coords, segue o mapa do Google no toque. */
const MapaBege = dynamic(() => import('./MapaBege'), { ssr: false })

function MapaDaClinica({ coords, nome, rua, cor }: { coords: string; nome: string; rua: string; cor: string }) {
  const caixa = useRef<HTMLDivElement>(null)
  const [perto, setPerto] = useState(false)
  useEffect(() => {
    const el = caixa.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setPerto(true), io.disconnect()), { rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const [lat, lng] = coords.split(',').map(Number)
  return (
    <div ref={caixa} className="relative aspect-[4/3] overflow-hidden rounded-[24px] border shadow-[0_30px_60px_-36px_rgba(42,37,32,.45)] sm:aspect-auto sm:h-full sm:min-h-[420px] sm:rounded-[28px]" style={{ borderColor: LINHA, background: '#F3EDE3' }}>
      {perto && <MapaBege lat={lat} lng={lng} cor={cor} />}
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords)}`}
        target="_blank"
        rel="noopener"
        className="group absolute inset-x-3 bottom-3 flex items-center justify-between gap-4 rounded-2xl bg-white/95 px-5 py-4 shadow-[0_12px_30px_-16px_rgba(42,37,32,.4)] backdrop-blur sm:inset-x-4 sm:bottom-4"
      >
        <span className="min-w-0">
          <span className={`${SERIF} block truncate text-[17px] font-medium`} style={{ color: TINTA }}>{nome}</span>
          <span className="mt-0.5 block truncate text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: SUAVE }}>{rua}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: cor }}>
          Abrir <Icone nome="seta" cor={cor} className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1" />
        </span>
      </a>
    </div>
  )
}

function Mapa({ consulta, cor }: { consulta: string; cor: string }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="relative aspect-[16/10] overflow-hidden border sm:aspect-auto sm:h-full sm:min-h-[360px]" style={{ borderColor: LINHA, background: '#F2ECE2' }}>
      {aberto ? (
        <iframe title="Mapa da clínica" src={`https://www.google.com/maps?q=${encodeURIComponent(consulta)}&output=embed`} className="absolute inset-0 h-full w-full grayscale-[.35] sepia-[.15]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      ) : (
        <button onClick={() => setAberto(true)} className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ backgroundImage: MARMORE }}>
          <span className="flex h-16 w-16 items-center justify-center rounded-full border bg-white/70" style={{ borderColor: `${cor}66` }}>
            <Icone nome="pino" cor={cor} className="h-7 w-7" />
          </span>
          <span className={`${SANS} text-[15px] font-semibold`} style={{ color: cor }}>Toque pra ver o mapa</span>
        </button>
      )}
    </div>
  )
}

/** quem chegou por link de influencer/campanha (?cupom=) ou de indicação (?ref=):
    o aviso aparece na abertura e o parâmetro segue em todo botão de agendar. */
export type Chegada = { query: string; cupom?: { code: string; texto: string }; indicacao?: string }

export default function Vitrine({ d, chegada }: { d: DadosVitrine; chegada?: Chegada | null }) {
  const c = d.conteudo
  const [aba, setAba] = useState(d.categorias[0]?.nome ?? '')
  const [videoAtivo, setVideoAtivo] = useState<number | null>(null)
  const [rolou, setRolou] = useState(false)
  const [whatsNoCelular, setWhatsNoCelular] = useState(false)
  const vagaTopo = useRef<HTMLAnchorElement>(null)
  const vagaAbertura = useRef<HTMLDivElement>(null)

  useEffect(() => {
    /* 25/10 · celular: o WhatsApp só aparece quando a seção "A clínica" entra
       na tela (Eduardo: "só mais lá pra baixo"). Até ali a cliente está vendo
       serviços e pacotes, e o único botão é o Agendar. */
    const onScroll = () => {
      setRolou(scrollY > 40)
      const clinica = document.getElementById('clinica')
      setWhatsNoCelular(!!clinica && clinica.getBoundingClientRect().top < innerHeight * 0.8)
    }
    onScroll()
    addEventListener('scroll', onScroll, { passive: true })
    return () => removeEventListener('scroll', onScroll)
  }, [])

  // leva o cupom/indicação junto; sem isso a cliente perdia o desconto no 1º clique
  const comChegada = (href: string) => (chegada?.query ? `${href}${href.includes('?') ? '&' : '?'}${chegada.query}` : href)
  const agendar = comChegada(`/${d.slug}/clinica/agendar`) // escolha do procedimento no visual da vitrine
  const destaque = { color: d.cor } as const
  const categoria = d.categorias.find((x) => x.nome === aba)
  // serviço que é tratamento de várias sessões → o pacote dele (preço real das N sessões)
  const pacoteDoServico = Object.fromEntries(d.pacotes.flatMap((p) => (p.sessoes?.servico ? [[p.sessoes.servico, p]] : [])))
  const whats = d.telefone ? `https://wa.me/55${d.telefone.replace(/\D/g, '')}` : null
  const nomeCurto = d.nome.replace(/beauty clinic/i, '').trim()
  const lugar = c.mapa ? c.mapa.coords ?? `${c.mapa.consulta}${c.mapa.cidade ? `, ${c.mapa.cidade}` : ''}` : ''
  const poster = c.teaser?.poster ?? d.capa ?? ''

  return (
    <main className={`vitrine-clinica ${SANS} min-h-screen overflow-x-clip ${chegada?.cupom ? 'pb-[110px]' : 'pb-[84px]'} font-normal sm:pb-0`} style={{ background: CREME, color: TINTA }}>
      <Entrada monograma={c.monograma} />
      {c.logoDourada && <LogoQueSobe src={c.logoDourada} alt={d.nome} vagaTopo={vagaTopo} vagaAbertura={vagaAbertura} />}

      {/* Topo fixo: o Agendar nunca some */}
      <header className={`fixed inset-x-0 top-0 z-40 transition-[background,box-shadow,border-color] duration-700 ${rolou ? 'border-b backdrop-blur-xl max-sm:!bg-[#FAF7F2]' : 'border-b border-transparent'}`} style={rolou ? { background: '#FAF7F2E6', borderColor: LINHA } : undefined}>
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:h-20 sm:px-10">
          <a ref={vagaTopo} href="#topo" className="relative block h-9 w-[78px] sm:h-11 sm:w-[96px]" aria-label={d.nome}>
            {/* com logo, a imagem é a do LogoQueSobe; aqui fica só a vaga */}
            {c.logoDourada ? null : <span className={`${SERIF} text-[15px] font-medium`}>{nomeCurto}</span>}
          </a>
          <nav className="hidden items-center gap-8 text-[15px] font-medium lg:flex" style={{ color: TINTA }}>
            {[['#servicos', 'Serviços'], ['#videos', 'Vídeos'], ['#clinica', 'A clínica'], ['#equipe', 'Equipe'], ['#onde', 'Onde estamos']].map(([h, t]) => (
              <a key={h} href={h} className="transition-opacity hover:opacity-60">{t}</a>
            ))}
          </nav>
          <Link href={agendar} className="hidden rounded-full px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-black sm:block sm:px-6 sm:py-3" style={{ background: TINTA }}>
            Agendar
          </Link>
        </div>
      </header>

      {/* Abertura: vídeo do espaço em tela cheia (celular) / painel ao lado (computador) */}
      {/* 25/10 · Eduardo: no celular o quadro do vídeo fica CENTRALIZADO (margem dos
          dois lados, 4 cantos redondos); tablet segue vazando à direita. */}
      {/* Celular (Eduardo 24/10, versão B "texto primeiro"): a abertura inteira
          cabe na tela, sem rolar. Mármore no fundo, logo grande centralizada
          (sobe pro topo ao rolar, igual ao computador), título e subtítulo
          centrados e o vídeo num quadro com fio branco por dentro, ocupando o
          que sobra. O tablet (sm) usa a mesma versão, maior; lg: é o computador. */}
      <section id="topo" className={`relative flex flex-col lg:grid lg:min-h-[100svh] lg:grid-cols-2 ${chegada?.cupom ? 'h-[calc(100svh-110px)]' : 'h-[calc(100svh-84px)]'} sm:h-[100svh] lg:h-auto`}>
        <div aria-hidden className="absolute inset-0 lg:hidden" style={{ backgroundImage: MARMORE }} />
        <div className="relative order-2 mx-6 mb-5 min-h-0 flex-1 overflow-hidden rounded-[28px] shadow-[0_24px_48px_-28px_rgba(42,37,32,0.45)] sm:mx-0 sm:mb-10 sm:ml-32 sm:rounded-none sm:rounded-l-[40px] lg:order-2 lg:mx-0 lg:mb-0 lg:h-auto lg:flex-none lg:overflow-visible lg:rounded-none lg:shadow-none">
          {poster && <VideoAbertura mp4={c.teaser?.mp4} poster={poster} />}
          <div aria-hidden className="pointer-events-none absolute -right-px bottom-3 left-3 top-3 hidden rounded-l-[20px] border sm:block sm:bottom-4 sm:left-4 sm:top-4 sm:rounded-l-[30px] lg:hidden" style={{ borderColor: '#ffffffa6' }} />
          <div aria-hidden className="absolute inset-0 hidden lg:block" style={{ background: `linear-gradient(to right, ${CREME} 0%, transparent 22%)` }} />
          <div aria-hidden className="pointer-events-none absolute inset-5 hidden border lg:block" style={{ borderColor: '#ffffff80' }} />
        </div>

        <div className="relative order-1 shrink-0 px-6 pb-5 pt-12 sm:px-12 sm:pb-8 sm:pt-[104px] lg:mt-0 lg:text-left lg:order-1 lg:flex lg:flex-col lg:justify-center lg:px-16 lg:pb-0 lg:pt-20 xl:px-24">
          <div aria-hidden className="absolute inset-0 hidden lg:block" style={{ backgroundImage: MARMORE }} />
          {c.monograma && (
            <div aria-hidden className="pointer-events-none absolute -left-10 top-1/2 hidden h-[78%] w-[62%] -translate-y-1/2 opacity-[0.07] lg:block">
              <Image src={c.monograma} alt="" fill sizes="40vw" className="object-contain" />
            </div>
          )}
          <div className="relative max-w-xl">
            {c.logoDourada && <div ref={vagaAbertura} aria-hidden className="mb-4 h-[clamp(44px,7.6svh,64px)] w-[clamp(100px,17svh,142px)] sm:mb-5 sm:h-[84px] sm:w-[186px] lg:mb-10 lg:h-[110px] lg:w-[240px]" />}
            {/* cidade: identifica onde fica, sem virar o assunto do título */}
            {c.local && (
              <p className="-mt-1 mb-4 flex items-center gap-1.5 text-[13px] font-semibold sm:mb-6 sm:text-[14px] lg:-mt-4 lg:mb-7" style={{ color: SUAVE }}>
                <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke={d.cor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
                {c.local}
              </p>
            )}
            <h1 className={`${SERIF} text-[clamp(28px,4.9svh,40px)] font-medium leading-[1.06] [text-wrap:balance] tracking-[-0.025em] sm:text-[50px] xl:text-[58px]`}>
              <Revela atraso={150}>{c.titulo.antes}</Revela>
              <Revela atraso={300}><span style={destaque}>{c.titulo.destaque}</span>{c.titulo.depois ? ` ${c.titulo.depois}` : ''}{c.titulo.ex && <Selo />}</Revela>
            </h1>
            <Surge atraso={500}>
              <p className="mt-3 max-w-md text-[15px] leading-[1.6] [text-wrap:balance] sm:mt-5 sm:max-w-lg sm:text-[17px] sm:leading-[1.7] lg:mt-6 lg:leading-[1.75]" style={{ color: SUAVE }}>
                <T x={c.subtitulo} />
              </p>
            </Surge>
            {/* provas curtas: por que confiar, já na primeira tela */}
            {c.selos && c.selos.length > 0 && (
              <Surge atraso={580}>
                {/* 25/10 · celular sem selos: no iPhone o vídeo virava uma faixa de 144px, e
                    "A avaliação é indispensável" já abre a seção A clínica. Tablet/computador seguem. */}
                <ul className="mt-3 hidden flex-col items-start gap-0.5 sm:mt-5 sm:flex sm:gap-1 lg:mt-7 lg:gap-2.5">
                  {c.selos.map((s) => (
                    <li key={s} className="flex items-center gap-2 text-[12.5px] font-semibold sm:text-[14px] lg:text-[15px] lg:!text-[#2A2520]" style={{ color: d.cor }}>
                      <svg aria-hidden viewBox="0 0 24 24" className="hidden h-4 w-4 shrink-0 lg:block" fill="none" stroke={d.cor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                      {s}
                    </li>
                  ))}
                </ul>
              </Surge>
            )}
            {(chegada?.cupom || chegada?.indicacao) && (
              <Surge atraso={580}>
                <div className="mt-5 flex items-start gap-3.5 rounded-2xl border px-4 py-3.5 text-left sm:mt-7" style={{ background: '#FFFFFF', borderColor: d.cor }}>
                  <svg aria-hidden viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke={d.cor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    {chegada.cupom
                      ? <><path d="M20 12v8H4v-8" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z" /></>
                      : <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></>}
                  </svg>
                  <p className="text-[15px] leading-snug">
                    {chegada.cupom ? (
                      <>
                        <span className="font-semibold">Cupom {chegada.cupom.code}: {chegada.cupom.texto}.</span>{' '}
                        <span style={{ color: SUAVE }}>Já vai aplicado quando você agendar.</span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold">Indicação de {chegada.indicacao}.</span>{' '}
                        <span style={{ color: SUAVE }}>Que bom ter você aqui.</span>
                      </>
                    )}
                  </p>
                </div>
              </Surge>
            )}
            {/* no celular o Agendar é o da barra fixa e a abertura respira sem o Ver serviços */}
            <Surge atraso={650} className="mt-9 hidden items-start gap-6 sm:mt-7 sm:flex sm:flex-row sm:items-center sm:gap-10 lg:mt-9">
              <BotaoAgendar href={agendar} className="w-full sm:w-auto" />
              <Sublinhado href="#servicos" cor={d.cor}>Ver serviços</Sublinhado>
            </Surge>
          </div>
        </div>
      </section>

      {/* Serviços: carta de spa */}
      <section id="servicos" className="relative scroll-mt-20 border-y px-6 py-10 sm:px-10 sm:py-24 lg:py-36" style={{ borderColor: LINHA, backgroundImage: MARMORE, backgroundColor: '#FDFBF8' }}>
        <div className="max-w-4xl lg:ml-[9%] xl:ml-[12%]">
          <h2 className={`${SERIF} text-[30px] font-medium leading-[1.08] tracking-[-0.02em] sm:text-[50px]`}>
            <Revela>O que você <span style={destaque}>procura hoje?</span></Revela>
          </h2>

          {/* Categorias em pílula: são botões de ação, precisam parecer clicáveis
              (Eduardo 22/10). Escolhida = marrom cheio, igual ao Agendar. */}
          <div className="-mx-6 mt-7 overflow-x-auto px-6 py-1 [scrollbar-width:none] sm:mx-0 sm:mt-12 sm:px-0">
            <div className="flex w-max gap-2.5 sm:w-full sm:flex-wrap sm:gap-3">
              {d.categorias.map((x) => {
                const ativa = x.nome === aba
                return (
                  <button
                    key={x.nome}
                    onClick={() => setAba(x.nome)}
                    aria-pressed={ativa}
                    className="whitespace-nowrap rounded-full border px-5 py-2.5 text-[15px] font-semibold transition-[background,color,border-color,transform] duration-300 hover:-translate-y-0.5 sm:px-6 sm:py-3"
                    style={ativa ? { background: TINTA, borderColor: TINTA, color: '#fff' } : { background: '#fff', borderColor: '#D9CEBD', color: TINTA }}
                  >
                    {x.nome}
                  </button>
                )
              })}
            </div>
          </div>

          {c.categorias?.[aba] && (
            <div key={`f-${aba}`} className="mt-7 max-w-2xl animate-[entra_.8s_cubic-bezier(.16,1,.3,1)_both] sm:mt-14">
              <p className={`${SERIF} text-[20px] leading-snug tracking-[-0.01em] [text-wrap:balance] sm:text-[28px]`}>“{c.categorias[aba].frase}”</p>
              {/* celular: só a frase; o parágrafo empurrava o 1º serviço pra 2ª tela */}
              {c.categorias[aba].texto && <p className="mt-3 hidden text-[15px] leading-relaxed sm:block" style={{ color: SUAVE }}>{c.categorias[aba].texto}</p>}
            </div>
          )}

          {/* 24/10 · celular: cartão em 2 andares (foto + nome na largura toda,
              descrição em 2 linhas, e "tempo · a partir de R$ X →" embaixo). A
              coluna fixa de preço espremia nome e descrição em ~150 px: nome
              longo virava 7 linhas e a aba de micro passava de 3.600 px. */}
          <ul key={aba} className="mt-5 sm:mt-12">
            {categoria?.servicos.filter((s) => !s.avaliacao).map((s, i) => (
              <li key={s.id} className="animate-[entra_.7s_cubic-bezier(.16,1,.3,1)_both]" style={{ animationDelay: `${i * 50}ms` }}>
                <Link href={comChegada(`/${d.slug}/agendar?servicos=${s.id}`)} className="group flex items-start gap-3.5 border-b py-4 sm:items-center sm:gap-4 sm:py-5" style={{ borderColor: LINHA }}>
                  {/* foto do catálogo dela; sem foto, o monograma no lugar (a coluna não pula) */}
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl sm:h-20 sm:w-20 sm:rounded-2xl" style={{ background: '#F6F0E6' }}>
                    {s.foto ? (
                      <Image src={s.foto} alt={s.nome} fill sizes="80px" className="object-cover transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-110" />
                    ) : c.monograma ? (
                      <Image src={c.monograma} alt="" fill sizes="80px" className="object-contain p-4 opacity-60" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`${SERIF} line-clamp-2 text-[17px] font-medium leading-snug tracking-[-0.01em] sm:line-clamp-none sm:text-[21px]`}>{s.nome}</span>
                    {s.descricao && <span className="mt-1 line-clamp-2 max-w-xl text-[13.5px] leading-relaxed sm:line-clamp-none sm:text-[14px]" style={{ color: SUAVE }}>{s.descricao}</span>}
                    {s.duracao ? <span className="mt-1 hidden text-[13px] sm:block" style={{ color: '#A39886' }}>{tempo(s.duracao)}</span> : null}
                    {/* celular: tempo e preço numa linha, com a seta */}
                    <span className="mt-2 flex items-center justify-between gap-3 sm:hidden">
                      <span className="text-[13px]" style={{ color: '#A39886' }}>
                        {s.duracao ? `${tempo(s.duracao)} · ` : ''}
                        {!s.preco && pacoteDoServico[s.id]
                          ? <span className="font-semibold" style={{ color: TINTA }}>{pacoteDoServico[s.id].sessoes!.qtd} sessões · {brl(pacoteDoServico[s.id].preco)}</span>
                          : s.preco
                            ? <>a partir de <span className="text-[15px] font-semibold" style={{ color: TINTA }}>{brl(s.preco)}</span></>
                            : 'Sob avaliação'}
                      </span>
                      <Icone nome="seta" cor={TINTA} className="h-4 w-4 shrink-0" />
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-right sm:block">
                    {!s.preco && pacoteDoServico[s.id] ? (
                      <>
                        <span className="block text-[12px]" style={{ color: SUAVE }}>{pacoteDoServico[s.id].sessoes!.qtd} sessões</span>
                        <span className="block text-[18px] font-semibold">{brl(pacoteDoServico[s.id].preco)}</span>
                      </>
                    ) : s.preco ? (
                      <>
                        <span className="block text-[12px]" style={{ color: SUAVE }}>a partir de</span>
                        <span className="block text-[18px] font-semibold">{brl(s.preco)}</span>
                      </>
                    ) : (
                      <span className="text-[15px]" style={{ color: SUAVE }}>Sob avaliação</span>
                    )}
                  </span>
                  <span className="hidden shrink-0 rounded-full border px-4 py-2 text-[14px] font-semibold transition-colors group-hover:bg-[#2A2520] group-hover:text-white sm:inline-block" style={{ borderColor: TINTA }}>Agendar</span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Avaliação: porta de entrada, não "serviço sem preço" no meio da
              lista. Texto dela (Dce6N0DJv3B). */}
          {categoria && categoria.servicos.some((s) => s.avaliacao) && (
            <div key={`av-${aba}`} className="mt-7 animate-[entra_.8s_cubic-bezier(.16,1,.3,1)_both] rounded-3xl border bg-white p-5 sm:mt-10 sm:p-7" style={{ borderColor: LINHA }}>
              <p className={`${SERIF} text-[21px] leading-snug sm:text-[24px]`}>A avaliação é indispensável</p>
              <p className="mt-1.5 text-[14px] leading-relaxed sm:text-[15px]" style={{ color: SUAVE }}>
                Antes de qualquer procedimento, avaliamos sua expectativa para entregar um resultado seguro e perfeito pra você.
              </p>
              <ul className="mt-3">
                {categoria.servicos.filter((s) => s.avaliacao).map((s) => (
                  <li key={s.id}>
                    <Link href={comChegada(`/${d.slug}/agendar?servicos=${s.id}`)} className="group flex items-center justify-between gap-3 border-t py-3 text-[14px] font-semibold sm:text-[15px]" style={{ borderColor: LINHA }}>
                      <span className="min-w-0">{s.nome}{s.duracao ? <span className="ml-1.5 font-normal" style={{ color: '#A39886' }}>· {tempo(s.duracao)}</span> : null}</span>
                      <span className="flex shrink-0 items-center gap-1.5" style={{ color: d.cor }}>Agendar <Icone nome="seta" cor={d.cor} className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" /></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-7 max-w-xl text-[13px] [text-wrap:balance] sm:mt-8" style={{ color: SUAVE }}>
            Em alguns procedimentos o valor muda conforme a profissional. Você vê o valor de cada uma na hora de agendar.
          </p>
          {/* celular: o Agendar é o da barra fixa */}
          <Surge className="mt-14 hidden sm:block"><BotaoAgendar href={agendar} /></Surge>
        </div>
      </section>

      {/* Pacotes: os que a clínica cadastrou no sistema, com o preço real.
          Combo se fecha com a clínica (WhatsApp); tratamento de várias sessões
          de um serviço só dá pra agendar a 1ª direto. */}
      {d.pacotes.length > 0 && (
        <section id="pacotes" className="scroll-mt-20 border-b px-6 py-10 sm:px-10 sm:py-24 lg:py-32" style={{ borderColor: LINHA }}>
          <div className="mx-auto max-w-6xl">
            <h2 className={`${SERIF} text-[30px] font-medium leading-[1.08] tracking-[-0.02em] sm:text-[50px]`}>
              <Revela>Pacotes e <span style={destaque}>tratamentos</span></Revela>
            </h2>
            {/* 26/10 · Eduardo: "melhorar a apresentação, principalmente no mobile".
                Celular: lista de cartões compactos (foto ao lado, tudo à vista, sem
                carrossel e sem cartão de 800 px). Tablet/computador: o 1º pacote em
                destaque deitado ocupando 2 colunas (assimetria), os outros alinhados
                na grade, sem escada. Selo "Economize" saiu de cima da foto (cobria a
                etiqueta) e foi pro lado do preço. */}
            <div className="mt-8 grid gap-3 sm:mt-14 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {d.pacotes.map((p, i) => {
                const grande = i === 0 && d.pacotes.length > 2
                const etiqueta = p.sessoes ? `Tratamento · ${p.sessoes.qtd} sessões` : `Pacote · ${p.itens.length} ${p.itens.length === 1 ? 'procedimento' : 'procedimentos'}`
                const economia = p.separado && p.separado > p.preco ? p.separado - p.preco : 0
                return (
                <Surge key={p.id} atraso={i * 90} className={`h-full ${grande ? 'sm:col-span-2' : ''}`}>
                  <article className={`group flex h-full overflow-hidden rounded-2xl border bg-white transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-1 hover:shadow-[0_22px_44px_-24px_rgba(74,58,32,.38)] ${grande ? 'sm:flex-row' : 'sm:flex-col'}`} style={{ borderColor: LINHA }}>
                    {/* foto: miniatura ao lado no celular; em cima (ou metade, no destaque) no computador */}
                    <div
                      className={`relative w-[104px] shrink-0 overflow-hidden ${grande ? 'sm:w-[46%]' : 'sm:h-52 sm:w-full'} ${p.foto ? '' : 'flex items-center justify-center sm:hidden'}`}
                      style={{ background: '#F6F0E6', backgroundImage: MARMORE }}
                    >
                      {p.foto ? (
                        <Image src={p.foto} alt={p.nome} fill sizes="(min-width:1024px) 520px, (min-width:640px) 50vw, 104px" className="object-cover transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-105" />
                      ) : (
                        <Icone nome={iconeDoProcedimento(p.nome, ...p.itens.map((it) => it.nome))} cor={d.cor} className="h-9 w-9" />
                      )}
                    </div>
                    <div className={`flex min-w-0 flex-1 flex-col p-4 sm:p-7 ${grande ? 'lg:p-10' : 'sm:pt-6'}`}>
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] sm:text-[12px]" style={{ color: d.cor }}>{etiqueta}</p>
                      <h3 className={`${SERIF} mt-1.5 font-medium leading-tight tracking-[-0.01em] sm:mt-3 ${grande ? 'text-[19px] sm:text-[30px]' : 'text-[19px] sm:text-[23px]'}`}>{p.sessoes ? p.nome.replace(/\s*[-–—]\s*\d+\s*sess(ões|oes)\s*$/i, '') : p.nome}</h3>
                      {p.descricao && <p className={`mt-1.5 line-clamp-2 text-[13px] leading-relaxed sm:mt-3 sm:line-clamp-4 sm:text-[14px] ${p.sessoes ? '' : 'max-sm:hidden'}`} style={{ color: SUAVE }}>{p.descricao}</p>}
                      {!p.sessoes && (
                        <>
                          {/* celular: os itens numa linha só */}
                          <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug sm:hidden" style={{ color: SUAVE }}>
                            {p.itens.map((it) => `${it.qtd > 1 ? `${it.qtd}x ` : ''}${it.nome}`).join(' + ')}
                          </p>
                          <ul className="mt-5 hidden space-y-3 sm:block">
                            {p.itens.map((it) => (
                              <li key={it.nome} className="flex items-start gap-3 text-[15px] leading-snug">
                                <span className="mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: '#F6F0E6' }}>
                                  <Icone nome={iconeDoProcedimento(it.nome)} cor={d.cor} className="h-3.5 w-3.5" />
                                </span>
                                <span>{it.qtd > 1 ? `${it.qtd}x ` : ''}{it.nome}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      <div className="mt-auto pt-3 sm:pt-7">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          {economia > 0 && <span className="text-[13px] line-through sm:text-[14px]" style={{ color: SUAVE }}>{brl(p.separado!)}</span>}
                          <span className="text-[20px] font-bold tracking-[-0.02em] sm:text-[30px]">{brl(p.preco)}</span>
                          {economia > 0 && (
                            <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white sm:px-2.5 sm:text-[12px]" style={{ background: d.cor }}>
                              Economize {brl(economia)}
                            </span>
                          )}
                        </div>
                        <div className={`mt-3 flex items-center gap-4 sm:mt-5 ${grande ? 'sm:flex-row' : 'sm:flex-col sm:items-stretch sm:gap-3'}`}>
                          {/* tudo leva pro agendamento: tratamento marca a 1ª sessão; combo marca
                              os serviços juntos pelo preço do pacote (o servidor confere) */}
                          <Link
                            href={comChegada(p.sessoes?.servico ? `/${d.slug}/agendar?servicos=${p.sessoes.servico}` : `/${d.slug}/agendar?pacote=${p.id}`)}
                            className={`whitespace-nowrap rounded-full px-5 py-2.5 text-center text-[14px] font-semibold text-white transition-colors hover:bg-black sm:py-3 sm:text-[15px] ${grande ? 'sm:px-8' : ''}`}
                            style={{ background: TINTA }}
                          >
                            {p.sessoes?.servico ? 'Agendar a 1ª sessão' : 'Agendar este pacote'}
                          </Link>
                          {whats && (
                            <a href={`${whats}?text=${encodeURIComponent(`Olá! Tenho uma dúvida sobre o pacote ${p.nome}.`)}`} target="_blank" rel="noopener" className="hidden text-center text-[14px] font-medium underline-offset-4 hover:underline sm:block" style={{ color: SUAVE }}>
                              Dúvidas? Fale no WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                </Surge>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Destaque: foto grande */}
      {c.destaque && (
        <section className="relative lg:grid lg:min-h-[92svh] lg:grid-cols-2">
          <div className="relative mr-14 h-[46svh] overflow-hidden rounded-r-[28px] sm:mr-0 sm:h-[78svh] sm:rounded-none lg:h-auto">
            <Profundidade forca={60}>
              <Image src={c.destaque.foto} alt={c.destaque.sobre} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
            </Profundidade>
            <div aria-hidden className="pointer-events-none absolute inset-5 border" style={{ borderColor: '#ffffff70' }} />
          </div>
          <div className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-20 lg:px-20 xl:px-28">
            <h2 className={`${SERIF} text-[30px] font-medium leading-[1.08] tracking-[-0.02em] sm:text-[52px]`}>
              <Revela>{c.destaque.titulo}</Revela>
              <Revela atraso={120}><span style={destaque}>{c.destaque.destaque}</span></Revela>
            </h2>
            <Surge atraso={200}><p className="mt-4 max-w-md text-[15px] leading-[1.7] sm:mt-7 sm:text-[17px] sm:leading-[1.8]" style={{ color: SUAVE }}>{c.destaque.texto}</p></Surge>
            <Surge atraso={300} className="mt-7 sm:mt-10"><BotaoAgendar href={agendar}>{c.destaque.botao}</BotaoAgendar></Surge>
          </div>
        </section>
      )}

      {/* Vídeos */}
      {c.videos.length > 0 && (
        <section id="videos" className="scroll-mt-20 border-t py-10 sm:py-24 lg:py-36" style={{ borderColor: LINHA }}>
          <div className="px-6 sm:px-10 lg:px-16">
            <h2 className={`${SERIF} text-[30px] font-medium leading-[1.08] tracking-[-0.02em] sm:text-[50px]`}>
              <Revela>Veja de perto <span style={destaque}>o nosso trabalho</span></Revela>
            </h2>
          </div>
          <div className="mt-7 sm:mt-16 flex snap-x snap-mandatory scroll-pl-6 gap-5 overflow-x-auto px-6 pb-2 [scrollbar-width:none] sm:scroll-pl-10 sm:gap-8 sm:px-10 lg:px-16">
            {c.videos.map((v, i) => (
              <Surge key={v.src} atraso={i * 120}>
                <CartaoVideo v={v} cor={d.cor} ativo={videoAtivo === i} onAtivar={() => setVideoAtivo(i)} />
              </Surge>
            ))}
          </div>
        </section>
      )}

      {/* A clínica · desceu pra depois dos vídeos (24/10): quem chega pela bio do Instagram já conhece a Ivna; primeiro o que ela faz, depois por que confiar */}
      <section id="clinica" className="relative scroll-mt-20 overflow-hidden px-6 py-10 sm:overflow-visible sm:px-10 sm:py-24 lg:py-36">
        {/* celular: monograma vazando pela direita, atrás do título */}
        {c.monograma && (
          <div aria-hidden className="pointer-events-none absolute -right-[34%] top-4 h-[300px] w-[78%] opacity-[0.07] sm:hidden">
            <Image src={c.monograma} alt="" fill sizes="80vw" className="object-contain" />
          </div>
        )}
        {/* 26/10 · assimetria alinhada: título sozinho em cima; embaixo duas colunas
            de larguras diferentes que começam na MESMA linha (antes os pilares
            flutuavam soltos). Celular: um recuo só (12%) pra frase e pilares */}
        <div className="relative mx-auto max-w-6xl">
          <h2 className={`${SERIF} text-[30px] font-medium leading-[1.08] tracking-[-0.02em] sm:text-[50px] lg:text-[64px]`}>
            <Revela>{c.proposta.titulo}</Revela>
            <Revela atraso={120}><span style={destaque}>{c.proposta.destaque}</span></Revela>
          </h2>
        <div className="mt-5 grid gap-8 sm:mt-10 sm:gap-16 lg:mt-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <Surge atraso={200}>
              <p className="max-w-lg text-[15px] leading-[1.7] max-sm:max-w-[86%] sm:text-[17px] sm:leading-[1.8]" style={{ color: SUAVE }}><T x={c.proposta.texto} /></p>
            </Surge>
            {c.frase && (
              <Surge atraso={300} className="mt-8 sm:mt-14">
                <div style={{ borderColor: d.cor2 }} className="border-l pl-7 max-sm:ml-[12%] max-sm:pl-5">
                  <p className={`${SERIF} text-[26px] leading-snug tracking-[-0.01em] sm:text-[30px]`}>“{c.frase}”</p>
                  <p className="mt-3 text-[15px] font-semibold" style={{ color: d.cor }}>{d.equipe.find((p) => p.dona)?.nome ?? nomeCurto}</p>
                </div>
              </Surge>
            )}
          </div>
          <ol className="max-sm:ml-[12%] [&>*:first-child>li]:border-t-0 [&>*:first-child>li]:pt-0">
            {c.pilares.map((p, i) => (
              <Surge key={p.titulo} atraso={i * 140}>
                <li className="grid grid-cols-[40px_1fr] gap-x-3 border-t py-5 sm:grid-cols-[48px_1fr] sm:gap-x-4 sm:py-8" style={{ borderColor: LINHA }}>
                  <span className={`${SERIF} text-[22px]`} style={{ color: d.cor }}>{ROMANOS[i]}</span>
                  <div>
                    <h3 className={`${SERIF} text-[24px] font-medium leading-tight tracking-[-0.01em]`}>{p.titulo}</h3>
                    <p className="mt-2 text-[15px] leading-[1.75]" style={{ color: SUAVE }}><T x={p.texto} /></p>
                  </div>
                </li>
              </Surge>
            ))}
          </ol>
        </div>
        </div>
      </section>

      {/* Equipe */}
      <section id="equipe" className="scroll-mt-20 border-t px-6 py-10 sm:px-10 sm:py-24 lg:py-36" style={{ borderColor: LINHA, backgroundColor: '#FDFBF8' }}>
        <div className="mx-auto max-w-6xl">
          <h2 className={`${SERIF} text-[30px] font-medium leading-[1.08] tracking-[-0.02em] sm:text-[50px]`}>
            <Revela>Quem vai <span style={destaque}>cuidar de você</span></Revela>
          </h2>
          {/* 26/10 · assimetria alinhada (a escada 0/80/24 px parecia desalinhada):
              a dona em destaque à esquerda, foto grande; as outras numa coluna
              mais estreita, em linha (foto ao lado do texto), todas no mesmo recuo.
              Celular: dona grande em cima, as outras recuadas 12% */}
          <div className="mt-8 grid gap-10 sm:mt-16 sm:grid-cols-[1fr_1.1fr] sm:items-start sm:gap-12 lg:mt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
            {(() => {
              const ordem = [...d.equipe].sort((a, b) => Number(b.dona) - Number(a.dona))
              const cartao = (p: (typeof ordem)[number], i: number) => {
              const bio = c.bios[p.nome] ?? c.bios[p.nome.trim().split(/\s+/)[0]]
              const destaqueDona = i === 0
              return (
                <Surge key={p.id} atraso={i * 150} className={destaqueDona ? '' : 'max-sm:ml-[12%]'}>
                  <article className={`group text-left ${destaqueDona ? '' : 'flex items-start gap-4 sm:gap-6'}`}>
                    <div className={`relative shrink-0 ${destaqueDona ? 'h-52 w-52 sm:h-72 sm:w-72 lg:h-80 lg:w-80' : 'h-20 w-20 sm:h-28 sm:w-28'}`}>
                      <span aria-hidden className="absolute -inset-1.5 rounded-full border transition-transform duration-[1200ms] group-hover:rotate-45 sm:-inset-3" style={{ borderColor: `${d.cor2}99`, borderStyle: 'solid' }} />
                      <span aria-hidden className="absolute -inset-1.5 rounded-full border-t sm:-inset-3" style={{ borderColor: d.cor }} />
                      <div className="relative h-full w-full overflow-hidden rounded-full bg-[#EFE8DC]">
                        {p.foto ? (
                          <Image src={p.foto} alt={p.nome} fill sizes="320px" className="object-cover transition-transform duration-[1500ms] group-hover:scale-105" />
                        ) : (
                          <span className={`${SERIF} flex h-full items-center justify-center text-[56px]`} style={{ color: d.cor }}>{p.nome[0]}</span>
                        )}
                      </div>
                    </div>
                    <div className={`min-w-0 ${destaqueDona ? 'mt-7 sm:mt-10' : ''}`}>
                    <h3 className={`${SERIF} font-medium leading-tight tracking-[-0.01em] ${destaqueDona ? 'text-[28px] sm:text-[36px]' : 'text-[20px] sm:text-[24px]'}`}>{p.nome}</h3>
                    <p className="mt-0.5 text-[13px] font-semibold sm:mt-2 sm:text-[15px]" style={{ color: d.cor }}>{bio?.papel ?? (p.dona ? 'Fundadora' : 'Especialista')}</p>
                    <p className={`mt-1.5 text-[13.5px] leading-[1.6] sm:mt-3 sm:text-[14px] sm:leading-[1.75] ${destaqueDona ? 'sm:mt-4 sm:max-w-md sm:text-[15px]' : 'line-clamp-4 sm:line-clamp-none sm:max-w-sm'}`} style={{ color: SUAVE }}>
                      <T x={bio?.texto ?? { t: 'Formação, especialidades e o jeito de atender entram aqui, a partir do áudio que ela mandar.', ex: true }} />
                    </p>
                    </div>
                  </article>
                </Surge>
              )
              }
              return (
                <>
                  {ordem.slice(0, 1).map((p) => cartao(p, 0))}
                  <div className="grid gap-10 sm:gap-12 sm:pt-6 lg:pt-10">{ordem.slice(1).map((p, i) => cartao(p, i + 1))}</div>
                </>
              )
            })()}
          </div>
        </div>
      </section>

      {/* Avaliação no Google + pontos: o mesmo componente da página pública
          (grava pelo /api/claim-review), só com a cor da clínica */}
      {d.avaliacao && (
        <section id="avaliacoes" className="scroll-mt-20 border-t px-6 py-10 sm:px-10 sm:py-24 lg:py-32" style={{ borderColor: LINHA }}>
          <div className="max-w-xl lg:ml-[14%]">
            <h2 className={`${SERIF} text-[30px] font-medium leading-[1.08] tracking-[-0.02em] sm:text-[46px]`}>
              <Revela>{d.avaliacao.pontos > 0 ? <>Avalie e ganhe <span style={destaque}>{d.avaliacao.pontos} pontos</span></> : <>Conte como foi <span style={destaque}>sua experiência</span></>}</Revela>
            </h2>
            <Surge atraso={150} className="mt-7 sm:mt-12">
              <div style={{ ['--brand-primary' as string]: d.cor } as CSSProperties}>
                <GoogleReviewSection
                  businessId={d.avaliacao.businessId}
                  googleMapsUrl={d.avaliacao.url}
                  rating={d.avaliacao.nota}
                  reviewsCount={d.avaliacao.total}
                  pointsForReview={d.avaliacao.pontos}
                  brandMode="light"
                  slug={d.slug}
                  cheapestReward={d.avaliacao.premio}
                  destaque={TINTA}
                />
              </div>
            </Surge>
          </div>
        </section>
      )}

      {/* Perguntas frequentes (25/10, SEO/AEO): a mesma lista vira o FAQPage do
          JSON-LD. <details> deixa a resposta no HTML mesmo fechada, que é o
          que o robô lê. Celular: título recuado; computador: título ao lado. */}
      {d.perguntas.length > 0 && (
        <section id="perguntas" className="scroll-mt-20 border-t px-6 py-10 sm:px-10 sm:py-24 lg:py-32" style={{ borderColor: LINHA, backgroundColor: '#FDFBF8' }}>
          <div className="mx-auto grid max-w-6xl gap-7 sm:gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
            <h2 className={`${SERIF} text-[30px] font-medium leading-[1.08] tracking-[-0.02em] max-sm:pl-[16%] sm:text-[50px] lg:sticky lg:top-28 lg:self-start`}>
              <Revela>Perguntas</Revela>
              <Revela atraso={120}><span style={destaque}>frequentes</span></Revela>
            </h2>
            <div>
              {d.perguntas.map((f, i) => (
                <Surge key={f.q} atraso={i * 70}>
                  <details className="group border-t py-5 sm:py-6" style={{ borderColor: LINHA }}>
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden">
                      <h3 className={`${SERIF} text-[19px] font-medium leading-snug tracking-[-0.01em] sm:text-[22px]`}>{f.q}</h3>
                      <span aria-hidden className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[18px] leading-none transition-transform duration-300 group-open:rotate-45" style={{ borderColor: `${d.cor}66`, color: d.cor }}>+</span>
                    </summary>
                    <p className="mt-3 max-w-xl pr-10 text-[15px] leading-[1.7]" style={{ color: SUAVE }}>{f.a}</p>
                  </details>
                </Surge>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Onde estamos + Instagram */}
      <section id="onde" className="scroll-mt-20 border-t px-6 py-10 sm:px-10 sm:py-24 lg:py-36" style={{ borderColor: LINHA }}>
        {c.mapa?.coords ? (
          /* 26/10 · contato no padrão da Marisa Vaz: rótulo, título grande,
             blocos com etiqueta (endereço, horário, telefone) e o mapa na cor da marca */
          <div className="mx-auto grid max-w-6xl gap-9 sm:gap-14 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-20">
            <div>
              <p className="flex items-center gap-4 text-[12px] font-semibold uppercase tracking-[0.28em]" style={{ color: SUAVE }}>
                <span className="h-px w-10" style={{ background: d.cor }} />
                Contato
              </p>
              <h2 className={`${SERIF} mt-5 text-[34px] font-medium leading-[1.05] tracking-[-0.02em] sm:mt-7 sm:text-[58px]`}>
                <Revela>Venha nos visitar</Revela>
                <Revela atraso={120}><span style={destaque}>em {c.mapa.cidade?.split(' - ')[0] ?? 'nosso espaço'}.</span></Revela>
              </h2>
              <Surge atraso={150}>
                <dl className="mt-8 grid gap-6 sm:mt-11 sm:gap-7">
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: SUAVE }}>Endereço</dt>
                    <dd className="mt-1.5 text-[16px] leading-[1.6] sm:text-[17px]">{c.mapa.consulta}{c.mapa.cidade ? `, ${c.mapa.cidade}` : ''}</dd>
                  </div>
                  {d.horarios.length > 0 && (
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: SUAVE }}>Horário</dt>
                      {d.horarios.map((h) => (
                        <dd key={h.dias} className="mt-1.5 text-[16px] leading-[1.6] sm:text-[17px]">{h.dias} · {h.faixa}</dd>
                      ))}
                    </div>
                  )}
                  {d.telefone && (
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: SUAVE }}>Telefone</dt>
                      <dd className="mt-1.5 text-[16px] leading-[1.6] sm:text-[17px]"><a href={`tel:+55${d.telefone.replace(/\D/g, '')}`}>{fone(d.telefone)}</a></dd>
                    </div>
                  )}
                </dl>
                <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-5 sm:mt-12">
                  {whats && (
                    <a href={whats} target="_blank" rel="noopener" className="rounded-full px-7 py-4 text-[14px] font-bold uppercase tracking-[0.12em] text-white transition-transform duration-300 hover:-translate-y-0.5" style={{ background: d.cor }}>
                      Falar no WhatsApp
                    </a>
                  )}
                  <ComoChegar lugar={lugar} nome={d.nome} cor={d.cor} />
                </div>
              </Surge>
            </div>
            <Surge atraso={150} className="h-full">
              <MapaDaClinica coords={c.mapa.coords} nome={d.nome} rua={c.mapa.consulta} cor={d.cor} />
            </Surge>
          </div>
        ) : (
        <div className="mx-auto grid max-w-6xl gap-8 sm:gap-14 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
          <div>
            <h2 className={`${SERIF} text-[30px] font-medium leading-[1.08] tracking-[-0.02em] sm:text-[50px]`}>
              <Revela>Venha nos <span style={destaque}>visitar</span></Revela>
            </h2>
            <Surge atraso={150}>
              {d.endereco && (
                <p className="mt-8 flex gap-4 text-[16px] leading-[1.75] max-sm:ml-[10%]" style={{ color: SUAVE }}>
                  <Icone nome="pino" cor={d.cor} className="mt-1 h-5 w-5 shrink-0" />
                  {/* endereço do conteúdo da clínica (formatado); o do cadastro pode vir sem maiúsculas */}
                  <span>{c.mapa?.consulta ?? d.endereco}{c.mapa?.cidade ? `, ${c.mapa.cidade}` : ''}{c.mapa?.confirmar && <Selo />}</span>
                </p>
              )}
              {c.horario && <p className="mt-3 pl-9 text-[16px]" style={{ color: SUAVE }}><T x={c.horario} /></p>}
              <div className="mt-10 flex flex-col gap-5 max-sm:ml-[10%] max-sm:pl-9">
                {c.mapa && <ComoChegar lugar={lugar} nome={d.nome} cor={d.cor} />}
                {whats && <Sublinhado href={whats} cor={d.cor} externo>Falar no WhatsApp</Sublinhado>}
                {d.instagram && <Sublinhado href={d.instagram} cor={d.cor} externo>@{c.instagram?.usuario ?? 'instagram'}</Sublinhado>}
              </div>
            </Surge>
          </div>
          {c.mapa && <Surge atraso={150} className="hidden h-full sm:block"><Mapa consulta={lugar} cor={d.cor} /></Surge>}
        </div>
        )}
      </section>

      {/* Fecho */}
      <section className="relative overflow-hidden border-t px-6 py-12 sm:px-10 sm:py-28 lg:py-40" style={{ borderColor: LINHA, backgroundImage: MARMORE, backgroundColor: '#FDFBF8' }}>
        {c.monograma && (
          <div aria-hidden className="pointer-events-none absolute -right-[18%] top-1/2 h-[120%] w-[78%] -translate-y-1/2 opacity-[0.07] sm:-right-[8%] sm:w-[60%]">
            <Image src={c.monograma} alt="" fill sizes="70vw" className="object-contain" />
          </div>
        )}
        <div className="relative max-w-3xl lg:ml-[8%]">
          <h2 className={`${SERIF} text-[34px] font-medium leading-[1.06] tracking-[-0.025em] sm:text-[62px]`}>
            <Revela className="max-sm:pl-[12%]">Seu horário</Revela>
            <Revela atraso={120}><span style={destaque}>está te esperando</span></Revela>
          </h2>
          <Surge atraso={200}><p className="mt-6 max-w-md text-[16px] leading-[1.75]" style={{ color: SUAVE }}>Escolha o procedimento, a profissional e o melhor horário pra você.</p></Surge>
          <Surge atraso={300} className="mt-7 sm:mt-11"><BotaoAgendar href={agendar} /></Surge>
        </div>
      </section>

      {/* 26/10 · rodapé no padrão da Marisa Vaz: fundo escuro (o mesmo tom dos
          botões), o nome gigante em marca d'água e as colunas de marca,
          navegação, contato e horário. */}
      <footer className="relative overflow-hidden px-6 pb-[calc(112px+env(safe-area-inset-bottom))] pt-12 sm:px-10 sm:pb-10 sm:pt-28" style={{ background: TINTA, color: '#EDE6DA' }}>
        <p aria-hidden className={`${SERIF} pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 select-none whitespace-nowrap text-[23vw] font-medium leading-none tracking-[-0.03em] sm:top-0 sm:text-[15vw]`} style={{ color: 'rgba(255,255,255,.045)' }}>
          {nomeCurto}
        </p>
        <div className="relative mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-8 sm:gap-14 lg:grid-cols-[1.4fr_.8fr_1fr_1fr] lg:gap-10">
          <div className="col-span-2 sm:col-span-1">
            {c.logoDourada ? (
              <div className="relative h-16 w-[150px]"><Image src={c.logoDourada} alt={d.nome} fill sizes="150px" className="object-contain object-left" /></div>
            ) : (
              <p className={`${SERIF} text-[26px]`}>{nomeCurto}</p>
            )}
            <p className="mt-4 max-w-xs text-[14px] leading-[1.65] sm:mt-6 sm:text-[15px] sm:leading-[1.7]" style={{ color: '#B9AE9C' }}>
              {c.subtitulo.t}{c.local ? ` ${c.local}.` : ''}
            </p>
            <Link href={agendar} className="mt-8 hidden rounded-full px-7 py-3.5 sm:inline-flex text-[15px] font-semibold transition-transform duration-300 hover:-translate-y-0.5" style={{ background: d.cor2, color: TINTA }}>
              Agendar atendimento
            </Link>
          </div>
          <nav aria-label="Rodapé" className="max-sm:hidden">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: d.cor2 }}>Navegação</p>
            <ul className="mt-5 grid gap-3 text-[15px]">
              {[['#servicos', 'Serviços'], ['#videos', 'Vídeos'], ['#clinica', 'A clínica'], ['#equipe', 'Equipe'], ...(d.perguntas.length ? [['#perguntas', 'Perguntas frequentes']] : []), ['#onde', 'Contato']].map(([h, t]) => (
                <li key={h}><a href={h} className="transition-opacity hover:opacity-60">{t}</a></li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: d.cor2 }}>Contato</p>
            <ul className="mt-3 grid gap-2 text-[13.5px] leading-[1.55] sm:mt-5 sm:gap-3 sm:text-[15px] sm:leading-[1.6]">
              {c.mapa && <li>{c.mapa.consulta}{c.mapa.cidade ? `, ${c.mapa.cidade}` : ''}</li>}
              {d.telefone && <li><a href={`tel:+55${d.telefone.replace(/\D/g, '')}`} className="transition-opacity hover:opacity-60">{fone(d.telefone)}</a></li>}
            </ul>
          </div>
          <div>
            {d.horarios.length > 0 && (
              <>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: d.cor2 }}>Horário</p>
                <ul className="mt-3 grid gap-2 text-[13.5px] leading-[1.55] sm:mt-5 sm:gap-3 sm:text-[15px]">
                  {d.horarios.map((h) => <li key={h.dias}>{h.dias} · {h.faixa}</li>)}
                </ul>
              </>
            )}
            <div className="mt-5 flex gap-5 text-[14px] font-semibold sm:mt-7 sm:gap-6 sm:text-[15px]">
              {d.instagram && <a href={d.instagram} target="_blank" rel="noopener" className="transition-opacity hover:opacity-60">Instagram</a>}
              {whats && <a href={whats} target="_blank" rel="noopener" className="transition-opacity hover:opacity-60">WhatsApp</a>}
            </div>
          </div>
        </div>
        <div className="relative mx-auto mt-9 flex max-w-6xl flex-col gap-1.5 border-t pt-5 sm:mt-20 sm:gap-2 sm:pt-6 text-[11px] font-semibold uppercase tracking-[0.18em] sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'rgba(255,255,255,.1)', color: '#8A8070' }}>
          <span>© {new Date().getFullYear()} {d.nome}</span>
          <span>{c.local ? `${c.local} · ` : ''}Agendamento online · AgendaPRO</span>
        </div>
      </footer>

      {/* WhatsApp flutuante (padrão das clínicas brasileiras do estudo). No
          celular fica acima da barra do Agendar e só aparece a partir da seção
          A clínica; no computador, sempre. Número = telefone do cadastro. */}
      {whats && (
        <a
          href={`${whats}?text=${encodeURIComponent('Olá! Vim pelo site e queria tirar uma dúvida.')}`}
          target="_blank"
          rel="noopener"
          aria-label="Falar no WhatsApp"
          className={`fixed bottom-[calc(92px+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-[0_10px_28px_-8px_rgba(0,0,0,.35)] transition-[opacity,transform] duration-500 hover:scale-105 sm:pointer-events-auto sm:bottom-6 sm:right-6 sm:translate-y-0 sm:opacity-100 ${whatsNoCelular ? '' : 'pointer-events-none translate-y-3 opacity-0'}`}
          style={{ background: '#25D366' }}
        >
          <LogoWhatsApp />
        </a>
      )}

      {/* Celular: Agendar fixo embaixo o tempo todo */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:hidden" style={{ background: '#FAF7F2EB', borderColor: LINHA }}>
        {/* veio pelo link do cupom: o aviso da abertura fica abaixo da dobra no celular, então o desconto aparece aqui desde o 1º segundo */}
        {chegada?.cupom && (
          <p className="mb-2 text-center text-[13px] font-semibold" style={{ color: d.cor }}>
            Cupom {chegada.cupom.code} · {chegada.cupom.texto} aplicado
          </p>
        )}
        {/* 25/10: o WhatsApp saiu da barra; virou o botão flutuante que só
            aparece mais embaixo. A barra é só o Agendar. */}
        <Link href={agendar} className="flex items-center justify-center gap-3 rounded-full py-4 text-[16px] font-semibold text-white" style={{ background: TINTA }}>
          Agendar atendimento <Icone nome="seta" cor="#fff" className="h-4 w-4" />
        </Link>
      </div>
    </main>
  )
}
