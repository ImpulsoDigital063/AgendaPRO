import type { Metadata } from 'next'
import Link from 'next/link'
import FAQ from '@/components/FAQ'
import { JsonLd, faqJsonLd, breadcrumbJsonLd, softwareApplicationJsonLd, organizationJsonLd, SITE_URL } from '@/lib/jsonld'
import { redirectIfLoggedIn } from '@/lib/auth-guard'

export const metadata: Metadata = {
  title: 'AgendaPRO para Barbearias — Agenda Online com Lembrete Automático',
  description: 'Sistema de agendamento online para barbearias. Cliente agenda pelo link, recebe lembrete por e-mail, fila de espera preenche cancelamentos. A partir de R$67/mês, sem setup. 7 dias grátis, sem cartão.',
  openGraph: {
    title: 'AgendaPRO para Barbearias',
    description: 'Seu cliente agenda sozinho pelo link na bio. Lembrete automático, fila de espera e Google Reviews integrado.',
  },
}
import type { FAQItem } from '@/components/FAQ'
import Image from 'next/image'
import IPhoneMockup from '@/components/IPhoneMockup'
import { TimelineMicroUI, DorMicroUI } from '@/components/LandingMicroUI'
import ComparisonMiniUIs from '@/components/ComparisonMiniUIs'
import PricingModalidades from '@/components/lp/PricingModalidades'
import ComparativoConcorrentes from '@/components/lp/ComparativoConcorrentes'
import VendasEstoque from '@/components/lp/VendasEstoque'
import ComandaComissao from '@/components/lp/ComandaComissao'
import EquipeAcesso from '@/components/lp/EquipeAcesso'
import AdequacaoNegocio from '@/components/lp/AdequacaoNegocio'
import QuemUsa from '@/components/lp/QuemUsa'
import Pacotes from '@/components/lp/Pacotes'
import FinanceDashboard from '@/components/lp/FinanceDashboard'
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
   LP BARBEARIA — AgendaPRO
   Persona: barbeiro 25-45, dono de 1-3 cadeiras.
   Tudo SVG, mobile-first, com movimento.
═══════════════════════════════════════════════════════════ */

const DORES = [
  { kind: 'whatsapp' as const, titulo: 'O WhatsApp não para de tocar', detalhe: '40 mensagens por dia perguntando se tem horário às 15h. Você para a tesoura, responde, volta. Repete o dia inteiro.', accent: '#06B6D4', stat: '40+', statLabel: 'msg/dia' },
  { kind: 'caderno'  as const, titulo: 'Agenda bagunçada, cliente sumiu', detalhe: 'Marcou no papel, esqueceu de confirmar. Cliente não veio. Cadeira vazia 40 minutos. Perdeu R$50 e nem percebeu.', accent: '#8B5CF6', stat: 'R$50', statLabel: 'perdidos/falta' },
  { kind: 'queda'    as const, titulo: 'Sem controle do que entra e sai', detalhe: 'Fim do mês chega e você não sabe quanto cada barbeiro fez, quanto deve de comissão, nem se o caixa fecha. Controle zero.', accent: '#EC4899', stat: '-32%', statLabel: 'faturamento' },
]

