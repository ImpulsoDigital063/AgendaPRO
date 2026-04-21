'use client'

import { useState } from 'react'

type Transaction = {
  id: string
  points: number
  reason: 'service' | 'referral' | 'review' | 'redeem'
  created_at: string
  appointment_id: string | null
}

type UpcomingAppointment = {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  service_name: string | null
  professional_name: string | null
  cancel_token: string
}

type LookupResult = {
  found: boolean
  message?: string
  customer?: {
    name: string
    total_points: number
    referral_link: string
  }
  transactions?: Transaction[]
  review_claim?: { status: 'pending' | 'approved' | 'rejected'; requested_at: string } | null
  has_review_program?: boolean
  upcoming_appointments?: UpcomingAppointment[]
}

const REASON_LABEL: Record<Transaction['reason'], string> = {
  service: 'Serviço realizado',
  referral: 'Indicou um amigo',
  review: 'Avaliou no Google',
  redeem: 'Resgatou recompensa',
}

export default function MeusPontosClient({
  businessId,
  slug,
  isDark,
}: {
  businessId: string
  slug: string
  isDark: boolean
}) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<LookupResult | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSearch() {
    if (!phone.trim()) return
    setLoading(true)
    setResult(null)

    const res = await fetch('/api/customer-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId, phone: phone.trim() }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setResult({ found: false, message: data.error || 'Erro ao consultar.' })
      return
    }
    setResult(data)
  }

  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#fff'
  const cardBorder = isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E2E8F0'
  const textMute = isDark ? '#94A3B8' : '#64748B'

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Form de consulta */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: cardBg, border: cardBorder }}
      >
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMute }}>
          Seu WhatsApp
        </label>
        <div className="flex gap-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(99) 99999-9999"
            className="flex-1 border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
            style={{
              background: isDark ? 'rgba(0,0,0,0.3)' : '#fff',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
              color: isDark ? '#F8FAFC' : '#0F172A',
            }}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !phone.trim()}
            className="px-4 text-white text-sm font-semibold rounded-xl transition-opacity disabled:opacity-40"
            style={{ background: 'var(--brand-primary)' }}
          >
            {loading ? '...' : 'Ver pontos'}
          </button>
        </div>
      </div>

      {/* Resultado: não encontrado */}
      {result && !result.found && (
        <div
          className="rounded-2xl p-4 text-center text-sm"
          style={{ background: cardBg, border: cardBorder, color: textMute }}
        >
          {result.message}
          <div className="mt-3">
            <a
              href={`/${slug}/agendar`}
              className="inline-block px-4 py-2 text-white text-sm font-semibold rounded-xl"
              style={{ background: 'var(--brand-primary)' }}
            >
              Fazer primeiro agendamento
            </a>
          </div>
        </div>
      )}

      {/* Resultado: encontrado */}
      {result?.found && result.customer && (
        <>
          {/* Saldo */}
          <div
            className="rounded-2xl p-5 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(251, 191, 36, 0.05))',
              border: '1px solid rgba(251, 191, 36, 0.3)',
            }}
          >
            <p className="text-xs uppercase tracking-wider" style={{ color: textMute }}>
              Olá, {result.customer.name.split(' ')[0]}
            </p>
            <p className="text-4xl font-bold mt-2" style={{ color: '#F59E0B' }}>
              {result.customer.total_points}
            </p>
            <p className="text-xs mt-1" style={{ color: textMute }}>
              pontos de fidelidade
            </p>
          </div>

          {/* Próximos agendamentos — cancelamento direto */}
          {result.upcoming_appointments && result.upcoming_appointments.length > 0 && (
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{ background: cardBg, border: cardBorder }}
            >
              <p className="text-xs uppercase tracking-wider" style={{ color: textMute }}>
                Próximos agendamentos
              </p>
              <div className="space-y-2">
                {result.upcoming_appointments.map((appt) => {
                  const [year, month, day] = appt.appointment_date.split('-')
                  const dateFormatted = `${day}/${month}/${year}`
                  return (
                    <div
                      key={appt.id}
                      className="rounded-xl p-3 flex items-center justify-between gap-2"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                        border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E2E8F0',
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                          {dateFormatted} · {appt.start_time.slice(0, 5)}
                        </p>
                        {appt.service_name && (
                          <p className="text-xs truncate" style={{ color: textMute }}>
                            {appt.service_name}
                            {appt.professional_name && ` · ${appt.professional_name}`}
                          </p>
                        )}
                      </div>
                      <a
                        href={`/cancelar?id=${appt.id}&token=${appt.cancel_token}`}
                        className="text-xs font-medium px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
                        style={{
                          background: isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2',
                          color: isDark ? '#FCA5A5' : '#B91C1C',
                          border: isDark ? '1px solid rgba(239,68,68,0.25)' : '1px solid #FECACA',
                        }}
                      >
                        Cancelar
                      </a>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Status do pedido de review */}
          {result.review_claim && (
            <div
              className="rounded-2xl p-4 text-sm"
              style={{
                background: cardBg,
                border: cardBorder,
              }}
            >
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color: textMute }}>
                Pedido de pontos por avaliação
              </p>
              {result.review_claim.status === 'pending' && (
                <p style={{ color: isDark ? '#FBBF24' : '#92400E' }}>
                  ⏳ Aguardando o estabelecimento confirmar tua avaliação no Google.
                </p>
              )}
              {result.review_claim.status === 'approved' && (
                <p style={{ color: isDark ? '#34D399' : '#047857' }}>
                  ✅ Pontos da avaliação já foram creditados.
                </p>
              )}
              {result.review_claim.status === 'rejected' && (
                <p style={{ color: isDark ? '#F87171' : '#991B1B' }}>
                  ❌ Pedido não confirmado. Fala com o estabelecimento.
                </p>
              )}
            </div>
          )}

          {/* Link de indicação */}
          <div
            className="rounded-2xl p-4 space-y-2"
            style={{ background: cardBg, border: cardBorder }}
          >
            <p className="text-xs uppercase tracking-wider" style={{ color: textMute }}>
              Indique um amigo e ganhe pontos
            </p>
            <p className="text-xs" style={{ color: textMute }}>
              Quando ele agendar por esse link e comparecer ao atendimento, você ganha pontos.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}${result.customer.referral_link}`}
                className="flex-1 border rounded-xl px-3 py-2 text-xs focus:outline-none"
                style={{
                  background: isDark ? 'rgba(0,0,0,0.3)' : '#fff',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                }}
              />
              <button
                onClick={() => {
                  const link = `${window.location.origin}${result.customer!.referral_link}`
                  navigator.clipboard.writeText(link)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="px-3 text-xs font-semibold rounded-xl transition-opacity"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                }}
              >
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Como ganhar mais pontos */}
          <div
            className="rounded-2xl p-4 space-y-3"
            style={{ background: cardBg, border: cardBorder }}
          >
            <p className="text-xs uppercase tracking-wider" style={{ color: textMute }}>
              Como ganhar mais pontos
            </p>
            <ul className="space-y-2 text-xs" style={{ color: isDark ? '#CBD5E1' : '#334155' }}>
              <li className="flex gap-2">
                <span style={{ color: '#F59E0B' }}>•</span>
                <span><strong>Agendando e sendo atendido.</strong> Cada serviço tem uma pontuação. Entra quando o estabelecimento confirma.</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: '#F59E0B' }}>•</span>
                <span><strong>Indicando amigo pelo teu link.</strong> Quando ele agendar e for atendido, os pontos caem na tua conta.</span>
              </li>
              {result.has_review_program && (
                <li className="flex gap-2">
                  <span style={{ color: '#F59E0B' }}>•</span>
                  <span><strong>Avaliando no Google.</strong> Depois da avaliação, o estabelecimento confirma e os pontos entram.</span>
                </li>
              )}
              <li className="flex gap-2">
                <span style={{ color: '#F59E0B' }}>•</span>
                <span><strong>Trocando por recompensas.</strong> Acumulou? Pergunta no atendimento o que dá pra trocar.</span>
              </li>
            </ul>
          </div>

          {/* Histórico — só mostra ganhos que ainda valem.
              Esconde estornos negativos E os créditos positivos que foram revertidos
              (status do appointment voltou pra cancelled/no_show depois de completed). */}
          {(() => {
            const all = result.transactions || []
            // Soma por (appointment_id, reason). Se ficou 0 (ou negativo), foi revertido.
            const sums = new Map<string, number>()
            for (const t of all) {
              const key = `${t.appointment_id ?? 'null'}:${t.reason}`
              sums.set(key, (sums.get(key) ?? 0) + t.points)
            }
            const positive = all.filter((t) => {
              if (t.points <= 0) return false
              const key = `${t.appointment_id ?? 'null'}:${t.reason}`
              return (sums.get(key) ?? 0) > 0
            })
            if (positive.length === 0) return null
            return (
              <div>
                <p className="text-xs uppercase tracking-wider mb-2 px-1" style={{ color: textMute }}>
                  Últimas movimentações
                </p>
                <div className="space-y-2">
                  {positive.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-xl p-3 flex items-center justify-between"
                      style={{ background: cardBg, border: cardBorder }}
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                          {REASON_LABEL[t.reason] ?? t.reason}
                        </p>
                        <p className="text-xs" style={{ color: textMute }}>
                          {new Date(t.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </p>
                      </div>
                      <p className="text-sm font-bold" style={{ color: '#F59E0B' }}>
                        +{t.points} pts
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}
