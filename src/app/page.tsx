import Link from 'next/link'
import FAQ from '@/components/FAQ'
import { AnimatedGradient, SectionReveal, SegmentCard, type Segment } from '@/components/ui'

/* ═══════════════════════════════════════════════════════════
   Dados da página
═══════════════════════════════════════════════════════════ */

const SEGMENTS: Segment[] = ['barbearia', 'salao', 'estetica', 'nail']

const DORES = [
  {
    titulo:   'Cliente some depois do orçamento',
    detalhe:  'Manda pergunta, você responde, e some. Sem follow-up automático você perde 40% dos curiosos antes deles agendarem.',
    icone:    '👻',
    accent:   '#8B5CF6',
  },
  {
    titulo:   'Você virou recepcionista de si mesmo',
    detalhe:  '3 horas por dia no WhatsApp confirmando, remarcando, cobrando. Seu talento vira trabalho burocrático.',
    icone:    '📵',
    accent:   '#06B6D4',
  },
  {
    titulo:   'Agenda quebra, faturamento quebra',
    detalhe:  'No-show, encaixe perdido, cliente que não volta. Cada vaga vazia é R$80-R$300 que não entra. Sem sistema, não tem retenção.',
    icone:    '📉',
    accent:   '#EC4899',
  },
]

const TIMELINE = [
  { hora: '07:00', titulo: 'Seu dia começa tranquilo',   detalhe: 'Lembretes já foram enviados ontem. Agenda do dia confirmada. Sem espiar WhatsApp antes do café.' },
  { hora: '10:00', titulo: 'Cliente cancela por imprevisto', detalhe: 'Sistema avisa a fila de espera. Próximo da lista aceita a vaga em minutos. Você nem precisa saber.' },
  { hora: '14:00', titulo: 'Cliente completa 10º serviço', detalhe: 'Pontos acumulam, ele ganha uma recompensa. Fala no grupo de amigos dele. Indica 2 novos.' },
  { hora: '20:00', titulo: 'Fim do expediente',            detalhe: 'Dashboard mostra: agenda cheia amanhã, 3 novos clientes, 2 avaliações 5★ no Google. Você fecha o app e vive.' },
]

const RETENTION = [
  {
    icon:    '🏆',
    title:   'Fidelidade com pontos',
    result:  'Cliente volta — não busca o concorrente',
    desc:    'Cada serviço soma. Você define recompensas. Ele sabe que tem vantagem em voltar. Retenção vira rotina.',
    accent:  '#F59E0B',
  },
  {
    icon:    '🔔',
    title:   'Lista de espera automática',
    result:  'Zero horário desperdiçado em cancelamento',
    desc:    'Cancelou? O próximo da fila recebe email na hora e preenche a vaga. Sem você mexer no celular.',
    accent:  '#06B6D4',
  },
  {
    icon:    '🔗',
    title:   'Indicação com pontos',
    result:  'Cliente satisfeito traz outro cliente',
    desc:    'Cada um tem link único. Indica um amigo — os dois ganham. Crescimento orgânico sem anúncio.',
    accent:  '#8B5CF6',
  },
  {
    icon:    '⭐',
    title:   'Reputação Google',
    result:  'Mais avaliações 5★ sem precisar pedir',
    desc:    'Sua nota aparece na página pública. Cliente ganha ponto por avaliar. Ranking sobe no Google sozinho.',
    accent:  '#10B981',
  },
]

const COMPARISON = [
  { feature: 'Agendamento online 24/7',          nos: true, wpp: false, livro: false },
  { feature: 'Lembrete automático D-1 e 1h',      nos: true, wpp: false, livro: false },
  { feature: 'Programa de fidelidade',            nos: true, wpp: false, livro: false },
  { feature: 'Lista de espera automática',        nos: true, wpp: false, livro: false },
  { feature: 'Link de indicação com pontos',      nos: true, wpp: false, livro: false },
  { feature: 'Badge Google Reviews',              nos: true, wpp: false, livro: false },
  { feature: 'Relatório de faturamento',          nos: true, wpp: false, livro: false },
  { feature: 'Funciona no celular E computador',  nos: true, wpp: true,  livro: false },
  { feature: 'Taxa por agendamento',              nos: '0%', wpp: '—',   livro: '—' },
]

const VALUE_STACK = [
  { item: 'Agenda online (Trinks, iSalon)',      price: 'R$ 89/mês' },
  { item: 'Programa de fidelidade com pontos',   price: 'R$ 49/mês' },
  { item: 'Sistema de indicação entre clientes', price: 'R$ 79/mês' },
  { item: 'Gestão de avaliações Google Reviews', price: 'R$ 39/mês' },
]

