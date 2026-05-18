import Image from 'next/image'

/**
 * Logo do business no header · prioriza brand_logo_url do business;
 * senão renderiza wordmark do nome em serif elegante (estilo Trajan);
 * fallback final é o logo AgendaPRO.
 *
 * Wordmark usa font-serif do system (Cambria/Georgia/etc) com tracking
 * expandido pra dar sensação monumental · estética premium quando não
 * tem logo customizado.
 */
export default function BrandHeaderLogo({
  brandLogoUrl,
  businessName,
}: {
  brandLogoUrl?: string | null
  businessName?: string | null
}) {
  if (brandLogoUrl) {
    return (
      <Image
        src={brandLogoUrl}
        alt={businessName ?? 'Logo'}
        width={120}
        height={28}
        priority
        style={{ height: 28, width: 'auto', objectFit: 'contain' }}
        unoptimized
      />
    )
  }

  if (businessName) {
    return (
      <span
        className="font-serif tracking-[0.18em] uppercase text-[12px] lg:text-[13px] font-medium leading-none"
        style={{
          color: 'var(--brand-secondary, var(--admin-text))',
          fontFamily: '"Cinzel", "Trajan Pro", Cambria, Georgia, serif',
        }}
      >
        {businessName}
      </span>
    )
  }

  return (
    <Image
      src="/logo-agendapro-dark.svg"
      alt="AgendaPRO"
      width={120}
      height={24}
      priority
      style={{ filter: 'var(--admin-logo-filter)' }}
    />
  )
}
