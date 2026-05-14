import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * Helpers cacheados via React cache() — deduplica queries Supabase
 * dentro do MESMO request entre layout, page e qualquer server
 * component descendente.
 *
 * Ex: layout chama getCurrentBusiness pra checar status de subscription,
 * page.tsx chama de novo pra ler appointments do mesmo business →
 * Supabase e atingido UMA SO VEZ, nao duas.
 *
 * cache() e request-scoped: dois requests diferentes nao compartilham,
 * mas dentro de um mesmo request, args identicos retornam o mesmo
 * Promise (sem refazer a query).
 */

export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

export const getCurrentBusiness = cache(async (ownerId: string) => {
  const supabase = await createClient()

  // Race em pos-cadastro/pos-pagamento: webhook ou polling triggera refresh,
  // query Supabase pode retornar null transitoriamente (replicacao, conexao
  // pool exaurida). Sem retry, page redireciona pra /cadastro mesmo com
  // business EXISTINDO no DB — risco de cliente criar negocio duplicado.
  // .maybeSingle() distingue "0 rows" (sem erro) de erro real de query.
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', ownerId)
      .maybeSingle()

    if (business) return business
    if (!error) return null // 0 rows confirmado, nao precisa tentar de novo

    if (attempt === 0) {
      await new Promise((r) => setTimeout(r, 200))
      continue
    }
    console.error('[getCurrentBusiness] erro persistente:', error.message)
  }
  return null
})

export const getCurrentSubscription = cache(async (businessId: string) => {
  const supabase = await createClient()
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('business_id', businessId)
    .single()
  return subscription
})

/**
 * Profissional vinculado ao admin (owner).
 *
 * Quando o dono também atende clientes (caso comum em barbearia
 * pequena), tem um registro em `professionals` com role='owner' e
 * auth_user_id = id do dono. /api/cadastro cria automaticamente
 * desde 30/04/2026 (V28 backfilou o histórico).
 *
 * Retorna null se o admin não atende (raro, mas possível em gestão pura).
 *
 * Uso: tela /admin renderiza seção "Você como profissional" só quando
 * essa query devolve algo. Sem rota nova, sem login duplo — mesma tela.
 */
export const getOwnerProfessional = cache(async (ownerId: string, businessId: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('professionals')
    .select('id, name, commission_percentage, employment_type, photo_url')
    .eq('auth_user_id', ownerId)
    .eq('business_id', businessId)
    .eq('active', true)
    .maybeSingle()
  return data
})

/**
 * ============================================================
 * Cross-request cache (unstable_cache + service-role client)
 * ============================================================
 *
 * As funcoes abaixo usam unstable_cache do Next, que persiste o
 * resultado entre REQUESTS diferentes (ate o TTL revalidate). Util pra
 * dashboards onde o usuario abre/fecha varias vezes em sequencia —
 * segunda abertura nao bate Supabase ate o cache expirar.
 *
 * Usam service_role client porque unstable_cache desacopla da request
 * (nao ha cookies disponiveis). Seguranca: TODAS as queries filtram
 * explicitamente por business_id, que e validado pelo layout antes de
 * chegar aqui (so o owner do business consegue acessar /admin).
 *
 * TTLs curtos pra dashboard:
 *   appointments today:    15s — quase tempo real (bot agendou? ja ve)
 *   appointments upcoming: 60s — proximos dias mudam pouco
 *   activity log:          60s — atividade da equipe
 *   counts (claims/pendings): 30s — badges da bottom nav
 */

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export const getAppointmentsToday = unstable_cache(
  async (businessId: string, today: string) => {
    const admin = getServiceClient()
    const { data } = await admin
      .from('appointments')
      .select(`*, professional:professionals(name)`)
      .eq('business_id', businessId)
      .eq('appointment_date', today)
      .order('start_time', { ascending: true })
    return data ?? []
  },
  ['admin-appointments-today'],
  { revalidate: 15 }
)

