import Link from 'next/link'
import Image from 'next/image'
import FAQ from '@/components/FAQ'
import { redirectIfLoggedIn } from '@/lib/auth-guard'
import AgendaDesktopMockup from '@/components/AgendaDesktopMockup'
import IPhoneMockup from '@/components/IPhoneMockup'
import { MechanismCard } from '@/components/MechanismCard'
import { TimelineMicroUI, DorMicroUI, PassoMicroUI } from '@/components/LandingMicroUI'
import ComparisonMiniUIs from '@/components/ComparisonMiniUIs'
import ComparativoConcorrentes from '@/components/lp/ComparativoConcorrentes'
import FinanceDashboard from '@/components/lp/FinanceDashboard'
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

const MOTORES = ['fidelidade', 'fila', 'indicacao', 'reviews', 'reativacao'] as const

/**
 * Value Stack (padrão Hormozi $100M Offers): empilha tudo que o cliente
 * teria que pagar se fosse comprar separado, mostra o total inflado, e
 * ancora o R$67/mês como pechincha.
 *
 * 4 ferramentas-núcleo (substituíveis) + 4 bônus que parecem caros
 * (não substituíveis — só aqui).
 */
// Atualizado 01/08/2026: o stack listava 4 ferramentas e ancorava em R$680,
// mas o produto passou a cobrir caixa/PDV, painel de equipe com comissão,
// prontuário (ficha + foto) e estoque. Cada linha aqui existe de verdade no
// sistema — nada aspiracional.
const VALUE_CORE = [
  { item: 'Agenda online (Trinks, iSalon, Booksy)',            price: 'R$ 89/mês' },
  { item: 'Caixa e comanda com maquininha e taxa de cartão',   price: 'R$ 129/mês' },
  { item: 'Painel por profissional com comissão automática',   price: 'R$ 119/mês' },
  { item: 'Ficha da cliente: anamnese, foto antes/depois',     price: 'R$ 79/mês' },
  { item: 'Controle de estoque e venda de produto',            price: 'R$ 69/mês' },
  { item: 'Programa de fidelidade com pontos',                 price: 'R$ 49/mês' },
  { item: 'Sistema de indicação rastreada por cliente',        price: 'R$ 79/mês' },
  { item: 'Gestão de avaliações Google Reviews',               price: 'R$ 39/mês' },
]

const VALUE_BONUS = [
  { item: 'Lista de espera automática (preenche cancelamento)',  price: 'R$ 39/mês' },
  { item: 'Reativação de sumidos (detecta + cupom pronto)',      price: 'R$ 89/mês' },
  { item: 'Pacotes e combos com saldo de sessões',               price: 'R$ 59/mês' },
  { item: 'Despesas, lucro real e projeção do mês',              price: 'R$ 99/mês' },
  { item: 'Página personalizada do seu negócio (link próprio)',  price: 'R$ 99/mês' },
  { item: 'Setup guiado em 5 minutos com o fundador',            price: 'R$ 197 setup' },
  { item: 'Suporte direto com quem escreve o código (WhatsApp)',  price: 'R$ 199/mês' },
  { item: 'Adequação do sistema ao seu jeito de trabalhar',       price: 'sob consulta' },
]

const STEPS: { n: '01' | '02' | '03'; title: string; desc: string }[] = [
  { n: '01', title: 'Cadastre seu negócio',        desc: 'Nome, serviços, horários e profissionais em menos de 5 minutos. Sem técnico, sem burocracia.' },
  { n: '02', title: 'Compartilhe o link',          desc: 'Cole na bio do Instagram, no Google Meu Negócio ou no WhatsApp. Cliente agenda direto.' },
  { n: '03', title: 'O sistema trabalha por você', desc: 'Lembretes, fidelidade, fila de espera, indicação e Reviews acontecem sozinhos. Você só atende.' },
]

/* ═══════════════════════════════════════════════════════════
   Página
═══════════════════════════════════════════════════════════ */

