/**
 * IPhoneRealMockup — mockup com FOTO REAL de mão segurando iPhone 16 Pro
 *
 * Foto base: /public/images/lp/iphone-hand-mockup.jpg (1600×1200)
 * A UI do AgendaPRO é injetada dentro do retângulo da tela do iPhone via
 * absolute positioning em % da imagem.
 *
 * Coordenadas da tela (medidas visualmente na foto, % do container):
 *   top:    9%
 *   left:  38%
 *   width: 36%
 *   height: 66%
 *   rotation: 3.2° (mão inclina o iphone levemente)
 *   border-radius: 11% (cantos do iPhone 16 Pro)
 *
 * Variant prop muda nome do negócio + paleta + serviços (igual ao
 * IPhoneMockup v1 SVG).
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
    brandColor: '#F59E0B',
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
  /** Largura máxima do container (ex: 480, 520). Default 520 */
  maxWidth?: number
  className?: string
}

export default function IPhoneRealMockup({
  variant = 'barbearia',
  maxWidth = 520,
  className = '',
}: Props) {
  const screen = SCREENS[variant]

  return (
    <div
      className={`relative w-full ${className}`}
      style={{
        maxWidth,
        aspectRatio: '4 / 3',
      }}
    >
      {/* Foto da mão segurando iPhone */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/lp/iphone-hand-mockup.jpg"
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
        style={{ zIndex: 1 }}
      />

      {/* Tela do iPhone — UI injetada com leve inclinação pra acompanhar a mão */}
      <div
        className="absolute overflow-hidden"
        style={{
          top: '9%',
          left: '38%',
          width: '36%',
          height: '66%',
          borderRadius: '11%',
          transform: 'rotate(3.2deg)',
          transformOrigin: 'center',
          zIndex: 2,
          background: '#F2F2F7',
          // Sombra interna sutil pra dar profundidade do glass
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
        }}
      >
        <ScreenContentInner screen={screen} />

        {/* Gloss overlay sutil — cumple papel do reflexo do display */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.04) 100%)',
          }}
        />
      </div>
    </div>
  )
}

/**
 * Conteúdo da tela — separado pra ficar mais legível.
 * Usa container queries (cqw/cqh) pra escalar com o tamanho da tela injetada.
 */
function ScreenContentInner({ screen }: { screen: ScreenContent }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#F2F2F7',
        position: 'relative',
        overflow: 'hidden',
        containerType: 'size',
      }}
    >
      {/* Status bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '7%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '2.5% 7% 0',
          fontSize: '4cqw',
          fontWeight: 600,
          color: '#1C1C1E',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui',
          zIndex: 11,
        }}
      >
        <span>9:41</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '2cqw' }}>
          <svg width="4.5%" viewBox="0 0 17 11" fill="none" aria-hidden style={{ height: 'auto' }}>
            <rect x="0" y="7" width="3" height="4" rx="0.5" fill="#1C1C1E" />
            <rect x="4.5" y="5" width="3" height="6" rx="0.5" fill="#1C1C1E" />
            <rect x="9" y="3" width="3" height="8" rx="0.5" fill="#1C1C1E" />
            <rect x="13.5" y="0" width="3" height="11" rx="0.5" fill="#1C1C1E" />
          </svg>
          <svg width="4.5%" viewBox="0 0 16 11" fill="none" aria-hidden style={{ height: 'auto' }}>
            <path
              d="M8 11l1.5-1.5a2.121 2.121 0 0 0-3 0L8 11zm-4-4l1.4 1.4a3.6 3.6 0 0 1 5.2 0L12 7a5.6 5.6 0 0 0-8 0zm-4-4l1.4 1.4a9.6 9.6 0 0 1 13.2 0L16 3a11.6 11.6 0 0 0-16 0z"
              fill="#1C1C1E"
            />
          </svg>
          <svg width="7%" viewBox="0 0 26 12" fill="none" aria-hidden style={{ height: 'auto' }}>
            <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke="#1C1C1E" strokeOpacity="0.4" />
            <rect x="2" y="2" width="18" height="8" rx="1.5" fill="#1C1C1E" />
            <rect x="23.5" y="4" width="1.5" height="4" rx="0.5" fill="#1C1C1E" opacity="0.4" />
          </svg>
        </span>
      </div>

      {/* Hero card do negócio — banner colorido */}
      <div
        style={{
          marginTop: '7%',
          background: `linear-gradient(135deg, ${screen.brandColor} 0%, ${screen.brandColor}D9 100%)`,
          height: '14%',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: '-30%',
            left: '6%',
            width: '18%',
            aspectRatio: '1 / 1',
            background: '#fff',
            borderRadius: '20%',
            border: '4% solid #F2F2F7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '7cqw',
            fontWeight: 800,
            color: screen.brandColor,
            boxShadow: '0 4% 12% rgba(0,0,0,0.15)',
          }}
        >
          {screen.initial}
        </div>
      </div>

      <div style={{ padding: '5% 6% 1.5%' }}>
        <div
          style={{
            fontSize: '4.6cqw',
            fontWeight: 700,
            color: '#1C1C1E',
            marginTop: '4%',
            letterSpacing: '-0.01em',
            lineHeight: 1.1,
          }}
        >
          {screen.business}
        </div>
        <div
          style={{
            fontSize: '3.6cqw',
            color: '#8E8E93',
            marginTop: '1.2%',
            display: 'flex',
            alignItems: 'center',
            gap: '1%',
          }}
        >
          <svg width="3.5cqw" height="3.5cqw" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {screen.city}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5%',
            marginTop: '2%',
          }}
        >
          <svg width="3.5cqw" height="3.5cqw" viewBox="0 0 24 24" fill="#F59E0B" aria-hidden>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span style={{ fontSize: '3.4cqw', fontWeight: 600, color: '#1C1C1E' }}>4.9</span>
          <span style={{ fontSize: '3.4cqw', color: '#8E8E93' }}>· 127 avaliações</span>
        </div>
      </div>

      {/* CTA Agendar */}
      <div style={{ padding: '2% 6% 3%' }}>
        <div
          style={{
            background: '#1C1C1E',
            borderRadius: '14%',
            padding: '4%',
            textAlign: 'center',
            fontSize: '4.4cqw',
            fontWeight: 700,
            color: '#fff',
            boxShadow: '0 6% 16% rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2%',
          }}
        >
          Agendar horário
          <svg width="4cqw" height="4cqw" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* Lista de serviços */}
      <div style={{ padding: '0 6% 2%' }}>
        <div
          style={{
            fontSize: '3cqw',
            fontWeight: 700,
            color: '#8E8E93',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '2.2%',
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
              padding: '3% 4%',
              background: '#fff',
              borderRadius: '11%',
              marginBottom: '1.5%',
              boxShadow: '0 1% 3% rgba(0,0,0,0.04)',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '3.6cqw',
                  fontWeight: 600,
                  color: '#1C1C1E',
                  letterSpacing: '-0.01em',
                }}
              >
                {s.name}
              </div>
              <div style={{ fontSize: '3cqw', color: '#8E8E93', marginTop: '1%' }}>
                {s.time}
              </div>
            </div>
            <div
              style={{
                fontSize: '3.6cqw',
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
  )
}
