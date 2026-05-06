import type { Metadata } from 'next'
import Link from 'next/link'
import FAQ from '@/components/FAQ'

export const metadata: Metadata = {
  title: 'AgendaPRO para Salões de Beleza — Agenda Online com Lembrete Automático',
  description: 'Sistema de agendamento online para salões. Cada profissional com agenda própria, lembrete por e-mail, fila de espera e comissão automática. A partir de R$67/mês, sem setup. Garantia de 7 dias.',
  openGraph: {
    title: 'AgendaPRO para Salões de Beleza',
    description: 'Agenda online para salão. Lembrete automático, fila de espera, comissão por profissional e Google Reviews integrado.',
  },
}
import type { FAQItem } from '@/components/FAQ'
import Image from 'next/image'
import IPhoneMockup from '@/components/IPhoneMockup'
import FinanceDashboard from '@/components/lp/FinanceDashboard'
import ComparisonMiniUIs from '@/components/ComparisonMiniUIs'
import PricingModalidades from '@/components/lp/PricingModalidades'
import ComparativoConcorrentes from '@/components/lp/ComparativoConcorrentes'
import OnboardingSteps from '@/components/OnboardingSteps'
import SocialProofToast from '@/components/SocialProofToast'
import { AnimatedGradient, SectionReveal } from '@/components/ui'
import {
  IconHairDryer,
  IconMirror,
  IconBrush,
  IconCalendarHeart,
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
  IconChair,
  IconMail,
} from '@/components/BarberIcons'

/* ═══════════════════════════════════════════════════════════
   LP SALÃO DE BELEZA — SmartAgenda
   Persona: dona de salão, 28-50, 2-8 profissionais.
   Dores: agenda de equipe no papel, comissão na planilha,
   cliente que marca e não vem (ticket R$80-150).
═══════════════════════════════════════════════════════════ */

const DORES = [
  {
    titulo: 'Agenda de 5 pessoas num caderno só',
    detalhe: 'Cabeleireira marcou no mesmo horário que a manicure. Cliente chegou e não tinha quem atender. Você pede desculpa, remarca, perde a confiança.',
    accent: '#EC4899',
    stat: '3x',
    statLabel: 'mais conflitos',
  },
  {
    titulo: 'Cliente marcou e não veio',
    detalhe: 'Escova R$120, reservou 1h30 de agenda. Não apareceu, não avisou. Profissional ficou parada. Você perdeu o horário e o dinheiro.',
    accent: '#8B5CF6',
    stat: 'R$120',
    statLabel: 'perdidos/falta',
  },
  {
    titulo: 'Comissão no papel no fim do mês',
    detalhe: 'Quem fez quanto? Qual porcentagem de cada uma? Fecha na mão, erra, profissional reclama. Todo mês a mesma dor de cabeça.',
    accent: '#06B6D4',
    stat: '4h+',
    statLabel: 'por fechamento',
  },
]

const MOTORES = [
  { Icon: IconBrain,   tag: 'Atendimento',   titulo: 'Lembra a cliente sem você pedir',   desc: 'Lembrete automático por e-mail na véspera e 1h antes. Cliente confirma ou avisa que não vem. Agenda do dia fica limpa, sem surpresa.', color: '#06B6D4', stat: '-50%',  statLabel: 'faltas' },
  { Icon: IconTrophy,  tag: 'Ranking',        titulo: 'Google cheio de 5 estrelas',        desc: 'Depois do atendimento, cliente ganha pontos pra avaliar no Google. Sua nota sobe e o Maps mostra seu salão primeiro.',  color: '#F59E0B', stat: '+0.6',  statLabel: 'nota/mês' },
  { Icon: IconLink,    tag: 'Indicação',      titulo: 'Cliente traz a amiga',              desc: 'Cada cliente recebe link de indicação. Quando a amiga agenda, as duas ganham pontos. Boca a boca rastreado.',          color: '#8B5CF6', stat: 'x2.3',  statLabel: 'clientes' },
  { Icon: IconBolt,    tag: 'Fila de espera',  titulo: 'Cancelou? Vaga preenchida',         desc: 'Cliente cancelou a escova de sexta? O sistema avisa as próximas da fila. Quem aceitar primeiro fica com o horário.',  color: '#A78BFA', stat: '3 min', statLabel: 'pra preencher' },
  { Icon: IconGift,    tag: 'Reativação',      titulo: 'Cliente sumida volta sozinha',      desc: 'Sua VIP ficou 60+ dias sem aparecer? O sistema detecta e dispara cupom no WhatsApp. Cliente reativada vale R$ 600-2.000 em LTV — ninguém mais entrega.', color: '#10B981', stat: 'R$1.4k', statLabel: 'LTV recuperado' },
]

const TIMELINE = [
  { hora: '07:30', titulo: 'Você abre o salão com a agenda pronta',       detalhe: 'Ana marcou coloração às 23h pelo link na bio. A SmartAgenda confirmou sozinha e mandou lembrete.' },
  { hora: '10:00', titulo: 'Juliana cancelou — fila resolveu',             detalhe: 'Cancelou a escova de R$120? O sistema chamou Carla da fila. Ela aceitou em 4 minutos.' },
  { hora: '15:00', titulo: 'Mariana completou 10 visitas',                 detalhe: 'Programa de fidelidade: 10 procedimentos, 1 de bônus. Ela compartilhou o link. 3 amigas já agendaram.' },
  { hora: '20:00', titulo: 'Salão fecha com tudo calculado',               detalhe: 'R$1.840 no caixa. Comissão de cada profissional pronta. 4 avaliações 5 estrelas novas no Google.' },
]

/* ═══ FAQs — Salão ═══ */

