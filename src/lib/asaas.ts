/**
 * Asaas — Wrapper de chamadas API
 *
 * Docs: https://docs.asaas.com/reference/
 *
 * Auth: header `access_token: $aact_xxx`
 * Base URLs:
 *   - Production: https://api.asaas.com/v3
 *   - Sandbox:    https://api-sandbox.asaas.com/v3
 *
 * Eventos webhook relevantes (validados via header `asaas-access-token`):
 *   - PAYMENT_CONFIRMED — pagamento aprovado/conciliado
 *   - PAYMENT_RECEIVED  — dinheiro caiu efetivamente na conta
 *   - PAYMENT_REFUNDED  — refund processado
 *   - PAYMENT_OVERDUE   — vencimento sem pagamento
 *   - SUBSCRIPTION_CANCELLED
 */

const ASAAS_PROD_BASE = 'https://api.asaas.com/v3'
const ASAAS_SANDBOX_BASE = 'https://api-sandbox.asaas.com/v3'

export type AsaasBillingType = 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED'
export type AsaasCycle =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'BIMONTHLY'
  | 'QUARTERLY'
  | 'SEMIANNUALLY'
  | 'YEARLY'

function getApiKey(): string {
  const key = process.env.ASAAS_API_KEY
  if (!key) {
    throw new Error('ASAAS_API_KEY não configurada')
  }
  return key
}

function getBaseUrl(): string {
  // Sandbox por padrão se a key começa com $aact_hmlg_ (homologação)
  // ou se ASAAS_ENV=sandbox explícito.
  const apiKey = getApiKey()
  if (
    process.env.ASAAS_ENV === 'sandbox' ||
    apiKey.startsWith('$aact_hmlg_')
  ) {
    return ASAAS_SANDBOX_BASE
  }
  return ASAAS_PROD_BASE
}

async function asaasFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T | null; error: string | null }> {
  const baseUrl = getBaseUrl()
  const apiKey = getApiKey()

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey,
        ...(init.headers ?? {}),
      },
    })

    const text = await res.text()
    let data: T | null = null
    try {
      data = text ? (JSON.parse(text) as T) : null
    } catch {
      data = null
    }

    if (!res.ok) {
      const errorMsg =
        (data as { errors?: Array<{ description?: string }> })?.errors?.[0]
          ?.description ||
        (data as { message?: string })?.message ||
        text ||
        `HTTP ${res.status}`
      return { ok: false, status: res.status, data, error: errorMsg }
    }

    return { ok: true, status: res.status, data, error: null }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err instanceof Error ? err.message : 'network_error',
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// CUSTOMER (cliente)
// ─────────────────────────────────────────────────────────────────

export type AsaasCustomer = {
  id: string
  name: string
  email?: string
  cpfCnpj?: string
  externalReference?: string
  dateCreated?: string
}

export async function createCustomer(input: {
  name: string
  cpfCnpj: string
  email?: string
  mobilePhone?: string
  externalReference?: string
}) {
  return asaasFetch<AsaasCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      cpfCnpj: input.cpfCnpj,
      email: input.email,
      mobilePhone: input.mobilePhone,
      externalReference: input.externalReference,
      notificationDisabled: false,
    }),
  })
}

export async function getCustomerById(id: string) {
  return asaasFetch<AsaasCustomer>(`/customers/${id}`, { method: 'GET' })
}

// Busca customer por externalReference (= business.id no nosso caso)
export async function findCustomerByExternalReference(externalRef: string) {
  return asaasFetch<{ data: AsaasCustomer[]; totalCount: number }>(
    `/customers?externalReference=${encodeURIComponent(externalRef)}&limit=1`,
    { method: 'GET' }
  )
}

// ─────────────────────────────────────────────────────────────────
// SUBSCRIPTION (assinatura recorrente — pra cartão)
// ─────────────────────────────────────────────────────────────────

export type AsaasSubscription = {
  id: string
  customer: string
  billingType: AsaasBillingType
  value: number
  nextDueDate: string
  cycle: AsaasCycle
  description?: string
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED'
  externalReference?: string
}

export async function createSubscription(input: {
  customer: string
  billingType: AsaasBillingType
  value: number
  nextDueDate: string // YYYY-MM-DD
  cycle: AsaasCycle
  description?: string
  externalReference?: string
  endDate?: string
  maxPayments?: number
}) {
  return asaasFetch<AsaasSubscription>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: input.customer,
      billingType: input.billingType,
      value: input.value,
      nextDueDate: input.nextDueDate,
      cycle: input.cycle,
      description: input.description,
      externalReference: input.externalReference,
      endDate: input.endDate,
      maxPayments: input.maxPayments,
    }),
  })
}

