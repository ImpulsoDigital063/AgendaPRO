import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import BookingFlow from '@/components/BookingFlow'

export default async function AgendarPage({
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

  const { data: professionals } = await supabase
    .from('professionals')
    .select('*')
    .eq('business_id', business.id)
    .eq('active', true)

  const [{ data: workingHours }, { data: services }] = await Promise.all([
    supabase
      .from('working_hours')
      .select('*')
      .in('professional_id', (professionals || []).map((p) => p.id)),
    supabase
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('name'),
  ])

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
          <a href={`/${slug}`} className="text-gray-400 hover:text-gray-600 text-xl">
            ←
          </a>
          <div>
            <h1 className="font-bold text-gray-900">{business.name}</h1>
            <p className="text-gray-400 text-sm">Escolha um horário</p>
          </div>
        </div>

        <BookingFlow
          business={business}
          professionals={professionals || []}
          workingHours={workingHours || []}
          services={services || []}
        />
      </div>
    </main>
  )
}