const SALAO_FAQS: FAQItem[] = [
  {
    q: 'Como funciona a garantia?',
    a: '7 dias de garantia após o pagamento. Se não fizer sentido pro seu salão, devolvo sem burocracia. Sem trial pré-pago — você paga, testa com cliente real e decide.',
  },
  {
    q: 'Quanto custa?',
    a: 'Solo R$ 67/mês (admin + 1 colaborador) ou Equipe R$ 97/mês (até 5 profissionais). Sem setup, sempre · preço fixo. Sem fidelidade, garantia de 7 dias.',
  },
  {
    q: 'Como funciona o pagamento? Quais formas de pagar?',
    a: '4 jeitos: (1) Cartão automático todo mês — você não precisa lembrar. (2) PIX mensal — a gente avisa 3 dias antes. (3) Semestral à vista no PIX — Solo R$ 350 (economiza R$ 52) ou Equipe R$ 500 (economiza R$ 82). (4) Anual à vista no PIX — Solo R$ 670 ou Equipe R$ 970 (~17% off, equivale a 2 meses grátis). No cadastro você escolhe.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim. Sem multa, sem fidelidade, sem contrato. Cancela pelo painel ou WhatsApp. Se voltar depois, seus dados continuam lá.',
  },
  {
    q: 'Minha cliente precisa baixar app?',
    a: 'Não. Ela clica no link, escolhe profissional, serviço e horário — tudo no navegador. Sem cadastro, sem download. Por isso a taxa de agendamento é alta.',
  },
  {
    q: 'Cada profissional tem agenda separada?',
    a: 'Sim. Cabeleireira, manicure, maquiadora — cada uma com seus horários e serviços. A cliente escolhe com quem quer. Você vê tudo no painel.',
  },
  {
    q: 'Como funciona a comissão?',
    a: 'Você define a porcentagem de cada profissional. O sistema calcula automaticamente: produção, porcentagem, valor a pagar. Fim do mês, abre o painel e tá tudo lá.',
  },
  {
    q: 'E o WhatsApp? Perco clientes que me chamam lá?',
    a: 'Não. O AgendaPRO complementa o WhatsApp. Quem te chama pelo Zap, você cadastra em 5 segundos. Quem vê o link na bio ou no Google, agenda sozinha sem te interromper.',
  },
  {
    q: 'E se a profissional estiver de folga?',
    a: 'Bloqueia o dia ou horário dela no painel. Nenhuma cliente consegue agendar com ela nesse período. Um clique.',
  },
  {
    q: 'Como funciona o lembrete?',
    a: 'O sistema envia lembretes automáticos por e-mail: um na véspera e outro 1 hora antes do horário. Reduz faltas em até 50%. Usamos e-mail em vez de WhatsApp pra proteger seu número — sem risco de bloqueio por disparo em massa.',
  },
  {
    q: 'É difícil de configurar?',
    a: 'Nome do salão, profissionais, serviços e horários. Preenche um form, 5 minutos e a página tá no ar. Se sabe usar WhatsApp, sabe usar o AgendaPRO.',
  },
  {
    q: 'Funciona pelo celular?',
    a: '100%. Painel, agenda, financeiro, bloqueio de horário — tudo no celular. Computador é opcional.',
  },
  {
    q: 'Já uso Trinks/Avec. Por que trocar?',
    a: 'Eles são agenda online. O AgendaPRO é SmartAgenda: fila de espera automática, fidelidade com pontos, indicação rastreada e Google Reviews integrado. Nenhum faz as 4 coisas. E custa menos.',
  },
  {
    q: 'Quem dá suporte?',
    a: 'Equipe da Impulso Digital pelo WhatsApp. Sem robô, sem fila de ticket. Gente de verdade que entende do produto.',
  },
]

/* CTA inline reusável */
function CTAInline({ titulo, sub }: { titulo: string; sub: string }) {
  return (
    <div className="container max-w-4xl px-4 my-6 sm:my-10">
      <div
        className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-7 flex flex-col sm:flex-row items-center sm:justify-between gap-4 lift-card"
        style={{
          background: 'linear-gradient(135deg, rgba(236,72,153,0.12) 0%, rgba(139,92,246,0.08) 100%)',
          border: '1px solid rgba(236,72,153,0.25)',
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
            Começar agora
            <IconArrowRight size={18} />
          </span>
        </Link>
      </div>
    </div>
  )
}

/* ═══ Mini-UIs da seção DOR — Salão ═══ */

function DorAgendaConflito() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #F1F3F4', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div className="px-3 py-2 flex items-center justify-between" style={{ background: '#F8F9FA', borderBottom: '1px solid #F1F3F4' }}>
        <div className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span className="text-[10px] font-semibold text-[#202124]">Sexta — 12 de abril</span>
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white" style={{ background: '#D93025' }}>2 conflitos</span>
      </div>
      <div className="p-2 space-y-1">
        {[
          { hora: '09:00', prof: 'Ana', serv: 'Coloração', status: 'ok', color: '#F0FDF4' },
          { hora: '10:00', prof: 'Ana', serv: 'Escova', status: 'conflito', color: '#FEF2F2' },
          { hora: '10:00', prof: 'Ana', serv: 'Corte feminino', status: 'conflito', color: '#FEF2F2' },
          { hora: '14:00', prof: 'Bia', serv: 'Manicure', status: 'ok', color: '#F0FDF4' },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px]" style={{ background: s.color }}>
            <span className="font-mono font-bold text-[#5F6368] w-8">{s.hora}</span>
            <span className="font-medium text-[#202124] flex-1">{s.prof} — {s.serv}</span>
            {s.status === 'conflito' ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#D93025" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#188038" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            )}
          </div>
        ))}
      </div>
      <div className="px-3 py-2 text-[9px] text-[#D93025] font-medium flex items-center gap-1" style={{ background: '#FEF2F2', borderTop: '1px solid #FECDD3' }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        2 clientes no mesmo horário. Alguém vai embora.
      </div>
    </div>
  )
}

