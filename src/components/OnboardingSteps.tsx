/* Onboarding Steps — 3 passos do AgendaPRO com mini-UIs reais
   Timeline connector gradient + bolinhas numeradas + cards com mini-UI
   + labels de tempo + card 03 destacado (automático) + check final.
   Todo SVG, zero emoji.

   Variant prop adapta nome do negócio, @insta, app link, serviços e
   notificações ao nicho — não quebra imersão (quem cai em /salao não
   vê 'Barber Tiago' aparecer).
*/

import type { ReactNode } from 'react'
import {
  IconScissors,
  IconLink,
  IconBrain,
  IconCheck,
  IconClock24,
  IconBolt,
  IconWhatsapp,
  IconStar,
  IconPin,
  IconArrowRight,
  IconContacts,
  IconCash,
  IconSparkle,
} from './BarberIcons'

export type OnboardingVariant = 'barbearia' | 'salao' | 'estetica' | 'nail'

type Service = { s: string; p: string }
type OnboardingPreset = {
  /** "Setup da barbearia" | "Setup do salão" etc. — header form */
  negocioLabel: string
  /** Nome do negócio fictício na demo (Barber Tiago, Studio Ana...) */
  businessName: string
  /** 3 serviços com preço — chips no setup */
  servicos: [Service, Service, Service]
  /** Cidade visível na mini-UI insta (ex: 'Centro · SP') */
  cidade: string
  /** Bio fictícia (descrição da página Insta) */
  bio: string
  /** @insta_user — sem o @ */
  instaUser: string
  /** Slug pro link agendapro.app/{slug} */
  slug: string
  /** Stat 1 da bio — primeira métrica (ex: "2,4k seguidores") */
  bioStat1: string
  /** Stat 2 da bio (ex: "312 posts") */
  bioStat2: string
  /** Step 1 título — "Cadastra a barbearia" / "Cadastra o salão" etc. */
  step1Title: string
  /** Step 1 descrição */
  step1Desc: string
  /** Step 3 descrição — fim com "Você só corta" / "Você só atende" */
  step3Desc: string
  /** Final label — "Sua barbearia online" / "Seu salão online" */
  finalLabel: string
  /** Notif 1: novo agendamento (ex: "João P. · qui 09h · Corte") */
  notif1: string
  /** Notif 2: lembrete enviado (ex: "Pedro · 18:00 ontem") */
  notif2: string
  /** Notif 3: fila acionada (ex: "Marcos assumiu 10h · +R$ 35") */
  notif3: string
}

