import Link from 'next/link'
import FAQ from '@/components/FAQ'

const BUSINESS_TYPES = [
  { icon: '✂️', name: 'Barbearia' },
  { icon: '💅', name: 'Nail designer' },
  { icon: '💇', name: 'Salão de beleza' },
  { icon: '🧴', name: 'Estética' },
  { icon: '🧠', name: 'Psicólogo' },
  { icon: '💪', name: 'Personal' },
  { icon: '🦷', name: 'Dentista' },
  { icon: '📋', name: 'Qualquer serviço' },
]

const STATS = [
  { number: '24h', label: 'Clientes agendam a qualquer hora' },
  { number: '-50%', label: 'Menos faltas com lembrete automático' },
  { number: '5min', label: 'Para configurar e compartilhar' },
]

const RETENTION_FEATURES = [
  {
    icon: '🏆',
    title: 'Programa de fidelidade',
    result: 'Clientes voltam para você — não para o concorrente',
    desc: 'Cada serviço gera pontos. Você define as recompensas. O cliente sabe que tem vantagem em voltar.',
  },
  {
    icon: '🔔',
    title: 'Lista de espera automática',
    result: 'Zero vaga desperdiçada quando cancela',
    desc: 'Cancelou um horário? O próximo da fila recebe email na hora e preenche a vaga automaticamente.',
  },
  {
    icon: '🔗',
    title: 'Indicação com recompensa',
    result: 'Seus clientes te trazem novos clientes',
    desc: 'Cada cliente tem um link único de indicação. Indica um amigo — os dois ganham pontos.',
  },
  {
    icon: '⭐',
    title: 'Badge Google Reviews',
    result: 'Mais avaliações no Google sem precisar pedir',
    desc: 'Sua nota aparece na página de agendamento. Cliente ganha pontos por avaliar — incentivo concreto.',
  },
]

const FEATURES = [
  {
    icon: '📱',
    title: 'Controle total pelo celular',
    desc: 'Veja, confirme e cancele agendamentos de onde estiver. Painel otimizado para celular — sem precisar abrir computador.',
  },
  {
    icon: '⏸️',
    title: 'Bloqueio rápido da agenda',
    desc: 'Precisa sair mais cedo? Pause sua agenda online com um clique. Nenhum cliente consegue agendar nesse período.',
  },
  {
    icon: '🔔',
    title: 'Lembrete automático D-1',
    desc: 'Um dia antes do horário, o sistema manda email ao cliente lembrando. Reduz em até 50% a falta sem avisar.',
  },
  {
    icon: '🔗',
    title: 'Agenda pelas redes sociais',
    desc: 'Cole o link na bio do Instagram, no Google Meu Negócio ou no WhatsApp. Cliente agenda direto, sem te chamar.',
  },
  {
    icon: '👤',
    title: 'Você cadastra ou o cliente agenda',
    desc: 'Recebeu um pedido no WhatsApp? Cadastre você mesmo pelo painel em segundos. Flexibilidade total.',
  },
  {
    icon: '🚫',
    title: 'Sem app para o cliente',
    desc: 'O cliente acessa pelo link no celular, sem baixar nada. Menos atrito, mais agendamentos.',
  },
  {
    icon: '👥',
    title: 'Múltiplos profissionais',
    desc: 'Cada profissional com sua própria agenda, horários e relatório de comissão automático.',
  },
  {
    icon: '💰',
    title: 'Relatório financeiro incluso',
    desc: 'Faturamento do dia, da semana e do mês. Comissão por profissional calculada automaticamente.',
  },
]

