import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

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
