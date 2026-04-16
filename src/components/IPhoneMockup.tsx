export default function IPhoneMockup() {
  return (
    <div className="relative flex justify-center items-center select-none">

      {/* Glow atrás do phone */}
      <div style={{
        position: 'absolute',
        width: '280px',
        height: '280px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.4) 0%, transparent 70%)',
        filter: 'blur(40px)',
        zIndex: 0,
      }} />

      {/* iPhone frame */}
      <div style={{
        position: 'relative',
        width: '260px',
        height: '530px',
        background: 'linear-gradient(145deg, #1a1a1a, #0a0a0a)',
        borderRadius: '44px',
        padding: '10px',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 30px 80px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.04)',
        zIndex: 1,
      }}>

        {/* Botão lateral direito */}
        <div style={{
          position: 'absolute', right: '-3px', top: '120px',
          width: '3px', height: '70px',
          background: '#2a2a2a', borderRadius: '0 3px 3px 0',
        }} />
        {/* Botões esquerda */}
        <div style={{
          position: 'absolute', left: '-3px', top: '100px',
          width: '3px', height: '36px',
          background: '#2a2a2a', borderRadius: '3px 0 0 3px',
        }} />
        <div style={{
          position: 'absolute', left: '-3px', top: '148px',
          width: '3px', height: '60px',
          background: '#2a2a2a', borderRadius: '3px 0 0 3px',
        }} />
        <div style={{
          position: 'absolute', left: '-3px', top: '220px',
          width: '3px', height: '60px',
          background: '#2a2a2a', borderRadius: '3px 0 0 3px',
        }} />

        {/* Tela */}
        <div style={{
          width: '100%',
          height: '100%',
          background: '#F2F2F7',
          borderRadius: '36px',
          overflow: 'hidden',
          position: 'relative',
        }}>

          {/* Dynamic Island */}
          <div style={{
            position: 'absolute', top: '12px', left: '50%',
            transform: 'translateX(-50%)',
            width: '90px', height: '28px',
            background: '#000',
            borderRadius: '20px',
            zIndex: 10,
          }} />

          {/* Conteúdo do app */}
          <div style={{ paddingTop: '52px', height: '100%', overflowY: 'hidden' }}>

            {/* Header do negócio */}
            <div style={{ background: '#1a1a2e', height: '70px', position: 'relative' }}>
              <div style={{
                position: 'absolute', bottom: '-22px', left: '16px',
                width: '44px', height: '44px',
                background: '#2563EB', borderRadius: '12px',
                border: '3px solid #F2F2F7',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', fontWeight: 800, color: '#fff',
              }}>B</div>
            </div>

            <div style={{ padding: '28px 16px 12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1C1C1E' }}>Barbearia Studio</div>
              <div style={{ fontSize: '10px', color: '#8E8E93', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> Palmas, TO</div>
            </div>

            {/* Botão agendar */}
            <div style={{ padding: '0 16px 14px' }}>
              <div style={{
                background: '#1C1C1E', borderRadius: '14px',
                padding: '12px', textAlign: 'center',
                fontSize: '12px', fontWeight: 700, color: '#fff',
              }}>
                Agendar horário →
              </div>
            </div>

            {/* Serviços */}
            <div style={{ padding: '0 16px 8px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Serviços</div>
              {[
                { name: 'Corte Masculino',  time: '30 min', price: 'R$35' },
                { name: 'Barba Completa',   time: '20 min', price: 'R$25' },
                { name: 'Corte + Barba',    time: '50 min', price: 'R$55' },
              ].map((s, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 10px',
                  background: '#fff', borderRadius: '10px',
                  marginBottom: '4px',
                }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#1C1C1E' }}>{s.name}</div>
                    <div style={{ fontSize: '9px', color: '#8E8E93' }}>{s.time}</div>
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#1C1C1E' }}>{s.price}</div>
                </div>
              ))}
            </div>

            {/* Google Reviews */}
            <div style={{ padding: '0 16px' }}>
              <div style={{
                background: '#fff', borderRadius: '10px', padding: '8px 10px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B" style={{ flexShrink: 0 }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#1C1C1E' }}>4.9 · 127 avaliações</div>
                  <div style={{ fontSize: '9px', color: '#2563EB' }}>+50 pts por avaliar</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
