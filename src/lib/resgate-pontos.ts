import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Pagamento com PONTOS = resgate de recompensa (Eduardo 29/09/2026).
 *
 * Antes o botão "Pontos" do pagamento só marcava o método: o atendimento
 * saía de graça e a cliente seguia com o saldo cheio (7 usos em produção,
 * nenhum descontou ponto · um deles R$600 num negócio sem fidelidade).
 * Agora pagar com pontos exige escolher uma recompensa ativa; o saldo cai
 * pelo custo dela e o extrato registra 'redemption' ligado ao atendimento.
 * Desfazer o pagamento (cancelar/repagar comanda, desmarcar) devolve.
 */

export type Recompensa = { id: string; name: string; points_required: number }

export async function contextoFidelidade(
  db: SupabaseClient,
  businessId: string,
  customerId: string | null,
): Promise<{ ativo: boolean; saldo: number | null; recompensas: Recompensa[] }> {
  const { data: biz } = await db.from('businesses').select('loyalty_enabled').eq('id', businessId).maybeSingle()
  if (!biz?.loyalty_enabled) return { ativo: false, saldo: null, recompensas: [] }
  const [{ data: rewards }, { data: cli }] = await Promise.all([
    db.from('rewards').select('id, name, points_required').eq('business_id', businessId).eq('active', true).order('points_required'),
    customerId
      ? db.from('customers').select('total_points, business_id').eq('id', customerId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  const saldo = cli && cli.business_id === businessId ? Number(cli.total_points ?? 0) : null
  return { ativo: true, saldo, recompensas: (rewards ?? []) as Recompensa[] }
}

/**
 * Desconta o custo da recompensa do saldo da cliente. Update condicional no
 * saldo lido (se outro resgate mexeu no meio, tenta de novo) pra não deixar
 * dois resgates simultâneos passarem com saldo pra um só.
 */
export async function resgatarRecompensa(
  db: SupabaseClient,
  args: { businessId: string; customerId: string | null; rewardId: string | null | undefined; appointmentId: string | null },
): Promise<{ ok: true; custo: number; nome: string } | { ok: false; erro: string }> {
  const { businessId, customerId, rewardId, appointmentId } = args
  if (!rewardId) return { ok: false, erro: 'Escolha a recompensa que a cliente está trocando pelos pontos.' }
  if (!customerId) return { ok: false, erro: 'Pagamento com pontos precisa de cliente vinculada.' }

  const { data: biz } = await db.from('businesses').select('loyalty_enabled').eq('id', businessId).maybeSingle()
  if (!biz?.loyalty_enabled) return { ok: false, erro: 'O programa de fidelidade deste negócio está desligado.' }

  const { data: reward } = await db
    .from('rewards')
    .select('id, name, points_required, active')
    .eq('id', rewardId)
    .eq('business_id', businessId)
    .maybeSingle()
  if (!reward || !reward.active) return { ok: false, erro: 'Recompensa não encontrada ou desativada.' }
  const custo = Number(reward.points_required ?? 0)

  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const { data: cli } = await db
      .from('customers')
      .select('total_points, business_id')
      .eq('id', customerId)
      .maybeSingle()
    if (!cli || cli.business_id !== businessId) return { ok: false, erro: 'Cliente não encontrada.' }
    const saldo = Number(cli.total_points ?? 0)
    if (saldo < custo) {
      return { ok: false, erro: `Saldo insuficiente: a cliente tem ${saldo} pts e "${reward.name}" custa ${custo} pts.` }
    }
    const { data: mudou } = await db
      .from('customers')
      .update({ total_points: saldo - custo })
      .eq('id', customerId)
      .eq('total_points', saldo)
      .select('id')
    if ((mudou ?? []).length === 0) continue
    await db.from('points_transactions').insert({
      customer_id: customerId,
      business_id: businessId,
      points: -custo,
      reason: 'redemption',
      appointment_id: appointmentId,
    })
    return { ok: true, custo, nome: reward.name as string }
  }
  return { ok: false, erro: 'O saldo de pontos mudou durante o pagamento. Tente de novo.' }
}

/**
 * Devolve os pontos de resgates ligados a estes atendimentos que ainda não
 * foram estornados (idempotente: o saldo líquido por atendimento zera uma vez).
 */
export async function estornarResgates(db: SupabaseClient, appointmentIds: string[]): Promise<void> {
  if (appointmentIds.length === 0) return
  const { data: txs } = await db
    .from('points_transactions')
    .select('customer_id, business_id, points, reason, appointment_id')
    .in('appointment_id', appointmentIds)
    .in('reason', ['redemption', 'redemption_reversal'])
  const porAtendimento = new Map<string, { customer_id: string; business_id: string; saldo: number }>()
  for (const t of txs ?? []) {
    const k = `${t.appointment_id}|${t.customer_id}`
    const cur = porAtendimento.get(k) ?? { customer_id: t.customer_id as string, business_id: t.business_id as string, saldo: 0 }
    cur.saldo += Number(t.points ?? 0)
    porAtendimento.set(k, cur)
  }
  for (const [k, v] of porAtendimento) {
    if (v.saldo >= 0) continue
    const devolver = -v.saldo
    const apptId = k.split('|')[0]
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const { data: cli } = await db.from('customers').select('total_points').eq('id', v.customer_id).maybeSingle()
      if (!cli) break
      const saldo = Number(cli.total_points ?? 0)
      const { data: mudou } = await db
        .from('customers')
        .update({ total_points: saldo + devolver })
        .eq('id', v.customer_id)
        .eq('total_points', saldo)
        .select('id')
      if ((mudou ?? []).length === 0) continue
      await db.from('points_transactions').insert({
        customer_id: v.customer_id,
        business_id: v.business_id,
        points: devolver,
        reason: 'redemption_reversal',
        appointment_id: apptId,
      })
      break
    }
  }
}
