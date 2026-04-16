import Link from 'next/link'
import FAQ from '@/components/FAQ'
import type { FAQItem } from '@/components/FAQ'
import AgendaDashboardMockup from '@/components/AgendaDashboardMockup'
import ComparisonMiniUIs from '@/components/ComparisonMiniUIs'
import OnboardingSteps from '@/components/OnboardingSteps'
import SocialProofToast from '@/components/SocialProofToast'
import { AnimatedGradient, SectionReveal } from '@/components/ui'
import {
  IconSpa,
  IconDroplet,
  IconSparkles,
  IconFace,
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
   LP ESTÉTICA — SmartAgenda
   Persona: esteticista / dona de clínica, 25-45 anos.
   Procedimentos: limpeza de pele, drenagem, laser, massagem,
   peeling, microagulhamento. Ticket médio R$150-400.
   Dores: falta em procedimento caro, agenda lotada no WhatsApp,
   controle financeiro de múltiplas profissionais.
═══════════════════════════════════════════════════════════ */

const DORES = [
  {
    titulo: 'Falta em procedimento de R$350',
    detalhe: 'Microagulhamento marcado, sala preparada, produto aberto. A cliente não apareceu. Você perdeu 2 horas e o custo do material.',
    accent: '#10B981',
    stat: 'R$350',
    statLabel: 'perdidos/falta',
  },
  {
    titulo: 'WhatsApp lotado de "tem horário?"',
    detalhe: 'Você tá no meio de uma drenagem e o celular não para. Responde 20 mensagens por dia pra marcar 5 procedimentos. E ainda erra horário.',
    accent: '#8B5CF6',
    stat: '20+',
    statLabel: 'msg/dia pra agendar',
  },
  {
    titulo: 'Quanto cada profissional produziu?',
    detalhe: 'Três esteticistas, procedimentos diferentes, porcentagens diferentes. Fim do mês é planilha, caderninho e conta de cabeça. Sempre dá briga.',
    accent: '#06B6D4',
    stat: '5h+',
    statLabel: 'por fechamento',
  },
]

const MOTORES = [
  { Icon: IconBrain,   tag: 'Anti-falta',     titulo: 'Lembrete que salva seu procedimento',  desc: 'Na véspera, a cliente recebe lembrete automático. Confirma ou avisa que não vem. Você reorganiza a agenda antes de preparar a sala.', color: '#10B981', stat: '-50%',  statLabel: 'faltas' },
  { Icon: IconTrophy,  tag: 'Ranking',         titulo: 'Google cheio de avaliações reais',     desc: 'Depois do procedimento, a cliente ganha pontos pra avaliar no Google. Nota 4.9 e o Maps mostra sua clínica primeiro.',              color: '#F59E0B', stat: '+0.6',  statLabel: 'nota/mês' },
  { Icon: IconLink,    tag: 'Indicação',       titulo: 'Cliente indica a amiga com link',      desc: 'Cada cliente tem link de indicação. A amiga agenda, as duas ganham pontos. Boca a boca rastreado — você sabe quem trouxe quem.',     color: '#8B5CF6', stat: 'x2.3',  statLabel: 'clientes' },
  { Icon: IconBolt,    tag: 'Fila de espera',   titulo: 'Cancelou? Outra assume o horário',     desc: 'Drenagem de R$200 cancelada? O sistema avisa quem tá na fila. A primeira que aceitar fica com a vaga. Sem você tocar no celular.',  color: '#06B6D4', stat: '3 min', statLabel: 'pra preencher' },
]

const TIMELINE = [
  { hora: '08:00', titulo: 'Você chega e a agenda tá montada',             detalhe: 'Fernanda marcou limpeza de pele às 23h pelo link na bio. A SmartAgenda confirmou e programou lembrete pra véspera.' },
  { hora: '10:30', titulo: 'Cancelamento virou faturamento',               detalhe: 'Patrícia cancelou a drenagem de R$200. O sistema chamou Camila da fila. Ela aceitou em 5 minutos.' },
  { hora: '15:00', titulo: 'Avaliação automática no Google',               detalhe: 'Depois do peeling da Juliana, ela ganhou 50 pontos por avaliar. Deu 5 estrelas. Sua nota subiu pra 4.9 essa semana.' },
  { hora: '20:00', titulo: 'Dia fecha com tudo calculado',                 detalhe: 'R$2.400 faturados. Comissão de cada profissional pronta. 3 avaliações novas no Google. Sem abrir planilha.' },
]

/* ═══ FAQs — Estética ═══ */

const ESTETICA_FAQS: FAQItem[] = [
  {
    q: 'Preciso de cartão pra testar?',
    a: 'Não. 14 dias grátis, sem cartão, sem compromisso. Configura a clínica e testa de verdade. Decide depois.',
  },
  {
    q: 'Quanto custa depois do teste?',
    a: 'Plano Solo (1-2 profissionais): R$67/mês. Plano Equipe (3-5 profissionais): R$107/mês. Uma falta a menos por mês já paga o plano 3 vezes.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim. Sem multa, sem fidelidade, sem contrato. Cancela pelo painel ou WhatsApp. Se voltar, seus dados continuam lá.',
  },
  {
    q: 'Minha cliente precisa baixar app?',
    a: 'Não. Ela clica no link, escolhe procedimento, profissional e horário — tudo no navegador. Sem cadastro, sem download. Por isso a taxa de agendamento é alta.',
  },
  {
    q: 'Consigo cadastrar procedimentos com duração diferente?',
    a: 'Sim. Limpeza de pele 1h, drenagem 50min, microagulhamento 2h — cada um com duração e preço próprio. O sistema bloqueia o tempo certo na agenda.',
  },
  {
    q: 'Cada esteticista tem agenda separada?',
    a: 'Sim. Cada profissional com seus horários e procedimentos. A cliente escolhe com quem quer. Você vê tudo no painel.',
  },
  {
    q: 'Como funciona a comissão?',
    a: 'Você define a porcentagem de cada profissional. O sistema calcula automaticamente: produção, porcentagem, valor a pagar. Abre o painel e tá tudo lá.',
  },
  {
    q: 'E o WhatsApp? Perco as clientes que me chamam lá?',
    a: 'Não. Quem te chama pelo Zap, você cadastra em 5 segundos. Quem vê o link na bio ou no Google, agenda sozinha sem te interromper no meio de um procedimento.',
  },
  {
    q: 'E se a profissional estiver de folga ou em curso?',
    a: 'Bloqueia o dia ou horário no painel. Nenhuma cliente consegue agendar com ela nesse período. Um clique.',
  },
  {
    q: 'Como funciona o lembrete?',
    a: 'Na véspera, o sistema manda lembrete automático. Reduz faltas em até 50%. Num ticket de R$200+, isso é dinheiro sério que para de vazar.',
  },
  {
    q: 'É difícil de configurar?',
    a: 'Nome da clínica, profissionais, procedimentos e horários. Preenche um form, 5 minutos e a página tá no ar. Se sabe usar WhatsApp, sabe usar o AgendaPRO.',
  },
  {
    q: 'Funciona pelo celular?',
    a: '100%. Painel, agenda, financeiro, bloqueio de horário — tudo no celular. Computador é opcional.',
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
          background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(139,92,246,0.08) 100%)',
          border: '1px solid rgba(16,185,129,0.25)',
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

/* ═══ Mini-UIs da seção DOR — Estética ═══ */

function DorProcedimentoFalta() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #F1F3F4', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div className="px-3 py-2 flex items-center justify-between" style={{ background: '#F8F9FA', borderBottom: '1px solid #F1F3F4' }}>
        <span className="text-[10px] font-semibold text-[#202124]">Agendamento #312</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#FEF2F2', color: '#D93025' }}>Faltou</span>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#10B981' }}>R</div>
          <div>
            <div className="text-[11px] font-medium text-[#202124]">Renata Oliveira</div>
            <div className="text-[9px] text-[#9AA0A6]">Microagulhamento · 2h · R$350</div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-[#9AA0A6]">Profissional:</span>
          <span className="text-[#202124] font-medium">Dra. Camila</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded-lg p-2 text-center" style={{ background: '#FEF2F2' }}>
            <div className="text-[9px] text-[#D93025]">Tempo perdido</div>
            <div className="text-[11px] font-bold text-[#D93025]">2 horas</div>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: '#FEF2F2' }}>
            <div className="text-[9px] text-[#D93025]">Material aberto</div>
            <div className="text-[11px] font-bold text-[#D93025]">R$45</div>
          </div>
        </div>
        <div className="rounded-lg p-2 flex items-center justify-between" style={{ background: '#FEF2F2' }}>
          <span className="text-[10px] text-[#D93025]">Prejuízo total</span>
          <span className="text-[11px] font-bold text-[#D93025]">-R$395</span>
        </div>
      </div>
      <div className="px-3 py-2 text-[9px] text-[#D93025] font-medium" style={{ background: '#FEF2F2', borderTop: '1px solid #FECDD3' }}>
        Sala preparada. Produto aberto. Cliente sumiu.
      </div>
    </div>
  )
}

