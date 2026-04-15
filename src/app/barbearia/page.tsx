import Link from 'next/link'
import FAQ from '@/components/FAQ'
import { AnimatedGradient, SectionReveal } from '@/components/ui'

/* ═══════════════════════════════════════════════════════════
   LP dedicada — BARBEARIA
   Persona: dono de 1-3 cadeiras, 25-45 anos, vive no Instagram,
   já usa WhatsApp + caderno, quer lotar a cadeira sem gastar
   fortuna em tráfego.
   Pilar central: Google Ranking + Pontos — cliente vira promotor.
═══════════════════════════════════════════════════════════ */

const DORES = [
  {
    icon: '💬',
    titulo: 'O WhatsApp não para de tocar',
    detalhe: 'Mensagem no meio do corte perguntando se tem horário às 15h. Você para a tesoura, responde, volta. Repete 40x no dia.',
    accent: '#06B6D4',
  },
  {
    icon: '📓',
    titulo: 'O caderno some, o cliente some',
    detalhe: 'Marcou no caderno, esqueceu de confirmar. Cliente não veio. Cadeira vazia 40 minutos. Perdeu R$50 e nem sabia.',
    accent: '#8B5CF6',
  },
  {
    icon: '📉',
    titulo: 'Barbearia do lado aparece antes no Google',
    detalhe: 'O cara tem metade dos clientes que você, mas pediu 50 avaliações pros amigos. Aparece primeiro no Maps. Rouba cliente novo todo dia.',
    accent: '#EC4899',
  },
]

const MOTORES = [
  {
    tag: '🏆 Pilar',
    titulo: 'Google Ranking sem pagar SEO',
    desc: 'Cliente sai do corte, recebe link pra avaliar no Google e ganha pontos. Sua barbearia sobe no Maps sozinha — enquanto concorrente paga R$800/mês pra aparecer.',
    highlight: true,
  },
  {
    tag: '🔗 Multiplicador',
    titulo: 'Cada cliente vira vendedor',
    desc: 'Link de indicação exclusivo por cliente. Quando o amigo agenda pelo link, os dois ganham pontos. Seu cliente vira promotor que trabalha por você.',
    highlight: true,
  },
  {
    tag: '🔔 Retenção',
    titulo: 'Lembrete anti-falta automático',
    desc: 'Um dia antes do horário, o cliente recebe mensagem confirmando. Se ele responde NÃO, o sistema libera a vaga na lista de espera em segundos.',
    highlight: false,
  },
  {
    tag: '⚡ Recuperação',
    titulo: 'Fila de espera que preenche sozinha',
    desc: 'Cancelou 10:00? O sistema avisa os 3 primeiros da fila automaticamente. Quem aceitar primeiro fica com a vaga. Cadeira nunca fica vazia.',
    highlight: false,
  },
]

const TIMELINE = [
  { hora: '07:30', titulo: 'Você acorda com a agenda cheia', detalhe: 'Cliente agendou 23:47 pela bio do Insta. Sistema confirmou sozinho. Você nem abriu o WhatsApp ainda.' },
  { hora: '10:00', titulo: 'Corte do Marcos saiu + R$70 + 10 pontos', detalhe: 'Marcos saiu com link do Google no WhatsApp. Avaliou 5★ e ganhou 50 pontos. Sua nota subiu de 4.6 pra 4.7 no Maps.' },
  { hora: '14:00', titulo: 'Cliente novo chegou pelo Google', detalhe: 'Ele pesquisou "barbearia perto de mim", você apareceu primeiro, clicou no link e agendou. Nada de ads. Só ranking orgânico.' },
  { hora: '20:00', titulo: 'Fecha a porta, abre o dashboard', detalhe: '8 cortes feitos. R$560 no caixa. 3 avaliações novas. 2 indicações ativas. Fecha o celular, janta com a família.' },
]

