import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminThemeProvider from '@/components/admin/AdminThemeProvider'
import ProfissionalBottomNav from '@/components/profissional/ProfissionalBottomNav'
import ProfissionalMobileTopBar from '@/components/profissional/ProfissionalMobileTopBar'
import InstallBanner from '@/components/admin/InstallBanner'
import BrandThemeInjector from '@/components/admin/BrandThemeInjector'
import BrandDecorBackground from '@/components/admin/brand/BrandDecorBackground'
import SlugCacher from '@/components/admin/brand/SlugCacher'
import { todayBR } from '@/lib/date-br'

export default async function ProfissionalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/profissional/login')
  }

  // v177 · Owner do business sempre vai pra /admin (Salão99 pattern)
  // Caso Luana Palace: tem espelho em professionals (pra aparecer na lista)
  // mas o lar dela é /admin. Esse check roda ANTES do select de prof pra
  // pegar até quem tem auth_user_id linkado a espelho de owner.
  const { data: ownedBusiness } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (ownedBusiness) {
    redirect('/admin')
  }

  // Verifica se e um profissional com auth_user_id · puxa brand do business
  const { data: professional } = await supabase
    .from('professionals')
    .select('id, business_id, password_changed, employment_type, is_receptionist, business:businesses(name, slug, brand_logo_url, brand_primary, brand_secondary, brand_accent, brand_neutral)')
    .eq('auth_user_id', user.id)
    .single()

  if (!professional) {
    // Pode ser o dono — manda pro admin
    redirect('/admin')
  }

  // Forca troca de senha no primeiro acesso
  if (!professional.password_changed) {
    redirect('/profissional/trocar-senha')
  }

  // Recepcionista: tela própria, não atende
  if (professional.is_receptionist) {
    redirect('/recepcao')
  }

  // Sistema light-only (tema dark removido 03/06). Sem leitura de cookie de tema.
  const initialTheme = 'light' as const

  const employmentType = (professional.employment_type ?? 'commissioned') as 'commissioned' | 'employed'

  // Badge: agendamentos pendentes de hoje pra esse profissional.
  // λ.fuso · getFullYear/getMonth/getDate no SERVIDOR leem UTC: depois das 21h
  // no Brasil o badge contava os pendentes de AMANHÃ. todayBR resolve.
  const todayStr = todayBR()

  const { count: pendingCount } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('professional_id', professional.id)
    .eq('status', 'pending')
    .gte('appointment_date', todayStr)

  const business = (professional.business ?? {}) as {
    name?: string | null
    slug?: string | null
    brand_logo_url?: string | null
    brand_primary?: string | null
    brand_secondary?: string | null
    brand_accent?: string | null
    brand_neutral?: string | null
  }
  const businessSlug = business.slug ?? null

  return (
    <AdminThemeProvider initial={initialTheme}>
      <BrandThemeInjector brand={business} />
      <SlugCacher slug={businessSlug} />
      <div className="admin-shell" data-admin-theme={initialTheme}>
        {/* Decor scatter · só Palace · mobile+desktop · profissional opera no celular */}
        {businessSlug === 'palace-nail-spa' && (
          <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
            <BrandDecorBackground pattern="scatter" brand={businessSlug} opacity={0.02} />
          </div>
        )}
        <InstallBanner area="profissional" />
        {/* Topbar mobile (header + drawer) · só <lg · coexiste com BottomNav */}
        <ProfissionalMobileTopBar
          businessName={business.name ?? null}
          brandLogoUrl={business.brand_logo_url ?? null}
          employmentType={employmentType}
        />
        <div className="relative z-10" style={{ paddingBottom: 'calc(108px + env(safe-area-inset-bottom))' }}>
          {children}
        </div>
        <ProfissionalBottomNav
          employmentType={employmentType}
          pendingAppointments={pendingCount ?? 0}
        />
      </div>
    </AdminThemeProvider>
  )
}