const PRESETS: Record<OnboardingVariant, OnboardingPreset> = {
  barbearia: {
    negocioLabel: 'Setup da barbearia',
    businessName: 'Barber Tiago',
    servicos: [
      { s: 'Corte', p: 'R$40' },
      { s: 'Barba', p: 'R$30' },
      { s: 'Combo', p: 'R$60' },
    ],
    cidade: 'Centro · SP',
    bio: 'Corte · barba · combo. Trabalhamos com hora marcada.',
    instaUser: 'barbertiago',
    slug: 'barber-tiago',
    bioStat1: '2,4k seguidores',
    bioStat2: '312 posts',
    step1Title: 'Cadastra a barbearia',
    step1Desc: 'Nome, serviços, horários e barbeiros em um form só. Sem técnico, sem papel.',
    step3Desc: 'Confirma, lembra, preenche cancelamento, ativa indicação e sobe seu ranking. Você só corta.',
    finalLabel: 'Sua barbearia online',
    notif1: 'João P. · qui 09h · Corte',
    notif2: 'Pedro · 18:00 ontem',
    notif3: 'Marcos assumiu 10h · +R$ 35',
  },
  salao: {
    negocioLabel: 'Setup do salão',
    businessName: 'Studio Ana',
    servicos: [
      { s: 'Escova', p: 'R$70' },
      { s: 'Coloração', p: 'R$220' },
      { s: 'Hidratação', p: 'R$80' },
    ],
    cidade: 'Pinheiros · SP',
    bio: 'Coloração · escova · hidratação. Atendimento com hora marcada.',
    instaUser: 'studioana_salao',
    slug: 'studio-ana',
    bioStat1: '8,7k seguidoras',
    bioStat2: '1,2k posts',
    step1Title: 'Cadastra o salão',
    step1Desc: 'Nome, serviços, horários e profissionais em um form só. Sem técnico, sem papel.',
    step3Desc: 'Confirma, lembra, preenche cancelamento, ativa indicação e sobe seu ranking. Você só atende.',
    finalLabel: 'Seu salão online',
    notif1: 'Maria H. · qui 14h · Coloração',
    notif2: 'Camila S. · 18:00 ontem',
    notif3: 'Renata assumiu 16h · +R$ 220',
  },
  estetica: {
    negocioLabel: 'Setup da clínica',
    businessName: 'Pele Viva',
    servicos: [
      { s: 'Limpeza', p: 'R$150' },
      { s: 'Drenagem', p: 'R$200' },
      { s: 'Peeling', p: 'R$350' },
    ],
    cidade: 'Savassi · BH',
    bio: 'Limpeza · drenagem · peeling. Pacotes com sessões agendadas.',
    instaUser: 'peleviva.estetica',
    slug: 'pele-viva',
    bioStat1: '14k seguidoras',
    bioStat2: '1,8k posts',
    step1Title: 'Cadastra a clínica',
    step1Desc: 'Nome, procedimentos, horários e profissionais em um form só. Sem técnico, sem papel.',
    step3Desc: 'Confirma, lembra, preenche cancelamento, ativa indicação e sobe seu ranking. Você só atende.',
    finalLabel: 'Sua clínica online',
    notif1: 'Camila S. · qua 14h · Drenagem',
    notif2: 'Bianca M. · 18:00 ontem',
    notif3: 'Aline assumiu 15h · +R$ 350',
  },
  nail: {
    negocioLabel: 'Setup do estúdio',
    businessName: 'Nail Designer Lari',
    servicos: [
      { s: 'Gel', p: 'R$80' },
      { s: 'Fibra', p: 'R$180' },
      { s: 'Manutenção', p: 'R$70' },
    ],
    cidade: 'Batel · PR',
    bio: 'Gel · fibra · manutenção. Atendimento com hora marcada.',
    instaUser: 'nailari.designer',
    slug: 'designer-lari',
    bioStat1: '6,8k seguidoras',
    bioStat2: '890 posts',
    step1Title: 'Cadastra o estúdio',
    step1Desc: 'Nome, serviços, horários e técnicas em um form só. Sem técnico, sem papel.',
    step3Desc: 'Confirma, lembra, preenche cancelamento, ativa indicação e sobe seu ranking. Você só atende.',
    finalLabel: 'Seu estúdio online',
    notif1: 'Larissa F. · qui 09h · Gel',
    notif2: 'Bruna A. · 18:00 ontem',
    notif3: 'Mariana assumiu 15h · +R$ 180',
  },
}

/* ═══════════════════════════════════════════════
   MINI-UIs POR PASSO
═══════════════════════════════════════════════ */

