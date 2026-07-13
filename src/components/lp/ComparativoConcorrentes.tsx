/* ═══════════════════════════════════════════════════════════
   COMPARATIVO AGENDAPRO vs CONCORRENTES
   Card grande pra LPs (barbearia, salão, estética, nail).

   Quebra a objeção "já uso outro sistema" mostrando, lado a lado,
   o que SÓ o AgendaPRO entrega — com ícones realistas estilo Lucide
   pra cada feature, glass + glow accent, mobile-first.

   Mobile: cada feature vira card empilhado (ícone + label + 2 linhas
     de comparação compactas).
   Desktop (md+): tabela de 3 colunas (Recurso · AgendaPRO · Outros)
     com header destacado e checks/Xs em cor.

   Cor accent customizável por nicho via prop.
═══════════════════════════════════════════════════════════ */

type AccentKey = 'cyan' | 'pink' | 'emerald' | 'pink-nail'

const ACCENTS: Record<AccentKey, { primary: string; glow: string; bg: string; border: string }> = {
  cyan:        { primary: '#06B6D4', glow: 'rgba(6,182,212,0.30)',   bg: 'rgba(6,182,212,0.08)',   border: 'rgba(6,182,212,0.30)' },
  pink:        { primary: '#EC4899', glow: 'rgba(236,72,153,0.30)',  bg: 'rgba(236,72,153,0.08)',  border: 'rgba(236,72,153,0.30)' },
  emerald:     { primary: '#10B981', glow: 'rgba(16,185,129,0.30)',  bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.30)' },
  'pink-nail': { primary: '#F472B6', glow: 'rgba(244,114,182,0.30)', bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.30)' },
}

/* ─── Ícones Lucide-style inline (size 20, stroke 2) ─── */

function IconQueue() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="3.5" cy="6" r="1.5" fill="currentColor" />
      <circle cx="3.5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="3.5" cy="18" r="1.5" fill="currentColor" />
    </svg>
  )
}

function IconGift() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  )
}

function IconStarReview() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function IconShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

function IconUnlock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  )
}

function IconPix() {
  // Símbolo PIX simplificado (losango com 4 lados arredondados)
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 L22 12 L12 22 L2 12 Z" />
      <path d="M7 12 L12 7 L17 12 L12 17 Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconSupport() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="9" y1="10" x2="15" y2="10" />
      <line x1="9" y1="14" x2="13" y2="14" />
    </svg>
  )
}

function IconMultiProf() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconTag() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconExpenses() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </svg>
  )
}

function IconProjection() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}

function IconRevive() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9" />
      <polyline points="3 4 3 12 11 12" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  )
}

/* ─── Definição das features comparadas ─── */

interface FeatureRow {
  icon: React.ReactNode
  label: string
  detail: string
  usValue: 'yes' | string  // 'yes' renderiza checkmark, string renderiza texto
  themValue: 'no' | string  // 'no' renderiza X, string renderiza texto sóbrio
  highlight?: boolean       // destaque extra (ex: preço)
}

