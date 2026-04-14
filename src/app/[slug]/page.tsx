import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Business, Service } from '@/lib/types'
import GoogleReviewSection from '@/components/GoogleReviewSection'

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

  const category = (business as Business & { category?: string }).category

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Cover / Header */}
      <div className="bg-white border-b border-gray-100">
        {/* Faixa de cor no topo */}
        <div className="h-24 bg-gray-900 w-full" />

        <div className="max-w-lg mx-auto px-4 pb-6">
          {/* Avatar */}
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <div className="w-20 h-20 rounded-2xl border-4 border-white bg-gray-800 flex items-center justify-center text-white text-3xl font-bold shadow-sm flex-shrink-0 overflow-hidden">
              {business.logo_url
                ? <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
                : business.name.charAt(0).toUpperCase()
              }
            </div>
            <div className="pb-1">
              {category && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{category}</span>
              )}
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
          {business.description && (
            <p className="text-gray-500 text-sm mt-1 leading-relaxed">{business.description}</p>
          )}

          <div className="flex flex-wrap gap-3 mt-3">
            {business.address && (
              <span className="text-gray-400 text-xs flex items-center gap-1">
                📍 {business.address}
              </span>
            )}
            {business.phone && (
              <a
                href={`https://wa.me/55${business.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 text-xs flex items-center gap-1 hover:underline"
              >
                📱 {business.phone}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Botão agendar — destaque total */}
        <Link
          href={`/${slug}/agendar`}
          className="block w-full bg-gray-900 text-white text-center py-4 rounded-2xl font-bold text-lg hover:bg-gray-800 transition-colors shadow-sm"
        >
          Agendar horário →
        </Link>

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
                  <div>
                    <p className="text-gray-800 font-medium">{service.name}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{service.duration_minutes} min</p>
                  </div>
                  <div className="text-right">
                    {service.price ? (
                      <p className="text-gray-900 font-semibold">
                        {Number(service.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    ) : (
                      <p className="text-gray-400 text-sm">sob consulta</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Google Reviews */}
        {(business as Business).google_place_id && (
          <GoogleReviewSection
            businessId={business.id}
            googleMapsUrl={(business as Business).google_place_id!}
            rating={(business as Business).google_rating}
            reviewsCount={(business as Business).google_reviews_count}
            pointsForReview={(business as Business).points_for_review}
          />
        )}

        <div className="text-center space-y-1 pb-4">
          <p className="text-gray-300 text-xs">Agendamento por AgendaPRO · Impulso Digital</p>
          <div className="flex justify-center gap-3">
            <Link href="/privacidade" className="text-gray-300 text-xs hover:text-gray-500">Privacidade</Link>
            <span className="text-gray-200 text-xs">·</span>
            <Link href="/termos" className="text-gray-300 text-xs hover:text-gray-500">Termos de Uso</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
