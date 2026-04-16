'use client'

/* Desktop mockup — MacBook com dashboard AgendaPRO
   Scroll-driven bidirecional (igual ao iPhone mockup).
   Frame: notebook titanium com top bar macOS + tela + base com hinge.
   Conteúdo mais amplo que o iPhone: sidebar + dashboard com mais colunas.
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
  IconBrain,
  IconCash,
  IconContacts,
  IconClock24,
} from './BarberIcons'

export default function AgendaDesktopMockup() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [p, setP] = useState(0)

  useEffect(() => {
    let ticking = false
    const update = () => {
      ticking = false
      const el = rootRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight || 800
      const start = vh
      const end = vh * 0.3
      const raw = 1 - (rect.top - end) / (start - end)
      setP(Math.max(0, Math.min(1, raw)))
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

  const stage = (from: number, to: number) =>
    Math.max(0, Math.min(1, (p - from) / (to - from)))
  const ease = (t: number) => 1 - Math.pow(1 - t, 3)

  const mainS  = ease(stage(0.00, 0.25))
  const sideS  = ease(stage(0.10, 0.35))
  const kpiS   = ease(stage(0.15, 0.40))
  const listS  = ease(stage(0.22, 0.55))
  const card1S = ease(stage(0.35, 0.60))
  const card2S = ease(stage(0.45, 0.70))
  const card3S = ease(stage(0.55, 0.80))
  const decoS  = ease(stage(0.55, 0.95))

  const rowStage = (i: number, total: number) => {
    const slice = 1 / total
    return ease(
      Math.max(0, Math.min(1, (listS - i * slice * 0.6) / (1 - i * slice * 0.25)))
    )
  }

  const slots = [
    { hora: '08:00', cliente: 'João Marcelo',  servico: 'Corte + Barba',   status: 'done',      valor: 'R$ 55',  barber: 'Tiago' },
    { hora: '09:00', cliente: 'Pedro Sousa',   servico: 'Barba',           status: 'done',      valor: 'R$ 25',  barber: 'Tiago' },
    { hora: '10:00', cliente: 'Lucas Almeida', servico: 'Corte',           status: 'now',       valor: 'R$ 35',  barber: 'Bruno' },
    { hora: '11:00', cliente: 'Rafael Torres', servico: 'Pacote completo', status: 'confirmed', valor: 'R$ 90',  barber: 'Tiago' },
    { hora: '14:00', cliente: 'Marcos (fila)', servico: 'Vaga preenchida', status: 'auto',      valor: 'R$ 35',  barber: 'Bruno' },
    { hora: '15:30', cliente: 'Eduardo B.',    servico: 'Corte + Barba',   status: 'confirmed', valor: 'R$ 55',  barber: 'Tiago' },
  ]

  function statusStyle(s: string) {
    if (s === 'done')      return { dot: '#10B981', label: 'Pago',       bg: 'rgba(16,185,129,0.12)',  text: '#34D399' }
    if (s === 'now')       return { dot: '#3B82F6', label: 'Em curso',   bg: 'rgba(59,130,246,0.15)',  text: '#60A5FA' }
    if (s === 'confirmed') return { dot: '#94A3B8', label: 'Confirmado', bg: 'rgba(148,163,184,0.12)', text: '#CBD5E1' }
    if (s === 'auto')      return { dot: '#A78BFA', label: 'Auto',       bg: 'rgba(167,139,250,0.16)', text: '#C4B5FD' }
    return { dot: '#94A3B8', label: '', bg: 'rgba(148,163,184,0.12)', text: '#CBD5E1' }
  }

  return (
    <div
      ref={rootRef}
      className="relative w-full max-w-[680px] mx-auto"
      style={{
        perspective: '2200px',
        perspectiveOrigin: '50% 30%',
      }}
    >
      {/* Glow base */}
      <div
        aria-hidden
        className="animate-float-soft"
        style={{
          position: 'absolute',
          inset: '-60px -80px',
          background:
            'radial-gradient(ellipse 55% 45% at 40% 55%, rgba(59,130,246,0.5) 0%, transparent 70%),' +
            'radial-gradient(ellipse 40% 40% at 70% 40%, rgba(139,92,246,0.4) 0%, transparent 70%),' +
            'radial-gradient(ellipse 40% 35% at 50% 85%, rgba(6,182,212,0.3) 0%, transparent 70%)',
          filter: 'blur(55px)',
          zIndex: 0,
          opacity: 0.25 + mainS * 0.75,
          animationDuration: '8s',
        }}
      />

      {/* ═══ Elementos de barbearia ao redor ═══ */}
      {/* Barber pole vertical à direita */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          right: '-40px',
          top: '18%',
          width: '16px',
          height: '180px',
          borderRadius: '5px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5), inset 0 0 8px rgba(0,0,0,0.3)',
          zIndex: 3,
          opacity: decoS * 0.85,
          transform: `rotateY(-10deg) translateX(${(1 - decoS) * 20}px)`,
        }}
      >
        <div className="barber-pole-stripes" style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Tesoura grande canto superior esquerdo */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '-28px',
          left: '-48px',
          color: 'rgba(148,163,184,0.35)',
          transform: `rotate(-25deg) scale(${0.8 + decoS * 0.2})`,
          filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))',
          zIndex: 1,
          opacity: decoS,
        }}
      >
        <IconScissors size={56} strokeWidth={1.4} />
      </div>

      {/* Navalha canto superior direito */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '-18px',
          right: '6%',
          color: 'rgba(148,163,184,0.28)',
          transform: `rotate(28deg) scale(${0.8 + decoS * 0.2})`,
          filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.4))',
          zIndex: 1,
          opacity: decoS,
        }}
      >
        <IconRazor size={44} strokeWidth={1.5} />
      </div>

      {/* Máquina canto inferior esquerdo */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: '-10px',
          left: '-30px',
          color: 'rgba(148,163,184,0.3)',
          transform: `rotate(-10deg) scale(${0.85 + decoS * 0.15})`,
          filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.4))',
          zIndex: 1,
          opacity: decoS,
        }}
      >
        <IconClipper size={40} strokeWidth={1.5} />
      </div>

      {/* Cadeira canto inferior direito */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: '-22px',
          right: '12%',
          color: 'rgba(148,163,184,0.25)',
          transform: `rotate(8deg) scale(${0.85 + decoS * 0.15})`,
          filter: 'drop-shadow(0 5px 10px rgba(0,0,0,0.4))',
          zIndex: 1,
          opacity: decoS * 0.9,
        }}
      >
        <IconChair size={48} strokeWidth={1.5} />
      </div>

      {/* ═══ MacBook frame ═══ */}
      <div
        className="relative"
        style={{
          transform: `rotateY(-8deg) rotateX(4deg) translateY(${(1 - mainS) * 50}px) scale(${0.9 + mainS * 0.1})`,
          transformOrigin: 'center',
          zIndex: 2,
          opacity: mainS,
          willChange: 'transform, opacity',
        }}
      >
        {/* Corpo do notebook (tela) */}
        <div
          style={{
            // Titanium do MacBook — gradient com reflexo lateral
            background:
              'linear-gradient(145deg, #3a3d45 0%, #1f2128 50%, #0e1014 100%)',
            padding: '12px 12px 14px',
            borderRadius: '14px 14px 8px 8px',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow:
              '0 80px 160px rgba(0,0,0,0.7), ' +
              '40px 40px 80px rgba(0,0,0,0.4), ' +
              '0 20px 40px rgba(59,130,246,0.12), ' +
              '0 0 0 1px rgba(255,255,255,0.06), ' +
              'inset 0 1px 0 rgba(255,255,255,0.18), ' +
              'inset 0 -1px 0 rgba(0,0,0,0.4)',
            position: 'relative',
          }}
        >
          {/* Camera notch (retina camera) no topo da tela */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '5px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '38px',
              height: '4px',
              background: '#000',
              borderRadius: '0 0 6px 6px',
              zIndex: 5,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <span style={{
              width: '3px',
              height: '3px',
              borderRadius: '50%',
              background: '#1a1a1a',
              border: '0.5px solid rgba(59,130,246,0.2)',
            }} />
          </div>

          {/* Tela do notebook */}
          <div
            style={{
              background:
                'linear-gradient(180deg, rgba(17,24,39,0.98) 0%, rgba(8,11,24,1) 100%)',
              borderRadius: '6px',
              overflow: 'hidden',
              position: 'relative',
              aspectRatio: '16 / 10',
            }}
          >
            {/* Grain overlay */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.35 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>\")",
                mixBlendMode: 'overlay',
                opacity: 0.15,
                pointerEvents: 'none',
                zIndex: 14,
              }}
            />

            {/* Reflexo superior */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '25%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)',
                pointerEvents: 'none',
                zIndex: 13,
              }}
            />

            {/* ═══ macOS menu bar ═══ */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.03)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                position: 'relative',
                zIndex: 5,
                height: '28px',
              }}
            >
              {/* 3 dots macOS */}
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#FF5F57', boxShadow: 'inset 0 0 2px rgba(0,0,0,0.3)' }} />
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#FEBC2E', boxShadow: 'inset 0 0 2px rgba(0,0,0,0.3)' }} />
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#28C840', boxShadow: 'inset 0 0 2px rgba(0,0,0,0.3)' }} />

              <span
                style={{
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  fontSize: '10px',
                  color: '#64748B',
                  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                  letterSpacing: '0.02em',
                  fontWeight: 500,
                }}
              >
                agendapro.app — Agenda do dia
              </span>

              {/* LIVE badge */}
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

            {/* ═══ App layout: sidebar + main ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', height: 'calc(100% - 28px)', position: 'relative', zIndex: 5 }}>

              {/* Sidebar */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.015)',
                  borderRight: '1px solid rgba(255,255,255,0.05)',
                  padding: '14px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                  opacity: sideS,
                  transform: `translateX(${(1 - sideS) * -20}px)`,
                  transition: 'none',
                }}
              >
                {/* Logo do app */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, #06B6D4, #3B82F6)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 800,
                      boxShadow: '0 2px 8px rgba(6,182,212,0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
                    }}
                  >
                    A
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff' }}>AgendaPRO</span>
                </div>

                {[
                  { Icon: IconBrain,    label: 'Agenda',       active: true },
                  { Icon: IconContacts, label: 'Clientes',     active: false },
                  { Icon: IconCash,     label: 'Financeiro',   active: false },
                  { Icon: IconTrophy,   label: 'Fidelidade',   active: false },
                  { Icon: IconClock24,  label: 'Automações',   active: false },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      borderRadius: '7px',
                      background: item.active ? 'rgba(59,130,246,0.15)' : 'transparent',
                      border: item.active ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                      color: item.active ? '#60A5FA' : '#94A3B8',
                      fontSize: '10px',
                      fontWeight: item.active ? 700 : 500,
                      boxShadow: item.active ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : 'none',
                    }}
                  >
                    <item.Icon size={12} />
                    {item.label}
                  </div>
                ))}

                <div style={{ flex: 1 }} />

                {/* User chip no rodapé */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 8px',
                    borderRadius: '7px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
                  }} />
                  <div style={{ lineHeight: 1.1, minWidth: 0 }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Barber Tiago</div>
                    <div style={{ fontSize: '8px', color: '#64748B' }}>Pro plan</div>
                  </div>
                </div>
              </div>

              {/* Main panel */}
              <div style={{ padding: '14px 18px', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div
                      style={{
                        fontSize: '9px',
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
                        fontSize: '20px',
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
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {['Dia', 'Semana', 'Mês'].map((v, i) => (
                      <span
                        key={v}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '9px',
                          fontWeight: 600,
                          background: i === 0 ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                          color: i === 0 ? '#60A5FA' : '#94A3B8',
                          border: i === 0 ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>

                {/* KPIs — 4 columns */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 1fr',
                    gap: '6px',
                    marginBottom: '12px',
                  }}
                >
                  {[
                    { n: '6',     l: 'Horários',   c: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
                    { n: 'R$345', l: 'Previsto',   c: '#06B6D4', bg: 'rgba(6,182,212,0.08)' },
                    { n: '+2',    l: 'Auto-fill',  c: '#A78BFA', bg: 'rgba(167,139,250,0.08)' },
                    { n: '92%',   l: 'Ocupação',   c: '#10B981', bg: 'rgba(16,185,129,0.08)' },
                  ].map((k, i) => {
                    const s = ease(Math.max(0, Math.min(1, (kpiS - i * 0.08) / (1 - i * 0.08))))
                    return (
                      <div
                        key={k.l}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          background: `linear-gradient(135deg, ${k.bg} 0%, rgba(255,255,255,0.02) 100%)`,
                          border: '1px solid rgba(255,255,255,0.08)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 3px 10px rgba(0,0,0,0.2)',
                          position: 'relative',
                          overflow: 'hidden',
                          opacity: s,
                          transform: `translateY(${(1 - s) * 14}px)`,
                        }}
                      >
                        <div
                          aria-hidden
                          style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: '32px',
                            height: '32px',
                            background: `radial-gradient(circle at top right, ${k.c}30 0%, transparent 70%)`,
                          }}
                        />
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 800,
                            color: k.c,
                            lineHeight: 1,
                            fontFamily: 'var(--font-mono, monospace)',
                            textShadow: `0 0 10px ${k.c}50`,
                          }}
                        >
                          {k.n}
                        </div>
                        <div style={{ fontSize: '8px', color: '#64748B', marginTop: '4px', fontWeight: 600 }}>{k.l}</div>
                      </div>
                    )
                  })}
                </div>

                {/* Lista de agendamentos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {slots.map((s, i) => {
                    const c = statusStyle(s.status)
                    const isNow = s.status === 'now'
                    const rs = rowStage(i, slots.length)
                    return (
                      <div
                        key={i}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '42px 1fr 80px 56px 70px',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '7px 10px',
                          borderRadius: '8px',
                          background: isNow
                            ? 'linear-gradient(90deg, rgba(59,130,246,0.15) 0%, rgba(6,182,212,0.06) 100%)'
                            : 'rgba(255,255,255,0.025)',
                          border: isNow ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.05)',
                          boxShadow: isNow
                            ? '0 0 20px rgba(59,130,246,0.2), inset 0 1px 0 rgba(255,255,255,0.08)'
                            : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                          opacity: rs,
                          transform: `translateX(${(1 - rs) * -14}px)`,
                          position: 'relative',
                          overflow: 'hidden',
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
                        {/* Hora */}
                        <div
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            color: isNow ? '#60A5FA' : '#CBD5E1',
                            fontFamily: 'var(--font-mono, monospace)',
                            position: 'relative',
                          }}
                        >
                          {s.hora}
                        </div>
                        {/* Cliente + serviço */}
                        <div style={{ minWidth: 0, position: 'relative' }}>
                          <div
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#fff',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {s.cliente}
                          </div>
                          <div style={{ fontSize: '8px', color: '#64748B', marginTop: '1px' }}>{s.servico}</div>
                        </div>
                        {/* Barber */}
                        <div style={{ fontSize: '9px', color: '#94A3B8', position: 'relative' }}>
                          <span style={{ color: '#64748B' }}>com </span>
                          <strong style={{ color: '#CBD5E1' }}>{s.barber}</strong>
                        </div>
                        {/* Valor */}
                        <div
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#fff',
                            fontFamily: 'var(--font-mono, monospace)',
                            textAlign: 'right',
                            position: 'relative',
                          }}
                        >
                          {s.valor}
                        </div>
                        {/* Status */}
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 6px',
                            borderRadius: '999px',
                            background: c.bg,
                            fontSize: '8px',
                            fontWeight: 700,
                            color: c.text,
                            letterSpacing: '0.02em',
                            border: `1px solid ${c.dot}30`,
                            justifySelf: 'end',
                            position: 'relative',
                          }}
                        >
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: c.dot, boxShadow: `0 0 6px ${c.dot}` }} />
                          {c.label.toUpperCase()}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Base/hinge do MacBook */}
        <div
          aria-hidden
          style={{
            position: 'relative',
            height: '8px',
            background:
              'linear-gradient(180deg, #2a2d35 0%, #15171c 100%)',
            borderRadius: '0 0 14px 14px',
            margin: '0 -6px',
            boxShadow: '0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* Hinge notch */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '18%',
              height: '3px',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '0 0 6px 6px',
            }}
          />
        </div>
      </div>

      {/* ═══ Cards flutuantes (notificações) ═══ */}

      {/* Card 1 — VAGA PREENCHIDA (direita) */}
      <div
        style={{
          position: 'absolute',
          top: '18%',
          right: '-10%',
          background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,27,75,0.92) 100%)',
          backdropFilter: 'blur(18px)',
          border: '1px solid rgba(167,139,250,0.5)',
          borderRadius: '16px',
          padding: '12px 14px',
          maxWidth: '220px',
          boxShadow:
            '0 30px 70px rgba(139,92,246,0.45), ' +
            '0 0 0 1px rgba(167,139,250,0.15), ' +
            'inset 0 1px 0 rgba(255,255,255,0.1)',
          zIndex: 10,
          transform: `translate(${(1 - card1S) * 60}px, ${-10 + (1 - card1S) * -10}px) rotateY(-12deg) rotateX(4deg) scale(${0.85 + card1S * 0.15})`,
          transformOrigin: 'left center',
          opacity: card1S,
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

      {/* Card 2 — +50 PONTOS (esquerda embaixo) */}
      <div
        style={{
          position: 'absolute',
          bottom: '12%',
          left: '-10%',
          background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(69,26,3,0.88) 100%)',
          backdropFilter: 'blur(18px)',
          border: '1px solid rgba(245,158,11,0.5)',
          borderRadius: '16px',
          padding: '11px 13px',
          maxWidth: '210px',
          boxShadow:
            '0 30px 70px rgba(245,158,11,0.35), ' +
            '0 0 0 1px rgba(245,158,11,0.15), ' +
            'inset 0 1px 0 rgba(255,255,255,0.1)',
          zIndex: 10,
          transform: `translate(${(1 - card2S) * -60}px, ${8 + (1 - card2S) * 12}px) rotateY(14deg) rotateX(4deg) scale(${0.85 + card2S * 0.15})`,
          transformOrigin: 'right center',
          opacity: card2S,
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

      {/* Card 3 — Nova avaliação Google (direita embaixo) */}
      <div
        style={{
          position: 'absolute',
          bottom: '0%',
          right: '8%',
          background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(4,47,46,0.9) 100%)',
          backdropFilter: 'blur(18px)',
          border: '1px solid rgba(16,185,129,0.5)',
          borderRadius: '14px',
          padding: '10px 12px',
          maxWidth: '180px',
          boxShadow:
            '0 25px 60px rgba(16,185,129,0.3), ' +
            '0 0 0 1px rgba(16,185,129,0.15), ' +
            'inset 0 1px 0 rgba(255,255,255,0.1)',
          zIndex: 10,
          transform: `translateY(${(1 - card3S) * 60}px) rotateY(-10deg) rotateX(4deg) scale(${0.85 + card3S * 0.15})`,
          opacity: card3S,
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

      {/* Card 4 — Ju confirmou WhatsApp (topo esquerda) */}
      <div
        style={{
          position: 'absolute',
          top: '8%',
          left: '-8%',
          background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(5,46,58,0.9) 100%)',
          backdropFilter: 'blur(18px)',
          border: '1px solid rgba(6,182,212,0.5)',
          borderRadius: '14px',
          padding: '9px 12px',
          maxWidth: '190px',
          boxShadow:
            '0 22px 55px rgba(6,182,212,0.35), ' +
            '0 0 0 1px rgba(6,182,212,0.15), ' +
            'inset 0 1px 0 rgba(255,255,255,0.1)',
          zIndex: 10,
          transform: `translateX(${(1 - decoS) * -80}px) rotateY(11deg) rotateX(4deg) scale(${0.85 + decoS * 0.15})`,
          opacity: decoS,
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
    </div>
  )
}
