/* iPhone mockup mostrando o painel da agenda — dia em pleno funcionamento */
export default function IPhoneAgendaMockup() {
  const slots = [
    { hora: '08:00', cliente: 'João M.',     servico: 'Corte + Barba',    status: 'done',     valor: 'R$ 55' },
    { hora: '09:00', cliente: 'Pedro S.',    servico: 'Barba',            status: 'done',     valor: 'R$ 25' },
    { hora: '10:00', cliente: 'Lucas A.',    servico: 'Corte',            status: 'now',      valor: 'R$ 35' },
    { hora: '11:00', cliente: 'Rafael T.',   servico: 'Pacote completo',  status: 'confirmed',valor: 'R$ 90' },
    { hora: '14:00', cliente: 'Fila espera', servico: 'Vaga preenchida',  status: 'auto',     valor: 'R$ 35' },
    { hora: '15:00', cliente: 'Bruno C.',    servico: 'Corte',            status: 'confirmed',valor: 'R$ 35' },
  ]

  function statusColor(s: string) {
    if (s === 'done')      return { bg: '#E8F5E9', dot: '#10B981', label: 'Pago' }
    if (s === 'now')       return { bg: '#E3F2FD', dot: '#3B82F6', label: 'Em curso' }
    if (s === 'confirmed') return { bg: '#F3F4F6', dot: '#6B7280', label: 'Confirmado' }
    if (s === 'auto')      return { bg: '#EDE9FE', dot: '#8B5CF6', label: 'Auto' }
    return { bg: '#F3F4F6', dot: '#6B7280', label: '' }
  }

  return (
    <div className="relative flex justify-center items-center select-none mx-auto">

      {/* Glow atrás do phone */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          margin: 'auto',
          width: '340px',
          height: '340px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.45) 0%, rgba(139,92,246,0.25) 40%, transparent 70%)',
          filter: 'blur(50px)',
          zIndex: 0,
        }}
      />

      {/* iPhone frame */}
      <div
        style={{
          position: 'relative',
          width: '290px',
          height: '600px',
          background: 'linear-gradient(145deg, #1a1a1a, #0a0a0a)',
          borderRadius: '50px',
          padding: '11px',
          boxShadow:
            '0 0 0 1px rgba(255,255,255,0.08), 0 40px 100px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.05)',
          zIndex: 1,
        }}
      >
        {/* Botões laterais */}
        <div style={{ position: 'absolute', right: '-3px', top: '140px', width: '3px', height: '78px', background: '#2a2a2a', borderRadius: '0 3px 3px 0' }} />
        <div style={{ position: 'absolute', left: '-3px', top: '110px', width: '3px', height: '38px', background: '#2a2a2a', borderRadius: '3px 0 0 3px' }} />
        <div style={{ position: 'absolute', left: '-3px', top: '160px', width: '3px', height: '64px', background: '#2a2a2a', borderRadius: '3px 0 0 3px' }} />
        <div style={{ position: 'absolute', left: '-3px', top: '236px', width: '3px', height: '64px', background: '#2a2a2a', borderRadius: '3px 0 0 3px' }} />

        {/* Tela */}
        <div
          style={{
            width: '100%',
            height: '100%',
            background: '#F2F2F7',
            borderRadius: '40px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Dynamic Island */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '94px',
              height: '28px',
              background: '#000',
              borderRadius: '20px',
              zIndex: 10,
            }}
          />

          {/* Status bar fake */}
          <div
            style={{
              position: 'absolute',
              top: '14px',
              left: '20px',
              right: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              fontWeight: 700,
              color: '#1C1C1E',
              zIndex: 11,
            }}
          >
            <span>9:41</span>
            <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span>●●●</span>
              <span style={{ fontSize: '10px' }}>100%</span>
            </span>
          </div>

          {/* Conteúdo */}
          <div style={{ paddingTop: '50px', height: '100%', overflow: 'hidden' }}>

            {/* Header gradiente */}
            <div
              style={{
                background: 'linear-gradient(135deg, #1E40AF 0%, #06B6D4 100%)',
                padding: '14px 18px 16px',
                color: '#fff',
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: 600, opacity: 0.85, letterSpacing: '0.04em' }}>
                AGENDAPRO · QUARTA
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px' }}>15 de abril</div>
              <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '4px' }}>
                6 horários · <strong>R$ 275</strong> previstos
              </div>
            </div>

            {/* KPIs em strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '6px',
                padding: '10px 14px',
                background: '#fff',
                borderBottom: '1px solid #E5E7EB',
              }}
            >
              {[
                { n: '6', l: 'Hoje' },
                { n: '4', l: 'Confirm.' },
                { n: '1', l: 'Auto-fill' },
              ].map((k) => (
                <div key={k.l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#1C1C1E', lineHeight: 1 }}>{k.n}</div>
                  <div style={{ fontSize: '8px', color: '#8E8E93', marginTop: '2px', fontWeight: 600 }}>{k.l}</div>
                </div>
              ))}
            </div>

            {/* Lista de horários */}
            <div style={{ padding: '10px 12px', overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#8E8E93',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  margin: '2px 4px 8px',
                }}
              >
                Agenda do dia
              </div>

              {slots.map((s, i) => {
                const c = statusColor(s.status)
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      background: '#fff',
                      borderRadius: '10px',
                      marginBottom: '5px',
                      border: s.status === 'now' ? '1.5px solid #3B82F6' : '1px solid #F0F0F2',
                      boxShadow: s.status === 'now' ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        color: '#1C1C1E',
                        width: '34px',
                        flexShrink: 0,
                      }}
                    >
                      {s.hora}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#1C1C1E',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {s.cliente}
                      </div>
                      <div style={{ fontSize: '9px', color: '#8E8E93', marginTop: '1px' }}>{s.servico}</div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '2px',
                      }}
                    >
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#1C1C1E' }}>{s.valor}</div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 6px',
                          borderRadius: '999px',
                          background: c.bg,
                          fontSize: '8px',
                          fontWeight: 700,
                          color: c.dot,
                        }}
                      >
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: c.dot }} />
                        {c.label}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Notificação flutuante "preenchimento automático" */}
      <div
        style={{
          position: 'absolute',
          bottom: '70px',
          right: '-20px',
          background: 'rgba(5,7,19,0.92)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(139,92,246,0.4)',
          borderRadius: '14px',
          padding: '10px 14px',
          color: '#fff',
          fontSize: '11px',
          maxWidth: '180px',
          boxShadow: '0 20px 50px rgba(139,92,246,0.35)',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#A78BFA' }} />
          <strong style={{ fontSize: '10px', letterSpacing: '0.04em' }}>VAGA PREENCHIDA</strong>
        </div>
        <div style={{ color: '#cbd5e1', lineHeight: 1.35, fontSize: '10px' }}>
          Cancelaram 14h. Sistema chamou a fila — Marcos confirmou.
        </div>
      </div>
    </div>
  )
}
