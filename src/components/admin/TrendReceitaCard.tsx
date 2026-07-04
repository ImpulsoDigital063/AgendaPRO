import { createClient } from '@/lib/supabase/server'
import { getApptDiscountMap } from '@/lib/commission-discount'
import { todayBR, addDaysBR } from '@/lib/date-br'
import { IconDollar } from '@/components/ui/Icon'

/**
 * Card analítico · receita hoje vs ontem vs média 7d, com sparkline
 * dos últimos 14 dias. Útil pro dono ver tendência sem entrar em
 * /financeiro.
 */
export default async function TrendReceitaCard({ businessId }: { businessId: string }) {
  const supabase = await createClient()
  // λ.fuso: dias em BR (não UTC · >21h caía no dia seguinte e deslocava a série)
  const todayStr = todayBR()
  const yesterdayStr = addDaysBR(todayStr, -1)
  const fourteenDaysAgoStr = addDaysBR(todayStr, -14)

  // Lê em paralelo: appointments pagos + vendas de produto pagas (sales)
  const [apptsRes, salesRes] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, appointment_date, total_price, payment_method, invoice_item_id')
      .eq('business_id', businessId)
      .not('paid_at', 'is', null)
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('appointment_date', fourteenDaysAgoStr)
      .lte('appointment_date', todayStr),
    supabase
      .from('sales')
      .select('sale_date, total, payment_method')
      .eq('business_id', businessId)
      .eq('type', 'product_sale')
      .eq('status', 'paid')
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('sale_date', fourteenDaysAgoStr)
      .lte('sale_date', todayStr),
    // TrendReceitaCard já filtrava cortesia em appointments · sales filtrado acima
  ])

  // λ.valor-liquido: tendência de receita com cupom abatido (04/07/2026).
  const apptDisc = await getApptDiscountMap(supabase, (apptsRes.data ?? []).map((a) => a.invoice_item_id))

  // Soma por dia (appointments + sales unificados)
  const byDay = new Map<string, number>()
  for (const a of apptsRes.data ?? []) {
    byDay.set(a.appointment_date, (byDay.get(a.appointment_date) || 0) + Math.max(0, (a.total_price ?? 0) - (apptDisc[a.id] ?? 0)))
  }
  for (const s of salesRes.data ?? []) {
    byDay.set(s.sale_date, (byDay.get(s.sale_date) || 0) + Number(s.total ?? 0))
  }

  const totalHoje = byDay.get(todayStr) ?? 0
  const totalOntem = byDay.get(yesterdayStr) ?? 0
  // Média dos últimos 7 dias completos (sem hoje · hoje ainda em andamento)
  const last7Days: number[] = []
  for (let i = 1; i <= 7; i++) {
    last7Days.push(byDay.get(addDaysBR(todayStr, -i)) ?? 0)
  }
  const media7d = last7Days.reduce((a, b) => a + b, 0) / 7

  // Sparkline dos últimos 14 dias (mais antigo → mais recente)
  const sparklineValues: number[] = []
  for (let i = 13; i >= 0; i--) {
    sparklineValues.push(byDay.get(addDaysBR(todayStr, -i)) ?? 0)
  }

  const diffOntem = totalOntem > 0 ? ((totalHoje - totalOntem) / totalOntem) * 100 : null
  const diffMedia = media7d > 0 ? ((totalHoje - media7d) / media7d) * 100 : null

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })

  // Sparkline SVG
  const max = Math.max(...sparklineValues, 1)
  const w = 280
  const h = 50
  const points = sparklineValues
    .map((v, i) => `${(i / (sparklineValues.length - 1)) * w},${h - (v / max) * h}`)
    .join(' ')

  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 14%, var(--admin-surface)) 0%, color-mix(in srgb, var(--brand-secondary) 10%, var(--admin-surface)) 100%)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
            Recebido hoje
          </p>
          <p className="text-3xl font-extrabold tabular-nums mt-1 leading-none" style={{ color: 'var(--admin-text)' }}>
            {fmt(totalHoje)}
          </p>
        </div>
        <span
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'rgba(16,185,129,0.18)',
            color: 'var(--admin-success,#10B981)',
          }}
        >
          <IconDollar size={22} />
        </span>
      </div>

      {/* Comparativos */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
            Ontem
          </p>
          <p className="text-sm font-bold tabular-nums mt-0.5" style={{ color: 'var(--admin-text)' }}>
            {fmt(totalOntem)}
          </p>
          {diffOntem != null && (
            <p className="text-[10px] tabular-nums mt-0.5" style={{ color: diffOntem >= 0 ? 'var(--admin-success,#10B981)' : 'var(--admin-danger,#EF4444)' }}>
              {diffOntem >= 0 ? '↑' : '↓'} {Math.abs(diffOntem).toFixed(0)}%
            </p>
          )}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
            Média 7d
          </p>
          <p className="text-sm font-bold tabular-nums mt-0.5" style={{ color: 'var(--admin-text)' }}>
            {fmt(media7d)}
          </p>
          {diffMedia != null && (
            <p className="text-[10px] tabular-nums mt-0.5" style={{ color: diffMedia >= 0 ? 'var(--admin-success,#10B981)' : 'var(--admin-danger,#EF4444)' }}>
              {diffMedia >= 0 ? '↑' : '↓'} {Math.abs(diffMedia).toFixed(0)}%
            </p>
          )}
        </div>
      </div>

      {/* Sparkline 14d */}
      <div className="mt-2">
        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-faded)' }}>
          Últimos 14 dias
        </p>
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
          <polyline
            points={points}
            fill="none"
            stroke="var(--brand-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  )
}
