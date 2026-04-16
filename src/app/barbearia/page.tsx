import type { Metadata } from 'next'
import Link from 'next/link'
import FAQ from '@/components/FAQ'

export const metadata: Metadata = {
  title: 'AgendaPRO para Barbearias — Agenda Online com Lembrete Automático',
  description: 'Sistema de agendamento online para barbearias. Cliente agenda pelo link, recebe lembrete por e-mail, fila de espera preenche cancelamentos. A partir de R$67/mês.',
  openGraph: {
    title: 'AgendaPRO para Barbearias',
    description: 'Seu cliente agenda sozinho pelo link na bio. Lembrete automático, fila de espera e Google Reviews integrado.',
  },
}
import type { FAQItem } from '@/components/FAQ'
import AgendaDashboardMockup from '@/components/AgendaDashboardMockup'
import { TimelineMicroUI, DorMicroUI } from '@/components/LandingMicroUI'
import ComparisonMiniUIs from '@/components/ComparisonMiniUIs'
import OnboardingSteps from '@/components/OnboardingSteps'
import SocialProofToast from '@/components/SocialProofToast'
import { AnimatedGradient, SectionReveal } from '@/components/ui'
import {
  IconScissors,
  IconClipper,
  IconChair,
  IconBrain,
  IconTrophy,
  IconBolt,
  IconLink,
  IconCash,
  IconClock24,
  IconGift,
  IconContacts,
  IconSparkle,
  IconArrowRight,
  IconCheck,
  IconStar,
  IconPin,
  IconMail,
} from '@/components/BarberIcons'

/* ═══════════════════════════════════════════════════════════
   LP BARBEARIA — SmartAgenda
   Persona: barbeiro 25-45, dono de 1-3 cadeiras.
   Tudo SVG, mobile-first, com movimento.
═══════════════════════════════════════════════════════════ */

const DORES = [
  { kind: 'whatsapp' as const, titulo: 'O WhatsApp não para de tocar', detalhe: '40 mensagens por dia perguntando se tem horário às 15h. Você para a tesoura, responde, volta. Repete o dia inteiro.', accent: '#06B6D4', stat: '40+', statLabel: 'msg/dia' },
  { kind: 'caderno'  as const, titulo: 'Agenda bagunçada, cliente sumiu', detalhe: 'Marcou no papel, esqueceu de confirmar. Cliente não veio. Cadeira vazia 40 minutos. Perdeu R$50 e nem percebeu.', accent: '#8B5CF6', stat: 'R$50', statLabel: 'perdidos/falta' },
  { kind: 'queda'    as const, titulo: 'Sem controle do que entra e sai', detalhe: 'Fim do mês chega e você não sabe quanto cada barbeiro fez, quanto deve de comissão, nem se o caixa fecha. Controle zero.', accent: '#EC4899', stat: '-32%', statLabel: 'faturamento' },
]

const MOTORES = [
  { Icon: IconBrain,   tag: 'Atendimento',   titulo: 'Confirma e lembra sozinha',       desc: 'Lembrete automático por e-mail na véspera e 1h antes. Cliente confirma, fila avança ou recua, agenda do dia chega na sua mão limpa.', color: '#06B6D4', stat: '-50%',  statLabel: 'faltas' },
  { Icon: IconTrophy,  tag: 'Ranking',        titulo: 'Sobe no Google sem pagar',        desc: 'Cliente sai do corte, ganha pontos pra avaliar no Google. Sua nota sobe, o Maps te coloca em cima da concorrência.',              color: '#F59E0B', stat: '+0.6',  statLabel: 'nota/mês' },
  { Icon: IconLink,    tag: 'Multiplicação',  titulo: 'Transforma cliente em vendedor',  desc: 'Link de indicação único por cliente. Quando o amigo agenda, ambos ganham pontos. Cliente vira promotor.',                       color: '#8B5CF6', stat: 'x2.3',  statLabel: 'clientes' },
  { Icon: IconBolt,    tag: 'Recuperação',    titulo: 'Preenche cancelamento sozinha',   desc: 'Cancelou 10:00? O sistema chama os 3 primeiros da fila. Quem aceitar primeiro fica com a vaga.',                                 color: '#A78BFA', stat: '3 min', statLabel: 'pra preencher' },
]

const TIMELINE = [
  { kind: '07' as const, hora: '07:30', titulo: 'Você acorda com a agenda cheia',     detalhe: 'Cliente agendou 23:47 pela bio do Insta. SmartAgenda confirmou sozinha.' },
  { kind: '10' as const, hora: '10:00', titulo: 'Pedro cancelou — fila assumiu',      detalhe: 'A SmartAgenda chamou Marcos da fila. Ele aceitou em 3 minutos.' },
  { kind: '14' as const, hora: '14:00', titulo: 'João completou 10º corte',           detalhe: 'Recompensa liberada, ele compartilhou. 2 amigos já agendaram pelo link.' },
  { kind: '20' as const, hora: '20:00', titulo: 'Fim do expediente',                  detalhe: 'R$560 no caixa. 3 avaliações 5★ novas. Sua nota subiu pra 4.9.' },
]

/* ═══ FAQs específicas de Barbearia — ordenadas por jornada de decisão ═══ */

