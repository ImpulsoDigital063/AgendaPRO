import Link from 'next/link'
import FAQ from '@/components/FAQ'
import AgendaDashboardMockup from '@/components/AgendaDashboardMockup'
import { TimelineMicroUI, DorMicroUI } from '@/components/LandingMicroUI'
import { AnimatedGradient, SectionReveal } from '@/components/ui'
import {
  IconScissors,
  IconRazor,
  IconClipper,
  IconBarberPole,
  IconChair,
  IconBrain,
  IconTrophy,
  IconBolt,
  IconLink,
  IconCash,
  IconPhone,
  IconClock24,
  IconGift,
  IconContacts,
  IconSparkle,
  IconArrowRight,
  IconCheck,
  IconStar,
  IconPin,
} from '@/components/BarberIcons'

/* ═══════════════════════════════════════════════════════════
   LP BARBEARIA — SmartAgenda
   Persona: barbeiro 25-45, dono de 1-3 cadeiras.
   Tudo SVG, mobile-first, com movimento.
═══════════════════════════════════════════════════════════ */

const SMART_FEATURES = [
  { Icon: IconBrain,    color: '#06B6D4', titulo: 'Confirma agendamento sozinha', desc: 'Cliente recebe lembrete e responde SIM. Sem você abrir o WhatsApp.' },
  { Icon: IconTrophy,   color: '#F59E0B', titulo: 'Sobe seu ranking no Google',   desc: 'Cliente avalia e ganha pontos. Você sobe no Maps sem pagar SEO.' },
  { Icon: IconBolt,     color: '#A78BFA', titulo: 'Preenche vaga em segundos',    desc: 'Cancelou? A fila assume e a cadeira não fica vazia.' },
  { Icon: IconLink,     color: '#8B5CF6', titulo: 'Cliente vira vendedor',        desc: 'Link de indicação único. Quando o amigo agenda, os dois ganham pontos.' },
  { Icon: IconContacts, color: '#22D3EE', titulo: 'Lista dos seus clientes',      desc: 'Nome, telefone e email de quem agenda. Faça promoção, lançamento e oferta direto pra eles.' },
  { Icon: IconCash,     color: '#10B981', titulo: 'Comissão por barbeiro',        desc: 'Cada barbeiro com agenda e relatório de comissão automático no fim do mês.' },
  { Icon: IconPhone,    color: '#3B82F6', titulo: 'Tudo pelo celular',            desc: 'Confirma, cancela, bloqueia agenda. Sem precisar abrir computador.' },
  { Icon: IconClock24,  color: '#EC4899', titulo: 'Funciona 24h por dia',         desc: 'Cliente agenda 02:00 da manhã. Você acorda com agenda cheia.' },
  { Icon: IconGift,     color: '#F59E0B', titulo: 'Fidelidade nativa',            desc: 'Cada corte rende pontos. No 10º, recompensa. Cliente volta sempre.' },
]

const DORES = [
  { kind: 'whatsapp' as const, titulo: 'O WhatsApp não para de tocar', detalhe: '40 mensagens por dia perguntando se tem horário às 15h. Você para a tesoura, responde, volta. Repete o dia inteiro.', accent: '#06B6D4' },
  { kind: 'caderno'  as const, titulo: 'O caderno some, o cliente some', detalhe: 'Marcou no caderno, esqueceu de confirmar. Cliente não veio. Cadeira vazia 40 minutos. Perdeu R$50 e nem percebeu.', accent: '#8B5CF6' },
  { kind: 'queda'    as const, titulo: 'Concorrente aparece antes no Google', detalhe: 'Ele tem metade dos clientes, mas pediu 50 avaliações pros amigos. Aparece primeiro no Maps. Rouba cliente novo todo dia.', accent: '#EC4899' },
]

const MOTORES = [
  { Icon: IconBrain,   tag: 'Atendimento',  titulo: 'Confirma e lembra sozinha',          desc: 'Lembrete automático no dia anterior pelo WhatsApp. Cliente confirma, fila avança ou recua, agenda do dia chega na sua mão limpa.', highlight: true,  color: '#06B6D4' },
  { Icon: IconTrophy,  tag: 'Ranking',      titulo: 'Sobe no Google sem pagar',           desc: 'Cliente sai do corte, ganha pontos pra avaliar no Google. Sua nota sobe, o Maps te coloca em cima da concorrência.',           highlight: true,  color: '#F59E0B' },
  { Icon: IconLink,    tag: 'Multiplicação', titulo: 'Transforma cliente em vendedor',    desc: 'Link de indicação único por cliente. Quando o amigo agenda, ambos ganham pontos. Cliente vira promotor.',                    highlight: false, color: '#8B5CF6' },
  { Icon: IconBolt,    tag: 'Recuperação',  titulo: 'Preenche cancelamento sozinha',      desc: 'Cancelou 10:00? O sistema chama os 3 primeiros da fila. Quem aceitar primeiro fica com a vaga.',                              highlight: false, color: '#A78BFA' },
]

