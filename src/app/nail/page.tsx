import Link from 'next/link'
import FAQ from '@/components/FAQ'
import type { FAQItem } from '@/components/FAQ'
import AgendaDashboardMockup from '@/components/AgendaDashboardMockup'
import ComparisonMiniUIs from '@/components/ComparisonMiniUIs'
import OnboardingSteps from '@/components/OnboardingSteps'
import SocialProofToast from '@/components/SocialProofToast'
import { AnimatedGradient, SectionReveal } from '@/components/ui'
import {
  IconNailPolish,
  IconHand,
  IconPalette,
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
  IconWhatsapp,
} from '@/components/BarberIcons'

/* ═══════════════════════════════════════════════════════════
   LP NAIL DESIGNER — SmartAgenda
   Persona: nail designer / manicure, 22-40 anos.
   Geralmente solo ou com 1 auxiliar. Trabalha em casa,
   espaço alugado ou salão parceiro.
   Serviços: esmaltação em gel, fibra de vidro, alongamento,
   nail art, manutenção. Sessão de 1h30-3h.
   Dores: DM do Instagram é a agenda, falta dói porque
   a sessão é longa, não consegue responder enquanto atende.
═══════════════════════════════════════════════════════════ */

const DORES = [
  {
    titulo: 'DM do Instagram é sua agenda',
    detalhe: 'Você tá no meio de uma fibra e o celular vibra 8 vezes. "Tem horário?", "Quanto é o gel?", "Pode sábado?". Responde depois e perde a cliente.',
    accent: '#F472B6',
    stat: '15+',
    statLabel: 'DMs/dia pra agendar',
  },
  {
    titulo: 'Falta em sessão de 2 horas',
    detalhe: 'Alongamento em gel, R$180, 2h de cadeira reservada. A cliente sumiu. Sem aviso, sem reposição. Você ficou parada olhando pra agenda vazia.',
    accent: '#8B5CF6',
    stat: 'R$180',
    statLabel: 'perdidos/falta',
  },
  {
    titulo: 'Controle financeiro no bloquinho',
    detalhe: 'Quantas clientes atendeu esse mês? Quanto faturou? Qual serviço dá mais? Não sabe. Porque tá tudo em nota do celular, papel e memória.',
    accent: '#06B6D4',
    stat: '0',
    statLabel: 'controle real',
  },
]

const MOTORES = [
  { Icon: IconBrain,   tag: 'Anti-falta',     titulo: 'Lembrete que salva sua sessão',        desc: 'Na véspera, a cliente recebe lembrete automático. Confirma ou avisa que não vem. Você sabe se vai ter cliente antes de separar o material.', color: '#F472B6', stat: '-50%',  statLabel: 'faltas' },
  { Icon: IconTrophy,  tag: 'Ranking',         titulo: 'Google mostra seu trabalho primeiro',  desc: 'Depois do atendimento, a cliente ganha pontos pra avaliar no Google. Sua nota sobe e quem pesquisa "nail designer perto de mim" te acha.',  color: '#F59E0B', stat: '+0.6',  statLabel: 'nota/mês' },
  { Icon: IconLink,    tag: 'Indicação',       titulo: 'Cliente traz a amiga pelo link',       desc: 'Cada cliente recebe link de indicação. A amiga agenda, as duas ganham pontos. Você rastreia de onde vem cada cliente nova.',                 color: '#8B5CF6', stat: 'x2.3',  statLabel: 'clientes' },
  { Icon: IconBolt,    tag: 'Fila de espera',   titulo: 'Cancelou? Vaga preenchida',            desc: 'Gel de R$150 cancelado? O sistema avisa quem tá na fila. A primeira que aceitar fica com o horário. Sem você abrir o Instagram.',          color: '#06B6D4', stat: '3 min', statLabel: 'pra preencher' },
]

const TIMELINE = [
  { hora: '08:00', titulo: 'Você acorda e já tem cliente marcada',          detalhe: 'Larissa agendou fibra de vidro às 23h pelo link na bio. A SmartAgenda confirmou e programou lembrete pra véspera.' },
  { hora: '11:00', titulo: 'Cancelamento virou faturamento',                detalhe: 'Carolina cancelou o gel de R$150. O sistema chamou Thais da fila. Ela aceitou em 3 minutos. Cadeira cheia.' },
  { hora: '15:00', titulo: 'Atendendo sem interrupção',                     detalhe: 'Enquanto você faz nail art na Bianca, 2 clientes novas agendaram pelo link. Sem DM. Sem WhatsApp. Sem parar a unha.' },
  { hora: '20:00', titulo: 'Dia fecha com tudo registrado',                 detalhe: 'R$720 faturados. 4 atendimentos. Ticket médio R$180. 2 avaliações 5 estrelas novas. Sem anotar nada.' },
]

