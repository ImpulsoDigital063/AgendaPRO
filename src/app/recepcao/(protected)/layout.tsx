import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAdminAccess } from '@/lib/admin-data'
import AdminThemeProvider from '@/components/admin/AdminThemeProvider'
import InstallBanner from '@/components/admin/InstallBanner'
import RecepcaoBottomNav from '@/components/recepcao/RecepcaoBottomNav'
import RecepcaoMobileTopBar from '@/components/recepcao/RecepcaoMobileTopBar'
import RecepcaoDesktopSidebar from '@/components/recepcao/RecepcaoDesktopSidebar'
import BrandThemeInjector from '@/components/admin/BrandThemeInjector'
import BrandDecorBackground from '@/components/admin/brand/BrandDecorBackground'
import SlugCacher from '@/components/admin/brand/SlugCacher'
import { painelDaClinica } from '@/lib/vitrine/painel'
import { classesDoPainel, FundoDaClinica } from '@/components/admin/brand/PainelClinica'
import CentralNotificacoes from '@/components/notificacoes/CentralNotificacoes'
import PushEnableBanner from '@/components/admin/PushEnableBanner'
import { sinalConferidoPelaRecepcao } from '@/lib/sinal-conferencia'
import { metadataDoApp } from '@/lib/vitrine/app-instalado'

// app instalado com nome, ícone e abertura da clínica (só quem tem `app` na vitrine)
export async function generateMetadata() {
  return metadataDoApp()
}

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

  // v155 · gerente que também é recepção mora no /admin (acesso maior)
  if (await getAdminAccess(user.id)) redirect('/admin')

  const { data: professional, error: profError } = await supabase
    .from('professionals')
    .select('id, business_id, password_changed, name, is_receptionist, does_appointments, business:businesses(name, slug, brand_logo_url, brand_primary, brand_secondary, brand_accent, brand_neutral, recep_edita_horario, vendas_balcao_enabled)')
    .eq('auth_user_id', user.id)
    .single()

  console.log('[RECEPCAO-LAYOUT] prof query:', { hasProf: !!professional, prof: professional, error: profError?.message })

  if (!professional) {
    console.log('[RECEPCAO-LAYOUT] redirect /login · no prof')
    redirect('/profissional/login')
  }

  /* v144 · quem acumula recepção + atendimento (Josi) entra aqui pelo atalho do
     painel dela. O gate segue sendo is_receptionist — o que mudou foi o painel
     do profissional parar de expulsar quem tem os dois papéis. */
  if (!professional.is_receptionist) {
    console.log('[RECEPCAO-LAYOUT] redirect /profissional · not recep')
    redirect('/profissional')
  }

  if (!professional.password_changed) {
    console.log('[RECEPCAO-LAYOUT] redirect /trocar-senha · password_changed=false')
    redirect('/profissional/trocar-senha')
  }

  console.log('[RECEPCAO-LAYOUT] renderizando · OK')

  // Sistema light-only (tema dark removido 03/06). Sem leitura de cookie de tema.
  const initialTheme = 'light' as const

  const business = (professional.business ?? {}) as {
    name?: string | null
    slug?: string | null
    brand_logo_url?: string | null
    brand_primary?: string | null
    brand_secondary?: string | null
    brand_accent?: string | null
    brand_neutral?: string | null
  }
  const brand = business
  const businessSlug = business.slug ?? null

  // protótipo · clínica com vitrine veste a identidade dela no painel (painel.ts)
  const painel = painelDaClinica(businessSlug)
  // v174 · a recepção confere o comprovante do sinal: item "Sinais a conferir"
  const conferirSinal = await sinalConferidoPelaRecepcao(supabase, professional.business_id as string)

  return (
    <AdminThemeProvider initial={initialTheme}>
      <BrandThemeInjector brand={brand} />
      <SlugCacher slug={businessSlug} />
      <div className={`admin-shell${painel ? ` ${classesDoPainel}` : ''}`} data-admin-theme={initialTheme}>
        {painel && <FundoDaClinica monograma={painel.monograma} />}
        {/* Decor scatter sutil · só Palace · funciona em mobile+desktop (Leticia opera no celular) */}
        {businessSlug === 'palace-nail-spa' && (
          <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
            <BrandDecorBackground pattern="scatter" brand={businessSlug} opacity={0.02} />
          </div>
        )}
        {/* painel da clínica: o convite de instalar mora em Notificações */}
        {!painel && <InstallBanner area="profissional" />}

        {/* Sidebar tablet+desktop · fixa em ≥md · Letícia opera em iPad */}
        {/* v133 · aba Horários só pra negócio que passou essa decisão pra recepção */}
        {/* v144 · menu completo no celular: o dock cabe 5 itens e o balcão tem 11.
            Sem isto, Comandas, Produtos e Pacotes eram inalcançáveis no mobile. */}
        <RecepcaoMobileTopBar
          businessName={business.name ?? null}
          brandLogoUrl={painel?.monograma ?? business.brand_logo_url ?? null}
          podeEditarHorario={(business as { recep_edita_horario?: boolean | null }).recep_edita_horario === true}
          tambemAtende={professional.does_appointments === true}
          pessoaNome={professional.name as string}
          notificacoesBase={painel ? '/recepcao' : undefined}
          conferirSinal={conferirSinal}
          vendeProduto={(business as { vendas_balcao_enabled?: boolean | null }).vendas_balcao_enabled !== false}
        />
        <RecepcaoDesktopSidebar
          pessoaNome={professional.name as string}
          tambemAtende={professional.does_appointments === true}
          podeEditarHorario={(business as { recep_edita_horario?: boolean | null }).recep_edita_horario === true}
          brand={{
            business_name: business.name ?? null,
            business_slug: business.slug ?? null,
            brand_logo_url: business.brand_logo_url ?? null,
          }}
          marcaClinica={painel}
          notificacoesBase={painel ? '/recepcao' : undefined}
          conferirSinal={conferirSinal}
        />

        {/* Main area · padding-bottom pra tabbar mobile · padding-left pra sidebar tablet+ */}
        <div
          className="relative z-10 md:pl-[240px]"
          style={{ paddingBottom: 'calc(108px + env(safe-area-inset-bottom))' }}
        >
          {painel && (
            <CentralNotificacoes
              base="/recepcao"
              itens={[<InstallBanner key="instalar" area="profissional" />, <PushEnableBanner key="push" />]}
            />
          )}
          {children}
        </div>

        {/* Tab bar mobile · escondida em ≥md (sidebar substitui) */}
        <div className="md:hidden">
          <RecepcaoBottomNav
            tambemAtende={professional.does_appointments === true}
            podeEditarHorario={(business as { recep_edita_horario?: boolean | null }).recep_edita_horario === true}
          />
        </div>
      </div>
    </AdminThemeProvider>
  )
}