const MOTORES = [
  { Icon: IconBrain,   tag: 'Atendimento',   titulo: 'Confirma e lembra sozinha',       desc: 'Lembrete automático por e-mail na véspera do horário. Cliente confirma, fila avança ou recua, agenda do dia chega na sua mão limpa.', color: '#06B6D4', stat: 'D-1',  statLabel: 'lembrete por e-mail' },
  { Icon: IconTrophy,  tag: 'Ranking',        titulo: 'Sobe no Google sem pagar',        desc: 'Cliente sai do corte, ganha pontos pra avaliar no Google. Sua nota sobe, o Maps te coloca em cima da concorrência.',              color: '#F59E0B', stat: '5★',  statLabel: 'avaliação no Google' },
  { Icon: IconLink,    tag: 'Multiplicação',  titulo: 'Transforma cliente em vendedor',  desc: 'Link de indicação único por cliente. Quando o amigo agenda e paga, quem indicou ganha pontos. Cliente vira promotor.',        color: '#8B5CF6', stat: 'link',  statLabel: 'de indicação rastreado' },
  { Icon: IconBolt,    tag: 'Recuperação',    titulo: 'Preenche cancelamento sozinha',   desc: 'Cancelou 10:00? O sistema chama a fila de espera por e-mail. Quem aceitar primeiro fica com a vaga.',                          color: '#A78BFA', stat: 'fila', statLabel: 'de espera inclusa' },
  { Icon: IconGift,    tag: 'Reativação',     titulo: 'Cliente sumido volta sozinho',    desc: 'Detecta quem ficou 40+ dias sem aparecer e deixa o cupom de desconto pronto — você envia no WhatsApp com 1 clique, sem digitar nada.', color: '#10B981', stat: '40d', statLabel: 'sem aparecer' },
]

const TIMELINE = [
  { kind: '07' as const, hora: '07:30', titulo: 'Você acorda com a agenda cheia',     detalhe: 'Cliente agendou 23:47 pela bio do Insta. AgendaPRO confirmou sozinha.' },
  { kind: '10' as const, hora: '10:00', titulo: 'Pedro cancelou — fila assumiu',      detalhe: 'O AgendaPRO chamou Marcos da fila. Ele aceitou em 3 minutos.' },
  { kind: '14' as const, hora: '14:00', titulo: 'João completou 10º corte',           detalhe: 'Recompensa liberada, ele compartilhou. 2 amigos já agendaram pelo link.' },
  { kind: '20' as const, hora: '20:00', titulo: 'Fim do expediente',                  detalhe: 'R$560 no caixa. 3 avaliações 5★ novas. Sua nota subiu pra 4.9.' },
]

/* ═══ FAQs específicas de Barbearia — ordenadas por jornada de decisão ═══ */