const TIMELINE = [
  { kind: '07' as const, hora: '07:30', titulo: 'Você acorda com a agenda cheia',     detalhe: 'Cliente agendou 23:47 pela bio do Insta. SmartAgenda confirmou sozinha.' },
  { kind: '10' as const, hora: '10:00', titulo: 'Pedro cancelou — fila assumiu',      detalhe: 'A SmartAgenda chamou Marcos da fila. Ele aceitou em 3 minutos.' },
  { kind: '14' as const, hora: '14:00', titulo: 'João completou 10º corte',           detalhe: 'Recompensa liberada, ele compartilhou. 2 amigos já agendaram pelo link.' },
  { kind: '20' as const, hora: '20:00', titulo: 'Fim do expediente',                  detalhe: 'R$560 no caixa. 3 avaliações 5★ novas. Sua nota subiu pra 4.9.' },
]

const COMPARISON = [
  'Cliente agenda sozinho 24h (até de madrugada)',
  'Lembrete automático no dia anterior',
  'Fila de espera quando alguém cancela',
  'Cliente ganha pontos e volta sempre',
  'Link de indicação que multiplica sozinho',
  'Avaliações Google sobem o ranking',
  'Cada barbeiro com agenda e comissão separada',
  'Relatório de faturamento pronto',
]

const STEPS = [
  { n: '01', Icon: IconScissors, title: 'Cadastra a barbearia',     desc: 'Nome, endereço, corte (R$40), barba (R$30), combo (R$60) e horários de cada barbeiro.' },
  { n: '02', Icon: IconLink,     title: 'Cola o link na bio',       desc: 'Cola no Insta, Google Meu Negócio e status do WhatsApp. Cliente clica e agenda.' },
  { n: '03', Icon: IconBrain,    title: 'A SmartAgenda assume',     desc: 'Confirma, lembra, preenche cancelamento, ativa indicação e sobe seu ranking. Você só corta.' },
]

/* CTA inline reusável */
function CTAInline({ titulo, sub }: { titulo: string; sub: string }) {
  return (
    <div className="container max-w-4xl px-4 my-6 sm:my-10">
      <div
        className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-7 flex flex-col sm:flex-row items-center sm:justify-between gap-4 lift-card"
        style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(6,182,212,0.08) 100%)',
          border: '1px solid rgba(6,182,212,0.25)',
        }}
      >
        <div className="text-center sm:text-left">
          <h4 className="text-white font-black text-base sm:text-lg md:text-xl mb-1">{titulo}</h4>
          <p className="text-slate-400 text-xs sm:text-sm">{sub}</p>
        </div>
        <Link
          href="/cadastro"
          className="btn btn-primary-v2 btn-shimmer w-full sm:w-auto justify-center text-sm font-bold px-5 py-3 sm:py-3.5 min-h-[48px]"
        >
          <span className="relative z-10 flex items-center gap-2">
            Começar grátis
            <IconArrowRight size={18} />
          </span>
        </Link>
      </div>
    </div>
  )
}

