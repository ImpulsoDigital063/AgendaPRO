import { createClient } from '@/lib/supabase/server'
import { getApptDiscountMap } from '@/lib/commission-discount'
import { IconSparkles } from '@/components/ui/Icon'

/**
 * Top 5 serviços mais vendidos do mês (volume + receita).
 */
export default async function TopServicesCard({ businessId }: { businessId: string }) {
  const supabase = await createClient()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  const startStr = start.toISOString().split('T')[0]
  const todayStr = new Date().toISOString().split('T')[0]

  const [apptsRes, salesRes] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, service_name, total_price, payment_method, invoice_item_id')
      .eq('business_id', businessId)
      .not('paid_at', 'is', null)
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('appointment_date', startStr)
      .lte('appointment_date', todayStr),
    supabase
      .from('sales')
      .select('payment_method, sale_items(product_name, quantity, unit_price)')
      .eq('business_id', businessId)
      .eq('type', 'product_sale')
      .eq('status', 'paid')
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('sale_date', startStr)
      .lte('sale_date', todayStr),
  ])

  // λ.valor-liquido: receita por serviço com cupom abatido (04/07/2026).
  const apptDisc = await getApptDiscountMap(supabase, (apptsRes.data ?? []).map((a) => a.invoice_item_id))

  type Row = { name: string; total: number; count: number }
  const map = new Map<string, Row>()
  for (const a of apptsRes.data ?? []) {
    const name = (a.service_name || 'Sem serviço').trim()
    const existing = map.get(name) ?? { name, total: 0, count: 0 }
    existing.total += Math.max(0, (a.total_price ?? 0) - (apptDisc[a.id] ?? 0))
    existing.count += 1
    map.set(name, existing)
  }
  for (const s of salesRes.data ?? []) {
    const items = (s.sale_items as { product_name: string; quantity: number; unit_price: number }[] | null) ?? []
    for (const it of items) {
      const name = `Produto · ${it.product_name}`
      const existing = map.get(name) ?? { name, total: 0, count: 0 }
      existing.total += Number(it.unit_price ?? 0) * Number(it.quantity ?? 0)
      existing.count += 1
      map.set(name, existing)
    }
  }
  const ranked = Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  if (ranked.length === 0) return null

  const maxCount = ranked[0].count

  return (
    <div className="admin-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest inline-flex items-center gap-1.5" style={{ color: 'var(--admin-text-faded)' }}>
          <IconSparkles size={12} /> Top serviços · últimos 30 dias
        </p>
      </div>
      <div className="space-y-2">
        {ranked.map((s) => {
          const percent = (s.count / maxCount) * 100
          return (
            <div key={s.name}>
              <div className="flex items-center justify-between mb-1 gap-2">
                <p className="text-xs font-semibold truncate flex-1" style={{ color: 'var(--admin-text)' }}>
                  {s.name}
                </p>
                <span className="text-[11px] tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>
                  {s.count}x · {s.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--admin-surface-hi)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${percent}%`,
                    background: 'linear-gradient(90deg, var(--brand-primary), var(--brand-secondary))',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
