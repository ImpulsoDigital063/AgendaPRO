import { createClient as createServiceClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { IconAlert, IconInbox } from '@/components/ui/Icon'

/**
 * Card "Estoque Baixo" pra Home do Adm.
 *
 * Lê produtos do business com track_stock=true, min_quantity>0 e
 * quantity <= min_quantity. Mostra os 3 mais críticos (qty/min mais
 * baixo) e o total.
 *
 * Cravado pós-drilldown CIC Blocos 4-5 do Salão99 (22/05/2026): eles
 * têm só filtro reativo na lista de Produtos. Widget proativo na home
 * é gap competitivo do Salão99 que vira diferencial do AgendaPRO.
 */
type ProdutoBaixo = {
  id: string
  name: string
  variant: string | null
  quantity: number
  min_quantity: number
  unit: string
}

export default async function EstoqueAlertCard({ businessId }: { businessId: string }) {
  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data } = await sb
    .from('products')
    .select('id, name, variant, quantity, min_quantity, unit')
    .eq('business_id', businessId)
    .eq('active', true)
    .eq('track_stock', true)
    .gt('min_quantity', 0)
    .order('quantity', { ascending: true })

  const baixos = (data ?? []).filter((p) => p.quantity <= p.min_quantity) as ProdutoBaixo[]
  if (baixos.length === 0) return null

  const esgotados = baixos.filter((p) => p.quantity <= 0).length
  const top3 = baixos.slice(0, 3)
  const restantes = baixos.length - top3.length

  return (
    <Link
      href="/admin/produtos"
      className="block rounded-2xl p-4 transition-all hover:-translate-y-px"
      style={{
        background: 'linear-gradient(180deg, color-mix(in srgb, #F59E0B 10%, var(--admin-surface)) 0%, color-mix(in srgb, #F59E0B 14%, var(--admin-surface)) 100%)',
        border: '1px solid color-mix(in srgb, #F59E0B 35%, transparent)',
        borderTopColor: 'rgba(255,255,255,0.5)',
        boxShadow: '0 10px 24px -10px color-mix(in srgb, #F59E0B 35%, transparent), 0 2px 6px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#D97706' }}>
            Estoque baixo
          </p>
          <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
            {baixos.length} produto{baixos.length === 1 ? '' : 's'}
            {esgotados > 0 && (
              <span className="text-xs ml-2 font-semibold" style={{ color: '#DC2626' }}>
                {esgotados} esgotado{esgotados === 1 ? '' : 's'}
              </span>
            )}
          </p>
        </div>
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            color: '#fff',
            boxShadow: '0 4px 10px -2px rgba(217,119,6,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
          }}
        >
          <IconAlert size={18} />
        </span>
      </div>

      <div className="space-y-1">
        {top3.map((p) => {
          const isOut = p.quantity <= 0
          return (
            <div
              key={p.id}
              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs"
              style={{ background: 'rgba(255,255,255,0.5)' }}
            >
              <span className="font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
                {p.name}{p.variant && <span style={{ color: 'var(--admin-text-mute)', fontWeight: 500 }}> · {p.variant}</span>}
              </span>
              <span
                className="font-bold tabular-nums flex-shrink-0"
                style={{ color: isOut ? '#DC2626' : '#D97706' }}
              >
                {p.quantity} {p.unit}
                <span style={{ color: 'var(--admin-text-faded)', fontWeight: 500 }}> / mín {p.min_quantity}</span>
              </span>
            </div>
          )
        })}
        {restantes > 0 && (
          <p className="text-[11px] pt-1.5 font-semibold" style={{ color: '#D97706' }}>
            + {restantes} outro{restantes === 1 ? '' : 's'} abaixo do mínimo →
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 mt-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: '#D97706' }}>
        <IconInbox size={11} /> Ver produtos
      </div>
    </Link>
  )
}
