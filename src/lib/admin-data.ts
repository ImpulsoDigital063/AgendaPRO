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
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', ownerId)
    .single()
  return business
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
    .select('id, name, commission_percentage, employment_type')
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
