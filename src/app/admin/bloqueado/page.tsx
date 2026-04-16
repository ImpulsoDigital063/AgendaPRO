import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

export default async function TrialExpiradoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('name, trial_ends_at')
    .eq('owner_id', user.id)
    .single()

  // Se não tiver trial ou ainda não expirou, volta pro admin
  if (!business?.trial_ends_at || new Date(business.trial_ends_at) >= new Date()) {
    redirect('/admin')
  }

  const whatsappLink = 'https://wa.me/5563992920080?text=' +
    encodeURIComponent(`Olá! Quero continuar usando o AgendaPRO para ${business.name}. Qual o próximo passo?`)

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">

        {/* Ícone */}
        <div className="w-20 h-20 rounded-3xl bg-gray-900 flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Título */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trial encerrado</h1>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            Seu período gratuito de 14 dias chegou ao fim.<br />
            Para continuar usando o AgendaPRO, escolha um plano.
          </p>
        </div>

        {/* Planos resumidos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-left space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-50">
            <div>
              <p className="font-semibold text-gray-900 text-sm">Solo</p>
              <p className="text-gray-400 text-xs">1 profissional</p>
            </div>
            <p className="font-bold text-gray-900">R$ 49<span className="text-gray-400 font-normal text-xs">/mês</span></p>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-50">
            <div>
              <p className="font-semibold text-gray-900 text-sm">Equipe</p>
              <p className="text-gray-400 text-xs">Até 5 profissionais</p>
            </div>
            <p className="font-bold text-gray-900">R$ 89<span className="text-gray-400 font-normal text-xs">/mês</span></p>
          </div>
          <div className="flex justify-between items-center py-2">
            <div>
              <p className="font-semibold text-gray-900 text-sm">Escala</p>
              <p className="text-gray-400 text-xs">Ilimitado</p>
            </div>
            <p className="font-bold text-gray-900">R$ 149<span className="text-gray-400 font-normal text-xs">/mês</span></p>
          </div>
        </div>

        {/* CTA WhatsApp */}
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-green-500 text-white text-center py-4 rounded-2xl font-bold text-base hover:bg-green-600 transition-colors"
        >
          Falar no WhatsApp para contratar
        </a>

        <LogoutButton />
      </div>
    </main>
  )
}
