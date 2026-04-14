import Link from 'next/link'
import FAQ from '@/components/FAQ'

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

export default function SegmentLanding({ config }: { config: SegmentConfig }) {
  return (
    <main className="min-h-screen bg-white font-sans">

      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <span className="font-bold text-gray-900 text-lg">AgendaPRO</span>
            <span className="text-gray-400 text-xs ml-2">by Impulso Digital</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/login" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="bg-gray-900 text-white text-sm px-4 py-2 rounded-xl font-medium hover:bg-gray-800 transition-colors"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            {config.hero.badge}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-5">
            {config.hero.headline}
          </h1>
          <p className="text-gray-500 text-lg mb-8 max-w-lg mx-auto leading-relaxed">
            {config.hero.sub}
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-10 text-sm text-gray-500">
            {config.hero.pills.map((pill) => (
              <span key={pill} className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                ✓ {pill}
              </span>
            ))}
          </div>
          <Link
            href="/cadastro"
            className="inline-block bg-gray-900 text-white px-8 py-4 rounded-2xl font-semibold text-base hover:bg-gray-800 transition-colors"
          >
            Criar minha página de agendamento →
          </Link>
          <p className="text-gray-400 text-xs mt-4">Funciona hoje mesmo. Cancele quando quiser.</p>
        </div>
      </section>

      {/* Números */}
      <section className="border-y border-gray-100 bg-gray-50">
        <div className="max-w-3xl mx-auto px-6 py-10 grid grid-cols-3 gap-6 text-center">
          {config.stats.map((stat) => (
            <div key={stat.number}>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stat.number}</p>
              <p className="text-xs text-gray-500 leading-snug">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-3">
              O que você ganha
            </p>
            <h2 className="text-2xl font-bold text-gray-900">
              Tudo que você precisa, sem o que não precisa
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.features.map((feature) => (
              <div key={feature.title} className="bg-gray-50 rounded-2xl border border-gray-100 p-5 flex gap-4">
                <span className="text-2xl flex-shrink-0 mt-0.5">{feature.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-widest text-center mb-12">
            Como funciona
          </p>
          <div className="space-y-10">
            {config.steps.map((step) => (
              <div key={step.n} className="flex items-start gap-6">
                <span className="text-3xl font-bold text-gray-200 min-w-[48px]">{step.n}</span>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">{step.title}</h3>
                  <p className="text-gray-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preços */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-3">Planos</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Simples, sem surpresa</h2>
          <p className="text-gray-400 text-sm mb-12">14 dias grátis em qualquer plano. Sem cartão, sem fidelidade.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 text-left">
              <h3 className="font-bold text-gray-900 text-lg mb-1">Solo</h3>
              <p className="text-gray-400 text-sm mb-4">1 profissional</p>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                R$97<span className="text-base font-normal text-gray-400">/mês</span>
              </p>
              <p className="text-xs text-emerald-600 font-medium mb-6">14 dias grátis — sem cartão</p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li>✓ Página de agendamento personalizada</li>
                <li>✓ Agendamento 24h pelo link ou redes sociais</li>
                <li>✓ Lembrete automático D-1 para o cliente</li>
                <li>✓ Notificação por email a cada reserva</li>
                <li>✓ Painel de gestão pelo celular</li>
                <li>✓ Serviços ilimitados</li>
              </ul>
              <Link href="/cadastro" className="block text-center bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors text-sm">
                Começar grátis →
              </Link>
            </div>

            <div className="bg-gray-900 border border-gray-900 rounded-2xl p-6 text-left relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-white text-gray-900 text-xs font-bold px-2 py-1 rounded-lg">Popular</div>
              <h3 className="font-bold text-white text-lg mb-1">Equipe</h3>
              <p className="text-gray-400 text-sm mb-4">Até 5 profissionais</p>
              <p className="text-3xl font-bold text-white mb-1">
                R$147<span className="text-base font-normal text-gray-400">/mês</span>
              </p>
              <p className="text-xs text-emerald-400 font-medium mb-6">14 dias grátis — sem cartão</p>
              <ul className="space-y-2 text-sm text-gray-300 mb-6">
                <li>✓ Tudo do Solo</li>
                <li>✓ Múltiplos profissionais com agenda individual</li>
                <li>✓ Relatório de comissão automático</li>
                <li>✓ Financeiro e faturamento por período</li>
                <li>✓ Suporte prioritário via WhatsApp</li>
              </ul>
              <Link href="/cadastro" className="block text-center bg-white text-gray-900 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors text-sm">
                Começar grátis →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQ />

      {/* CTA final */}
      <section className="px-6 py-20 bg-gray-900 text-center">
        <div className="max-w-lg mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">{config.cta.headline}</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">{config.cta.sub}</p>
          <Link
            href="/cadastro"
            className="inline-block bg-white text-gray-900 px-8 py-4 rounded-2xl font-bold text-base hover:bg-gray-100 transition-colors"
          >
            Criar conta grátis →
          </Link>
          <p className="text-gray-500 text-xs mt-4">14 dias grátis · Sem cartão · Cancele quando quiser</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-10 bg-gray-900">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-white text-sm">AgendaPRO</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Um produto da{' '}
              <a href="https://impulsodigital063.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 underline underline-offset-2">
                Impulso Digital
              </a>
              {' '}· Palmas, TO
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <Link href="/barbearia" className="hover:text-gray-300">Barbearia</Link>
            <Link href="/salao" className="hover:text-gray-300">Salão de beleza</Link>
            <Link href="/nail" className="hover:text-gray-300">Nail designer</Link>
            <Link href="/estetica" className="hover:text-gray-300">Clínica estética</Link>
            <Link href="/admin/login" className="hover:text-gray-300">Entrar</Link>
          </div>
        </div>
      </footer>

    </main>
  )
}
