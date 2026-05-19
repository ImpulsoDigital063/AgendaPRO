'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  customerId: string
  initialPreferredContact: string | null
  initialMarketingConsent: boolean
  initialBlocked: boolean
  initialBlockedReason: string | null
  onSaved: () => void
}

const CONTACT_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp', desc: 'Prefere lembretes via WhatsApp' },
  { value: 'sms', label: 'SMS', desc: 'Prefere SMS tradicional' },
  { value: 'email', label: 'Email', desc: 'Prefere email' },
  { value: 'none', label: 'Não receber', desc: 'Cliente pediu pra não receber' },
]

export default function ConfigClienteTab({
  customerId,
  initialPreferredContact,
  initialMarketingConsent,
  initialBlocked,
  initialBlockedReason,
  onSaved,
}: Props) {
  const router = useRouter()
  const [preferred, setPreferred] = useState(initialPreferredContact ?? '')
  const [marketing, setMarketing] = useState(initialMarketingConsent)
  const [blocked, setBlocked] = useState(initialBlocked)
  const [blockedReason, setBlockedReason] = useState(initialBlockedReason ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  async function save() {
    setSubmitting(true)
    setError(null)
    const res = await fetch(`/api/admin/customers/${customerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        preferred_contact: preferred || null,
        marketing_consent: marketing,
        blocked,
        blocked_reason: blocked ? blockedReason.trim() || null : null,
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'falha')
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
    onSaved()
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{
          background: 'color-mix(in srgb, var(--admin-danger,#EF4444) 14%, transparent)',
          color: 'var(--admin-danger,#EF4444)',
        }}>
          Erro: {error}
        </p>
      )}

      {/* Preferência de contato */}
      <div className="rounded-2xl p-5" style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
      }}>
        <h3 className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-mute)' }}>
          Preferência de Contato
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--admin-text-faded)' }}>
          Como esse cliente prefere receber lembretes
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CONTACT_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer"
              style={{
                background: preferred === opt.value ? 'color-mix(in srgb, var(--admin-accent) 12%, transparent)' : 'var(--admin-surface-hi)',
                border: `1.5px solid ${preferred === opt.value ? 'var(--admin-accent)' : 'transparent'}`,
              }}
            >
              <input
                type="radio"
                checked={preferred === opt.value}
                onChange={() => setPreferred(opt.value)}
                disabled={submitting}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                  {opt.label}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
                  {opt.desc}
                </p>
              </div>
            </label>
          ))}
        </div>
        {preferred && (
          <button
            type="button"
            onClick={() => setPreferred('')}
            disabled={submitting}
            className="text-[11px] mt-3 underline"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            Limpar preferência
          </button>
        )}
      </div>

      {/* Marketing */}
      <div className="rounded-2xl p-5" style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
      }}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)}
            disabled={submitting}
            className="mt-1 w-4 h-4 cursor-pointer"
          />
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
              Aceita receber promoções e campanhas
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
              Quando desmarcado, esse cliente é EXCLUÍDO de envios de campanha, cupons e promoções em massa.
              Lembretes individuais de agendamento continuam sendo enviados normalmente.
            </p>
          </div>
        </label>
      </div>

      {/* Bloquear cliente */}
      <div className="rounded-2xl p-5" style={{
        background: blocked ? 'color-mix(in srgb, var(--admin-danger,#EF4444) 8%, var(--admin-surface))' : 'var(--admin-surface)',
        border: `1px solid ${blocked ? 'color-mix(in srgb, var(--admin-danger,#EF4444) 40%, transparent)' : 'var(--admin-border)'}`,
      }}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={blocked}
            onChange={(e) => setBlocked(e.target.checked)}
            disabled={submitting}
            className="mt-1 w-4 h-4 cursor-pointer"
          />
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: blocked ? 'var(--admin-danger,#EF4444)' : 'var(--admin-text)' }}>
              🚫 Cliente Bloqueado
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
              Quando marcado, esse cliente NÃO pode mais agendar (a recepção vê alerta ao tentar).
              Use pra clientes com histórico de faltas, comportamento ruim ou inadimplência.
            </p>
          </div>
        </label>

        {blocked && (
          <div className="mt-4">
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
              Motivo do Bloqueio (interno · não aparece pro cliente)
            </label>
            <textarea
              value={blockedReason}
              onChange={(e) => setBlockedReason(e.target.value)}
              disabled={submitting}
              rows={2}
              className="admin-input w-full px-3 py-2 text-sm"
              placeholder="Ex: 3 no-show seguidos · pagamento pendente · comportamento inadequado"
            />
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex justify-end gap-2">
        {savedFlash && (
          <p className="text-xs px-3 py-2 rounded-lg self-center" style={{
            background: 'color-mix(in srgb, #10B981 14%, transparent)',
            color: '#10B981',
          }}>
            ✓ Salvo
          </p>
        )}
        <button
          type="button"
          onClick={save}
          disabled={submitting}
          className="px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider disabled:opacity-50"
          style={{ background: 'var(--admin-accent)', color: '#fff' }}
        >
          {submitting ? 'Salvando…' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  )
}
