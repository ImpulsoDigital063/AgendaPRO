import Link from 'next/link'
import Image from 'next/image'
import FAQ from '@/components/FAQ'
import { AnimatedGradient, SectionReveal, SegmentIcon } from '@/components/ui'
import type { Segment } from '@/components/ui/SegmentCard'

export type SegmentConfig = {
  segment: string
  hero: {
    badge: string
    headline: string
    sub: string
    pills: string[]
  }
  stats: { number: string; label: string }[]
  features: { icon: string; title: string; desc: string }[]
  steps: { n: string; title: string; desc: string }[]
  cta: {
    headline: string
    sub: string
  }
}

const THEME: Record<string, {
  accent: string
  accentSoft: string
  iconColor: string
  gradient: string
  label: string
}> = {
  barbearia: {
    accent: '#3B82F6',
    accentSoft: 'rgba(59,130,246,0.18)',
    iconColor: '#60A5FA',
    gradient: 'linear-gradient(135deg, rgba(30,64,175,0.55) 0%, rgba(6,182,212,0.35) 100%)',
    label: 'Para barbearias',
  },
  salao: {
    accent: '#8B5CF6',
    accentSoft: 'rgba(139,92,246,0.18)',
    iconColor: '#C4B5FD',
    gradient: 'linear-gradient(135deg, rgba(124,58,237,0.55) 0%, rgba(236,72,153,0.3) 100%)',
    label: 'Para salões',
  },
  estetica: {
    accent: '#06B6D4',
    accentSoft: 'rgba(6,182,212,0.18)',
    iconColor: '#67E8F9',
    gradient: 'linear-gradient(135deg, rgba(6,182,212,0.5) 0%, rgba(30,64,175,0.4) 100%)',
    label: 'Para estética',
  },
  nail: {
    accent: '#EC4899',
    accentSoft: 'rgba(236,72,153,0.18)',
    iconColor: '#F9A8D4',
    gradient: 'linear-gradient(135deg, rgba(236,72,153,0.5) 0%, rgba(244,114,182,0.3) 100%)',
    label: 'Para nail designers',
  },
}

