import Link from 'next/link'
import FAQ from '@/components/FAQ'
import { AnimatedGradient, SectionReveal, SegmentCard, type Segment } from '@/components/ui'

/* ═══════════════════════════════════════════════════════════
   Dados da página — copy do master (pré v2) em design v2
═══════════════════════════════════════════════════════════ */

const SEGMENTS: Segment[] = ['barbearia', 'salao', 'estetica', 'nail']

const RETENTION_FEATURES = [
  {
    icon: '🏆',
    title: 'Programa de fidelidade',
    result: 'Clientes voltam para você — não para o concorrente',
    desc: 'Cada serviço gera pontos. Você define as recompensas. O cliente sabe que tem vantagem em voltar.',
    accent: '#F59E0B',
  },
  {
    icon: '🔔',
    title: 'Lista de espera automática',
    result: 'Zero vaga desperdiçada quando cancela',
    desc: 'Cancelou um horário? O próximo da fila recebe email na hora e preenche a vaga automaticamente.',
    accent: '#06B6D4',
  },
  {
    icon: '🔗',
    title: 'Indicação com recompensa',
    result: 'Seus clientes te trazem novos clientes',
    desc: 'Cada cliente tem um link único de indicação. Indica um amigo — os dois ganham pontos.',
    accent: '#8B5CF6',
  },
  {
    icon: '⭐',
    title: 'Badge Google Reviews',
    result: 'Mais avaliações no Google sem precisar pedir',
    desc: 'Sua nota aparece na página de agendamento. Cliente ganha pontos por avaliar — incentivo concreto.',
    accent: '#10B981',
  },
]

const VALUE_ITEMS = [
  { item: 'Agenda online (Trinks, iSalon)',       price: 'R$ 89/mês' },
  { item: 'Programa de fidelidade com pontos',    price: 'R$ 49/mês' },
  { item: 'Sistema de indicação entre clientes',  price: 'R$ 79/mês' },
  { item: 'Gestão de avaliações Google Reviews',  price: 'R$ 39/mês' },
]

const TIMELINE = [
  { hora: '07:00', titulo: 'Seu dia começa tranquilo',     detalhe: 'Lembretes já foram enviados ontem. Agenda do dia confirmada. Sem espiar WhatsApp antes do café.' },
  { hora: '10:00', titulo: 'Cliente cancela por imprevisto', detalhe: 'Sistema avisa a fila de espera. Próximo da lista aceita a vaga em minutos. Você nem precisa saber.' },
  { hora: '14:00', titulo: 'Cliente completa 10º serviço',  detalhe: 'Pontos acumulam, ele ganha uma recompensa. Fala no grupo de amigos dele. Indica 2 novos.' },
  { hora: '20:00', titulo: 'Fim do expediente',             detalhe: 'Dashboard mostra: agenda cheia amanhã, 3 novos clientes, 2 avaliações 5★ no Google. Você fecha o app e vive.' },
]

const STEPS = [
  { n: '01', title: 'Cadastre seu negócio',        desc: 'Nome, serviços, horários e profissionais em menos de 5 minutos. Sem técnico, sem burocracia.' },
  { n: '02', title: 'Compartilhe o link',           desc: 'Cole na bio do Instagram, no Google Meu Negócio ou no WhatsApp. Clientes agendam direto.' },
  { n: '03', title: 'O sistema trabalha por você', desc: 'Lembretes automáticos, pontos de fidelidade, indicações e Google Reviews — tudo acontece sozinho.' },
]

/* ═══════════════════════════════════════════════════════════
   Página
═══════════════════════════════════════════════════════════ */

