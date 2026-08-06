/* ═══════════════════════════════════════════════════════════════
   REGRA DO SINAL NO CANCELAMENTO

   Ditada pela Wanessa Silva em 05/08/2026, que é quem pediu o sinal:

     "Cancelamento em até 24h ela pode reagendar, eu não devolvo valor."
     "Cancelamento após 24h00 antes do procedimento a cliente perde o sinal."
     "Cancelamento antes das 24h00, o valor fica disponível por até 30 dias
      pra fazer um novo agendamento."

   Em sistema:
     · cancelou com folga  → sinal vira CRÉDITO na ficha, validade N dias
     · cancelou em cima da hora → perde
     · cancelou pelo painel (a própria dona) → SEMPRE crédito, qualquer prazo.
       Se quem desmarcou foi ela, a cliente não pode perder dinheiro.
     · em nenhum caso volta dinheiro — é crédito, não estorno

   ⚠️ A VALIDADE NÃO SE RENOVA (decisão do Eduardo, 05/08). Se o sinal
   cancelado já tinha sido pago COM crédito, o crédito que volta carrega a
   data de expiração ORIGINAL. Sem isso, marcar e cancelar em ciclo
   empurraria o vencimento pra frente pra sempre, e os 30 dias nunca
   chegariam.

   Existe em arquivo próprio porque há DOIS caminhos de cancelamento — o
   link da cliente (/api/appointment/action) e o painel
   (/api/admin/appointments/[id]/cancel). Regra de dinheiro escrita duas
   vezes é regra que diverge na terceira mudança.
   ═══════════════════════════════════════════════════════════════ */

import type { SupabaseClient } from '@supabase/supabase-js'

export type DecisaoSinal = {
  temSinal: boolean
  valor: number
  /** Horas que faltam pro atendimento no momento da decisão. */
  horasRestantes: number
  horasLimite: number
  /** true = vira crédito · false = a cliente perde */
  viraCredito: boolean
  /** Quando o crédito expira (ISO). null quando não gera crédito. */
  expiraEm: string | null
}

/** Instante do atendimento em UTC, a partir da data e hora locais (BR, −03). */
function instanteDoAtendimento(data: string, hora: string): Date {
  return new Date(`${data}T${(hora || '00:00').slice(0, 5)}:00-03:00`)
}

/**
 * Calcula o que ACONTECE sem escrever nada. Usado pra avisar a cliente
 * antes de ela confirmar o cancelamento — reter dinheiro sem ter dito
 * antes é briga garantida, e ela tem razão.
 */
export async function preverDecisao(
  db: SupabaseClient,
  appointmentId: string,
  opcoes: { porDono?: boolean } = {},
): Promise<DecisaoSinal | null> {
  const { data: appt } = await db
    .from('appointments')
    .select('id, business_id, appointment_date, start_time, sinal_valor, sinal_pago_at')
    .eq('id', appointmentId)
    .maybeSingle()

  if (!appt) return null

  const valor = Number(appt.sinal_valor ?? 0)
  const pago = !!appt.sinal_pago_at
  if (!pago || valor <= 0) {
    return { temSinal: false, valor: 0, horasRestantes: 0, horasLimite: 0, viraCredito: false, expiraEm: null }
  }

  const { data: negocio } = await db
    .from('businesses')
    .select('sinal_cancel_horas, sinal_credito_dias')
    .eq('id', appt.business_id)
    .maybeSingle()

  const horasLimite = Number(negocio?.sinal_cancel_horas ?? 24)
  const dias = Number(negocio?.sinal_credito_dias ?? 30)

  const quando = instanteDoAtendimento(appt.appointment_date as string, appt.start_time as string)
  const horasRestantes = (quando.getTime() - Date.now()) / 3_600_000

  const viraCredito = opcoes.porDono === true || horasRestantes >= horasLimite

  return {
    temSinal: true,
    valor,
    horasRestantes: Math.max(0, Math.round(horasRestantes * 10) / 10),
    horasLimite,
    viraCredito,
    expiraEm: viraCredito ? new Date(Date.now() + dias * 86_400_000).toISOString() : null,
  }
}

/**
 * Aplica a regra: cria o crédito quando é o caso. Idempotente — se já
 * existe crédito gerado por este cancelamento, não cria outro (cancelar
 * duas vezes por duplo clique não pode virar dinheiro dobrado).
 */
export async function aplicarRegraDoSinal(
  db: SupabaseClient,
  appointmentId: string,
  opcoes: { porDono?: boolean } = {},
): Promise<DecisaoSinal | null> {
  const decisao = await preverDecisao(db, appointmentId, opcoes)
  if (!decisao || !decisao.temSinal || !decisao.viraCredito) return decisao

  const { data: appt } = await db
    .from('appointments')
    .select('business_id, customer_id, appointment_date')
    .eq('id', appointmentId)
    .maybeSingle()
  if (!appt?.customer_id) return decisao // sem cliente vinculado não há ficha pra creditar

  const { data: jaExiste } = await db
    .from('customer_credits')
    .select('id')
    .eq('customer_id', appt.customer_id)
    .eq('origin', 'sinal_cancelado')
    .eq('notes', `Sinal do agendamento ${appointmentId}`)
    .maybeSingle()
  if (jaExiste) return decisao

  /* Validade NÃO se renova: se este sinal já tinha sido pago com crédito, o
     que volta carrega a expiração original. Marcar e cancelar em ciclo não
     pode empurrar o vencimento pra frente pra sempre. */
  const { data: creditoOrigem } = await db
    .from('customer_credits')
    .select('expires_at')
    .eq('used_in_appointment_id', appointmentId)
    .not('expires_at', 'is', null)
    .order('expires_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const expira = creditoOrigem?.expires_at ?? decisao.expiraEm

  /* O erro NÃO pode ser engolido. Era assim que a v113 falhava: o CHECK de
     customer_credits.origin não conhecia 'sinal_cancelado', o insert era
     recusado, e como ninguém olhava o retorno a tela dizia "cancelado" com o
     dinheiro da cliente sumindo no caminho. Quem chama decide o que fazer,
     mas fica sabendo. λ.prova-na-fonte */
  const { data: criado, error } = await db
    .from('customer_credits')
    .insert({
      business_id: appt.business_id,
      customer_id: appt.customer_id,
      amount: decisao.valor,
      origin: 'sinal_cancelado',
      date: appt.appointment_date,
      expires_at: expira,
      notes: `Sinal do agendamento ${appointmentId}`,
    })
    .select('id')
    .maybeSingle()

  if (error || !criado) {
    console.error('sinal→crédito NÃO gravou · agendamento', appointmentId, error?.message)
    throw new Error(`credito_nao_gravou: ${error?.message ?? 'sem retorno do banco'}`)
  }

  return { ...decisao, expiraEm: expira }
}