const BARBER_FAQS: FAQItem[] = [
  /* ── RISCO / PREÇO (fecha primeiro) ── */
  {
    q: 'Preciso de cartão de crédito pra testar?',
    a: 'Não. São 14 dias grátis, sem cartão, sem compromisso nenhum. Você configura tudo, usa de verdade e só decide depois se quer continuar.',
  },
  {
    q: 'Quanto custa depois do teste?',
    a: 'Plano Solo (1–2 barbeiros): R$67/mês. Plano Equipe (3–5 barbeiros): R$107/mês. Menos que 2 cortes no mês. Se 1 cliente da fila voltar por semana, já pagou o mês inteiro e sobrou.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim. Sem multa, sem fidelidade, sem contrato anual. Cancela pelo painel ou pelo WhatsApp em 1 clique. Se voltar depois, seus dados continuam lá.',
  },
  {
    q: 'Aceita Pix?',
    a: 'Sim. Você paga o plano via Pix, cartão de crédito ou boleto. Sem complicação.',
  },

  /* ── FUNCIONALIDADE (como funciona) ── */
  {
    q: 'Meu cliente precisa baixar aplicativo?',
    a: 'Não. Ele clica no link, escolhe o horário e confirma — tudo no navegador do celular. Sem cadastro, sem download. É por isso que a taxa de agendamento é alta: zero atrito.',
  },
  {
    q: 'E o WhatsApp? Perco os clientes que me chamam lá?',
    a: 'Não. O AgendaPRO complementa o WhatsApp, não substitui. Quem te chama pelo Zap, você cadastra manual em 5 segundos. Quem vê o link na bio ou no Google, agenda sozinho sem te interromper no corte.',
  },
  {
    q: 'Como funciona o lembrete anti-falta?',
    a: 'O sistema envia lembretes automáticos por e-mail: um na véspera e outro 1 hora antes do horário. Reduz faltas em até 50%. Usamos e-mail em vez de WhatsApp pra proteger seu número — sem risco de bloqueio por disparo em massa.',
  },
  {
    q: 'E se alguém cancelar em cima da hora?',
    a: 'A fila de espera entra em ação automática. O sistema avisa os próximos da fila e quem aceitar primeiro fica com a vaga. Horário preenchido em minutos — sem você fazer nada.',
  },
  {
    q: 'Tenho 3 barbeiros. Cada um tem agenda separada?',
    a: 'Sim. No plano Equipe, cada barbeiro tem agenda, horários e comissão independentes. O cliente escolhe com quem quer cortar. E você vê o relatório de cada um no painel.',
  },

  /* ── TÉCNICO (consigo usar?) ── */
  {
    q: 'É difícil de configurar?',
    a: 'Nome da barbearia, serviços, preços, horários. Preenche um form e em 5 minutos sua página tá no ar. Se sabe usar WhatsApp, sabe configurar o AgendaPRO.',
  },
  {
    q: 'Funciona pelo celular ou preciso de computador?',
    a: '100% pelo celular. Painel, agenda, relatório financeiro, bloqueio de horário — tudo no seu celular. Computador é opcional.',
  },
  {
    q: 'E se meu barbeiro não souber mexer?',
    a: 'A interface é simples de propósito. Cada barbeiro recebe login próprio, vê só a agenda dele e marca/desmarca em 2 toques. Sem treinamento, sem tutorial de 30 minutos.',
  },

  /* ── PÓS-COMPRA (e se...) ── */
  {
    q: 'O que acontece quando o teste acaba?',
    a: 'Você recebe um aviso antes. Pra continuar, escolhe um plano. Se não contratar, o painel é pausado — mas nenhum dado é apagado. Retoma quando quiser, tudo do jeito que deixou.',
  },
  {
    q: 'Já uso Trinks/iSalon. Por que trocar?',
    a: 'Eles são agenda online. O AgendaPRO é SmartAgenda: fila de espera automática, fidelidade com pontos, link de indicação rastreado e Google Reviews integrado. Nenhum deles faz essas 4 coisas. E custa menos.',
  },
  {
    q: 'Quem dá suporte?',
    a: 'Suporte direto com a equipe da Impulso Digital pelo WhatsApp. Sem robô, sem fila de ticket, sem esperar 48h. Você fala com gente de verdade que entende do produto.',
  },
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

        <div className="container relative z-10 px-4 py-12 sm:py-16 lg:py-24">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center">

            {/* Coluna esquerda — copy */}
            <SectionReveal className="flex flex-col items-center lg:items-start text-center lg:text-left gap-5 sm:gap-6 lg:gap-7">
              {/* Pill compacto */}
              <div className="pill inline-flex items-center gap-2 text-[10px] sm:text-xs">
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
                <span className="text-white/95 font-bold uppercase tracking-wider">SmartAgenda pra barbearias</span>
              </div>

              <h1 className="text-white font-black leading-[1.05] tracking-tight" style={{ fontSize: 'clamp(2.2rem, 7vw, 4.5rem)' }}>
                Para de perder<br />
                cliente por<br className="hidden sm:block" />
                <span className="text-gradient">WhatsApp.</span>
              </h1>

              <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed">
                <strong className="text-white">Seu cliente agenda sozinho pelo link na bio.</strong> Recebe lembrete automático, não fura. Cancelou? A fila de espera preenche a vaga em minutos. E cada corte vira avaliação no Google — sua barbearia sobe no ranking sem pagar ads.
              </p>

              {/* Stats rápidos */}
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <div
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.25)',
                  }}
                >
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0" style={{ background: 'rgba(16,185,129,0.18)', color: '#10B981' }}>
                    <IconCheck size={14} />
                  </span>
                  <span className="text-left text-[12px] sm:text-[13px] leading-tight">
                    <strong className="text-white">-50% faltas</strong>
                    <span className="text-slate-500 hidden sm:inline"> · lembrete automático</span>
                  </span>
                </div>
                <div
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{
                    background: 'rgba(251,188,4,0.08)',
                    border: '1px solid rgba(251,188,4,0.25)',
                  }}
                >
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0" style={{ background: 'rgba(251,188,4,0.18)', color: '#FBBC04' }}>
                    <IconStar size={14} />
                  </span>
                  <span className="text-left text-[12px] sm:text-[13px] leading-tight">
                    <strong className="text-white">4.9 no Google</strong>
                    <span className="text-slate-500 hidden sm:inline"> · avaliação incentivada</span>
                  </span>
                </div>
                <div
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{
                    background: 'rgba(59,130,246,0.08)',
                    border: '1px solid rgba(59,130,246,0.25)',
                  }}
                >
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0" style={{ background: 'rgba(59,130,246,0.18)', color: '#3B82F6' }}>
                    <IconClock24 size={14} />
                  </span>
                  <span className="text-left text-[12px] sm:text-[13px] leading-tight">
                    <strong className="text-white">Funciona 24h</strong>
                    <span className="text-slate-500 hidden sm:inline"> · agenda enquanto dorme</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                <Link
                  href="/cadastro"
                  className="btn btn-primary-v2 btn-shimmer w-full sm:w-auto justify-center font-black text-base px-6 py-4 min-h-[52px]"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Testar 14 dias grátis
                    <IconArrowRight size={20} />
                  </span>
                </Link>
                <a
                  href="#dor"
                  className="btn btn-ghost w-full sm:w-auto justify-center font-semibold text-base px-6 py-4 min-h-[52px]"
                >
                  Ver como funciona
                </a>
              </div>

              <p className="text-xs sm:text-sm text-slate-400">
                14 dias grátis · sem cartão · R$67/mês depois
              </p>
            </SectionReveal>

            {/* Coluna direita — mockup */}
            <SectionReveal className="flex justify-center lg:justify-end mt-4 lg:mt-0">
              <div className="relative w-full max-w-[320px] sm:max-w-[380px] lg:max-w-[420px]">
                <AgendaDashboardMockup />
              </div>
            </SectionReveal>

          </div>
        </div>
      </section>

      {/* ═══════════ 2. DOR ═══════════ */}
      <section id="dor" className="relative py-16 sm:py-20 lg:py-28">
        <div className="container px-4">
          <SectionReveal className="text-center mb-10 sm:mb-14 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>Reconhece isso?</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Barbearia lotada <span className="text-gradient">não se faz</span> no improviso.
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
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">{d.titulo}</h3>
                    <span
                      className="px-2 py-1 rounded-lg text-[10px] font-black flex-shrink-0 ml-2"
                      style={{ background: `${d.accent}15`, color: d.accent, border: `1px solid ${d.accent}30` }}
                    >
                      {d.stat} <span className="font-medium opacity-70">{d.statLabel}</span>
                    </span>
                  </div>
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


      {/* ═══════════ 3. MOTORES ═══════════ */}
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
            {MOTORES.map((m, i) => (
              <div
                key={m.titulo}
                className="rounded-2xl sm:rounded-3xl p-5 sm:p-7 flex flex-col gap-3 lift-card relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${m.color}12 0%, rgba(8,11,24,0.8) 100%)`,
                  border: `1px solid ${m.color}35`,
                  boxShadow: `0 8px 30px ${m.color}10`,
                }}
              >
                {/* Header: ícone + tag + stat */}
                <div className="flex items-center justify-between">
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

                  {/* Stat callout */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-xl sm:text-2xl font-black leading-none" style={{ color: m.color }}>
                      {m.stat}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                      {m.statLabel}
                    </div>
                  </div>
                </div>

                {/* Título + descrição */}
                <h3 className="text-lg sm:text-xl font-black text-white">{m.titulo}</h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{m.desc}</p>

                {/* Mini-UI por motor */}
                <div className="mt-1">
                  {i === 0 && (
                    /* Atendimento — lembrete por e-mail */
                    <div
                      className="rounded-xl p-3 space-y-1.5"
                      style={{ background: 'rgba(8,11,24,0.6)', border: `1px solid ${m.color}25` }}
                    >
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#10B981' }}>
                          <IconMail size={11} strokeWidth={2} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-white font-bold">Lembrete por e-mail</span>
                          <span className="text-[9px] text-slate-500"> · ontem 18:00</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#06B6D4' }}>
                          <IconCheck size={11} strokeWidth={3} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-white font-bold">Jo\u00e3o respondeu SIM</span>
                          <span className="text-[9px] text-slate-500"> · 18:03</span>
                        </div>
                      </div>
                      <div className="text-[9px] text-slate-500 px-1 pt-0.5">
                        Confirmado sem voc\u00ea tocar no celular
                      </div>
                    </div>
                  )}

                  {i === 1 && (
                    /* Ranking — Google Maps card */
                    <div
                      className="rounded-xl p-3"
                      style={{ background: 'rgba(8,11,24,0.6)', border: `1px solid ${m.color}25` }}
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}
                        >
                          <IconPin size={16} className="text-amber-400" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold text-white">Barber Tiago</div>
                          <div className="text-[9px] text-slate-500">Google Maps · Centro, SP</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mb-1.5">
                        {[1,2,3,4,5].map((s) => (
                          <IconStar key={s} size={12} className={s <= 4 ? 'text-amber-400' : 'text-amber-400/50'} />
                        ))}
                        <span className="text-[11px] font-black text-white ml-1">4.9</span>
                        <span className="text-[9px] text-slate-500 ml-1">· 127 avalia\u00e7\u00f5es</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-emerald-400 font-bold">+3 avalia\u00e7\u00f5es essa semana</span>
                        <span className="text-slate-500">· autom\u00e1tico</span>
                      </div>
                    </div>
                  )}

                  {i === 2 && (
                    /* Multiplicação — link de indicação */
                    <div
                      className="rounded-xl p-3 space-y-1.5"
                      style={{ background: 'rgba(8,11,24,0.6)', border: `1px solid ${m.color}25` }}
                    >
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#8B5CF6' }}>
                          <IconLink size={11} strokeWidth={2.2} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-white font-bold">Lucas compartilhou o link</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#06B6D4' }}>
                          <IconContacts size={11} strokeWidth={2.2} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-white font-bold">Tiago agendou pelo link</span>
                          <span className="text-[9px] text-slate-500"> · corte sex 14h</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-1 pt-0.5 text-[9px]">
                        <span className="text-violet-300 font-bold">+50pts Lucas · +50pts Tiago</span>
                        <span className="text-slate-500">autom\u00e1tico</span>
                      </div>
                    </div>
                  )}

                  {i === 3 && (
                    /* Recuperação — fila de espera */
                    <div
                      className="rounded-xl p-3 space-y-1.5"
                      style={{ background: 'rgba(8,11,24,0.6)', border: `1px solid ${m.color}25` }}
                    >
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.2)', color: '#F87171' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-red-400 line-through">10:00 — Pedro cancelou</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: `${m.color}10`, border: `1px solid ${m.color}25` }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: m.color }}>
                          <IconBolt size={11} strokeWidth={2.4} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-white font-bold">Fila acionada</span>
                          <span className="text-[9px] text-slate-500"> · 3 notificados</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#10B981' }}>
                          <IconCheck size={11} strokeWidth={3} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-white font-bold">10:00 — Marcos aceitou</span>
                          <span className="text-[9px] text-emerald-400 font-bold"> +R$35</span>
                        </div>
                      </div>
                      <div className="text-[9px] text-slate-500 px-1 pt-0.5">
                        Vaga preenchida em <span className="text-white font-bold">3 minutos</span> · sem voc\u00ea fazer nada
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 4. CONTROLE FINANCEIRO ═══════════ */}
      <section className="relative py-16 sm:py-20 lg:py-28">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(16,185,129,0.12) 0%, transparent 60%)'
        }} />

        <div className="container relative px-4">
          <SectionReveal className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconCash size={14} className="text-emerald-400" />
              <span>Controle que você nunca teve</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Seu financeiro <span className="text-gradient">no piloto automático.</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
              Chega de planilha, caderninho e conta de cabeça. A SmartAgenda calcula tudo: faturamento, comissão por barbeiro e relatório pronto pra você.
            </p>
          </SectionReveal>

          <SectionReveal>
            <div className="grid lg:grid-cols-[1fr_1fr] gap-6 lg:gap-8 items-center max-w-5xl mx-auto">

              {/* Mini-UI Dashboard financeiro — estilo realista */}
              <div
                className="rounded-2xl sm:rounded-3xl overflow-hidden lift-card"
                style={{
                  background: '#fff',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
                }}
              >
                {/* Header dashboard */}
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#F8F9FA', borderBottom: '1px solid #F1F3F4' }}>
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#188038" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    <span className="text-[13px] font-semibold text-[#202124]">Financeiro</span>
                  </div>
                  <span className="text-[10px] text-[#9AA0A6]">Abril 2026</span>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-3 divide-x divide-[#F1F3F4]" style={{ borderBottom: '1px solid #F1F3F4' }}>
                  <div className="px-3 py-3 text-center">
                    <div className="text-[9px] text-[#9AA0A6] uppercase tracking-wider font-medium">Faturamento</div>
                    <div className="text-[16px] font-black text-[#202124] mt-0.5">R$ 4.280</div>
                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#188038" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="19" x2="12" y2="5" />
                        <polyline points="5 12 12 5 19 12" />
                      </svg>
                      <span className="text-[9px] font-bold text-[#188038]">+18%</span>
                    </div>
                  </div>
                  <div className="px-3 py-3 text-center">
                    <div className="text-[9px] text-[#9AA0A6] uppercase tracking-wider font-medium">Atendimentos</div>
                    <div className="text-[16px] font-black text-[#202124] mt-0.5">127</div>
                    <div className="text-[9px] text-[#9AA0A6] mt-0.5">este mês</div>
                  </div>
                  <div className="px-3 py-3 text-center">
                    <div className="text-[9px] text-[#9AA0A6] uppercase tracking-wider font-medium">Ticket médio</div>
                    <div className="text-[16px] font-black text-[#202124] mt-0.5">R$ 33</div>
                    <div className="text-[9px] text-[#9AA0A6] mt-0.5">por cliente</div>
                  </div>
                </div>

                {/* Tabela de comissões */}
                <div className="px-3 py-2">
                  <div className="text-[10px] font-semibold text-[#5F6368] uppercase tracking-wider mb-1.5 px-1">Comissões</div>
                  {/* Header */}
                  <div className="flex items-center gap-2 px-1 py-1 text-[9px] font-medium text-[#9AA0A6]">
                    <span className="flex-1">Profissional</span>
                    <span className="w-16 text-right">Produção</span>
                    <span className="w-8 text-center">%</span>
                    <span className="w-16 text-right">A pagar</span>
                  </div>
                  {[
                    { nome: 'Diego Lima',   init: 'D', color: '#1A73E8', prod: 'R$ 1.680', pct: '40%', pagar: 'R$ 672' },
                    { nome: 'Tiago Reis',   init: 'T', color: '#EA4335', prod: 'R$ 1.420', pct: '35%', pagar: 'R$ 497' },
                    { nome: 'Rafael Costa', init: 'R', color: '#34A853', prod: 'R$ 1.180', pct: '40%', pagar: 'R$ 472' },
                  ].map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-1 py-2 rounded-lg"
                      style={{ background: i % 2 === 0 ? '#F9FAFB' : '#fff' }}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: p.color }}
                      >
                        <span className="text-[9px] font-bold text-white">{p.init}</span>
                      </div>
                      <span className="flex-1 text-[11px] font-medium text-[#202124] truncate">{p.nome}</span>
                      <span className="w-16 text-right text-[11px] text-[#202124]">{p.prod}</span>
                      <span className="w-8 text-center text-[10px] text-[#9AA0A6]">{p.pct}</span>
                      <span className="w-16 text-right text-[11px] font-bold text-[#188038]">{p.pagar}</span>
                    </div>
                  ))}
                </div>

                {/* Footer — total */}
                <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: '#E6F4EA', borderTop: '1px solid #C8E6C9' }}>
                  <span className="text-[11px] font-medium text-[#188038] flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#188038" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Caixa conferido
                  </span>
                  <span className="text-[11px] font-black text-[#188038]">Lucro: R$ 2.639</span>
                </div>
              </div>

              {/* Copy */}
              <div className="space-y-4 sm:space-y-5">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight">
                  Sabe quanto cada barbeiro produziu?{' '}
                  <span className="text-gradient">Agora sabe.</span>
                </h3>

                <ul className="space-y-3 text-sm sm:text-base text-slate-300">
                  {[
                    { icon: <IconCash size={14} />, txt: 'Faturamento do dia, da semana e do mês — atualizado em tempo real no painel.' },
                    { icon: <IconContacts size={14} strokeWidth={2} />, txt: 'Cada profissional com produção e comissão calculadas automaticamente.' },
                    { icon: <IconBrain size={14} strokeWidth={2} />, txt: 'Ticket médio, atendimentos e crescimento — sem planilha, sem conta de cabeça.' },
                    { icon: <IconCheck size={14} strokeWidth={2} />, txt: 'Fim do mês: abre o painel, vê quanto deve pra cada barbeiro. Pronto.' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        className="w-7 h-7 rounded-lg inline-flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          background: 'rgba(16,185,129,0.12)',
                          border: '1px solid rgba(16,185,129,0.3)',
                          color: '#34D399',
                        }}
                      >
                        {item.icon}
                      </span>
                      <span>{item.txt}</span>
                    </li>
                  ))}
                </ul>

                <p className="text-sm text-slate-500 leading-relaxed">
                  Na seção de dor você viu o caos: <strong className="text-slate-300">comissão sem conferir, caixa que não fecha.</strong> Aqui é o oposto — tudo calculado, tudo verde, tudo no seu celular.
                </p>
              </div>

            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 5. TIMELINE ═══════════ */}
      <section className="relative py-16 sm:py-20 lg:py-28">
        <div className="container px-4">
          <SectionReveal className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconClock24 size={14} className="text-cyan-400" />
              <span>Como seu dia fica com a SmartAgenda</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Seu dia inteiro no <span className="text-gradient">piloto automático</span>.
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
                <div className="flex justify-center lg:block lg:flex-shrink-0 pt-1 lg:pt-0">
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

      {/* ═══════════ 6. COMPARAÇÃO ═══════════ */}
      <section className="relative py-16 sm:py-20 lg:py-28">
        <div className="container max-w-6xl px-4">
          <SectionReveal className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconChair size={14} className="text-pink-400" />
              <span>SmartAgenda x Outros apps</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Outros apps <span className="text-slate-500">só agendam</span>.<br />
              <span className="text-gradient">SmartAgenda trabalha.</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Mesma tela por fora. Mundos diferentes por dentro.
              Olha o que acontece em cada uma quando o cliente cancela às 10h.
            </p>
          </SectionReveal>

          <SectionReveal>
            <ComparisonMiniUIs />
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 7. PASSOS ═══════════ */}
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

          <SectionReveal>
            <OnboardingSteps />
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 8. PRICING ═══════════ */}
      <section id="precos" className="relative py-10 sm:py-14 lg:py-20">
        <div className="container px-4">

          {/* ── Header ── */}
          <SectionReveal className="text-center mb-8 sm:mb-10 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconCash size={14} className="text-blue-400" />
              <span>Planos pra barbearia</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Menos que <span className="text-gradient">um corte</span> por semana.
            </h2>
            <p className="text-base sm:text-lg text-slate-400">
              Se 1 cliente da fila voltar essa semana, a SmartAgenda já se pagou.
            </p>
          </SectionReveal>

          {/* ── Badge lançamento (urgência integrada) ── */}
          <SectionReveal className="flex justify-center mb-8 sm:mb-10">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] sm:text-xs font-bold"
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(251,191,36,0.08))',
                border: '1px solid rgba(245,158,11,0.45)',
                color: '#FDE68A',
                boxShadow: '0 0 20px rgba(245,158,11,0.2)',
              }}
            >
              <IconSparkle size={13} className="text-amber-300" />
              <span>Preço de lançamento travado vitalício — quem entra agora paga sempre isso</span>
            </div>
          </SectionReveal>

          {/* ── Âncora de valor — comparação separado vs AgendaPRO ── */}
          <SectionReveal className="max-w-3xl mx-auto mb-8 sm:mb-10">
            <div
              className="glass rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(8,11,24,0.8) 100%)',
              }}
            >
              <div
                className="px-4 sm:px-6 py-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 border-b"
                style={{ borderColor: 'var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}
              >
                Se fosse comprar separado
              </div>
              <div className="px-4 sm:px-6 py-3 space-y-2">
                {[
                  { item: 'Agenda online (Trinks, iSalon)',      price: 'R$ 89/mês' },
                  { item: 'Programa de fidelidade com pontos',    price: 'R$ 49/mês' },
                  { item: 'Sistema de indicação entre clientes',  price: 'R$ 79/mês' },
                  { item: 'Gestão de avaliações Google Reviews',  price: 'R$ 39/mês' },
                ].map((v) => (
                  <div key={v.item} className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-400">{v.item}</span>
                    <span className="text-slate-500 line-through font-mono text-xs">{v.price}</span>
                  </div>
                ))}
              </div>
              <div
                className="flex items-center justify-between px-4 sm:px-6 py-3 border-t"
                style={{
                  borderColor: 'rgba(59,130,246,0.25)',
                  background: 'linear-gradient(90deg, rgba(59,130,246,0.08), rgba(6,182,212,0.08))',
                }}
              >
                <span className="text-sm sm:text-base font-black text-white">Total separado</span>
                <span className="text-sm sm:text-base font-black text-white line-through">R$ 256/mês</span>
              </div>
              <div
                className="flex items-center justify-between px-4 sm:px-6 py-3 border-t"
                style={{
                  borderColor: 'rgba(16,185,129,0.3)',
                  background: 'linear-gradient(90deg, rgba(16,185,129,0.1), rgba(6,182,212,0.08))',
                }}
              >
                <span className="text-sm sm:text-base font-black text-gradient">AgendaPRO tudo junto</span>
                <div className="flex items-center gap-3">
                  <span
                    className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-md"
                    style={{
                      background: 'rgba(16,185,129,0.2)',
                      border: '1px solid rgba(16,185,129,0.4)',
                      color: '#34D399',
                    }}
                  >
                    -74%
                  </span>
                  <span className="text-base sm:text-lg font-black text-white">a partir de R$ 67/mês</span>
                </div>
              </div>
            </div>
          </SectionReveal>

          {/* ── Cards de plano ── */}
          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto items-start">

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

              {/* Preço + economia + breakdown */}
              <div className="mb-5 sm:mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-white">R$67</span>
                  <span className="text-slate-400 text-sm">/mês</span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-slate-500 text-xs line-through">R$97</span>
                  <span
                    className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md inline-flex items-center gap-1"
                    style={{
                      background: 'rgba(16,185,129,0.15)',
                      border: '1px solid rgba(16,185,129,0.4)',
                      color: '#34D399',
                    }}
                  >
                    <IconBolt size={10} strokeWidth={2.5} />
                    Economia R$360/ano
                  </span>
                </div>
                <p className="text-slate-500 text-[11px] mt-2 flex items-center gap-1.5">
                  <IconClock24 size={11} strokeWidth={2} />
                  R$2,23/dia — menos que um café
                </p>
              </div>

              {/* ROI inline */}
              <div
                className="rounded-xl px-3 py-2.5 mb-5 text-[11px] sm:text-xs"
                style={{
                  background: 'rgba(6,182,212,0.08)',
                  border: '1px solid rgba(6,182,212,0.25)',
                }}
              >
                <span className="text-slate-300">1 cliente da fila/semana = </span>
                <span className="text-white font-black">R$160/mês</span>
                <span className="text-slate-300">. AgendaPRO = R$67. </span>
                <span className="font-black" style={{ color: '#34D399' }}>Sobra R$93.</span>
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

              {/* Bônus de lançamento */}
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

              <Link
                href="/cadastro"
                className="btn btn-primary-v2 btn-shimmer w-full justify-center font-bold text-sm sm:text-base px-5 py-3.5 min-h-[48px]"
              >
                <span className="relative z-10">Pegar acesso gratuito</span>
              </Link>
            </div>

            {/* Equipe — DESTAQUE */}
            <div
              className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 relative lift-card md:scale-[1.03] md:origin-top"
              style={{
                background: 'linear-gradient(180deg, rgba(139,92,246,0.12) 0%, rgba(8,11,24,0.85) 50%, rgba(8,11,24,0.95) 100%)',
                border: '1px solid rgba(139,92,246,0.45)',
                boxShadow: '0 25px 80px rgba(139,92,246,0.3), 0 0 0 1px rgba(139,92,246,0.1), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              {/* Brilho de canto */}
              <div
                className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-40 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(139,92,246,0.5), transparent 70%)',
                  filter: 'blur(40px)',
                }}
                aria-hidden
              />

              <div className="absolute -top-3 left-1/2 -translate-x-1/2 pill-glow text-[10px] sm:text-xs whitespace-nowrap">
                <IconStar size={10} className="text-amber-300" /> MAIS POPULAR
              </div>

              <div className="flex items-start justify-between mb-5 mt-2 relative z-10">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white mb-1">Equipe</h3>
                  <p className="text-slate-400 text-xs sm:text-sm">3 a 5 cadeiras</p>
                </div>
                <div className="text-violet-400">
                  <IconChair size={28} />
                </div>
              </div>

              {/* Preço + economia + breakdown */}
              <div className="mb-5 sm:mb-6 relative z-10">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-gradient">R$107</span>
                  <span className="text-slate-400 text-sm">/mês</span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-slate-500 text-xs line-through">R$147</span>
                  <span
                    className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md inline-flex items-center gap-1"
                    style={{
                      background: 'rgba(16,185,129,0.15)',
                      border: '1px solid rgba(16,185,129,0.4)',
                      color: '#34D399',
                    }}
                  >
                    <IconBolt size={10} strokeWidth={2.5} />
                    Economia R$480/ano
                  </span>
                </div>
                <p className="text-slate-500 text-[11px] mt-2 flex items-center gap-1.5">
                  <IconClock24 size={11} strokeWidth={2} />
                  R$3,57/dia — por barbeiro sai R$0,71/dia
                </p>
              </div>

              {/* ROI inline */}
              <div
                className="rounded-xl px-3 py-2.5 mb-5 text-[11px] sm:text-xs relative z-10"
                style={{
                  background: 'rgba(139,92,246,0.1)',
                  border: '1px solid rgba(139,92,246,0.3)',
                }}
              >
                <span className="text-slate-300">5 barbeiros x 1 fila/semana = </span>
                <span className="text-white font-black">R$800/mês</span>
                <span className="text-slate-300">. Plano = R$107. </span>
                <span className="font-black" style={{ color: '#34D399' }}>Sobra R$693.</span>
              </div>

              <ul className="space-y-2.5 mb-6 text-xs sm:text-sm text-slate-300 relative z-10">
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

              <div className="relative z-10">
                <Link
                  href="/cadastro"
                  className="btn btn-primary-v2 btn-shimmer w-full justify-center font-bold text-sm sm:text-base px-5 py-3.5 min-h-[48px]"
                >
                  <span className="relative z-10">Pegar acesso gratuito</span>
                </Link>
              </div>
            </div>
          </SectionReveal>

          {/* ── Selo de garantia ── */}
          <SectionReveal className="max-w-2xl mx-auto mt-8 sm:mt-10">
            <div
              className="flex items-center gap-4 px-5 py-4 rounded-2xl"
              style={{
                background: 'rgba(16,185,129,0.06)',
                border: '1px solid rgba(16,185,129,0.25)',
              }}
            >
              {/* Shield SVG */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.15))',
                  border: '1px solid rgba(16,185,129,0.35)',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-sm sm:text-base mb-0.5">Zero risco pra testar</div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <IconCheck size={11} strokeWidth={3} className="text-emerald-400" />
                    14 dias grátis
                  </span>
                  <span className="flex items-center gap-1">
                    <IconCheck size={11} strokeWidth={3} className="text-emerald-400" />
                    Sem cartão no cadastro
                  </span>
                  <span className="flex items-center gap-1">
                    <IconCheck size={11} strokeWidth={3} className="text-emerald-400" />
                    Cancela em 1 clique
                  </span>
                  <span className="flex items-center gap-1">
                    <IconCheck size={11} strokeWidth={3} className="text-emerald-400" />
                    Seus dados ficam seus
                  </span>
                </div>
              </div>
            </div>
          </SectionReveal>

        </div>
      </section>

      {/* ═══════════ 9. FAQ ═══════════ */}
      <section id="faq" className="relative py-16 sm:py-20 lg:py-28">
        <div className="container max-w-3xl px-4">
          <SectionReveal className="text-center mb-10 sm:mb-12">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <span style={{ color: '#3B82F6' }}>●</span>
              <span>Perguntas frequentes</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Tudo que você precisa saber <span className="text-gradient">antes de começar.</span>
            </h2>
          </SectionReveal>

          <SectionReveal>
            <FAQ items={BARBER_FAQS} />
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 10. CTA FINAL ═══════════ */}
      <section className="relative py-20 sm:py-28 lg:py-32 overflow-hidden">
        {/* Background glow forte */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(6,182,212,0.32) 0%, transparent 60%)'
          }} />
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse 50% 40% at 50% 40%, rgba(59,130,246,0.2) 0%, transparent 60%)'
          }} />
        </div>

        <div className="container relative max-w-4xl px-4">
          <SectionReveal className="text-center">
            {/* Pill urgência */}
            <div className="pill-glow mb-5 sm:mb-6 animate-pulse-glow inline-flex items-center gap-2 text-xs sm:text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Preço de lançamento — por tempo limitado</span>
            </div>

            {/* Headline visceral */}
            <h2 className="text-white font-black mb-5 sm:mb-6 leading-[1.05]" style={{ fontSize: 'clamp(2rem, 7vw, 4rem)' }}>
              Enquanto você lê isso,<br />
              alguém pesquisou<br />
              <span className="text-gradient">&quot;barbearia perto de mim&quot;</span><br />
              e agendou com outro.
            </h2>

            <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
              5 minutos de setup. Link na bio. Amanhã de manhã você acorda com a agenda cheia — e não precisou responder um WhatsApp sequer.
            </p>
          </SectionReveal>

          {/* Mini-UI prova — o que tá acontecendo AGORA no AgendaPRO */}
          <SectionReveal className="mb-10 sm:mb-12 max-w-md mx-auto">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(8,11,24,0.8)',
                border: '1px solid rgba(59,130,246,0.3)',
                boxShadow: '0 20px 60px rgba(59,130,246,0.2)',
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-2 border-b text-[10px]"
                style={{ borderColor: 'rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.06)' }}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-white font-bold">SmartAgenda</span>
                </span>
                <span className="text-slate-500">agora mesmo</span>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
                  <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#06B6D4', boxShadow: '0 0 8px rgba(6,182,212,0.5)' }}>
                    <IconContacts size={11} strokeWidth={2.4} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] text-white font-bold">23:47</span>
                    <span className="text-[10px] text-slate-400"> — Lucas agendou corte + barba pra amanhã 09h</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#10B981', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }}>
                    <IconCheck size={11} strokeWidth={3} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] text-white font-bold">23:47</span>
                    <span className="text-[10px] text-slate-400"> — Confirmação automática enviada</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#8B5CF6', boxShadow: '0 0 8px rgba(139,92,246,0.5)' }}>
                    <IconClock24 size={11} strokeWidth={2.4} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] text-white font-bold">23:47</span>
                    <span className="text-[10px] text-slate-400"> — Lembrete anti-falta programado pra amanhã 18h</span>
                  </div>
                </div>
              </div>
              <div
                className="px-4 py-2 text-[10px] text-center border-t"
                style={{ borderColor: 'rgba(59,130,246,0.15)', background: 'rgba(59,130,246,0.04)' }}
              >
                <span className="text-slate-400">Tudo isso aconteceu </span>
                <span className="text-white font-bold">enquanto o dono dormia.</span>
              </div>
            </div>
          </SectionReveal>

          {/* Objection stompers — 4 chips matando as últimas dúvidas */}
          <SectionReveal className="flex flex-wrap justify-center gap-2.5 sm:gap-3 mb-10 sm:mb-12">
            {[
              { ico: <IconCheck size={12} strokeWidth={3} />, t: 'Sem cartão pra testar' },
              { ico: <IconClock24 size={12} strokeWidth={2.2} />, t: '5 minutos pra configurar' },
              { ico: <IconCash size={12} strokeWidth={2.2} />, t: 'R$2,23/dia depois' },
              { ico: <IconBolt size={12} strokeWidth={2.4} />, t: 'Cancela em 1 clique' },
            ].map((c) => (
              <span
                key={c.t}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold"
                style={{
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.25)',
                  color: '#6EE7B7',
                }}
              >
                <span className="text-emerald-400">{c.ico}</span>
                {c.t}
              </span>
            ))}
          </SectionReveal>

          {/* CTA matador */}
          <SectionReveal className="text-center">
            <Link
              href="/cadastro"
              className="btn btn-primary-v2 btn-shimmer inline-flex font-black text-base sm:text-lg px-8 py-4 sm:py-5 min-h-[56px]"
              style={{
                boxShadow: '0 0 40px rgba(59,130,246,0.5), 0 0 80px rgba(6,182,212,0.3)',
              }}
            >
              <span className="relative z-10 flex items-center gap-2">
                Quero minha SmartAgenda agora
                <IconArrowRight size={20} />
              </span>
            </Link>
            <p className="text-slate-400 text-xs sm:text-sm mt-4 sm:mt-5 max-w-md mx-auto">
              14 dias grátis. Depois R$67/mês no plano Solo.<br />
              <span className="text-slate-500">Suporte direto com a Impulso Digital pelo WhatsApp.</span>
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
              <a
                href="https://impulsodigital063.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors mt-1"
              >
                Um produto
                <span className="font-semibold text-slate-400">Impulso Digital</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
              </a>
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

          {/* Selos de segurança */}
          <div
            className="pt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6"
            style={{ borderTop: '1px solid var(--glass-border)' }}
          >
            {/* LGPD */}
            <div className="flex items-center gap-1.5 text-slate-500">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">LGPD</span>
            </div>

            {/* SSL */}
            <div className="flex items-center gap-1.5 text-slate-500">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">SSL 256-bit</span>
            </div>

            {/* Dados protegidos */}
            <div className="flex items-center gap-1.5 text-slate-500">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <rect x="9" y="10" width="6" height="5" rx="1" />
                <path d="M10.5 10V8.5a1.5 1.5 0 0 1 3 0V10" />
              </svg>
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">Dados protegidos</span>
            </div>

            {/* Pagamento seguro */}
            <div className="flex items-center gap-1.5 text-slate-500">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
                <polyline points="15 16 17 18 21 14" />
              </svg>
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">Pagamento seguro</span>
            </div>

            {/* Empresa brasileira */}
            <div className="flex items-center gap-1.5 text-slate-500">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <polygon points="12 8 14 11.5 10 11.5" fill="currentColor" opacity="0.5" />
                <circle cx="12" cy="11" r="3" fill="none" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">Empresa brasileira</span>
            </div>
          </div>

          {/* Bottom: copy */}
          <div
            className="pt-5 mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] sm:text-xs text-slate-500"
            style={{ borderTop: '1px solid var(--glass-border)' }}
          >
            <span>© 2025 AgendaPRO · by Impulso Digital · CNPJ 64.585.949/0001-83 · Palmas, TO</span>
            <div className="flex items-center gap-4">
              <Link href="/privacidade" className="hover:text-white transition-colors">Política de Privacidade</Link>
              <span>·</span>
              <Link href="/termos" className="hover:text-white transition-colors">Termos de Uso</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Social proof toast — 1:15 min e 3min depois */}
      <SocialProofToast />
    </main>
  )
}
