import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppointmentCard from '@/components/AppointmentCard'
import LogoutButton from '@/components/LogoutButton'
import ShareButton from '@/components/ShareButton'
import DivulgarCard from '@/components/admin/DivulgarCard'
import Link from 'next/link'
import Image from 'next/image'

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
    <main className="min-h-screen relative overflow-x-hidden" style={{ background: '#050713' }}>

      {/* Glow orbs de fundo */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute top-[40%] -right-24 w-72 h-72 rounded-full bg-blue-500/10 blur-[80px]" />
        <div className="absolute bottom-0 -left-20 w-64 h-64 rounded-full bg-indigo-600/10 blur-[80px]" />
      </div>

      {/* Header */}
      <div className="relative max-w-lg mx-auto px-4 pt-8 pb-6">
        <div className="flex items-center justify-between mb-5">
          <Image src="/logo-agendapro-dark.svg" alt="AgendaPRO" width={130} height={26} priority />
          <div className="flex items-center gap-2">
            <ShareButton slug={business.slug} />
            <LogoutButton />
          </div>
        </div>
        <h1 className="text-white text-2xl font-bold tracking-tight">{business.name}</h1>
        <p className="text-gray-500 text-sm capitalize mt-1">{todayFormatted}</p>
      </div>

      {/* Stats */}
      <div className="relative max-w-lg mx-auto px-4 mb-6">
        <div className="grid grid-cols-4 gap-2">
          {[
            {
              value: revenue > 0
                ? 'R$' + revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })
                : 'R$0',
              label: 'Faturado',
              color: 'text-emerald-400',
            },
            { value: pending.length,   label: 'Pendentes',   color: 'text-yellow-400' },
            { value: confirmed.length, label: 'Confirmados', color: 'text-blue-400'   },
            { value: cancelled.length, label: 'Cancelados',  color: 'text-gray-500'   },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl p-3 text-center"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <p className={`text-base font-bold ${stat.color} leading-none`}>{stat.value}</p>
              <p className="text-gray-500 text-xs mt-1.5 leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative max-w-lg mx-auto px-4 pb-10 space-y-6">

        {/* Divulgação */}
        <DivulgarCard
          slug={business.slug}
          appUrl={process.env.NEXT_PUBLIC_APP_URL || 'https://agendapro.com.br'}
        />

        {/* Hoje */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Hoje</p>
            {list.length > 0 && (
              <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                {list.length} agendamento{list.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {list.length === 0 ? (
            <div
              className="rounded-2xl p-8 text-center"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <p className="text-3xl mb-2">📭</p>
              <p className="text-gray-400 text-sm font-medium">Nenhum agendamento hoje</p>
              <p className="text-gray-600 text-xs mt-1">Compartilhe seu link para receber reservas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((a) => <AppointmentCard key={a.id} appointment={a} />)}
            </div>
          )}
        </section>

        {/* Próximos dias */}
        {upcoming && upcoming.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Próximos dias</p>
              <span className="text-xs text-gray-600">7 dias</span>
            </div>
            <div className="space-y-3">
              {upcoming.map((a) => (
                <AppointmentCard key={a.id} appointment={a} showDate />
              ))}
            </div>
          </section>
        )}

        {/* Nav */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {[
            { href: '/admin/configuracoes', label: 'Configurações', icon: '⚙️', desc: 'Serviços, horários e profissionais' },
            { href: '/admin/configuracoes', label: 'Aparência',     icon: '🎨', desc: 'Personalize as cores do seu link'  },
            { href: '/admin/clientes',      label: 'Clientes',      icon: '👥', desc: 'Fidelidade e programa de pontos'  },
            { href: '/admin/financeiro',    label: 'Financeiro',    icon: '💰', desc: 'Faturamento e relatórios'          },
          ].map((item, i, arr) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-4 hover:bg-white/5 transition-colors ${i < arr.length - 1 ? 'border-b border-white/5' : ''}`}
            >
              <span className="text-xl w-8 text-center flex-shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-gray-200 font-medium text-sm">{item.label}</p>
                <p className="text-gray-500 text-xs">{item.desc}</p>
              </div>
              <span className="text-gray-600 text-sm">›</span>
            </Link>
          ))}
        </div>

        <p className="text-center text-gray-700 text-xs pb-2">AgendaPRO · Impulso Digital</p>
      </div>
    </main>
  )
}