export default async function HomePage() {
  await redirectIfLoggedIn()
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
        Solo R$67/mês ou Equipe R$97/mês — <strong className="mx-1">sem setup, sem fidelidade</strong>. 7 dias grátis, sem cartão.
      </div>

      {/* ═══════════ Nav ═══════════ */}
      <nav className="sticky top-0 z-50" style={{ background: 'rgba(5, 7, 19, 0.75)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--glass-border)' }}>
        <div className="container flex items-center justify-between h-12 sm:h-16">
          <Link href="/" className="flex items-center">
            <img src="/logo-agendapro-dark.svg" alt="AgendaPRO" className="h-7" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/admin/login" className="inline-flex text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors px-2.5 py-2 sm:px-3">
              Entrar
            </Link>
            <Link href="/cadastro" className="btn btn-primary-v2 text-xs sm:text-sm px-3.5 py-2 sm:px-5 sm:py-2.5">
              Começar agora
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════ 1. HERO — Mobile-first (cabe na 1ª tela) ═══════════ */}
      <section className="relative">
        <AnimatedGradient />

        {/* ——— MOBILE HERO ——— */}
        <div className="lg:hidden relative z-10 px-5 pt-5 pb-8 text-center flex flex-col items-center">
          {/* Pill mostra a oferta antes de tudo */}
          <div className="pill inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider mb-4">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-300" aria-hidden>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span>7 dias grátis · Solo R$67 · Equipe R$97</span>
          </div>

          <h1 className="text-[1.7rem] leading-[1.1] font-black text-white tracking-tight mb-3">
            Agenda, caixa e equipe.<br />
            <span style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Num lugar só.</span>
          </h1>

          <p className="text-[13.5px] text-slate-300 leading-relaxed mb-5 max-w-[300px]">
            Cliente agenda sozinho pelo link. Cada profissional entra com o login dela e vê a própria comissão. Você recebe em PIX, dinheiro ou cartão e vê o lucro do mês. <strong className="text-white">Tudo no mesmo app.</strong>
          </p>

          {/* Mockup do iPhone + labels flutuantes */}
          <div className="relative mb-5 w-full flex justify-center" style={{ minHeight: 380 }}>
            <div className="relative">
              <div style={{ transform: 'scale(0.7)', transformOrigin: 'top center' }}>
                <IPhoneMockup variant="barbearia" />
              </div>

              {/* Labels flutuantes — sobrepostas ao mockup */}
              <div
                className="absolute left-0 top-[10%] z-20 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white whitespace-nowrap"
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                  boxShadow: '0 8px 24px rgba(139,92,246,0.45)',
                  animation: 'floatSlow 4s ease-in-out infinite',
                }}
              >
                Lembrete automático
              </div>
              <div
                className="absolute right-0 top-[42%] z-20 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white whitespace-nowrap"
                style={{
                  background: 'linear-gradient(135deg, #06B6D4, #0891B2)',
                  boxShadow: '0 8px 24px rgba(6,182,212,0.45)',
                  animation: 'floatSlow 5s ease-in-out infinite reverse',
                }}
              >
                Fidelidade com pontos
              </div>
              <div
                className="absolute left-4 bottom-[4%] z-20 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white whitespace-nowrap"
                style={{
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  boxShadow: '0 8px 24px rgba(16,185,129,0.45)',
                  animation: 'floatSlow 4.5s ease-in-out infinite',
                }}
              >
                Fila de espera
              </div>
            </div>
          </div>

          <Link href="/cadastro" className="btn btn-primary-v2 text-sm px-8 py-3.5 w-full max-w-xs justify-center font-bold">
            Começar agora
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <p className="text-[11px] text-slate-500 mt-2">R$67/mês · Sem setup · 7 dias grátis</p>
        </div>

        {/* ——— DESKTOP HERO ——— */}
        <div className="hidden lg:block container relative z-10 py-16">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-16 items-center">

            <SectionReveal className="flex flex-col items-start text-left gap-7">
              <div className="pill-glow animate-pulse-glow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-300"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span>Solo R$67 · Equipe R$97 — sem setup, sem fidelidade</span>
              </div>

              <h1 className="display-xl text-white">
                Agenda, caixa, comissão e<br />
                <span className="text-gradient">ficha da cliente</span><br />
                num lugar só.
              </h1>

              <p className="text-xl text-slate-300 max-w-2xl leading-relaxed">
                A cliente agenda sozinha pelo link. Cada profissional entra com o login dela,
                marca o próprio atendimento e vê só a comissão dela. Você recebe em PIX, dinheiro
                ou cartão — com taxa da maquininha descontada — e fecha o mês sabendo o lucro real.
                <strong className="text-white"> Um app no lugar de quatro.</strong>
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
                R$67/mês · Sem setup · 7 dias grátis
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

      {/* ═══════════ 2.5 GENTE REAL — fotos dos 4 nichos atendidos ═══════════ */}
      <section className="section relative" id="quem-usa">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(6,182,212,0.10) 0%, transparent 60%)'
        }} />

        <div className="container relative">
          <SectionReveal className="text-center mb-12 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#06B6D4' }}>●</span>
              <span>Pra quem o AgendaPRO foi pensado</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Gente <span className="text-gradient">de verdade</span>,<br />
              fazendo o que faz de melhor.
            </h2>
            <p className="text-lg text-slate-400">
              Não é genérico. Cada nicho tem o atalho que importa pra ele — sem encher de feature que você nunca vai usar.
            </p>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-5xl mx-auto">
            {([
              { slug: 'barbearia', src: '/images/lp/barbearia.jpg', alt: 'Barbeiro fazendo corte', label: 'Barbearia',     accent: '#F59E0B' },
              { slug: 'salao',     src: '/images/lp/salao.jpg',     alt: 'Cabeleireira penteando cliente', label: 'Salão',        accent: '#A855F7' },
              { slug: 'estetica',  src: '/images/lp/estetica.jpg',  alt: 'Esteticista aplicando máscara facial', label: 'Estética',     accent: '#06B6D4' },
              { slug: 'nail',      src: '/images/lp/nail.jpg',      alt: 'Manicure trabalhando em unhas',  label: 'Nail Designer', accent: '#EC4899' },
            ] as const).map((nicho) => (
              <Link
                key={nicho.slug}
                href={`/${nicho.slug}`}
                className="group relative block rounded-2xl overflow-hidden aspect-[3/4]"
                style={{
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                }}
              >
                <Image
                  src={nicho.src}
                  alt={nicho.alt}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* Overlay escuro do bottom */}
                <div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `linear-gradient(180deg, transparent 40%, rgba(5,7,19,0.5) 70%, rgba(5,7,19,0.95) 100%)`,
                  }}
                />
                {/* Tint do accent */}
                <div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `linear-gradient(135deg, ${nicho.accent}30 0%, transparent 50%)`,
                  }}
                />
                {/* Label */}
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ background: nicho.accent, boxShadow: `0 0 10px ${nicho.accent}` }}
                    />
                    <span
                      className="text-[9px] md:text-[10px] font-black tracking-[0.18em] uppercase"
                      style={{ color: nicho.accent }}
                    >
                      Atende
                    </span>
                  </div>
                  <h3 className="text-white text-base md:text-xl font-black leading-tight">
                    {nicho.label}
                  </h3>
                  <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] md:text-xs font-semibold text-white/80 group-hover:text-white transition-colors">
                    Ver demo
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden>
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </SectionReveal>

          <p className="text-center text-xs text-slate-500 mt-8 max-w-xl mx-auto leading-relaxed">
            Imagens ilustrativas — fotografia de profissionais de serviço em ambiente real de atendimento.
          </p>
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
              5 motores de <span className="text-gradient">retenção</span><br />
              rodando 24/7.
            </h2>
            <p className="text-lg text-slate-400">
              Cada um foi desenhado pra resolver um problema específico — e funciona sozinho, sem você precisar lembrar.
            </p>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {MOTORES.map((kind, i) => (
              <div
                key={kind}
                className={i === MOTORES.length - 1 ? 'md:col-span-2' : ''}
              >
                <MechanismCard kind={kind} />
              </div>
            ))}
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 5.4 SUA EQUIPE — cada profissional com painel próprio ═══════════
          Entregue em 29-30/07/2026 (caso Realli Studio Nails · 5 profissionais,
          sem recepção). Era a maior função sem uma linha na vitrine: o site só
          dizia "até 5 profissionais". */}
      <section id="equipe" className="section relative">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(139,92,246,0.10) 0%, transparent 60%)'
        }} />

        <div className="container relative">
          <SectionReveal className="text-center mb-12 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#8B5CF6' }}>●</span>
              <span>Equipe</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Cada profissional com<br />
              <span className="text-gradient">o próprio login</span>.
            </h2>
            <p className="text-lg text-slate-400">
              Você para de ser o gargalo da agenda. Elas marcam, atendem e recebem —
              e enxergam só o que é delas. O caixa do salão continua seu.
            </p>
          </SectionReveal>

          <SectionReveal className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {[
              {
                title: 'Ela marca sozinha',
                desc: 'Abre o app, vê a agenda da equipe inteira e encaixa a cliente dela. Sem passar por você, sem grupo de WhatsApp.',
                accent: '#8B5CF6',
              },
              {
                title: 'Comissão calculada sozinha',
                desc: 'Terminou o atendimento e recebeu, a comissão dela já aparece — no valor líquido, com o desconto do cupom abatido. Ela vê a dela; a das colegas, não.',
                accent: '#10B981',
              },
              {
                title: 'Ela bloqueia o próprio horário',
                desc: 'Almoço, folga ou médico: ela mesma fecha a agenda e a cliente para de ver aquele horário. Você não é mais a secretária da equipe.',
                accent: '#F59E0B',
              },
              {
                title: 'Você decide o quanto solta',
                desc: 'Três chaves nas configurações: marcar só pra si, marcar pras colegas, ver a agenda da equipe. Liga e desliga quando quiser.',
                accent: '#3B82F6',
              },
              {
                title: 'Cancelar tem freio',
                desc: 'Ela cancela só o atendimento dela, e só antes de receber. Depois de pago, quem desfaz é você — dinheiro não se desfaz no balcão.',
                accent: '#EF4444',
              },
              {
                title: 'Recepção também tem lugar',
                desc: 'Se o negócio tem recepcionista, ela ganha uma tela própria: marca pra todo mundo, recebe e fecha caixa, sem ver comissão de ninguém.',
                accent: '#06B6D4',
              },
            ].map((c) => (
              <div
                key={c.title}
                className="glass rounded-2xl p-5"
                style={{ border: `1px solid ${c.accent}25` }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: `${c.accent}18`, color: c.accent, border: `1px solid ${c.accent}40` }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h3 className="text-white font-bold text-base mb-1.5 leading-tight">{c.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 5.45 A CLIENTE — ficha, foto e histórico ═══════════
          Prontuário digital. Vale mais em estética/nail, mas serve a todos —
          por isso mora na LP mãe e é destacado nas segmentadas. */}
      <section id="cliente" className="section relative">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(236,72,153,0.10) 0%, transparent 60%)'
        }} />

        <div className="container relative">
          <SectionReveal className="text-center mb-12 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#EC4899' }}>●</span>
              <span>Ficha da cliente</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              A ficha dela abre<br />
              <span className="text-gradient">dentro do atendimento</span>.
            </h2>
            <p className="text-lg text-slate-400">
              Anamnese, alergia, o que foi feito da última vez e a foto do trabalho.
              Sem caderno, sem pasta, sem &quot;deixa eu lembrar aqui&quot;.
            </p>
          </SectionReveal>

          <SectionReveal className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {[
              {
                title: 'Ficha de anamnese digital',
                desc: 'Você monta o modelo uma vez — alergia, saúde, autorização de imagem — e ele passa a valer pra toda cliente nova. Assinatura na tela, quando precisa.',
                accent: '#EC4899',
              },
              {
                title: 'Foto antes e depois',
                desc: 'A foto fica anexada ao atendimento, não perdida na galeria do celular. Na próxima visita, você abre e vê exatamente o que fez.',
                accent: '#8B5CF6',
              },
              {
                title: 'Ficha por tipo de trabalho',
                desc: 'Modelos prontos por nicho: cílios, unha, estética, cabelo. Você não começa do zero nem inventa o que perguntar.',
                accent: '#06B6D4',
              },
            ].map((c) => (
              <div
                key={c.title}
                className="glass rounded-2xl p-5"
                style={{ border: `1px solid ${c.accent}25` }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: `${c.accent}18`, color: c.accent, border: `1px solid ${c.accent}40` }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                </div>
                <h3 className="text-white font-bold text-base mb-1.5 leading-tight">{c.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 5.5 FINANCEIRO INTELIGENTE — controle real, não só faturamento ═══════════ */}
      <section id="financeiro" className="section relative">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(16,185,129,0.10) 0%, transparent 60%)'
        }} />

        <div className="container relative">
          <SectionReveal className="text-center mb-12 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#10B981' }}>●</span>
              <span>Controle financeiro de verdade</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Recebe no balcão.<br />
              <span className="text-gradient">Fecha o mês</span> sabendo o lucro.
            </h2>
            <p className="text-lg text-slate-400">
              A comanda abre sozinha quando o atendimento entra. Você recebe em PIX, dinheiro ou cartão — parcelado, com a taxa da maquininha já descontada — e no fim do mês vê o que sobrou de verdade, não só o que entrou.
            </p>
          </SectionReveal>

          <SectionReveal className="max-w-4xl mx-auto">
            <FinanceDashboard variant="barbearia" />
          </SectionReveal>

          <SectionReveal className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mt-8">
            {[
              {
                title: 'Comanda que abre sozinha',
                desc: 'Cliente entrou na agenda, a conta dela já existe. Serviço a mais na hora, produto vendido junto — tudo entra na mesma comanda e fecha num pagamento só.',
                accent: '#8B5CF6',
              },
              {
                title: 'Cartão com a taxa certa',
                desc: 'Você cadastra sua maquininha e a taxa de cada bandeira. Passou parcelado em 3x, o sistema desconta a taxa e mostra quanto realmente sobrou daquela venda.',
                accent: '#3B82F6',
              },
              {
                title: 'Comissão sobre o líquido',
                desc: 'Deu 20% de desconto? A comissão da profissional cai junto, proporcional. Ninguém paga comissão sobre dinheiro que não entrou.',
                accent: '#F59E0B',
              },
              {
                title: 'Despesas categorizadas',
                desc: 'Aluguel, produtos, salários, energia, marketing, impostos. Cada R$ que sai já entra em uma categoria — você sabe pra onde foi.',
                accent: '#EF4444',
              },
              {
                title: 'Lucro líquido em tempo real',
                desc: 'Receita − despesa, calculado a cada lançamento. Não é o que entrou — é o que sobrou de verdade.',
                accent: '#10B981',
              },
              {
                title: 'Projeção 30 dias',
                desc: 'Sistema usa o ritmo atual e calcula: ao fim do mês você vai fechar em R$ X. Sem surpresa.',
                accent: '#06B6D4',
              },
            ].map((c) => (
              <div
                key={c.title}
                className="glass rounded-2xl p-5"
                style={{ border: `1px solid ${c.accent}25` }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: `${c.accent}18`, color: c.accent, border: `1px solid ${c.accent}40` }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="text-white font-bold text-base mb-1.5 leading-tight">{c.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 5.6 ADEQUAÇÃO AO NEGÓCIO — o diferencial que não estava escrito ═══════════
          Eduardo 01/08: "um serviço que ofereço e venho fazendo é personalizar o
          sistema de acordo com as necessidades do negócio". É real e tem 4 casos
          de clientes ativos. Nenhum concorrente dessa faixa faz — eles vendem
          software de prateleira. Os casos abaixo estão descritos pelo QUE foi
          feito, sem expor nome de cliente sem autorização (o único nomeado é o
          Olímpio, que já aparece nos mockups do site). */}
      <section id="adequacao" className="section relative">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(6,182,212,0.10) 0%, transparent 60%)'
        }} />

        <div className="container relative">
          <SectionReveal className="text-center mb-12 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#06B6D4' }}>●</span>
              <span>Adequação ao seu negócio</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Você não se adapta ao sistema.<br />
              <span className="text-gradient">Ele se adapta</span> a você.
            </h2>
            <p className="text-lg text-slate-400">
              Quando um negócio entra, a gente estuda como ele funciona de verdade e ajusta o
              sistema pra aquilo. Não é suporte que responde ticket em 48h — é ajuste no produto,
              feito por quem escreve o código. Alguns casos reais:
            </p>
          </SectionReveal>

          <SectionReveal className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {[
              {
                caso: 'Studio de unhas · 5 profissionais, sem recepção',
                pedido: 'A dona era a única que marcava. Toda cliente passava por ela, mesmo quando estava com a mão na massa.',
                feito: 'Cada profissional ganhou login próprio pra marcar, receber e bloquear a agenda dela. No ar em menos de 24 horas.',
                accent: '#8B5CF6',
              },
              {
                caso: 'Salão que atende no balcão',
                pedido: 'A cliente chega sem marcar. O sistema todo era pensado pra quem agenda antes — não servia pro fluxo dela.',
                feito: 'Fluxo de balcão: atende, registra depois e fecha a conta na hora, sem precisar existir agendamento antes.',
                accent: '#EC4899',
              },
              {
                caso: 'Estúdio que trabalha com ficha de cliente',
                pedido: 'Ela tinha ficha em papel de cada cliente e não queria perder isso ao migrar.',
                feito: 'Ficha integrada ao atendimento: abre junto do horário, com anamnese, histórico e foto do trabalho.',
                accent: '#10B981',
              },
              {
                caso: 'Barbearia Olímpio · uso diário desde maio',
                pedido: 'Uso real todo dia revela detalhe que nenhum plano prevê — do jeito que o dinheiro entra ao horário que o dia começa.',
                feito: 'Melhorias contínuas saídas do uso dele. Várias viraram função pra todo mundo depois.',
                accent: '#06B6D4',
              },
            ].map((c) => (
              <div
                key={c.caso}
                className="glass rounded-2xl p-5"
                style={{ border: `1px solid ${c.accent}25` }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${c.accent}18`, color: c.accent, border: `1px solid ${c.accent}40` }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    </svg>
                  </div>
                  <h3 className="text-white font-bold text-base leading-tight pt-1.5">{c.caso}</h3>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-2">
                  <strong className="text-slate-300">Chegou assim:</strong> {c.pedido}
                </p>
                <p className="text-slate-400 text-sm leading-relaxed">
                  <strong style={{ color: c.accent }}>O que fizemos:</strong> {c.feito}
                </p>
              </div>
            ))}
          </SectionReveal>

          <SectionReveal className="text-center mt-8 max-w-2xl mx-auto">
            <p className="text-slate-400 text-base leading-relaxed">
              Os aplicativos grandes te entregam a mesma tela que entregam pra outros 40 mil negócios.
              <strong className="text-white"> Aqui, se o seu jeito de trabalhar não cabe no sistema, o sistema muda.</strong>
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 6. COMPARAÇÃO DIRETA — AgendaPRO x Outros apps ═══════════ */}
      <section className="section relative">
        <div className="container max-w-6xl">
          <SectionReveal className="text-center mb-12 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#06B6D4' }}>●</span>
              <span>AgendaPRO x Outros apps</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Outros apps <span className="text-slate-500">só agendam</span>.<br />
              <span className="text-gradient">AgendaPRO trabalha.</span>
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

      {/* ═══════════ 6.5 COMPARATIVO COM NOMES — Trinks/ZenPlace/Booksy/Avec/Belezzia ═══════════ */}
      <section className="section relative">
        <SectionReveal>
          <ComparativoConcorrentes
            accent="cyan"
            concorrentes={['Trinks', 'ZenPlace', 'Booksy', 'Avec', 'Belezzia']}
          />
        </SectionReveal>
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

      {/* ═══════════ 8. VALOR EMPILHADO — Hormozi Value Stack ═══════════ */}
      <section id="valor" className="section relative">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(245,158,11,0.1) 0%, transparent 60%)'
        }} />

        <div className="container relative">
          <SectionReveal className="text-center mb-12 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#F59E0B' }}>●</span>
              <span>O que você leva por R$67</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Some o que cada coisa<br />
              <span className="text-gradient">custaria separado</span>.
            </h2>
            <p className="text-lg text-slate-400">
              Pra ter tudo isso junto hoje, você assinaria agenda, PDV, controle de estoque, prontuário e uma planilha de comissão — cinco contratos, cinco logins, cinco boletos.
            </p>
          </SectionReveal>

          <SectionReveal className="max-w-xl mx-auto">
            <div className="glass rounded-3xl overflow-hidden">
              {/* Núcleo — ferramentas substituíveis */}
              <div className="px-6 pt-5 pb-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  As 4 ferramentas
                </p>
              </div>
              {VALUE_CORE.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-3.5 border-b" style={{ borderColor: 'var(--glass-border)' }}>
                  <p className="text-slate-300 text-sm md:text-base flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400 flex-shrink-0" aria-hidden>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>{r.item}</span>
                  </p>
                  <p className="font-mono text-slate-500 line-through text-sm md:text-base flex-shrink-0">{r.price}</p>
                </div>
              ))}

              {/* Bônus — não substituíveis */}
              <div className="px-6 pt-5 pb-3" style={{ background: 'rgba(245,158,11,0.06)' }}>
                <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: '#F59E0B' }}>
                  Bônus que ninguém entrega junto
                </p>
              </div>
              {VALUE_BONUS.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-3.5 border-b" style={{ borderColor: 'var(--glass-border)', background: 'rgba(245,158,11,0.04)' }}>
                  <p className="text-slate-200 text-sm md:text-base flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400 flex-shrink-0" aria-hidden>
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    <span>{r.item}</span>
                  </p>
                  <p className="font-mono text-amber-400/70 line-through text-sm md:text-base flex-shrink-0">{r.price}</p>
                </div>
              ))}

              {/* Total separado */}
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--glass-border)', background: 'rgba(255,255,255,0.04)' }}>
                <div>
                  <p className="text-slate-300 font-semibold text-sm md:text-base">Valor total se comprasse separado</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">15 contas, 15 logins, 15 boletos</p>
                </div>
                <p className="font-mono text-slate-400 font-bold line-through text-base md:text-lg flex-shrink-0">R$ 1.236/mês</p>
              </div>

              {/* Preço final ancorado */}
              <div
                className="flex items-center justify-between px-6 py-7"
                style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)' }}
              >
                <div>
                  <p className="text-white font-black text-base md:text-lg">AgendaPRO — tudo junto</p>
                  <p className="text-white/80 text-[11px] mt-0.5">1 conta, 1 login, sem setup</p>
                </div>
                <div className="text-right">
                  <p className="text-white text-3xl md:text-4xl font-black leading-none">
                    R$67<span className="text-sm font-normal text-white/70">/mês</span>
                  </p>
                  <p className="text-white/80 text-[11px] mt-1 font-semibold">economia de R$ 613/mês</p>
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
                Sem fidelidade · cancela quando quiser · garantia de 7 dias
              </p>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 8.5 RISK REVERSAL — Garantias que aniquilam o risco ═══════════ */}
      <section id="garantias" className="section relative">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 50% 40% at 50% 0%, rgba(16,185,129,0.14) 0%, transparent 60%)'
        }} />

        <div className="container relative">
          <SectionReveal className="text-center mb-12 max-w-3xl mx-auto">
            <div className="pill mb-6">
              <span style={{ color: '#10B981' }}>●</span>
              <span>Risco zero pra você</span>
            </div>
            <h2 className="display-lg text-white mb-4">
              Quem assume o <span className="text-gradient">risco</span><br />
              somos nós.
            </h2>
            <p className="text-lg text-slate-400">
              Concorrente cobra R$ 197 de setup e te prende em fidelidade anual. Aqui é o oposto.
            </p>
          </SectionReveal>

          <SectionReveal stagger className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {[
              {
                title: '7 dias grátis',
                desc: 'Você usa, testa com cliente real, mexe na agenda. Se em 7 dias não fizer sentido, devolvo 100%. Sem perguntar nada.',
                accent: '#10B981',
                iconPath: (
                  <>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9 12l2 2 4-4" />
                  </>
                ),
              },
              {
                title: 'Sem fidelidade. Sempre.',
                desc: 'Cancela direto pelo painel ou WhatsApp. Sem multa, sem pegadinha, sem ligar 5 vezes pra te convencer a ficar.',
                accent: '#06B6D4',
                iconPath: (
                  <>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M4.93 4.93l14.14 14.14" />
                  </>
                ),
              },
              {
                title: 'Preço travado',
                desc: 'Solo R$ 67. Equipe R$ 97. O preço de quando você entrou é o seu pra sempre. Sem reajuste-surpresa pelo IGPM.',
                accent: '#8B5CF6',
                iconPath: (
                  <>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </>
                ),
              },
            ].map((g) => (
              <div
                key={g.title}
                className="glass rounded-3xl p-7 relative overflow-hidden flex flex-col"
                style={{
                  border: `1px solid ${g.accent}30`,
                }}
              >
                <div
                  className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none opacity-25"
                  style={{ background: `radial-gradient(circle, ${g.accent} 0%, transparent 70%)`, filter: 'blur(20px)' }}
                  aria-hidden
                />
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                  style={{
                    background: `${g.accent}18`,
                    border: `1px solid ${g.accent}40`,
                    color: g.accent,
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    {g.iconPath}
                  </svg>
                </div>
                <h3 className="text-xl font-black text-white mb-2 leading-tight">
                  {g.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {g.desc}
                </p>
              </div>
            ))}
          </SectionReveal>

          <SectionReveal className="max-w-2xl mx-auto mt-10 text-center">
            <p className="text-sm text-slate-500 leading-relaxed">
              Eduardo, fundador da Impulso Digital, atende cada caso de reembolso pessoalmente — sem callcenter, sem formulário de 12 perguntas.
            </p>
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
              Preço fixo, sem setup, sem fidelidade. 7 dias grátis, sem cartão.
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
                <p className="text-slate-500 text-xs mt-1">Sem setup, sempre · preço fixo</p>
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
                7 dias grátis
              </p>
              <Link href="/cadastro" className="btn btn-primary-v2 w-full justify-center">
                Começar agora
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
                <p className="text-slate-500 text-xs mt-1">Sem setup, sempre · preço fixo</p>
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
                7 dias grátis
              </p>
              <Link href="/cadastro" className="btn btn-primary-v2 w-full justify-center">
                Começar agora
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
                A operação completa do seu negócio em <span className="text-gradient">um link</span>.
              </h3>
              <p className="text-slate-300 leading-relaxed mb-6 max-w-xl mx-auto">
                Solo R$ 67/mês ou Equipe R$ 97/mês. Sem setup. Sem fidelidade. 7 dias grátis — testa de verdade, se não fizer sentido eu devolvo. Concorrente cobra R$ 200-500/mês com fidelidade anual.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Sem setup, sempre
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  Sem fidelidade
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
              <span>7 dias grátis · preço vitalício · cancele quando quiser</span>
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
              R$67/mês · Sem setup, sempre · preço fixo
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════ 13. FOOTER ═══════════ */}
      <footer className="py-12 border-t" style={{ borderColor: 'var(--glass-border)' }}>
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <img src="/logo-agendapro-dark-signed.svg" alt="AgendaPRO by Impulso Digital" className="h-12" />
              <span className="text-xs text-slate-500">© 2026 · Palmas, TO</span>
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
