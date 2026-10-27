import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente anon SEM cookie, pras páginas públicas que ficam em cache (ISR).
 *
 * O `createClient` de `./server` lê cookies(), e só isso já obriga o Next a
 * remontar a página a cada visita. Página pública não tem sessão pra ler — o
 * visitante sempre foi role anon — então aqui o resultado é o mesmo, sem o
 * custo de CPU por visita (27/10/2026, Vercel avisou 90% do plano Hobby).
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
