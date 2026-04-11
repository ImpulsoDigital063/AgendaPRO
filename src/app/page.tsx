import Link from 'next/link'

const BUSINESS_TYPES = [
  { icon: '✂️', name: 'Barbearia' },
  { icon: '💅', name: 'Nail designer' },
  { icon: '💇', name: 'Salão de beleza' },
  { icon: '🧴', name: 'Clínica estética' },
  { icon: '🧠', name: 'Psicólogo' },
  { icon: '💪', name: 'Personal trainer' },
  { icon: '🦷', name: 'Dentista' },
  { icon: '📋', name: 'Qualquer serviço' },
]

const STEPS = [
  {
    number: '01',
    title: 'Cadastre seu negócio',
    description: 'Nome, endereço, serviços e horários de atendimento. Pronto em menos de 5 minutos.',
  },
  {
    number: '02',
    title: 'Compartilhe o link',
    description: 'Você recebe uma página pública — agendapro.com.br/seu-negocio — para enviar aos clientes.',
  },
  {
    number: '03',
    title: 'Gerencie tudo pelo painel',
    description: 'Receba notificação a cada novo agendamento. Confirme ou cancele com um clique.',
  },
]

const FEATURES = [
  { icon: '📅', title: 'Agendamento online 24h', desc: 'Seu cliente agenda a qualquer hora, sem precisar te chamar no WhatsApp.' },
  { icon: '🔔', title: 'Notificação imediata', desc: 'Você recebe um email a cada nova reserva com os dados do cliente.' },
  { icon: '✅', title: 'Confirme ou cancele', desc: 'Gerencie os agendamentos direto pelo email ou pelo painel.' },
  { icon: '👥', title: 'Múltiplos profissionais', desc: 'Cada profissional com sua própria agenda e horários.' },
  { icon: '🔗', title: 'Página personalizada', desc: 'URL com o nome do seu negócio para passar para os clientes.' },
  { icon: '📱', title: 'Funciona em qualquer tela', desc: 'Otimizado para celular — onde seus clientes vão acessar.' },
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
              Criar conta grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-4">
            Sistema de agendamento
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
            Seu negócio com<br />agendamento online<br />
            <span className="text-gray-400">em minutos</span>
          </h1>
          <p className="text-gray-500 text-lg mb-10 max-w-lg mx-auto">
            Chega de agenda no papel e cliente te chamando no WhatsApp para marcar horário.
            Configure uma vez, compartilhe o link e pronto.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/cadastro"
              className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-semibold text-base hover:bg-gray-800 transition-colors"
            >
              Criar minha página de agendamento →
            </Link>
          </div>
          <p className="text-gray-400 text-xs mt-4">Sem cartão de crédito. Funciona hoje mesmo.</p>
        </div>
      </section>

      {/* Para quem é */}
      <section className="px-6 py-12 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-8">
            Para qualquer negócio de serviço
          </p>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
            {BUSINESS_TYPES.map((type) => (
              <div key={type.name} className="flex flex-col items-center gap-2">
                <span className="text-2xl">{type.icon}</span>
                <span className="text-xs text-gray-500 text-center leading-tight">{type.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-widest text-center mb-12">
            Como funciona
          </p>
          <div className="space-y-10">
            {STEPS.map((step) => (
              <div key={step.number} className="flex items-start gap-6">
                <span className="text-3xl font-bold text-gray-100 min-w-[48px]">{step.number}</span>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">{step.title}</h3>
                  <p className="text-gray-500">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-widest text-center mb-12">
            O que está incluído
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="bg-white rounded-2xl border border-gray-100 p-5">
                <span className="text-2xl mb-3 block">{feature.icon}</span>
                <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                <p className="text-gray-500 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preços */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-12">
            Planos
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">

            {/* Solo */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 text-left">
              <h3 className="font-bold text-gray-900 text-lg mb-1">Solo</h3>
              <p className="text-gray-400 text-sm mb-4">1 profissional</p>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                R$97<span className="text-base font-normal text-gray-400">/mês</span>
              </p>
              <p className="text-xs text-gray-400 mb-6">+ R$800 de setup</p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li>✓ Página de agendamento personalizada</li>
                <li>✓ Notificação por email</li>
                <li>✓ Painel de gestão</li>
                <li>✓ Serviços ilimitados</li>
              </ul>
              <Link
                href="/cadastro"
                className="block text-center bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors text-sm"
              >
                Começar agora
              </Link>
            </div>

            {/* Equipe */}
            <div className="bg-gray-900 border border-gray-900 rounded-2xl p-6 text-left">
              <h3 className="font-bold text-white text-lg mb-1">Equipe</h3>
              <p className="text-gray-400 text-sm mb-4">Até 5 profissionais</p>
              <p className="text-3xl font-bold text-white mb-1">
                R$147<span className="text-base font-normal text-gray-400">/mês</span>
              </p>
              <p className="text-xs text-gray-400 mb-6">+ R$800 de setup</p>
              <ul className="space-y-2 text-sm text-gray-300 mb-6">
                <li>✓ Tudo do Solo</li>
                <li>✓ Múltiplos profissionais</li>
                <li>✓ Agenda individual por profissional</li>
                <li>✓ Suporte prioritário</li>
              </ul>
              <Link
                href="/cadastro"
                className="block text-center bg-white text-gray-900 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors text-sm"
              >
                Começar agora
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-6 py-20 bg-gray-900 text-center">
        <div className="max-w-lg mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">
            Pronto para ter sua página de agendamento?
          </h2>
          <p className="text-gray-400 mb-8">
            Configure em menos de 5 minutos e compartilhe com seus clientes hoje mesmo.
          </p>
          <Link
            href="/cadastro"
            className="inline-block bg-white text-gray-900 px-8 py-4 rounded-2xl font-bold text-base hover:bg-gray-100 transition-colors"
          >
            Criar conta grátis →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8 text-center">
        <p className="text-gray-400 text-sm">
          AgendaPRO · <a href="https://impulsod.com.br" className="hover:text-gray-600">Impulso Digital</a> · Palmas, TO
        </p>
      </footer>

    </main>
  )
}