const FEATURES: FeatureRow[] = [
  {
    icon: <IconQueue />,
    label: 'Fila de espera automática',
    detail: 'Cancelou? Sistema chama o próximo da fila em 3 minutos',
    usValue: 'yes',
    themValue: 'no',
  },
  {
    icon: <IconGift />,
    label: 'Programa de fidelidade + indicação',
    detail: 'Pontos por visita, link de indicação rastreado',
    usValue: 'yes',
    themValue: 'no',
  },
  {
    icon: <IconRevive />,
    label: 'Reativação automática de sumidos',
    detail: 'Detecta cliente 40+ dias sem aparecer e deixa o cupom pronto pra você enviar',
    usValue: 'yes',
    themValue: 'no',
  },
  {
    icon: <IconStarReview />,
    label: 'Avaliação Google integrada',
    detail: 'Cliente ganha pontos pra avaliar — sua nota sobe sozinha',
    usValue: 'yes',
    themValue: 'no',
  },
  {
    icon: <IconShield />,
    label: 'Anti-overbooking blindado',
    detail: 'Trigger no banco — impossível 2 clientes no mesmo horário',
    usValue: 'yes',
    themValue: 'no',
  },
  {
    icon: <IconExpenses />,
    label: 'Despesas categorizadas + lucro líquido',
    detail: 'Aluguel, produtos, salários, energia — você sabe o lucro real, não só faturamento',
    usValue: 'yes',
    themValue: 'só faturamento',
  },
  {
    icon: <IconProjection />,
    label: 'Projeção de faturamento 30d',
    detail: 'Sistema calcula: ao ritmo atual, fim de mês fecha em R$ X',
    usValue: 'yes',
    themValue: 'no',
  },
  {
    icon: <IconUnlock />,
    label: 'Sem fidelidade — cancela quando quiser',
    detail: 'Mês a mês. Voltou? Seus dados continuam lá',
    usValue: 'yes',
    themValue: 'fidelidade 12 meses',
  },
  {
    icon: <IconPix />,
    label: 'PIX em 3 modalidades + cartão',
    detail: 'Mensal, semestral ou anual no PIX. Ou cartão automático',
    usValue: 'yes',
    themValue: 'só cartão',
  },
  {
    icon: <IconSupport />,
    label: 'Suporte humano no WhatsApp',
    detail: 'Sem robô, sem ticket — você fala com gente que entende',
    usValue: 'yes',
    themValue: 'chatbot/e-mail',
  },
  {
    icon: <IconMultiProf />,
    label: 'Multi-profissional sem upsell',
    detail: 'Plano Equipe = até 5 profissionais por R$ 97/mês fixo',
    usValue: 'yes',
    themValue: '+R$ por prof',
  },
  {
    icon: <IconTag />,
    label: 'Mensalidade',
    detail: 'Solo R$ 67 ou Equipe R$ 97 — nunca mais que isso',
    usValue: 'R$ 67-97',
    themValue: 'R$ 200-500',
    highlight: true,
  },
]

interface ComparativoConcorrentesProps {
  accent?: AccentKey
  /** Lista de concorrentes mostrada no rodapé. Default: nicho-agnóstico. */
  concorrentes?: string[]
}