/* ═══ FAQs — Nail ═══ */

const NAIL_FAQS: FAQItem[] = [
  {
    q: 'Preciso de cartão pra testar?',
    a: 'Não. 14 dias grátis, sem cartão, sem compromisso. Configura seus serviços, coloca o link na bio e testa de verdade.',
  },
  {
    q: 'Quanto custa depois do teste?',
    a: 'Plano Solo: R$67/mês. Uma falta a menos por mês já paga o plano 2 vezes. Se uma cliente da fila preencher um cancelamento por semana, sobra R$500+/mês.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim. Sem multa, sem fidelidade, sem contrato. Cancela pelo painel ou WhatsApp. Se voltar, seus dados continuam lá.',
  },
  {
    q: 'Minha cliente precisa baixar app?',
    a: 'Não. Ela clica no link da bio, escolhe o serviço e o horário — tudo no navegador. Sem cadastro, sem download. Em menos de 1 minuto tá agendado.',
  },
  {
    q: 'Consigo cadastrar serviços com duração diferente?',
    a: 'Sim. Esmaltação 45min, gel 1h30, fibra 2h, alongamento 3h — cada um com duração e preço próprio. O sistema bloqueia o tempo certo.',
  },
  {
    q: 'E o Instagram? Perco clientes que me chamam na DM?',
    a: 'Não. Quem te chama na DM, você manda o link e ela agenda sozinha. Quem vê a bio, já agenda direto. Você para de responder "tem horário?" 15 vezes por dia.',
  },
  {
    q: 'Trabalho sozinha. Serve pra mim?',
    a: 'Serve perfeitamente. O plano Solo foi feito pra quem trabalha sozinha. Agenda, lembrete, fila de espera, financeiro — tudo num painel só.',
  },
  {
    q: 'E se eu precisar bloquear um horário?',
    a: 'Um clique. Bloqueia o horário, o dia inteiro ou uma semana. Nenhuma cliente consegue agendar nesse período.',
  },
  {
    q: 'Como funciona o lembrete?',
    a: 'Na véspera, o sistema manda lembrete automático. A cliente confirma ou avisa que não vem. Você sabe se vai ter atendimento antes de separar o material.',
  },
  {
    q: 'É difícil de configurar?',
    a: 'Nome, serviços e horários. 5 minutos. Se sabe usar Instagram, sabe usar o AgendaPRO. Sério.',
  },
  {
    q: 'Funciona pelo celular?',
    a: '100%. Painel, agenda, financeiro — tudo no celular. A maioria das nail designers nem usa computador. Funciona igual.',
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
          background: 'linear-gradient(135deg, rgba(244,114,182,0.12) 0%, rgba(139,92,246,0.08) 100%)',
          border: '1px solid rgba(244,114,182,0.25)',
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

/* ═══ Mini-UIs da seção DOR — Nail ═══ */

function DorInstagramDM() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #F1F3F4', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div className="px-3 py-2 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #833AB4 0%, #E1306C 50%, #F77737 100%)' }}>
        <div className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="#fff" stroke="none"/></svg>
          <span className="text-[10px] font-semibold text-white">Direct Messages</span>
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-white text-[#E1306C]">8 novas</span>
      </div>
      <div className="p-2 space-y-1">
        {[
          { nome: 'Larissa', msg: 'Oi tem horário pra gel essa semana?', hora: '09:14' },
          { nome: 'Thais M.', msg: 'Quanto ta o alongamento em fibra?', hora: '09:32' },
          { nome: 'Bianca', msg: 'Preciso remarcar minha manutenção', hora: '10:05' },
          { nome: 'Jéssica', msg: 'Vc faz nail art? Queria agendar', hora: '10:18' },
          { nome: 'Amanda', msg: 'Oiii!! Tem sábado disponível??', hora: '10:41' },
        ].map((m, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: '#F9FAFB' }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ background: ['#E1306C', '#833AB4', '#F77737', '#1A73E8', '#34A853'][i] }}>{m.nome[0]}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-medium text-[#202124] truncate">{m.nome}</div>
              <div className="text-[9px] text-[#5F6368] truncate">{m.msg}</div>
            </div>
            <span className="text-[8px] text-[#9AA0A6] flex-shrink-0">{m.hora}</span>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 text-[9px] text-[#D93025] font-medium flex items-center gap-1" style={{ background: '#FEF2F2', borderTop: '1px solid #FECDD3' }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Você com as mãos na unha. Celular vibrando sem parar.
      </div>
    </div>
  )
}

function DorSessaoFalta() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #F1F3F4', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div className="px-3 py-2 flex items-center justify-between" style={{ background: '#F8F9FA', borderBottom: '1px solid #F1F3F4' }}>
        <span className="text-[10px] font-semibold text-[#202124]">Agendamento #189</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#FEF2F2', color: '#D93025' }}>Faltou</span>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#F472B6' }}>C</div>
          <div>
            <div className="text-[11px] font-medium text-[#202124]">Carolina Silva</div>
            <div className="text-[9px] text-[#9AA0A6]">Alongamento gel · 2h · R$180</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded-lg p-2 text-center" style={{ background: '#FEF2F2' }}>
            <div className="text-[9px] text-[#D93025]">Tempo parada</div>
            <div className="text-[11px] font-bold text-[#D93025]">2 horas</div>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: '#FEF2F2' }}>
            <div className="text-[9px] text-[#D93025]">Receita perdida</div>
            <div className="text-[11px] font-bold text-[#D93025]">R$180</div>
          </div>
        </div>
        <div className="rounded-lg p-2 flex items-center justify-between" style={{ background: '#FFFBEB' }}>
          <span className="text-[10px] text-[#92400E]">Próxima cliente</span>
          <span className="text-[10px] font-bold text-[#92400E]">só às 16h</span>
        </div>
      </div>
      <div className="px-3 py-2 text-[9px] text-[#D93025] font-medium" style={{ background: '#FEF2F2', borderTop: '1px solid #FECDD3' }}>
        2 horas parada. Sem aviso. Sem reposição.
      </div>
    </div>
  )
}