export async function cancelSubscription(subscriptionId: string) {
  return asaasFetch<{ deleted: boolean; id: string }>(
    `/subscriptions/${subscriptionId}`,
    { method: 'DELETE' }
  )
}

// Lista os pagamentos de uma assinatura (pra achar o último pra refund)
export async function listSubscriptionPayments(subscriptionId: string) {
  return asaasFetch<{
    data: AsaasPayment[]
    totalCount: number
  }>(`/subscriptions/${subscriptionId}/payments`, { method: 'GET' })
}

// ─────────────────────────────────────────────────────────────────
// PAYMENT (cobrança avulsa — pra PIX único)
// ─────────────────────────────────────────────────────────────────

export type AsaasPayment = {
  id: string
  customer: string
  subscription?: string
  billingType: AsaasBillingType
  value: number
  netValue?: number
  status:
    | 'PENDING'
    | 'RECEIVED'
    | 'CONFIRMED'
    | 'OVERDUE'
    | 'REFUNDED'
    | 'RECEIVED_IN_CASH'
    | 'REFUND_REQUESTED'
    | 'CHARGEBACK_REQUESTED'
    | 'CHARGEBACK_DISPUTE'
    | 'AWAITING_CHARGEBACK_REVERSAL'
    | 'DUNNING_REQUESTED'
    | 'DUNNING_RECEIVED'
    | 'AWAITING_RISK_ANALYSIS'
  dueDate: string
  paymentDate?: string
  clientPaymentDate?: string
  invoiceUrl?: string
  bankSlipUrl?: string
  transactionReceiptUrl?: string
  externalReference?: string
}

export async function createPayment(input: {
  customer: string
  billingType: AsaasBillingType
  value: number
  dueDate: string // YYYY-MM-DD
  description?: string
  externalReference?: string
}) {
  return asaasFetch<AsaasPayment>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: input.customer,
      billingType: input.billingType,
      value: input.value,
      dueDate: input.dueDate,
      description: input.description,
      externalReference: input.externalReference,
    }),
  })
}

export async function getPaymentById(paymentId: string) {
  return asaasFetch<AsaasPayment>(`/payments/${paymentId}`, { method: 'GET' })
}

// ─────────────────────────────────────────────────────────────────
// REFUND
// ─────────────────────────────────────────────────────────────────

export type AsaasRefundResult = {
  id: string
  status: string
  value: number
  description?: string
  refundDate?: string
}

export async function refundPayment(input: {
  paymentId: string
  value?: number // se omitir, refund total
  description?: string
}) {
  return asaasFetch<AsaasRefundResult>(
    `/payments/${input.paymentId}/refund`,
    {
      method: 'POST',
      body: JSON.stringify({
        value: input.value,
        description: input.description ?? 'Cancelamento dentro do prazo de 7 dias (CDC art. 49)',
      }),
    }
  )
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * Converte plan do AgendaPRO + modalidade pra (billingType + cycle + value).
 * Ex: solo + mensal_cartao → CREDIT_CARD + MONTHLY + 67
 */
export function toAsaasParams(
  plan: 'solo' | 'equipe',
  modalidade:
    | 'mensal_cartao'
    | 'mensal_pix'
    | 'semestral_pix'
    | 'anual_pix',
  valorReais: number
): { billingType: AsaasBillingType; cycle: AsaasCycle | null; value: number } {
  const value = valorReais

  if (modalidade === 'mensal_cartao') {
    return { billingType: 'CREDIT_CARD', cycle: 'MONTHLY', value }
  }
  if (modalidade === 'mensal_pix') {
    return { billingType: 'PIX', cycle: 'MONTHLY', value }
  }
  if (modalidade === 'semestral_pix') {
    return { billingType: 'PIX', cycle: 'SEMIANNUALLY', value }
  }
  if (modalidade === 'anual_pix') {
    return { billingType: 'PIX', cycle: 'YEARLY', value }
  }

  // fallback (não deveria acontecer)
  return { billingType: 'PIX', cycle: 'MONTHLY', value }
}

/**
 * Calcula nextDueDate (data do primeiro vencimento).
 * Padrão: 1 dia no futuro pra dar tempo do cliente pagar.
 */
export function getNextDueDate(daysFromNow: number = 1): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().split('T')[0] // YYYY-MM-DD
}
