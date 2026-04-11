import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Business, Service } from '@/lib/types'

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!business) notFound()

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', business.id)
    .eq('active', true)
    .order('name')

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-6 text-center">
          {business.logo_url && (
            <img
              src={business.logo_url}
              alt={business.name}
              className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-2 border-gray-100"
            />
          )}
          <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
          {business.description && (
            <p className="text-gray-500 text-sm mt-1">{business.description}</p>
          )}
          {business.address && (
            <p className="text-gray-400 text-xs mt-1">📍 {business.address}</p>
          )}
          {business.phone && (
            <p className="text-gray-400 text-xs mt-1">📞 {business.phone}</p>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Serviços */}
        {services && services.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Serviços
            </h2>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {(services as Service[]).map((service, index) => (
                <div
                  key={service.id}
                  className={`flex items-center justify-between px-4 py-4 ${
                    index < services.length - 1 ? 'border-b border-gray-50' : ''
                  }`}
                >
                  <span className="text-gray-800 font-medium">{service.name}</span>
                  <div className="text-right">
                    {service.price && (
                      <p className="text-gray-900 font-semibold">
                        R$ {Number(service.price).toFixed(2).replace('.', ',')}
                      </p>
                    )}
                    <p className="text-gray-400 text-xs">{service.duration_minutes} min</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Botão agendar */}
        <Link
          href={`/${slug}/agendar`}
          className="block w-full bg-gray-900 text-white text-center py-4 rounded-2xl font-semibold text-lg hover:bg-gray-800 transition-colors"
        >
          Agendar horário
        </Link>

        <p className="text-center text-gray-400 text-xs pb-4">
          Agendamento online por AgendaPRO · Impulso Digital
        </p>
      </div>
    </main>
  )
}