function DorFinanceiroBloco() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #F1F3F4', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div className="px-3 py-2 flex items-center justify-between" style={{ background: '#F8F9FA', borderBottom: '1px solid #F1F3F4' }}>
        <span className="text-[10px] font-semibold text-[#202124]">Controle financeiro — Março</span>
        <span className="text-[9px] text-[#9AA0A6]">manual</span>
      </div>
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg p-2.5" style={{ background: '#F9FAFB' }}>
            <div className="text-[9px] text-[#9AA0A6]">Clientes atendidas</div>
            <div className="text-[14px] font-black text-[#202124]">???</div>
          </div>
          <div className="rounded-lg p-2.5" style={{ background: '#F9FAFB' }}>
            <div className="text-[9px] text-[#9AA0A6]">Faturamento</div>
            <div className="text-[14px] font-black text-[#202124]">R$ ???</div>
          </div>
          <div className="rounded-lg p-2.5" style={{ background: '#F9FAFB' }}>
            <div className="text-[9px] text-[#9AA0A6]">Ticket médio</div>
            <div className="text-[14px] font-black text-[#202124]">???</div>
          </div>
          <div className="rounded-lg p-2.5" style={{ background: '#F9FAFB' }}>
            <div className="text-[9px] text-[#9AA0A6]">Serviço mais pedido</div>
            <div className="text-[14px] font-black text-[#202124]">???</div>
          </div>
        </div>
        <div className="rounded-lg p-2 flex items-center gap-2" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span className="text-[10px] text-[#92400E]">Notas do celular + bloquinho + memória</span>
        </div>
      </div>
      <div className="px-3 py-2 text-[9px] text-[#D93025] font-medium" style={{ background: '#FEF2F2', borderTop: '1px solid #FECDD3' }}>
        Trabalha todo dia mas não sabe quanto fatura. Perigoso.
      </div>
    </div>
  )
}

