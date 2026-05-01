/**
 * Helpers de billing — geração de PIX, cálculo de prazos.
 * Reutilizado por: /api/billing/checkout, /api/billing/regenerate-pix, /api/cron/billing-check
 */

import { calcularPreco, type ModalidadeKey, type PlanoTipo } from '@/config/pricing'

export type PixPreferenceResult =
  | { ok: true; init_point: string; preference_id: string; valor_reais: number; cobertura_meses: number }
  | { ok: false; error: string; mp_status?: number; mp_details?: unknown }

/**
 * Gera preference MP pra PIX único.
 * Usado pra mensal_pix (renovação mensal), semestral_pix, anual_pix.
 */
export async function gerarPixPreference({
  businessId,
  payerEmail,
  plan,
  modalidade,
  appUrl,
  accessToken,
}: {
  businessId: string
  payerEmail: string
  plan: PlanoTipo
  modalidade: Exclude<ModalidadeKey, 'mensal_cartao'>
  appUrl: string
  accessToken: string
}): Promise<PixPreferenceResult> {
  const preco = calcularPreco(plan, modalidade)

  const titulo =
    modalidade === 'mensal_pix'    ? `AgendaPRO ${plan === 'solo' ? 'Solo' : 'Equipe'} — Mensalidade ${plan === 'solo' ? 'R$ 67' : 'R$ 97'} (PIX)` :
    modalidade === 'semestral_pix' ? `AgendaPRO ${plan === 'solo' ? 'Solo' : 'Equipe'} — Semestral à vista (PIX)` :
                                      `AgendaPRO ${plan === 'solo' ? 'Solo' : 'Equipe'} — Anual à vista (PIX)`

  const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      items: [{
        id: `agendapro-${plan}-${modalidade}`,
        title: titulo,
        description: `Cobre ${preco.coberturaMeses} ${preco.coberturaMeses === 1 ? 'mês' : 'meses'} de uso da plataforma AgendaPRO`,
        quantity: 1,
        unit_price: preco.valorReais,
        currency_id: 'BRL',
      }],
      payer: { email: payerEmail },
      payment_methods: {
        excluded_payment_types: [
          { id: 'credit_card' },
          { id: 'debit_card' },
          { id: 'ticket' },
          { id: 'atm' },
        ],
        installments: 1,
      },
      back_urls: {
        success: `${appUrl}/admin?payment=success`,
        pending: `${appUrl}/admin?payment=pending`,
        failure: `${appUrl}/admin/bloqueado?payment=failure`,
      },
      auto_return: 'approved',
      external_reference: `${businessId}|${modalidade}|${preco.coberturaMeses}`,
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
      expires: true,
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    }),
  })

  if (!mpResponse.ok) {
    const errorText = await mpResponse.text()
    let mpError: unknown = errorText
    try { mpError = JSON.parse(errorText) } catch {}
    const mpMessage =
      (mpError as { message?: string; error?: string })?.message ||
      (mpError as { message?: string; error?: string })?.error ||
      errorText
    return {
      ok: false,
      error: `MP rejeitou (${mpResponse.status}): ${mpMessage}`,
      mp_status: mpResponse.status,
      mp_details: mpError,
    }
  }

  const mpData = await mpResponse.json()
  return {
    ok: true,
    init_point: mpData.init_point,
    preference_id: mpData.id,
    valor_reais: preco.valorReais,
    cobertura_meses: preco.coberturaMeses,
  }
}

/**
 * Calcula dias entre hoje e uma data — retorna negativo se data passada.
 * Ex: pago_ate = amanhã → retorna 1
 *     pago_ate = ontem  → retorna -1
 */
export function diasAteVencer(pagoAte: string | Date): number {
  const ate = pagoAte instanceof Date ? pagoAte : new Date(pagoAte)
  const agora = new Date()
  // Normaliza pra meia-noite pra não considerar horas
  ate.setHours(0, 0, 0, 0)
  agora.setHours(0, 0, 0, 0)
  return Math.ceil((ate.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))
}