export default function HomePage() {
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
            14 dias grátis — sem cartão de crédito
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-5">
            Agenda online que faz<br />o cliente voltar
          </h1>
          <p className="text-gray-500 text-lg mb-8 max-w-lg mx-auto leading-relaxed">
            Chega de perder hora no WhatsApp e de cliente ir pro concorrente.
            Configure em 5 minutos e tenha agenda, fidelidade, indicação e Google Reviews num só lugar.
          </p>

          {/* Benefícios rápidos */}
          <div className="flex flex-wrap justify-center gap-3 mb-10 text-sm text-gray-500">
            <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
              ✓ Agendamento 24h
            </span>
            <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
              ✓ Programa de fidelidade
            </span>
            <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
              ✓ Indicação automática
            </span>
            <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
              ✓ Google Reviews integrado
            </span>
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

      {/* Cards por segmento */}
      <section className="px-6 pb-16 bg-white">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-sm text-gray-400 mb-6">Escolha o seu tipo de negócio</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                href: '/barbearia',
                icon: '✂️',
                title: 'Barbearia',
                desc: 'Criado para barbeiro que quer a agenda cheia sem depender do WhatsApp.',
                color: 'hover:border-zinc-400',
              },
              {
                href: '/salao',
                icon: '💇',
                title: 'Salão de beleza',
                desc: 'Pensado para salão com equipe — cada profissional com sua agenda e comissão.',
                color: 'hover:border-pink-300',
              },
              {
                href: '/nail',
                icon: '💅',
                title: 'Nail designer',
                desc: 'Feito para quem trabalha sozinha e precisa da agenda no piloto automático.',
                color: 'hover:border-purple-300',
              },
              {
                href: '/estetica',
                icon: '🧴',
                title: 'Clínica estética',
                desc: 'Desenvolvido para clínica com múltiplos procedimentos e controle financeiro.',
                color: 'hover:border-emerald-300',
              },
            ].map((card) => (
              <a
                key={card.href}
                href={card.href}
                className={`group block bg-white border-2 border-gray-100 ${card.color} rounded-2xl p-5 transition-all hover:shadow-md`}
              >
                <span className="text-3xl mb-3 block">{card.icon}</span>
                <h3 className="font-bold text-gray-900 text-sm mb-1.5">{card.title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{card.desc}</p>
                <p className="text-xs font-semibold text-gray-900 mt-3 group-hover:underline">
                  Ver como funciona →
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Números */}
      <section className="border-y border-gray-100 bg-gray-50">
        <div className="max-w-3xl mx-auto px-6 py-10 grid grid-cols-3 gap-6 text-center">
          {STATS.map((stat) => (
            <div key={stat.number}>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stat.number}</p>
              <p className="text-xs text-gray-500 leading-snug">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Retenção e crescimento */}
      <section className="px-6 py-16 bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-3">
              O que o concorrente não tem
            </p>
            <h2 className="text-2xl font-bold text-white">
              Retenção e crescimento no mesmo sistema
            </h2>
            <p className="text-gray-400 text-sm mt-3 max-w-lg mx-auto">
              Todo mundo tem agenda online. Só a AgendaPRO entrega o que faz o cliente voltar — e trazer mais clientes.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {RETENTION_FEATURES.map((feature) => (
              <div key={feature.title} className="bg-gray-800 rounded-2xl p-5 flex gap-4">
                <span className="text-2xl flex-shrink-0 mt-0.5">{feature.icon}</span>
                <div>
                  <h3 className="font-semibold text-white mb-0.5">{feature.title}</h3>
                  <p className="text-emerald-400 text-xs font-medium mb-2">{feature.result}</p>
                  <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 bg-gray-50">
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
            {FEATURES.map((feature) => (
              <div key={feature.title} className="bg-white rounded-2xl border border-gray-100 p-5 flex gap-4">
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
      <section className="px-6 py-20 bg-white">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-widest text-center mb-12">
            Como funciona
          </p>
          <div className="space-y-10">
            {[
              {
                n: '01',
                title: 'Cadastre seu negócio',
                desc: 'Nome, serviços, horários e profissionais. Tudo em menos de 5 minutos. Sem técnico, sem burocracia.',
              },
              {
                n: '02',
                title: 'Compartilhe o link onde quiser',
                desc: 'Você recebe uma página — agendapro.com.br/seu-negocio — para colar no Instagram, Google ou WhatsApp.',
              },
              {
                n: '03',
                title: 'Clientes agendam, você gerencia',
                desc: 'Receba notificação a cada reserva. Confirme, cancele ou bloqueie sua agenda em um clique.',
              },
            ].map((step) => (
              <div key={step.n} className="flex items-start gap-6">
                <span className="text-3xl font-bold text-gray-100 min-w-[48px]">{step.n}</span>
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
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-3">
            Planos
          </p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Simples, sem surpresa</h2>
          <p className="text-gray-400 text-sm mb-12">14 dias grátis em qualquer plano. Sem cartão, sem fidelidade.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">

            {/* Solo */}
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
                <li>✓ Programa de fidelidade com pontos</li>
                <li>✓ Lista de espera automática</li>
                <li>✓ Link de indicação por cliente</li>
                <li>✓ Badge Google Reviews + pontos por avaliar</li>
              </ul>
              <Link
                href="/cadastro"
                className="block text-center bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors text-sm"
              >
                Começar grátis →
              </Link>
            </div>

            {/* Equipe */}
            <div className="bg-gray-900 border border-gray-900 rounded-2xl p-6 text-left relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-white text-gray-900 text-xs font-bold px-2 py-1 rounded-lg">
                Popular
              </div>
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
              <Link
                href="/cadastro"
                className="block text-center bg-white text-gray-900 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors text-sm"
              >
                Começar grátis →
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQ />

      {/* Impulso Digital — outros serviços */}
      <section className="px-6 py-16 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Desenvolvido por</p>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Impulso Digital</h2>
          <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">
            Agência de tecnologia e estratégia digital em Palmas, TO. O AgendaPRO é só um dos serviços que oferecemos.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: '⚡', title: 'Landing Pages', desc: 'Alta conversão para campanhas e lançamentos' },
              { icon: '🛍️', title: 'Lojas Shopify', desc: 'E-commerce pronto para vender' },
              { icon: '🌐', title: 'Sites Next.js', desc: 'Rápidos, modernos e otimizados para SEO' },
              { icon: '🎯', title: 'Consultoria', desc: 'Estratégia digital para escalar seu negócio' },
            ].map((service) => (
              <div key={service.title} className="bg-white rounded-2xl border border-gray-100 p-4 text-left">
                <span className="text-xl mb-2 block">{service.icon}</span>
                <p className="font-semibold text-gray-900 text-sm mb-1">{service.title}</p>
                <p className="text-gray-400 text-xs leading-snug">{service.desc}</p>
              </div>
            ))}
          </div>
          <a
            href="https://impulsodigital063.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-8 text-sm text-gray-500 hover:text-gray-900 transition-colors border border-gray-200 px-5 py-2.5 rounded-xl"
          >
            Conhecer a Impulso Digital →
          </a>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-6 py-20 bg-gray-900 text-center">
        <div className="max-w-lg mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">
            Agenda, fidelidade e indicação — tudo junto
          </h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Configure em 5 minutos. O sistema trabalha por você: agenda os clientes, faz eles voltarem e ainda traz novos através de indicação.
          </p>
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
      <footer className="border-t border-gray-100 px-6 py-10">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-gray-900 text-sm">AgendaPRO</p>
            <p className="text-gray-400 text-xs mt-0.5">
              Um produto da{' '}
              <a href="https://impulsodigital063.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 underline underline-offset-2">
                Impulso Digital
              </a>
              {' '}· Palmas, TO
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-gray-400">
            <Link href="/barbearia" className="hover:text-gray-700">Barbearia</Link>
            <Link href="/salao" className="hover:text-gray-700">Salão de beleza</Link>
            <Link href="/nail" className="hover:text-gray-700">Nail designer</Link>
            <Link href="/estetica" className="hover:text-gray-700">Clínica estética</Link>
            <Link href="/admin/login" className="hover:text-gray-700">Entrar</Link>
          </div>
        </div>
      </footer>

    </main>
  )
}
