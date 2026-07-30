import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import AdminMobileTopBar from '@/components/admin/AdminMobileTopBar'
import InstallBanner from '@/components/admin/InstallBanner'
import AdminThemeProvider from '@/components/admin/AdminThemeProvider'
import AppSplash from '@/components/admin/AppSplash'
import BrandThemeInjector from '@/components/admin/BrandThemeInjector'
import BrandDecorBackground from '@/components/admin/brand/BrandDecorBackground'
import SlugCacher from '@/components/admin/brand/SlugCacher'
import AdminDesktopSidebar from '@/components/admin/desktop/AdminDesktopSidebar'
import TrialBanner from '@/components/admin/TrialBanner'
import BillingDueBanner from '@/components/admin/BillingDueBanner'
import { diasAteVencer } from '@/lib/billing'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentUser,
  getCurrentBusiness,
  getCurrentSubscription,
  getPendingAppointmentsCount,
  getPendingClaimsCount,
  getOwnerProfessional,
} from '@/lib/admin-data'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/admin/login')
  }

  const business = await getCurrentBusiness(user.id)

  // Sem negócio associado — pode ser estado temporário pós-cadastro; deixa passar
  let pendingAppointments = 0
  let pendingClaims = 0
  let showOwnerTab = false
  let trial: { diasRestantes: number; plano: string; precoMes: string; vencido?: boolean } | null = null
  let cobranca: { diasAteVencer: number; status: 'active' | 'past_due' } | null = null
  let brand: {
    brand_primary?: string | null
    brand_secondary?: string | null
    brand_accent?: string | null
    brand_neutral?: string | null
    brand_logo_url?: string | null
  } = {}
  let businessName: string | null = null
  let businessSlug: string | null = null

  if (business) {
    // Fetch brand colors (v50) + nome + slug · NULL = default AgendaPRO
    const supabase = await createClient()
    const { data: brandData } = await supabase
      .from('businesses')
      .select('name, slug, brand_primary, brand_secondary, brand_accent, brand_neutral, brand_logo_url')
      .eq('id', business.id)
      .maybeSingle()
    if (brandData) {
      brand = brandData
      businessName = brandData.name ?? null
      businessSlug = brandData.slug ?? null
    }
  }

  if (business) {
    // Subscription + counts + owner-prof em paralelo. Counts via
    // unstable_cache (TTL 30s) — segunda abertura nao bate Supabase.
    // owner-prof via React cache() (request-scoped) — usado aqui pra
    // condicionar bottom nav e em /admin/eu pra montar a tela.
    const [subscription, apptCount, claimsCount, ownerProf] = await Promise.all([
      getCurrentSubscription(business.id),
      getPendingAppointmentsCount(business.id),
      getPendingClaimsCount(business.id),
      getOwnerProfessional(user.id, business.id),
    ])

    // Defesa: negócio sem subscription = estado corrompido, manda pra bloqueado
    if (!subscription) {
      redirect('/admin/bloqueado')
    }

    const now = new Date()

    const graceExpired =
      subscription.grace_ends_at && new Date(subscription.grace_ends_at) < now

    // CHURN (cancelou/reembolsou) e pagante em atraso pós-carência → tela externa
    // /admin/bloqueado (copy própria de "assinatura cancelada").
    const blockedExterno =
      subscription.status === 'cancelled' ||
      !!subscription.refunded_at ||
      (subscription.status === 'past_due' && graceExpired)

    if (blockedExterno) {
      redirect('/admin/bloqueado')
    }

    // TRIAL VENCIDO (aguardando 1º pagamento) → NÃO joga pra tela externa.
    // Mantém o dono DENTRO do painel (menu/marca dele) e o leva pra a aba de
    // Plano ("teste acabou + pagar"). Decisão Eduardo 22/07 (opção A): sensação
    // de "minha conta pedindo renovação", não "fui expulso". A própria tela de
    // config passa (senão loop); as telas de operação puxam de volta pra o Plano.
    if (subscription.status === 'pending_payment') {
      const pathname = (await headers()).get('x-pathname') || ''
      // Fallback anti-loop: se o header não chegou (x-pathname vazio), cai no
      // comportamento antigo (/admin/bloqueado) — seguro, sem risco de loop.
      if (!pathname) {
        redirect('/admin/bloqueado')
      }
      if (!pathname.startsWith('/admin/configuracoes')) {
        redirect('/admin/configuracoes?tab=plano')
      }
    }

    pendingAppointments = apptCount
    pendingClaims = claimsCount
    showOwnerTab = !!ownerProf

    // TRIAL (7 dias, cravado 13/07): mesmo critério do billing-check —
    // ativo · sem ciclo de cobrança · sem assinatura recorrente · não é demo.
    // Sem esse aviso o teste vence e o dono só descobre no paywall.
    const emTrial =
      subscription.status === 'active' &&
      !subscription.permanent_courtesy &&
      !subscription.plan_modalidade &&
      !subscription.asaas_subscription_id &&
      !subscription.mp_subscription_id &&
      !!subscription.pago_ate

    if (emTrial) {
      const restaMs = new Date(subscription.pago_ate!).getTime() - now.getTime()
      trial = {
        diasRestantes: Math.max(0, Math.ceil(restaMs / (24 * 60 * 60 * 1000))),
        plano: subscription.plan === 'equipe' ? 'Equipe' : 'Solo',
        precoMes: `R$ ${Math.round((subscription.price_cents ?? 6700) / 100)}`,
      }
    }

    // TRIAL VENCIDO em CARÊNCIA (past_due + grace ainda válida · modalidade null =
    // não é pagante PIX): 3 dias de acesso liberado + faixa vermelha antes do
    // bloqueio (Eduardo 28/07 · "igual o pagante"). O blockedExterno acima já
    // deixou passar (carência não expirou). Aqui mostra a faixa com os dias que
    // faltam pra bloquear.
    const emTrialGrace =
      subscription.status === 'past_due' &&
      !subscription.permanent_courtesy &&
      !subscription.plan_modalidade &&
      !subscription.asaas_subscription_id &&
      !subscription.mp_subscription_id &&
      !!subscription.grace_ends_at &&
      new Date(subscription.grace_ends_at) > now

    if (emTrialGrace) {
      const restaMs = new Date(subscription.grace_ends_at!).getTime() - now.getTime()
      trial = {
        diasRestantes: Math.max(1, Math.ceil(restaMs / (24 * 60 * 60 * 1000))),
        plano: subscription.plan === 'equipe' ? 'Equipe' : 'Solo',
        precoMes: `R$ ${Math.round((subscription.price_cents ?? 6700) / 100)}`,
        vencido: true,
      }
    }

    // COBRANÇA PIX no painel (cravado 18/07): assinatura PIX perto de vencer
    // ou vencida (ainda na carência — se a carência já venceu o gate acima
    // redirecionou pra /bloqueado). Mostra a faixa com "Pagar agora" ≤3 dias.
    // Cartão automático (Asaas retenta só) e trial (modalidade null) ficam de fora.
    const modPix =
      subscription.plan_modalidade === 'mensal_pix' ||
      subscription.plan_modalidade === 'semestral_pix' ||
      subscription.plan_modalidade === 'anual_pix'

    if (
      modPix &&
      subscription.pago_ate &&
      (subscription.status === 'active' || subscription.status === 'past_due')
    ) {
      const dias = diasAteVencer(subscription.pago_ate)
      if (dias <= 3) {
        cobranca = {
          diasAteVencer: dias,
          status: subscription.status === 'past_due' ? 'past_due' : 'active',
        }
      }
    }
  }

  // Sistema light-only (tema dark removido 03/06). Sem leitura de cookie de tema.
  const initialTheme = 'light' as const

  return (
    <AdminThemeProvider initial={initialTheme}>
      <BrandThemeInjector brand={brand} />
      <SlugCacher slug={businessSlug} />
      <div className="admin-shell admin-shell--with-sidebar" data-admin-theme={initialTheme}>
        <AppSplash />
        {/* Decoração de marca · só desktop · só Palace · pattern scatter sutil
            atrás de todas as views admin. Mobile (Olímpio/Leticia/Erlane prod)
            NÃO renderiza nada. Regra mobile/desktop isolation cravada 19-20/05. */}
        {businessSlug === 'palace-nail-spa' && (
          <div
            aria-hidden
            className="hidden lg:block pointer-events-none fixed inset-0 z-0"
          >
            <BrandDecorBackground pattern="scatter" brand={businessSlug} opacity={0.025} />
          </div>
        )}
        <AdminDesktopSidebar
          brand={{ business_name: businessName, business_slug: businessSlug, brand_logo_url: brand.brand_logo_url ?? null }}
          pendingAppointments={pendingAppointments}
          pendingClaims={pendingClaims}
        />
        <div className="admin-shell-content relative z-10">
          {/* Topbar mobile (header + drawer agrupado) · só <lg · coexiste com BottomNav */}
          <AdminMobileTopBar
            businessName={businessName}
            brandLogoUrl={brand.brand_logo_url ?? null}
            pendingAppointments={pendingAppointments}
            pendingClaims={pendingClaims}
            showOwnerTab={showOwnerTab}
          />
          {/* DEPOIS da topbar (mesmo motivo do painel da profissional · 30/07):
              a barra é fixed e o espaçador dela é quem empurra o conteúdo. Com
              o banner antes, ele ficava escondido atrás da barra no celular —
              a dona nunca via o convite de instalar o app. */}
          <InstallBanner />
          {trial && (
            <TrialBanner
              diasRestantes={trial.diasRestantes}
              plano={trial.plano}
              precoMes={trial.precoMes}
              vencido={trial.vencido}
            />
          )}
          {cobranca && (
            <BillingDueBanner
              diasAteVencer={cobranca.diasAteVencer}
              status={cobranca.status}
            />
          )}
          {children}
        </div>
      </div>
    </AdminThemeProvider>
  )
}
