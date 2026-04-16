'use client'

import Link from 'next/link'
import { useRef, MouseEvent } from 'react'

export type Segment = 'barbearia' | 'salao' | 'estetica' | 'nail'

const CONFIG: Record<Segment, {
  tag:       string
  title:     string
  promise:   string
  cta:       string
  accent:    string
  accent2:   string
  bgGrad:    string
  href:      string
}> = {
  barbearia: {
    tag:     'BARBEARIAS',
    title:   'Agenda lotada,\nfila do lado de fora.',
    promise: 'Cliente agenda Corte+Barba sozinho. Você só passa a máquina.',
    cta:     'Ver demo barbearia',
    accent:  '#F59E0B',
    accent2: '#EF4444',
    bgGrad:  'linear-gradient(160deg, #1A0E05 0%, #0B0405 60%, #050208 100%)',
    href:    '/barbearia',
  },
  salao: {
    tag:     'SALÕES',
    title:   'Sua cliente VIP,\nfiel e indicando.',
    promise: 'Pacotes, fidelidade e link de indicação que cresce sua base sozinho.',
    cta:     'Ver demo salão',
    accent:  '#EC4899',
    accent2: '#A855F7',
    bgGrad:  'linear-gradient(160deg, #1E0820 0%, #100416 60%, #050208 100%)',
    href:    '/salao',
  },
  estetica: {
    tag:     'ESTÉTICA',
    title:   'Pacotes pré-pagos,\nsem furo na agenda.',
    promise: 'Sessões controladas, lembrete D-1 e cliente que volta no automático.',
    cta:     'Ver demo estética',
    accent:  '#06B6D4',
    accent2: '#10B981',
    bgGrad:  'linear-gradient(160deg, #051A1C 0%, #03101A 60%, #050B14 100%)',
    href:    '/estetica',
  },
  nail: {
    tag:     'NAIL DESIGNERS',
    title:   '3 semanas adiante,\n100% lotadas.',
    promise: 'Próximas semanas se preenchem sozinhas. Você decide o ritmo.',
    cta:     'Ver demo nail',
    accent:  '#EC4899',
    accent2: '#F472B6',
    bgGrad:  'linear-gradient(160deg, #1F0A1A 0%, #15041A 60%, #06030C 100%)',
    href:    '/nail',
  },
}

