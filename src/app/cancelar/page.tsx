import { createClient as createServiceClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import CancelarConfirm from './CancelarConfirm'
import { verifyCancelToken } from '@/lib/token'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function CancelarPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; token?: string }>
}) {
  const { id, token } = await searchParams

  if (!id) notFound()
  if (!token || !verifyCancelToken(id, token)) notFound()

  const supabase = getAdminClient()

  const { data: appointment } = await supabase
    .from('appointments')
    .select('id, client_name, appointment_date, start_time, end_time, status, service_name, business:businesses(name, slug)')
    .eq('id', id)
    .single()

  if (!appointment) notFound()

  const [year, month, day] = appointment.appointment_date.split('-')
  const dateFormatted = `${day}/${month}/${year}`
  const business = appointment.business as unknown as { name: string; slug: string } | null

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-5">

        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Cancelar agendamento</h1>
          <p className="text-gray-400 text-sm mt-1">Confira os dados antes de cancelar</p>
        </div>

        {/* Dados do agendamento */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Estabelecimento</span>
            <span className="text-gray-900 font-medium">{business?.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Cliente</span>
            <span className="text-gray-900 font-medium">{appointment.client_name}</span>
          </div>
          {appointment.service_name && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Serviço</span>
              <span className="text-gray-900 font-medium">{appointment.service_name}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Data</span>
            <span className="text-gray-900 font-medium">{dateFormatted}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Horário</span>
            <span className="text-gray-900 font-medium">
              {appointment.start_time.slice(0, 5)} – {appointment.end_time.slice(0, 5)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Status</span>
            <span className={`font-medium ${
              appointment.status === 'confirmed' ? 'text-green-600' :
              appointment.status === 'cancelled' ? 'text-red-500' :
              'text-amber-500'
            }`}>
              {appointment.status === 'confirmed' ? 'Confirmado' :
               appointment.status === 'cancelled' ? 'Já cancelado' :
               'Pendente'}
            </span>
          </div>
        </div>

        <CancelarConfirm
          appointmentId={id}
          token={token}
          alreadyCancelled={appointment.status === 'cancelled'}
          businessSlug={business?.slug}
        />

      </div>
    </main>
  )
}
