'use client'

import { useState } from 'react'

type Modalidade = 'mensal_cartao' | 'mensal_pix' | 'semestral_pix' | 'anual_pix'
type Plano = 'solo' | 'equipe'

type ModalidadeOpcao = {
  key: Modalidade
  titulo: string
  valor: string
  subValor: string
  descricao: string
  bullets: string[]
  economia: string | null
  destaque: boolean
}

type Props = {
  plan: Plano
}

const OPCOES_POR_PLANO: Record<Plano, ModalidadeOpcao[]> = {
  solo: [
    {
      key: 'mensal_cartao',
      titulo: 'Mensal · Cartão automático',
      valor: 'R$ 67',
      subValor: 'por mês',
      descricao: 'Cobrança automática no cartão todo mês',
      bullets: ['Sem precisar lembrar', 'Cancela quando quiser pelo painel'],
      economia: null,
      destaque: false,
    },
    {
      key: 'mensal_pix',
      titulo: 'Mensal · PIX',
      valor: 'R$ 67',
      subValor: 'por mês',
      descricao: 'PIX a cada mês — a gente lembra 3 dias antes',
      bullets: ['Sem precisar de cartão', 'Email de aviso antes do vencimento'],
      economia: null,
      destaque: false,
    },
    {
      key: 'semestral_pix',
      titulo: 'Semestral à vista · PIX',
      valor: 'R$ 350',
      subValor: '6 meses',
      descricao: 'Cobre 6 meses · normalmente R$ 402',
      bullets: ['Quase 1 mês grátis', '6 meses sem mexer'],
      economia: 'R$ 52',
      destaque: false,
    },
    {
      key: 'anual_pix',
      titulo: 'Anual à vista · PIX',
      valor: 'R$ 670',
      subValor: '12 meses',
      descricao: 'Cobre 12 meses · normalmente R$ 804',
      bullets: ['2 meses grátis', '12 meses sem mexer · maior economia'],
      economia: 'R$ 134',
      destaque: true,
    },
  ],
  equipe: [
    {
      key: 'mensal_cartao',
      titulo: 'Mensal · Cartão automático',
      valor: 'R$ 97',
      subValor: 'por mês',
      descricao: 'Cobrança automática no cartão todo mês',
      bullets: ['Sem precisar lembrar', 'Cancela quando quiser pelo painel'],
      economia: null,
      destaque: false,
    },
    {
      key: 'mensal_pix',
      titulo: 'Mensal · PIX',
      valor: 'R$ 97',
      subValor: 'por mês',
      descricao: 'PIX a cada mês — a gente lembra 3 dias antes',
      bullets: ['Sem precisar de cartão', 'Email de aviso antes do vencimento'],
      economia: null,
      destaque: false,
    },
    {
      key: 'semestral_pix',
      titulo: 'Semestral à vista · PIX',
      valor: 'R$ 500',
      subValor: '6 meses',
      descricao: 'Cobre 6 meses · normalmente R$ 582',
      bullets: ['Quase 1 mês grátis', '6 meses sem mexer'],
      economia: 'R$ 82',
      destaque: false,
    },
    {
      key: 'anual_pix',
      titulo: 'Anual à vista · PIX',
      valor: 'R$ 970',
      subValor: '12 meses',
      descricao: 'Cobre 12 meses · normalmente R$ 1.164',
      bullets: ['2 meses grátis', '12 meses sem mexer · maior economia'],
      economia: 'R$ 194',
      destaque: true,
    },
  ],
}

type CustomerData = { name: string; cpfCnpj: string }