function DorWhatsappLotado() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #F1F3F4', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div className="px-3 py-2 flex items-center justify-between" style={{ background: '#075E54', borderBottom: 'none' }}>
        <div className="flex items-center gap-1.5">
          <IconWhatsapp size={12} className="text-white" />
          <span className="text-[10px] font-semibold text-white">WhatsApp Business</span>
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#25D366', color: '#fff' }}>23 não lidas</span>
      </div>
      <div className="p-2 space-y-1" style={{ background: '#ECE5DD' }}>
        {[
          { nome: 'Ana Clara', msg: 'Oi, tem horário pra drenagem sexta?', hora: '09:12' },
          { nome: 'Beatriz S.', msg: 'Quanto tá o peeling? Pode ser sábado?', hora: '09:34' },
          { nome: 'Carolina M.', msg: 'Preciso remarcar meu microagulhamento', hora: '10:01' },
          { nome: 'Débora', msg: 'Oi!! Tem limpeza de pele hj??', hora: '10:15' },
          { nome: 'Elisa', msg: 'Queria agendar mas não sei os preços', hora: '10:42' },
        ].map((m, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: '#fff', boxShadow: '0 1px 1px rgba(0,0,0,0.06)' }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ background: ['#1A73E8', '#EA4335', '#FBBC04', '#34A853', '#8B5CF6'][i] }}>{m.nome[0]}</div>
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
        Você no meio de um procedimento. Celular vibrando sem parar.
      </div>
    </div>
  )
}

