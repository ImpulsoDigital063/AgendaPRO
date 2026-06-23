import type { createClient } from '@/lib/supabase/client'

type Supa = ReturnType<typeof createClient>

/**
 * Acha-ou-cria o cliente universal (tabela `clients`, global por telefone) e
 * devolve o client_id pra linkar no appointment.
 *
 * Por que existe: criar agendamento manual (MarcarAgendamentoForm no mobile/recep
 * e AgendarModal no desktop) gravava só customer_id e deixava client_id NULL.
 * A tela /admin/clientes conta atendimento + valor gasto por client_id — sem ele,
 * o cliente aparecia só com pontuação, sem histórico (bug Rosy 23/06).
 *
 * RLS: dono/recep autenticado pode inserir em clients — mesmo caminho que o
 * /api/admin/customers já usa com a sessão do usuário (find-or-create por phone).
 * Retorna null se telefone vazio (avulso) — appointment fica sem vínculo, ok.
 *
 * Match por phone EXATO (string como gravada), igual ao backfill-palace e ao
 * /api/admin/customers — não normaliza, pra não casar com formato divergente.
 */
export async function resolveClientId(
  supabase: Supa,
  name: string,
  phone: string,
): Promise<string | null> {
  const p = (phone || '').trim()
  if (!p) return null
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('phone', p)
    .maybeSingle()
  if (existing) return existing.id
  const { data: created } = await supabase
    .from('clients')
    .insert({ name: (name || '').trim() || 'Cliente', phone: p, email: null })
    .select('id')
    .single()
  return created?.id ?? null
}
