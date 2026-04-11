import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppointmentCard from '@/components/AppointmentCard'
import LogoutButton from '@/components/LogoutButton'
import ShareButton from '@/components/ShareButton'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  // Busca o negócio do usuário logado
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  // Se não tem negócio, redireciona pro cadastro
  if (!business) {
    redirect('/cadastro')
  }

  // Agendamentos de hoje
  const today = new Date().toISOString().split('T')[0]

  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      *,
      professional:professionals(name)
    `)
    .eq('business_id', business?.id)
    .eq('appointment_date', today)
    .order('start_time', { ascending: true })

  // Agendamentos futuros (próximos 7 dias, excluindo hoje)
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextWeekStr = nextWeek.toISOString().split('T')[0]

  const { data: upcoming } = await supabase
    .from('appointments')
    .select(`*, professional:professionals(name)`)
    .eq('business_id', business?.id)
    .gt('appointment_date', today)
    .lte('appointment_date', nextWeekStr)
    .in('status', ['pending', 'confirmed'])
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(10)

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const pending = (appointments || []).filter((a) => a.status === 'pending')
  const confirmed = (appointments || []).filter((a) => a.status === 'confirmed')
  const cancelled = (appointments || []).filter((a) => a.status === 'cancelled')

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900">{business?.name || 'Painel'}</h1>
            <p className="text-gray-400 text-xs capitalize">{todayFormatted}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/configuracoes"
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors px-3 py-2 rounded-xl hover:bg-gray-50"
            >
              ⚙ Config
            </Link>
            <LogoutButton />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Link da página pública */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Sua página de agendamento</p>
            <p className="text-sm font-medium text-gray-700">/{business.slug}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/${business.slug}`}
              target="_blank"
              className="text-xs px-3 py-2 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200 transition-colors"
            >
              Ver →
            </Link>
            <ShareButton slug={business.slug} />
          </div>
        </div>

        {/* Resumo do dia */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-yellow-500">{pending.length}</p>
            <p className="text-xs text-gray-400 mt-1">Pendentes</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{confirmed.length}</p>
            <p className="text-xs text-gray-400 mt-1">Confirmados</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-gray-300">{cancelled.length}</p>
            <p className="text-xs text-gray-400 mt-1">Cancelados</p>
          </div>
        </div>

        {/* Agendamentos de hoje */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Hoje
          </h2>
          {(appointments || []).length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <p className="text-gray-400 text-sm">Nenhum agendamento hoje.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(appointments || []).map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))}
            </div>
          )}
        </section>

        {/* Próximos agendamentos */}
        {upcoming && upcoming.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Próximos dias
            </h2>
            <div className="space-y-3">
              {upcoming.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  showDate
                />
              ))}
            </div>
          </section>
        )}

      </div>
    </main>
  )
}
