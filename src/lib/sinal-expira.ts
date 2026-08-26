/* Sinal não pago dentro do prazo devolve o horário pra agenda.
   ───────────────────────────────────────────────────────────────────
   Sem isto o atendimento nasce 'pending' e fica assim pra sempre, com o
   slot bloqueado — a checagem de conflito e a constraint no_overlap
   contam pending como ocupado. O sinal viraria um jeito de travar a
   agenda de graça, o oposto do que a Wanessa pediu.

   Por que cancelar de verdade em vez de só esconder: a constraint
   no_overlap_appointments (v40) vive no banco e não sabe de prazo. Se a
   linha vencida continuasse lá, a próxima cliente tomaria erro de
   conflito num horário que a tela mostrou como livre — pior que o
   problema original.

   Por que sob demanda em vez de cron: o plano da Vercel só permite cron
   diário, e um horário preso por até 24h não serve. A limpeza roda
   quando alguém tenta marcar naquele horário e quando a dona abre a aba
   Sinal — ou seja, no exato momento em que o horário faz falta. */

import type { SupabaseClient } from '@supabase/supabase-js'

export const SINAL_EXPIRA_PADRAO_MIN = 120

type ApptSinal = {
  id: string
  status: string | null
  sinal_valor: number | string | null
  sinal_pago_at: string | null
  created_at: string
}

/** Reservado, não pago e fora do prazo. */
export function sinalVencido(appt: ApptSinal, minutos: number, agora = Date.now()): boolean {
  if (appt.status !== 'pending') return false
  if (!appt.sinal_valor || Number(appt.sinal_valor) <= 0) return false
  if (appt.sinal_pago_at) return false
  const limite = new Date(appt.created_at).getTime() + minutos * 60_000
  return agora > limite
}

/**
 * O prazo escrito como a dona fala ("2 horas", "24 horas", "2 dias").
 *
 * Mora aqui porque a regra do sinal precisa aparecer NA HORA DE MARCAR, nas
 * duas telas que criam agendamento (painel e recepção) — e o texto tem que
 * dizer o prazo REAL do negócio, não um "2 horas" chumbado. A Wanessa
 * descobriu a regra perdendo agendamento; nenhuma tela do painel dizia que o
 * horário volta pra agenda se o sinal não cair (v138).
 */
export function prazoSinalLabel(minutos: number): string {
  const m = Math.max(1, Math.round(Number(minutos) || SINAL_EXPIRA_PADRAO_MIN))
  if (m < 60) return `${m} minutos`
  if (m % 1440 === 0) {
    const dias = m / 1440
    return dias === 1 ? '1 dia' : `${dias} dias`
  }
  const horas = m / 60
  if (Number.isInteger(horas)) return horas === 1 ? '1 hora' : `${horas} horas`
  return `${Math.round(horas)} horas`
}

/** Quanto falta pro prazo acabar, em minutos. Negativo = já venceu. */
export function minutosRestantes(appt: ApptSinal, minutos: number, agora = Date.now()): number {
  const limite = new Date(appt.created_at).getTime() + minutos * 60_000
  return Math.round((limite - agora) / 60_000)
}

/**
 * Cancela os sinais vencidos e devolve quantos soltou.
 *
 * `escopo` estreita a varredura pro que interessa naquele momento: ao
 * marcar horário só importa aquele profissional naquele dia; na aba Sinal,
 * o negócio inteiro.
 *
 * Nunca toca em atendimento pago nem confirmado — o filtro exige pending,
 * sinal_valor > 0 e sinal_pago_at nulo, e a verificação de prazo é refeita
 * em JS antes de escrever.
 */
export async function limparSinaisVencidos(
  db: SupabaseClient,
  escopo: { businessId: string; professionalId?: string; date?: string; minutos?: number },
): Promise<number> {
  let minutos = escopo.minutos
  if (minutos === undefined) {
    const { data: negocio } = await db
      .from('businesses')
      .select('sinal_enabled, sinal_expira_minutos')
      .eq('id', escopo.businessId)
      .maybeSingle()
    if (!negocio?.sinal_enabled) return 0
    minutos = Number(negocio.sinal_expira_minutos ?? SINAL_EXPIRA_PADRAO_MIN)
  }
  if (!minutos || minutos <= 0) return 0

  let q = db
    .from('appointments')
    .select('id, status, sinal_valor, sinal_pago_at, created_at')
    .eq('business_id', escopo.businessId)
    .eq('status', 'pending')
    .is('sinal_pago_at', null)
    .not('sinal_valor', 'is', null)
  if (escopo.professionalId) q = q.eq('professional_id', escopo.professionalId)
  if (escopo.date) q = q.eq('appointment_date', escopo.date)

  const { data: candidatos } = await q
  const vencidos = (candidatos ?? []).filter((a) => sinalVencido(a as ApptSinal, minutos as number))
  if (vencidos.length === 0) return 0

  /* Cancela só o que ainda está pending e sem pagamento: se o PIX caiu e a
     dona marcou "recebi" entre a leitura e a escrita, o horário fica. */
  /* Marca a ORIGEM: horário solto por falta de pagamento não é desistência, e
     sem essa marca os dois viravam a mesma linha de "cancelado" no relatório
     (v117). O status continua 'cancelled' de propósito — pra agenda o horário
     está livre do mesmo jeito. */
  const alvo = vencidos.map((a) => a.id)
  const aplicar = (campos: Record<string, unknown>) =>
    db.from('appointments').update(campos)
      .in('id', alvo).eq('status', 'pending').is('sinal_pago_at', null).select('id')

  let { data: soltos, error } = await aplicar({
    status: 'cancelled',
    sinal_expirado_at: new Date().toISOString(),
  })

  /* Tolera o banco sem a v117 aplicada ainda: solta o horário do mesmo jeito,
     só sem a marca. Deploy e migration não precisam entrar na mesma ordem.
     Qualquer erro cai aqui de propósito — a primeira versão testava só
     `42703` (o código do POSTGRES pra coluna inexistente) e o PostgREST na
     verdade devolve `PGRST204` ("column not found in schema cache"). Resultado:
     o horário vencido NÃO era solto e continuava travando a agenda — exatamente
     o que a v115 existe pra evitar. Soltar o horário é mais importante do que
     registrar por que ele foi solto. */
  if (error) {
    ;({ data: soltos } = await aplicar({ status: 'cancelled' }))
  }

  return (soltos ?? []).length
}