const COMPARISON = [
  'Cliente agenda sozinho 24h (até de madrugada)',
  'Lembrete automático no dia anterior',
  'Fila de espera quando alguém cancela',
  'Cliente ganha pontos e volta',
  'Link de indicação que multiplica sozinho',
  'Avaliações Google sobem o ranking',
  'Cada barbeiro com agenda e comissão separada',
  'Relatório de faturamento pronto',
]

const STEPS = [
  { n: '01', title: 'Cadastre a barbearia', desc: 'Nome, endereço, corte (R$40), barba (R$30), combo (R$60) e horários de cada barbeiro. Pronto em 5 minutos.' },
  { n: '02', title: 'Cola o link na bio do Insta', desc: 'Cola no @, no Google Meu Negócio e no status do WhatsApp. Cliente clica e agenda — sem precisar te chamar.' },
  { n: '03', title: 'Sistema trabalha por você', desc: 'Confirma, lembra, preenche cancelamento, ativa indicação, sobe ranking no Google. Você só corta cabelo.' },
]

export default function BarbeariaPage() {
  return (
    <main className="relative overflow-hidden" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* Announcement bar */}
      <div
        className="relative text-center text-sm font-semibold text-white px-6 py-2.5"
        style={{
          background: 'linear-gradient(90deg, #1E40AF 0%, #06B6D4 50%, #8B5CF6 100%)',
          backgroundSize: '200% 100%',
          animation: 'gradient-flow 10s linear infinite',
        }}
      >
        <span className="mr-2">💈</span>
        Oferta de lançamento pra barbearia — <strong className="mx-1">14 dias grátis</strong>. Sem cartão.
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-50" style={{ background: 'rgba(5, 7, 19, 0.75)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--glass-border)' }}>
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-agendapro-dark.svg" alt="AgendaPRO" className="h-7" />
            <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: 'rgba(6,182,212,0.15)', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.3)' }}>
              BARBEARIA
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/admin/login" className="hidden sm:inline-flex text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-2">
              Entrar
            </Link>
            <Link href="/cadastro" className="btn btn-primary-v2 text-sm px-5 py-2.5">
              Lotar minha barbearia
            </Link>
          </div>
        </div>
      </nav>

      {/* 1. HERO */}
      <section className="relative">
        <AnimatedGradient />

        <div className="container relative z-10 py-16 md:py-24">
          <SectionReveal className="max-w-4xl mx-auto text-center flex flex-col items-center gap-7">
            <div className="pill-glow animate-pulse-glow">
              <span>💈</span>
              <span>Para donos de barbearia que querem a cadeira cheia</span>
            </div>

            <h1 className="display-xl text-white">
              Sua barbearia na <span className="text-gradient">primeira posição do Google</span><br />
              sem pagar um real de anúncio.
            </h1>

            <p className="text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed">
              Cliente corta, ganha pontos pra avaliar no Google, e sua barbearia sobe no Maps sozinha. Cada corte vira uma avaliação nova.
              <strong className="text-white"> Você corta cabelo — o sistema trabalha pelo seu ranking.</strong>
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/cadastro" className="btn btn-lg btn-primary-v2">
                Começar grátis por 14 dias
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
                { n: '1º', l: 'No Google sem pagar' },
                { n: '24h', l: 'Agenda trabalhando' },
                { n: '5 min', l: 'Pra configurar' },
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

      {/* 2. DOR */}
      <section id="dor" className="section relative">
        <div className="container">
          <SectionReveal className="text-center mb-14 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#EC4899' }}>●</span>
              <span>Reconhece isso?</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Barbearia lotada <span className="text-gradient">não se faz</span> com caderno.
            </h2>
            <p className="text-lg text-slate-400">
              O problema não é falta de cliente. É o sistema que você usa pra gerenciar eles.
            </p>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DORES.map((d) => (
              <div
                key={d.titulo}
                className="glass rounded-3xl p-6 md:p-7 flex flex-col gap-4"
                style={{ border: `1px solid ${d.accent}30` }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: `${d.accent}15`, border: `1px solid ${d.accent}40` }}
                >
                  {d.icon}
                </div>
                <h3 className="text-xl font-bold text-white">{d.titulo}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{d.detalhe}</p>
              </div>
            ))}
          </SectionReveal>
        </div>
      </section>

      {/* 3. PILAR GOOGLE RANKING — seção destacada */}
      <section className="section relative">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(245,158,11,0.15) 0%, transparent 60%)'
        }} />

        <div className="container relative">
          <SectionReveal className="text-center mb-12 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#F59E0B' }}>●</span>
              <span>O pilar que ninguém te conta</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Avaliações no Google = <span className="text-gradient">barbearia cheia.</span>
            </h2>
            <p className="text-lg text-slate-400">
              Empresa paga R$500-R$2.000 por mês pra aparecer no topo. Com AgendaPRO, seu cliente faz isso de graça — e ainda sai feliz.
            </p>
          </SectionReveal>

          <SectionReveal>
            <div className="grid md:grid-cols-[1fr_1.1fr] gap-8 items-center max-w-5xl mx-auto">

              {/* Mini-UI Google Maps */}
              <div
                className="glass glow-border rounded-3xl p-6 md:p-8"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(6,182,212,0.08) 100%)',
                  border: '1px solid rgba(245,158,11,0.25)',
                }}
              >
                <div className="flex items-center gap-2 mb-5 text-xs text-slate-400">
                  <span>📍</span>
                  <span>Barbearia perto de mim</span>
                </div>

                <div className="space-y-2.5">
                  {[
                    { pos: '1', nome: 'Sua barbearia', nota: '4.9', reviews: '247', active: true },
                    { pos: '2', nome: 'Barber Concorrente', nota: '4.6', reviews: '89', active: false },
                    { pos: '3', nome: 'Barbearia do Bairro', nota: '4.4', reviews: '34', active: false },
                  ].map((b) => (
                    <div
                      key={b.pos}
                      className="rounded-xl px-4 py-3 flex items-center justify-between"
                      style={
                        b.active
                          ? {
                              background: 'linear-gradient(90deg, rgba(245,158,11,0.2) 0%, rgba(6,182,212,0.1) 100%)',
                              border: '1px solid rgba(245,158,11,0.5)',
                              boxShadow: '0 6px 20px rgba(245,158,11,0.2)',
                            }
                          : {
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.06)',
                            }
                      }
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{
                            background: b.active ? '#F59E0B' : 'rgba(255,255,255,0.08)',
                            color: b.active ? '#0B0F1F' : '#94A3B8',
                          }}
                        >
                          {b.pos}
                        </span>
                        <span className={`text-sm font-semibold truncate ${b.active ? 'text-white' : 'text-slate-400'}`}>
                          {b.nome}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs flex-shrink-0">
                        <span className="text-yellow-400">★</span>
                        <span className={b.active ? 'text-white font-bold' : 'text-slate-400'}>{b.nota}</span>
                        <span className="text-slate-500">({b.reviews})</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-5 border-t flex items-center justify-between" style={{ borderColor: 'var(--glass-border)' }}>
                  <span className="text-xs text-slate-400">Agora aparece primeiro no Maps</span>
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Orgânico · sem ads
                  </span>
                </div>
              </div>

              {/* Copy */}
              <div className="space-y-5">
                <h3 className="text-2xl md:text-3xl font-black text-white leading-tight">
                  Seu cliente ganha pontos pra avaliar. <span className="text-gradient">Você ganha clientes novos.</span>
                </h3>

                <ul className="space-y-3 text-slate-300">
                  <li className="flex gap-3">
                    <span className="text-amber-400 font-bold flex-shrink-0">1.</span>
                    <span>Cliente sai do corte e recebe no WhatsApp: <em className="text-white">"Avalia no Google e ganha 50 pontos 🎁"</em></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-amber-400 font-bold flex-shrink-0">2.</span>
                    <span>Ele clica, avalia 5★ em 20 segundos, ganha os pontos no seu programa de fidelidade.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-amber-400 font-bold flex-shrink-0">3.</span>
                    <span>Sua nota sobe, o Google entende que você é a melhor barbearia da região, e te coloca em cima.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-amber-400 font-bold flex-shrink-0">4.</span>
                    <span>Cliente novo pesquisa "barbearia perto de mim", vê você primeiro, e agenda direto pelo link.</span>
                  </li>
                </ul>

                <div
                  className="rounded-2xl p-4 text-sm"
                  style={{
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.3)',
                  }}
                >
                  <strong className="text-amber-300">Enquanto isso, o concorrente paga R$800/mês pra anunciar.</strong> Você faz de graça, e ainda fideliza.
                </div>
              </div>

            </div>
          </SectionReveal>
        </div>
      </section>

      {/* 4. INDICAÇÃO — Cliente vira promotor */}
      <section className="section relative">
        <div className="container max-w-5xl">
          <SectionReveal className="text-center mb-12">
            <div className="pill mb-6">
              <span style={{ color: '#8B5CF6' }}>●</span>
              <span>O multiplicador</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Cada cliente seu <span className="text-gradient">é um vendedor</span> pra você.
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Link de indicação único por cliente. Quando o amigo dele corta pela primeira vez, os dois ganham pontos. Ninguém vende melhor sua barbearia que quem já saiu satisfeito.
            </p>
          </SectionReveal>

          <SectionReveal>
            <div
              className="glass rounded-3xl p-6 md:p-10"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(6,182,212,0.08) 100%)',
                border: '1px solid rgba(139,92,246,0.25)',
              }}
            >
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { step: 'Cliente Marcos corta', detalhe: 'Recebe link único: barbear.io/MARCOS23', color: '#06B6D4' },
                  { step: 'Manda pro amigo João', detalhe: '"Corta com o cara, é o melhor." — João agenda pelo link.', color: '#8B5CF6' },
                  { step: 'Marcos +50 pts · João +30', detalhe: 'Os dois ganham. Você ganhou 1 cliente novo sem gastar nada.', color: '#F59E0B' },
                ].map((s, i) => (
                  <div key={i} className="relative">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-sm mb-4"
                      style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}CC)`, boxShadow: `0 6px 20px ${s.color}55` }}
                    >
                      {i + 1}
                    </div>
                    <h4 className="text-white font-bold mb-1">{s.step}</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">{s.detalhe}</p>
                  </div>
                ))}
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* 5. MOTORES (como funciona) */}
      <section id="mecanismos" className="section relative">
        <div className="container">
          <SectionReveal className="text-center mb-14 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#3B82F6' }}>●</span>
              <span>Os 4 motores que enchem sua cadeira</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Sistema que <span className="text-gradient">trabalha</span> enquanto você corta.
            </h2>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {MOTORES.map((m) => (
              <div
                key={m.titulo}
                className="glass rounded-3xl p-7 flex flex-col gap-3"
                style={
                  m.highlight
                    ? {
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(6,182,212,0.06) 100%)',
                        border: '1px solid rgba(6,182,212,0.3)',
                        boxShadow: '0 8px 30px rgba(6,182,212,0.1)',
                      }
                    : undefined
                }
              >
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: m.highlight ? '#06B6D4' : '#94A3B8' }}>
                  {m.tag}
                </span>
                <h3 className="text-xl font-black text-white">{m.titulo}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </SectionReveal>
        </div>
      </section>

      {/* 6. DIA DO BARBEIRO */}
      <section className="section relative">
        <div className="container">
          <SectionReveal className="text-center mb-12 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#06B6D4' }}>●</span>
              <span>Como seu dia fica</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Do <span className="text-gradient">caderno</span> ao piloto automático.
            </h2>
          </SectionReveal>

          <SectionReveal stagger className="space-y-4 max-w-3xl mx-auto">
            {TIMELINE.map((t, i) => (
              <div
                key={t.hora}
                className="glass rounded-2xl p-5 md:p-6 flex gap-4 md:gap-6"
              >
                <div className="flex-shrink-0 text-center">
                  <div className="text-xl md:text-2xl font-black text-gradient leading-none">{t.hora}</div>
                  {i < TIMELINE.length - 1 && (
                    <div
                      className="w-px h-12 mx-auto mt-3"
                      style={{ background: 'linear-gradient(180deg, rgba(6,182,212,0.4), transparent)' }}
                    />
                  )}
                </div>
                <div>
                  <h4 className="text-white font-bold mb-1">{t.titulo}</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">{t.detalhe}</p>
                </div>
              </div>
            ))}
          </SectionReveal>
        </div>
      </section>

      {/* 7. COMPARAÇÃO */}
      <section className="section relative">
        <div className="container max-w-4xl">
          <SectionReveal className="text-center mb-12">
            <div className="pill mb-6">
              <span style={{ color: '#EC4899' }}>●</span>
              <span>WhatsApp + caderno × AgendaPRO</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              A diferença é <span className="text-gradient">gritante.</span>
            </h2>
          </SectionReveal>

          <SectionReveal>
            <div className="glass rounded-3xl overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--glass-border)', color: '#94A3B8' }}>
                <span>Recurso</span>
                <span className="text-center w-24">Caderno</span>
                <span className="text-center w-24 text-gradient">AgendaPRO</span>
              </div>
              {COMPARISON.map((row) => (
                <div
                  key={row}
                  className="grid grid-cols-[1fr_auto_auto] gap-4 px-6 py-3.5 items-center text-sm border-b"
                  style={{ borderColor: 'var(--glass-border)' }}
                >
                  <span className="text-slate-300">{row}</span>
                  <span className="text-center w-24 text-red-400 font-bold">—</span>
                  <span className="text-center w-24 text-emerald-400 font-bold">✓</span>
                </div>
              ))}
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* 8. PASSO A PASSO */}
      <section className="section relative">
        <div className="container">
          <SectionReveal className="text-center mb-12 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#10B981' }}>●</span>
              <span>3 passos · 5 minutos · zero técnico</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Hoje você <span className="text-gradient">começa</span>. Hoje mesmo.
            </h2>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {STEPS.map((p) => (
              <div key={p.n} className="glass rounded-3xl p-7 flex flex-col gap-3">
                <div
                  className="font-mono text-4xl font-black leading-none"
                  style={{
                    background: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {p.n}
                </div>
                <h3 className="text-xl font-bold text-white">{p.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </SectionReveal>
        </div>
      </section>

      {/* 9. PRICING */}
      <section id="precos" className="section relative">
        <div className="container">
          <SectionReveal className="text-center mb-12 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#3B82F6' }}>●</span>
              <span>Planos pra barbearia</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Menos que <span className="text-gradient">um corte</span> por semana.
            </h2>
            <p className="text-lg text-slate-400">
              14 dias grátis. Sem cartão. Cancele quando quiser.
            </p>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Solo */}
            <div className="glass rounded-3xl p-8 md:p-10">
              <div className="mb-6">
                <h3 className="text-2xl font-black text-white mb-1">Solo</h3>
                <p className="text-slate-400 text-sm">Pra quem toca sozinho ou com mais 1 barbeiro</p>
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
                  'Até 2 barbeiros com agenda individual',
                  'Link pra bio do Insta e Google Meu Negócio',
                  'Lembrete automático anti-falta',
                  'Fila de espera quando cliente cancela',
                  'Sistema de pontos + indicação',
                  'Google Reviews — sobe seu ranking',
                  'Relatório financeiro por barbeiro',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="text-cyan-400 font-bold mt-0.5 flex-shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="text-emerald-400 text-xs font-semibold mb-4">14 dias grátis — sem cartão</p>
              <Link href="/cadastro" className="btn btn-primary-v2 w-full justify-center">Lotar minha barbearia</Link>
            </div>

            {/* Equipe */}
            <div className="glass glow-border rounded-3xl p-8 md:p-10 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 pill-glow text-xs whitespace-nowrap">
                ⭐ MAIS POPULAR
              </div>

              <div className="mb-6 mt-2">
                <h3 className="text-2xl font-black text-white mb-1">Equipe</h3>
                <p className="text-slate-400 text-sm">Pra barbearia com 3 a 5 cadeiras</p>
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
                  'Tudo do Solo',
                  'Até 5 barbeiros com agenda separada',
                  'Comissão automática por barbeiro',
                  'Financeiro consolidado da barbearia',
                  'Suporte prioritário no WhatsApp',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="text-cyan-400 font-bold mt-0.5 flex-shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="text-emerald-400 text-xs font-semibold mb-4">14 dias grátis — sem cartão</p>
              <Link href="/cadastro" className="btn btn-primary-v2 w-full justify-center">Lotar minha barbearia</Link>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* 10. PROVA SOCIAL — Barbearia Olimpio */}
      <section className="section relative">
        <div className="container max-w-3xl">
          <SectionReveal>
            <div
              className="glass glow-border rounded-3xl p-8 md:p-12 text-center"
              style={{
                background: 'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(139,92,246,0.1) 100%)',
                border: '1px solid rgba(6,182,212,0.25)',
              }}
            >
              <div className="pill mb-5 inline-flex">
                <span style={{ color: '#06B6D4' }}>●</span>
                <span>Primeiros parceiros do lançamento</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-white mb-4">
                <span className="text-gradient">Barbearia Olimpio</span> já tá configurando.
              </h3>
              <p className="text-slate-300 leading-relaxed mb-6 max-w-xl mx-auto">
                Seu nome entra agora com o preço de lançamento travado. Quando virarmos a chave de R$67 pra R$97, quem assinou antes paga sempre R$67.
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
                  Suporte direto com fundador
                </span>
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* 11. FAQ */}
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

      {/* 12. CTA FINAL */}
      <section className="section-lg relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(6,182,212,0.28) 0%, transparent 60%)'
          }} />
        </div>

        <div className="container relative text-center max-w-3xl">
          <SectionReveal>
            <div className="pill-glow mb-6 animate-pulse-glow">
              <span>💈</span>
              <span>14 dias grátis · sem cartão · cancele quando quiser</span>
            </div>
            <h2 className="display-xl text-white mb-6">
              Seu concorrente tá<br />
              agendando no <span className="text-gradient">caderno</span>.
            </h2>
            <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              Configure hoje, cola o link na bio, e em 5 minutos sua barbearia agenda sozinha — inclusive de madrugada.
            </p>

            <Link href="/cadastro" className="btn btn-lg btn-primary-v2">
              Lotar minha barbearia
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

      {/* Footer */}
      <footer className="py-12 border-t" style={{ borderColor: 'var(--glass-border)' }}>
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-agendapro-dark.svg" alt="AgendaPRO" className="h-6" />
              <span className="text-xs text-slate-500">© 2025 AgendaPRO · by Impulso Digital · Palmas, TO</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <Link href="/" className="text-slate-400 hover:text-white transition-colors">Início</Link>
              <Link href="/salao" className="text-slate-400 hover:text-white transition-colors">Salão</Link>
              <Link href="/nail" className="text-slate-400 hover:text-white transition-colors">Nail</Link>
              <Link href="/estetica" className="text-slate-400 hover:text-white transition-colors">Estética</Link>
              <Link href="/admin/login" className="text-slate-400 hover:text-white transition-colors">Entrar</Link>
            </div>
          </div>
        </div>
      </footer>

    </main>
  )
}