/* Passo 01 — form de setup */
function SetupFormMiniUI({ p }: { p: OnboardingPreset }) {
  return (
    <div
      className="rounded-xl p-3 space-y-2"
      style={{
        background: 'rgba(8,11,24,0.7)',
        border: '1px solid rgba(59,130,246,0.25)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'rgba(59,130,246,0.15)' }}>
        <div className="flex items-center gap-1.5">
          <IconScissors size={11} className="text-cyan-400" strokeWidth={2.2} />
          <span className="text-[10px] font-bold text-white">{p.negocioLabel}</span>
        </div>
        <span className="text-[9px] text-slate-500">passo 1</span>
      </div>

      {/* Campo Nome */}
      <div>
        <div className="text-[9px] text-slate-500 mb-0.5">Nome</div>
        <div
          className="flex items-center justify-between px-2 py-1.5 rounded-md text-[10px]"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(59,130,246,0.3)' }}
        >
          <span className="text-white font-semibold">{p.businessName}</span>
          <IconCheck size={10} strokeWidth={3} className="text-emerald-400" />
        </div>
      </div>

      {/* Serviços chips */}
      <div>
        <div className="text-[9px] text-slate-500 mb-1">Serviços</div>
        <div className="flex flex-wrap gap-1">
          {p.servicos.map((x) => (
            <span
              key={x.s}
              className="text-[9px] px-1.5 py-0.5 rounded-md flex items-center gap-1"
              style={{
                background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.25)',
                color: '#E2E8F0',
              }}
            >
              <span>{x.s}</span>
              <span className="text-cyan-400 font-bold">{x.p}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Horário */}
      <div className="flex items-center gap-2 pt-1">
        <IconClock24 size={11} className="text-slate-500" strokeWidth={2} />
        <span className="text-[10px] text-slate-300">
          Seg–Sáb · <span className="text-white font-semibold">09:00–19:00</span>
        </span>
      </div>

      {/* Botão */}
      <div
        className="w-full text-center text-[10px] font-bold text-white py-1.5 rounded-md"
        style={{
          background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
          boxShadow: '0 0 12px rgba(59,130,246,0.4)',
        }}
      >
        Salvar {p.negocioLabel.replace(/^Setup d[oa] /, '').toLowerCase()}
      </div>
    </div>
  )
}

/* Passo 02 — Instagram bio com link */
function InstaBioMiniUI({ p }: { p: OnboardingPreset }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'rgba(8,11,24,0.7)',
        border: '1px solid rgba(236,72,153,0.25)',
      }}
    >
      {/* Header Instagram-ish */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{
          borderColor: 'rgba(236,72,153,0.15)',
          background: 'linear-gradient(90deg, rgba(236,72,153,0.08), rgba(139,92,246,0.08))',
        }}
      >
        <span className="text-[10px] font-bold text-white">@{p.instaUser}</span>
        <span className="text-[9px] text-slate-500">Instagram</span>
      </div>

      {/* Avatar + nome */}
      <div className="flex items-center gap-2.5 px-3 pt-2.5">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #F472B6, #8B5CF6)',
            padding: '2px',
          }}
        >
          <div
            className="w-full h-full rounded-full flex items-center justify-center text-white"
            style={{ background: '#0B0F1F' }}
          >
            <IconScissors size={16} strokeWidth={2} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold text-white">{p.businessName}</div>
          <div className="text-[9px] text-slate-400 flex items-center gap-1">
            <IconPin size={9} strokeWidth={2} />
            <span>{p.cidade}</span>
          </div>
        </div>
      </div>

      {/* Stats linha */}
      <div className="flex items-center gap-3 px-3 py-1.5 text-[9px] text-slate-400">
        <span><strong className="text-white">{p.bioStat1.split(' ')[0]}</strong> {p.bioStat1.split(' ').slice(1).join(' ')}</span>
        <span><strong className="text-white">{p.bioStat2.split(' ')[0]}</strong> {p.bioStat2.split(' ').slice(1).join(' ')}</span>
      </div>

      {/* Bio com link destacado */}
      <div className="px-3 pb-3">
        <p className="text-[10px] text-slate-300 mb-1.5 leading-snug">
          {p.bio}
        </p>
        <div
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
          style={{
            background: 'rgba(59,130,246,0.12)',
            border: '1px solid rgba(59,130,246,0.4)',
            boxShadow: '0 0 14px rgba(59,130,246,0.25)',
          }}
        >
          <IconLink size={11} strokeWidth={2.2} className="text-cyan-400 flex-shrink-0" />
          <span className="text-[10px] font-semibold text-white truncate flex-1">
            agendapro.app/{p.slug}
          </span>
          <IconArrowRight size={10} strokeWidth={2.5} className="text-cyan-400 flex-shrink-0" />
        </div>
        <div className="text-[9px] text-slate-500 mt-1.5 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
          Cliente toca → agenda direto
        </div>
      </div>
    </div>
  )
}

