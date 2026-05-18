import { createClient } from '@/lib/supabase/server'
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

  const { data: appts } = await supabase
    .from('appointments')
    .select('service_name, total_price, payment_method')
    .eq('business_id', businessId)
    .not('paid_at', 'is', null)
    .neq('payment_method', 'courtesy')
    .gte('appointment_date', startStr)
    .lte('appointment_date', todayStr)

  type Row = { name: string; total: number; count: number }
  const map = new Map<string, Row>()
  for (const a of appts ?? []) {
    const name = (a.service_name || 'Sem serviço').trim()
    const existing = map.get(name) ?? { name, total: 0, count: 0 }
    existing.total += a.total_price ?? 0
    existing.count += 1
    map.set(name, existing)
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