export default function BarbeariaPage() {
  return (
    <main className="relative overflow-hidden" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* Announcement bar */}
      <div
        className="relative text-center text-[12px] sm:text-sm font-semibold text-white px-4 py-2.5 flex items-center justify-center gap-2"
        style={{
          background: 'linear-gradient(90deg, #1E40AF 0%, #06B6D4 50%, #8B5CF6 100%)',
          backgroundSize: '200% 100%',
          animation: 'gradient-flow 10s linear infinite',
        }}
      >
        <IconScissors size={14} className="flex-shrink-0" />
        <span>Oferta de lançamento — <strong>14 dias grátis</strong>. Sem cartão.</span>
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-50" style={{ background: 'rgba(5, 7, 19, 0.75)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--glass-border)' }}>
        <div className="container px-4 flex items-center justify-between h-14 sm:h-16">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-agendapro-dark.svg" alt="AgendaPRO" className="h-7 sm:h-8" />
            <span
              className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
              style={{ background: 'rgba(6,182,212,0.15)', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.3)' }}
            >
              <IconScissors size={10} /> Barbearia
            </span>
          </Link>
          <Link
            href="/cadastro"
            className="btn btn-primary-v2 btn-shimmer text-[11px] sm:text-[13px] font-bold px-2.5 sm:px-3.5 py-1.5 sm:py-2 min-h-[32px] sm:min-h-[36px] whitespace-nowrap inline-flex items-center"
          >
            <span className="relative z-10 flex items-center gap-1">
              <span className="hidden sm:inline">Acesso grátis</span>
              <span className="sm:hidden">Grátis</span>
              <IconArrowRight size={12} />
            </span>
          </Link>
        </div>
      </nav>

      {/* ═══════════ 1. HERO ═══════════ */}
      <section className="relative">
        <AnimatedGradient />

        {/* Tesoura flutuante decorativa — agora visível no mobile também (sutil) */}
        <div className="absolute top-14 right-[6%] sm:top-20 sm:right-[7%] lg:top-24 lg:right-[8%] text-cyan-400/20 animate-float-soft pointer-events-none" aria-hidden>
          <IconScissors size={28} className="sm:hidden" />
          <IconScissors size={40} className="hidden sm:block lg:hidden" />
          <IconScissors size={48} className="hidden lg:block" />
        </div>
        <div className="absolute bottom-10 left-[5%] sm:bottom-20 sm:left-[6%] text-violet-400/15 animate-float-soft pointer-events-none" style={{ animationDelay: '1.2s' }} aria-hidden>
          <IconRazor size={28} className="sm:hidden" />
          <IconRazor size={44} className="hidden sm:block lg:hidden" />
          <IconRazor size={56} className="hidden lg:block" />
        </div>

        <div className="container relative z-10 px-4 py-12 sm:py-16 lg:py-24">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center">

            {/* Coluna esquerda — copy */}
            <SectionReveal className="flex flex-col items-center lg:items-start text-center lg:text-left gap-5 sm:gap-6 lg:gap-7">
              {/* Glass card de apresentação — efeito vidro premium */}
              <div
                className="relative inline-flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full overflow-hidden group"
                style={{
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.18) 0%, rgba(139,92,246,0.12) 50%, rgba(245,158,11,0.1) 100%)',
                  backdropFilter: 'blur(18px)',
                  WebkitBackdropFilter: 'blur(18px)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  boxShadow:
                    '0 8px 32px -8px rgba(6,182,212,0.45), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.2)',
                }}
              >
                {/* shimmer interno */}
                <span
                  aria-hidden
                  className="absolute inset-0 opacity-60 pointer-events-none"
                  style={{
                    background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 4.5s ease-in-out infinite',
                  }}
                />
                <span
                  className="relative flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                    color: '#fff',
                    boxShadow: '0 0 14px rgba(6,182,212,0.65)',
                  }}
                >
                  <IconBrain size={13} strokeWidth={2.2} />
                </span>
                <span className="relative flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                  <span
                    className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black"
                    style={{
                      background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
                      color: '#0B0F1F',
                      letterSpacing: '0.05em',
                    }}
                  >
                    NOVO
                  </span>
                  <span className="text-white/95">Feita pra barbeiro que não para</span>
                  <IconSparkle size={12} className="text-amber-300 hidden sm:inline-block" />
                </span>
              </div>

              <h1 className="text-white font-black leading-[1.05] tracking-tight" style={{ fontSize: 'clamp(2.2rem, 7vw, 4.5rem)' }}>
                A primeira agenda<br />
                <span className="text-gradient">inteligente</span> pra<br className="hidden sm:block" />
                <span className="inline-flex items-center gap-3">
                  Barbeiros
                  <IconScissors size={36} className="text-cyan-400 hidden sm:inline-block animate-float-soft" />
                </span>
                .
              </h1>

              <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed">
                <strong className="text-white">Chega de WhatsApp no meio do corte.</strong> A SmartAgenda confirma horário, preenche cancelamento, traz cliente de volta e sobe sua barbearia no Google. Você corta cabelo — ela toca o resto.
              </p>

              {/* Stat hook — destaque mobile */}
              <div
                className="inline-flex items-center gap-3 px-3.5 py-2 rounded-xl"
                style={{
                  background: 'rgba(6,182,212,0.08)',
                  border: '1px solid rgba(6,182,212,0.25)',
                }}
              >
                <span className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0" style={{ background: 'rgba(6,182,212,0.18)', color: '#06B6D4' }}>
                  <IconClock24 size={16} />
                </span>
                <span className="text-left text-[13px] sm:text-sm leading-tight">
                  <strong className="text-white">24h trabalhando</strong>
                  <span className="text-slate-400"> — enquanto você dorme, ela agenda.</span>
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                <Link
                  href="/cadastro"
                  className="btn btn-primary-v2 btn-shimmer w-full sm:w-auto justify-center font-black text-base px-6 py-4 min-h-[52px]"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Pegar acesso gratuito
                    <IconArrowRight size={20} />
                  </span>
                </Link>
                <a
                  href="#smart"
                  className="btn btn-ghost w-full sm:w-auto justify-center font-semibold text-base px-6 py-4 min-h-[52px]"
                >
                  Ver como funciona
                </a>
              </div>

              <p className="text-xs sm:text-sm text-slate-400">
                14 dias grátis · sem cartão · R$67/mês após o trial
              </p>

              <div className="grid grid-cols-3 gap-3 sm:gap-6 md:gap-10 pt-5 sm:pt-6 border-t w-full max-w-xl" style={{ borderColor: 'var(--glass-border)' }}>
                {[
                  { n: '24h',   l: 'Trabalhando sozinha' },
                  { n: '1º',    l: 'Lugar no Google' },
                  { n: '5 min', l: 'Pra configurar' },
                ].map((s) => (
                  <div key={s.n}>
                    <p className="text-xl sm:text-2xl md:text-3xl font-black text-gradient leading-none">{s.n}</p>
                    <p className="text-[11px] sm:text-xs text-slate-400 mt-1.5 sm:mt-2 leading-tight">{s.l}</p>
                  </div>
                ))}
              </div>
            </SectionReveal>

            {/* Coluna direita — mockup (visível no mobile abaixo dos CTAs) */}
            <SectionReveal className="flex justify-center lg:justify-end mt-4 lg:mt-0">
              <div className="relative w-full max-w-[320px] sm:max-w-[380px] lg:max-w-[420px]">
                {/* Barber pole decorativo */}
                <div
                  className="hidden md:block absolute -left-8 top-12 w-3 h-32 rounded-sm overflow-hidden barber-pole-stripes"
                  style={{ boxShadow: '0 0 20px rgba(239,68,68,0.4)' }}
                  aria-hidden
                />
                <AgendaDashboardMockup />
              </div>
            </SectionReveal>

          </div>
        </div>
      </section>

      {/* ═══════════ 2. SMART FEATURES ═══════════ */}
      <section id="smart" className="relative py-16 sm:py-20 lg:py-28">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(6,182,212,0.1) 0%, transparent 60%)'
        }} />

        <div className="container relative px-4">
          <SectionReveal className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconBrain size={14} className="text-cyan-400" />
              <span>O que sua SmartAgenda faz</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Tudo que <span className="text-gradient">você ganha</span> em 5 minutos.
            </h2>
            <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto">
              Não é só agenda online. É uma operação completa que trabalha enquanto você atende.
            </p>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-5xl mx-auto">
            {SMART_FEATURES.map((f) => (
              <div
                key={f.titulo}
                className="glass rounded-2xl p-4 sm:p-5 flex flex-col gap-2 sm:gap-2.5 lift-card cursor-default"
                style={{ borderColor: `${f.color}25` }}
              >
                <div
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center icon-glow-hover"
                  style={{
                    background: `linear-gradient(135deg, ${f.color}30, ${f.color}10)`,
                    border: `1px solid ${f.color}40`,
                    color: f.color,
                  }}
                >
                  <f.Icon size={20} />
                </div>
                <h4 className="text-white font-bold text-sm leading-tight">{f.titulo}</h4>
                <p className="text-slate-400 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </SectionReveal>

          <SectionReveal className="text-center mt-10 sm:mt-12">
            <Link
              href="/cadastro"
              className="btn btn-primary-v2 btn-shimmer inline-flex font-black text-base px-6 py-4 min-h-[52px]"
            >
              <span className="relative z-10 flex items-center gap-2">
                Quero essa SmartAgenda
                <IconArrowRight size={20} />
              </span>
            </Link>
            <p className="text-slate-500 text-xs mt-3">14 dias grátis · sem cartão</p>
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 3. DOR ═══════════ */}
      <section id="dor" className="relative py-16 sm:py-20 lg:py-28">
        <div className="container px-4">
          <SectionReveal className="text-center mb-10 sm:mb-14 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <span style={{ color: '#EC4899' }}>●</span>
              <span>Reconhece isso?</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Barbearia lotada <span className="text-gradient">não se faz</span> com caderno.
            </h2>
            <p className="text-base sm:text-lg text-slate-400">
              O problema não é falta de cliente. É o sistema que você usa pra gerenciar eles.
            </p>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
            {DORES.map((d) => (
              <div
                key={d.titulo}
                className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-4 lift-card"
                style={{ border: `1px solid ${d.accent}30` }}
              >
                <DorMicroUI kind={d.kind} />
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2">{d.titulo}</h3>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{d.detalhe}</p>
                </div>
              </div>
            ))}
          </SectionReveal>
        </div>
      </section>

      <CTAInline
        titulo="A SmartAgenda resolve tudo isso por você"
        sub="14 dias grátis. Configure em 5 minutos e veja a diferença hoje."
      />

      {/* ═══════════ 4. PILAR GOOGLE RANKING ═══════════ */}
      <section className="relative py-16 sm:py-20 lg:py-28">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(245,158,11,0.15) 0%, transparent 60%)'
        }} />

        <div className="container relative px-4">
          <SectionReveal className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconTrophy size={14} className="text-amber-400" />
              <span>O pilar que ninguém te conta</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Avaliações no Google = <span className="text-gradient">barbearia cheia.</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
              Empresa paga R$500-R$2.000/mês pra aparecer no topo do Maps. Com a SmartAgenda, seu cliente faz isso de graça — e ainda sai feliz.
            </p>
          </SectionReveal>

          <SectionReveal>
            <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6 lg:gap-8 items-center max-w-5xl mx-auto">

              {/* Mini-UI Google Maps */}
              <div
                className="glass glow-border rounded-2xl sm:rounded-3xl p-5 sm:p-7 lift-card"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(6,182,212,0.08) 100%)',
                  border: '1px solid rgba(245,158,11,0.25)',
                }}
              >
                <div className="flex items-center gap-2 mb-4 text-xs text-slate-400">
                  <IconPin size={14} />
                  <span>Barbearia perto de mim</span>
                </div>

                <div className="space-y-2 sm:space-y-2.5">
                  {[
                    { pos: '1', nome: 'Sua barbearia',       nota: '4.9', reviews: '247', active: true },
                    { pos: '2', nome: 'Barber Concorrente',  nota: '4.6', reviews: '89',  active: false },
                    { pos: '3', nome: 'Barbearia do Bairro', nota: '4.4', reviews: '34',  active: false },
                  ].map((b) => (
                    <div
                      key={b.pos}
                      className="rounded-xl px-3 sm:px-4 py-3 flex items-center justify-between gap-3"
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
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{
                            background: b.active ? '#F59E0B' : 'rgba(255,255,255,0.08)',
                            color: b.active ? '#0B0F1F' : '#94A3B8',
                          }}
                        >
                          {b.pos}
                        </span>
                        <span className={`text-xs sm:text-sm font-semibold truncate ${b.active ? 'text-white' : 'text-slate-400'}`}>
                          {b.nome}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs flex-shrink-0">
                        <IconStar size={12} className="text-yellow-400" />
                        <span className={b.active ? 'text-white font-bold' : 'text-slate-400'}>{b.nota}</span>
                        <span className="text-slate-500 hidden sm:inline">({b.reviews})</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--glass-border)' }}>
                  <span className="text-[11px] sm:text-xs text-slate-400">Aparece primeiro no Maps</span>
                  <span className="text-[11px] sm:text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Orgânico · sem ads
                  </span>
                </div>
              </div>

              {/* Copy */}
              <div className="space-y-4 sm:space-y-5">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight">
                  Cliente ganha pontos pra avaliar. <span className="text-gradient">Você ganha clientes novos.</span>
                </h3>

                <ul className="space-y-3 text-sm sm:text-base text-slate-300">
                  {[
                    'Cliente sai do corte e recebe link pra avaliar no Google + ganhar 50 pontos.',
                    'Avalia 5★ em 20 segundos, ganha pontos no programa de fidelidade.',
                    'Sua nota sobe, o Google entende que você é o melhor da região, te coloca em cima.',
                    'Cliente novo pesquisa "barbearia perto de mim", vê você primeiro, agenda direto.',
                  ].map((txt, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-amber-400 font-black flex-shrink-0">{i + 1}.</span>
                      <span>{txt}</span>
                    </li>
                  ))}
                </ul>

                <div
                  className="rounded-2xl p-3 sm:p-4 text-xs sm:text-sm"
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}
                >
                  <strong className="text-amber-300">Concorrente paga R$800/mês pra anunciar.</strong> Você faz de graça, e ainda fideliza.
                </div>
              </div>

            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 5. INDICAÇÃO ═══════════ */}
      <section className="relative py-16 sm:py-20 lg:py-28">
        <div className="container max-w-5xl px-4">
          <SectionReveal className="text-center mb-10 sm:mb-12">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconLink size={14} className="text-violet-400" />
              <span>O multiplicador</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Cada cliente seu <span className="text-gradient">é um vendedor</span> pra você.
            </h2>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
              Link de indicação único por cliente. Quando o amigo dele corta pela primeira vez, os dois ganham pontos.
            </p>
          </SectionReveal>

          <SectionReveal>
            <div
              className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-8 lg:p-10 lift-card"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(6,182,212,0.08) 100%)',
                border: '1px solid rgba(139,92,246,0.25)',
              }}
            >
              <div className="grid sm:grid-cols-3 gap-5 sm:gap-6">
                {[
                  { Icon: IconScissors, step: 'Marcos corta',           detalhe: 'Recebe link único: barbear.io/MARCOS23',           color: '#06B6D4' },
                  { Icon: IconLink,     step: 'Manda pro João',         detalhe: '"Corta com o cara, é o melhor." João agenda.',     color: '#8B5CF6' },
                  { Icon: IconGift,     step: 'Marcos +50 · João +30',  detalhe: 'Os dois ganham. Você ganhou cliente sem gastar.', color: '#F59E0B' },
                ].map((s, i) => (
                  <div key={i} className="relative">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 icon-glow-hover"
                      style={{
                        background: `linear-gradient(135deg, ${s.color}, ${s.color}AA)`,
                        boxShadow: `0 6px 20px ${s.color}55`,
                        color: '#fff',
                      }}
                    >
                      <s.Icon size={20} />
                    </div>
                    <div className="text-xs font-bold text-slate-500 mb-1">PASSO {i + 1}</div>
                    <h4 className="text-white font-bold text-sm sm:text-base mb-1">{s.step}</h4>
                    <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{s.detalhe}</p>
                  </div>
                ))}
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      <CTAInline
        titulo="Sua barbearia merece uma SmartAgenda"
        sub="Cole o link no Insta hoje e veja agendamentos chegando amanhã."
      />

      {/* ═══════════ 6. MOTORES ═══════════ */}
      <section id="mecanismos" className="relative py-16 sm:py-20 lg:py-28">
        <div className="container px-4">
          <SectionReveal className="text-center mb-10 sm:mb-14 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconClipper size={14} className="text-blue-400" />
              <span>Os 4 motores da SmartAgenda</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Sistema que <span className="text-gradient">trabalha</span> enquanto você corta.
            </h2>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {MOTORES.map((m) => (
              <div
                key={m.titulo}
                className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-7 flex flex-col gap-3 lift-card"
                style={
                  m.highlight
                    ? {
                        background: `linear-gradient(135deg, ${m.color}15 0%, rgba(6,182,212,0.05) 100%)`,
                        border: `1px solid ${m.color}40`,
                        boxShadow: `0 8px 30px ${m.color}10`,
                      }
                    : undefined
                }
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center icon-glow-hover flex-shrink-0"
                    style={{
                      background: `${m.color}20`,
                      border: `1px solid ${m.color}40`,
                      color: m.color,
                    }}
                  >
                    <m.Icon size={20} />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider" style={{ color: m.color }}>
                    {m.tag}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white">{m.titulo}</h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 7. TIMELINE ═══════════ */}
      <section className="relative py-16 sm:py-20 lg:py-28">
        <div className="container px-4">
          <SectionReveal className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconClock24 size={14} className="text-cyan-400" />
              <span>Como seu dia fica com a SmartAgenda</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Do <span className="text-gradient">caderno</span> ao piloto automático.
            </h2>
          </SectionReveal>

          <SectionReveal stagger className="space-y-4 sm:space-y-5 max-w-4xl mx-auto">
            {TIMELINE.map((t, i) => (
              <div
                key={t.hora}
                className="glass rounded-2xl p-4 sm:p-6 grid lg:grid-cols-[auto_1fr_auto] gap-4 sm:gap-5 items-center lift-card"
              >
                <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:text-left flex-shrink-0">
                  <div className="text-xl sm:text-2xl font-black text-gradient leading-none">{t.hora}</div>
                  <div className="text-[10px] text-slate-500 lg:mt-1">passo {i + 1}/4</div>
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm sm:text-base mb-1">{t.titulo}</h4>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{t.detalhe}</p>
                </div>
                <div className="hidden lg:block flex-shrink-0">
                  <TimelineMicroUI kind={t.kind} />
                </div>
              </div>
            ))}
          </SectionReveal>
        </div>
      </section>

      <CTAInline
        titulo="Esse dia pode ser amanhã"
        sub="Cadastre hoje e comece a receber agendamento ainda essa semana."
      />

      {/* ═══════════ 8. COMPARAÇÃO ═══════════ */}
      <section className="relative py-16 sm:py-20 lg:py-28">
        <div className="container max-w-4xl px-4">
          <SectionReveal className="text-center mb-10 sm:mb-12">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconChair size={14} className="text-pink-400" />
              <span>Caderno × SmartAgenda</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              A diferença é <span className="text-gradient">gritante.</span>
            </h2>
          </SectionReveal>

          <SectionReveal>
            <div className="glass rounded-2xl sm:rounded-3xl overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider" style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--glass-border)', color: '#94A3B8' }}>
                <span>Recurso</span>
                <span className="text-center w-16 sm:w-24">Caderno</span>
                <span className="text-center w-20 sm:w-28 text-gradient">SmartAgenda</span>
              </div>
              {COMPARISON.map((row) => (
                <div
                  key={row}
                  className="grid grid-cols-[1fr_auto_auto] gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-3.5 items-center text-xs sm:text-sm border-b"
                  style={{ borderColor: 'var(--glass-border)' }}
                >
                  <span className="text-slate-300">{row}</span>
                  <span className="text-center w-16 sm:w-24 text-red-400 font-bold">—</span>
                  <span className="flex justify-center w-20 sm:w-28 text-emerald-400">
                    <IconCheck size={18} />
                  </span>
                </div>
              ))}
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 9. PASSOS ═══════════ */}
      <section className="relative py-16 sm:py-20 lg:py-28">
        <div className="container px-4">
          <SectionReveal className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconBolt size={14} className="text-emerald-400" />
              <span>3 passos · 5 minutos · zero técnico</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Hoje você <span className="text-gradient">começa</span>. Hoje mesmo.
            </h2>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {STEPS.map((p) => (
              <div key={p.n} className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-7 flex flex-col gap-3 lift-card">
                <div className="flex items-center justify-between">
                  <div
                    className="font-mono text-3xl sm:text-4xl font-black leading-none"
                    style={{
                      background: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {p.n}
                  </div>
                  <div className="text-cyan-400 icon-glow-hover">
                    <p.Icon size={28} />
                  </div>
                </div>
                <h3 className="text-base sm:text-xl font-bold text-white">{p.title}</h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 10. PRICING ═══════════ */}
      <section id="precos" className="relative py-16 sm:py-20 lg:py-28">
        <div className="container px-4">
          <SectionReveal className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconCash size={14} className="text-blue-400" />
              <span>Planos pra barbearia</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Menos que <span className="text-gradient">um corte</span> por semana.
            </h2>
            <p className="text-base sm:text-lg text-slate-400">
              14 dias grátis. Sem cartão. Cancele quando quiser.
            </p>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto">
            {/* Solo */}
            <div className="glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 lift-card">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white mb-1">Solo</h3>
                  <p className="text-slate-400 text-xs sm:text-sm">Sozinho ou com mais 1 barbeiro</p>
                </div>
                <div className="text-cyan-400">
                  <IconScissors size={28} />
                </div>
              </div>
              <div className="mb-5 sm:mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-white">R$67</span>
                  <span className="text-slate-400 text-sm">/mês</span>
                </div>
                <p className="text-slate-500 text-xs line-through mt-1">antes R$97</p>
              </div>

              <ul className="space-y-2.5 mb-4 text-xs sm:text-sm text-slate-300">
                {[
                  'Link pra bio do Insta e Google Meu Negócio',
                  'Lembrete automático anti-falta',
                  'Fila de espera quando cliente cancela',
                  'Sistema de pontos + indicação',
                  'Google Reviews — sobe seu ranking',
                  'Lista de clientes (nome, telefone, email)',
                  'Relatório financeiro por barbeiro',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="text-cyan-400 mt-0.5 flex-shrink-0">
                      <IconCheck size={14} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Bônus de lançamento destacado */}
              <div
                className="rounded-xl p-3 mb-5 flex items-start gap-3"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(251,191,36,0.08) 100%)',
                  border: '1px dashed rgba(245,158,11,0.5)',
                }}
              >
                <span className="flex-shrink-0 text-amber-300 mt-0.5">
                  <IconGift size={20} />
                </span>
                <div>
                  <p className="text-xs sm:text-sm font-black text-amber-200 leading-tight">
                    Bônus de lançamento: 2º barbeiro incluído
                  </p>
                  <p className="text-[11px] sm:text-xs text-amber-100/70 mt-0.5">
                    Normalmente Solo é 1 barbeiro. Quem entra na oferta cadastra 2.
                  </p>
                </div>
              </div>

              <p className="text-emerald-400 text-xs font-semibold mb-4">14 dias grátis — sem cartão</p>
              <Link
                href="/cadastro"
                className="btn btn-primary-v2 btn-shimmer w-full justify-center font-bold text-sm sm:text-base px-5 py-3.5 min-h-[48px]"
              >
                <span className="relative z-10">Pegar acesso gratuito</span>
              </Link>
            </div>

            {/* Equipe */}
            <div className="glass glow-border rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 relative lift-card">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 pill-glow text-[10px] sm:text-xs whitespace-nowrap">
                <IconStar size={10} className="text-amber-300" /> MAIS POPULAR
              </div>

              <div className="flex items-start justify-between mb-5 mt-2">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white mb-1">Equipe</h3>
                  <p className="text-slate-400 text-xs sm:text-sm">3 a 5 cadeiras</p>
                </div>
                <div className="text-violet-400">
                  <IconChair size={28} />
                </div>
              </div>
              <div className="mb-5 sm:mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-gradient">R$107</span>
                  <span className="text-slate-400 text-sm">/mês</span>
                </div>
                <p className="text-slate-500 text-xs line-through mt-1">antes R$147</p>
              </div>

              <ul className="space-y-2.5 mb-6 text-xs sm:text-sm text-slate-300">
                {[
                  'Tudo do Solo',
                  'Até 5 barbeiros com agenda separada',
                  'Comissão automática por barbeiro',
                  'Lista de clientes compartilhada da barbearia',
                  'Financeiro consolidado da barbearia',
                  'Suporte prioritário no WhatsApp',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="text-cyan-400 mt-0.5 flex-shrink-0">
                      <IconCheck size={14} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="text-emerald-400 text-xs font-semibold mb-4">14 dias grátis — sem cartão</p>
              <Link
                href="/cadastro"
                className="btn btn-primary-v2 btn-shimmer w-full justify-center font-bold text-sm sm:text-base px-5 py-3.5 min-h-[48px]"
              >
                <span className="relative z-10">Pegar acesso gratuito</span>
              </Link>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 11. PROVA SOCIAL ═══════════ */}
      <section className="relative py-16 sm:py-20 lg:py-28">
        <div className="container max-w-3xl px-4">
          <SectionReveal>
            <div
              className="glass glow-border rounded-2xl sm:rounded-3xl p-6 sm:p-10 lg:p-12 text-center lift-card"
              style={{
                background: 'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(139,92,246,0.1) 100%)',
                border: '1px solid rgba(6,182,212,0.25)',
              }}
            >
              <div className="pill mb-4 sm:mb-5 inline-flex items-center gap-2 text-xs">
                <IconBarberPole size={14} className="text-cyan-400" />
                <span>Primeiros parceiros</span>
              </div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-3 sm:mb-4">
                <span className="text-gradient">Barbearia Olimpio</span> já tá configurando.
              </h3>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-5 sm:mb-6 max-w-xl mx-auto">
                Seu nome entra agora com o preço de lançamento travado. Quando virarmos a chave de R$67 pra R$97, quem assinou antes paga sempre R$67.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[11px] sm:text-xs text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  2 negócios confirmados
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  R$67 pra sempre
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
                  Suporte com fundador
                </span>
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 12. FAQ ═══════════ */}
      <section id="faq" className="relative py-16 sm:py-20 lg:py-28">
        <div className="container max-w-3xl px-4">
          <SectionReveal className="text-center mb-10 sm:mb-12">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <span style={{ color: '#3B82F6' }}>●</span>
              <span>Perguntas frequentes</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Dúvida? <span className="text-gradient">Resposta.</span>
            </h2>
          </SectionReveal>

          <SectionReveal>
            <FAQ />
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 13. CTA FINAL ═══════════ */}
      <section className="relative py-20 sm:py-28 lg:py-32">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(6,182,212,0.28) 0%, transparent 60%)'
          }} />
        </div>

        <div className="container relative text-center max-w-3xl px-4">
          <SectionReveal>
            <div className="pill-glow mb-5 sm:mb-6 animate-pulse-glow inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconBrain size={14} />
              <span>SmartAgenda · 14 dias grátis · sem cartão</span>
            </div>
            <h2 className="text-white font-black mb-5 sm:mb-6 leading-[1.05]" style={{ fontSize: 'clamp(2rem, 7vw, 4.5rem)' }}>
              Seu concorrente tá<br />
              agendando no <span className="text-gradient">caderno</span>.
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-8 sm:mb-10 max-w-2xl mx-auto">
              Configure sua SmartAgenda hoje, cole o link na bio, e em 5 minutos sua barbearia agenda sozinha — inclusive de madrugada.
            </p>

            <Link
              href="/cadastro"
              className="btn btn-primary-v2 btn-shimmer inline-flex font-black text-base sm:text-lg px-7 py-4 sm:py-5 min-h-[56px]"
            >
              <span className="relative z-10 flex items-center gap-2">
                Pegar meu acesso gratuito
                <IconArrowRight size={20} />
              </span>
            </Link>
            <p className="text-slate-500 text-xs mt-4 sm:mt-5">
              R$67/mês após o trial · Oferta de lançamento
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 sm:py-14 border-t" style={{ borderColor: 'var(--glass-border)' }}>
        <div className="container px-4 space-y-8">

          {/* Top: logo + segmentos */}
          <div className="grid sm:grid-cols-[1fr_auto] gap-6 items-start">
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-agendapro-dark.svg" alt="AgendaPRO" className="h-7" />
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm">
                A SmartAgenda dos negócios de serviço. Atende, lembra, fideliza e sobe seu ranking no Google.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs sm:text-sm">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Segmentos</p>
                <Link href="/barbearia" className="block text-slate-300 hover:text-white transition-colors">Barbearia</Link>
                <Link href="/salao" className="block text-slate-400 hover:text-white transition-colors">Salão</Link>
                <Link href="/nail" className="block text-slate-400 hover:text-white transition-colors">Nail</Link>
                <Link href="/estetica" className="block text-slate-400 hover:text-white transition-colors">Estética</Link>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Conta</p>
                <Link href="/cadastro" className="block text-slate-400 hover:text-white transition-colors">Criar conta</Link>
                <Link href="/admin/login" className="block text-slate-400 hover:text-white transition-colors">Entrar</Link>
                <Link href="/privacidade" className="block text-slate-400 hover:text-white transition-colors">Privacidade</Link>
                <Link href="/termos" className="block text-slate-400 hover:text-white transition-colors">Termos de uso</Link>
              </div>
            </div>
          </div>

          {/* Bottom: copy */}
          <div
            className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] sm:text-xs text-slate-500"
            style={{ borderTop: '1px solid var(--glass-border)' }}
          >
            <span>© 2025 AgendaPRO · by Impulso Digital · Palmas, TO</span>
            <div className="flex items-center gap-4">
              <Link href="/privacidade" className="hover:text-white transition-colors">Política de Privacidade</Link>
              <span>·</span>
              <Link href="/termos" className="hover:text-white transition-colors">Termos de Uso</Link>
            </div>
          </div>
        </div>
      </footer>

    </main>
  )
}
