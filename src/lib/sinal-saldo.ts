/* ═══════════════════════════════════════════════════════════════
   QUANTO AINDA FALTA PAGAR DO SINAL — e ATÉ QUANDO

   Achado na auditoria de 06/08. `appointments.sinal_valor` guarda o sinal
   CHEIO de propósito (é dele que a comanda abate depois). Só que três telas
   liam esse campo direto pra cobrar:

     · a página /sinal (o link que vai pro WhatsApp da cliente)
     · o QR / copia-e-cola gerado nessa página
     · a aba Sinal do painel, que monta a mensagem de cobrança

   Quando o crédito da cliente cobre PARTE do sinal, o crédito já foi debitado
   na hora de marcar e a tela de agendamento disse o valor certo ("pague R$8"
   de um sinal de R$18). As outras três continuavam pedindo os R$18. Ou ela
   pagava a mais e perdia o crédito junto, ou pagava o combinado e a dona via
   "faltando R$18" na aba e cobrava de novo.

   Regra: cobra-se o sinal cheio MENOS o que já entrou em crédito. A conta é a
   mesma que a `composicaoDoSinal` faz no cancelamento — créditos consumidos
   por este agendamento, menos a sobra que ele devolveu. A diferença é que lá
   ela só vale pra sinal PAGO, e aqui a pergunta é sobre o que está em aberto.
   ═══════════════════════════════════════════════════════════════ */

import type { SupabaseClient } from '@supabase/supabase-js'

/** Quanto do sinal já foi quitado por crédito da própria cliente. */
export async function creditoJaAplicado(
  db: SupabaseClient,
  appointmentId: string,
): Promise<number> {
  const { data: consumidos } = await db
    .from('customer_credits')
    .select('amount')
    .eq('used_in_appointment_id', appointmentId)

  const { data: sobras } = await db
    .from('customer_credits')
    .select('amount')
    .eq('notes', `Sobra de crédito usado no sinal ${appointmentId}`)

  const usado = (consumidos ?? []).reduce((s, c) => s + Number(c.amount ?? 0), 0)
  const devolvido = (sobras ?? []).reduce((s, c) => s + Number(c.amount ?? 0), 0)
  return Math.max(0, Math.round((usado - devolvido) * 100) / 100)
}

/**
 * O que a cliente ainda deve em dinheiro. Nunca negativo, nunca maior que o
 * sinal. Zero quer dizer que o crédito cobriu tudo — e nesse caso não há o que
 * cobrar (o agendamento já nasce com sinal_pago_at preenchido).
 */
export async function valorAindaDevido(
  db: SupabaseClient,
  appointmentId: string,
  sinalCheio: number | string | null,
): Promise<number> {
  const cheio = Number(sinalCheio ?? 0)
  if (cheio <= 0) return 0
  const credito = await creditoJaAplicado(db, appointmentId)
  return Math.max(0, Math.round((cheio - credito) * 100) / 100)
}

/**
 * A mesma conta pra uma lista inteira, em duas consultas — a aba Sinal mostra
 * todos os pendentes de uma vez, e uma consulta por linha ali vira N+1.
 * Devolve Map<appointmentId, creditoJaAplicado>.
 */
export async function creditoAplicadoEmLote(
  db: SupabaseClient,
  appointmentIds: string[],
): Promise<Map<string, number>> {
  const mapa = new Map<string, number>()
  if (appointmentIds.length === 0) return mapa

  const { data: consumidos } = await db
    .from('customer_credits')
    .select('amount, used_in_appointment_id')
    .in('used_in_appointment_id', appointmentIds)

  for (const c of consumidos ?? []) {
    const id = c.used_in_appointment_id as string
    mapa.set(id, (mapa.get(id) ?? 0) + Number(c.amount ?? 0))
  }

  const { data: sobras } = await db
    .from('customer_credits')
    .select('amount, notes')
    .in('notes', appointmentIds.map((id) => `Sobra de crédito usado no sinal ${id}`))

  for (const s of sobras ?? []) {
    const id = String(s.notes).replace('Sobra de crédito usado no sinal ', '')
    mapa.set(id, Math.max(0, (mapa.get(id) ?? 0) - Number(s.amount ?? 0)))
  }

  for (const [id, v] of mapa) mapa.set(id, Math.round(v * 100) / 100)
  return mapa
}

/**
 * Até quando dá pra pagar, escrito pra gente ler.
 *
 * Era só a hora ("até as 18:00"). Funciona no prazo padrão de 2h, mas a dona
 * escolhe entre 30 minutos e 2 DIAS — e aí "até as 18:00" vira charada: a
 * cliente lê como hoje quando é amanhã. Agora o dia entra sempre que não for
 * hoje, e some quando for (dizer "hoje às 18:00" a quem acabou de marcar é
 * ruído).
 */
export function rotuloLimite(limite: Date): string {
  const fmtHora = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
  const diaBR = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d)

  /* Devolve a frase inteira ("às 18:00", "amanhã às 18:00", "sex 08/08 às
     18:00") e não só a hora: quem chama escreve "até {isso}", e assim a
     mesma frase funciona nos três casos sem concordância quebrada. */
  const hora = `às ${fmtHora.format(limite)}`
  const hoje = diaBR(new Date())
  const alvo = diaBR(limite)
  if (alvo === hoje) return hora

  const amanha = diaBR(new Date(Date.now() + 86_400_000))
  if (alvo === amanha) return `amanhã ${hora}`

  const data = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo',
  }).format(limite).replace('.', '')
  return `${data} ${hora}`
}