export default function SegmentLanding({ config }: { config: SegmentConfig }) {
  const theme = THEME[config.segment] ?? THEME.barbearia
  const segmentKey = config.segment as Segment

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5" style={{ background: 'rgba(5,7,19,0.7)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo-agendapro-dark.svg" alt="AgendaPRO" width={150} height={30} priority />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/admin/login" className="text-sm text-slate-300 hover:text-white transition-colors hidden sm:inline">
              Entrar
            </Link>
            <Link href="/cadastro" className="btn-primary-v2 text-sm">
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-16 pb-24 md:pt-24 md:pb-32 overflow-hidden">
        <AnimatedGradient />

        {/* Wash do segmento por cima do gradient base */}
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{ background: theme.gradient, mixBlendMode: 'screen' }}
          aria-hidden="true"
        />

        <div className="relative max-w-4xl mx-auto text-center">
          <SectionReveal>
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full mb-8"
              style={{
                background: theme.accentSoft,
                border: `1px solid ${theme.accent}55`,
                color: theme.iconColor,
              }}
            >
              <span
                className="w-12 h-12 -m-3 flex items-center justify-center rounded-full"
                style={{ background: 'transparent', color: theme.iconColor }}
              >
                <SegmentIcon segment={segmentKey} size={18} />
              </span>
              <span className="ml-1">{theme.label}</span>
              <span className="opacity-50">·</span>
              <span>{config.hero.badge}</span>
            </div>

            <h1 className="display-lg text-white mb-6">
              {config.hero.headline}
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
              {config.hero.sub}
            </p>

            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {config.hero.pills.map((pill) => (
                <span
                  key={pill}
                  className="glass text-sm text-slate-200 px-4 py-2 rounded-full"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1"><polyline points="20 6 9 17 4 12"/></svg>{pill}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/cadastro"
                className="btn-primary-v2 text-base"
                style={{ background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.iconColor} 100%)` }}
              >
                Criar minha página de agendamento
              </Link>
              <Link href="#features" className="btn-ghost text-base">
                Ver como funciona
              </Link>
            </div>
            <p className="text-slate-400 text-xs mt-4">
              Funciona hoje mesmo · Sem cartão · Cancele quando quiser
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* Stats */}
      <section className="relative px-6 py-12 border-y border-white/5" style={{ background: 'rgba(15,25,56,0.35)' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {config.stats.map((stat) => (
            <SectionReveal key={stat.number} className="reveal-stagger">
              <p className="text-4xl md:text-5xl font-extrabold text-gradient mb-2">{stat.number}</p>
              <p className="text-sm text-slate-400 leading-snug max-w-xs mx-auto">{stat.label}</p>
            </SectionReveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <SectionReveal className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] mb-4" style={{ color: theme.iconColor }}>
              O que você ganha
            </p>
            <h2 className="display-md text-white">
              Tudo que você precisa.<br />Sem o que não precisa.
            </h2>
          </SectionReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {config.features.map((feature) => (
              <SectionReveal key={feature.title} className="reveal-stagger">
                <div className="glass glow-border rounded-2xl p-6 h-full flex gap-4 transition-transform duration-300 hover:-translate-y-1">
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{
                      background: theme.accentSoft,
                      border: `1px solid ${theme.accent}40`,
                    }}
                  >
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg mb-1.5">{feature.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="relative px-6 py-24" style={{ background: 'rgba(15,25,56,0.25)' }}>
        <div className="max-w-3xl mx-auto">
          <SectionReveal className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] mb-4" style={{ color: theme.iconColor }}>
              Como funciona
            </p>
            <h2 className="display-md text-white">3 passos. Pronto.</h2>
          </SectionReveal>

          <div className="space-y-6">
            {config.steps.map((step) => (
              <SectionReveal key={step.n} className="reveal-stagger">
                <div className="glass rounded-2xl p-6 md:p-8 flex items-start gap-6">
                  <span
                    className="font-mono text-3xl md:text-4xl font-bold flex-shrink-0"
                    style={{ color: theme.iconColor }}
                  >
                    {step.n}
                  </span>
                  <div>
                    <h3 className="font-bold text-white text-xl mb-2">{step.title}</h3>
                    <p className="text-slate-300 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <SectionReveal className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] mb-4" style={{ color: theme.iconColor }}>
              Planos
            </p>
            <h2 className="display-md text-white mb-3">Simples. Sem surpresa.</h2>
            <p className="text-slate-400">14 dias grátis em qualquer plano. Sem cartão, sem fidelidade.</p>
          </SectionReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <SectionReveal className="reveal-stagger">
              <div className="glass rounded-3xl p-8 h-full flex flex-col">
                <h3 className="font-bold text-white text-xl mb-1">Solo</h3>
                <p className="text-slate-400 text-sm mb-6">1 profissional + bônus</p>
                <p className="text-5xl font-extrabold text-white mb-1">
                  R$67<span className="text-base font-normal text-slate-400">/mês</span>
                </p>
                <p className="text-xs font-semibold mb-6" style={{ color: theme.iconColor }}>
                  14 dias grátis — sem cartão
                </p>
                <ul className="space-y-3 text-sm text-slate-300 mb-8 flex-1">
                  <li><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1 text-cyan-400"><polyline points="20 6 9 17 4 12"/></svg>Página de agendamento personalizada</li>
                  <li><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1 text-cyan-400"><polyline points="20 6 9 17 4 12"/></svg>Agendamento 24h pelo link</li>
                  <li><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1 text-cyan-400"><polyline points="20 6 9 17 4 12"/></svg>Lembrete automático D-1</li>
                  <li><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1 text-cyan-400"><polyline points="20 6 9 17 4 12"/></svg>Notificação por email</li>
                  <li><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1 text-cyan-400"><polyline points="20 6 9 17 4 12"/></svg>Painel mobile-first</li>
                  <li className="font-semibold" style={{ color: theme.iconColor }}>
                    ✦ Bônus: 2º profissional grátis
                  </li>
                </ul>
                <Link href="/cadastro" className="btn-ghost text-center">
                  Começar grátis
                </Link>
              </div>
            </SectionReveal>

            <SectionReveal className="reveal-stagger">
              <div
                className="glass-strong glow-border rounded-3xl p-8 h-full flex flex-col relative overflow-hidden"
                style={{ borderColor: `${theme.accent}55` }}
              >
                <div
                  className="absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full"
                  style={{ background: theme.accent, color: 'white' }}
                >
                  Popular
                </div>
                <h3 className="font-bold text-white text-xl mb-1">Equipe</h3>
                <p className="text-slate-400 text-sm mb-6">Até 5 profissionais</p>
                <p className="text-5xl font-extrabold text-white mb-1">
                  R$107<span className="text-base font-normal text-slate-400">/mês</span>
                </p>
                <p className="text-xs font-semibold mb-6" style={{ color: theme.iconColor }}>
                  14 dias grátis — sem cartão
                </p>
                <ul className="space-y-3 text-sm text-slate-300 mb-8 flex-1">
                  <li><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1 text-cyan-400"><polyline points="20 6 9 17 4 12"/></svg>Tudo do Solo</li>
                  <li><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1 text-cyan-400"><polyline points="20 6 9 17 4 12"/></svg>Múltiplos profissionais com agenda individual</li>
                  <li><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1 text-cyan-400"><polyline points="20 6 9 17 4 12"/></svg>Comissão automática</li>
                  <li><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1 text-cyan-400"><polyline points="20 6 9 17 4 12"/></svg>Financeiro por período</li>
                  <li><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1 text-cyan-400"><polyline points="20 6 9 17 4 12"/></svg>Suporte prioritário no WhatsApp</li>
                </ul>
                <Link
                  href="/cadastro"
                  className="text-center font-semibold py-3 px-6 rounded-xl transition-transform hover:scale-[1.02]"
                  style={{ background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.iconColor} 100%)`, color: 'white' }}
                >
                  Começar grátis
                </Link>
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative px-6 py-16" style={{ background: 'rgba(15,25,56,0.25)' }}>
        <FAQ />
      </section>

      {/* CTA final */}
      <section className="relative px-6 py-24 text-center overflow-hidden">
        <div
          className="absolute inset-0 opacity-50"
          style={{ background: theme.gradient }}
          aria-hidden="true"
        />
        <SectionReveal className="relative max-w-2xl mx-auto">
          <h2 className="display-md text-white mb-5">{config.cta.headline}</h2>
          <p className="text-slate-300 text-lg mb-10 leading-relaxed">{config.cta.sub}</p>
          <Link
            href="/cadastro"
            className="inline-block font-bold text-lg py-4 px-10 rounded-2xl transition-transform hover:scale-[1.03] shadow-2xl"
            style={{
              background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.iconColor} 100%)`,
              color: 'white',
              boxShadow: `0 20px 60px -20px ${theme.accent}80`,
            }}
          >
            Criar conta grátis →
          </Link>
          <p className="text-slate-400 text-xs mt-5">14 dias grátis · Sem cartão · Cancele quando quiser</p>
        </SectionReveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-10" style={{ background: 'rgba(5,7,19,0.85)' }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image src="/logo-agendapro-dark.svg" alt="AgendaPRO" width={130} height={26} />
            <span className="text-slate-500 text-xs">
              by{' '}
              <a
                href="https://impulsodigital063.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-300 underline underline-offset-2"
              >
                Impulso Digital
              </a>
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            <Link href="/barbearia" className="hover:text-white">Barbearia</Link>
            <Link href="/salao" className="hover:text-white">Salão</Link>
            <Link href="/estetica" className="hover:text-white">Estética</Link>
            <Link href="/nail" className="hover:text-white">Nail</Link>
            <Link href="/admin/login" className="hover:text-white">Entrar</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