export default function NailPage() {
  return (
    <main className="relative overflow-hidden" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* Announcement bar */}
      <div
        className="relative text-center text-[12px] sm:text-sm font-semibold text-white px-4 py-2.5 flex items-center justify-center gap-2"
        style={{
          background: 'linear-gradient(90deg, #831843 0%, #F472B6 50%, #8B5CF6 100%)',
          backgroundSize: '200% 100%',
          animation: 'gradient-flow 10s linear infinite',
        }}
      >
        <IconNailPolish size={14} className="flex-shrink-0" />
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
              style={{ background: 'rgba(244,114,182,0.15)', color: '#F472B6', border: '1px solid rgba(244,114,182,0.3)' }}
            >
              <IconNailPolish size={10} /> Nail
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

            <SectionReveal className="flex flex-col items-center lg:items-start text-center lg:text-left gap-5 sm:gap-6 lg:gap-7">
              <div className="pill inline-flex items-center gap-2 text-[10px] sm:text-xs">
                <span
                  className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black"
                  style={{ background: 'linear-gradient(135deg, #F472B6, #EC4899)', color: '#fff', letterSpacing: '0.05em' }}
                >
                  NOVO
                </span>
                <span className="text-white/95 font-bold uppercase tracking-wider">SmartAgenda pra nail designers</span>
              </div>

              <h1 className="text-white font-black leading-[1.05] tracking-tight" style={{ fontSize: 'clamp(2.2rem, 7vw, 4.5rem)' }}>
                Você tá fazendo unha<br />
                e o celular<br /><span className="text-gradient">não para.</span>
              </h1>

              <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed">
                <strong className="text-white">"Tem horário?", "Quanto é o gel?", "Pode sábado?"</strong> — 15 DMs por dia pra agendar 5 clientes. Com a SmartAgenda, o link na bio resolve. Cliente agenda sozinha, recebe lembrete automático e não fura. Cancelou o gel de R$150? A fila preenche em minutos. E cada atendimento vira avaliação no Google — você aparece primeiro pra quem pesquisa "nail designer perto de mim".
              </p>

              <div className="flex flex-wrap gap-2 sm:gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(244,114,182,0.08)', border: '1px solid rgba(244,114,182,0.25)' }}>
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0" style={{ background: 'rgba(244,114,182,0.18)', color: '#F472B6' }}>
                    <IconNailPolish size={14} />
                  </span>
                  <span className="text-left text-[12px] sm:text-[13px] leading-tight">
                    <strong className="text-white">Link na bio</strong>
                    <span className="text-slate-500 hidden sm:inline"> · agenda sem DM</span>
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0" style={{ background: 'rgba(16,185,129,0.18)', color: '#10B981' }}>
                    <IconCheck size={14} />
                  </span>
                  <span className="text-left text-[12px] sm:text-[13px] leading-tight">
                    <strong className="text-white">-50% faltas</strong>
                    <span className="text-slate-500 hidden sm:inline"> · lembrete automático</span>
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(251,188,4,0.08)', border: '1px solid rgba(251,188,4,0.25)' }}>
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0" style={{ background: 'rgba(251,188,4,0.18)', color: '#FBBC04' }}>
                    <IconStar size={14} />
                  </span>
                  <span className="text-left text-[12px] sm:text-[13px] leading-tight">
                    <strong className="text-white">4.9 no Google</strong>
                    <span className="text-slate-500 hidden sm:inline"> · avaliação incentivada</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                <Link href="/cadastro" className="btn btn-primary-v2 btn-shimmer w-full sm:w-auto justify-center font-black text-base px-6 py-4 min-h-[52px]">
                  <span className="relative z-10 flex items-center gap-2">Testar 14 dias grátis<IconArrowRight size={20} /></span>
                </Link>
                <a href="#dor" className="btn btn-ghost w-full sm:w-auto justify-center font-semibold text-base px-6 py-4 min-h-[52px]">Ver como funciona</a>
              </div>

              <p className="text-xs sm:text-sm text-slate-400">14 dias grátis · sem cartão · R$67/mês depois</p>
            </SectionReveal>

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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F472B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>Reconhece isso?</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Você trabalha com as mãos.<br /><span className="text-gradient">Não dá pra ficar no celular.</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-400">
              DM lotada, falta sem aviso, zero controle financeiro. A rotina de quem agenda pelo Instagram.
            </p>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
            {DORES.map((d, i) => (
              <div key={d.titulo} className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-4 lift-card" style={{ border: `1px solid ${d.accent}30` }}>
                {i === 0 && <DorInstagramDM />}
                {i === 1 && <DorSessaoFalta />}
                {i === 2 && <DorFinanceiroBloco />}
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

      <CTAInline titulo="A SmartAgenda resolve tudo isso" sub="14 dias grátis. Configure em 5 minutos." />

      {/* ═══════════ 3. MOTORES ═══════════ */}
      <section id="mecanismos" className="relative py-16 sm:py-20 lg:py-28">
        <div className="container px-4">
          <SectionReveal className="text-center mb-10 sm:mb-14 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconHand size={14} className="text-pink-300" />
              <span>Os 4 motores da SmartAgenda</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Sistema que <span className="text-gradient">agenda</span> enquanto você atende.
            </h2>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {MOTORES.map((m, i) => (
              <div
                key={m.titulo}
                className="rounded-2xl sm:rounded-3xl p-5 sm:p-7 flex flex-col gap-3 lift-card relative overflow-hidden"
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
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(244,114,182,0.08)', border: '1px solid rgba(244,114,182,0.2)' }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#F472B6' }}><IconWhatsapp size={11} strokeWidth={2} /></span>
                        <div className="flex-1 min-w-0"><span className="text-[10px] text-white font-bold">Lembrete enviado</span><span className="text-[9px] text-slate-500"> · ontem 18:00</span></div>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#10B981' }}><IconCheck size={11} strokeWidth={3} /></span>
                        <div className="flex-1 min-w-0"><span className="text-[10px] text-white font-bold">Larissa confirmou</span><span className="text-[9px] text-slate-500"> · 18:08</span></div>
                      </div>
                      <div className="text-[9px] text-slate-500 px-1 pt-0.5">Fibra de R$200 garantida. Sem você mandar mensagem.</div>
                    </div>
                  )}
                  {i === 1 && (
                    <div className="rounded-xl p-3" style={{ background: 'rgba(8,11,24,0.6)', border: `1px solid ${m.color}25` }}>
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                          <IconTrophy size={16} className="text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold text-white">Nail Studio Larissa</div>
                          <div className="text-[9px] text-slate-500">Google Maps · Vila Mariana</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mb-1.5">
                        {[1,2,3,4,5].map((s) => (<IconStar key={s} size={12} className={s <= 4 ? 'text-amber-400' : 'text-amber-400/50'} />))}
                        <span className="text-[11px] font-black text-white ml-1">4.9</span>
                        <span className="text-[9px] text-slate-500 ml-1">· 64 avaliações</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-emerald-400 font-bold">+4 avaliações essa semana</span>
                        <span className="text-slate-500">· automático</span>
                      </div>
                    </div>
                  )}
                  {i === 2 && (
                    <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'rgba(8,11,24,0.6)', border: `1px solid ${m.color}25` }}>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#8B5CF6' }}><IconLink size={11} strokeWidth={2.2} /></span>
                        <div className="flex-1 min-w-0"><span className="text-[10px] text-white font-bold">Bianca compartilhou o link</span></div>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#06B6D4' }}><IconContacts size={11} strokeWidth={2.2} /></span>
                        <div className="flex-1 min-w-0"><span className="text-[10px] text-white font-bold">Jéssica agendou pelo link</span><span className="text-[9px] text-slate-500"> · gel sex 14h</span></div>
                      </div>
                      <div className="flex items-center justify-between px-1 pt-0.5 text-[9px]">
                        <span className="text-violet-300 font-bold">+50pts Bianca · +50pts Jéssica</span>
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
                        <div className="flex-1 min-w-0"><span className="text-[10px] text-red-400 line-through">14:00 — Carolina cancelou gel</span></div>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: `${m.color}10`, border: `1px solid ${m.color}25` }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: m.color }}><IconBolt size={11} strokeWidth={2.4} /></span>
                        <div className="flex-1 min-w-0"><span className="text-[10px] text-white font-bold">Fila acionada</span><span className="text-[9px] text-slate-500"> · 3 notificadas</span></div>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#10B981' }}><IconCheck size={11} strokeWidth={3} /></span>
                        <div className="flex-1 min-w-0"><span className="text-[10px] text-white font-bold">14:00 — Thais aceitou</span><span className="text-[9px] text-emerald-400 font-bold"> +R$150</span></div>
                      </div>
                      <div className="text-[9px] text-slate-500 px-1 pt-0.5">Vaga preenchida em <span className="text-white font-bold">3 minutos</span> · sem você abrir o Instagram</div>
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
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(244,114,182,0.12) 0%, transparent 60%)' }} />
        <div className="container relative px-4">
          <SectionReveal className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconCash size={14} className="text-emerald-400" />
              <span>Controle que você nunca teve</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Sabe quanto faturou esse mês?{' '}<span className="text-gradient">Agora sabe.</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
              Chega de bloquinho, nota do celular e conta de cabeça. Cada atendimento registrado, cada real rastreado.
            </p>
          </SectionReveal>

          <SectionReveal>
            <div className="grid lg:grid-cols-[1fr_1fr] gap-6 lg:gap-8 items-center max-w-5xl mx-auto">

              {/* Dashboard financeiro */}
              <div className="rounded-2xl sm:rounded-3xl overflow-hidden lift-card" style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)' }}>
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#F8F9FA', borderBottom: '1px solid #F1F3F4' }}>
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#188038" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                    <span className="text-[13px] font-semibold text-[#202124]">Financeiro</span>
                  </div>
                  <span className="text-[10px] text-[#9AA0A6]">Abril 2026</span>
                </div>
                <div className="grid grid-cols-3 divide-x divide-[#F1F3F4]" style={{ borderBottom: '1px solid #F1F3F4' }}>
                  <div className="px-3 py-3 text-center">
                    <div className="text-[9px] text-[#9AA0A6] uppercase tracking-wider font-medium">Faturamento</div>
                    <div className="text-[16px] font-black text-[#202124] mt-0.5">R$ 4.320</div>
                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#188038" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                      <span className="text-[9px] font-bold text-[#188038]">+15%</span>
                    </div>
                  </div>
                  <div className="px-3 py-3 text-center">
                    <div className="text-[9px] text-[#9AA0A6] uppercase tracking-wider font-medium">Atendimentos</div>
                    <div className="text-[16px] font-black text-[#202124] mt-0.5">28</div>
                    <div className="text-[9px] text-[#9AA0A6] mt-0.5">este mês</div>
                  </div>
                  <div className="px-3 py-3 text-center">
                    <div className="text-[9px] text-[#9AA0A6] uppercase tracking-wider font-medium">Ticket médio</div>
                    <div className="text-[16px] font-black text-[#202124] mt-0.5">R$ 154</div>
                    <div className="text-[9px] text-[#9AA0A6] mt-0.5">por atendimento</div>
                  </div>
                </div>
                <div className="px-3 py-2">
                  <div className="text-[10px] font-semibold text-[#5F6368] uppercase tracking-wider mb-1.5 px-1">Serviços mais pedidos</div>
                  {[
                    { serv: 'Esmaltação em gel', qtd: '12', receita: 'R$ 1.800', pct: '42%' },
                    { serv: 'Fibra de vidro', qtd: '8', receita: 'R$ 1.440', pct: '33%' },
                    { serv: 'Manutenção', qtd: '5', receita: 'R$ 500', pct: '12%' },
                    { serv: 'Nail art', qtd: '3', receita: 'R$ 580', pct: '13%' },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-2 px-1 py-1.5 rounded-lg" style={{ background: i % 2 === 0 ? '#F9FAFB' : '#fff' }}>
                      <span className="flex-1 text-[11px] font-medium text-[#202124]">{s.serv}</span>
                      <span className="text-[10px] text-[#9AA0A6]">{s.qtd}x</span>
                      <span className="w-16 text-right text-[11px] font-bold text-[#202124]">{s.receita}</span>
                      <span className="w-8 text-right text-[9px] text-[#9AA0A6]">{s.pct}</span>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: '#E6F4EA', borderTop: '1px solid #C8E6C9' }}>
                  <span className="text-[11px] font-medium text-[#188038] flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#188038" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Tudo registrado
                  </span>
                  <span className="text-[11px] font-black text-[#188038]">Faturamento: R$ 4.320</span>
                </div>
              </div>

              {/* Copy */}
              <div className="space-y-4 sm:space-y-5">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight">
                  Cada unha registrada.{' '}<span className="text-gradient">Cada real contado.</span>
                </h3>
                <ul className="space-y-3 text-sm sm:text-base text-slate-300">
                  {[
                    { icon: <IconCash size={14} />, txt: 'Faturamento do dia, semana e mês. Sem anotar nada.' },
                    { icon: <IconPalette size={14} strokeWidth={2} />, txt: 'Qual serviço dá mais resultado. Sabe onde focar.' },
                    { icon: <IconBrain size={14} strokeWidth={2} />, txt: 'Ticket médio e atendimentos. Evolução real, não achismo.' },
                    { icon: <IconCheck size={14} strokeWidth={2} />, txt: 'Fim do mês: abre o celular e vê exatamente quanto faturou.' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-lg inline-flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(244,114,182,0.12)', border: '1px solid rgba(244,114,182,0.3)', color: '#F9A8D4' }}>{item.icon}</span>
                      <span>{item.txt}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Na seção de dor você viu: <strong className="text-slate-300">bloquinho, nota do celular, zero controle.</strong> Aqui é o painel que transforma cada atendimento em dado concreto.
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
              Foco na unha.{' '}<span className="text-gradient">A agenda cuida de si.</span>
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

      <CTAInline titulo="Esse dia pode ser amanhã" sub="Cadastre hoje. Coloque o link na bio. Pronto." />

      {/* ═══════════ 6. COMPARAÇÃO ═══════════ */}
      <section className="relative py-16 sm:py-20 lg:py-28">
        <div className="container max-w-6xl px-4">
          <SectionReveal className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconHand size={14} className="text-pink-300" />
              <span>SmartAgenda x Outros apps</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Outros apps <span className="text-slate-500">só marcam horário</span>.<br /><span className="text-gradient">SmartAgenda preenche a agenda.</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              A diferença aparece quando a cliente cancela. Veja o que acontece nos dois cenários.
            </p>
          </SectionReveal>
          <SectionReveal><ComparisonMiniUIs /></SectionReveal>
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
          <SectionReveal><OnboardingSteps /></SectionReveal>
        </div>
      </section>

      {/* ═══════════ 8. PRICING ═══════════ */}
      <section id="precos" className="relative py-10 sm:py-14 lg:py-20">
        <div className="container px-4">
          <SectionReveal className="text-center mb-8 sm:mb-10 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconCash size={14} className="text-blue-400" />
              <span>Plano pra nail designer</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Menos que <span className="text-gradient">meio gel</span> por mês.
            </h2>
            <p className="text-base sm:text-lg text-slate-400">
              Uma falta a menos por mês e o plano já se pagou 2 vezes. Faça a conta.
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
                  { item: 'Agenda online (Booksy, Trinks)', price: 'R$ 89/mês' },
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
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t" style={{ borderColor: 'rgba(244,114,182,0.3)', background: 'linear-gradient(90deg, rgba(244,114,182,0.1), rgba(139,92,246,0.08))' }}>
                <span className="text-sm sm:text-base font-black text-gradient">AgendaPRO tudo junto</span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-md" style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#34D399' }}>-74%</span>
                  <span className="text-base sm:text-lg font-black text-white">R$ 67/mês</span>
                </div>
              </div>
            </div>
          </SectionReveal>

          {/* Card de plano — Solo (nail geralmente trabalha sozinha) */}
          <SectionReveal className="max-w-lg mx-auto">
            <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 relative lift-card" style={{ background: 'linear-gradient(180deg, rgba(244,114,182,0.12) 0%, rgba(8,11,24,0.85) 50%, rgba(8,11,24,0.95) 100%)', border: '1px solid rgba(244,114,182,0.45)', boxShadow: '0 25px 80px rgba(244,114,182,0.3), 0 0 0 1px rgba(244,114,182,0.1), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
              <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(244,114,182,0.5), transparent 70%)', filter: 'blur(40px)' }} aria-hidden />
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 pill-glow text-[10px] sm:text-xs whitespace-nowrap"><IconStar size={10} className="text-amber-300" /> IDEAL PRA NAIL DESIGNER</div>
              <div className="flex items-start justify-between mb-5 mt-2 relative z-10">
                <div><h3 className="text-xl sm:text-2xl font-black text-white mb-1">Solo</h3><p className="text-slate-400 text-xs sm:text-sm">1 a 2 profissionais</p></div>
                <div className="text-pink-300"><IconNailPolish size={28} /></div>
              </div>
              <div className="mb-5 sm:mb-6 relative z-10">
                <div className="flex items-baseline gap-2"><span className="text-4xl sm:text-5xl font-black text-gradient">R$67</span><span className="text-slate-400 text-sm">/mês</span></div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-slate-500 text-xs line-through">R$97</span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md inline-flex items-center gap-1" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#34D399' }}><IconBolt size={10} strokeWidth={2.5} />Economia R$189/mês</span>
                </div>
                <p className="text-slate-500 text-[11px] mt-2 flex items-center gap-1.5"><IconClock24 size={11} strokeWidth={2} />R$2,23/dia — menos que um esmalte</p>
              </div>
              <div className="rounded-xl px-3 py-2.5 mb-5 text-[11px] sm:text-xs relative z-10" style={{ background: 'rgba(244,114,182,0.08)', border: '1px solid rgba(244,114,182,0.25)' }}>
                <span className="text-slate-300">1 falta a menos/mês (R$150) = </span><span className="text-white font-black">R$150 salvos</span><span className="text-slate-300">. AgendaPRO = R$67. </span><span className="font-black" style={{ color: '#34D399' }}>Sobra R$83.</span>
              </div>
              <ul className="space-y-2.5 mb-6 text-xs sm:text-sm text-slate-300 relative z-10">
                {['Link pra bio do Instagram e Google', 'Lembrete automático anti-falta', 'Fila de espera pra cancelamentos', 'Sistema de pontos + indicação', 'Google Reviews integrado', 'Lista de clientes completa', 'Relatório financeiro completo', 'Bloqueio de horários em 1 clique'].map((item) => (
                  <li key={item} className="flex items-start gap-2.5"><span className="text-pink-300 mt-0.5 flex-shrink-0"><IconCheck size={14} /></span><span>{item}</span></li>
                ))}
              </ul>
              <div className="relative z-10"><Link href="/cadastro" className="btn btn-primary-v2 btn-shimmer w-full justify-center font-bold text-sm sm:text-base px-5 py-3.5 min-h-[48px]"><span className="relative z-10">Pegar acesso gratuito</span></Link></div>
            </div>
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
                  {['14 dias grátis', 'Sem cartão no cadastro', 'Cancela em 1 clique', 'Seus dados ficam seus'].map((t) => (
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
              <span style={{ color: '#F472B6' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>
              </span>
              <span>Perguntas frequentes</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Tudo que você precisa saber <span className="text-gradient">antes de começar.</span>
            </h2>
          </SectionReveal>
          <SectionReveal><FAQ items={NAIL_FAQS} /></SectionReveal>
        </div>
      </section>

      {/* ═══════════ 10. CTA FINAL ═══════════ */}
      <section className="relative py-20 sm:py-28 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(244,114,182,0.28) 0%, transparent 60%)' }} />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 40%, rgba(139,92,246,0.2) 0%, transparent 60%)' }} />
        </div>
        <div className="container relative max-w-4xl px-4">
          <SectionReveal className="text-center">
            <div className="pill-glow mb-5 sm:mb-6 animate-pulse-glow inline-flex items-center gap-2 text-xs sm:text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Preço de lançamento — por tempo limitado</span>
            </div>
            <h2 className="text-white font-black mb-5 sm:mb-6 leading-[1.05]" style={{ fontSize: 'clamp(2rem, 7vw, 4rem)' }}>
              Enquanto você lê isso,<br />alguém pesquisou<br /><span className="text-gradient">&quot;nail designer perto de mim&quot;</span><br />e agendou com outra.
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
              5 minutos de setup. Link na bio. Amanhã de manhã você acorda com cliente marcada — sem ter respondido uma DM sequer.
            </p>
          </SectionReveal>

          <SectionReveal className="mb-10 sm:mb-12 max-w-md mx-auto">
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(8,11,24,0.8)', border: '1px solid rgba(244,114,182,0.3)', boxShadow: '0 20px 60px rgba(244,114,182,0.2)' }}>
              <div className="flex items-center justify-between px-4 py-2 border-b text-[10px]" style={{ borderColor: 'rgba(244,114,182,0.2)', background: 'rgba(244,114,182,0.06)' }}>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-white font-bold">SmartAgenda</span></span>
                <span className="text-slate-500">agora mesmo</span>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
                  <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#06B6D4', boxShadow: '0 0 8px rgba(6,182,212,0.5)' }}><IconContacts size={11} strokeWidth={2.4} /></span>
                  <div className="flex-1 min-w-0"><span className="text-[11px] text-white font-bold">22:45</span><span className="text-[10px] text-slate-400"> — Larissa agendou fibra pra amanhã 09h</span></div>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#10B981', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }}><IconCheck size={11} strokeWidth={3} /></span>
                  <div className="flex-1 min-w-0"><span className="text-[11px] text-white font-bold">22:45</span><span className="text-[10px] text-slate-400"> — Confirmação automática enviada</span></div>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#8B5CF6', boxShadow: '0 0 8px rgba(139,92,246,0.5)' }}><IconClock24 size={11} strokeWidth={2.4} /></span>
                  <div className="flex-1 min-w-0"><span className="text-[11px] text-white font-bold">22:45</span><span className="text-[10px] text-slate-400"> — Lembrete anti-falta programado pra amanhã 18h</span></div>
                </div>
              </div>
              <div className="px-4 py-2 text-[10px] text-center border-t" style={{ borderColor: 'rgba(244,114,182,0.15)', background: 'rgba(244,114,182,0.04)' }}>
                <span className="text-slate-400">Tudo isso aconteceu </span><span className="text-white font-bold">enquanto você dormia.</span>
              </div>
            </div>
          </SectionReveal>

          <SectionReveal className="flex flex-wrap justify-center gap-2.5 sm:gap-3 mb-10 sm:mb-12">
            {[
              { ico: <IconCheck size={12} strokeWidth={3} />, t: 'Sem cartão pra testar' },
              { ico: <IconClock24 size={12} strokeWidth={2.2} />, t: '5 minutos pra configurar' },
              { ico: <IconCash size={12} strokeWidth={2.2} />, t: 'R$2,23/dia depois' },
              { ico: <IconBolt size={12} strokeWidth={2.4} />, t: 'Cancela em 1 clique' },
            ].map((c) => (
              <span key={c.t} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#6EE7B7' }}>
                <span className="text-emerald-400">{c.ico}</span>{c.t}
              </span>
            ))}
          </SectionReveal>

          <SectionReveal className="text-center">
            <Link href="/cadastro" className="btn btn-primary-v2 btn-shimmer inline-flex font-black text-base sm:text-lg px-8 py-4 sm:py-5 min-h-[56px]" style={{ boxShadow: '0 0 40px rgba(244,114,182,0.5), 0 0 80px rgba(139,92,246,0.3)' }}>
              <span className="relative z-10 flex items-center gap-2">Quero minha SmartAgenda agora<IconArrowRight size={20} /></span>
            </Link>
            <p className="text-slate-400 text-xs sm:text-sm mt-4 sm:mt-5 max-w-md mx-auto">
              14 dias grátis. Depois R$67/mês.<br /><span className="text-slate-500">Suporte direto com a Impulso Digital pelo WhatsApp.</span>
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
                <Link href="/salao" className="block text-slate-400 hover:text-white transition-colors">Salão</Link>
                <Link href="/nail" className="block text-slate-300 hover:text-white transition-colors">Nail</Link>
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

      <SocialProofToast />
    </main>
  )
}
