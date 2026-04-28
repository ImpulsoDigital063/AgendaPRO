import Link from 'next/link'
import FAQ from '@/components/FAQ'
import AgendaDesktopMockup from '@/components/AgendaDesktopMockup'
import IPhoneMockup from '@/components/IPhoneMockup'
import { MechanismCard } from '@/components/MechanismCard'
import { TimelineMicroUI, DorMicroUI, PassoMicroUI } from '@/components/LandingMicroUI'
import ComparisonMiniUIs from '@/components/ComparisonMiniUIs'
import {
  AnimatedGradient,
  SectionReveal,
  SegmentCard,
  type Segment,
} from '@/components/ui'

/* ═══════════════════════════════════════════════════════════
   Dados — copy de funil + ângulo IA / automação inteligente
═══════════════════════════════════════════════════════════ */

const SEGMENTS: Segment[] = ['barbearia', 'salao', 'estetica', 'nail']

const DORES: { kind: 'whatsapp' | 'caderno' | 'queda'; titulo: string; detalhe: string; accent: string }[] = [
  {
    kind:    'whatsapp',
    titulo:  'Você virou recepcionista de si mesmo',
    detalhe: '3 horas por dia no WhatsApp confirmando, remarcando, cobrando. Seu talento vira trabalho burocrático.',
    accent:  '#06B6D4',
  },
  {
    kind:    'caderno',
    titulo:  'Cliente some depois do orçamento',
    detalhe: 'Manda pergunta, você responde, e some. Sem follow-up automático você perde clientes antes deles agendarem.',
    accent:  '#8B5CF6',
  },
  {
    kind:    'queda',
    titulo:  'Agenda quebra, faturamento quebra',
    detalhe: 'No-show, encaixe perdido, cliente que não volta. Cada vaga vazia custa R$80–R$300 que não entram no caixa.',
    accent:  '#EC4899',
  },
]

const TIMELINE: { kind: '07' | '10' | '14' | '20'; hora: string; titulo: string; detalhe: string }[] = [
  { kind: '07', hora: '07:00', titulo: 'Seu dia começa tranquilo',     detalhe: 'Lembretes já foram enviados ontem. Agenda do dia confirmada. Sem espiar WhatsApp antes do café.' },
  { kind: '10', hora: '10:00', titulo: 'Cliente cancela por imprevisto', detalhe: 'O sistema avisa a fila de espera. Próximo da lista aceita a vaga em minutos. Você nem precisa saber.' },
  { kind: '14', hora: '14:00', titulo: 'Cliente completa 10º serviço',  detalhe: 'Pontos acumulam, ele ganha uma recompensa. Fala no grupo de amigos dele. Indica 2 novos.' },
  { kind: '20', hora: '20:00', titulo: 'Fim do expediente',             detalhe: 'Dashboard mostra: agenda cheia amanhã, 3 novos clientes, 2 avaliações 5★ no Google. Você fecha o app e vive.' },
]

const MOTORES = ['fidelidade', 'fila', 'indicacao', 'reviews'] as const

const VALUE_ITEMS = [
  { item: 'Agenda online (Trinks, iSalon)',       price: 'R$ 89/mês' },
  { item: 'Programa de fidelidade com pontos',    price: 'R$ 49/mês' },
  { item: 'Sistema de indicação entre clientes',  price: 'R$ 79/mês' },
  { item: 'Gestão de avaliações Google Reviews',  price: 'R$ 39/mês' },
]

