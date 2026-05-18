import { createClient } from '@/lib/supabase/server'
import { IconStar } from '@/components/ui/Icon'

/**
 * Top 3 clientes VIP por receita realizada nos últimos 30 dias.
 * Mostra cliente que gasta mais · útil pra ações de fidelização (Adm
 * pode mandar mimo, agradecimento, oferta exclusiva).
 */
export default async function TopClienteCard({ businessId }: { businessId: string }) {
  const supabase = await createClient()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  const startStr = start.toISOString().split('T')[0]
  const todayStr = new Date().toISOString().split('T')[0]

  const { data: appts } = await supabase
    .from('appointments')
    .select('client_name, total_price, payment_method')
    .eq('business_id', businessId)
    .not('paid_at', 'is', null)
    .neq('payment_method', 'courtesy')
    .gte('appointment_date', startStr)
    .lte('appointment_date', todayStr)

  type Row = { name: string; total: number; count: number }
  const map = new Map<string, Row>()
  for (const a of appts ?? []) {
    const name = (a.client_name || 'Sem nome').trim()
    const existing = map.get(name) ?? { name, total: 0, count: 0 }
    existing.total += a.total_price ?? 0
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