export default function HomePage() {
  return (
    <main className="relative overflow-hidden" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* ═══════════ Announcement bar ═══════════ */}
      <div
        className="relative text-center text-sm font-semibold text-white px-6 py-2.5"
        style={{
          background: 'linear-gradient(90deg, #1E40AF 0%, #06B6D4 50%, #8B5CF6 100%)',
          backgroundSize: '200% 100%',
          animation: 'gradient-flow 10s linear infinite',
        }}
      >
        <span className="mr-2">🎁</span>
        Oferta de lançamento — <strong className="mx-1">14 dias grátis</strong> em qualquer plano. Sem cartão de crédito.
      </div>

      {/* ═══════════ Nav ═══════════ */}
      <nav className="sticky top-0 z-50" style={{ background: 'rgba(5, 7, 19, 0.75)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--glass-border)' }}>
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center">
            <img src="/logo-agendapro-dark.svg" alt="AgendaPRO" className="h-7" />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/admin/login" className="hidden sm:inline-flex text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-2">
              Entrar
            </Link>
            <Link href="/cadastro" className="btn btn-primary-v2 text-sm px-5 py-2.5">
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative">
        <AnimatedGradient />

        <div className="container relative z-10 py-20 md:py-28">
          <SectionReveal className="flex flex-col items-center text-center gap-8 max-w-4xl mx-auto">

            {/* Badge */}
            <div className="pill-glow animate-pulse-glow">
              <span>✨</span>
              <span>Você acabou de ganhar 14 dias de acesso gratuito</span>
            </div>

            {/* Headline */}
            <h1 className="display-xl text-white">
              De agenda no WhatsApp<br />
              para negócio que <span className="text-gradient">cresce sozinho.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed">
              Agenda online, fidelidade, indicação e Google Reviews num único lugar. Configure em 5 minutos. Funciona hoje mesmo.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              <Link href="/cadastro" className="btn btn-lg btn-primary-v2">
                Garantir meu acesso gratuito
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <a href="#como-funciona" className="btn btn-lg btn-ghost">
                Ver como funciona
              </a>
            </div>

            {/* Proof line */}
            <p className="text-sm text-slate-400">
              Sem cartão · Cancele quando quiser · R$67/mês após o trial
            </p>

            {/* Mini stats */}
            <div className="grid grid-cols-3 gap-6 md:gap-10 pt-8 mt-2 border-t w-full max-w-xl" style={{ borderColor: 'var(--glass-border)' }}>
              {[
                { n: '24h',   l: 'Agendamento online' },
                { n: '-50%',  l: 'Menos faltas' },
                { n: '5 min', l: 'Para configurar' },
              ].map((s) => (
                <div key={s.n}>
                  <p className="text-2xl md:text-3xl font-black text-gradient leading-none">{s.n}</p>
                  <p className="text-xs text-slate-400 mt-2 leading-tight">{s.l}</p>
                </div>
              ))}
            </div>

          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ Stats bar (dark highlight) ═══════════ */}
      <section className="px-6 pb-20">
        <div className="container">
          <SectionReveal>
            <div
              className="glass rounded-3xl p-8 md:p-10"
              style={{
                background: 'linear-gradient(135deg, rgba(30,64,175,0.35) 0%, rgba(6,182,212,0.25) 100%)',
                border: '1px solid rgba(59,130,246,0.25)',
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                {[
                  { n: '+800',    l: 'Agendamentos realizados' },
                  { n: 'R$256',   l: 'Valor separado. Seu preço: R$67' },
                  { n: '14 dias', l: 'Grátis para testar, sem cartão' },
                ].map((s) => (
                  <div key={s.n}>
                    <p className="text-3xl md:text-4xl font-black text-white leading-none">{s.n}</p>
                    <p className="text-sm text-slate-300 mt-2 leading-snug">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ Segmentos ═══════════ */}
      <section id="segmentos" className="section relative">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 50% 40% at 50% 0%, rgba(59,130,246,0.15) 0%, transparent 60%)'
        }} />

        <div className="container relative">
          <SectionReveal className="text-center mb-12 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#06B6D4' }}>●</span>
              <span>Para qualquer negócio de serviço</span>
            </div>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SEGMENTS.map((seg) => (
              <SegmentCard key={seg} segment={seg} />
            ))}
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ Seu dia, reescrito (TIMELINE) ═══════════ */}
      <section id="seu-dia" className="section relative">
        <div className="container">
          <SectionReveal className="text-center mb-14 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#10B981' }}>●</span>
              <span>Um dia real com AgendaPRO</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Seu dia, <span className="text-gradient">reescrito</span>.
            </h2>
            <p className="text-lg text-slate-400">
              Como o sistema trabalha por você — do café da manhã até o fim do expediente.
            </p>
          </SectionReveal>

          <div className="max-w-3xl mx-auto relative">
            {/* linha vertical */}
            <div
              className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px -translate-x-1/2"
              style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(59,130,246,0.4) 20%, rgba(6,182,212,0.4) 80%, transparent 100%)' }}
              aria-hidden="true"
            />
            <SectionReveal stagger className="flex flex-col gap-8">
              {TIMELINE.map((t, i) => (
                <div key={i} className={`flex items-start gap-6 md:gap-12 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                  <div className="flex-shrink-0 relative z-10 flex items-center gap-4 md:flex-col md:items-center md:w-[120px]">
                    <div
                      className="relative h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'rgba(5,7,19,1)',
                        border: '2px solid rgba(59,130,246,0.5)',
                        boxShadow: '0 0 20px rgba(59,130,246,0.35)',
                      }}
                    >
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                    </div>
                    <span className="font-mono text-sm text-cyan-300 font-semibold">{t.hora}</span>
                  </div>

                  <div className="glass rounded-2xl p-6 md:p-8 flex-1">
                    <h3 className="text-lg md:text-xl font-bold text-white mb-2">{t.titulo}</h3>
                    <p className="text-slate-400 leading-relaxed">{t.detalhe}</p>
                  </div>
                </div>
              ))}
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* ═══════════ Motor de retenção ═══════════ */}
      <section id="retencao" className="section relative">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(139,92,246,0.1) 0%, transparent 60%)'
        }} />

        <div className="container relative">
          <SectionReveal className="text-center mb-14 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#8B5CF6' }}>●</span>
              <span>O que o concorrente não tem</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              4 motores de <span className="text-gradient">retenção</span><br />
              rodando 24/7.
            </h2>
            <p className="text-lg text-slate-400">
              Outros softwares só anotam horário. A AgendaPRO traz cliente de volta, preenche buraco de agenda e cresce sua reputação.
            </p>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {RETENTION_FEATURES.map((f, i) => (
              <div key={i} className="glass glow-border rounded-3xl p-8 md:p-10 relative group hover:-translate-y-1 transition-all">
                <div
                  className="h-14 w-14 rounded-2xl flex items-center justify-center text-3xl mb-5 transition-transform group-hover:scale-110"
                  style={{
                    background: `${f.accent}15`,
                    border: `1px solid ${f.accent}40`,
                    boxShadow: `0 0 40px ${f.accent}30`,
                  }}
                >
                  {f.icon}
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm font-semibold mb-3" style={{ color: f.accent }}>→ {f.result}</p>
                <p className="text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ Como funciona ═══════════ */}
      <section id="como-funciona" className="section relative">
        <div className="container">
          <SectionReveal className="text-center mb-14 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#10B981' }}>●</span>
              <span>Como funciona</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Três passos.<br />
              <span className="text-gradient">Pronto para usar hoje.</span>
            </h2>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((p) => (
              <div key={p.n} className="glass rounded-3xl p-8 md:p-10 relative">
                <div
                  className="font-mono text-5xl font-black mb-4"
                  style={{
                    background: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {p.n}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{p.title}</h3>
                <p className="text-slate-400 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ Valor empilhado ═══════════ */}
      <section id="valor" className="section relative">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(245,158,11,0.1) 0%, transparent 60%)'
        }} />

        <div className="container relative">
          <SectionReveal className="text-center mb-12 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#F59E0B' }}>●</span>
              <span>Quanto valeria tudo isso separado?</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Veja o que você está <span className="text-gradient">levando</span>.
            </h2>
            <p className="text-lg text-slate-400">
              Tudo junto, por menos de R$2,20 por dia.
            </p>
          </SectionReveal>

          <SectionReveal className="max-w-xl mx-auto">
            <div className="glass rounded-3xl overflow-hidden">
              {VALUE_ITEMS.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--glass-border)' }}>
                  <p className="text-slate-300 text-sm md:text-base">{r.item}</p>
                  <p className="font-mono text-slate-500 line-through text-sm md:text-base">{r.price}</p>
                </div>
              ))}
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--glass-border)', background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-slate-300 font-semibold">Total separado</p>
                <p className="font-mono text-slate-400 font-bold line-through">R$ 256/mês</p>
              </div>
              <div
                className="flex items-center justify-between px-6 py-6"
                style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)' }}
              >
                <div>
                  <p className="text-white font-bold text-base md:text-lg">AgendaPRO — tudo junto</p>
                  <p className="text-white/70 text-xs mt-0.5">14 dias grátis · sem cartão</p>
                </div>
                <div className="text-right">
                  <p className="text-white text-2xl md:text-3xl font-black leading-none">
                    R$67<span className="text-sm font-normal text-white/70">/mês</span>
                  </p>
                  <p className="text-white/70 text-[11px] mt-1">menos de R$2,20/dia</p>
                </div>
              </div>
            </div>

            <div className="text-center mt-8">
              <Link href="/cadastro" className="btn btn-lg btn-primary-v2">
                Quero garantir esse valor
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <p className="text-slate-500 text-xs mt-3">
                Oferta de lançamento — pode subir a qualquer momento
              </p>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ Pricing ═══════════ */}
      <section id="precos" className="section relative">
        <div className="container">
          <SectionReveal className="text-center mb-12 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#3B82F6' }}>●</span>
              <span>Planos</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Escolha o <span className="text-gradient">seu</span>.
            </h2>
            <p className="text-lg text-slate-400">
              14 dias grátis em qualquer plano. Sem cartão, sem fidelidade.
            </p>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Solo */}
            <div className="glass rounded-3xl p-8 md:p-10 relative">
              <div className="mb-6">
                <h3 className="text-2xl font-black text-white mb-1">Solo</h3>
                <p className="text-slate-400 text-sm">Profissional independente</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">R$67</span>
                  <span className="text-slate-400 text-sm">/mês</span>
                </div>
                <p className="text-slate-500 text-xs line-through mt-1">antes R$97</p>
              </div>

              <ul className="space-y-2.5 mb-6 text-sm text-slate-300">
                {[
                  'Página de agendamento personalizada',
                  'Agendamento 24h pelo link ou redes sociais',
                  'Lembrete automático D-1 para o cliente',
                  'Painel de gestão pelo celular',
                  'Serviços ilimitados',
                  'Programa de fidelidade com pontos',
                  'Lista de espera automática',
                  'Link de indicação por cliente',
                  'Badge Google Reviews + pontos por avaliar',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="text-cyan-400 font-bold mt-0.5 flex-shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2.5 pt-2">
                  <span className="flex-shrink-0">🎁</span>
                  <div>
                    <strong className="text-white text-sm">Bônus: 2º profissional incluído</strong>
                    <p className="text-slate-500 text-xs mt-0.5">Normalmente 1 — na oferta você cadastra 2</p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex-shrink-0">🎁</span>
                  <div>
                    <strong className="text-white text-sm">Bônus: Área de divulgação exclusiva</strong>
                    <p className="text-slate-500 text-xs mt-0.5">Textos prontos para Instagram, Google e WhatsApp</p>
                  </div>
                </li>
              </ul>

              <p className="text-emerald-400 text-xs font-semibold mb-4">
                14 dias grátis — sem cartão
              </p>
              <Link href="/cadastro" className="btn btn-primary-v2 w-full justify-center">
                Começar grátis
              </Link>
            </div>

            {/* Equipe */}
            <div className="glass glow-border rounded-3xl p-8 md:p-10 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 pill-glow text-xs whitespace-nowrap">
                ⭐ MAIS POPULAR
              </div>

              <div className="mb-6 mt-2">
                <h3 className="text-2xl font-black text-white mb-1">Equipe</h3>
                <p className="text-slate-400 text-sm">De 3 a 5 profissionais</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-gradient">R$107</span>
                  <span className="text-slate-400 text-sm">/mês</span>
                </div>
                <p className="text-slate-500 text-xs line-through mt-1">antes R$147</p>
              </div>

              <ul className="space-y-2.5 mb-6 text-sm text-slate-300">
                {[
                  'Tudo do plano Solo',
                  'De 3 a 5 profissionais com agenda individual',
                  'Relatório de comissão automático por profissional',
                  'Financeiro e faturamento por período',
                  'Suporte prioritário via WhatsApp',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="text-cyan-400 font-bold mt-0.5 flex-shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="text-emerald-400 text-xs font-semibold mb-4">
                14 dias grátis — sem cartão
              </p>
              <Link href="/cadastro" className="btn btn-primary-v2 w-full justify-center">
                Começar grátis
              </Link>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section id="faq" className="section relative">
        <div className="container max-w-3xl">
          <SectionReveal className="text-center mb-12">
            <div className="pill mb-6">
              <span style={{ color: '#3B82F6' }}>●</span>
              <span>Perguntas frequentes</span>
            </div>
            <h2 className="display-lg text-white mb-4">Dúvida? <span className="text-gradient">Resposta.</span></h2>
          </SectionReveal>

          <SectionReveal>
            <FAQ />
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ CTA FINAL ═══════════ */}
      <section className="section-lg relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(59,130,246,0.25) 0%, transparent 60%)'
          }} />
        </div>

        <div className="container relative text-center max-w-3xl">
          <SectionReveal>
            <div className="pill-glow mb-6 animate-pulse-glow">
              <span>⏱</span>
              <span>14 dias grátis · sem cartão · cancele quando quiser</span>
            </div>
            <h2 className="display-xl text-white mb-6">
              Seu concorrente ainda<br />
              agenda pelo <span className="text-gradient">WhatsApp</span>.
            </h2>
            <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              Configure agora, compartilhe o link e veja a diferença hoje mesmo.
            </p>

            <Link href="/cadastro" className="btn btn-lg btn-primary-v2">
              Garantir meu acesso gratuito
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <p className="text-slate-500 text-xs mt-5">
              R$67/mês após o trial · Oferta de lançamento
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="py-12 border-t" style={{ borderColor: 'var(--glass-border)' }}>
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <img src="/logo-agendapro-dark.svg" alt="AgendaPRO" className="h-6" />
              <span className="text-xs text-slate-500">© 2025 AgendaPRO · by Impulso Digital · Palmas, TO</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <Link href="/barbearia" className="text-slate-400 hover:text-white transition-colors">Barbearia</Link>
              <Link href="/salao" className="text-slate-400 hover:text-white transition-colors">Salão</Link>
              <Link href="/nail" className="text-slate-400 hover:text-white transition-colors">Nail</Link>
              <Link href="/estetica" className="text-slate-400 hover:text-white transition-colors">Estética</Link>
              <Link href="/privacidade" className="text-slate-400 hover:text-white transition-colors">Privacidade</Link>
              <Link href="/termos" className="text-slate-400 hover:text-white transition-colors">Termos</Link>
              <Link href="/admin/login" className="text-slate-400 hover:text-white transition-colors">Entrar</Link>
            </div>
          </div>
        </div>
      </footer>

    </main>
  )
}