/* Passo 03 — SmartAgenda assume (notificações em cascata) */
function AutomationMiniUI({ p }: { p: OnboardingPreset }) {
  return (
    <div
      className="rounded-xl p-3 space-y-2"
      style={{
        background: 'rgba(8,11,24,0.75)',
        border: '1px solid rgba(139,92,246,0.3)',
      }}
    >
      {/* Header ativo */}
      <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'rgba(139,92,246,0.2)' }}>
        <div className="flex items-center gap-1.5">
          <IconBrain size={11} className="text-violet-300" strokeWidth={2.2} />
          <span className="text-[10px] font-bold text-white">SmartAgenda</span>
        </div>
        <span
          className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded inline-flex items-center gap-1 text-white"
          style={{
            background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
            boxShadow: '0 0 10px rgba(139,92,246,0.5)',
          }}
        >
          <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
          Ao vivo
        </span>
      </div>

      {/* Notificação 1 — novo agendamento */}
      <div
        className="flex items-start gap-2 px-2 py-1.5 rounded-lg"
        style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)' }}
      >
        <span
          className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0 mt-0.5"
          style={{ background: '#06B6D4', boxShadow: '0 0 8px rgba(6,182,212,0.6)' }}
        >
          <IconContacts size={11} strokeWidth={2.4} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold text-white leading-tight truncate">Novo agendamento</div>
          <div className="text-[9px] text-slate-400 leading-tight truncate">{p.notif1}</div>
        </div>
      </div>

      {/* Notificação 2 — lembrete enviado */}
      <div
        className="flex items-start gap-2 px-2 py-1.5 rounded-lg"
        style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}
      >
        <span
          className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0 mt-0.5"
          style={{ background: '#10B981', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }}
        >
          <IconWhatsapp size={11} strokeWidth={2.2} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold text-white leading-tight truncate">Lembrete enviado</div>
          <div className="text-[9px] text-slate-400 leading-tight truncate">{p.notif2} · <span className="text-emerald-400">confirmado</span></div>
        </div>
      </div>

      {/* Notificação 3 — fila */}
      <div
        className="flex items-start gap-2 px-2 py-1.5 rounded-lg"
        style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.35)' }}
      >
        <span
          className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0 mt-0.5"
          style={{ background: '#8B5CF6', boxShadow: '0 0 8px rgba(139,92,246,0.5)' }}
        >
          <IconBolt size={11} strokeWidth={2.4} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold text-white leading-tight truncate">Fila acionada</div>
          <div className="text-[9px] text-slate-400 leading-tight truncate">{p.notif3}</div>
        </div>
      </div>

      {/* Rodapé caixa */}
      <div
        className="flex items-center justify-between px-2 pt-2 border-t text-[9px]"
        style={{ borderColor: 'rgba(139,92,246,0.18)' }}
      >
        <span className="text-slate-400">Você: zero cliques</span>
        <span className="font-bold inline-flex items-center gap-1" style={{ color: '#06B6D4' }}>
          <IconCash size={10} strokeWidth={2.2} />
          {p.notif3.match(/\+R\$\s*[\d.]+/)?.[0] ?? '+R$ 35'}
        </span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   STEP CARD
═══════════════════════════════════════════════ */

type StepData = {
  n: '01' | '02' | '03'
  time: string
  title: string
  desc: string
  Icon: typeof IconScissors
  MiniUI: () => ReactNode
  accent: string
  highlight?: boolean
}

function buildSteps(p: OnboardingPreset): StepData[] {
  return [
    {
      n: '01',
      time: '2 minutos',
      title: p.step1Title,
      desc: p.step1Desc,
      Icon: IconScissors,
      MiniUI: () => <SetupFormMiniUI p={p} />,
      accent: '#3B82F6',
    },
    {
      n: '02',
      time: '30 segundos',
      title: 'Cola o link na bio',
      desc: 'Insta, Google Meu Negócio, status do WhatsApp. Cliente toca e agenda.',
      Icon: IconLink,
      MiniUI: () => <InstaBioMiniUI p={p} />,
      accent: '#EC4899',
    },
    {
      n: '03',
      time: 'acontece sozinho',
      title: 'A SmartAgenda assume',
      desc: p.step3Desc,
      Icon: IconBrain,
      MiniUI: () => <AutomationMiniUI p={p} />,
      accent: '#8B5CF6',
      highlight: true,
    },
  ]
}