export const getUpcomingAppointments = unstable_cache(
  async (businessId: string, todayStr: string, nextWeekStr: string) => {
    const admin = getServiceClient()
    const { data } = await admin
      .from('appointments')
      .select(`*, professional:professionals(name)`)
      .eq('business_id', businessId)
      .gt('appointment_date', todayStr)
      .lte('appointment_date', nextWeekStr)
      .in('status', ['pending', 'confirmed'])
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(10)
    return data ?? []
  },
  ['admin-appointments-upcoming'],
  { revalidate: 60 }
)

export const getRecentActivity = unstable_cache(
  async (businessId: string) => {
    const admin = getServiceClient()
    const { data } = await admin
      .from('activity_log')
      .select('*, professional:professionals(name)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(8)
    return data ?? []
  },
  ['admin-recent-activity'],
  { revalidate: 60 }
)

export const getPendingAppointmentsCount = unstable_cache(
  async (businessId: string) => {
    const admin = getServiceClient()
    const { count } = await admin
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('status', 'pending')
    return count ?? 0
  },
  ['admin-pending-appt-count'],
  { revalidate: 30 }
)

export const getPendingClaimsCount = unstable_cache(
  async (businessId: string) => {
    const admin = getServiceClient()
    const { count } = await admin
      .from('review_claims')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('status', 'pending')
    return count ?? 0
  },
  ['admin-pending-claims-count'],
  { revalidate: 30 }
)

/**
 * Foco do Dia — agrega 4-5 sinais pra dono saber o que fazer AGORA.
 * Transforma home admin de "report passivo" em "ferramenta proativa".
 * CIC rodada 5 sugeriu como melhoria critica que ainda faltava.
 *
 * Cada item retorna { count, value? } — UI decide se mostra.
 * Cache 30s pra nao sobrecarregar; dono atualiza a pagina pra ver
 * mudancas imediatas.
 */
export type FocoDoDia = {
  pendingClaims: number
  pendingPayments: { count: number; total: number }
  sumidosSemCupom: number
  /** v42 · 14/05 — aniversariantes do mês atual sem cupom ativo */
  aniversariantesSemCupom: number
  cupomExpirando: number
  lucroVsAnterior: { current: number; previous: number; pct: number | null } | null
}

export const getFocoDoDia = unstable_cache(
  async (businessId: string): Promise<FocoDoDia> => {
    const admin = getServiceClient()
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    const dayAfterTomorrow = new Date(today)
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
    const nowIso = today.toISOString()
    const tomorrowEnd = new Date(tomorrow)
    tomorrowEnd.setHours(23, 59, 59, 999)
    const tomorrowEndIso = tomorrowEnd.toISOString()

    // Janela rolling 30d (mesma do filtro "Mes")
    const start30 = new Date(today)
    start30.setDate(start30.getDate() - 30)
    const start60 = new Date(today)
    start60.setDate(start60.getDate() - 60)
    const start31 = new Date(today)
    start31.setDate(start31.getDate() - 31)

    const [
      claimsRes,
      pendingPaymentsRes,
      apptsForSumidos,
      couponsRes,
      currentRevenue,
      prevRevenue,
      currentExpenses,
      prevExpenses,
    ] = await Promise.all([
      admin
        .from('review_claims')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('status', 'pending'),
      admin
        .from('appointments')
        .select('total_price')
        .eq('business_id', businessId)
        .eq('appointment_date', todayStr)
        .eq('status', 'completed')
        .is('paid_at', null),
      admin
        .from('appointments')
        .select('client_id, appointment_date')
        .eq('business_id', businessId)
        .not('client_id', 'is', null)
        .order('appointment_date', { ascending: false })
        // LIMIT defensivo · businesses com 10k+ agendamentos teriam query
        // lenta. 10k cobre ~ano de uso de salão movimentado (30 agend/dia).
        // Cliente cujo último agendamento esteja além disso = sumido absoluto
        // e não muda decisão de campanha.
        .limit(10000),
      admin
        .from('coupons')
        .select('id, customer_id, used_at, expires_at')
        .eq('business_id', businessId)
        .is('used_at', null)
        .gt('expires_at', nowIso)
        .lte('expires_at', tomorrowEndIso),
      admin
        .from('appointments')
        .select('total_price, payment_method')
        .eq('business_id', businessId)
        .gte('appointment_date', start30.toISOString().split('T')[0])
        .lte('appointment_date', todayStr)
        .not('paid_at', 'is', null),
      admin
        .from('appointments')
        .select('total_price, payment_method')
        .eq('business_id', businessId)
        .gte('appointment_date', start60.toISOString().split('T')[0])
        .lte('appointment_date', start31.toISOString().split('T')[0])
        .not('paid_at', 'is', null),
      admin
        .from('expenses')
        .select('amount')
        .eq('business_id', businessId)
        .gte('occurred_at', start30.toISOString().split('T')[0])
        .lte('occurred_at', todayStr),
      admin
        .from('expenses')
        .select('amount')
        .eq('business_id', businessId)
        .gte('occurred_at', start60.toISOString().split('T')[0])
        .lte('occurred_at', start31.toISOString().split('T')[0]),
    ])

    // Pagamentos pendentes hoje
    const pendingTotal = (pendingPaymentsRes.data || []).reduce(
      (s, a) => s + (a.total_price || 0),
      0
    )

    // Sumidos sem cupom — calcula via lookup similar ao /reativar
    const SUMIDO_DAYS = 40
    const cutoffDate = new Date(today)
    cutoffDate.setDate(cutoffDate.getDate() - SUMIDO_DAYS)
    const cutoffStr = cutoffDate.toISOString().split('T')[0]
    const lastByClient = new Map<string, string>()
    for (const a of apptsForSumidos.data || []) {
      if (a.client_id && !lastByClient.has(a.client_id)) {
        lastByClient.set(a.client_id, a.appointment_date)
      }
    }
    const sumidoClientIds = Array.from(lastByClient.entries())
      .filter(([, date]) => date < cutoffStr)
      .map(([cid]) => cid)

    let sumidosSemCupom = 0
    if (sumidoClientIds.length > 0) {
      const { data: sumidoClients } = await admin
        .from('clients')
        .select('phone')
        .in('id', sumidoClientIds)
      const phones = (sumidoClients || []).map((c) => c.phone)
      if (phones.length > 0) {
        const { data: customersOfBusiness } = await admin
          .from('customers')
          .select('id')
          .eq('business_id', businessId)
          .in('phone', phones)

        // Cupons ativos pra business
        const { data: allActiveCoupons } = await admin
          .from('coupons')
          .select('customer_id')
          .eq('business_id', businessId)
          .is('used_at', null)
          .gt('expires_at', nowIso)
        const customerIdsWithActiveCoupon = new Set(
          (allActiveCoupons || [])
            .map((c) => c.customer_id)
            .filter(Boolean) as string[]
        )
        sumidosSemCupom = (customersOfBusiness || []).filter(
          (c) => !customerIdsWithActiveCoupon.has(c.id)
        ).length
      }
    }

    // Lucro vs anterior (rolling 30d)
    const sumRevenue = (rows: Array<{ total_price: number | null; payment_method: string | null }>) =>
      rows
        .filter((a) => a.payment_method !== 'courtesy')
        .reduce((s, a) => s + (a.total_price || 0), 0)
    const sumExpense = (rows: Array<{ amount: number }>) =>
      rows.reduce((s, e) => s + Number(e.amount || 0), 0)

    const currentRev = sumRevenue(currentRevenue.data || [])
    const prevRev = sumRevenue(prevRevenue.data || [])
    const currentExp = sumExpense(currentExpenses.data || [])
    const prevExp = sumExpense(prevExpenses.data || [])
    const currentLucro = currentRev - currentExp
    const prevLucro = prevRev - prevExp
    const pct = prevLucro > 0 ? ((currentLucro - prevLucro) / prevLucro) * 100 : null

    // Aniversariantes do mês sem cupom ativo (v42 · 14/05)
    const currentMonth = today.getMonth() + 1
    const monthStr = String(currentMonth).padStart(2, '0')
    const { data: customersWithBirthday } = await admin
      .from('customers')
      .select('id, birthday')
      .eq('business_id', businessId)
      .not('birthday', 'is', null)

    const aniversariantesIds = (customersWithBirthday || [])
      .filter((c) => typeof c.birthday === 'string' && c.birthday.slice(5, 7) === monthStr)
      .map((c) => c.id)

    const { data: activeCouponsForBday } = aniversariantesIds.length > 0
      ? await admin
          .from('coupons')
          .select('customer_id')
          .eq('business_id', businessId)
          .is('used_at', null)
          .gt('expires_at', nowIso)
      : { data: [] }
    const bdayActiveCouponSet = new Set(
      (activeCouponsForBday || [])
        .map((c) => c.customer_id)
        .filter(Boolean) as string[]
    )
    const aniversariantesSemCupom = aniversariantesIds.filter(
      (id) => !bdayActiveCouponSet.has(id)
    ).length

    return {
      pendingClaims: claimsRes.count ?? 0,
      pendingPayments: { count: pendingPaymentsRes.data?.length ?? 0, total: pendingTotal },
      sumidosSemCupom,
      aniversariantesSemCupom,
      cupomExpirando: couponsRes.data?.length ?? 0,
      lucroVsAnterior: currentRev > 0 || prevRev > 0
        ? { current: currentLucro, previous: prevLucro, pct }
        : null,
    }
  },
  ['admin-foco-do-dia'],
  { revalidate: 30 }
)

/**
 * ============================================================
 * Onboarding state — checklist do tutorial admin
 * ============================================================
 *
 * Deriva o progresso direto do estado SQL (sem flag "checklist
 * completed" — defensivo: se admin deletar tudo, checklist volta).
 * Apenas as flags de "intenção do usuário" (welcome_modal_seen,
 * qr_code_compartilhado, etc.) vivem em colunas booleanas.
 *
 * Usado em: /admin/(protected)/page.tsx (home) pra renderizar
 * WelcomeModal + OnboardingChecklist no topo.
 */
export type OnboardingChecklistKey =
  | 'perfil'
  | 'servicos'
  | 'horarios'
  | 'qrcode'
  | 'agendamento'

export type OnboardingState = {
  /** Flags do business — controlam dismiss persistente cross-device */
  welcomeModalSeen: boolean
  fidelidadeDicaLida: boolean
  /** Itens do checklist com status done */
  items: Record<OnboardingChecklistKey, boolean>
  /** Progresso 0-100 baseado nos 5 itens */
  percent: number
  /** Se já completou tudo (checklist some) */
  done: boolean
}

export const getOnboardingState = cache(
  async (
    businessId: string,
    ownerId: string,
    business: {
      welcome_modal_seen?: boolean | null
      onboarding_horarios_revisado?: boolean | null
      qr_code_compartilhado?: boolean | null
      fidelidade_dica_lida?: boolean | null
    }
  ): Promise<OnboardingState> => {
    const supabase = await createClient()

    // 4 queries em paralelo:
    //  · serviços ativos
    //  · agendamentos (qualquer status, indica que admin testou ao menos uma vez)
    //  · perfil personalizado: owner-prof tem photo_url? — sinaliza personalização real
    //    (cadastro cria owner-prof automático com photo_url=null; admin precisa subir foto)
    const [servicesRes, apptsRes, ownerProfRes] = await Promise.all([
      supabase.from('services').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
      supabase
        .from('professionals')
        .select('photo_url')
        .eq('business_id', businessId)
        .eq('auth_user_id', ownerId)
        .eq('active', true)
        .maybeSingle(),
    ])

    const items: Record<OnboardingChecklistKey, boolean> = {
      perfil: !!ownerProfRes.data?.photo_url,
      servicos: (servicesRes.count ?? 0) > 0,
      horarios: !!business.onboarding_horarios_revisado,
      qrcode: !!business.qr_code_compartilhado,
      agendamento: (apptsRes.count ?? 0) > 0,
    }

    const doneCount = Object.values(items).filter(Boolean).length
    const total = Object.keys(items).length
    const percent = Math.round((doneCount / total) * 100)

    return {
      welcomeModalSeen: !!business.welcome_modal_seen,
      fidelidadeDicaLida: !!business.fidelidade_dica_lida,
      items,
      percent,
      done: doneCount === total,
    }
  }
)
