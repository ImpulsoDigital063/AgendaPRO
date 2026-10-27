'use client'

/* PÁGINA DO NEGÓCIO EM CACHE + EXTRAS DO LINK NO NAVEGADOR (27/10/2026)
   ─────────────────────────────────────────────────────────────────
   A /[slug] era `force-dynamic` só porque lia ?cupom, ?ref e ?preview no
   servidor — então TODA visita de cliente final remontava a página e
   consultava o banco. Era a 2ª rota que mais gastava CPU, e o AgendaPRO
   sozinho era 97,9% das 4h do plano Hobby (Vercel avisou 90% em 27/10).

   Agora a página fica em cache (ISR) e o que depende do link de cada
   pessoa mora aqui: lido do endereço depois que a página abre. Só quem
   chega com cupom/indicação chama /api/public/link-extras — o resto
   não gasta função nenhuma. */

import Link from 'next/link'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'

type Extras = {
  cupom: { code: string; discount_type: 'fixed' | 'percent'; discount_value: number } | null
  indicacao: { name: string; pointsForReferral: number } | null
}

type Busca = { ref: string | null; cupom: string | null; preview: string | null }

function lerBusca(): Busca {
  const p = new URLSearchParams(window.location.search)
  return { ref: p.get('ref'), cupom: p.get('cupom'), preview: p.get('preview') }
}

/* Uma consulta por página, mesmo com vários componentes pedindo. */
let pendente: Promise<Extras> | null = null
function buscarExtras(businessId: string, busca: Busca): Promise<Extras> {
  if (!pendente) {
    const q = new URLSearchParams({ b: businessId })
    if (busca.cupom) q.set('cupom', busca.cupom)
    if (busca.ref) q.set('ref', busca.ref)
    pendente = fetch(`/api/public/link-extras?${q}`)
      .then((r) => (r.ok ? r.json() : { cupom: null, indicacao: null }))
      .catch(() => ({ cupom: null, indicacao: null }))
  }
  return pendente
}

function useExtras(businessId: string) {
  const [busca, setBusca] = useState<Busca | null>(null)
  const [extras, setExtras] = useState<Extras | null>(null)
  useEffect(() => {
    const b = lerBusca()
    setBusca(b)
    if (b.cupom || b.ref) void buscarExtras(businessId, b).then(setExtras)
  }, [businessId])
  return { busca, extras }
}

/** Faixa "Voltar pra Aparência" — quando o dono abre via "Ver minha página real". */
export function BannerPreviewAdmin() {
  const [ativo, setAtivo] = useState(false)
  useEffect(() => setAtivo(lerBusca().preview === 'admin'), [])
  if (!ativo) return null
  return (
    <Link
      href="/admin/configuracoes?tab=aparencia"
      className="sticky top-0 z-50 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
      style={{
        background: 'linear-gradient(135deg, #0F172A, #1E293B)',
        color: '#FFFFFF',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 12px -4px rgba(0,0,0,0.4)',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
      Voltar pra Aparência
    </Link>
  )
}

/** Banners de indicação (?ref) e cupom (?cupom) — só aparecem se forem válidos. */
export function BannersDoLink({ businessId, muted }: { businessId: string; muted: string }) {
  const { extras } = useExtras(businessId)
  if (!extras) return null
  const { indicacao, cupom } = extras
  return (
    <>
      {/* Banner de indicacao — simetrico ao cupom: laranja (em vez de verde)
          pra distinguir visualmente. CIC rodada 6 #3. */}
      {indicacao && (
        <div
          className="rounded-2xl p-4 mb-3 flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.06))',
            border: '1px solid rgba(245,158,11,0.40)',
          }}
        >
          <span
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
            style={{ background: 'rgba(245,158,11,0.20)' }}
          >
            👋
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold leading-tight" style={{ color: '#F59E0B' }}>
              Indicação de {indicacao.name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: muted }}>
              {indicacao.pointsForReferral > 0
                ? `Agende seu primeiro horário e ${indicacao.name} ganha +${indicacao.pointsForReferral} pts. Você também acumula pontos a partir do primeiro corte.`
                : `Agende seu horário — você acumula pontos pelos serviços daqui em diante.`}
            </p>
          </div>
        </div>
      )}

      {cupom && (
        <div
          className="rounded-2xl p-4 mb-3 flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(16,185,129,0.06))',
            border: '1px solid rgba(16,185,129,0.4)',
          }}
        >
          <span
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
            style={{ background: 'rgba(16,185,129,0.2)' }}
          >
            🎁
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold leading-tight" style={{ color: '#10B981' }}>
              Cupom {cupom.code} aplicado
            </p>
            <p className="text-xs mt-0.5" style={{ color: muted }}>
              {cupom.discount_type === 'percent'
                ? `${cupom.discount_value}% de desconto na sua próxima visita`
                : `R$ ${cupom.discount_value.toFixed(2).replace('.', ',')} de desconto na sua próxima visita`}
            </p>
          </div>
        </div>
      )}
    </>
  )
}

/** Link de agendar que carrega ?ref e ?cupom adiante — sem isso o cliente
 *  perde o cupom ao clicar "Agendar horário". `textoComCupom` troca o rótulo
 *  quando o cupom do link é válido. */
export function LinkAgendar({
  slug,
  businessId,
  className,
  style,
  children,
  textoComCupom,
  seta,
}: {
  slug: string
  businessId: string
  className: string
  style: CSSProperties
  children: ReactNode
  textoComCupom?: ReactNode
  seta: ReactNode
}) {
  const { busca, extras } = useExtras(businessId)
  const q = new URLSearchParams()
  if (busca?.ref) q.set('ref', busca.ref)
  if (busca?.cupom) q.set('cupom', busca.cupom)
  const href = q.toString() ? `/${slug}/agendar?${q}` : `/${slug}/agendar`
  return (
    <Link href={href} className={className} style={style}>
      {extras?.cupom && textoComCupom ? textoComCupom : children}
      {seta}
    </Link>
  )
}

/** Endereço curto (v164) com a página em cache: o redirecionamento acontece
 *  aqui no navegador pra não perder ?cupom/?ref do link divulgado. */
export function SeguirAtalho({ destino }: { destino: string }) {
  useEffect(() => {
    window.location.replace(destino + window.location.search + window.location.hash)
  }, [destino])
  return null
}
