import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getApptChargedMap } from '@/lib/queries/appointment-charged-total'
import { todayBR, addDaysBR, startOfDayBR } from '@/lib/date-br'

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

  // Race em pos-cadastro/pos-pagamento OU pos-migrations: Supabase às vezes
  // retorna null transitoriamente (replicação, connection pool exaurida,
  // token refresh). Sem retry, page redireciona pra /cadastro mesmo com
  // business EXISTINDO — causa o bug recorrente do dia 26/05 (#178).
  //
  // 4 tentativas com backoff: 0 · 200 · 400 · 600 ms (total max ~1.2s).
  // .maybeSingle() distingue "0 rows" (sem erro · não retenta) de erro real.
  const delays = [0, 200, 400, 600]
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) {
      await new Promise((r) => setTimeout(r, delays[attempt]))
    }

    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', ownerId)
      .maybeSingle()

    if (business) return business
    if (!error) return null // 0 rows confirmado · cadastro real · não retenta

    // Erro transitório · loga e tenta de novo
    if (attempt < delays.length - 1) {
      console.warn(`[getCurrentBusiness] tentativa ${attempt + 1}/${delays.length} falhou:`, error.message)
      continue
    }
    // Esgotou retries · loga ALTO pra capturar em Vercel logs
    console.error(`[getCurrentBusiness] FALHA APÓS ${delays.length} TENTATIVAS · owner_id=${ownerId} · erro=${error.message}`)
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
    .select('id, name, commission_percentage, employment_type, photo_url, does_appointments')
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
      .select(`*, professional:professionals(name), appointment_services(service_name)`)
      .eq('business_id', businessId)
      .eq('appointment_date', today)
      .order('start_time', { ascending: true })
    const list = data ?? []
    if (list.length === 0) return list

    // charged_total = o que a cliente PAGA (comanda com produto: combo /
    // vendido junto). total_price é só o serviço — base da comissão — e os
    // cards mostravam ele, exibindo R$195 numa conta de R$290 (Eduardo 22/07).
    // Busca em LOTE aqui pra não virar 1 query por card.
    const apptIds = list.map((a) => a.id as string)
    // combo_package_id vem via select('*') · undefined se a v97 não rodou (defensivo).
    const comboIds = Array.from(new Set(list.map((a) => (a as { combo_package_id?: string | null }).combo_package_id).filter(Boolean) as string[]))
    // charged_total (comanda com produto) + resgate de pacote + nome do combo,
    // tudo em LOTE pra não virar 1 query por card.
    const [charged, { data: pkgSessions }, { data: comboPkgs }] = await Promise.all([
      getApptChargedMap(admin, apptIds),
      admin.from('customer_package_sessions').select('appointment_id').in('appointment_id', apptIds),
      comboIds.length ? admin.from('packages').select('id, name').in('id', comboIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ])
    const pkgSet = new Set((pkgSessions ?? []).map((s) => s.appointment_id).filter(Boolean) as string[])
    const comboNameById = Object.fromEntries((comboPkgs ?? []).map((p) => [p.id, p.name]))
    return list.map((a) => {
      const cid = (a as { combo_package_id?: string | null }).combo_package_id
      return {
        ...a,
        charged_total: charged[a.id as string]?.charged ?? null,
        is_package: pkgSet.has(a.id as string),
        combo_name: cid ? (comboNameById[cid] ?? null) : null,
      }
    })
  },
  ['admin-appointments-today'],
  { revalidate: 15 }
)

