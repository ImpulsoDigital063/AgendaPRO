/**
 * BrandThemeInjector
 *
 * Injeta CSS variables baseado nas cores cadastradas no business. Substitui
 * --brand-primary, --brand-secondary, --admin-accent etc por valores
 * customizados, dando ao painel admin/recepção a identidade visual do
 * cliente sem afetar outros businesses.
 *
 * Quando alguma cor é NULL no business, mantém o default AgendaPRO (azul).
 * Universal — qualquer business pode customizar via colunas brand_* (v50).
 */

type BrandColors = {
  brand_primary?: string | null
  brand_secondary?: string | null
  brand_accent?: string | null
  brand_neutral?: string | null
}

export default function BrandThemeInjector({ brand }: { brand: BrandColors }) {
  const hasBrand =
    !!brand.brand_primary ||
    !!brand.brand_secondary ||
    !!brand.brand_accent ||
    !!brand.brand_neutral

  if (!hasBrand) return null

  const css = `
    :root, [data-admin-theme] {
      ${brand.brand_primary ? `
        --brand-primary: ${brand.brand_primary};
        --admin-accent: ${brand.brand_primary};
        --admin-accent-bg: color-mix(in srgb, ${brand.brand_primary} 14%, transparent);
        --admin-accent-border: color-mix(in srgb, ${brand.brand_primary} 30%, transparent);
        --admin-accent-strong: ${brand.brand_primary};
        --admin-bg-orb-1: color-mix(in srgb, ${brand.brand_primary} 24%, transparent);
      ` : ''}
      ${brand.brand_secondary ? `
        --brand-secondary: ${brand.brand_secondary};
        --admin-bg-orb-2: color-mix(in srgb, ${brand.brand_secondary} 22%, transparent);
      ` : ''}
      ${brand.brand_accent ? `
        --brand-accent: ${brand.brand_accent};
        --admin-bg-orb-3: color-mix(in srgb, ${brand.brand_accent} 18%, transparent);
      ` : ''}
    }
  `

  return <style dangerouslySetInnerHTML={{ __html: css }} />
}
