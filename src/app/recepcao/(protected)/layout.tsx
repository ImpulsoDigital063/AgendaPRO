import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import AdminThemeProvider from '@/components/admin/AdminThemeProvider'
import InstallBanner from '@/components/admin/InstallBanner'
import RecepcaoBottomNav from '@/components/recepcao/RecepcaoBottomNav'
import BrandThemeInjector from '@/components/admin/BrandThemeInjector'
import BrandDecorBackground from '@/components/admin/brand/BrandDecorBackground'
import SlugCacher from '@/components/admin/brand/SlugCacher'

export default async function RecepcaoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  console.log('[RECEPCAO-LAYOUT] getUser:', { hasUser: !!user, userId: user?.id, error: userError?.message })

  if (!user) {
    console.log('[RECEPCAO-LAYOUT] redirect /login · no user')
    redirect('/profissional/login')
  }

  const { data: professional, error: profError } = await supabase
    .from('professionals')
    .select('id, business_id, password_changed, is_receptionist, business:businesses(slug, brand_primary, brand_secondary, brand_accent, brand_neutral)')
    .eq('auth_user_id', user.id)
    .single()

  console.log('[RECEPCAO-LAYOUT] prof query:', { hasProf: !!professional, prof: professional, error: profError?.message })

  if (!professional) {
    console.log('[RECEPCAO-LAYOUT] redirect /login · no prof')
    redirect('/profissional/login')
  }

  if (!professional.is_receptionist) {
    console.log('[RECEPCAO-LAYOUT] redirect /profissional · not recep')
    redirect('/profissional')
  }

  if (!professional.password_changed) {
    console.log('[RECEPCAO-LAYOUT] redirect /trocar-senha · password_changed=false')
    redirect('/profissional/trocar-senha')
  }

  console.log('[RECEPCAO-LAYOUT] renderizando · OK')

  const cookieStore = await cookies()
  const initialTheme = (cookieStore.get('admin_theme')?.value === 'light' ? 'light' : 'dark') as 'dark' | 'light'

  const business = (professional.business ?? {}) as {
    slug?: string | null
    brand_primary?: string | null
    brand_secondary?: string | null
    brand_accent?: string | null
    brand_neutral?: string | null
  }
  const brand = business
  const businessSlug = business.slug ?? null

  return (
    <AdminThemeProvider initial={initialTheme}>
      <BrandThemeInjector brand={brand} />
      <SlugCacher slug={businessSlug} />
      <div className="admin-shell" data-admin-theme={initialTheme}>
        {/* Decor scatter sutil · só Palace · funciona em mobile+desktop (Leticia opera no celular) */}
        {businessSlug === 'palace-nail-spa' && (
          <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
            <BrandDecorBackground pattern="scatter" brand={businessSlug} opacity={0.02} />
          </div>
        )}
        <InstallBanner area="profissional" />
        <div className="relative z-10" style={{ paddingBottom: 'calc(108px + env(safe-area-inset-bottom))' }}>
          {children}
        </div>
        <RecepcaoBottomNav />
      </div>
    </AdminThemeProvider>
  )
}
