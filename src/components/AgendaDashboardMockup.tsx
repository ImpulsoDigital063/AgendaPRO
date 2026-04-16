'use client'

/* Dashboard mockup 3D — scroll-driven reveal bidirecional
   Conforme o usuário scrolla, o dashboard emerge e as notificações
   chegam em cascata. Ao scrollar de volta, tudo reverte
   naturalmente (opacity/transform ligados ao progress do scroll).
*/

import { useEffect, useRef, useState } from 'react'
import {
  IconBolt,
  IconTrophy,
  IconStar,
  IconCheck,
  IconScissors,
  IconRazor,
  IconClipper,
  IconChair,
} from './BarberIcons'

export default function AgendaDashboardMockup() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [p, setP] = useState(0) // 0..1 = progress de entrada baseado no scroll

  useEffect(() => {
    let ticking = false
    const update = () => {
      ticking = false
      const el = rootRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight || 800
      // Começa a revelar quando o topo do mockup entra na parte inferior do viewport (vh)
      // Completa quando o topo chega a 30% do viewport (bem no meio-alto)
      const start = vh
      const end = vh * 0.3
      const raw = 1 - (rect.top - end) / (start - end)
      const progress = Math.max(0, Math.min(1, raw))
      setP(progress)
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', update)
    }
  }, [])

  // Helper: clamp(0..1) dentro da faixa [from, to]
  const stage = (from: number, to: number) =>
    Math.max(0, Math.min(1, (p - from) / (to - from)))
  // Easing easeOutCubic — começa rápido, desacelera
  const ease = (t: number) => 1 - Math.pow(1 - t, 3)

  // Stages de reveal — cascateado conforme scroll
  const mainS    = ease(stage(0.00, 0.25)) // card principal emerge primeiro
  const kpiS     = ease(stage(0.12, 0.35)) // KPIs aparecem
  const listS    = ease(stage(0.18, 0.50)) // lista de agendamentos cascateia
  const card1S   = ease(stage(0.32, 0.55)) // VAGA PREENCHIDA (esquerda → direita)
  const card2S   = ease(stage(0.42, 0.68)) // +50 PONTOS (direita → esquerda)
  const card3S   = ease(stage(0.52, 0.75)) // Nova avaliação (direita)
  const card4S   = ease(stage(0.60, 0.85)) // Ju CONFIRMOU (esquerda)
  const orbsS    = ease(stage(0.55, 0.95)) // orbs acendem
  const sparkleS = ease(stage(0.65, 1.00)) // sparkle final

  // Lista com stagger interno baseado em listS
  const rowStage = (i: number, total: number) => {
    const slice = 1 / total
    return ease(Math.max(0, Math.min(1, (listS - i * slice * 0.7) / (1 - i * slice * 0.3))))
  }

  const slots = [
    { hora: '08:00', cliente: 'João Marcelo',  servico: 'Corte + Barba',   status: 'done',      valor: 'R$ 55' },
    { hora: '09:00', cliente: 'Pedro Sousa',   servico: 'Barba',           status: 'done',      valor: 'R$ 25' },
    { hora: '10:00', cliente: 'Lucas Almeida', servico: 'Corte',           status: 'now',       valor: 'R$ 35' },
    { hora: '11:00', cliente: 'Rafael Torres', servico: 'Pacote completo', status: 'confirmed', valor: 'R$ 90' },
    { hora: '14:00', cliente: 'Marcos (fila)', servico: 'Vaga preenchida', status: 'auto',      valor: 'R$ 35' },
  ]

  function statusStyle(s: string) {
    if (s === 'done')      return { dot: '#10B981', label: 'Pago',        bg: 'rgba(16,185,129,0.12)',  text: '#34D399' }
    if (s === 'now')       return { dot: '#3B82F6', label: 'Em curso',    bg: 'rgba(59,130,246,0.15)',  text: '#60A5FA' }
    if (s === 'confirmed') return { dot: '#94A3B8', label: 'Confirmado',  bg: 'rgba(148,163,184,0.12)', text: '#CBD5E1' }
    if (s === 'auto')      return { dot: '#A78BFA', label: 'Auto',        bg: 'rgba(167,139,250,0.16)', type: '' , text: '#C4B5FD' }
    return { dot: '#94A3B8', label: '', bg: 'rgba(148,163,184,0.12)', text: '#CBD5E1' }
  }

  return (
    <div
      ref={rootRef}
      className="relative w-full max-w-[460px] mx-auto"
      style={{
        perspective: '1400px',
        perspectiveOrigin: '50% 30%',
        willChange: 'contents',
      }}
    >
      {/* Glow base — sempre com vida ambient, mas intensidade cresce com progress */}
      <div
        aria-hidden
        className="animate-float-soft"
        style={{
          position: 'absolute',
          inset: '-60px -80px',
          background:
            'radial-gradient(ellipse 55% 45% at 40% 55%, rgba(59,130,246,0.55) 0%, transparent 70%),' +
            'radial-gradient(ellipse 40% 40% at 70% 40%, rgba(139,92,246,0.45) 0%, transparent 70%),' +
            'radial-gradient(ellipse 40% 35% at 50% 85%, rgba(6,182,212,0.35) 0%, transparent 70%)',
          filter: 'blur(50px)',
          zIndex: 0,
          opacity: 0.25 + mainS * 0.75,
          animationDuration: '8s',
        }}
      />

      {/* ═══ Elementos de BARBEARIA em volta ═══
          Barber pole rotativo + ferramentas decorativas.
          Todos em tons sutis (opacity baixa) pra ambientar sem roubar foco. */}

      {/* Barber pole vertical — direita do mockup, listras giratórias */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          right: '-28px',
          top: '18%',
          width: '14px',
          height: '120px',
          borderRadius: '4px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5), inset 0 0 8px rgba(0,0,0,0.3)',
          zIndex: 3,
          opacity: orbsS * 0.85,
          transform: `rotateY(-10deg) translateX(${(1 - orbsS) * 20}px)`,
        }}
      >
        <div
          className="barber-pole-stripes"
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      </div>

      {/* Tesoura decorativa — canto superior esquerdo, fora do mockup */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '-18px',
          left: '-38px',
          color: 'rgba(148,163,184,0.35)',
          transform: `rotate(-20deg) scale(${0.8 + orbsS * 0.2})`,
          transformOrigin: 'center',
          filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.4))',
          zIndex: 1,
          opacity: orbsS,
        }}
      >
        <IconScissors size={42} strokeWidth={1.5} />
      </div>

      {/* Navalha decorativa — canto inferior esquerdo */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: '-8px',
          right: '-30px',
          color: 'rgba(148,163,184,0.3)',
          transform: `rotate(35deg) scale(${0.8 + orbsS * 0.2})`,
          transformOrigin: 'center',
          filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.4))',
          zIndex: 1,
          opacity: orbsS,
        }}
      >
        <IconRazor size={36} strokeWidth={1.5} />
      </div>

      {/* Máquina de cortar — lateral esquerda, mais discreta */}
      <div
        aria-hidden
        className="hidden sm:block"
        style={{
          position: 'absolute',
          top: '58%',
          left: '-34px',
          color: 'rgba(148,163,184,0.28)',
          transform: `rotate(-15deg) scale(${0.75 + orbsS * 0.15})`,
          transformOrigin: 'center',
          filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.4))',
          zIndex: 1,
          opacity: orbsS,
        }}
      >
        <IconClipper size={32} strokeWidth={1.5} />
      </div>

      {/* Camada fantasma 3 — rotação maior pra profundidade dramática */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          transform: `rotateY(-18deg) rotateX(9deg) translate(${50 * mainS}px, ${50 * mainS}px) translateZ(-100px)`,
          transformOrigin: 'center',
          background: 'rgba(10,15,28,0.4)',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.03)',
          zIndex: 1,
          opacity: mainS * 0.35,
          filter: 'blur(2px)',
        }}
      />

      {/* Camada fantasma 2 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          transform: `rotateY(-16deg) rotateX(8deg) translate(${30 * mainS}px, ${30 * mainS}px) translateZ(-50px)`,
          transformOrigin: 'center',
          background: 'rgba(10,15,28,0.6)',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.05)',
          zIndex: 1,
          opacity: mainS * 0.55,
        }}
      />

      {/* Card principal — rotação mais forte (-15°/8°), realismo aumentado */}
      <div
        className="relative"
        style={{
          transform: `rotateY(-15deg) rotateX(8deg) translateY(${(1 - mainS) * 50}px) scale(${0.9 + mainS * 0.1})`,
          transformOrigin: 'center',
          background:
            'linear-gradient(180deg, rgba(17,24,39,0.92) 0%, rgba(8,11,24,0.97) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '24px',
          boxShadow:
            // sombra dramática embaixo (chão)
            '0 80px 140px rgba(0,0,0,0.75), ' +
            // sombra projetada lateral (luz vindo de cima-esquerda)
            '40px 40px 80px rgba(0,0,0,0.5), ' +
            // glow frio azul sutil
            '0 25px 50px rgba(59,130,246,0.12), ' +
            // borda metálica
            '0 0 0 1px rgba(255,255,255,0.08), ' +
            // highlight superior (reflexo de luz)
            'inset 0 1px 0 rgba(255,255,255,0.12), ' +
            // sombra interna inferior (profundidade)
            'inset 0 -2px 4px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(24px)',
          overflow: 'hidden',
          zIndex: 2,
          opacity: mainS,
          willChange: 'transform, opacity',
        }}
      >
        {/* Grain/noise overlay — textura sutil pra realismo (SVG data URI) */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.35 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>\")",
            mixBlendMode: 'overlay',
            opacity: 0.18,
            pointerEvents: 'none',
            zIndex: 14,
          }}
        />

        {/* Reflexo superior (highlight de luz vinda de cima) — estático, não em movimento */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '30%',
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)',
            pointerEvents: 'none',
            zIndex: 13,
          }}
        />

        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)',
            position: 'relative',
            zIndex: 5,
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF5F57', boxShadow: '0 0 4px rgba(255,95,87,0.5)' }} />
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FEBC2E', boxShadow: '0 0 4px rgba(254,188,46,0.5)' }} />
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#28C840', boxShadow: '0 0 4px rgba(40,200,64,0.5)' }} />
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '10px',
              color: '#64748B',
              fontFamily: 'var(--font-mono, monospace)',
              letterSpacing: '0.04em',
            }}
          >
            agendapro · hoje
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 7px',
              borderRadius: '999px',
              background: 'rgba(16,185,129,0.15)',
              border: '1px solid rgba(16,185,129,0.3)',
              fontSize: '9px',
              fontWeight: 700,
              color: '#34D399',
            }}
          >
            <span
              className="animate-pulse"
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: '#10B981',
                boxShadow: '0 0 10px #10B981',
              }}
            />
            LIVE
          </span>
        </div>

        {/* Header */}
        <div style={{ padding: '18px 20px 14px', position: 'relative', zIndex: 5 }}>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#64748B',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Quarta · 15 de abril
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 800,
              marginTop: '2px',
              background: 'linear-gradient(135deg, #fff 0%, #94A3B8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1.1,
            }}
          >
            Agenda do dia
          </div>
        </div>

        {/* KPIs com stagger individual */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px',
            padding: '0 20px 16px',
            position: 'relative',
            zIndex: 5,
          }}
        >
          {[
            { n: '6',     l: 'Horários',   c: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
            { n: 'R$275', l: 'Previsto',   c: '#06B6D4', bg: 'rgba(6,182,212,0.08)' },
            { n: '+1',    l: 'Auto-fill',  c: '#A78BFA', bg: 'rgba(167,139,250,0.08)' },
          ].map((k, i) => {
            const s = ease(Math.max(0, Math.min(1, (kpiS - i * 0.12) / (1 - i * 0.1))))
            return (
              <div
                key={k.l}
                style={{
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: `linear-gradient(135deg, ${k.bg} 0%, rgba(255,255,255,0.02) 100%)`,
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 12px rgba(0,0,0,0.2)`,
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: s,
                  transform: `translateY(${(1 - s) * 14}px)`,
                  willChange: 'transform, opacity',
                }}
              >
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '40px',
                    height: '40px',
                    background: `radial-gradient(circle at top right, ${k.c}30 0%, transparent 70%)`,
                  }}
                />
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    color: k.c,
                    lineHeight: 1,
                    fontFamily: 'var(--font-mono, monospace)',
                    textShadow: `0 0 12px ${k.c}50`,
                  }}
                >
                  {k.n}
                </div>
                <div style={{ fontSize: '9px', color: '#64748B', marginTop: '4px', fontWeight: 600 }}>{k.l}</div>
              </div>
            )
          })}
        </div>

        {/* Lista com stagger linha a linha */}
        <div style={{ padding: '0 14px 16px', position: 'relative', zIndex: 5 }}>
          {slots.map((s, i) => {
            const c = statusStyle(s.status)
            const isNow = s.status === 'now'
            const rs = rowStage(i, slots.length)
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  marginBottom: '4px',
                  borderRadius: '12px',
                  background: isNow
                    ? 'linear-gradient(90deg, rgba(59,130,246,0.15) 0%, rgba(6,182,212,0.08) 100%)'
                    : 'rgba(255,255,255,0.025)',
                  border: isNow ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.05)',
                  boxShadow: isNow
                    ? '0 0 24px rgba(59,130,246,0.25), inset 0 1px 0 rgba(255,255,255,0.08)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: rs,
                  transform: `translateX(${(1 - rs) * -16}px)`,
                  willChange: 'transform, opacity',
                }}
              >
                {isNow && (
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(110deg, transparent 40%, rgba(59,130,246,0.06) 50%, transparent 60%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 8s ease-in-out infinite',
                    }}
                  />
                )}
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: isNow ? '#60A5FA' : '#CBD5E1',
                    width: '38px',
                    flexShrink: 0,
                    fontFamily: 'var(--font-mono, monospace)',
                    position: 'relative',
                  }}
                >
                  {s.hora}
                </div>
                <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#fff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {s.cliente}
                  </div>
                  <div style={{ fontSize: '9px', color: '#64748B', marginTop: '1px' }}>{s.servico}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', position: 'relative' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#fff',
                      fontFamily: 'var(--font-mono, monospace)',
                    }}
                  >
                    {s.valor}
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 7px',
                      borderRadius: '999px',
                      background: c.bg,
                      fontSize: '8px',
                      fontWeight: 700,
                      color: c.text,
                      letterSpacing: '0.02em',
                      border: `1px solid ${c.dot}30`,
                    }}
                  >
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: c.dot, boxShadow: `0 0 6px ${c.dot}` }} />
                    {c.label.toUpperCase()}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Card flutuante 1 — VAGA PREENCHIDA (vem da direita) */}
      <div
        style={{
          position: 'absolute',
          top: '14%',
          right: '-8%',
          background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,27,75,0.92) 100%)',
          backdropFilter: 'blur(18px)',
          border: '1px solid rgba(167,139,250,0.5)',
          borderRadius: '16px',
          padding: '12px 14px',
          maxWidth: '210px',
          boxShadow:
            '0 30px 70px rgba(139,92,246,0.45), ' +
            '0 0 0 1px rgba(167,139,250,0.15), ' +
            'inset 0 1px 0 rgba(255,255,255,0.1)',
          zIndex: 10,
          transform: `translate(${(1 - card1S) * 60}px, ${-10 + (1 - card1S) * -10}px) rotateY(-12deg) rotateX(5deg) scale(${0.85 + card1S * 0.15})`,
          transformOrigin: 'left center',
          opacity: card1S,
          willChange: 'transform, opacity',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
          <span
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '7px',
              background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(139,92,246,0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
            }}
          >
            <IconBolt size={12} strokeWidth={2.5} />
          </span>
          <strong style={{ fontSize: '10px', color: '#fff', letterSpacing: '0.05em' }}>VAGA PREENCHIDA</strong>
        </div>
        <div style={{ color: '#94A3B8', lineHeight: 1.4, fontSize: '11px' }}>
          Cancelaram 14h. Sistema chamou a fila e <strong style={{ color: '#fff' }}>Marcos confirmou</strong>.
        </div>
      </div>

      {/* Card flutuante 2 — +50 PONTOS (vem da esquerda) */}
      <div
        style={{
          position: 'absolute',
          bottom: '8%',
          left: '-12%',
          background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(69,26,3,0.88) 100%)',
          backdropFilter: 'blur(18px)',
          border: '1px solid rgba(245,158,11,0.5)',
          borderRadius: '16px',
          padding: '11px 13px',
          maxWidth: '200px',
          boxShadow:
            '0 30px 70px rgba(245,158,11,0.35), ' +
            '0 0 0 1px rgba(245,158,11,0.15), ' +
            'inset 0 1px 0 rgba(255,255,255,0.1)',
          zIndex: 10,
          transform: `translate(${(1 - card2S) * -60}px, ${8 + (1 - card2S) * 12}px) rotateY(14deg) rotateX(5deg) scale(${0.85 + card2S * 0.15})`,
          transformOrigin: 'right center',
          opacity: card2S,
          willChange: 'transform, opacity',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
          <span
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '7px',
              background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0B0F1F',
              boxShadow: '0 4px 12px rgba(245,158,11,0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
            }}
          >
            <IconTrophy size={12} strokeWidth={2.5} />
          </span>
          <strong style={{ fontSize: '10px', color: '#fff', letterSpacing: '0.05em' }}>+50 PONTOS</strong>
        </div>
        <div style={{ color: '#94A3B8', lineHeight: 1.4, fontSize: '11px' }}>
          João completou 10º serviço. <strong style={{ color: '#fff' }}>Recompensa liberada</strong>.
        </div>
      </div>

      {/* Card flutuante 3 — Nova avaliação (vem da direita, mais tarde) */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          right: '-14%',
          background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(4,47,46,0.9) 100%)',
          backdropFilter: 'blur(18px)',
          border: '1px solid rgba(16,185,129,0.5)',
          borderRadius: '14px',
          padding: '10px 12px',
          maxWidth: '170px',
          boxShadow:
            '0 25px 60px rgba(16,185,129,0.3), ' +
            '0 0 0 1px rgba(16,185,129,0.15), ' +
            'inset 0 1px 0 rgba(255,255,255,0.1)',
          zIndex: 10,
          transform: `translate(${(1 - card3S) * 80}px, -50%) rotateY(-10deg) rotateX(4deg) scale(${0.85 + card3S * 0.15})`,
          opacity: card3S,
          willChange: 'transform, opacity',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0B0F1F',
              boxShadow: '0 2px 8px rgba(245,158,11,0.5)',
            }}
          >
            <IconStar size={10} />
          </span>
          <strong style={{ fontSize: '11px', color: '#fff' }}>Nova avaliação</strong>
        </div>
        <div style={{ color: '#94A3B8', lineHeight: 1.3, fontSize: '10px' }}>
          <strong style={{ color: '#fff' }}>4.9</strong> · 128 avaliações no Google
        </div>
      </div>

      {/* Card flutuante 4 — Ju confirmou (vem da esquerda, última) */}
      <div
        className="hidden sm:block"
        style={{
          position: 'absolute',
          top: '32%',
          left: '-14%',
          background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(5,46,58,0.9) 100%)',
          backdropFilter: 'blur(18px)',
          border: '1px solid rgba(6,182,212,0.5)',
          borderRadius: '14px',
          padding: '9px 12px',
          maxWidth: '180px',
          boxShadow:
            '0 22px 55px rgba(6,182,212,0.35), ' +
            '0 0 0 1px rgba(6,182,212,0.15), ' +
            'inset 0 1px 0 rgba(255,255,255,0.1)',
          zIndex: 10,
          transform: `translateX(${(1 - card4S) * -80}px) rotateY(11deg) rotateX(5deg) scale(${0.85 + card4S * 0.15})`,
          opacity: card4S,
          willChange: 'transform, opacity',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
          <span
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #06B6D4, #0891B2)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(6,182,212,0.5)',
            }}
          >
            <IconCheck size={11} strokeWidth={3} />
          </span>
          <strong style={{ fontSize: '10px', color: '#fff', letterSpacing: '0.04em' }}>CONFIRMOU</strong>
        </div>
        <div style={{ color: '#94A3B8', lineHeight: 1.3, fontSize: '10px' }}>
          <strong style={{ color: '#fff' }}>Ju · 14h</strong> · via WhatsApp
        </div>
      </div>

      {/* Cadeira de barbeiro — elemento temático grande, canto inferior */}
      <div
        aria-hidden
        className="hidden sm:block"
        style={{
          position: 'absolute',
          bottom: '-28px',
          left: '12%',
          color: 'rgba(148,163,184,0.22)',
          transform: `rotate(5deg) scale(${0.8 + sparkleS * 0.2})`,
          filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))',
          zIndex: 1,
          opacity: sparkleS * 0.9,
        }}
      >
        <IconChair size={44} strokeWidth={1.5} />
      </div>
    </div>
  )
}
