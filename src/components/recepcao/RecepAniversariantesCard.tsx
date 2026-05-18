import { createClient } from '@/lib/supabase/server'
import { IconGift, IconWhatsapp } from '@/components/ui/Icon'

type Customer = {
  id: string
  name: string
  phone: string
  birthday: string
}

/**
 * Card sticky com aniversariantes do mês corrente · botão WhatsApp pra
 * mandar parabéns (link wa.me com texto pronto).
 */
export default async function RecepAniversariantesCard({
  businessId,
  businessName,
}: {
  businessId: string
  businessName: string
}) {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('customers')
    .select('id, name, phone, birthday')
    .eq('business_id', businessId)
    .not('birthday', 'is', null)
    .limit(200)

  const mes = new Date().getMonth() + 1
  const todosDoMes = ((rows ?? []) as Customer[])
    .filter((c) => {
      if (!c.birthday) return false
      const d = new Date(c.birthday + 'T00:00:00')
      return d.getMonth() + 1 === mes
    })
    .sort((a, b) => {
      const da = new Date(a.birthday + 'T00:00:00').getDate()
      const db = new Date(b.birthday + 'T00:00:00').getDate()
      return da - db
    })

  if (todosDoMes.length === 0) return null

  const list = todosDoMes.slice(0, 4)
  const restante = todosDoMes.length - list.length

  return (
    <div className="admin-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest inline-flex items-center gap-1.5" style={{ color: 'var(--admin-text-faded)' }}>
          <IconGift size={12} /> Aniversariantes do mês
        </p>
        <span className="text-[11px] font-bold tabular-nums" style={{ color: 'var(--admin-accent)' }}>
          {todosDoMes.length}
        </span>
      </div>

      <div className="space-y-2">
        {list.map((c) => {
          const day = new Date(c.birthday + 'T00:00:00').getDate()
          const link = `https://wa.me/${c.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
            `Olá ${c.name}! O ${businessName} deseja um aniversário lindo pra você ✨ Passa aqui pra gente celebrar com um mimo.`,
          )}`
          return (
            <div key={c.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate leading-tight" style={{ color: 'var(--admin-text)' }}>
                  {c.name}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                  Dia {day.toString().padStart(2, '0')}
                </p>
              </div>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Mandar parabéns pra ${c.name}`}
                className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-opacity hover:opacity-80"
                style={{
                  background: 'rgba(37,211,102,0.15)',
                  color: '#25D366',
                  border: '1px solid rgba(37,211,102,0.3)',
                }}
              >
                <IconWhatsapp size={15} />
              </a>
            </div>
          )
        })}
      </div>

      {restante > 0 && (
        <a
          href="/recepcao/clientes"
          className="block text-center text-xs font-semibold mt-3 pt-3 border-t"
          style={{
            borderColor: 'var(--admin-divider)',
            color: 'var(--admin-accent)',
          }}
        >
          Ver todos · +{restante}
        </a>
      )}
    </div>
  )
}