function DorComissaoManual() {
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
          { nome: 'Dra. Camila',   init: 'C', color: '#10B981', prod: 'R$ 8.400', pct: '45%', pagar: 'R$ 3.780' },
          { nome: 'Fernanda',      init: 'F', color: '#8B5CF6', prod: 'R$ 5.200', pct: '40%', pagar: 'R$ 2.080' },
          { nome: 'Patrícia',      init: 'P', color: '#06B6D4', prod: 'R$ 4.100', pct: '40%', pagar: 'R$ ???' },
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
        Produção alta, controle zero. Patrícia sem conferir. Vai dar problema.
      </div>
    </div>
  )
}

export default function EsteticaPage() {
  return (
    <main className="relative overflow-hidden" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* Announcement bar */}
      <div
        className="relative text-center text-[12px] sm:text-sm font-semibold text-white px-4 py-2.5 flex items-center justify-center gap-2"
        style={{
          background: 'linear-gradient(90deg, #064E3B 0%, #10B981 50%, #06B6D4 100%)',
          backgroundSize: '200% 100%',
          animation: 'gradient-flow 10s linear infinite',
        }}
      >
        <IconSpa size={14} className="flex-shrink-0" />
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
              style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}
            >
              <IconSpa size={10} /> Estética
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
                  style={{ background: 'linear-gradient(135deg, #10B981, #34D399)', color: '#fff', letterSpacing: '0.05em' }}
                >
                  NOVO
                </span>
                <span className="text-white/95 font-bold uppercase tracking-wider">SmartAgenda pra clínicas de estética</span>
              </div>

              <h1 className="text-white font-black leading-[1.05] tracking-tight" style={{ fontSize: 'clamp(2.2rem, 7vw, 4.5rem)' }}>
                Microagulhamento de R$350.<br />
                Cliente <span className="text-gradient">não apareceu.</span>
              </h1>

              <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed">
                <strong className="text-white">Com a SmartAgenda, isso não acontece.</strong> Sua cliente agenda pelo link na bio, recebe lembrete automático na véspera e confirma antes de você preparar a sala. Cancelou? A fila de espera preenche a vaga em minutos. Comissão de cada profissional calculada sem planilha. E cada procedimento vira avaliação 5 estrelas no Google — sua clínica sobe no ranking sem pagar ads.
              </p>

              <div className="flex flex-wrap gap-2 sm:gap-3">
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
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)' }}>
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0" style={{ background: 'rgba(59,130,246,0.18)', color: '#3B82F6' }}>
                    <IconClock24 size={14} />
                  </span>
                  <span className="text-left text-[12px] sm:text-[13px] leading-tight">
                    <strong className="text-white">Funciona 24h</strong>
                    <span className="text-slate-500 hidden sm:inline"> · agenda sozinha</span>
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>Reconhece isso?</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Procedimento caro <span className="text-gradient">não pode</span> virar prejuízo.
            </h2>
            <p className="text-base sm:text-lg text-slate-400">
              Ticket alto e agenda manual é a combinação que mais sangra faturamento em clínicas de estética.
            </p>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
            {DORES.map((d, i) => (
              <div key={d.titulo} className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-4 lift-card" style={{ border: `1px solid ${d.accent}30` }}>
                {i === 0 && <DorProcedimentoFalta />}
                {i === 1 && <DorWhatsappLotado />}
                {i === 2 && <DorComissaoManual />}
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
              <IconSparkles size={14} className="text-emerald-400" />
              <span>Os 4 motores da SmartAgenda</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Sistema que <span className="text-gradient">protege</span> cada procedimento.
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
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#10B981' }}><IconWhatsapp size={11} strokeWidth={2} /></span>
                        <div className="flex-1 min-w-0"><span className="text-[10px] text-white font-bold">Lembrete enviado</span><span className="text-[9px] text-slate-500"> · ontem 18:00</span></div>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#06B6D4' }}><IconCheck size={11} strokeWidth={3} /></span>
                        <div className="flex-1 min-w-0"><span className="text-[10px] text-white font-bold">Fernanda confirmou</span><span className="text-[9px] text-slate-500"> · 18:12</span></div>
                      </div>
                      <div className="text-[9px] text-slate-500 px-1 pt-0.5">Microagulhamento de R$350 garantido. Sem você ligar.</div>
                    </div>
                  )}
                  {i === 1 && (
                    <div className="rounded-xl p-3" style={{ background: 'rgba(8,11,24,0.6)', border: `1px solid ${m.color}25` }}>
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                          <IconTrophy size={16} className="text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold text-white">Clínica Estética Camila</div>
                          <div className="text-[9px] text-slate-500">Google Maps · Centro</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mb-1.5">
                        {[1,2,3,4,5].map((s) => (<IconStar key={s} size={12} className={s <= 4 ? 'text-amber-400' : 'text-amber-400/50'} />))}
                        <span className="text-[11px] font-black text-white ml-1">4.9</span>
                        <span className="text-[9px] text-slate-500 ml-1">· 127 avaliações</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-emerald-400 font-bold">+7 avaliações essa semana</span>
                        <span className="text-slate-500">· automático</span>
                      </div>
                    </div>
                  )}
                  {i === 2 && (
                    <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'rgba(8,11,24,0.6)', border: `1px solid ${m.color}25` }}>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#8B5CF6' }}><IconLink size={11} strokeWidth={2.2} /></span>
                        <div className="flex-1 min-w-0"><span className="text-[10px] text-white font-bold">Ana Clara compartilhou o link</span></div>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#06B6D4' }}><IconContacts size={11} strokeWidth={2.2} /></span>
                        <div className="flex-1 min-w-0"><span className="text-[10px] text-white font-bold">Mariana agendou pelo link</span><span className="text-[9px] text-slate-500"> · drenagem ter 14h</span></div>
                      </div>
                      <div className="flex items-center justify-between px-1 pt-0.5 text-[9px]">
                        <span className="text-violet-300 font-bold">+50pts Ana Clara · +50pts Mariana</span>
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
                        <div className="flex-1 min-w-0"><span className="text-[10px] text-red-400 line-through">14:00 — Patrícia cancelou drenagem</span></div>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: `${m.color}10`, border: `1px solid ${m.color}25` }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: m.color }}><IconBolt size={11} strokeWidth={2.4} /></span>
                        <div className="flex-1 min-w-0"><span className="text-[10px] text-white font-bold">Fila acionada</span><span className="text-[9px] text-slate-500"> · 3 notificadas</span></div>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#10B981' }}><IconCheck size={11} strokeWidth={3} /></span>
                        <div className="flex-1 min-w-0"><span className="text-[10px] text-white font-bold">14:00 — Beatriz aceitou</span><span className="text-[9px] text-emerald-400 font-bold"> +R$200</span></div>
                      </div>
                      <div className="text-[9px] text-slate-500 px-1 pt-0.5">Vaga preenchida em <span className="text-white font-bold">5 minutos</span> · sem você tocar no celular</div>
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
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(16,185,129,0.12) 0%, transparent 60%)' }} />
        <div className="container relative px-4">
          <SectionReveal className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconCash size={14} className="text-emerald-400" />
              <span>Controle que clínicas grandes têm</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Cada procedimento rastreado.{' '}<span className="text-gradient">Cada comissão calculada.</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
              Drenagem, limpeza, micro — tudo com valor diferente e comissão diferente. No painel, cada profissional tem produção e pagamento prontos.
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
                    <div className="text-[16px] font-black text-[#202124] mt-0.5">R$ 17.700</div>
                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#188038" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                      <span className="text-[9px] font-bold text-[#188038]">+18%</span>
                    </div>
                  </div>
                  <div className="px-3 py-3 text-center">
                    <div className="text-[9px] text-[#9AA0A6] uppercase tracking-wider font-medium">Procedimentos</div>
                    <div className="text-[16px] font-black text-[#202124] mt-0.5">62</div>
                    <div className="text-[9px] text-[#9AA0A6] mt-0.5">este mês</div>
                  </div>
                  <div className="px-3 py-3 text-center">
                    <div className="text-[9px] text-[#9AA0A6] uppercase tracking-wider font-medium">Ticket médio</div>
                    <div className="text-[16px] font-black text-[#202124] mt-0.5">R$ 285</div>
                    <div className="text-[9px] text-[#9AA0A6] mt-0.5">por procedimento</div>
                  </div>
                </div>
                <div className="px-3 py-2">
                  <div className="text-[10px] font-semibold text-[#5F6368] uppercase tracking-wider mb-1.5 px-1">Comissões</div>
                  <div className="flex items-center gap-2 px-1 py-1 text-[9px] font-medium text-[#9AA0A6]">
                    <span className="flex-1">Profissional</span><span className="w-16 text-right">Produção</span><span className="w-8 text-center">%</span><span className="w-16 text-right">A pagar</span>
                  </div>
                  {[
                    { nome: 'Dra. Camila',  init: 'C', color: '#10B981', prod: 'R$ 8.400', pct: '45%', pagar: 'R$ 3.780' },
                    { nome: 'Fernanda L.',  init: 'F', color: '#8B5CF6', prod: 'R$ 5.200', pct: '40%', pagar: 'R$ 2.080' },
                    { nome: 'Patrícia R.',  init: 'P', color: '#06B6D4', prod: 'R$ 4.100', pct: '40%', pagar: 'R$ 1.640' },
                  ].map((p, i) => (
                    <div key={i} className="flex items-center gap-2 px-1 py-2 rounded-lg" style={{ background: i % 2 === 0 ? '#F9FAFB' : '#fff' }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: p.color }}><span className="text-[9px] font-bold text-white">{p.init}</span></div>
                      <span className="flex-1 text-[11px] font-medium text-[#202124] truncate">{p.nome}</span>
                      <span className="w-16 text-right text-[11px] text-[#202124]">{p.prod}</span>
                      <span className="w-8 text-center text-[10px] text-[#9AA0A6]">{p.pct}</span>
                      <span className="w-16 text-right text-[11px] font-bold text-[#188038]">{p.pagar}</span>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: '#E6F4EA', borderTop: '1px solid #C8E6C9' }}>
                  <span className="text-[11px] font-medium text-[#188038] flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#188038" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Caixa conferido
                  </span>
                  <span className="text-[11px] font-black text-[#188038]">Lucro: R$ 10.200</span>
                </div>
              </div>

              {/* Copy */}
              <div className="space-y-4 sm:space-y-5">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight">
                  Três profissionais, três tabelas de preço.{' '}<span className="text-gradient">Tudo automático.</span>
                </h3>
                <ul className="space-y-3 text-sm sm:text-base text-slate-300">
                  {[
                    { icon: <IconCash size={14} />, txt: 'Faturamento por dia, semana e mês. Atualizado em tempo real.' },
                    { icon: <IconContacts size={14} strokeWidth={2} />, txt: 'Produção e comissão de cada profissional. Zero conta de cabeça.' },
                    { icon: <IconBrain size={14} strokeWidth={2} />, txt: 'Ticket médio por procedimento. Sabe qual dá mais resultado.' },
                    { icon: <IconCheck size={14} strokeWidth={2} />, txt: 'Fim do mês: abre o celular, vê quanto deve pra cada uma. Pronto.' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-lg inline-flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#34D399' }}>{item.icon}</span>
                      <span>{item.txt}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Na seção de dor você viu: <strong className="text-slate-300">comissão sem conferir, profissional reclamando.</strong> Aqui é o painel que resolve isso em 10 segundos.
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
              Sua clínica no <span className="text-gradient">piloto automático</span>.
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

      <CTAInline titulo="Esse dia pode ser amanhã" sub="Cadastre hoje. Amanhã sua clínica já funciona diferente." />

      {/* ═══════════ 6. COMPARAÇÃO ═══════════ */}
      <section className="relative py-16 sm:py-20 lg:py-28">
        <div className="container max-w-6xl px-4">
          <SectionReveal className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconFace size={14} className="text-emerald-400" />
              <span>SmartAgenda x Outros apps</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Outros apps <span className="text-slate-500">só agendam</span>.<br /><span className="text-gradient">SmartAgenda protege seu faturamento.</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              No ticket de R$200+, uma falta dói diferente. Veja o que acontece quando a cliente cancela.
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
              <span>Planos pra clínica de estética</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Menos que <span className="text-gradient">uma limpeza de pele</span> por mês.
            </h2>
            <p className="text-base sm:text-lg text-slate-400">
              Uma falta a menos por mês já paga o plano 3 vezes. Faça a conta.
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
                  { item: 'Agenda online pra clínica (Trinks, Booksy)', price: 'R$ 119/mês' },
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
                <span className="text-sm sm:text-base font-black text-white line-through">R$ 286/mês</span>
              </div>
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t" style={{ borderColor: 'rgba(16,185,129,0.3)', background: 'linear-gradient(90deg, rgba(16,185,129,0.1), rgba(6,182,212,0.08))' }}>
                <span className="text-sm sm:text-base font-black text-gradient">AgendaPRO tudo junto</span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-md" style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#34D399' }}>-77%</span>
                  <span className="text-base sm:text-lg font-black text-white">a partir de R$ 67/mês</span>
                </div>
              </div>
            </div>
          </SectionReveal>

          {/* Cards de plano */}
          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto items-start">
            {/* Solo */}
            <div className="glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 lift-card">
              <div className="flex items-start justify-between mb-5">
                <div><h3 className="text-xl sm:text-2xl font-black text-white mb-1">Solo</h3><p className="text-slate-400 text-xs sm:text-sm">1 a 2 profissionais</p></div>
                <div className="text-emerald-400"><IconSpa size={28} /></div>
              </div>
              <div className="mb-5 sm:mb-6">
                <div className="flex items-baseline gap-2"><span className="text-4xl sm:text-5xl font-black text-white">R$67</span><span className="text-slate-400 text-sm">/mês</span></div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-slate-500 text-xs line-through">R$97</span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md inline-flex items-center gap-1" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#34D399' }}><IconBolt size={10} strokeWidth={2.5} />Economia R$219/mês</span>
                </div>
                <p className="text-slate-500 text-[11px] mt-2 flex items-center gap-1.5"><IconClock24 size={11} strokeWidth={2} />R$2,23/dia — menos que um café</p>
              </div>
              <div className="rounded-xl px-3 py-2.5 mb-5 text-[11px] sm:text-xs" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <span className="text-slate-300">1 falta a menos/mês no ticket de R$250 = </span><span className="text-white font-black">R$250 salvos</span><span className="text-slate-300">. AgendaPRO = R$67. </span><span className="font-black" style={{ color: '#34D399' }}>Sobra R$183.</span>
              </div>
              <ul className="space-y-2.5 mb-4 text-xs sm:text-sm text-slate-300">
                {['Link pra bio do Insta e Google', 'Lembrete automático anti-falta', 'Fila de espera pra cancelamentos', 'Sistema de pontos + indicação', 'Google Reviews integrado', 'Lista de clientes completa', 'Relatório financeiro por profissional'].map((item) => (
                  <li key={item} className="flex items-start gap-2.5"><span className="text-emerald-400 mt-0.5 flex-shrink-0"><IconCheck size={14} /></span><span>{item}</span></li>
                ))}
              </ul>
              <Link href="/cadastro" className="btn btn-primary-v2 btn-shimmer w-full justify-center font-bold text-sm sm:text-base px-5 py-3.5 min-h-[48px]"><span className="relative z-10">Pegar acesso gratuito</span></Link>
            </div>

            {/* Equipe */}
            <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 relative lift-card md:scale-[1.03] md:origin-top" style={{ background: 'linear-gradient(180deg, rgba(139,92,246,0.12) 0%, rgba(8,11,24,0.85) 50%, rgba(8,11,24,0.95) 100%)', border: '1px solid rgba(139,92,246,0.45)', boxShadow: '0 25px 80px rgba(139,92,246,0.3), 0 0 0 1px rgba(139,92,246,0.1), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
              <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5), transparent 70%)', filter: 'blur(40px)' }} aria-hidden />
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 pill-glow text-[10px] sm:text-xs whitespace-nowrap"><IconStar size={10} className="text-amber-300" /> MAIS POPULAR</div>
              <div className="flex items-start justify-between mb-5 mt-2 relative z-10">
                <div><h3 className="text-xl sm:text-2xl font-black text-white mb-1">Equipe</h3><p className="text-slate-400 text-xs sm:text-sm">3 a 5 profissionais</p></div>
                <div className="text-violet-400"><IconDroplet size={28} /></div>
              </div>
              <div className="mb-5 sm:mb-6 relative z-10">
                <div className="flex items-baseline gap-2"><span className="text-4xl sm:text-5xl font-black text-gradient">R$107</span><span className="text-slate-400 text-sm">/mês</span></div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-slate-500 text-xs line-through">R$147</span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md inline-flex items-center gap-1" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#34D399' }}><IconBolt size={10} strokeWidth={2.5} />Economia R$219/mês</span>
                </div>
                <p className="text-slate-500 text-[11px] mt-2 flex items-center gap-1.5"><IconClock24 size={11} strokeWidth={2} />R$3,57/dia — por profissional sai R$0,71/dia</p>
              </div>
              <div className="rounded-xl px-3 py-2.5 mb-5 text-[11px] sm:text-xs relative z-10" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)' }}>
                <span className="text-slate-300">3 profissionais x 1 falta salva/mês = </span><span className="text-white font-black">R$750 recuperados</span><span className="text-slate-300">. Plano = R$107. </span><span className="font-black" style={{ color: '#34D399' }}>ROI de 7x.</span>
              </div>
              <ul className="space-y-2.5 mb-6 text-xs sm:text-sm text-slate-300 relative z-10">
                {['Tudo do Solo', 'Até 5 profissionais com agenda separada', 'Comissão automática por profissional', 'Lista de clientes compartilhada', 'Financeiro consolidado da clínica', 'Suporte prioritário no WhatsApp'].map((item) => (
                  <li key={item} className="flex items-start gap-2.5"><span className="text-cyan-400 mt-0.5 flex-shrink-0"><IconCheck size={14} /></span><span>{item}</span></li>
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
              <span style={{ color: '#10B981' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>
              </span>
              <span>Perguntas frequentes</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Tudo que você precisa saber <span className="text-gradient">antes de começar.</span>
            </h2>
          </SectionReveal>
          <SectionReveal><FAQ items={ESTETICA_FAQS} /></SectionReveal>
        </div>
      </section>

      {/* ═══════════ 10. CTA FINAL ═══════════ */}
      <section className="relative py-20 sm:py-28 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(16,185,129,0.28) 0%, transparent 60%)' }} />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 40%, rgba(6,182,212,0.2) 0%, transparent 60%)' }} />
        </div>
        <div className="container relative max-w-4xl px-4">
          <SectionReveal className="text-center">
            <div className="pill-glow mb-5 sm:mb-6 animate-pulse-glow inline-flex items-center gap-2 text-xs sm:text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Preço de lançamento — por tempo limitado</span>
            </div>
            <h2 className="text-white font-black mb-5 sm:mb-6 leading-[1.05]" style={{ fontSize: 'clamp(2rem, 7vw, 4rem)' }}>
              Enquanto você lê isso,<br />alguém pesquisou<br /><span className="text-gradient">&quot;clínica de estética perto de mim&quot;</span><br />e agendou com outra.
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
              5 minutos de setup. Link na bio. Amanhã de manhã você chega na clínica com a agenda preenchida — sem ter respondido uma mensagem sequer.
            </p>
          </SectionReveal>

          <SectionReveal className="mb-10 sm:mb-12 max-w-md mx-auto">
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(8,11,24,0.8)', border: '1px solid rgba(16,185,129,0.3)', boxShadow: '0 20px 60px rgba(16,185,129,0.2)' }}>
              <div className="flex items-center justify-between px-4 py-2 border-b text-[10px]" style={{ borderColor: 'rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.06)' }}>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-white font-bold">SmartAgenda</span></span>
                <span className="text-slate-500">agora mesmo</span>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
                  <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#06B6D4', boxShadow: '0 0 8px rgba(6,182,212,0.5)' }}><IconContacts size={11} strokeWidth={2.4} /></span>
                  <div className="flex-1 min-w-0"><span className="text-[11px] text-white font-bold">23:15</span><span className="text-[10px] text-slate-400"> — Fernanda agendou drenagem + peeling pra amanhã 09h</span></div>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#10B981', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }}><IconCheck size={11} strokeWidth={3} /></span>
                  <div className="flex-1 min-w-0"><span className="text-[11px] text-white font-bold">23:15</span><span className="text-[10px] text-slate-400"> — Confirmação automática enviada</span></div>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0" style={{ background: '#8B5CF6', boxShadow: '0 0 8px rgba(139,92,246,0.5)' }}><IconClock24 size={11} strokeWidth={2.4} /></span>
                  <div className="flex-1 min-w-0"><span className="text-[11px] text-white font-bold">23:15</span><span className="text-[10px] text-slate-400"> — Lembrete anti-falta programado pra amanhã 18h</span></div>
                </div>
              </div>
              <div className="px-4 py-2 text-[10px] text-center border-t" style={{ borderColor: 'rgba(16,185,129,0.15)', background: 'rgba(16,185,129,0.04)' }}>
                <span className="text-slate-400">Tudo isso aconteceu </span><span className="text-white font-bold">enquanto a dona dormia.</span>
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
            <Link href="/cadastro" className="btn btn-primary-v2 btn-shimmer inline-flex font-black text-base sm:text-lg px-8 py-4 sm:py-5 min-h-[56px]" style={{ boxShadow: '0 0 40px rgba(16,185,129,0.5), 0 0 80px rgba(6,182,212,0.3)' }}>
              <span className="relative z-10 flex items-center gap-2">Quero minha SmartAgenda agora<IconArrowRight size={20} /></span>
            </Link>
            <p className="text-slate-400 text-xs sm:text-sm mt-4 sm:mt-5 max-w-md mx-auto">
              14 dias grátis. Depois R$67/mês no plano Solo.<br /><span className="text-slate-500">Suporte direto com a Impulso Digital pelo WhatsApp.</span>
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
                <Link href="/nail" className="block text-slate-400 hover:text-white transition-colors">Nail</Link>
                <Link href="/estetica" className="block text-slate-300 hover:text-white transition-colors">Estética</Link>
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