export default function BillingPlanSelector({ plan }: Props) {
  const [selectedKey, setSelectedKey] = useState<Modalidade>('anual_pix')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null)
  const [needsCustomerData, setNeedsCustomerData] = useState(false)
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: '',
    cpfCnpj: '',
  })

  const opcoes = OPCOES_POR_PLANO[plan]
  const selected = opcoes.find(o => o.key === selectedKey)!

  // Reset state ao trocar de modalidade
  function handleSelectModalidade(key: Modalidade) {
    setSelectedKey(key)
    setError(null)
    setFallbackUrl(null)
  }

  async function handleCheckout() {
    setError(null)
    setFallbackUrl(null)
    setLoading(true)

    // Timeout de 30s pra evitar loading infinito
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    // Body do checkout: incluir customer se já preenchido (Asaas exige na 1ª vez)
    const requestBody: Record<string, unknown> = { plan, modalidade: selectedKey }
    if (customerData.name && customerData.cpfCnpj) {
      requestBody.customer = {
        name: customerData.name,
        cpfCnpj: customerData.cpfCnpj.replace(/\D/g, ''),
      }
    }

    try {
      const res = await fetch('/api/billing/checkout-asaas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      // Tratamento explícito de rate limit
      if (res.status === 429) {
        setError('Muitas tentativas em pouco tempo. Espera 5 minutos e tenta de novo.')
        setLoading(false)
        return
      }

      const data = await res.json().catch(() => ({}))

      // Asaas pede CPF/CNPJ na primeira vez
      if (data.needs_customer_data) {
        setNeedsCustomerData(true)
        setLoading(false)
        return
      }

      if (!res.ok || !data.url) {
        setError(
          data.error ||
            'Não conseguimos abrir o checkout. Tente outra modalidade ou fala com a gente no WhatsApp.'
        )
        setLoading(false)
        return
      }

      // Tenta redirect. Se Safari bloquear, mostra link clicável de fallback
      try {
        window.location.href = data.url
        // Backup: se em 2s o redirect não rolou (Safari iOS bloqueou),
        // mostra link clicável manual
        setTimeout(() => {
          setFallbackUrl(data.url)
          setLoading(false)
        }, 2000)
      } catch {
        setFallbackUrl(data.url)
        setLoading(false)
      }
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === 'AbortError') {
        setError('A operação demorou demais. Verifica sua conexão e tenta de novo.')
      } else {
        setError('Falha de conexão. Tenta de novo em alguns segundos.')
      }
      setLoading(false)
    }
  }

  const labelBotao =
    selectedKey === 'mensal_cartao' ? `Ativar mensalidade (${selected.valor}/mês)` :
    selectedKey === 'mensal_pix'    ? `Pagar primeira mensalidade (${selected.valor}) via PIX` :
    selectedKey === 'semestral_pix' ? `Pagar 6 meses (${selected.valor}) via PIX` :
                                       `Pagar 12 meses (${selected.valor}) via PIX`

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
        Como você prefere pagar?
      </p>

      <div className="space-y-2">
        {opcoes.map((opt) => {
          const isSelected = opt.key === selectedKey
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => handleSelectModalidade(opt.key)}
              className="w-full text-left rounded-xl p-3 transition-all"
              style={{
                background: isSelected
                  ? 'rgba(16,185,129,0.10)'
                  : 'rgba(0,0,0,0.25)',
                border: isSelected
                  ? '1.5px solid rgba(16,185,129,0.6)'
                  : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex items-start gap-3">
                {/* Radio circle */}
                <div
                  className="flex-shrink-0 mt-0.5 rounded-full"
                  style={{
                    width: 18,
                    height: 18,
                    border: isSelected ? '5px solid #10B981' : '2px solid rgba(255,255,255,0.25)',
                    background: 'transparent',
                  }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-white text-sm truncate">{opt.titulo}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{opt.descricao}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-emerald-300 text-base leading-none">{opt.valor}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                        {opt.subValor}
                      </p>
                    </div>
                  </div>

                  {opt.economia && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <span
                        className="inline-block px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          background: opt.destaque
                            ? 'linear-gradient(90deg, rgba(16,185,129,0.2), rgba(6,182,212,0.2))'
                            : 'rgba(16,185,129,0.15)',
                          color: '#5EEAD4',
                          border: '1px solid rgba(16,185,129,0.35)',
                        }}
                      >
                        {opt.destaque ? '🔥 ' : ''}Economiza {opt.economia}
                      </span>
                    </div>
                  )}

                  {isSelected && (
                    <ul className="mt-2 space-y-1">
                      {opt.bullets.map((b, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {needsCustomerData && (
        <div
          className="rounded-xl p-3 space-y-2"
          style={{
            background: 'rgba(16,185,129,0.08)',
            border: '1.5px solid rgba(16,185,129,0.4)',
          }}
        >
          <p className="text-xs text-emerald-200 font-semibold">
            Pra emitir a cobrança a gente precisa de 2 dados rápidos:
          </p>
          <input
            type="text"
            placeholder="Nome completo (do titular do cartão)"
            value={customerData.name}
            onChange={(e) =>
              setCustomerData({ ...customerData, name: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
            }}
          />
          <input
            type="text"
            placeholder="CPF ou CNPJ (só números)"
            value={customerData.cpfCnpj}
            onChange={(e) =>
              setCustomerData({
                ...customerData,
                cpfCnpj: e.target.value.replace(/\D/g, '').slice(0, 14),
              })
            }
            inputMode="numeric"
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
            }}
          />
          <p className="text-[10px] text-slate-400">
            Esses dados ficam só com o Asaas pra emitir nota — nunca compartilhamos.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleCheckout}
        disabled={
          loading ||
          (needsCustomerData &&
            (!customerData.name.trim() || customerData.cpfCnpj.length < 11))
        }
        className="w-full py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
        style={{
          background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
          boxShadow: '0 8px 20px -6px rgba(16,185,129,0.5)',
          color: '#fff',
        }}
      >
        {loading
          ? 'Abrindo checkout…'
          : needsCustomerData
          ? 'Continuar pro pagamento'
          : labelBotao}
      </button>

      {error && (
        <p className="text-sm text-red-400 mt-2 text-center">{error}</p>
      )}

      {fallbackUrl && (
        <div
          className="mt-2 p-3 rounded-lg text-center"
          style={{
            background: 'rgba(16,185,129,0.10)',
            border: '1px solid rgba(16,185,129,0.35)',
          }}
        >
          <p className="text-xs text-emerald-200 mb-2">
            O navegador bloqueou o redirect automático. Toca no link abaixo:
          </p>
          <a
            href={fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 rounded-lg font-bold text-sm"
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
              color: '#fff',
            }}
          >
            Abrir checkout seguro →
          </a>
        </div>
      )}

      <div className="space-y-2 pt-1">
        <div
          className="rounded-lg px-3 py-2.5 flex items-start gap-2"
          style={{
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.25)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
            <path d="M9 12l2 2 4-4" />
            <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
          </svg>
          <p className="text-[11px] text-emerald-100 leading-snug">
            <strong>Garantia de 7 dias.</strong> Cancelou em até 7 dias? A gente devolve a grana
            sem burocracia — direto no seu PIX (24h) ou no cartão (5 a 10 dias úteis).
          </p>
        </div>
        <p className="text-[11px] text-slate-500 text-center leading-snug">
          Pagamento processado pelo Asaas. Sem fidelidade, cancela quando quiser.
        </p>
      </div>
    </div>
  )
}
