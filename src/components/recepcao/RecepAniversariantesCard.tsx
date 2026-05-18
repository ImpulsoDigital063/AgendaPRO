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
  const list = ((rows ?? []) as Customer[])
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
    .slice(0, 10)

  if (list.length === 0) return null

  return (
    <div className="admin-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest inline-flex items-center gap-1.5" style={{ color: 'var(--admin-text-faded)' }}>
          <IconGift size={12} /> Aniversariantes do mês
        </p>
        <span className="text-[11px] font-bold" style={{ color: 'var(--admin-accent)' }}>
          {list.length}
        </span>
      </div>

      <div className="space-y-1.5">
        {list.map((c) => {
          const day = new Date(c.birthday + 'T00:00:00').getDate()
          const link = `https://wa.me/${c.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
            `Olá ${c.name}! O ${businessName} deseja um aniversário lindo pra você ✨ Passa aqui pra gente celebrar com um mimo.`,
          )}`
          return (
            <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
                  {c.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                  Dia {day.toString().padStart(2, '0')}
                </p>
              </div>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Mandar parabéns pra ${c.name}`}
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: 'rgba(37,211,102,0.15)',
                  color: '#25D366',
                  border: '1px solid rgba(37,211,102,0.3)',
                }}
              >
                <IconWhatsapp size={14} />
              </a>
            </div>
          )
        })}
      </div>
    </div>
  )
}
