/**
 * IPhoneMockup v2 — frame iPhone 15/16 Pro realista
 *
 * Diferenças vs v1:
 * - Proporção real (260×540 → 280×600, mais próximo de 19.5:9)
 * - Frame titanium gradient (não chapado)
 * - Status bar com hora 9:41 + ícones reais (sinal, wifi, bateria)
 * - Dynamic Island com proporção correta (95×30)
 * - Glass reflection sutil (overlay gradient na tela)
 * - Drop shadow projetada (não só glow)
 * - Conteúdo da tela mais denso e realista (page pública AgendaPRO)
 *
 * Variantes: aceita prop `variant` pra customizar a tela ao nicho
 * (barbearia, salao, estetica, nail). Cada variante muda services
 * e nome do negócio. Sem variant = barbearia (padrão).
 */

type Variant = 'barbearia' | 'salao' | 'estetica' | 'nail'

type ScreenContent = {
  business: string
  city: string
  initial: string
  brandColor: string
  services: { name: string; time: string; price: string }[]
}

const SCREENS: Record<Variant, ScreenContent> = {
  barbearia: {
    business: 'Barbearia Olímpio',
    city: 'Palmas, TO',
    initial: 'O',
    brandColor: '#0F172A',
    services: [
      { name: 'Corte masculino', time: '30 min', price: 'R$ 35' },
      { name: 'Barba completa', time: '20 min', price: 'R$ 25' },
      { name: 'Corte + Barba', time: '50 min', price: 'R$ 55' },
      { name: 'Pezinho', time: '10 min', price: 'R$ 12' },
    ],
  },
  salao: {
    business: 'Salão Studio Ana',
    city: 'São Paulo, SP',
    initial: 'A',
    brandColor: '#7C3AED',
    services: [
      { name: 'Escova progressiva', time: '90 min', price: 'R$ 180' },
      { name: 'Corte feminino', time: '45 min', price: 'R$ 80' },
      { name: 'Coloração', time: '120 min', price: 'R$ 220' },
      { name: 'Hidratação', time: '40 min', price: 'R$ 70' },
    ],
  },
  estetica: {
    business: 'Clínica Pele Viva',
    city: 'Belo Horizonte, MG',
    initial: 'P',
    brandColor: '#EC4899',
    services: [
      { name: 'Limpeza de pele', time: '60 min', price: 'R$ 150' },
      { name: 'Drenagem linfática', time: '60 min', price: 'R$ 130' },
      { name: 'Peeling', time: '45 min', price: 'R$ 200' },
      { name: 'Massagem relaxante', time: '50 min', price: 'R$ 120' },
    ],
  },
  nail: {
    business: 'Nail Designer Lari',
    city: 'Curitiba, PR',
    initial: 'L',
    brandColor: '#EC4899',
    services: [
      { name: 'Esmaltação em gel', time: '60 min', price: 'R$ 80' },
      { name: 'Fibra de vidro', time: '120 min', price: 'R$ 180' },
      { name: 'Manutenção', time: '60 min', price: 'R$ 70' },
      { name: 'Nail art', time: '45 min', price: 'R$ 50' },
    ],
  },
}

type Props = {
  variant?: Variant
  /** Hora a exibir na status bar. Default '9:41' (apple-style) */
  time?: string
  /** Esconde drop shadow (útil quando o pai já tem glow forte) */
  noShadow?: boolean
}