const BARBER_FAQS: FAQItem[] = [
  /* ── RISCO / PREÇO (fecha primeiro) ── */
  {
    q: 'O barbeiro pode receber o pagamento do cliente?',
    a: 'Pode, se você liberar. Ele fecha a comanda em PIX, dinheiro ou cartão — parcelado, com a taxa da maquininha já descontada. Serve pra barbearia sem recepção, onde quem corta é quem recebe. Cancelar atendimento já pago continua só com você.',
  },
  {
    q: 'Vendo pomada e óleo. O sistema controla?',
    a: 'Controla, no plano Equipe. O produto entra na mesma comanda do corte e baixa do estoque sozinho. Você vê quanto sobrou de cada item e quanto aquilo rendeu no mês — sem anotar em caderno.',
  },
  {
    q: 'Vocês adaptam o sistema pra minha barbearia?',
    a: 'Sim, e é o que mais fazemos. A gente estuda como sua barbearia funciona de verdade e ajusta o sistema pra aquilo. A Barbearia Olímpio usa todo dia desde maio — boa parte do que existe hoje no AgendaPRO saiu do uso real dela.',
  },
  {
    q: 'Como funciona a garantia?',
    a: 'São 7 dias grátis, sem cartão. Você cadastra, usa com cliente de verdade e só decide depois. Se continuar, escolhe o plano e paga — e mesmo aí tem 7 dias de garantia: se não fizer sentido, devolvo sem burocracia.',
  },
  {
    q: 'Quanto custa?',
    a: 'Solo R$ 67/mês (admin + 1 colaborador) ou Equipe R$ 97/mês (até 5 profissionais). Sem setup, sempre · preço fixo. Sem fidelidade, garantia de 7 dias.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim. Sem multa, sem fidelidade, sem contrato anual. Cancela pelo painel ou pelo WhatsApp em 1 clique. Se voltar depois, seus dados continuam lá.',
  },
  {
    q: 'Como funciona o pagamento? Quais formas de pagar?',
    a: '4 jeitos: (1) Cartão automático todo mês — você não precisa lembrar. (2) PIX mensal — a gente avisa 3 dias antes. (3) Semestral à vista no PIX — Solo R$ 350 (economiza R$ 52) ou Equipe R$ 500 (economiza R$ 82). (4) Anual à vista no PIX — Solo R$ 670 ou Equipe R$ 970 (economiza ~17%, equivale a 2 meses grátis). No cadastro você escolhe qual.',
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
    a: 'O sistema manda confirmação e lembrete no WhatsApp do cliente sozinho, pelo canal oficial da Meta — sem risco de bloqueio, porque não é disparo em massa por número pessoal. O cliente confirma pelo botão e a agenda atualiza sozinha. Sai do número oficial do AgendaPRO, com o nome da sua barbearia na mensagem e o seu telefone para resposta. É um adicional: você contrata um pacote de mensagens a partir de R$ 7,90 por mês e liga só os avisos que quiser. Sem contratar, o lembrete por e-mail continua funcionando e você também manda pelo WhatsApp com 1 clique, do seu próprio número.',
  },
  {
    q: 'E se alguém cancelar em cima da hora?',
    a: 'A fila de espera entra em ação automática. O sistema avisa os próximos da fila e quem aceitar primeiro fica com a vaga. Horário preenchido em minutos — sem você fazer nada.',
  },
  {
    q: 'Tenho 3 barbeiros. Cada um tem agenda separada?',
    a: 'Sim. No plano Equipe (R$97), cada barbeiro tem agenda, horários e comissão independentes — e entra com o login dele pelo celular. Você decide o que ele pode fazer: marcar só na agenda dele, marcar também pros colegas, receber o pagamento do cliente. O Equipe ainda inclui 1 recepcionista com tela própria (marca e fecha caixa sem ver seu faturamento) e libera venda de produto com controle de estoque.',
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
    a: 'Eles são agenda online. O AgendaPRO vai além: fila de espera automática, fidelidade com pontos, link de indicação rastreado e Google Reviews integrado. Nenhum deles faz essas 4 coisas. E custa menos.',
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
            Começar agora
            <IconArrowRight size={18} />
          </span>
        </Link>
      </div>
    </div>
  )
}

