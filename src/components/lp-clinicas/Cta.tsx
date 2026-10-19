'use client'
/* Botões de chamada da /clinicas (19/10/2026). Cada clique vira `cta_clique` no GA com o LOCAL do botão,
   e o link do cadastro leva o local no utm_content: dá pra saber qual ponto da página converte. */
import Link from 'next/link'
import { gaCtaClique } from '@/lib/ga-event'
import { PRICING } from '@/config/pricing'

const TAUPE = '#5E544B', CREME = '#F7F2EB'
export const cadastroUrl = (local: string) => `/cadastro?utm_source=site&utm_medium=lp&utm_campaign=clinicas&utm_content=${encodeURIComponent(local)}`

export function CtaTestar({ local, children, style, className }: { local: string; children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return <Link href={cadastroUrl(local)} onClick={() => gaCtaClique(local)} style={style} className={className}>{children}</Link>
}

export function CtaLink({ local, href, destino, children, style, className }: { local: string; href: string; destino: 'planos' | 'especialista'; children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return <a href={href} onClick={() => gaCtaClique(local, destino)} style={style} className={className}>{children}</a>
}

/** faixa curta entre os capítulos: quem já se convenceu não precisa rolar o filme inteiro */
export function FaixaCta({ local, titulo }: { local: string; titulo: React.ReactNode }) {
  return (
    <aside aria-label="Testar o AgendaPRO" style={{ padding: '36px 16px 44px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 720, padding: 'clamp(20px, 4vw, 30px)', borderRadius: 28, background: TAUPE, color: CREME, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, boxShadow: '0 30px 70px rgba(60,48,38,0.22)' }}>
        <div style={{ flex: '1 1 260px' }}>
          <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(20px, 2.6vw, 26px)', lineHeight: 1.15 }}>{titulo}</p>
          <p style={{ margin: '6px 0 0', fontSize: 15, opacity: 0.8 }}>{PRICING.trial.dias} dias grátis · sem cartão · sem fidelidade</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <CtaTestar local={local} style={{ padding: '13px 22px', borderRadius: 999, background: CREME, color: TAUPE, fontWeight: 800, fontSize: 16, textDecoration: 'none', whiteSpace: 'nowrap' }}>Testar {PRICING.trial.dias} dias grátis</CtaTestar>
          <CtaLink local={local} href="#planos" destino="planos" style={{ padding: '13px 18px', borderRadius: 999, border: '1.5px solid rgba(247,242,235,0.5)', color: CREME, fontWeight: 700, fontSize: 16, textDecoration: 'none', whiteSpace: 'nowrap' }}>Ver planos</CtaLink>
        </div>
      </div>
    </aside>
  )
}
