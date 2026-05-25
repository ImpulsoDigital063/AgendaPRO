import { createClient } from '@/lib/supabase/server'
import { IconStar, IconChevronRight } from '@/components/ui/Icon'
import Link from 'next/link'

/**
 * Top 3 profissionais do mês por receita realizada (paid_at).
 * Cortesia não conta · só dinheiro de verdade. Visual de pódio compacto.
 */
export default async function TopProfsCard({ businessId }: { businessId: string }) {
  const supabase = await createClient()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  const startStr = start.toISOString().split('T')[0]
  const todayStr = new Date().toISOString().split('T')[0]

  const [apptsRes, salesRes] = await Promise.all([
    supabase
      .from('appointments')
      .select('professional_id, total_price, payment_method, professional:professionals(id, name)')
      .eq('business_id', businessId)
      .not('paid_at', 'is', null)
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('appointment_date', startStr)
      .lte('appointment_date', todayStr),
    supabase
      .from('sales')
      .select('professional_id, total, payment_method, professional:professionals(id, name)')
      .eq('business_id', businessId)
      .eq('type', 'product_sale')
      .eq('status', 'paid')
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('sale_date', startStr)
      .lte('sale_date', todayStr),
  ])

  type Row = { id: string; name: string; total: number; count: number }
  const map = new Map<string, Row>()
  for (const a of apptsRes.data ?? []) {
    const p = a.professional as unknown as { id: string; name: string } | null
    if (!p) continue
    const existing = map.get(p.id) ?? { id: p.id, name: p.name, total: 0, count: 0 }
    existing.total += a.total_price ?? 0
    existing.count += 1
    map.set(p.id, existing)
  }
  for (const s of salesRes.data ?? []) {
    const p = s.professional as unknown as { id: string; name: string } | null
    if (!p) continue
    const existing = map.get(p.id) ?? { id: p.id, name: p.name, total: 0, count: 0 }
    existing.total += Number(s.total ?? 0)
    existing.count += 1
    map.set(p.id, existing)
  }
  const ranked = Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)

  if (ranked.length === 0) return null

  const medals = ['🥇', '🥈', '🥉']
  const colors = ['#D4AF37', '#9CA3AF', '#B87333']

  return (
    <div className="admin-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest inline-flex items-center gap-1.5" style={{ color: 'var(--admin-text-faded)' }}>
          <IconStar size={12} /> Top profissionais · últimos 30 dias
        </p>
      </div>
      <div className="space-y-2.5">
        {ranked.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3">
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
              style={{ background: `color-mix(in srgb, ${colors[i]} 18%, transparent)` }}
            >
              {medals[i]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
                {p.name}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                {p.count} atendimento{p.count > 1 ? 's' : ''}
              </p>
            </div>
            <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--admin-success,#10B981)' }}>
              {p.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
