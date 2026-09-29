import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Reserva a comanda pra quem vai PAGAR agora (v150 · auditoria 29/09 · M5).
 * Clique duplo / dois aparelhos gravavam o pagamento em dobro (e baixavam
 * estoque 2x no Faturar). Update condicional: só marca se a comanda está
 * aberta e ninguém reservou nos últimos 2 minutos. Devolve false quando
 * outra requisição já está pagando — quem chama responde 409.
 * Falhou no meio? A reserva vence em 2 min; ninguém fica travado.
 */
export async function reservarComanda(admin: SupabaseClient, invoiceId: string): Promise<boolean> {
  const limite = new Date(Date.now() - 2 * 60 * 1000).toISOString()
  const { data } = await admin
    .from('invoices')
    .update({ fechando_desde: new Date().toISOString() })
    .eq('id', invoiceId)
    .eq('status', 'open')
    .or(`fechando_desde.is.null,fechando_desde.lt.${limite}`)
    .select('id')
  return (data ?? []).length > 0
}

export const RESPOSTA_COMANDA_OCUPADA = {
  error: 'comanda_ocupada',
  detail: 'Essa comanda já está sendo paga (clique duplo ou outro aparelho). Confira a comanda antes de tentar de novo.',
}
