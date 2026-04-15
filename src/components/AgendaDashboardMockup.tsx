/* Dashboard mockup moderno — estilo Linear/Vercel/Arc
   Cards de UI flutuando em perspectiva, sem moldura de celular */

export default function AgendaDashboardMockup() {
  const slots = [
    { hora: '08:00', cliente: 'João Marcelo',  servico: 'Corte + Barba',   status: 'done',     valor: 'R$ 55' },
    { hora: '09:00', cliente: 'Pedro Sousa',   servico: 'Barba',           status: 'done',     valor: 'R$ 25' },
    { hora: '10:00', cliente: 'Lucas Almeida', servico: 'Corte',           status: 'now',      valor: 'R$ 35' },
    { hora: '11:00', cliente: 'Rafael Torres', servico: 'Pacote completo', status: 'confirmed',valor: 'R$ 90' },
    { hora: '14:00', cliente: 'Marcos (fila)', servico: 'Vaga preenchida', status: 'auto',     valor: 'R$ 35' },
  ]

  function statusStyle(s: string) {
    if (s === 'done')      return { dot: '#10B981', label: 'Pago',        bg: 'rgba(16,185,129,0.12)',  text: '#34D399' }
    if (s === 'now')       return { dot: '#3B82F6', label: 'Em curso',    bg: 'rgba(59,130,246,0.15)',  text: '#60A5FA' }
    if (s === 'confirmed') return { dot: '#94A3B8', label: 'Confirmado',  bg: 'rgba(148,163,184,0.12)', text: '#CBD5E1' }
    if (s === 'auto')      return { dot: '#A78BFA', label: 'Auto',        bg: 'rgba(167,139,250,0.16)', text: '#C4B5FD' }
    return { dot: '#94A3B8', label: '', bg: 'rgba(148,163,184,0.12)', text: '#CBD5E1' }
  }

  return (
    <div
      className="relative w-full max-w-[460px] mx-auto"
      style={{ perspective: '1600px' }}
    >
      {/* Glow base */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: '-40px -60px',
          background:
            'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(59,130,246,0.45) 0%, rgba(139,92,246,0.25) 35%, transparent 70%)',
          filter: 'blur(40px)',
          zIndex: 0,
        }}
      />

      {/* Card sombra atrás */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          transform: 'rotateY(-8deg) rotateX(4deg) translate(24px, 24px)',
          transformOrigin: 'center',
          background: 'rgba(15,23,42,0.5)',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.05)',
          zIndex: 1,
          opacity: 0.5,
        }}
      />

      {/* Card principal — dashboard */}
      <div
        className="relative"
        style={{
          transform: 'rotateY(-8deg) rotateX(4deg)',
          transformOrigin: 'center',
          background: 'linear-gradient(180deg, rgba(15,23,42,0.85) 0%, rgba(8,11,24,0.92) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          boxShadow:
            '0 50px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          overflow: 'hidden',
          zIndex: 2,
        }}
      >
        {/* Top bar fake (window controls) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF5F57' }} />
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FEBC2E' }} />
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#28C840' }} />
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
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: '#10B981',
                boxShadow: '0 0 8px #10B981',
              }}
            />
            LIVE
          </span>
        </div>

        {/* Header */}
        <div style={{ padding: '18px 20px 14px' }}>
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

        {/* KPIs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px',
            padding: '0 20px 16px',
          }}
        >
          {[
            { n: '6',     l: 'Horários',   c: '#3B82F6' },
            { n: 'R$275', l: 'Previsto',   c: '#06B6D4' },
            { n: '+1',    l: 'Auto-fill',  c: '#A78BFA' },
          ].map((k) => (
            <div
              key={k.l}
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 800,
                  color: k.c,
                  lineHeight: 1,
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                {k.n}
              </div>
              <div style={{ fontSize: '9px', color: '#64748B', marginTop: '4px', fontWeight: 600 }}>{k.l}</div>
            </div>
          ))}
        </div>

        {/* Lista */}
        <div style={{ padding: '0 14px 16px' }}>
          {slots.map((s, i) => {
            const c = statusStyle(s.status)
            const isNow = s.status === 'now'
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
                  background: isNow ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.025)',
                  border: isNow ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.05)',
                  boxShadow: isNow ? '0 0 20px rgba(59,130,246,0.2)' : 'none',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: isNow ? '#60A5FA' : '#CBD5E1',
                    width: '38px',
                    flexShrink: 0,
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  {s.hora}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
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
                    }}
                  >
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: c.dot }} />
                    {c.label.toUpperCase()}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Card flutuante — notificação automação */}
      <div
        style={{
          position: 'absolute',
          top: '14%',
          right: '-8%',
          background: 'rgba(15,23,42,0.92)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(167,139,250,0.4)',
          borderRadius: '16px',
          padding: '12px 14px',
          maxWidth: '210px',
          boxShadow: '0 25px 60px rgba(139,92,246,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
          zIndex: 10,
          transform: 'translateY(-10px) rotateY(-6deg) rotateX(2deg)',
          transformOrigin: 'left center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <span
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
            }}
          >
            ⚡
          </span>
          <strong style={{ fontSize: '10px', color: '#fff', letterSpacing: '0.04em' }}>VAGA PREENCHIDA</strong>
        </div>
        <div style={{ color: '#94A3B8', lineHeight: 1.4, fontSize: '11px' }}>
          Cancelaram 14h. Sistema chamou a fila e <strong style={{ color: '#fff' }}>Marcos confirmou</strong>.
        </div>
      </div>

      {/* Card flutuante — fidelidade */}
      <div
        style={{
          position: 'absolute',
          bottom: '8%',
          left: '-12%',
          background: 'rgba(15,23,42,0.92)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(245,158,11,0.4)',
          borderRadius: '16px',
          padding: '11px 13px',
          maxWidth: '200px',
          boxShadow: '0 25px 60px rgba(245,158,11,0.3), 0 0 0 1px rgba(255,255,255,0.05)',
          zIndex: 10,
          transform: 'translateY(8px) rotateY(8deg) rotateX(2deg)',
          transformOrigin: 'right center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
            }}
          >
            🏆
          </span>
          <strong style={{ fontSize: '10px', color: '#fff', letterSpacing: '0.04em' }}>+50 PONTOS</strong>
        </div>
        <div style={{ color: '#94A3B8', lineHeight: 1.4, fontSize: '11px' }}>
          João completou 10º serviço. <strong style={{ color: '#fff' }}>Recompensa liberada</strong>.
        </div>
      </div>

      {/* Card flutuante — Google Reviews */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          right: '-14%',
          background: 'rgba(15,23,42,0.92)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(16,185,129,0.4)',
          borderRadius: '14px',
          padding: '10px 12px',
          maxWidth: '170px',
          boxShadow: '0 20px 50px rgba(16,185,129,0.25), 0 0 0 1px rgba(255,255,255,0.05)',
          zIndex: 10,
          transform: 'translateY(-50%) rotateY(-4deg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
          <span style={{ fontSize: '12px' }}>⭐</span>
          <strong style={{ fontSize: '11px', color: '#fff' }}>Nova avaliação</strong>
        </div>
        <div style={{ color: '#94A3B8', lineHeight: 1.3, fontSize: '10px' }}>
          <strong style={{ color: '#fff' }}>4.9</strong> · 128 avaliações no Google
        </div>
      </div>
    </div>
  )
}
