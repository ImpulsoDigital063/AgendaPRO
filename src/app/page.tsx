import Link from 'next/link'
import FAQ from '@/components/FAQ'
import IPhoneAgendaMockup from '@/components/IPhoneAgendaMockup'
import {
  AnimatedGradient,
  SectionReveal,
  SegmentCard,
  MechanismIcon,
  type Segment,
  type Mechanism,
} from '@/components/ui'

/* ═══════════════════════════════════════════════════════════
   Dados — copy de funil + ângulo IA / automação inteligente
═══════════════════════════════════════════════════════════ */

const SEGMENTS: Segment[] = ['barbearia', 'salao', 'estetica', 'nail']

const DORES = [
  {
    icon: '👻',
    titulo:  'Cliente some depois do orçamento',
    detalhe: 'Manda pergunta, você responde, e some. Sem follow-up automático você perde clientes antes deles agendarem.',
    accent:  '#8B5CF6',
  },
  {
    icon: '📵',
    titulo:  'Você virou recepcionista de si mesmo',
    detalhe: '3 horas por dia no WhatsApp confirmando, remarcando, cobrando. Seu talento vira trabalho burocrático.',
    accent:  '#06B6D4',
  },
  {
    icon: '📉',
    titulo:  'Agenda quebra, faturamento quebra',
    detalhe: 'No-show, encaixe perdido, cliente que não volta. Cada vaga vazia custa R$80–R$300 que não entram no caixa.',
    accent:  '#EC4899',
  },
]

const TIMELINE = [
  { hora: '07:00', titulo: 'Seu dia começa tranquilo',     detalhe: 'Lembretes já foram enviados ontem. Agenda do dia confirmada. Sem espiar WhatsApp antes do café.' },
  { hora: '10:00', titulo: 'Cliente cancela por imprevisto', detalhe: 'O sistema avisa a fila de espera. Próximo da lista aceita a vaga em minutos. Você nem precisa saber.' },
  { hora: '14:00', titulo: 'Cliente completa 10º serviço',  detalhe: 'Pontos acumulam, ele ganha uma recompensa. Fala no grupo de amigos dele. Indica 2 novos.' },
  { hora: '20:00', titulo: 'Fim do expediente',             detalhe: 'Dashboard mostra: agenda cheia amanhã, 3 novos clientes, 2 avaliações 5★ no Google. Você fecha o app e vive.' },
]

const MOTORES: { kind: Mechanism; title: string; result: string; desc: string; accent: string }[] = [
  {
    kind:   'fidelidade',
    title:  'Programa de fidelidade',
    result: 'Cliente volta — não busca o concorrente',
    desc:   'Cada serviço soma pontos. Você define as recompensas. Ele sabe que tem vantagem em voltar — e volta.',
    accent: '#F59E0B',
  },
  {
    kind:   'fila',
    title:  'Lista de espera automática',
    result: 'Zero horário desperdiçado em cancelamento',
    desc:   'Cancelou? O próximo da fila recebe email na hora e preenche a vaga. Sem você mexer no celular.',
    accent: '#8B5CF6',
  },
  {
    kind:   'indicacao',
    title:  'Indicação com link único',
    result: 'Seus clientes te trazem novos clientes',
    desc:   'Cada cliente tem um link próprio. Indica um amigo — os dois ganham pontos. Crescimento orgânico, sem anúncio.',
    accent: '#EC4899',
  },
  {
    kind:   'reviews',
    title:  'Google Reviews automático',
    result: 'Mais avaliações sem precisar pedir',
    desc:   'Sua nota aparece na página de agendamento. Cliente ganha pontos por avaliar — incentivo concreto, todo dia.',
    accent: '#10B981',
  },
]

const COMPARISON = [
  { row: 'Cliente agenda sozinho 24h',           ap: true,  whats: false, caderno: false },
  { row: 'Lembrete automático antes do horário', ap: true,  whats: false, caderno: false },
  { row: 'Lista de espera quando cancela',       ap: true,  whats: false, caderno: false },
  { row: 'Programa de fidelidade com pontos',    ap: true,  whats: false, caderno: false },
  { row: 'Link de indicação por cliente',        ap: true,  whats: false, caderno: false },
  { row: 'Página personalizada com sua marca',   ap: true,  whats: false, caderno: false },
  { row: 'Google Reviews integrado',             ap: true,  whats: false, caderno: false },
  { row: 'Funciona enquanto você dorme',         ap: true,  whats: false, caderno: false },
]