function DorClienteFaltou() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #F1F3F4', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div className="px-3 py-2 flex items-center justify-between" style={{ background: '#F8F9FA', borderBottom: '1px solid #F1F3F4' }}>
        <span className="text-[10px] font-semibold text-[#202124]">Agendamento #247</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#FEF2F2', color: '#D93025' }}>Faltou</span>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#EC4899' }}>M</div>
          <div>
            <div className="text-[11px] font-medium text-[#202124]">Marina Santos</div>
            <div className="text-[9px] text-[#9AA0A6]">Escova progressiva · 1h30 · R$180</div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-[#9AA0A6]">Profissional:</span>
          <span className="text-[#202124] font-medium">Ana Paula</span>
        </div>
        <div className="rounded-lg p-2 flex items-center justify-between" style={{ background: '#FEF2F2' }}>
          <span className="text-[10px] text-[#D93025]">1h30 de agenda perdida</span>
          <span className="text-[10px] font-bold text-[#D93025]">-R$180</span>
        </div>
      </div>
      <div className="px-3 py-2 text-[9px] text-[#D93025] font-medium" style={{ background: '#FEF2F2', borderTop: '1px solid #FECDD3' }}>
        Sem lembrete. Sem fila. Horário virou prejuízo.
      </div>
    </div>
  )
}

function DorComissaoPlanilha() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #F1F3F4', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div className="px-3 py-2 flex items-center justify-between" style={{ background: '#F8F9FA', borderBottom: '1px solid #F1F3F4' }}>
        <span className="text-[10px] font-semibold text-[#202124]">Fechamento — Março</span>
        <span className="text-[9px] text-[#9AA0A6]">manual</span>
      </div>
      <div className="p-2">
        <div className="flex items-center gap-2 px-2 py-1 text-[9px] font-medium text-[#9AA0A6]">
          <span className="flex-1">Profissional</span>
          <span className="w-14 text-right">Produção</span>
          <span className="w-6 text-center">%</span>
          <span className="w-14 text-right">A pagar</span>
        </div>
        {[
          { nome: 'Ana Paula', init: 'A', color: '#EC4899', prod: 'R$ 3.200', pct: '40%', pagar: 'R$ 1.280' },
          { nome: 'Bia',       init: 'B', color: '#8B5CF6', prod: 'R$ 2.100', pct: '35%', pagar: 'R$ 735' },
          { nome: 'Carla',     init: 'C', color: '#06B6D4', prod: 'R$ 1.800', pct: '40%', pagar: 'R$ ???' },
        ].map((p, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: i % 2 === 0 ? '#F9FAFB' : '#fff' }}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: p.color }}>
              <span className="text-[8px] font-bold text-white">{p.init}</span>
            </div>
            <span className="flex-1 text-[10px] font-medium text-[#202124] truncate">{p.nome}</span>
            <span className="w-14 text-right text-[10px] text-[#202124]">{p.prod}</span>
            <span className="w-6 text-center text-[9px] text-[#9AA0A6]">{p.pct}</span>
            <span className={`w-14 text-right text-[10px] font-bold ${p.pagar.includes('???') ? 'text-[#D93025]' : 'text-[#202124]'}`}>{p.pagar}</span>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 text-[9px] text-[#D93025] font-medium" style={{ background: '#FEF2F2', borderTop: '1px solid #FECDD3' }}>
        Conta de cabeça. Carla sem conferir. Profissional vai reclamar.
      </div>
    </div>
  )
}

