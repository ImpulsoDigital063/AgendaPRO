import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HorariosTab from '@/components/admin/HorariosTab'

export const dynamic = 'force-dynamic'

/**
 * /recepcao/horarios · v133 · pedido do Studio Isis Melo (item 1 do setup).
 *
 * A dona tirou a definição de horário das profissionais (businesses.prof_edita_horario)
 * e pediu que ficasse com ela E com a recepção. A recepção só tinha SELECT em
 * working_hours e nenhuma tela — esta página fecha o outro lado.
 *
 * Gate duplo, igual ao resto do setup: a RLS (v133) barra de verdade e o
 * redirect aqui evita a recepção bater numa tela que não gravaria.
 * Chave default `false` → nos outros negócios nada muda.
 */
export default async function RecepHorariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/profissional/login')

  const { data: recep } = await supabase
    .from('professionals')
    .select('id, business_id, business:businesses(id, name, recep_edita_horario)')
    .eq('auth_user_id', user.id)
    .eq('is_receptionist', true)
    .single()

  if (!recep || !recep.business) redirect('/profissional/login')

  const business = recep.business as unknown as {
    id: string
    name: string
    recep_edita_horario: boolean | null
  }

  if (business.recep_edita_horario !== true) redirect('/recepcao')

  // A recepção define o horário de QUEM ATENDE — ela mesma fica de fora.
  const { data: professionals } = await supabase
    .from('professionals')
    .select('*')
    .eq('business_id', business.id)
    .eq('active', true)
    .eq('is_receptionist', false)
    .order('name')

  const ids = (professionals ?? []).map((p) => p.id)

  const { data: workingHours } = ids.length
    ? await supabase
        .from('working_hours')
        .select('*')
        .in('professional_id', ids)
        .order('day_of_week', { ascending: true })
    : { data: [] }

  return (
    <main className="relative max-w-3xl mx-auto px-4 pt-6 pb-10">
      <header className="mb-5">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
          Horários
        </h1>
        <p className="text-[13px]" style={{ color: 'var(--admin-text-mute)' }}>
          Dias e janelas de atendimento de cada profissional
        </p>
      </header>

      <HorariosTab
        professionals={professionals ?? []}
        initialWorkingHours={workingHours ?? []}
        isAdmin
      />
    </main>
  )
}