const VALUE_ITEMS = [
  { item: 'Agenda online (Trinks, iSalon)',       price: 'R$ 89/mês' },
  { item: 'Programa de fidelidade com pontos',    price: 'R$ 49/mês' },
  { item: 'Sistema de indicação entre clientes',  price: 'R$ 79/mês' },
  { item: 'Gestão de avaliações Google Reviews',  price: 'R$ 39/mês' },
]

const STEPS = [
  { n: '01', title: 'Cadastre seu negócio',        desc: 'Nome, serviços, horários e profissionais em menos de 5 minutos. Sem técnico, sem burocracia.' },
  { n: '02', title: 'Compartilhe o link',          desc: 'Cole na bio do Instagram, no Google Meu Negócio ou no WhatsApp. Cliente agenda direto.' },
  { n: '03', title: 'O sistema trabalha por você', desc: 'Lembretes, fidelidade, fila de espera, indicação e Reviews acontecem sozinhos. Você só atende.' },
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
        Oferta de lançamento — <strong className="mx-1">14 dias grátis</strong>. Sem cartão de crédito.
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

      {/* ═══════════ 1. HERO — IA toma conta da agenda ═══════════ */}
      <section className="relative">
        <AnimatedGradient />

        <div className="container relative z-10 py-16 md:py-24">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">

            {/* Coluna esquerda — copy */}
            <SectionReveal className="flex flex-col items-center lg:items-start text-center lg:text-left gap-7">

              <div className="pill-glow animate-pulse-glow">
                <span>✨</span>
                <span>Você acabou de ganhar 14 dias de acesso gratuito</span>
              </div>

              <h1 className="display-xl text-white">
                Sua agenda agora tem<br />
                <span className="text-gradient">inteligência</span> própria.
              </h1>

              <p className="text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed">
                O AgendaPRO confirma horário, preenche cancelamento, traz cliente de volta e cresce sua reputação no Google.
                <strong className="text-white"> Você atende — ele cuida do resto.</strong>
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/cadastro" className="btn btn-lg btn-primary-v2">
                  Garantir meu acesso gratuito
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
                <a href="#mecanismos" className="btn btn-lg btn-ghost">
                  Ver como funciona
                </a>
              </div>

              <p className="text-sm text-slate-400">
                Sem cartão · Cancele quando quiser · R$67/mês após o trial
              </p>

              <div className="grid grid-cols-3 gap-6 md:gap-10 pt-6 border-t w-full max-w-xl" style={{ borderColor: 'var(--glass-border)' }}>
                {[
                  { n: '24h',   l: 'Atende sozinho' },
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

            {/* Coluna direita — mockup iPhone */}
            <SectionReveal className="flex justify-center lg:justify-end mt-4 lg:mt-0">
              <IPhoneAgendaMockup />
            </SectionReveal>

          </div>
        </div>
      </section>

      {/* ═══════════ 2. DOR REAL ═══════════ */}
      <section id="dor" className="section relative">
        <div className="container">
          <SectionReveal className="text-center mb-14 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#EC4899' }}>●</span>
              <span>Se você se identifica com isso, leia até o fim</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Hoje sua agenda<br />
              te <span className="text-gradient">consome</span>.
            </h2>
            <p className="text-lg text-slate-400">
              A maioria dos profissionais perde 3 horas por dia operando o que devia ser automático.
            </p>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DORES.map((d, i) => (
              <div key={i} className="glass p-8 md:p-10 rounded-3xl relative group">
                <div
                  className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl"
                  style={{ background: `linear-gradient(90deg, transparent, ${d.accent}, transparent)` }}
                />
                <div className="text-5xl mb-4">{d.icon}</div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-3">{d.titulo}</h3>
                <p className="text-slate-400 leading-relaxed">{d.detalhe}</p>
              </div>
            ))}
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 3. SOLUÇÃO em 1 frase + Segmentos ═══════════ */}
      <section id="segmentos" className="section relative">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 50% 40% at 50% 0%, rgba(59,130,246,0.18) 0%, transparent 60%)'
        }} />

        <div className="container relative">
          <SectionReveal className="text-center mb-12 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#06B6D4' }}>●</span>
              <span>O fim disso tudo</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Um sistema que <span className="text-gradient">opera</span><br />
              o seu negócio por você.
            </h2>
            <p className="text-lg text-slate-400">
              Funciona pra qualquer negócio de serviço — escolha o seu pra ver os detalhes.
            </p>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SEGMENTS.map((seg) => (
              <SegmentCard key={seg} segment={seg} />
            ))}
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 4. SEU DIA, REESCRITO ═══════════ */}
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

      {/* ═══════════ 5. 4 MOTORES DE RETENÇÃO (mecanismos com SVG) ═══════════ */}
      <section id="mecanismos" className="section relative">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(139,92,246,0.12) 0%, transparent 60%)'
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
              Cada um foi desenhado pra resolver um problema específico — e funciona sozinho, sem você precisar lembrar.
            </p>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {MOTORES.map((m) => (
              <div key={m.kind} className="glass glow-border rounded-3xl p-8 md:p-10 relative group hover:-translate-y-1 transition-all">
                <div className="mb-5 transition-transform group-hover:scale-105">
                  <MechanismIcon kind={m.kind} size={84} />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">{m.title}</h3>
                <p className="text-sm font-semibold mb-3" style={{ color: m.accent }}>→ {m.result}</p>
                <p className="text-slate-400 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 6. COMPARAÇÃO DIRETA ═══════════ */}
      <section className="section relative">
        <div className="container max-w-4xl">
          <SectionReveal className="text-center mb-12">
            <div className="pill mb-6">
              <span style={{ color: '#06B6D4' }}>●</span>
              <span>Comparação direta</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Por que <span className="text-gradient">WhatsApp + caderno</span><br />
              está custando seu mês.
            </h2>
          </SectionReveal>

          <SectionReveal>
            <div className="glass rounded-3xl overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 md:gap-6 px-5 md:px-8 py-4 text-xs md:text-sm font-semibold border-b" style={{ borderColor: 'var(--glass-border)', background: 'rgba(255,255,255,0.03)' }}>
                <span className="text-slate-400">Recurso</span>
                <span className="text-center w-20 md:w-24" style={{ color: '#3B82F6' }}>AgendaPRO</span>
                <span className="text-center w-16 md:w-20 text-slate-500">WhatsApp</span>
                <span className="text-center w-16 md:w-20 text-slate-500">Caderno</span>
              </div>
              {COMPARISON.map((c) => (
                <div key={c.row} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 md:gap-6 px-5 md:px-8 py-3.5 text-xs md:text-sm border-b" style={{ borderColor: 'var(--glass-border)' }}>
                  <span className="text-slate-200">{c.row}</span>
                  <span className="text-center w-20 md:w-24">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg,#3B82F6,#06B6D4)' }}>✓</span>
                  </span>
                  <span className="text-center w-16 md:w-20 text-slate-600 text-lg leading-none">—</span>
                  <span className="text-center w-16 md:w-20 text-slate-600 text-lg leading-none">—</span>
                </div>
              ))}
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 7. COMO COMEÇAR (3 passos) ═══════════ */}
      <section id="como-funciona" className="section relative">
        <div className="container">
          <SectionReveal className="text-center mb-14 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#10B981' }}>●</span>
              <span>Como começar</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Três passos.<br />
              <span className="text-gradient">Funcionando hoje.</span>
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

      {/* ═══════════ 8. VALOR EMPILHADO ═══════════ */}
      <section id="valor" className="section relative">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(245,158,11,0.1) 0%, transparent 60%)'
        }} />

        <div className="container relative">
          <SectionReveal className="text-center mb-12 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#F59E0B' }}>●</span>
              <span>Quanto custaria isso separado?</span>
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

      {/* ═══════════ 9. PRICING ═══════════ */}
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

      {/* ═══════════ 10. PROVA SOCIAL — Primeiros parceiros do lançamento ═══════════ */}
      <section className="section relative">
        <div className="container max-w-3xl">
          <SectionReveal>
            <div
              className="glass glow-border rounded-3xl p-8 md:p-12 text-center"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(6,182,212,0.12) 100%)',
                border: '1px solid rgba(139,92,246,0.25)',
              }}
            >
              <div className="pill mb-5 inline-flex">
                <span style={{ color: '#8B5CF6' }}>●</span>
                <span>Lançamento exclusivo</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-white mb-4">
                Estamos abrindo as <span className="text-gradient">primeiras 10 vagas</span> do AgendaPRO.
              </h3>
              <p className="text-slate-300 leading-relaxed mb-6 max-w-xl mx-auto">
                Dois negócios já estão configurando essa semana. Você entra agora com o preço de lançamento — quando virarmos a chave de R$67 pra R$97, quem assinou trava o valor pra sempre.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  2 negócios já confirmados
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  R$67 travado pra sempre
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
                  Suporte direto com o fundador
                </span>
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 11. FAQ ═══════════ */}
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

      {/* ═══════════ 12. CTA FINAL ═══════════ */}
      <section className="section-lg relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(59,130,246,0.28) 0%, transparent 60%)'
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

      {/* ═══════════ 13. FOOTER ═══════════ */}
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
