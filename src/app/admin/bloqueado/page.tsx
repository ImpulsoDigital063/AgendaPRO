import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import LogoutButton from '@/components/LogoutButton'
import BillingCheckoutButton from '@/components/billing/BillingCheckoutButton'

type BlockReason = 'pending_payment' | 'refunded' | 'cancelled' | 'past_due'

export default async function AdminBloqueadoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug')
    .eq('owner_id', user.id)
    .single()

  if (!business) redirect('/admin/login')

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, plan, refunded_at, cancelled_at, grace_ends_at, founders_club')
    .eq('business_id', business.id)
    .single()

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
      redirect('/admin')
    }
  }

  const plan: 'solo' | 'equipe' = subscription?.plan === 'equipe' ? 'equipe' : 'solo'
  const planLabel = plan === 'equipe' ? 'Equipe' : 'Solo'
  const isFounder = !!subscription?.founders_club
  const planMonthly = plan === 'equipe' ? 'R$ 97' : 'R$ 67'

  const title =
    reason === 'pending_payment' ? 'Última etapa: liberar o painel' :
    reason === 'refunded' ? 'Reembolso executado' :
    reason === 'cancelled' ? 'Assinatura cancelada' :
    'Pagamento pendente'

  const message =
    reason === 'pending_payment'
      ? `Sua conta em ${business.name} está criada. Agora é só finalizar o pagamento pra começar a usar.`
    : reason === 'refunded'
      ? 'O reembolso foi processado. Se mudar de ideia, chama no WhatsApp que a gente reativa.'
    : reason === 'cancelled'
      ? 'Sua assinatura foi cancelada. Seus dados ficam guardados por 90 dias — se voltar antes disso, é só reativar.'
    : 'Tivemos falha na cobrança da mensalidade. Regularize pra manter o painel no ar.'

  const waSetupMessage =
    reason === 'pending_payment'
      ? isFounder
        ? `Olá! Acabei de criar minha conta no AgendaPRO pra ${business.name} (Plano ${planLabel}, Clube Fundador). Como ativo o painel?`
        : `Olá! Criei minha conta no AgendaPRO pra ${business.name} (Plano ${planLabel}). Quero pagar o setup de R$ 197 via PIX. Qual o próximo passo?`
    : reason === 'refunded'
      ? `Olá! Recebi o reembolso do AgendaPRO (${business.name}) e quero reativar.`
    : reason === 'cancelled'
      ? `Olá! Quero reativar minha conta do AgendaPRO (${business.name}).`
    : `Olá! Recebi aviso de pagamento pendente no AgendaPRO (${business.name}). Quero regularizar.`

  const whatsappLink = 'https://wa.me/5563992920080?text=' + encodeURIComponent(waSetupMessage)

  const auroraBg = {
    background:
      'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(16,185,129,0.30) 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 85% 80%, rgba(59,130,246,0.20) 0%, transparent 55%), #050713',
  }

  const cardStyle = {
    background: 'rgba(15, 23, 42, 0.72)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    boxShadow:
      '0 30px 80px -30px rgba(16, 185, 129, 0.30), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
  }

  const ctaPrimaryStyle = {
    background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
    boxShadow: '0 8px 20px -6px rgba(16,185,129,0.5)',
    color: '#fff',
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={auroraBg}
    >
      <div className="w-full max-w-sm relative">
        <div className="text-center mb-5">
          <Image src="/logo-agendapro-dark-signed.svg" alt="AgendaPRO by Impulso Digital" width={200} height={58} priority />
          {reason === 'pending_payment' && (
            <div
              className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(6,182,212,0.2) 100%)',
                color: '#5EEAD4',
                border: '1px solid rgba(16,185,129,0.3)',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" />
              </svg>
              Clube Fundador
            </div>
          )}
        </div>

        <div className="rounded-3xl p-6 space-y-5" style={cardStyle}>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">{title}</h1>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              {message}
            </p>
          </div>

          {reason === 'pending_payment' && (
            <>
              {/* Plano em destaque */}
              <div
                className="rounded-2xl p-4"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(16,185,129,0.2)',
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-white text-base">Plano {planLabel}</p>
                    <p className="text-xs text-slate-400">Setup único + mensalidade</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-300 text-2xl leading-none">{planMonthly}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">por mês</p>
                  </div>
                </div>

                {/* Bloco do setup com strikethrough quando Fundador */}
                <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(16,185,129,0.08)', border: '1px dashed rgba(16,185,129,0.25)' }}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Setup único</span>
                    <div className="text-right">
                      {isFounder ? (
                        <>
                          <span className="text-sm text-slate-500 line-through mr-2">R$ 197</span>
                          <span className="font-bold text-emerald-300 text-base">R$ 0</span>
                        </>
                      ) : (
                        <span className="font-bold text-white text-base">R$ 197</span>
                      )}
                    </div>
                  </div>
                  {isFounder && (
                    <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-emerald-500/10">
                      <span className="text-[11px] text-emerald-400">Desconto Clube Fundador</span>
                      <span className="text-[11px] font-bold text-emerald-400">−R$ 197</span>
                    </div>
                  )}
                </div>

                {isFounder && (
                  <div className="flex items-start gap-2 pt-3 border-t border-white/5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <p className="text-xs text-slate-300 leading-snug">
                      Preço travado pra sempre (Clube Fundador, 10 primeiros)
                    </p>
                  </div>
                )}
                <div className={`flex items-start gap-2 ${isFounder ? 'mt-2' : 'pt-3 border-t border-white/5'}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <p className="text-xs text-slate-300 leading-snug">
                    Garantia de 7 dias após o pagamento
                  </p>
                </div>
              </div>

              {/* CTA primário: MP mensalidade */}
              <div className="space-y-2">
                <BillingCheckoutButton
                  plan={plan}
                  label={`Ativar mensalidade (${planMonthly}/mês) no Mercado Pago`}
                  className="w-full py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
                  style={ctaPrimaryStyle}
                />
                <p className="text-[11px] text-slate-500 text-center leading-snug">
                  Você paga a primeira mensalidade pelo Mercado Pago (cartão ou Pix).
                </p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  {isFounder ? 'ou' : '+ setup'}
                </span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* CTA WhatsApp */}
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                  boxShadow: '0 8px 20px -6px rgba(37,211,102,0.5)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                {isFounder
                  ? 'Falar com a Impulso pelo WhatsApp'
                  : 'Pagar setup (R$ 197) pelo WhatsApp'}
              </a>
              <p className="text-[11px] text-slate-500 text-center leading-snug -mt-2">
                {isFounder
                  ? 'Em caso de dúvidas, fala direto com a gente.'
                  : 'A gente te manda o Pix na hora. Painel libera quando confirmar.'}
              </p>
            </>
          )}

          {reason !== 'pending_payment' && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                boxShadow: '0 8px 20px -6px rgba(37,211,102,0.5)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              Falar com a Impulso Digital
            </a>
          )}
        </div>

        <div className="flex justify-center mt-6">
          <LogoutButton />
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          AgendaPRO · Impulso Digital
        </p>
      </div>
    </main>
  )
}