export default async function BarbeariaPage() {
  await redirectIfLoggedIn()
  const dados = [
    organizationJsonLd(),
    softwareApplicationJsonLd(),
    faqJsonLd(BARBER_FAQS, `${SITE_URL}/barbearia`),
    breadcrumbJsonLd([
      { nome: 'AgendaPRO', url: `${SITE_URL}/` },
      { nome: 'Barbearia', url: `${SITE_URL}/barbearia` },
    ]),
  ]

  return (
    <main className="relative overflow-hidden" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      <JsonLd data={dados} />

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
        <span>Solo R$67/mês ou Equipe R$97/mês — <strong>sem setup, sem fidelidade</strong>. 7 dias grátis, sem cartão.</span>
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

            {/* Coluna esquerda — copy */}
            <SectionReveal className="flex flex-col items-center lg:items-start text-center lg:text-left gap-5 sm:gap-6 lg:gap-7">
              {/* Pill — preço fixo, sem fidelidade */}
              <div className="pill inline-flex items-center gap-2 text-[10px] sm:text-xs">
                <span
                  className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black"
                  style={{
                    background: 'linear-gradient(135deg, #06B6D4, #5EEAD4)',
                    color: '#0B0F1F',
                    letterSpacing: '0.05em',
                  }}
                >
                  R$ 67
                </span>
                <span className="text-white/95 font-bold uppercase tracking-wider">Sem setup · Sem fidelidade</span>
              </div>

              {/* H1 — headline cirúrgica: perda financeira específica */}
              <h1 className="text-white font-black leading-[1.05] tracking-tight" style={{ fontSize: 'clamp(2.2rem, 7vw, 4.5rem)' }}>
                Sua agenda<br />
                vaza{' '}
                <span style={{ color: '#F59E0B' }}>R$ 1.200</span><br className="hidden sm:block" />
                todo mês.
              </h1>

              {/* Subhead — transformação concreta + cota fechada com ganho real */}
              <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed">
                O AgendaPRO tira você do WhatsApp e bota o cliente pra agendar sozinho pelo link da bio — com lembrete antes do corte e fila de espera quando alguém cancela. <strong className="text-white">O dinheiro que vazava volta pro caixa.</strong>
              </p>

              {/* Stats — números específicos de impacto financeiro */}
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <div
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.25)',
                  }}
                >
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0" style={{ background: 'rgba(16,185,129,0.18)', color: '#10B981' }}>
                    <IconCash size={14} />
                  </span>
                  <span className="text-left text-[12px] sm:text-[13px] leading-tight">
                    <strong className="text-white">+R$ 1.200/mês</strong>
                    <span className="text-slate-500 hidden sm:inline"> · fila + lembrete</span>
                  </span>
                </div>
                <div
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{
                    background: 'rgba(6,182,212,0.08)',
                    border: '1px solid rgba(6,182,212,0.25)',
                  }}
                >
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0" style={{ background: 'rgba(6,182,212,0.18)', color: '#06B6D4' }}>
                    <IconCheck size={14} />
                  </span>
                  <span className="text-left text-[12px] sm:text-[13px] leading-tight">
                    <strong className="text-white">8 horários/mês</strong>
                    <span className="text-slate-500 hidden sm:inline"> · salvos da falta</span>
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
                    <span className="text-slate-500 hidden sm:inline"> · após cada corte</span>
                  </span>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                <Link
                  href="/cadastro"
                  className="btn btn-primary-v2 btn-shimmer w-full sm:w-auto justify-center font-black text-base px-6 py-4 min-h-[52px]"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Garantir minha vaga
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

              {/* Ancoragem de mercado — empilha valor antes do preço aparecer no scroll */}
              <p className="text-xs sm:text-sm text-slate-400 max-w-md">
                A partir de R$ 67/mês · Cancela quando quiser · 7 dias grátis, sem cartão.{' '}
                <span className="text-slate-500">
                  Trinks/ZenPlace cobram R$ 200-500 com fidelidade anual — aqui é livre.
                </span>
              </p>
            </SectionReveal>

            {/* Coluna direita — iPhone mockup variant barbearia */}
            <SectionReveal className="flex justify-center lg:justify-end mt-4 lg:mt-0">
              <div className="relative">
                <IPhoneMockup variant="barbearia" />
              </div>
            </SectionReveal>

          </div>
        </div>
      </section>

      {/* ═══════════ 1.5 GENTE REAL — barbeiros que estão usando ═══════════ */}
      <section className="relative overflow-hidden">
        <div className="container px-4 py-10 sm:py-14">
          <SectionReveal>
            <div
              className="relative rounded-3xl overflow-hidden"
              style={{
                border: '1px solid rgba(245,158,11,0.18)',
                boxShadow: '0 30px 80px -30px rgba(245,158,11,0.35)',
              }}
            >
              <div className="grid md:grid-cols-2 items-stretch min-h-[320px] md:min-h-[420px]">
                {/* Foto real do barbeiro */}
                <div className="relative h-64 md:h-auto">
                  <Image
                    src="/images/lp/barbearia.jpg"
                    alt="Barbeiro fazendo corte de cabelo com tesoura em ambiente profissional"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    priority
                  />
                  {/* Tint quente da brand barbearia */}
                  <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(245,158,11,0.18) 0%, transparent 60%)',
                    }}
                  />
                  {/* Borda radial pra desktop */}
                  <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none md:hidden"
                    style={{
                      background:
                        'linear-gradient(180deg, transparent 50%, rgba(5,7,19,0.8) 100%)',
                    }}
                  />
                </div>

                {/* Texto */}
                <div
                  className="relative p-6 sm:p-8 md:p-10 flex flex-col justify-center"
                  style={{
                    background:
                      'linear-gradient(135deg, #1a0e05 0%, #0b0405 60%, #050208 100%)',
                  }}
                >
                  <div
                    className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-[10px] font-black tracking-[0.18em] uppercase mb-4 self-start"
                    style={{
                      background: 'rgba(245,158,11,0.12)',
                      border: '1px solid rgba(245,158,11,0.3)',
                      color: '#F59E0B',
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#F59E0B' }} />
                    Feito pra barbearia
                  </div>

                  <h2 className="text-white font-black mb-3 leading-tight" style={{ fontSize: 'clamp(1.4rem, 4vw, 2.2rem)' }}>
                    Quem corta cabelo<br />
                    <span style={{ color: '#F59E0B' }}>não tem tempo</span> de digitar.
                  </h2>

                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-5">
                    Cada minuto que você passa no WhatsApp confirmando horário é minuto que sai da cadeira. O AgendaPRO foi feito pra barbeiro que prefere passar a máquina do que mexer no celular.
                  </p>

                  <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-2">
                    {[
                      { kpi: '24h', label: 'Cliente agenda sozinho' },
                      { kpi: 'R$67', label: 'Por mês, sem fidelidade' },
                      { kpi: '7 dias', label: 'Garantia incondicional' },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="rounded-xl p-2 sm:p-2.5 text-center"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <div className="font-mono font-black text-base sm:text-lg leading-none" style={{ color: '#F59E0B' }}>
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
        titulo="O AgendaPRO resolve tudo isso por você"
        sub="Setup em 5 minutos. 7 dias grátis, sem cartão. Sem fidelidade — cancela quando quiser."
      />


      {/* ═══════════ 3. MOTORES ═══════════ */}
      <section id="mecanismos" className="relative py-16 sm:py-20 lg:py-28">
        <div className="container px-4">
          <SectionReveal className="text-center mb-10 sm:mb-14 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconClipper size={14} className="text-blue-400" />
              <span>Os 5 motores do AgendaPRO</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Sistema que <span className="text-gradient">trabalha</span> enquanto você corta.
            </h2>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {MOTORES.map((m, i) => (
              <div
                key={m.titulo}
                className={`rounded-2xl sm:rounded-3xl p-5 sm:p-7 flex flex-col gap-3 lift-card relative overflow-hidden${i === MOTORES.length - 1 ? ' md:col-span-2' : ''}`}
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

      {/* ═══════════ 3.5 COMPARAÇÃO (reposicionada — antes era seção 6) ═══════════ */}
      <section className="relative py-16 sm:py-20 lg:py-28">
        <div className="container max-w-6xl px-4">
          <SectionReveal className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconChair size={14} className="text-pink-400" />
              <span>AgendaPRO x Outros apps</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Outros apps <span className="text-slate-500">só agendam</span>.<br />
              <span className="text-gradient">AgendaPRO trabalha.</span>
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

      {/* ═══════════ 3.6 COMPARATIVO FEATURES (reposicionado — antes era 6.5) ═══════════ */}
      <section className="relative py-16 sm:py-20 lg:py-24">
        <SectionReveal>
          <ComparativoConcorrentes accent="cyan" concorrentes={['Trinks', 'Booksy', 'BarberApp']} />
        </SectionReveal>
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
              Chega de planilha, caderninho e conta de cabeça. O AgendaPRO calcula tudo: faturamento, comissão por barbeiro e relatório pronto pra você.
            </p>
          </SectionReveal>

          <SectionReveal>
            <div className="grid lg:grid-cols-[1.15fr_1fr] gap-6 lg:gap-8 items-center max-w-5xl mx-auto">

              {/* Dashboard financeiro com despesas + gráfico + projeção */}
              <FinanceDashboard variant="barbearia" />

              {/* Copy */}
              <div className="space-y-4 sm:space-y-5">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight">
                  Faturamento é fácil.{' '}
                  <span className="text-gradient">Lucro líquido</span> separa o profissional do amador.
                </h3>

                <ul className="space-y-3 text-sm sm:text-base text-slate-300">
                  {[
                    { icon: <IconCash size={14} />, txt: 'Despesas categorizadas (aluguel, produtos, energia, salários) somadas automático — você sabe pra onde cada R$ vai.' },
                    { icon: <IconBrain size={14} strokeWidth={2} />, txt: 'Lucro líquido = receita − despesa, em tempo real. Não é só faturamento — é o que sobra de verdade.' },
                    { icon: <IconContacts size={14} strokeWidth={2} />, txt: 'Comissão por barbeiro calculada sozinha. Fim do mês: abre, vê, paga. Sem conta de cabeça.' },
                    { icon: <IconCheck size={14} strokeWidth={2} />, txt: 'Projeção 30 dias: ao ritmo atual, você sabe quanto vai fechar antes do mês acabar.' },
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
                  <strong className="text-slate-300">Concorrente mostra só faturamento.</strong> Aqui você vê despesas categorizadas, lucro líquido real e projeção do mês — nível Conta Azul, sem pagar Conta Azul.
                </p>
              </div>

            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 4.55 COMANDA · PAGAMENTO · COMISSAO ═══════════ */}
      <ComandaComissao variant="barbearia" />

      {/* ═══════════ 4.6 VENDAS + ESTOQUE ═══════════ */}
      <VendasEstoque variant="barbearia" />

      {/* ═══════════ 4.7 PACOTES ═══════════ */}
      <Pacotes variant="barbearia" />

      {/* ═══════════ 4.8 EQUIPE & ACESSO ═══════════ */}
      <EquipeAcesso variant="barbearia" />

      {/* ADEQUACAO AO NEGOCIO · o diferencial que nao e software (01/08) */}
      <AdequacaoNegocio variant="barbearia" />

      <QuemUsa variant="barbearia" />

      {/* ═══════════ 5. TIMELINE ═══════════ */}
      <section className="relative py-16 sm:py-20 lg:py-28">
        <div className="container px-4">
          <SectionReveal className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconClock24 size={14} className="text-cyan-400" />
              <span>Como seu dia fica com o AgendaPRO</span>
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

      {/* ═══════════ 7. PASSOS ═══════════ */}
      <section className="relative py-16 sm:py-20 lg:py-28">
        <div className="container px-4">
          <SectionReveal className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto">
            <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
              <IconBolt size={14} className="text-emerald-400" />
              <span>3 passos · 5 minutos · zero técnico</span>
            </div>
            <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              Cadastra agora. <span className="text-gradient">Cliente agenda hoje à noite.</span>
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
              Se 1 cliente da fila voltar essa semana, o AgendaPRO já se pagou.
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

          {/* ── 4 modalidades de pagamento (cartão + 3 PIX) ── */}
          <SectionReveal>
            <PricingModalidades accent="cyan" defaultPlano="equipe" />
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
                    7 dias grátis
                  </span>
                  <span className="flex items-center gap-1">
                    <IconCheck size={11} strokeWidth={3} className="text-emerald-400" />
                    Preço travado vitalício
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
                  <span className="text-white font-bold">AgendaPRO</span>
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
              { ico: <IconCheck size={12} strokeWidth={3} />, t: '7 dias grátis, sem cartão' },
              { ico: <IconClock24 size={12} strokeWidth={2.2} />, t: '5 minutos pra configurar' },
              { ico: <IconCash size={12} strokeWidth={2.2} />, t: 'R$1,60/dia no Solo' },
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
                Quero minho AgendaPRO agora
                <IconArrowRight size={20} />
              </span>
            </Link>
            <p className="text-slate-400 text-xs sm:text-sm mt-4 sm:mt-5 max-w-md mx-auto">
              R$67/mês no plano Solo, sem setup. 7 dias grátis, sem cartão.<br />
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
                O AgendaPRO dos negócios de serviço. Atende, lembra, fideliza e sobe seu ranking no Google.
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
                <Link href="/respostas" className="block text-slate-400 hover:text-white transition-colors">Respostas</Link>
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