const PASSOS = [
  { n: '01', title: 'Cadastre seu negócio',       desc: 'Nome, serviços, horários e profissionais em menos de 5 minutos. Sem técnico, sem burocracia.' },
  { n: '02', title: 'Compartilhe o link',          desc: 'Cola na bio do Instagram, no Google Meu Negócio ou no WhatsApp. Cliente agenda direto.' },
  { n: '03', title: 'O sistema trabalha por você', desc: 'Lembretes, pontos, indicações e Google Reviews — tudo automático. Você só colhe o resultado.' },
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
        Oferta de lançamento · <strong className="mx-1">14 dias grátis</strong> em qualquer plano · sem cartão
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
              14 dias grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative min-h-[100svh] flex items-center">
        <AnimatedGradient />

        <div className="container relative z-10 py-24 md:py-32">
          <SectionReveal className="flex flex-col items-center text-center gap-8 max-w-5xl mx-auto">

            {/* Badge */}
            <div className="pill-glow animate-pulse-glow">
              <span>✨</span>
              <span>14 dias grátis · sem cartão de crédito</span>
            </div>

            {/* Headline massiva */}
            <h1 className="display-xl text-white">
              Sua agenda virou<br />
              o <span className="text-gradient">turno da noite</span><br />
              do seu negócio.
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-slate-300 max-w-3xl leading-relaxed">
              Enquanto você vive, o <strong className="text-white">AgendaPRO agenda, lembra, cobra e traz cliente de volta</strong>. Tempo de volta pra família, dinheiro no caixa, cabeça tranquila.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              <Link href="/cadastro" className="btn btn-lg btn-primary-v2">
                Quero meus 14 dias grátis
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <a href="#como-funciona" className="btn btn-lg btn-ghost">
                Ver como funciona
              </a>
            </div>

            {/* Proof strip */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mt-6 text-sm text-slate-400">
              <span className="flex items-center gap-2">
                <span className="text-cyan-400">✦</span> 0% taxa por agendamento
              </span>
              <span className="flex items-center gap-2">
                <span className="text-cyan-400">✦</span> Cancela quando quiser
              </span>
              <span className="flex items-center gap-2">
                <span className="text-cyan-400">✦</span> Leva pra qualquer lugar
              </span>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-floatSlow opacity-70">
              <div className="w-6 h-10 border-2 border-slate-500 rounded-full flex justify-center pt-2">
                <div className="w-1 h-2 bg-slate-400 rounded-full animate-pulse" />
              </div>
            </div>

          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ CARDS DE SEGMENTO (coração) ═══════════ */}
      <section id="segmentos" className="section relative">
        {/* subtle bg glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 50% 40% at 50% 0%, rgba(59,130,246,0.15) 0%, transparent 60%)'
        }} />

        <div className="container relative">
          <SectionReveal className="text-center mb-16 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#06B6D4' }}>●</span>
              <span>Feito pro seu tipo de negócio</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Um painel <span className="text-gradient">pensado</span> pra<br />você, não genérico.
            </h2>
            <p className="text-lg text-slate-400">
              Cada segmento tem fricções próprias. O AgendaPRO muda de personalidade dependendo do seu negócio.
            </p>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SEGMENTS.map((seg) => (
              <SegmentCard key={seg} segment={seg} />
            ))}
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ A DOR REAL ═══════════ */}
      <section className="section relative" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(15,25,56,0.4) 50%, transparent 100%)' }}>
        <div className="container">
          <SectionReveal className="text-center mb-16 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#EC4899' }}>●</span>
              <span>A dor real</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Você não precisa<br />
              de <span className="text-gradient">mais energia</span>.<br />
              Precisa de tempo.
            </h2>
            <p className="text-lg text-slate-400">
              Esses 3 problemas custam em média 8h/semana do seu tempo — e R$2-4k de faturamento por mês.
            </p>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DORES.map((d, i) => (
              <div key={i} className="glass p-8 md:p-10 rounded-3xl relative group">
                <div
                  className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl"
                  style={{ background: `linear-gradient(90deg, transparent, ${d.accent}, transparent)` }}
                />
                <div className="text-5xl mb-4">{d.icone}</div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-3">{d.titulo}</h3>
                <p className="text-slate-400 leading-relaxed">{d.detalhe}</p>
              </div>
            ))}
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ O QUE MUDA NO SEU DIA (timeline) ═══════════ */}
      <section id="como-funciona" className="section relative">
        <div className="container">
          <SectionReveal className="text-center mb-16 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#10B981' }}>●</span>
              <span>Um dia real com AgendaPRO</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Seu dia, <span className="text-gradient">reescrito</span>.
            </h2>
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
                  {/* Hora */}
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

                  {/* Conteúdo */}
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

      {/* ═══════════ FEATURES DE RETENÇÃO ═══════════ */}
      <section id="features" className="section relative">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(139,92,246,0.1) 0%, transparent 60%)'
        }} />
        <div className="container relative">
          <SectionReveal className="text-center mb-16 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#8B5CF6' }}>●</span>
              <span>O que concorrente não tem</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              4 motores de <span className="text-gradient">retenção</span> rodando 24/7.
            </h2>
            <p className="text-lg text-slate-400">
              Outros softwares só anotam horário. O AgendaPRO traz cliente de volta, preenche buraco de agenda e cresce sua reputação.
            </p>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {RETENTION.map((f, i) => (
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

      {/* ═══════════ COMPARAÇÃO DIRETA ═══════════ */}
      <section className="section relative">
        <div className="container">
          <SectionReveal className="text-center mb-16 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#06B6D4' }}>●</span>
              <span>Comparação direta</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Por que <span className="text-gradient">WhatsApp + caderno</span><br />
              está custando caro.
            </h2>
          </SectionReveal>

          <SectionReveal className="max-w-4xl mx-auto">
            <div className="glass rounded-3xl overflow-hidden">
              <div className="grid grid-cols-4 text-sm">
                <div className="p-5 md:p-6 border-b border-r" style={{ borderColor: 'var(--glass-border)' }}>
                  <span className="text-slate-400 font-medium">Recurso</span>
                </div>
                <div className="p-5 md:p-6 border-b border-r text-center" style={{ borderColor: 'var(--glass-border)', background: 'rgba(59,130,246,0.1)' }}>
                  <span className="font-bold text-white">AgendaPRO</span>
                </div>
                <div className="p-5 md:p-6 border-b border-r text-center" style={{ borderColor: 'var(--glass-border)' }}>
                  <span className="font-semibold text-slate-300">WhatsApp</span>
                </div>
                <div className="p-5 md:p-6 border-b text-center" style={{ borderColor: 'var(--glass-border)' }}>
                  <span className="font-semibold text-slate-300">Caderno</span>
                </div>

                {COMPARISON.map((row, i) => (
                  <div key={i} className="contents">
                    <div className="p-4 md:p-5 border-b border-r text-slate-300" style={{ borderColor: 'var(--glass-border)' }}>
                      {row.feature}
                    </div>
                    <div className="p-4 md:p-5 border-b border-r text-center" style={{ borderColor: 'var(--glass-border)', background: 'rgba(59,130,246,0.05)' }}>
                      {typeof row.nos === 'boolean'
                        ? (row.nos ? <span className="text-cyan-400 font-bold text-lg">✓</span> : <span className="text-slate-600">—</span>)
                        : <span className="text-cyan-300 font-semibold text-sm">{row.nos}</span>}
                    </div>
                    <div className="p-4 md:p-5 border-b border-r text-center" style={{ borderColor: 'var(--glass-border)' }}>
                      {typeof row.wpp === 'boolean'
                        ? (row.wpp ? <span className="text-slate-400 font-bold">✓</span> : <span className="text-slate-600">—</span>)
                        : <span className="text-slate-500 text-sm">{row.wpp}</span>}
                    </div>
                    <div className="p-4 md:p-5 border-b text-center" style={{ borderColor: 'var(--glass-border)' }}>
                      {typeof row.livro === 'boolean'
                        ? (row.livro ? <span className="text-slate-400 font-bold">✓</span> : <span className="text-slate-600">—</span>)
                        : <span className="text-slate-500 text-sm">{row.livro}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ PASSOS — como começa ═══════════ */}
      <section className="section relative">
        <div className="container">
          <SectionReveal className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="display-lg text-white mb-4">
              Sai do <span className="text-gradient">papel pra online</span> em 5 minutos.
            </h2>
            <p className="text-lg text-slate-400">Sem técnico, sem configurar servidor, sem mensalidade surpresa.</p>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PASSOS.map((p, i) => (
              <div key={i} className="glass rounded-3xl p-8 md:p-10 relative">
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

      {/* ═══════════ VALOR EMPILHADO + PRICING ═══════════ */}
      <section id="precos" className="section relative">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(6,182,212,0.1) 0%, transparent 60%)'
        }} />

        <div className="container relative">
          {/* Valor empilhado */}
          <SectionReveal className="max-w-3xl mx-auto mb-12 text-center">
            <div className="pill mb-6">
              <span style={{ color: '#F59E0B' }}>●</span>
              <span>Ancoragem de valor</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Separado daria <span className="line-through opacity-50">R$ 256/mês</span>.
            </h2>
            <p className="text-lg text-slate-400 mb-10">
              A gente junta tudo num sistema só — e deixa pela metade.
            </p>

            <div className="glass rounded-3xl p-6 md:p-8 text-left max-w-xl mx-auto">
              {VALUE_STACK.map((v, i) => (
                <div key={i} className={`flex items-center justify-between py-3 ${i !== VALUE_STACK.length - 1 ? 'border-b' : ''}`} style={{ borderColor: 'var(--glass-border)' }}>
                  <span className="text-slate-300">{v.item}</span>
                  <span className="font-mono text-slate-400 line-through">{v.price}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-5 mt-3 border-t-2" style={{ borderColor: 'rgba(59,130,246,0.4)' }}>
                <span className="text-white font-bold text-lg">Total separado</span>
                <span className="font-mono text-2xl font-bold text-slate-500 line-through">R$ 256</span>
              </div>
            </div>
          </SectionReveal>

          {/* Pricing cards */}
          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-12">
            {/* Solo */}
            <div className="glass glow-border rounded-3xl p-8 md:p-10 relative">
              <div className="absolute -top-3 left-8 pill-glow text-xs">⚡ Mais escolhido</div>

              <h3 className="text-2xl font-bold text-white mb-2 mt-2">Solo</h3>
              <p className="text-slate-400 text-sm mb-6">Ideal pra quem atende sozinho ou com 1 parceiro.</p>

              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-mono text-2xl text-slate-500 line-through">R$ 97</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">R$ 67</span>
                  <span className="text-slate-400">/mês</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 text-sm text-slate-300">
                {['1 profissional', '+ 2º profissional grátis (bônus)', 'Agendamento online 24/7', 'Fidelidade + indicação + reviews', 'Lista de espera automática', 'Lembretes D-1 e 1h', 'Área de divulgação exclusiva'].map((it, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-0.5">✓</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>

              <Link href="/cadastro" className="btn btn-primary-v2 w-full justify-center">
                Começar com 14 dias grátis
              </Link>
            </div>

            {/* Equipe */}
            <div className="glass rounded-3xl p-8 md:p-10 relative">
              <h3 className="text-2xl font-bold text-white mb-2">Equipe</h3>
              <p className="text-slate-400 text-sm mb-6">Pra salão ou clínica com equipe maior.</p>

              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-mono text-2xl text-slate-500 line-through">R$ 147</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">R$ 107</span>
                  <span className="text-slate-400">/mês</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 text-sm text-slate-300">
                {['Até 10 profissionais', 'Tudo do Solo', 'Relatórios de equipe', 'Comissão por profissional', 'Permissões por usuário', 'Suporte prioritário'].map((it, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-0.5">✓</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>

              <Link href="/cadastro?plano=equipe" className="btn btn-ghost w-full justify-center">
                Começar com 14 dias grátis
              </Link>
            </div>
          </SectionReveal>

          <SectionReveal className="text-center mt-10">
            <p className="text-sm text-slate-500">
              Sem taxa de setup · Cancela quando quiser · Seus dados são seus
            </p>
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
            <h2 className="display-lg text-white mb-4">Dúvida? Resposta.</h2>
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
              <span>🚀</span>
              <span>Preço de lançamento por tempo limitado</span>
            </div>
            <h2 className="display-xl text-white mb-6">
              Sua agenda merece<br />
              <span className="text-gradient">um turno da noite</span>.
            </h2>
            <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              Comece em 5 minutos. 14 dias grátis. Se não virar seu jeito de trabalhar, você cancela sem pagar nada.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/cadastro" className="btn btn-lg btn-primary-v2">
                Começar agora grátis
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <a
                href="https://wa.me/5563992567566?text=Quero saber mais sobre o AgendaPRO"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-lg btn-ghost"
              >
                Falar com o time
              </a>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="py-12 border-t" style={{ borderColor: 'var(--glass-border)' }}>
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <img src="/logo-agendapro-dark.svg" alt="AgendaPRO" className="h-6" />
              <span className="text-xs text-slate-500">by Impulso Digital · CNPJ 64.585.949/0001-83</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
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