export function SegmentCard({ segment }: { segment: Segment }) {
  const cfg = CONFIG[segment]
  const ref = useRef<HTMLAnchorElement>(null)

  const handleMouseMove = (e: MouseEvent<HTMLAnchorElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    el.style.setProperty('--tilt-x', `${y * -3.5}deg`)
    el.style.setProperty('--tilt-y', `${x * 3.5}deg`)
    el.style.setProperty('--glow-x', `${(x + 0.5) * 100}%`)
    el.style.setProperty('--glow-y', `${(y + 0.5) * 100}%`)
  }

  const handleMouseLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--tilt-x', '0deg')
    el.style.setProperty('--tilt-y', '0deg')
  }

  return (
    <Link
      ref={ref}
      href={cfg.href}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="segment-card group relative block rounded-3xl overflow-hidden transition-all duration-500"
      style={{
        background: cfg.bgGrad,
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        transform: 'perspective(1200px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))',
        transformStyle: 'preserve-3d',
        minHeight: '520px',
      }}
    >
      {/* Glow do segmento (canto superior) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${cfg.accent}28 0%, transparent 60%)`,
        }}
      />

      {/* Highlight que segue o cursor */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle 280px at var(--glow-x, 50%) var(--glow-y, 50%), ${cfg.accent}30 0%, transparent 70%)`,
        }}
      />

      {/* Borda luminosa no hover */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          boxShadow: `inset 0 0 0 1px ${cfg.accent}80, 0 0 40px ${cfg.accent}40`,
        }}
      />

      <div className="relative z-10 flex flex-col h-full p-6 md:p-7" style={{ minHeight: '520px' }}>
        {/* TOP — tag do segmento */}
        <div className="flex items-center justify-between mb-5">
          <span
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-[10px] font-black tracking-[0.15em] uppercase"
            style={{
              background: `${cfg.accent}15`,
              border: `1px solid ${cfg.accent}40`,
              color: cfg.accent,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: cfg.accent }} />
            {cfg.tag}
          </span>
          <SegmentMark segment={segment} accent={cfg.accent} accent2={cfg.accent2} />
        </div>

        {/* MIDDLE — mini-UI específica do desejo daquele profissional */}
        <div className="flex-1 flex items-center justify-center my-2">
          {segment === 'barbearia' && <BarbeariaUI accent={cfg.accent} accent2={cfg.accent2} />}
          {segment === 'salao'     && <SalaoUI     accent={cfg.accent} accent2={cfg.accent2} />}
          {segment === 'estetica'  && <EsteticaUI  accent={cfg.accent} accent2={cfg.accent2} />}
          {segment === 'nail'      && <NailUI      accent={cfg.accent} accent2={cfg.accent2} />}
        </div>

        {/* BOTTOM — copy + CTA */}
        <div className="mt-5">
          <h3 className="text-xl md:text-[1.45rem] font-black text-white leading-[1.15] mb-2 whitespace-pre-line">
            {cfg.title}
          </h3>
          <p className="text-sm text-slate-400 leading-snug mb-4">{cfg.promise}</p>

          <div
            className="inline-flex items-center gap-2 text-sm font-bold transition-all duration-300 group-hover:translate-x-1"
            style={{ color: cfg.accent }}
          >
            <span>{cfg.cta}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  )
}

/* ═════════════════════════════════════════════════════════════
   Marca pequena no canto superior direito (símbolo específico)
═════════════════════════════════════════════════════════════ */

function SegmentMark({ segment, accent, accent2 }: { segment: Segment; accent: string; accent2: string }) {
  const grad = `url(#mark-${segment})`
  const base = (
    <defs>
      <linearGradient id={`mark-${segment}`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor={accent} />
        <stop offset="1" stopColor={accent2} />
      </linearGradient>
    </defs>
  )

  return (
    <svg width="38" height="38" viewBox="0 0 32 32" fill="none" style={{ filter: `drop-shadow(0 0 8px ${accent}66)` }}>
      {base}
      {segment === 'barbearia' && (
        /* Tesoura */
        <g stroke={grad} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <circle cx="9" cy="22" r="3" />
          <circle cx="23" cy="22" r="3" />
          <line x1="11" y1="20" x2="21" y2="6" />
          <line x1="21" y1="20" x2="11" y2="6" />
        </g>
      )}
      {segment === 'salao' && (
        /* Pente / mecha de cabelo */
        <g stroke={grad} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M6 8 Q16 4 26 8 L26 14 L6 14 Z" fill={grad} fillOpacity="0.18" />
          <line x1="10" y1="14" x2="10" y2="22" />
          <line x1="14" y1="14" x2="14" y2="24" />
          <line x1="18" y1="14" x2="18" y2="24" />
          <line x1="22" y1="14" x2="22" y2="22" />
        </g>
      )}
      {segment === 'estetica' && (
        /* Folha + cara */
        <g stroke={grad} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <circle cx="16" cy="16" r="9" fill={grad} fillOpacity="0.15" />
          <path d="M11 14 Q12 12 13 14" />
          <path d="M19 14 Q20 12 21 14" />
          <path d="M12 20 Q16 23 20 20" />
        </g>
      )}
      {segment === 'nail' && (
        /* Mão / unha */
        <g stroke={grad} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M16 6 Q12 8 12 14 L12 22 Q12 26 16 26 Q20 26 20 22 L20 14 Q20 8 16 6 Z" fill={grad} fillOpacity="0.2" />
          <path d="M14 10 Q16 8 18 10" stroke={accent2} strokeWidth="1.5" />
          <circle cx="16" cy="14" r="1.5" fill={accent2} stroke="none" />
        </g>
      )}
    </svg>
  )
}

/* ═════════════════════════════════════════════════════════════
   BARBEARIA — agenda do dia lotada de Corte+Barba
═════════════════════════════════════════════════════════════ */

function BarbeariaUI({ accent, accent2 }: { accent: string; accent2: string }) {
  const slots = [
    { h: '08h', s: 'Corte + Barba',  v: 'R$55' },
    { h: '09h', s: 'Corte',          v: 'R$35' },
    { h: '10h', s: 'Pacote',         v: 'R$90' },
    { h: '11h', s: 'Corte + Barba',  v: 'R$55' },
    { h: '12h', s: 'Corte',          v: 'R$35' },
  ]
  return (
    <div
      className="w-full rounded-2xl p-4"
      style={{
        background: 'rgba(8,5,2,0.7)',
        border: `1px solid ${accent}30`,
        boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.04), 0 12px 30px ${accent}25`,
      }}
    >
      {/* Header tipo barbershop board */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div>
          <div className="text-[9px] uppercase tracking-[0.18em] font-black" style={{ color: accent }}>HOJE · QUARTA</div>
          <div className="text-white font-black text-sm font-mono">8 / 8 horários</div>
        </div>
        <div
          className="text-right"
          style={{
            background: `linear-gradient(135deg, ${accent}, ${accent2})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          <div className="font-mono font-black text-lg leading-none">R$ 440</div>
          <div className="text-[9px] text-slate-500 mt-0.5 font-semibold uppercase">faturado</div>
        </div>
      </div>

      <div className="space-y-1">
        {slots.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <span className="font-mono text-[10px] font-black" style={{ color: accent }}>{s.h}</span>
            <span className="flex-1 text-[10px] text-slate-300 font-semibold">{s.s}</span>
            <span className="font-mono text-[10px] font-bold text-white">{s.v}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 text-[10px]">
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent }} />
        <span className="text-slate-400">3 na fila de espera para amanhã</span>
      </div>
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════
   SALÃO — cliente VIP fidelizada + indicações
═════════════════════════════════════════════════════════════ */

function SalaoUI({ accent, accent2 }: { accent: string; accent2: string }) {
  return (
    <div
      className="w-full rounded-2xl p-4"
      style={{
        background: 'rgba(15,4,16,0.7)',
        border: `1px solid ${accent}30`,
        boxShadow: `0 12px 30px ${accent}25`,
      }}
    >
      {/* Header com cliente VIP */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-base flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${accent}, ${accent2})`,
            boxShadow: `0 0 16px ${accent}66`,
          }}
        >
          M
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-white font-bold text-sm">Maria Helena</span>
            <span
              className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider"
              style={{ background: `${accent}25`, color: accent }}
            >
              VIP
            </span>
          </div>
          <div className="text-[10px] text-slate-500">cliente há 14 meses</div>
        </div>
      </div>

      {/* KPIs da cliente */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {[
          { n: '24',  l: 'Visitas' },
          { n: 'R$2.880', l: 'Gasto' },
          { n: '+5',  l: 'Indicou' },
        ].map((k) => (
          <div
            key={k.l}
            className="rounded-lg px-2 py-2 text-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="font-mono text-[11px] font-black" style={{ color: accent }}>{k.n}</div>
            <div className="text-[8px] text-slate-500 mt-0.5 uppercase tracking-wider font-semibold">{k.l}</div>
          </div>
        ))}
      </div>

      {/* Próxima visita */}
      <div
        className="rounded-lg px-3 py-2.5 mb-2"
        style={{ background: `${accent}10`, border: `1px dashed ${accent}50` }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Próximo agendamento</div>
            <div className="text-white text-xs font-bold mt-0.5">Coloração + Escova · sex 18h</div>
          </div>
          <span className="text-base">💎</span>
        </div>
      </div>

      <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent }} />
        <span>Camila S. acabou de agendar via indicação dela</span>
      </div>
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════
   ESTÉTICA — pacote de sessões pré-pago, controle profissional
═════════════════════════════════════════════════════════════ */

function EsteticaUI({ accent, accent2 }: { accent: string; accent2: string }) {
  const filled = 8
  return (
    <div
      className="w-full rounded-2xl p-4"
      style={{
        background: 'rgba(3,10,18,0.7)',
        border: `1px solid ${accent}30`,
        boxShadow: `0 12px 30px ${accent}22`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[9px] uppercase tracking-[0.15em] font-black" style={{ color: accent }}>PACOTE ATIVO</div>
          <div className="text-white font-bold text-sm mt-0.5">Drenagem Linfática</div>
          <div className="text-[10px] text-slate-500">Cliente: Camila Santos</div>
        </div>
        <div
          className="text-right"
          style={{
            background: `linear-gradient(135deg, ${accent}, ${accent2})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          <div className="font-mono font-black text-2xl leading-none">{filled}<span className="text-slate-700 text-base">/10</span></div>
          <div className="text-[9px] text-slate-500 mt-0.5 uppercase font-semibold">sessões</div>
        </div>
      </div>

      {/* Progress bar de sessões */}
      <div className="flex gap-1 mb-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-2 rounded-full"
            style={{
              background: i < filled
                ? `linear-gradient(90deg, ${accent}, ${accent2})`
                : 'rgba(255,255,255,0.06)',
              boxShadow: i < filled ? `0 0 8px ${accent}77` : 'none',
            }}
          />
        ))}
      </div>

      {/* Próxima sessão card */}
      <div
        className="rounded-lg px-3 py-2.5 mb-2"
        style={{ background: `${accent}10`, border: `1px solid ${accent}30` }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Próxima sessão</div>
            <div className="text-white text-xs font-bold mt-0.5">Sex 18/04 · 14:00</div>
          </div>
          <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            CONFIRMADA
          </span>
        </div>
      </div>

      <div className="text-[10px] text-slate-500">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Pacote pré-pago · <strong className="text-white">R$ 1.200</strong> já no caixa
      </div>
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════
   NAIL — agenda 3 semanas adiante 100% lotada
═════════════════════════════════════════════════════════════ */

function NailUI({ accent, accent2 }: { accent: string; accent2: string }) {
  const weeks = [
    { label: 'Esta semana',        slots: [1,1,1,1,1,1,0] },
    { label: 'Próxima semana',     slots: [1,1,1,1,1,0,0] },
    { label: 'Daqui a 2 semanas',  slots: [1,1,1,1,0,0,0] },
  ]
  return (
    <div
      className="w-full rounded-2xl p-4"
      style={{
        background: 'rgba(15,3,18,0.7)',
        border: `1px solid ${accent}30`,
        boxShadow: `0 12px 30px ${accent}28`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[9px] uppercase tracking-[0.15em] font-black" style={{ color: accent }}>OCUPAÇÃO</div>
          <div className="text-white font-bold text-sm mt-0.5">Próximas 3 semanas</div>
        </div>
        <div
          className="text-right"
          style={{
            background: `linear-gradient(135deg, ${accent}, ${accent2})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          <div className="font-mono font-black text-2xl leading-none">96%</div>
          <div className="text-[9px] text-slate-500 mt-0.5 font-semibold uppercase">média</div>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        {weeks.map((w) => (
          <div key={w.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-400 font-semibold">{w.label}</span>
              <span className="text-[10px] font-mono font-bold" style={{ color: accent }}>
                {w.slots.filter((x) => x).length}/{w.slots.length}
              </span>
            </div>
            <div className="flex gap-1">
              {w.slots.map((filled, i) => (
                <div
                  key={i}
                  className="flex-1 h-2.5 rounded-full"
                  style={{
                    background: filled
                      ? `linear-gradient(90deg, ${accent}, ${accent2})`
                      : 'rgba(255,255,255,0.06)',
                    boxShadow: filled ? `0 0 6px ${accent}66` : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tipo de serviço mais agendado */}
      <div
        className="rounded-lg px-3 py-2 flex items-center gap-2"
        style={{ background: `${accent}10`, border: `1px solid ${accent}30` }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'currentColor' }}><path d="M12 22c-4.97 0-9-2.24-9-5v-2c0-2.76 4.03-5 9-5s9 2.24 9 5v2c0 2.76-4.03 5-9 5z"/><path d="M12 10V2l4 4"/></svg>
        <div className="flex-1">
          <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Top serviço</div>
          <div className="text-white text-xs font-bold">Encapsulada · 12 esta semana</div>
        </div>
      </div>
    </div>
  )
}