const STEPS: { n: '01' | '02' | '03'; title: string; desc: string }[] = [
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

      {/* ═══════════ Announcement bar (hidden on mobile) ═══════════ */}
      <div
        className="hidden lg:block relative text-center text-sm font-semibold text-white px-6 py-2.5"
        style={{
          background: 'linear-gradient(90deg, #1E40AF 0%, #06B6D4 50%, #8B5CF6 100%)',
          backgroundSize: '200% 100%',
          animation: 'gradient-flow 10s linear infinite',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 flex-shrink-0"><rect x="3" y="8" width="18" height="14" rx="2"/><path d="M12 8V2"/><path d="M3 14h18"/><path d="M12 14v8"/><path d="M7.5 2L12 8l4.5-6"/></svg>
        Clube Fundador — <strong className="mx-1">10 primeiros</strong> travam o preço vitalício. Garantia de 7 dias.
      </div>

      {/* ═══════════ Nav ═══════════ */}
      <nav className="sticky top-0 z-50" style={{ background: 'rgba(5, 7, 19, 0.75)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--glass-border)' }}>
        <div className="container flex items-center justify-between h-12 sm:h-16">
          <Link href="/" className="flex items-center">
            <img src="/logo-agendapro-dark.svg" alt="AgendaPRO" className="h-7" />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/admin/login" className="hidden sm:inline-flex text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-2">
              Entrar
            </Link>
            <Link href="/cadastro" className="btn btn-primary-v2 text-sm px-5 py-2.5">
              Entrar no Clube
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════ 1. HERO — Mobile-first (cabe na 1ª tela) ═══════════ */}
      <section className="relative">
        <AnimatedGradient />

        {/* ——— MOBILE HERO ——— */}
        <div className="lg:hidden relative z-10 px-5 pt-4 pb-6 text-center flex flex-col items-center">
          <h1 className="text-[1.55rem] leading-[1.15] font-black text-white tracking-tight mb-2">
            Sua agenda no<br />
            <span style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>piloto automático.</span>
          </h1>

          <p className="text-[13px] text-slate-300 leading-relaxed mb-4 max-w-[280px]">
            Agendamento 24h, lembretes, fidelidade e fila de espera. Tudo num link só.
          </p>

          {/* Mockup do iPhone + labels */}
          <div className="relative mb-4 w-full flex justify-center">
            {/* Labels flutuantes — posicionadas fora do mockup */}
            <div className="absolute left-2 top-[18%] z-20 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', boxShadow: '0 4px 20px rgba(139,92,246,0.4)' }}>
              Lembretes automáticos
            </div>
            <div className="absolute right-2 top-[42%] z-20 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white" style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)', boxShadow: '0 4px 20px rgba(6,182,212,0.4)' }}>
              Fidelidade com pontos
            </div>
            <div className="absolute left-4 top-[66%] z-20 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 20px rgba(16,185,129,0.4)' }}>
              Fila de espera
            </div>
            <div style={{ transform: 'scale(0.68)', transformOrigin: 'top center' }}>
              <IPhoneMockup />
            </div>
          </div>

          <Link href="/cadastro" className="btn btn-primary-v2 text-sm px-8 py-3 w-full max-w-xs justify-center">
            Entrar no Clube Fundador
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <p className="text-[11px] text-slate-500 mt-2">R$67/mês · Sem setup (Clube Fundador) · Garantia de 7 dias</p>
        </div>

        {/* ——— DESKTOP HERO ——— */}
        <div className="hidden lg:block container relative z-10 py-16">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-16 items-center">

            <SectionReveal className="flex flex-col items-start text-left gap-7">
              <div className="pill-glow animate-pulse-glow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-300"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span>Clube Fundador — 10 primeiros entram sem setup (R$197) pra sempre</span>
              </div>

              <h1 className="display-xl text-white">
                WhatsApp, caderno, planilha.<br />
                <span className="text-gradient">Três ferramentas</span> pro que<br />
                um link resolve.
              </h1>

              <p className="text-xl text-slate-300 max-w-2xl leading-relaxed">
                Enquanto você confirma horário no WhatsApp, preenche planilha e liga pra remarcar,
                seu concorrente recebe agendamento dormindo.
                <strong className="text-white"> O AgendaPRO faz isso — e mais 4 coisas que nenhum outro app faz.</strong>
              </p>

              <div className="flex flex-row gap-4">
                <Link href="/cadastro" className="btn btn-lg btn-primary-v2">
                  Garantir meu lugar
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
                <a href="#mecanismos" className="btn btn-lg btn-ghost">
                  Ver como funciona
                </a>
              </div>

              <p className="text-sm text-slate-400">
                R$67/mês · Sem setup (Clube Fundador) · Garantia de 7 dias
              </p>
            </SectionReveal>

            <SectionReveal className="flex justify-end">
              <AgendaDesktopMockup />
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
            {DORES.map((d) => (
              <div key={d.kind} className="glass rounded-3xl overflow-hidden flex flex-col">
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ background: `linear-gradient(90deg, transparent, ${d.accent}, transparent)` }}
                />
                <div className="p-5 pb-3" style={{ background: `linear-gradient(180deg, ${d.accent}10 0%, transparent 100%)`, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <DorMicroUI kind={d.kind} />
                </div>
                <div className="px-6 md:px-7 py-6 flex-1">
                  <h3 className="text-lg md:text-xl font-bold text-white mb-2">{d.titulo}</h3>
                  <p className="text-slate-400 leading-relaxed text-sm">{d.detalhe}</p>
                </div>
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

                  <div className="glass rounded-2xl p-6 md:p-7 flex-1">
                    <div className="flex flex-col md:flex-row gap-5 md:items-center">
                      <div className="flex-1">
                        <h3 className="text-lg md:text-xl font-bold text-white mb-2">{t.titulo}</h3>
                        <p className="text-slate-400 leading-relaxed text-sm md:text-base">{t.detalhe}</p>
                      </div>
                      <div className="flex-shrink-0 md:w-[260px]">
                        <TimelineMicroUI kind={t.kind} />
                      </div>
                    </div>
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
            {MOTORES.map((kind) => (
              <MechanismCard key={kind} kind={kind} />
            ))}
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 6. COMPARAÇÃO DIRETA — SmartAgenda x Outros apps ═══════════ */}
      <section className="section relative">
        <div className="container max-w-6xl">
          <SectionReveal className="text-center mb-12 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#06B6D4' }}>●</span>
              <span>SmartAgenda x Outros apps</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Outros apps <span className="text-slate-500">só agendam</span>.<br />
              <span className="text-gradient">SmartAgenda trabalha.</span>
            </h2>
            <p className="text-slate-400 text-base md:text-lg leading-relaxed">
              Mesma tela por fora. Mundos diferentes por dentro.
              Olha o que acontece em cada uma quando o cliente cancela às 10h.
            </p>
          </SectionReveal>

          <SectionReveal>
            <ComparisonMiniUIs />
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
              <div key={p.n} className="glass rounded-3xl overflow-hidden flex flex-col">
                <div className="px-6 pt-6 pb-5" style={{ background: 'linear-gradient(180deg, rgba(59,130,246,0.08) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <PassoMicroUI kind={p.n} />
                </div>
                <div className="px-6 md:px-7 py-6 flex-1">
                  <div
                    className="font-mono text-3xl md:text-4xl font-black mb-2 leading-none"
                    style={{
                      background: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {p.n}
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-white mb-2">{p.title}</h3>
                  <p className="text-slate-400 leading-relaxed text-sm">{p.desc}</p>
                </div>
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
              Tudo junto, por menos de R$1,60 por dia.
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
                  <p className="text-white/70 text-xs mt-0.5">Sem setup (Clube Fundador) · Garantia 7 dias</p>
                </div>
                <div className="text-right">
                  <p className="text-white text-2xl md:text-3xl font-black leading-none">
                    R$67<span className="text-sm font-normal text-white/70">/mês</span>
                  </p>
                  <p className="text-white/70 text-[11px] mt-1">menos de R$1,60/dia</p>
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
                Clube Fundador — pode subir quando fechar as 10 vagas
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
              Primeiros 10 clientes travam o preço vitalício. Garantia de 7 dias.
            </p>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Solo */}
            <div className="glass rounded-3xl p-8 md:p-10 relative">
              <div className="mb-6">
                <h3 className="text-2xl font-black text-white mb-1">Solo</h3>
                <p className="text-slate-400 text-sm">Admin + 1 profissional comissionado</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">R$67</span>
                  <span className="text-slate-400 text-sm">/mês</span>
                </div>
                <p className="text-slate-500 text-xs mt-1">Sem setup pros 10 primeiros (Clube Fundador)</p>
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400 mt-0.5 flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>{item}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2.5 pt-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 mt-0.5 flex-shrink-0"><rect x="3" y="8" width="18" height="14" rx="2"/><path d="M12 8V2"/><path d="M3 14h18"/><path d="M12 14v8"/><path d="M7.5 2L12 8l4.5-6"/></svg>
                  <div>
                    <strong className="text-white text-sm">Bônus: Área de divulgação exclusiva</strong>
                    <p className="text-slate-500 text-xs mt-0.5">Textos prontos para Instagram, Google e WhatsApp</p>
                  </div>
                </li>
              </ul>

              <p className="text-emerald-400 text-xs font-semibold mb-4">
                Garantia de 7 dias
              </p>
              <Link href="/cadastro" className="btn btn-primary-v2 w-full justify-center">
                Entrar no Clube
              </Link>
            </div>

            {/* Equipe */}
            <div className="glass glow-border rounded-3xl p-8 md:p-10 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 pill-glow text-xs whitespace-nowrap">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-amber-300"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> MAIS POPULAR
              </div>

              <div className="mb-6 mt-2">
                <h3 className="text-2xl font-black text-white mb-1">Equipe</h3>
                <p className="text-slate-400 text-sm">Admin + múltiplos profissionais + recepção</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-gradient">R$97</span>
                  <span className="text-slate-400 text-sm">/mês</span>
                </div>
                <p className="text-slate-500 text-xs mt-1">Sem setup pros 10 primeiros (Clube Fundador)</p>
              </div>

              <ul className="space-y-2.5 mb-6 text-sm text-slate-300">
                {[
                  'Tudo do plano Solo',
                  'Múltiplos profissionais com agenda individual',
                  'Role de recepção (atendimento no balcão)',
                  'Relatório de comissão automático por profissional',
                  'Financeiro e faturamento por período',
                  'Suporte prioritário via WhatsApp',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400 mt-0.5 flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="text-emerald-400 text-xs font-semibold mb-4">
                Garantia de 7 dias
              </p>
              <Link href="/cadastro" className="btn btn-primary-v2 w-full justify-center">
                Entrar no Clube
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
                Os 10 primeiros clientes entram no Clube Fundador SEM PAGAR setup (R$197) pra sempre. Solo R$67/mês ou Equipe R$97/mês. Depois que fechar os 10, o setup volta normal — quem entrou antes nunca paga.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Vagas limitadas aos 10 primeiros
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  Preço travado vitalício
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-300"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>Garantia de 7 dias · preço vitalício · cancele quando quiser</span>
            </div>
            <h2 className="display-xl text-white mb-6">
              Amanhã você vai abrir o WhatsApp<br />
              e <span className="text-gradient">perder 3 horas</span> de novo?
            </h2>
            <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              Configura em 5 minutos. Cola o link no Instagram. Amanhã você acorda com a agenda cheia e zero mensagem pra responder.
            </p>

            <Link href="/cadastro" className="btn btn-lg btn-primary-v2">
              Garantir meu lugar
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <p className="text-slate-500 text-xs mt-5">
              R$67/mês · Sem setup pros 10 primeiros (Clube Fundador)
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
              <span className="text-xs text-slate-500">© 2026 AgendaPRO · by Impulso Digital · Palmas, TO</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <Link href="/barbearia" className="text-slate-400 hover:text-white transition-colors">Barbearia</Link>
              <Link href="/salao" className="text-slate-400 hover:text-white transition-colors">Salão</Link>
              <Link href="/nail" className="text-slate-400 hover:text-white transition-colors">Nail</Link>
              <Link href="/estetica" className="text-slate-400 hover:text-white transition-colors">Estética</Link>
              <Link href="/privacidade" className="text-slate-400 hover:text-white transition-colors">Privacidade</Link>
              <Link href="/termos" className="text-slate-400 hover:text-white transition-colors">Termos</Link>
              <Link href="/admin/login" className="text-slate-400 hover:text-white transition-colors">Entrar</Link>
              <Link href="/profissional/login" className="text-slate-400 hover:text-white transition-colors">Sou profissional</Link>
            </div>
          </div>
        </div>
      </footer>

    </main>
  )
}
