import { createClient } from '@/lib/supabase/server'
import { getApptDiscountMap } from '@/lib/commission-discount'
import { getApptChargedMap } from '@/lib/queries/appointment-charged-total'
import { todayBR, addDaysBR } from '@/lib/date-br'
import { IconStar } from '@/components/ui/Icon'

/**
 * Top 3 clientes VIP por receita realizada nos últimos 30 dias.
 * Mostra cliente que gasta mais · útil pra ações de fidelização (Adm
 * pode mandar mimo, agradecimento, oferta exclusiva).
 */
export default async function TopClienteCard({ businessId }: { businessId: string }) {
  const supabase = await createClient()
  const todayStr = todayBR() // λ.fuso: janela em dia BR (não UTC)
  const startStr = addDaysBR(todayStr, -30)

  const [apptsRes, salesRes] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, client_name, total_price, payment_method, invoice_item_id')
      .eq('business_id', businessId)
      .not('paid_at', 'is', null)
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('appointment_date', startStr)
      .lte('appointment_date', todayStr),
    supabase
      .from('sales')
      .select('client_name, total, payment_method')
      .eq('business_id', businessId)
      .eq('type', 'product_sale')
      .eq('status', 'paid')
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('sale_date', startStr)
      .lte('sale_date', todayStr),
  ])

  // λ.valor-liquido: gasto do cliente com cupom abatido (04/07/2026).
  const apptDisc = await getApptDiscountMap(supabase, (apptsRes.data ?? []).map((a) => a.invoice_item_id))
  const charged = await getApptChargedMap(supabase, (apptsRes.data ?? []).map((a) => a.id as string))

  type Row = { name: string; total: number; count: number }
  const map = new Map<string, Row>()
  for (const a of apptsRes.data ?? []) {
    const name = (a.client_name || 'Sem nome').trim()
    const existing = map.get(name) ?? { name, total: 0, count: 0 }
    // quanto a CLIENTE gastou · inclui produto da comanda (combo / vendido junto)
    const ch = charged[a.id]
    existing.total += ch && ch.produtos.length > 0
      ? ch.charged
      : Math.max(0, (a.total_price ?? 0) - (apptDisc[a.id] ?? 0))
    existing.count += 1
    map.set(name, existing)
  }
  for (const s of salesRes.data ?? []) {
    const name = (s.client_name || 'Sem nome').trim()
    const existing = map.get(name) ?? { name, total: 0, count: 0 }
    existing.total += Number(s.total ?? 0)
    existing.count += 1
    map.set(name, existing)
  }
  const ranked = Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)

  if (ranked.length === 0) return null

  return (
    <div className="admin-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest inline-flex items-center gap-1.5" style={{ color: 'var(--admin-text-faded)' }}>
          <IconStar size={12} /> Clientes VIP · últimos 30 dias
        </p>
      </div>
      <div className="space-y-2.5">
        {ranked.map((c) => {
          const initials = c.name.split(' ').slice(0, 2).map((s) => s[0]).join('').toUpperCase()
          return (
            <div key={c.name} className="flex items-center gap-3">
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}
              >
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
                  {c.name}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                  {c.count}x · ticket médio {(c.total / c.count).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
                </p>
              </div>
              <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--admin-success,#10B981)' }}>
                {c.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
