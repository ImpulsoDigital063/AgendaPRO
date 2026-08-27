import type { createClient } from '@/lib/supabase/server'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * Resolve o business_id de quem OPERA o atendimento (v98k · 30/07/2026).
 *
 * Aceita, nesta ordem:
 *   1. dono do negócio
 *   2. recepcionista ativa
 *   3. profissional ativa — SÓ se o negócio ligou `professionals_can_book_others`
 *
 * Por que a flag manda no caso 3: ela é a decisão explícita da dona de que a
 * equipe opera junto (marca, atende e recebe uma pela outra). É o caso da
 * Realli, que não tem recepção — sem isso a profissional marcava a cliente e
 * empacava na hora de faturar (erro `no_business`, relato 30/07 14:48).
 * Negócio que não ligou a flag (o default) continua com dono e recepção só —
 * Olímpio, Studio MOOD, Rosy, K'F seguem exatamente como estavam.
 *
 * Existe pra não repetir esse gate em cada rota: era copiado em 24 arquivos, e
 * cada capacidade nova dada à profissional estourava num deles, um de cada vez.
 */
export async function resolveBusinessIdOperacao(
  supabase: ServerClient,
  /** v131 · aceita também a profissional que só pode ACRESCENTAR serviço na comanda */
  permitirAdicionaServico = false,
): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: owner } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (owner) return owner.id

  const { data: prof } = await supabase
    .from('professionals')
    .select('business_id, is_receptionist')
    .eq('auth_user_id', user.id)
    .eq('active', true)
    .maybeSingle()
  if (!prof) return null

  // Recepção sempre opera (v47)
  if (prof.is_receptionist === true) return prof.business_id

  const { data: biz } = await supabase
    .from('businesses')
    .select('professionals_can_book_others, prof_adiciona_servico')
    .eq('id', prof.business_id)
    .maybeSingle()

  if (biz?.professionals_can_book_others === true) return prof.business_id

  /* v131 · Studio Isis Melo separou as duas coisas que a flag acima juntava:
     lá a profissional NÃO marca pra ninguém (chave desligada), mas PODE
     acrescentar um serviço num atendimento que já existe. `permitirAdicionaServico`
     só é pedido pelas rotas de item de comanda — nas demais nada muda. */
  if (permitirAdicionaServico && biz?.prof_adiciona_servico === true) return prof.business_id

  return null
}
