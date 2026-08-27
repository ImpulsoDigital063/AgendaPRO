import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { todayBR } from '@/lib/date-br'
import BloqueiosProfView from '@/components/profissional/BloqueiosProfView'
import { IconArrowLeft } from '@/components/ui/Icon'

export const dynamic = 'force-dynamic'

/**
 * /profissional/bloqueios — 30/07/2026
 *
 * Aba de bloqueios da própria profissional. O admin tem a dele em
 * Configurações → Bloqueios, que é rota de dona; aqui ela vê e gerencia SÓ os
 * dela. Eduardo pediu depois de ver o modal do popover: "podemos colocar a aba
 * no drawer 'bloqueio' que já existe no adm".
 *
 * Escrita e remoção passam por /api/profissional/bloqueio, que grava com
 * service-role depois de conferir que o bloqueio é da agenda de quem está
 * logada (a policy da v53 só deixa o dono gravar direto).
 */
export default async function BloqueiosProfissionalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/profissional/login')

  const { data: prof } = await supabase
    .from('professionals')
    .select('id, name, business_id')
    .eq('auth_user_id', user.id)
    .eq('is_receptionist', false)
    .maybeSingle()
  if (!prof) redirect('/profissional/login')

  const hoje = todayBR()

  // Os dela + os do salão (professional_id null · ela vê, não mexe).
  // Bloqueio pontual do passado não interessa — recorrente sempre vale.
  const { data: blocos } = await supabase
    .from('business_blocks')
    .select('id, block_type, block_date, day_of_week, start_time, end_time, reason, professional_id, active')
    .eq('business_id', prof.business_id)
    .eq('active', true)
    .or(`professional_id.eq.${prof.id},professional_id.is.null`)
    .order('block_date', { ascending: true })

  const futuros = (blocos ?? []).filter(
    (b) => b.block_type === 'recurring' || (b.block_date ?? '') >= hoje,
  )

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <header className="relative max-w-lg mx-auto px-4 pt-6 pb-4">
        <Link
          href="/profissional"
          className="inline-flex items-center gap-1.5 text-sm mb-4"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          <IconArrowLeft size={16} /> Minha agenda
        </Link>
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--admin-text)' }}>
          Meus bloqueios
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--admin-text-mute)' }}>
          Horários em que você não atende — almoço, folga, compromisso. O cliente
          não consegue marcar neles.
        </p>
      </header>

      <div className="relative max-w-lg mx-auto px-4 pb-10">
        <BloqueiosProfView blocos={futuros} hoje={hoje} meuProfId={prof.id} />
      </div>
    </main>
  )
}
