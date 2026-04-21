import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

type BlockReason = 'pending_payment' | 'refunded' | 'cancelled' | 'past_due'

export default async function AdminBloqueadoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (!business) redirect('/admin/login')

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, plan, refunded_at, cancelled_at, grace_ends_at')
    .eq('business_id', business.id)
    .single()

  // Se não existe subscription, trata como pending_payment (cadastrou mas não pagou)
  let reason: BlockReason = 'pending_payment'

  if (subscription) {
    const now = new Date()
    if (subscription.refunded_at) {
      reason = 'refunded'
    } else if (subscription.status === 'cancelled') {
      reason = 'cancelled'
    } else if (
      subscription.status === 'past_due' &&
      subscription.grace_ends_at &&
      new Date(subscription.grace_ends_at) < now
    ) {
      reason = 'past_due'
    } else if (subscription.status === 'pending_payment') {
      reason = 'pending_payment'
    } else {
      // Não está bloqueado de verdade — volta pro admin
      redirect('/admin')
    }
  }

  const title =
    reason === 'pending_payment' ? 'Aguardando pagamento' :
    reason === 'refunded' ? 'Reembolso executado' :
    reason === 'cancelled' ? 'Assinatura cancelada' :
    'Pagamento pendente'

  const message =
    reason === 'pending_payment'
      ? 'Pra liberar o painel, finalize o pagamento do setup + primeira mensalidade. Depois a garantia de 7 dias começa a contar.'
    : reason === 'refunded'
      ? 'O reembolso foi processado. Se mudar de ideia, entre em contato pela Impulso Digital que a gente reativa.'
    : reason === 'cancelled'
      ? 'Sua assinatura foi cancelada. Seus dados ficam guardados por 90 dias — se voltar antes disso, é só reativar.'
    : 'Tivemos falha na cobrança da mensalidade. Entre em contato pra regularizar.'

  const waMessage =
    reason === 'pending_payment'
      ? `Olá! Quero finalizar o pagamento do AgendaPRO pra ${business.name}. Qual o próximo passo?`
    : reason === 'refunded'
      ? `Olá! Recebi o reembolso do AgendaPRO (${business.name}) e quero reativar. Como faço?`
    : reason === 'cancelled'
      ? `Olá! Quero reativar minha conta do AgendaPRO (${business.name}). Como faço?`
    : `Olá! Recebi aviso de pagamento pendente no AgendaPRO (${business.name}). Quero regularizar.`

  const whatsappLink = 'https://wa.me/5563992920080?text=' + encodeURIComponent(waMessage)

  const planLabel = subscription?.plan === 'equipe' ? 'Equipe' : 'Solo'
  const planSetup = subscription?.plan === 'equipe' ? 'R$ 197' : 'R$ 147'
  const planMonthly = subscription?.plan === 'equipe' ? 'R$ 67' : 'R$ 47'

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">

        {/* Ícone */}
        <div className="w-20 h-20 rounded-3xl bg-gray-900 flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Título + mensagem */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Card do plano escolhido (só mostra se tem subscription) */}
        {subscription && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-left space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <div>
                <p className="font-semibold text-gray-900 text-sm">Plano {planLabel}</p>
                <p className="text-gray-400 text-xs">Setup + mensalidade</p>
              </div>
              <p className="font-bold text-gray-900 text-right text-sm">
                {planSetup} setup
                <br />
                <span className="text-gray-500 font-normal text-xs">{planMonthly}/mês</span>
              </p>
            </div>
            <div className="text-xs text-gray-500 leading-relaxed">
              Clube Fundador: 10 primeiros travam esse preço pra sempre. Garantia de 7 dias após o pagamento.
            </div>
          </div>
        )}

        {/* CTA WhatsApp */}
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-green-500 text-white text-center py-4 rounded-2xl font-bold text-base hover:bg-green-600 transition-colors"
        >
          Falar com a Impulso Digital no WhatsApp
        </a>

        <LogoutButton />
      </div>
    </main>
  )
}