export const getUpcomingAppointments = unstable_cache(
  async (businessId: string, todayStr: string, nextWeekStr: string) => {
    const admin = getServiceClient()
    const { data } = await admin
      .from('appointments')
      .select(`*, professional:professionals(name), appointment_services(service_name)`)
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
  /** v45 · 14/05 — punições aplicadas nas últimas 24h ainda não revertidas */
  noShowPenaltiesToday: number
  lucroVsAnterior: { current: number; previous: number; pct: number | null } | null
}

export const getFocoDoDia = unstable_cache(
  async (businessId: string): Promise<FocoDoDia> => {
    const admin = getServiceClient()
    // λ.fuso · TODAS as datas de dia (appointment_date, occurred_at) em BR.
    // Antes era new Date().toISOString() cru: o servidor da Vercel roda em UTC,
    // então depois das 21h no Brasil o "Foco do dia" já mostrava AMANHÃ — e
    // isso todo cliente vê, na home, toda noite.
    const todayStr = todayBR()
    const nowIso = new Date().toISOString() // instante (timestamptz) · UTC é correto aqui
    // Fim de amanhã em BR, como fronteira EXCLUSIVA (início de depois de amanhã)
    const tomorrowEndIso = startOfDayBR(addDaysBR(todayStr, 2))

    // Janela rolling 30d (mesma do filtro "Mes")
    const start30Str = addDaysBR(todayStr, -30)
    const start60Str = addDaysBR(todayStr, -60)
    const start31Str = addDaysBR(todayStr, -31)

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
        .lt('expires_at', tomorrowEndIso),
      admin
        .from('appointments')
        .select('total_price, payment_method')
        .eq('business_id', businessId)
        .gte('appointment_date', start30Str)
        .lte('appointment_date', todayStr)
        .not('paid_at', 'is', null),
      admin
        .from('appointments')
        .select('total_price, payment_method')
        .eq('business_id', businessId)
        .gte('appointment_date', start60Str)
        .lte('appointment_date', start31Str)
        .not('paid_at', 'is', null),
      admin
        .from('expenses')
        .select('amount')
        .eq('business_id', businessId)
        .gte('occurred_at', start30Str)
        .lte('occurred_at', todayStr),
      admin
        .from('expenses')
        .select('amount')
        .eq('business_id', businessId)
        .gte('occurred_at', start60Str)
        .lte('occurred_at', start31Str),
    ])

    // Pagamentos pendentes hoje
    const pendingTotal = (pendingPaymentsRes.data || []).reduce(
      (s, a) => s + (a.total_price || 0),
      0
    )

    // Sumidos sem cupom — calcula via lookup similar ao /reativar
    const SUMIDO_DAYS = 40
    const cutoffStr = addDaysBR(todayStr, -SUMIDO_DAYS)
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
    // λ.fuso · mês tirado do dia BR: com getMonth() em UTC, no último dia do mês
    // depois das 21h a lista pulava pro mês seguinte
    const monthStr = todayStr.slice(5, 7)
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

    // Punições por no-show aplicadas nas últimas 24h ainda não revertidas (v45)
    // "últimas 24h" é janela de INSTANTE (timestamptz) — UTC é correto aqui,
    // não é bucketização por dia
    const yesterdayIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: penalties } = await admin
      .from('points_transactions')
      .select('appointment_id')
      .eq('business_id', businessId)
      .eq('reason', 'no_show_penalty')
      .gte('created_at', yesterdayIso)
    const penaltyAppointmentIds = (penalties || [])
      .map((p) => p.appointment_id)
      .filter(Boolean) as string[]
    let noShowPenaltiesToday = 0
    if (penaltyAppointmentIds.length > 0) {
      const { data: relevados } = await admin
        .from('points_transactions')
        .select('appointment_id')
        .eq('business_id', businessId)
        .eq('reason', 'no_show_relevado')
        .in('appointment_id', penaltyAppointmentIds)
      const relevadoIds = new Set(
        (relevados || []).map((r) => r.appointment_id).filter(Boolean) as string[],
      )
      noShowPenaltiesToday = penaltyAppointmentIds.filter((id) => !relevadoIds.has(id)).length
    }

    return {
      pendingClaims: claimsRes.count ?? 0,
      pendingPayments: { count: pendingPaymentsRes.data?.length ?? 0, total: pendingTotal },
      sumidosSemCupom,
      aniversariantesSemCupom,
      cupomExpirando: couponsRes.data?.length ?? 0,
      noShowPenaltiesToday,
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
