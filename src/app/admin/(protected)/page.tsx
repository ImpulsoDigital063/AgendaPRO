import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppointmentCard from '@/components/AppointmentCard'
import LogoutButton from '@/components/LogoutButton'
import ShareButton from '@/components/ShareButton'
import DivulgarCard from '@/components/admin/DivulgarCard'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!business) redirect('/cadastro')

  const today = new Date().toISOString().split('T')[0]

  const { data: appointments } = await supabase
    .from('appointments')
    .select(`*, professional:professionals(name)`)
    .eq('business_id', business.id)
    .eq('appointment_date', today)
    .order('start_time', { ascending: true })

  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextWeekStr = nextWeek.toISOString().split('T')[0]

  const { data: upcoming } = await supabase
    .from('appointments')
    .select(`*, professional:professionals(name)`)
    .eq('business_id', business.id)
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

  const list = appointments || []
  const pending   = list.filter((a) => a.status === 'pending')
  const confirmed = list.filter((a) => a.status === 'confirmed')
  const cancelled = list.filter((a) => a.status === 'cancelled')
  const revenue   = confirmed.reduce((sum, a) => sum + (a.total_price || 0), 0)

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Header azul */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700">
        <div className="max-w-lg mx-auto px-4 pt-6 pb-12">
          <div className="flex items-center justify-between mb-4">
            <span className="text-blue-200 text-xs font-semibold uppercase tracking-widest">
              AgendaPRO
            </span>
            <div className="flex items-center gap-2">
              <ShareButton slug={business.slug} />
              <LogoutButton />
            </div>
          </div>
          <h1 className="text-white text-2xl font-bold leading-tight">{business.name}</h1>
          <p className="text-blue-200 text-sm capitalize mt-1">{todayFormatted}</p>
        </div>
      </div>

      {/* Stats sobrepostos ao header */}
      <div className="max-w-lg mx-auto px-4 -mt-6">
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
            <p className="text-lg font-bold text-emerald-600">
              {revenue > 0
                ? revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace('R$\u00a0', 'R$')
                : 'R$0'}
            </p>
            <p className="text-gray-400 text-xs mt-0.5 leading-tight">Faturado</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
            <p className="text-lg font-bold text-yellow-500">{pending.length}</p>
            <p className="text-gray-400 text-xs mt-0.5 leading-tight">Pendentes</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
            <p className="text-lg font-bold text-blue-600">{confirmed.length}</p>
            <p className="text-gray-400 text-xs mt-0.5 leading-tight">Confirmados</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
            <p className="text-lg font-bold text-gray-300">{cancelled.length}</p>
            <p className="text-gray-400 text-xs mt-0.5 leading-tight">Cancelados</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Divulgação */}
        <DivulgarCard
          slug={business.slug}
          appUrl={process.env.NEXT_PUBLIC_APP_URL || 'https://agendapro.com.br'}
        />

        {/* Agendamentos de hoje */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Hoje
            </h2>
            {list.length > 0 && (
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {list.length} agendamento{list.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {list.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-gray-500 text-sm font-medium">Nenhum agendamento hoje</p>
              <p className="text-gray-400 text-xs mt-1">Compartilhe seu link para receber reservas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))}
            </div>
          )}
        </section>

        {/* Próximos dias */}
        {upcoming && upcoming.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Próximos dias
              </h2>
              <span className="text-xs text-gray-400">7 dias</span>
            </div>
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

        {/* Nav inferior */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {[
            { href: '/admin/configuracoes', label: 'Configurações', icon: '⚙️', desc: 'Serviços, horários e profissionais' },
            { href: '/admin/clientes', label: 'Clientes', icon: '👥', desc: 'Fidelidade e programa de pontos' },
            { href: '/admin/financeiro', label: 'Financeiro', icon: '💰', desc: 'Faturamento e relatórios' },
          ].map((item, i, arr) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              <span className="text-xl w-8 text-center flex-shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 font-medium text-sm">{item.label}</p>
                <p className="text-gray-400 text-xs">{item.desc}</p>
              </div>
              <span className="text-gray-300 text-sm">›</span>
            </Link>
          ))}
        </div>

        <p className="text-center text-gray-300 text-xs pb-2">AgendaPRO · Impulso Digital</p>
      </div>
    </main>
  )
}
