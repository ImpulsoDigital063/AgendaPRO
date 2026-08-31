import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminThemeProvider from '@/components/admin/AdminThemeProvider'
import ProfissionalBottomNav from '@/components/profissional/ProfissionalBottomNav'
import ProfissionalMobileTopBar from '@/components/profissional/ProfissionalMobileTopBar'
import RecepcaoMobileTopBar from '@/components/recepcao/RecepcaoMobileTopBar'
import RecepcaoBottomNav from '@/components/recepcao/RecepcaoBottomNav'
import RecepcaoDesktopSidebar from '@/components/recepcao/RecepcaoDesktopSidebar'
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
    .select('id, name, business_id, password_changed, employment_type, is_receptionist, does_appointments, ve_agenda, business:businesses(name, slug, brand_logo_url, brand_primary, brand_secondary, brand_accent, brand_neutral, prof_edita_horario, recep_edita_horario, vendas_balcao_enabled)')
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

  /* v144 · O REDIRECT SAIU DAQUI de propósito. Recepção que também atende
     (Josi) tem o balcão como tela principal, mas precisa alcançar o financeiro
     DELA — e um redirect no layout barrava toda subrota junto. Agora quem
     manda pro balcão é a home (/profissional/page.tsx), e as subrotas
     (financeiro, conta) seguem abertas pra quem tem ficha de profissional. */

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
    prof_edita_horario?: boolean | null
    recep_edita_horario?: boolean | null
    vendas_balcao_enabled?: boolean | null
  }
  const businessSlug = business.slug ?? null

  // v131 · negócio pode reservar a definição de horário pra dona e recepção.
  // Default `true` no banco → só some pra quem pediu (Studio Isis Melo).
  const podeEditarHorario = business.prof_edita_horario !== false

  /* v144 · quem entrou agora fica só com o financeiro (pedido da Isis), e quem
     acumula recepção ganha o atalho pro balcão. */
  const veAgenda = professional.ve_agenda !== false
  const operaRecepcao = professional.is_receptionist === true

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
        {/* v146 · UM MENU SÓ pra quem opera o balcão (Eduardo, 31/08).
            A Josi acumula recepção e atendimento. O menu do balcão mandava ela
            pra /profissional/financeiro em "Meus ganhos" — outra rota, outro
            layout, outro menu: o drawer virava "PAINEL DO PROFISSIONAL" com
            Início/Atendimentos/Bloqueios. Mesma pessoa, duas cascas, dependendo
            de onde tinha tocado por último.

            A rota não é quem decide o menu — a PESSOA é. Quem tem balcão vê o
            menu do balcão em qualquer lugar, inclusive aqui. Profissional que
            não é recepção não sente nada: cai no else, exatamente como antes. */}
        {operaRecepcao ? (
          <>
            <RecepcaoMobileTopBar
              businessName={business.name ?? null}
              brandLogoUrl={business.brand_logo_url ?? null}
              podeEditarHorario={business.recep_edita_horario === true}
              tambemAtende={professional.does_appointments === true}
              pessoaNome={professional.name as string}
              vendeProduto={business.vendas_balcao_enabled !== false}
            />
            <RecepcaoDesktopSidebar
              pessoaNome={professional.name as string}
              tambemAtende={professional.does_appointments === true}
              podeEditarHorario={business.recep_edita_horario === true}
              brand={{
                business_name: business.name ?? null,
                business_slug: business.slug ?? null,
                brand_logo_url: business.brand_logo_url ?? null,
              }}
            />
          </>
        ) : (
          /* Topbar mobile (header + drawer) · só <lg · coexiste com BottomNav */
          <ProfissionalMobileTopBar
            businessName={business.name ?? null}
            brandLogoUrl={business.brand_logo_url ?? null}
            employmentType={employmentType}
            podeEditarHorario={podeEditarHorario}
            veAgenda={veAgenda}
            operaRecepcao={operaRecepcao}
          />
        )}
        {/* DEPOIS da topbar de propósito (Eduardo 30/07, print do iPhone): a
            barra é `fixed` e quem empurra o conteúdo é o espaçador de 56px que
            ela renderiza logo abaixo de si (ProfissionalMobileTopBar:116).
            Com o banner ANTES, ele nascia nesses 56px e ficava escondido atrás
            da barra — o próprio card de boas-vindas mandava "toque no banner
            acima" e não tinha banner visível. Não é z-index: é ordem no fluxo. */}
        <InstallBanner area="profissional" />
        {/* SEM z-index aqui de propósito (bug visual reportado por Eduardo 30/07:
            "o modal fica abaixo da barra do header" no mobile).
            `z-10` num elemento posicionado cria CONTEXTO DE EMPILHAMENTO: o
            z-[300] do AgendarModal passava a valer só DENTRO desta caixa, e a
            caixa inteira (valendo 10) ficava atrás da topbar mobile (z-30).
            Com z-index auto não há contexto novo → o modal compete direto com a
            topbar e sobe. `relative` sozinho não cria contexto, e o conteúdo
            continua pintando acima do decor (fixed z-0) por ordem de DOM.
            ⚠️ admin/layout.tsx:216 e recepcao/layout.tsx:90 têm o MESMO padrão —
            a dona e a recepção sofrem o mesmo bug no celular. Entram na
            varredura (registrado no STATUS). */}
        <div
          className={operaRecepcao ? 'relative md:pl-[240px]' : 'relative'}
          style={{ paddingBottom: 'calc(108px + env(safe-area-inset-bottom))' }}
        >
          {children}
        </div>
        {operaRecepcao ? (
          /* dock do balcão · some em ≥md, onde a sidebar assume */
          <div className="md:hidden">
            <RecepcaoBottomNav
              tambemAtende={professional.does_appointments === true}
              podeEditarHorario={business.recep_edita_horario === true}
            />
          </div>
        ) : (
          <ProfissionalBottomNav
            employmentType={employmentType}
            pendingAppointments={pendingCount ?? 0}
            podeEditarHorario={podeEditarHorario}
            veAgenda={veAgenda}
            operaRecepcao={operaRecepcao}
          />
        )}
      </div>
    </AdminThemeProvider>
  )
}
