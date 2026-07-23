import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Comissão do RESGATE de pacote, por profissional (Eduardo 24/07/2026).
 *
 * Quando a cliente resgata uma sessão e a profissional executa, ela recebe
 * comissão sobre o VALOR POR SESSÃO que a cliente pagou (`price_paid` do pacote
 * ÷ nº total de sessões), não sobre a tabela. O serviço entra R$0 na comanda
 * (não re-entra no caixa · já foi pago na venda do pacote), então a comissão do
 * resgate NÃO pode sair do `total_price` do atendimento — se saísse, os
 * agregadores de "Recebido" (que somam total_price de atendimento pago)
 * contariam o resgate como dinheiro que entrou. Por isso a base vem daqui, de
 * `customer_package_sessions`, e é somada SÓ nas telas de Remunerações.
 *
 * A comissão é reconhecida por `consumed_at` (momento do resgate), igual as
 * telas filtram atendimento por `paid_at`. Quem chama aplica o % da profissional
 * sobre a `base` (mesma % de serviço).
 *
 * @returns byProf[professionalId] = { base, lines[] }
 */
export type PackageSessionLine = {
  date: string
  packageName: string
  serviceName: string
  base: number
}

export async function getPackageSessionCommission(
  sb: SupabaseClient,
  businessId: string,
  fromISO: string,
  toISO: string,
): Promise<Record<string, { base: number; lines: PackageSessionLine[] }>> {
  const out: Record<string, { base: number; lines: PackageSessionLine[] }> = {}

  const { data: sessions } = await sb
    .from('customer_package_sessions')
    .select(`
      id, professional_id, consumed_at, customer_package_id,
      customer_packages!inner(business_id, price_paid, package_name),
      customer_package_balances(service_name)
    `)
    .eq('customer_packages.business_id', businessId)
    .not('professional_id', 'is', null)
    .gte('consumed_at', fromISO)
    .lt('consumed_at', toISO)

  if (!sessions || sessions.length === 0) return out

  // nº total de sessões de cada pacote = soma de sessions_total dos balances de
  // SERVIÇO (produto não tem sessão). Busca em lote pros pacotes envolvidos.
  const pkgIds = Array.from(new Set(sessions.map((s) => s.customer_package_id as string)))
  const { data: bals } = await sb
    .from('customer_package_balances')
    .select('customer_package_id, service_id, sessions_total')
    .in('customer_package_id', pkgIds)
  const totalSessionsByPkg: Record<string, number> = {}
  for (const b of bals ?? []) {
    if (!b.service_id) continue // só serviço conta como sessão
    const k = b.customer_package_id as string
    totalSessionsByPkg[k] = (totalSessionsByPkg[k] ?? 0) + Number(b.sessions_total ?? 0)
  }

  for (const s of sessions) {
    const profId = s.professional_id as string
    const cp = Array.isArray(s.customer_packages) ? s.customer_packages[0] : s.customer_packages
    const bal = Array.isArray(s.customer_package_balances) ? s.customer_package_balances[0] : s.customer_package_balances
    const totalSessions = totalSessionsByPkg[s.customer_package_id as string] ?? 0
    if (totalSessions <= 0) continue
    const base = Number(cp?.price_paid ?? 0) / totalSessions
    if (!(base > 0)) continue
    if (!out[profId]) out[profId] = { base: 0, lines: [] }
    out[profId].base += base
    out[profId].lines.push({
      date: String(s.consumed_at),
      packageName: cp?.package_name ?? 'Pacote',
      serviceName: bal?.service_name ?? 'Serviço',
      base,
    })
  }

  return out
}
