/**
 * Acha-ou-cria o cliente universal (tabela `clients`, global por telefone) e
 * devolve o client_id pra linkar no appointment.
 *
 * Por que existe: criar agendamento manual (MarcarAgendamentoForm no mobile/recep
 * e AgendarModal no desktop) gravava só customer_id e deixava client_id NULL.
 * A tela /admin/clientes conta atendimento + valor gasto por client_id — sem ele,
 * o cliente aparecia só com pontuação, sem histórico (bug Rosy 23/06).
 *
 * Segurança (v177, 03/11/2026): `clients` é GLOBAL — uma linha por telefone,
 * compartilhada entre todos os negócios. Até aqui qualquer login lia e alterava
 * a tabela inteira pela API (policy `true`), e este find-or-create dependia
 * disso. Agora o acha-ou-cria roda no banco (`resolver_cliente`, SECURITY
 * DEFINER) e devolve SÓ o id: nem nome, nem telefone de cliente de outro negócio
 * sai pra quem chama. Casa por `fone` (fone_canon), o mesmo critério de antes.
 * Retorna null se telefone vazio (avulso) — appointment fica sem vínculo, ok.
 */
export async function resolveClientId(
  supabase: RpcCapaz,
  name: string,
  phone: string,
): Promise<string | null> {
  const p = (phone || '').trim()
  if (!p) return null
  const { data, error } = await supabase.rpc('resolver_cliente', {
    p_nome: (name || '').trim() || 'Cliente',
    p_telefone: p,
  })
  if (error) {
    console.error('resolver_cliente:', error.message)
    return null
  }
  return (data as string | null) ?? null
}

/** Qualquer cliente supabase-js (navegador ou servidor) — só precisa de .rpc. */
type RpcCapaz = {
  rpc: (fn: 'resolver_cliente', args: { p_nome: string; p_telefone: string; p_email?: string | null }) => PromiseLike<{
    data: unknown
    error: { message: string } | null
  }>
}