function StepCard({ step }: { step: StepData }) {
  const { n, time, title, desc, Icon, MiniUI, accent, highlight } = step
  return (
    <div className="relative">
      {/* Bolinha numerada no topo — ancora no connector */}
      <div className="flex justify-center mb-4 relative z-10">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-sm relative"
          style={{
            background: `linear-gradient(135deg, ${accent}, #06B6D4)`,
            boxShadow: `0 0 24px ${accent}88, inset 0 1px 0 rgba(255,255,255,0.15)`,
            border: '2px solid rgba(255,255,255,0.1)',
          }}
        >
          {n}
          {highlight && (
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{ background: `${accent}55`, animationDuration: '2.4s' }}
              aria-hidden
            />
          )}
        </div>
      </div>

      {/* Card */}
      <div
        className={`rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col gap-3 lift-card h-full relative overflow-hidden ${highlight ? '' : 'glass'}`}
        style={
          highlight
            ? {
                background: 'linear-gradient(180deg, rgba(139,92,246,0.12) 0%, rgba(8,11,24,0.85) 60%)',
                border: '1px solid rgba(139,92,246,0.45)',
                boxShadow: '0 20px 60px rgba(139,92,246,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
              }
            : {}
        }
      >
        {/* Brilho de canto pro card destacado */}
        {highlight && (
          <div
            className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-50 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(139,92,246,0.5), transparent 70%)',
              filter: 'blur(40px)',
            }}
            aria-hidden
          />
        )}

        {/* Header: tempo + ícone */}
        <div className="flex items-center justify-between relative z-10">
          <span
            className="text-[10px] font-black uppercase tracking-[0.15em] px-2 py-1 rounded-md inline-flex items-center gap-1.5"
            style={{
              background: highlight ? 'rgba(139,92,246,0.18)' : 'rgba(59,130,246,0.1)',
              border: `1px solid ${highlight ? 'rgba(139,92,246,0.4)' : 'rgba(59,130,246,0.25)'}`,
              color: highlight ? '#C4B5FD' : '#93C5FD',
            }}
          >
            {highlight ? <IconSparkle size={10} strokeWidth={2.2} /> : <IconClock24 size={10} strokeWidth={2.2} />}
            {time}
          </span>
          <div className="icon-glow-hover" style={{ color: accent }}>
            <Icon size={24} strokeWidth={1.8} />
          </div>
        </div>

        {/* Título + descrição */}
        <div className="relative z-10">
          <h3 className="text-base sm:text-lg font-black text-white mb-1.5 leading-tight">{title}</h3>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{desc}</p>
        </div>

        {/* Mini-UI */}
        <div className="mt-2 relative z-10">
          <MiniUI />
        </div>

        {highlight && (
          <div className="relative z-10 flex items-center gap-1.5 text-[10px] text-violet-300 font-bold uppercase tracking-wider mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Produto trabalhando por você
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   EXPORT
═══════════════════════════════════════════════ */

type Props = {
  variant?: OnboardingVariant
}

export default function OnboardingSteps({ variant = 'barbearia' }: Props) {
  const preset = PRESETS[variant]
  const steps = buildSteps(preset)

  return (
    <div className="relative max-w-5xl mx-auto">
      {/* Connector horizontal — desktop only (atravessa as 3 bolinhas no topo) */}
      <div
        className="hidden md:block absolute top-6 pointer-events-none z-0"
        style={{
          left: '16.67%',
          right: '16.67%',
          height: '2px',
          background:
            'linear-gradient(90deg, rgba(59,130,246,0.6) 0%, rgba(236,72,153,0.6) 50%, rgba(139,92,246,0.6) 100%)',
          boxShadow: '0 0 12px rgba(59,130,246,0.4)',
        }}
        aria-hidden
      />

      {/* Connector vertical — mobile (entre cards) */}
      <div className="md:hidden" aria-hidden />

      {/* Grid dos 3 cards */}
      <div className="grid md:grid-cols-3 gap-8 md:gap-6 relative">
        {steps.map((s, i) => (
          <div key={s.n} className="relative">
            {/* Linha vertical mobile entre cards (exceto no último) */}
            {i < steps.length - 1 && (
              <div
                className="md:hidden absolute left-1/2 -bottom-8 -translate-x-1/2 pointer-events-none"
                style={{
                  width: '2px',
                  height: '32px',
                  background: 'linear-gradient(180deg, rgba(59,130,246,0.5), transparent)',
                }}
                aria-hidden
              />
            )}
            <StepCard step={s} />
          </div>
        ))}
      </div>

      {/* Check final — fecha a jornada */}
      <div className="mt-10 md:mt-12 flex flex-col items-center gap-3 relative">
        {/* Linha conectando último card ao check */}
        <div
          className="absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            width: '2px',
            height: '24px',
            background: 'linear-gradient(180deg, rgba(139,92,246,0.5), rgba(16,185,129,0.7))',
          }}
          aria-hidden
        />

        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white relative"
          style={{
            background: 'linear-gradient(135deg, #10B981, #06B6D4)',
            boxShadow: '0 0 40px rgba(16,185,129,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
            border: '2px solid rgba(255,255,255,0.12)',
          }}
        >
          <IconCheck size={28} strokeWidth={3} />
          <span
            className="absolute inset-0 rounded-full animate-ping pointer-events-none"
            style={{ background: 'rgba(16,185,129,0.3)', animationDuration: '2.8s' }}
            aria-hidden
          />
        </div>

        <div className="text-center">
          <div className="text-white font-black text-base sm:text-lg">Pronto. {preset.finalLabel}.</div>
          <div className="text-slate-400 text-xs sm:text-sm mt-1 inline-flex items-center gap-1.5">
            <IconStar size={11} className="text-amber-400" />
            Em menos de 5 minutos, sem técnico. Garantia de 7 dias.
          </div>
        </div>
      </div>
    </div>
  )
}