export default function SalaoPage() {
  return (
    <main className="relative overflow-hidden" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* Announcement bar */}
      <div
        className="relative text-center text-[12px] sm:text-sm font-semibold text-white px-4 py-2.5 flex items-center justify-center gap-2"
        style={{
          background: 'linear-gradient(90deg, #831843 0%, #EC4899 50%, #8B5CF6 100%)',
          backgroundSize: '200% 100%',
          animation: 'gradient-flow 10s linear infinite',
        }}
      >
        <IconHairDryer size={14} className="flex-shrink-0" />
        <span>Solo R$67/mês ou Equipe R$97/mês — <strong>sem setup, sem fidelidade</strong>. Garantia de 7 dias.</span>
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-50" style={{ background: 'rgba(5, 7, 19, 0.75)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--glass-border)' }}>
        <div className="container px-4 flex items-center justify-between h-14 sm:h-16">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-agendapro-dark.svg" alt="AgendaPRO" className="h-7 sm:h-8" />
            <span
              className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
              style={{ background: 'rgba(236,72,153,0.15)', color: '#EC4899', border: '1px solid rgba(236,72,153,0.3)' }}
            >
              <IconHairDryer size={10} /> Salão
            </span>
          </Link>
          <Link
            href="/cadastro"
            className="btn btn-primary-v2 btn-shimmer text-[11px] sm:text-[13px] font-bold px-2.5 sm:px-3.5 py-1.5 sm:py-2 min-h-[32px] sm:min-h-[36px] whitespace-nowrap inline-flex items-center"
          >
            <span className="relative z-10 flex items-center gap-1">
              <span className="hidden sm:inline">Começar agora</span>
              <span className="sm:hidden">Começar</span>
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

            <SectionReveal className="flex flex-col items-center lg:items-start text-center lg:text-left gap-5 sm:gap-6 lg:gap-7">
              {/* Pill — preço fixo, sem fidelidade */}
              <div className="pill inline-flex items-center gap-2 text-[10px] sm:text-xs">
                <span
                  className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black"
                  style={{ background: 'linear-gradient(135deg, #EC4899, #F472B6)', color: '#fff', letterSpacing: '0.05em' }}
                >
                  R$ 67
                </span>
                <span className="text-white/95 font-bold uppercase tracking-wider">Sem setup · Sem fidelidade</span>
              </div>

              {/* H1 — perda específica do salão */}
              <h1 className="text-white font-black leading-[1.05] tracking-tight" style={{ fontSize: 'clamp(2.2rem, 7vw, 4.5rem)' }}>
                Seu salão deixa<br />
                <span style={{ color: '#F59E0B' }}>R$ 1.800</span> na mesa{' '}<br className="hidden sm:block" />todo mês.
              </h1>

              {/* Subhead — solução em fluxo, sem listão */}
              <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed">
                O AgendaPRO bota sua equipe em agendas separadas, lembra a cliente antes do serviço e calcula comissão sozinho. Cancelou a escova de R$ 120? <strong className="text-white">A fila preenche em 3 minutos — e o dinheiro volta pro caixa.</strong>
              </p>

              {/* Stats — financeiro / equipe / reputação */}
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0" style={{ background: 'rgba(16,185,129,0.18)', color: '#10B981' }}>
                    <IconCash size={14} />
                  </span>
                  <span className="text-left text-[12px] sm:text-[13px] leading-tight">
                    <strong className="text-white">+R$ 1.800/mês</strong>
                    <span className="text-slate-500 hidden sm:inline"> · fila + lembrete</span>
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.25)' }}>
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0" style={{ background: 'rgba(236,72,153,0.18)', color: '#EC4899' }}>
                    <IconContacts size={14} />
                  </span>
                  <span className="text-left text-[12px] sm:text-[13px] leading-tight">
                    <strong className="text-white">5 agendas separadas</strong>
                    <span className="text-slate-500 hidden sm:inline"> · zero conflito</span>
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(251,188,4,0.08)', border: '1px solid rgba(251,188,4,0.25)' }}>
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0" style={{ background: 'rgba(251,188,4,0.18)', color: '#FBBC04' }}>
                    <IconStar size={14} />
                  </span>
                  <span className="text-left text-[12px] sm:text-[13px] leading-tight">
                    <strong className="text-white">4.9 no Google</strong>
                    <span className="text-slate-500 hidden sm:inline"> · após cada atendimento</span>
                  </span>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                <Link href="/cadastro" className="btn btn-primary-v2 btn-shimmer w-full sm:w-auto justify-center font-black text-base px-6 py-4 min-h-[52px]">
                  <span className="relative z-10 flex items-center gap-2">Garantir minha vaga<IconArrowRight size={20} /></span>
                </Link>
                <a href="#dor" className="btn btn-ghost w-full sm:w-auto justify-center font-semibold text-base px-6 py-4 min-h-[52px]">Ver como funciona</a>
              </div>

              {/* Ancoragem mercado */}
              <p className="text-xs sm:text-sm text-slate-400 max-w-md">
                A partir de R$ 67/mês · Cancela quando quiser · Garantia 7 dias.{' '}
                <span className="text-slate-500">
                  Trinks/Avec cobram R$ 200-500 com fidelidade anual — aqui é livre.
                </span>
              </p>
            </SectionReveal>

            <SectionReveal className="flex justify-center lg:justify-end mt-4 lg:mt-0">
              <div className="relative">
                <IPhoneMockup variant="salao" />
              </div>
            </SectionReveal>

          </div>
        </div>
      </section>

      {/* ═══════════ 1.5 GENTE REAL — cabeleireira atendendo cliente ═══════════ */}
      <section className="relative overflow-hidden">
        <div className="container px-4 py-10 sm:py-14">
          <SectionReveal>
            <div
              className="relative rounded-3xl overflow-hidden"
              style={{
                border: '1px solid rgba(168,85,247,0.18)',
                boxShadow: '0 30px 80px -30px rgba(168,85,247,0.35)',
              }}
            >
              <div className="grid md:grid-cols-2 items-stretch min-h-[320px] md:min-h-[420px]">
                <div className="relative h-64 md:h-auto">
                  <Image
                    src="/images/lp/salao.jpg"
                    alt="Cabeleireira penteando cliente em salão de beleza"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    priority
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(168,85,247,0.18) 0%, transparent 60%)',
                    }}
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none md:hidden"
                    style={{
                      background:
                        'linear-gradient(180deg, transparent 50%, rgba(5,7,19,0.85) 100%)',
                    }}
                  />
                </div>

                <div
                  className="relative p-6 sm:p-8 md:p-10 flex flex-col justify-center"
                  style={{
                    background:
                      'linear-gradient(135deg, #1e0820 0%, #100416 60%, #050208 100%)',
                  }}
                >
                  <div
                    className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-[10px] font-black tracking-[0.18em] uppercase mb-4 self-start"
                    style={{
                      background: 'rgba(168,85,247,0.12)',
                      border: '1px solid rgba(168,85,247,0.3)',
                      color: '#A855F7',
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#A855F7' }} />
                    Feito pra salão
                  </div>

                  <h2 className="text-white font-black mb-3 leading-tight" style={{ fontSize: 'clamp(1.4rem, 4vw, 2.2rem)' }}>
                    Sua cliente VIP<br />
                    <span style={{ color: '#A855F7' }}>fiel e indicando</span>.
                  </h2>

                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-5">
                    Salão prospera com cliente que volta e indica. O AgendaPRO premia quem indica, dá pontos a cada serviço e mostra quem está há tempo demais sem aparecer — pra você reconquistar antes de perder.
                  </p>

                  <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-2">
                    {[
                      { kpi: '+5', label: 'Indicações por VIP' },
                      { kpi: '14m', label: 'Cliente recorrente' },
                      { kpi: 'R$ 2.8k', label: 'LTV médio' },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="rounded-xl p-2 sm:p-2.5 text-center"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <div className="font-mono font-black text-base sm:text-lg leading-none" style={{ color: '#A855F7' }}>
                          {s.kpi}
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-slate-500 mt-1.5 leading-tight font-semibold uppercase tracking-wider">
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 2. DOR ═══════════ */}
      <section id="dor" className="relative py-16 sm:py-20 lg:py-28">
        <div className="container px-4">
          <SectionReveal className="text-center mb-10 sm:mb-14 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>Reconhece isso?</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Salão cheio <span className="text-gradient">não se faz</span> no improviso.
            </h2>
            <p className="text-base sm:text-lg text-slate-400">
              O problema não é falta de cliente. É controlar a agenda de todo mundo sem perder a cabeça.
            </p>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
            {DORES.map((d, i) => (
              <div key={d.titulo} className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-4 lift-card" style={{ border: `1px solid ${d.accent}30` }}>
                {i === 0 && <DorAgendaConflito />}
                {i === 1 && <DorClienteFaltou />}
                {i === 2 && <DorComissaoPlanilha />}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">{d.titulo}</h3>
                    <span className="px-2 py-1 rounded-lg text-[10px] font-black flex-shrink-0 ml-2" style={{ background: `${d.accent}15`, color: d.accent, border: `1px solid ${d.accent}30` }}>
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

      <CTAInline titulo="A SmartAgenda resolve tudo isso" sub="Setup em 5 minutos. Garantia de 7 dias. Sem fidelidade — cancela quando quiser." />

      {/* ═══════════ 3. MOTORES ═══════════ */}
      <section id="mecanismos" className="relative py-16 sm:py-20 lg:py-28">
        <div className="container px-4">
          <SectionReveal className="text-center mb-10 sm:mb-14 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconMirror size={14} className="text-pink-400" />
              <span>Os 5 motores da SmartAgenda</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Sistema que <span className="text-gradient">trabalha</span> enquanto você atende.
            </h2>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {MOTORES.map((m, i) => (
              <div
                key={m.titulo}
                className={`rounded-2xl sm:rounded-3xl p-5 sm:p-7 flex flex-col gap-3 lift-card relative overflow-hidden${i === MOTORES.length - 1 ? ' md:col-span-2' : ''}`}
                style={{ background: `linear-gradient(135deg, ${m.color}12 0%, rgba(8,11,24,0.8) 100%)`, border: `1px solid ${m.color}35`, boxShadow: `0 8px 30px ${m.color}10` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center icon-glow-hover flex-shrink-0" style={{ background: `${m.color}20`, border: `1px solid ${m.color}40`, color: m.color }}>
                      <m.Icon size={20} />
                    </div>
                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider" style={{ color: m.color }}>{m.tag}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xl sm:text-2xl font-black leading-none" style={{ color: m.color }}>{m.stat}</div>
                    <div className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{m.statLabel}</div>
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white">{m.titulo}</h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{m.desc}</p>

                {/* Mini-UI por motor */}
                <div className="mt-1">
                  {i === 0 && (
                    <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'rgba(8,11,24,0.6)', border: `1px solid ${m.color}25` }}>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#10B981' }}><IconMail size={11} strokeWidth={2} /></span>
                        <div className="flex-1 min-w-0"><span className="text-[10px] text-white font-bold">Lembrete por e-mail</span><span className="text-[9px] text-slate-500"> · ontem 18:00</span></div>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#06B6D4' }}><IconCheck size={11} strokeWidth={3} /></span>
                        <div className="flex-1 min-w-0"><span className="text-[10px] text-white font-bold">Marina respondeu SIM</span><span className="text-[9px] text-slate-500"> · 18:04</span></div>
                      </div>
                      <div className="text-[9px] text-slate-500 px-1 pt-0.5">Confirmado sem você tocar no celular</div>
                    </div>
                  )}
                  {i === 1 && (
                    <div className="rounded-xl p-3" style={{ background: 'rgba(8,11,24,0.6)', border: `1px solid ${m.color}25` }}>
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                          <IconTrophy size={16} className="text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold text-white">Studio Ana Paula</div>
                          <div className="text-[9px] text-slate-500">Google Maps · Centro</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mb-1.5">
                        {[1,2,3,4,5].map((s) => (<IconStar key={s} size={12} className={s <= 4 ? 'text-amber-400' : 'text-amber-400/50'} />))}
                        <span className="text-[11px] font-black text-white ml-1">4.9</span>
                        <span className="text-[9px] text-slate-500 ml-1">· 89 avaliações</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-emerald-400 font-bold">+5 avaliações essa semana</span>
                        <span className="text-slate-500">· automático</span>
                      </div>
                    </div>
                  )}
                  {i === 2 && (
                    <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'rgba(8,11,24,0.6)', border: `1px solid ${m.color}25` }}>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#8B5CF6' }}><IconLink size={11} strokeWidth={2.2} /></span>
                        <div className="flex-1 min-w-0"><span className="text-[10px] text-white font-bold">Juliana compartilhou o link</span></div>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#06B6D4' }}><IconContacts size={11} strokeWidth={2.2} /></span>
                        <div className="flex-1 min-w-0"><span className="text-[10px] text-white font-bold">Fernanda agendou pelo link</span><span className="text-[9px] text-slate-500"> · escova sex 15h</span></div>
                      </div>
                      <div className="flex items-center justify-between px-1 pt-0.5 text-[9px]">
                        <span className="text-violet-300 font-bold">+50pts Juliana · +50pts Fernanda</span>
                        <span className="text-slate-500">automático</span>
                      </div>
                    </div>
                  )}
                  {i === 3 && (
                    <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'rgba(8,11,24,0.6)', border: `1px solid ${m.color}25` }}>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.2)', color: '#F87171' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </span>
                        <div className="flex-1 min-w-0"><span className="text-[10px] text-red-400 line-through">15:00 — Juliana cancelou escova</span></div>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: `${m.color}10`, border: `1px solid ${m.color}25` }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: m.color }}><IconBolt size={11} strokeWidth={2.4} /></span>
                        <div className="flex-1 min-w-0"><span className="text-[10px] text-white font-bold">Fila acionada</span><span className="text-[9px] text-slate-500"> · 4 notificadas</span></div>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#10B981' }}><IconCheck size={11} strokeWidth={3} /></span>
                        <div className="flex-1 min-w-0"><span className="text-[10px] text-white font-bold">15:00 — Carla aceitou</span><span className="text-[9px] text-emerald-400 font-bold"> +R$120</span></div>
                      </div>
                      <div className="text-[9px] text-slate-500 px-1 pt-0.5">Vaga preenchida em <span className="text-white font-bold">4 minutos</span> · sem você fazer nada</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 3.5 COMPARAÇÃO (reposicionada — antes era seção 6) ═══════════ */}
      <section className="relative py-16 sm:py-20 lg:py-28">
        <div className="container max-w-6xl px-4">
          <SectionReveal className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconChair size={14} className="text-pink-400" />
              <span>AgendaPRO x Outros apps</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Outros apps <span className="text-slate-500">só agendam</span>.<br /><span className="text-gradient">AgendaPRO trabalha.</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Mesma tela por fora. Mundos diferentes por dentro. Olha o que acontece quando a cliente cancela.
            </p>
          </SectionReveal>
          <SectionReveal><ComparisonMiniUIs variant="salao" /></SectionReveal>
        </div>
      </section>

      {/* ═══════════ 3.6 COMPARATIVO FEATURES (reposicionado — antes era 6.5) ═══════════ */}
      <section className="relative py-16 sm:py-20 lg:py-24">
        <SectionReveal>
          <ComparativoConcorrentes accent="pink" concorrentes={['Trinks', 'Avec', 'ZenPlace']} />
        </SectionReveal>
      </section>

      {/* ═══════════ 4. CONTROLE FINANCEIRO ═══════════ */}
      <section className="relative py-16 sm:py-20 lg:py-28">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(236,72,153,0.12) 0%, transparent 60%)' }} />
        <div className="container relative px-4">
          <SectionReveal className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconCash size={14} className="text-emerald-400" />
              <span>Controle que você nunca teve</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Comissão de cada profissional.{' '}<span className="text-gradient">Sem planilha.</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
              Fim de mês no salão é sempre a mesma coisa: caderninho, planilha, conta de cabeça. Com a SmartAgenda, abre o painel e tá tudo lá.
            </p>
          </SectionReveal>

          <SectionReveal>
            <div className="grid lg:grid-cols-[1.15fr_1fr] gap-6 lg:gap-8 items-center max-w-5xl mx-auto">

              <FinanceDashboard variant="salao" />

              <div className="space-y-4 sm:space-y-5">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight">
                  Faturamento é fácil.{' '}<span className="text-gradient">Lucro líquido</span> separa o salão organizado do amador.
                </h3>
                <ul className="space-y-3 text-sm sm:text-base text-slate-300">
                  {[
                    { icon: <IconCash size={14} />, txt: 'Despesas categorizadas (aluguel, produtos, salários, energia) somadas automático — você sabe pra onde cada R$ vai.' },
                    { icon: <IconBrain size={14} strokeWidth={2} />, txt: 'Lucro líquido = receita − despesa, em tempo real. Não é só faturamento — é o que sobra.' },
                    { icon: <IconContacts size={14} strokeWidth={2} />, txt: 'Comissão por profissional calculada sozinha. Fim do mês: abre, vê, paga.' },
                    { icon: <IconCheck size={14} strokeWidth={2} />, txt: 'Projeção 30 dias: ao ritmo atual, você sabe quanto vai fechar antes do mês acabar.' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-lg inline-flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.3)', color: '#F472B6' }}>{item.icon}</span>
                      <span>{item.txt}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-slate-500 leading-relaxed">
                  <strong className="text-slate-300">Concorrente mostra só faturamento.</strong> Aqui você vê despesas categorizadas, lucro líquido e projeção do mês — nível Conta Azul, sem pagar Conta Azul.
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
              Seu salão no <span className="text-gradient">piloto automático</span>.
            </h2>
          </SectionReveal>

          <SectionReveal stagger className="space-y-4 sm:space-y-5 max-w-4xl mx-auto">
            {TIMELINE.map((t, i) => (
              <div key={t.hora} className="glass rounded-2xl p-4 sm:p-6 grid lg:grid-cols-[auto_1fr] gap-4 sm:gap-5 items-center lift-card">
                <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:text-left flex-shrink-0">
                  <div className="text-xl sm:text-2xl font-black text-gradient leading-none">{t.hora}</div>
                  <div className="text-[10px] text-slate-500 lg:mt-1">passo {i + 1}/4</div>
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm sm:text-base mb-1">{t.titulo}</h4>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{t.detalhe}</p>
                </div>
              </div>
            ))}
          </SectionReveal>
        </div>
      </section>

      <CTAInline titulo="Esse dia pode ser amanhã" sub="Cadastre hoje e veja a diferença ainda essa semana." />

      {/* ═══════════ 7. PASSOS ═══════════ */}
      <section className="relative py-16 sm:py-20 lg:py-28">
        <div className="container px-4">
          <SectionReveal className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconBolt size={14} className="text-emerald-400" />
              <span>3 passos · 5 minutos · zero técnico</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Em 5 minutos no ar. <span className="text-gradient">Sua VIP recebe o link essa tarde.</span>
            </h2>
          </SectionReveal>
          <SectionReveal><OnboardingSteps variant="salao" /></SectionReveal>
        </div>
      </section>

      {/* ═══════════ 8. PRICING ═══════════ */}
      <section id="precos" className="relative py-10 sm:py-14 lg:py-20">
        <div className="container px-4">
          <SectionReveal className="text-center mb-8 sm:mb-10 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconCash size={14} className="text-blue-400" />
              <span>Planos pra salão</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Menos que <span className="text-gradient">uma escova</span> por mês.
            </h2>
            <p className="text-base sm:text-lg text-slate-400">
              Se 1 cliente da fila voltar essa semana, a SmartAgenda já se pagou.
            </p>
          </SectionReveal>

          <SectionReveal className="flex justify-center mb-8 sm:mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] sm:text-xs font-bold" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(251,191,36,0.08))', border: '1px solid rgba(245,158,11,0.45)', color: '#FDE68A', boxShadow: '0 0 20px rgba(245,158,11,0.2)' }}>
              <IconSparkle size={13} className="text-amber-300" />
              <span>Preço de lançamento travado vitalício — quem entra agora paga sempre isso</span>
            </div>
          </SectionReveal>

          {/* Âncora de valor */}
          <SectionReveal className="max-w-3xl mx-auto mb-8 sm:mb-10">
            <div className="glass rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(8,11,24,0.8) 100%)' }}>
              <div className="px-4 sm:px-6 py-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 border-b" style={{ borderColor: 'var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>Se fosse comprar separado</div>
              <div className="px-4 sm:px-6 py-3 space-y-2">
                {[
                  { item: 'Agenda online (Trinks, Avec)', price: 'R$ 89/mês' },
                  { item: 'Programa de fidelidade com pontos', price: 'R$ 49/mês' },
                  { item: 'Sistema de indicação entre clientes', price: 'R$ 79/mês' },
                  { item: 'Gestão de avaliações Google Reviews', price: 'R$ 39/mês' },
                ].map((v) => (
                  <div key={v.item} className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-400">{v.item}</span>
                    <span className="text-slate-500 line-through font-mono text-xs">{v.price}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t" style={{ borderColor: 'rgba(59,130,246,0.25)', background: 'linear-gradient(90deg, rgba(59,130,246,0.08), rgba(6,182,212,0.08))' }}>
                <span className="text-sm sm:text-base font-black text-white">Total separado</span>
                <span className="text-sm sm:text-base font-black text-white line-through">R$ 256/mês</span>
              </div>
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t" style={{ borderColor: 'rgba(16,185,129,0.3)', background: 'linear-gradient(90deg, rgba(16,185,129,0.1), rgba(6,182,212,0.08))' }}>
                <span className="text-sm sm:text-base font-black text-gradient">AgendaPRO tudo junto</span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-md" style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#34D399' }}>-74%</span>
                  <span className="text-base sm:text-lg font-black text-white">a partir de R$ 67/mês</span>
                </div>
              </div>
            </div>
          </SectionReveal>

          {/* 4 modalidades de pagamento (cartão + 3 PIX) */}
          <SectionReveal>
            <PricingModalidades accent="pink" />
          </SectionReveal>

          {/* Selo garantia */}
          <SectionReveal className="max-w-2xl mx-auto mt-8 sm:mt-10">
            <div className="flex items-center gap-4 px-5 py-4 rounded-2xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.15))', border: '1px solid rgba(16,185,129,0.35)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-sm sm:text-base mb-0.5">Zero risco pra testar</div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-slate-400">
                  {['Garantia 7 dias', 'Preço travado vitalício', 'Cancela em 1 clique', 'Seus dados ficam seus'].map((t) => (
                    <span key={t} className="flex items-center gap-1"><IconCheck size={11} strokeWidth={3} className="text-emerald-400" />{t}</span>
                  ))}
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
              <span style={{ color: '#EC4899' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>
              </span>
              <span>Perguntas frequentes</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Tudo que você precisa saber <span className="text-gradient">antes de começar.</span>
            </h2>
          </SectionReveal>
          <SectionReveal><FAQ items={SALAO_FAQS} /></SectionReveal>
        </div>
      </section>

      {/* ═══════════ 10. CTA FINAL ═══════════ */}
      <section className="relative py-20 sm:py-28 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(236,72,153,0.28) 0%, transparent 60%)' }} />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 40%, rgba(139,92,246,0.2) 0%, transparent 60%)' }} />
        </div>
        <div className="container relative max-w-4xl px-4">
          <SectionReveal className="text-center">
            <div className="pill-glow mb-5 sm:mb-6 animate-pulse-glow inline-flex items-center gap-2 text-xs sm:text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Preço de lançamento — por tempo limitado</span>
            </div>
            <h2 className="text-white font-black mb-5 sm:mb-6 leading-[1.05]" style={{ fontSize: 'clamp(2rem, 7vw, 4rem)' }}>
              Enquanto você lê isso,<br />alguém pesquisou<br /><span className="text-gradient">&quot;salão de beleza perto de mim&quot;</span><br />e agendou com outro.
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
              5 minutos de setup. Link na bio. Amanhã de manhã você abre o salão com a agenda cheia — sem ter respondido um WhatsApp sequer.
            </p>
          </SectionReveal>

          <SectionReveal className="mb-10 sm:mb-12 max-w-md mx-auto">
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(8,11,24,0.8)', border: '1px solid rgba(236,72,153,0.3)', boxShadow: '0 20px 60px rgba(236,72,153,0.2)' }}>
              <div className="flex items-center justify-between px-4 py-2 border-b text-[10px]" style={{ borderColor: 'rgba(236,72,153,0.2)', background: 'rgba(236,72,153,0.06)' }}>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-white font-bold">SmartAgenda</span></span>
                <span className="text-slate-500">agora mesmo</span>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
                  <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#06B6D4', boxShadow: '0 0 8px rgba(6,182,212,0.5)' }}><IconContacts size={11} strokeWidth={2.4} /></span>
                  <div className="flex-1 min-w-0"><span className="text-[11px] text-white font-bold">22:30</span><span className="text-[10px] text-slate-400"> — Ana agendou coloração + escova pra amanhã 10h</span></div>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#10B981', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }}><IconCheck size={11} strokeWidth={3} /></span>
                  <div className="flex-1 min-w-0"><span className="text-[11px] text-white font-bold">22:30</span><span className="text-[10px] text-slate-400"> — Confirmação automática enviada</span></div>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#8B5CF6', boxShadow: '0 0 8px rgba(139,92,246,0.5)' }}><IconClock24 size={11} strokeWidth={2.4} /></span>
                  <div className="flex-1 min-w-0"><span className="text-[11px] text-white font-bold">22:30</span><span className="text-[10px] text-slate-400"> — Lembrete anti-falta programado pra amanhã 18h</span></div>
                </div>
              </div>
              <div className="px-4 py-2 text-[10px] text-center border-t" style={{ borderColor: 'rgba(236,72,153,0.15)', background: 'rgba(236,72,153,0.04)' }}>
                <span className="text-slate-400">Tudo isso aconteceu </span><span className="text-white font-bold">enquanto a dona dormia.</span>
              </div>
            </div>
          </SectionReveal>

          <SectionReveal className="flex flex-wrap justify-center gap-2.5 sm:gap-3 mb-10 sm:mb-12">
            {[
              { ico: <IconCheck size={12} strokeWidth={3} />, t: 'Garantia de 7 dias' },
              { ico: <IconClock24 size={12} strokeWidth={2.2} />, t: '5 minutos pra configurar' },
              { ico: <IconCash size={12} strokeWidth={2.2} />, t: 'R$1,60/dia no Solo' },
              { ico: <IconBolt size={12} strokeWidth={2.4} />, t: 'Cancela em 1 clique' },
            ].map((c) => (
              <span key={c.t} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#6EE7B7' }}>
                <span className="text-emerald-400">{c.ico}</span>{c.t}
              </span>
            ))}
          </SectionReveal>

          <SectionReveal className="text-center">
            <Link href="/cadastro" className="btn btn-primary-v2 btn-shimmer inline-flex font-black text-base sm:text-lg px-8 py-4 sm:py-5 min-h-[56px]" style={{ boxShadow: '0 0 40px rgba(236,72,153,0.5), 0 0 80px rgba(139,92,246,0.3)' }}>
              <span className="relative z-10 flex items-center gap-2">Quero minha SmartAgenda agora<IconArrowRight size={20} /></span>
            </Link>
            <p className="text-slate-400 text-xs sm:text-sm mt-4 sm:mt-5 max-w-md mx-auto">
              R$67/mês no plano Solo, sem setup. Garantia de 7 dias.<br /><span className="text-slate-500">Suporte direto com a Impulso Digital pelo WhatsApp.</span>
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 sm:py-14 border-t" style={{ borderColor: 'var(--glass-border)' }}>
        <div className="container px-4 space-y-8">
          <div className="grid sm:grid-cols-[1fr_auto] gap-6 items-start">
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-agendapro-dark.svg" alt="AgendaPRO" className="h-7" />
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm">A SmartAgenda dos negócios de serviço. Atende, lembra, fideliza e sobe seu ranking no Google.</p>
              <a href="https://impulsodigital063.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors mt-1">
                Um produto <span className="font-semibold text-slate-400">Impulso Digital</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs sm:text-sm">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Segmentos</p>
                <Link href="/barbearia" className="block text-slate-400 hover:text-white transition-colors">Barbearia</Link>
                <Link href="/salao" className="block text-slate-300 hover:text-white transition-colors">Salão</Link>
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
          <div className="pt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6" style={{ borderTop: '1px solid var(--glass-border)' }}>
            {[
              { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>, label: 'LGPD' },
              { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, label: 'SSL 256-bit' },
              { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><rect x="9" y="10" width="6" height="5" rx="1"/><path d="M10.5 10V8.5a1.5 1.5 0 0 1 3 0V10"/></svg>, label: 'Dados protegidos' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5 text-slate-500">{s.icon}<span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">{s.label}</span></div>
            ))}
          </div>
          <div className="pt-5 mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] sm:text-xs text-slate-500" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <span>&copy; 2025 AgendaPRO · by Impulso Digital · CNPJ 64.585.949/0001-83 · Palmas, TO</span>
            <div className="flex items-center gap-4">
              <Link href="/privacidade" className="hover:text-white transition-colors">Política de Privacidade</Link>
              <span>·</span>
              <Link href="/termos" className="hover:text-white transition-colors">Termos de Uso</Link>
            </div>
          </div>
        </div>
      </footer>

      <SocialProofToast variant="salao" />
    </main>
  )
}