export default function IPhoneMockup({
  variant = 'barbearia',
  time = '9:41',
  noShadow = false,
}: Props) {
  const screen = SCREENS[variant]

  return (
    <div className="relative flex justify-center items-center select-none" aria-hidden>
      {/* Glow colorido atrás — pulsa no light/dark */}
      <div
        style={{
          position: 'absolute',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${screen.brandColor}40 0%, transparent 70%)`,
          filter: 'blur(60px)',
          zIndex: 0,
        }}
      />

      {/* Frame titanium — gradient sutil pra parecer metal escovado */}
      <div
        style={{
          position: 'relative',
          width: '280px',
          height: '600px',
          background:
            'linear-gradient(135deg, #2c2c2e 0%, #1c1c1e 40%, #0a0a0a 100%)',
          borderRadius: '54px',
          padding: '6px',
          boxShadow: noShadow
            ? '0 0 0 1px rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.04)'
            : '0 0 0 1px rgba(255,255,255,0.06), 0 50px 100px -20px rgba(0,0,0,0.7), 0 30px 60px -30px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.04)',
          zIndex: 1,
        }}
      >
        {/* Botão lateral direito — Action button (volume + mute) */}
        <div
          style={{
            position: 'absolute',
            right: '-2px',
            top: '170px',
            width: '3px',
            height: '94px',
            background: 'linear-gradient(180deg, #3a3a3c, #1c1c1e)',
            borderRadius: '0 2px 2px 0',
            boxShadow: 'inset 1px 0 1px rgba(0,0,0,0.4)',
          }}
        />
        {/* Action button (esquerda topo) */}
        <div
          style={{
            position: 'absolute',
            left: '-2px',
            top: '120px',
            width: '3px',
            height: '32px',
            background: 'linear-gradient(180deg, #3a3a3c, #1c1c1e)',
            borderRadius: '2px 0 0 2px',
            boxShadow: 'inset -1px 0 1px rgba(0,0,0,0.4)',
          }}
        />
        {/* Volume up */}
        <div
          style={{
            position: 'absolute',
            left: '-2px',
            top: '170px',
            width: '3px',
            height: '54px',
            background: 'linear-gradient(180deg, #3a3a3c, #1c1c1e)',
            borderRadius: '2px 0 0 2px',
            boxShadow: 'inset -1px 0 1px rgba(0,0,0,0.4)',
          }}
        />
        {/* Volume down */}
        <div
          style={{
            position: 'absolute',
            left: '-2px',
            top: '232px',
            width: '3px',
            height: '54px',
            background: 'linear-gradient(180deg, #3a3a3c, #1c1c1e)',
            borderRadius: '2px 0 0 2px',
            boxShadow: 'inset -1px 0 1px rgba(0,0,0,0.4)',
          }}
        />

        {/* Tela */}
        <div
          style={{
            width: '100%',
            height: '100%',
            background: '#F2F2F7',
            borderRadius: '48px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Status bar */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 28px 0',
              fontSize: '13px',
              fontWeight: 600,
              color: '#1C1C1E',
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui',
              zIndex: 11,
            }}
          >
            <span style={{ paddingTop: 2 }}>{time}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, paddingTop: 2 }}>
              {/* Sinal celular — 4 barras */}
              <svg width="17" height="11" viewBox="0 0 17 11" fill="none" aria-hidden>
                <rect x="0" y="7" width="3" height="4" rx="0.5" fill="#1C1C1E" />
                <rect x="4.5" y="5" width="3" height="6" rx="0.5" fill="#1C1C1E" />
                <rect x="9" y="3" width="3" height="8" rx="0.5" fill="#1C1C1E" />
                <rect x="13.5" y="0" width="3" height="11" rx="0.5" fill="#1C1C1E" />
              </svg>
              {/* WiFi */}
              <svg width="16" height="11" viewBox="0 0 16 11" fill="none" aria-hidden>
                <path
                  d="M8 11l1.5-1.5a2.121 2.121 0 0 0-3 0L8 11zm-4-4l1.4 1.4a3.6 3.6 0 0 1 5.2 0L12 7a5.6 5.6 0 0 0-8 0zm-4-4l1.4 1.4a9.6 9.6 0 0 1 13.2 0L16 3a11.6 11.6 0 0 0-16 0z"
                  fill="#1C1C1E"
                />
              </svg>
              {/* Bateria */}
              <svg width="26" height="12" viewBox="0 0 26 12" fill="none" aria-hidden>
                <rect
                  x="0.5"
                  y="0.5"
                  width="22"
                  height="11"
                  rx="3"
                  stroke="#1C1C1E"
                  strokeOpacity="0.4"
                />
                <rect x="2" y="2" width="18" height="8" rx="1.5" fill="#1C1C1E" />
                <rect x="23.5" y="4" width="1.5" height="4" rx="0.5" fill="#1C1C1E" opacity="0.4" />
              </svg>
            </span>
          </div>

          {/* Dynamic Island */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '95px',
              height: '30px',
              background: '#000',
              borderRadius: '22px',
              zIndex: 12,
            }}
          />

          {/* Conteúdo do app — página pública AgendaPRO */}
          <div style={{ paddingTop: '52px', height: '100%', overflow: 'hidden' }}>
            {/* Hero card do negócio */}
            <div
              style={{
                background: `linear-gradient(135deg, ${screen.brandColor} 0%, ${screen.brandColor}D9 100%)`,
                height: '88px',
                position: 'relative',
              }}
            >
              {/* Avatar do negócio */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-26px',
                  left: '18px',
                  width: '52px',
                  height: '52px',
                  background: '#fff',
                  borderRadius: '14px',
                  border: '3px solid #F2F2F7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 800,
                  color: screen.brandColor,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
              >
                {screen.initial}
              </div>
            </div>

            <div style={{ padding: '32px 18px 8px' }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#1C1C1E',
                  letterSpacing: '-0.01em',
                }}
              >
                {screen.business}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#8E8E93',
                  marginTop: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8E8E93"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {screen.city}
              </div>
              {/* Avaliação Google */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '6px',
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#F59E0B" aria-hidden>
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#1C1C1E' }}>4.9</span>
                <span style={{ fontSize: '10px', color: '#8E8E93' }}>· 127 avaliações</span>
              </div>
            </div>

            {/* CTA Agendar */}
            <div style={{ padding: '10px 18px 14px' }}>
              <div
                style={{
                  background: '#1C1C1E',
                  borderRadius: '14px',
                  padding: '13px',
                  textAlign: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#fff',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                Agendar horário
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Lista de serviços */}
            <div style={{ padding: '0 18px 8px' }}>
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#8E8E93',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '8px',
                }}
              >
                Serviços
              </div>
              {screen.services.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '9px 11px',
                    background: '#fff',
                    borderRadius: '11px',
                    marginBottom: '5px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#1C1C1E',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {s.name}
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#8E8E93', marginTop: '1px' }}>
                      {s.time}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#1C1C1E',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {s.price}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reflexão sutil — gradient overlay no glass */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.04) 100%)',
              pointerEvents: 'none',
              borderRadius: '48px',
              zIndex: 13,
            }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  )
}