export default function ComparativoConcorrentes({
  accent = 'cyan',
  concorrentes = ['Trinks', 'Booksy', 'ZenPlace', 'BarberApp', 'Belezzia'],
}: ComparativoConcorrentesProps) {
  const a = ACCENTS[accent]

  return (
    <div className="container px-4 max-w-5xl mx-auto">
      {/* Header da seção */}
      <div className="text-center mb-8 sm:mb-10">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-4"
          style={{
            background: a.bg,
            border: `1px solid ${a.border}`,
            color: a.primary,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          Comparativo
        </div>
        <h2
          className="text-white font-black mb-3 leading-tight"
          style={{ fontSize: 'clamp(1.6rem, 5vw, 2.8rem)' }}
        >
          O que <span style={{ color: a.primary }}>só o AgendaPRO</span> entrega
        </h2>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Trinks, Booksy, ZenPlace são <strong className="text-slate-300">agendas online</strong>.
          O AgendaPRO junta tudo num painel só: <strong className="text-slate-300">agenda + fila de espera + fidelidade + reviews + financeiro</strong>.
        </p>
      </div>

      {/* Card comparativo */}
      <div
        className="rounded-2xl sm:rounded-3xl overflow-hidden"
        style={{
          background:
            'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(8,11,24,0.85) 100%)',
          border: `1px solid ${a.border}`,
          boxShadow: `0 30px 80px -20px ${a.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
        }}
      >
        {/* ─ Header: 3 colunas com destaque AgendaPRO ─ */}
        <div
          className="hidden md:grid"
          style={{
            gridTemplateColumns: '1.4fr 1fr 1fr',
            background:
              'linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Recurso
          </div>
          <div
            className="px-5 py-4 flex items-center gap-2"
            style={{
              background: a.bg,
              borderLeft: `1px solid ${a.border}`,
              borderRight: `1px solid ${a.border}`,
            }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px]"
              style={{
                background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 50%, #8B5CF6 100%)',
                color: '#fff',
                letterSpacing: '-0.5px',
                boxShadow: `0 4px 12px -2px ${a.glow}`,
              }}
              aria-hidden
            >
              PRO
            </div>
            <span className="text-white font-black text-sm">AgendaPRO</span>
          </div>
          <div className="px-5 py-4 text-sm font-bold text-slate-400">
            Outros
            <span className="block text-[10px] font-medium text-slate-500 mt-0.5">
              Trinks · Booksy · ZenPlace
            </span>
          </div>
        </div>

        {/* ─ Rows: cada feature ─ */}
        <div className="divide-y divide-white/5">
          {FEATURES.map((f, idx) => (
            <div
              key={idx}
              className="md:grid"
              style={{ gridTemplateColumns: '1.4fr 1fr 1fr' }}
            >
              {/* Mobile: card empilhado */}
              <div className="md:contents">
                {/* Recurso (sempre visível) */}
                <div className="px-5 py-4 flex items-start gap-3">
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5"
                    style={{ background: a.bg, color: a.primary }}
                    aria-hidden
                  >
                    {f.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm leading-tight">{f.label}</p>
                    <p className="text-[12px] text-slate-500 mt-1 leading-snug">{f.detail}</p>
                  </div>
                </div>

                {/* AgendaPRO cell */}
                <div
                  className="px-5 py-4 flex items-center gap-2 md:border-l md:border-r"
                  style={{
                    background: a.bg,
                    borderColor: a.border,
                  }}
                >
                  <span className="md:hidden text-[10px] font-bold uppercase tracking-wider text-slate-500 w-24">
                    AgendaPRO
                  </span>
                  {f.usValue === 'yes' ? (
                    <span
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full"
                      style={{
                        background: a.primary,
                        color: '#fff',
                        boxShadow: `0 4px 10px -2px ${a.glow}`,
                      }}
                      aria-label="sim"
                    >
                      <IconCheck />
                    </span>
                  ) : (
                    <span
                      className={`text-sm font-black ${f.highlight ? 'text-white' : 'text-slate-200'}`}
                      style={f.highlight ? { color: a.primary } : undefined}
                    >
                      {f.usValue}
                    </span>
                  )}
                </div>

                {/* Outros cell */}
                <div className="px-5 py-4 flex items-center gap-2">
                  <span className="md:hidden text-[10px] font-bold uppercase tracking-wider text-slate-500 w-24">
                    Outros
                  </span>
                  {f.themValue === 'no' ? (
                    <span
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full"
                      style={{
                        background: 'rgba(148,163,184,0.12)',
                        color: '#64748B',
                      }}
                      aria-label="não"
                    >
                      <IconX />
                    </span>
                  ) : (
                    <span
                      className={`text-[13px] ${f.highlight ? 'font-black' : 'font-medium'} text-slate-400`}
                    >
                      {f.themValue}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ─ Footer com lista de concorrentes ─ */}
        <div
          className="px-5 py-4 text-center text-[11px] sm:text-xs text-slate-500"
          style={{
            background: 'rgba(0,0,0,0.25)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          Comparado com:{' '}
          <span className="text-slate-400">
            {concorrentes.join(' · ')}
          </span>
        </div>
      </div>

      {/* Disclaimer pequeno */}
      <p className="text-center text-[11px] text-slate-600 mt-4 max-w-xl mx-auto leading-relaxed">
        Comparativo baseado em pesquisa pública dos sites dos concorrentes em abril/2026.
        Funcionalidades e preços podem mudar — confirma na fonte antes de fechar com qualquer um.
      </p>
    </div>
  )
}
