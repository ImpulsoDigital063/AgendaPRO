'use client'

import { useEffect, useRef, useState } from 'react'
import { IconWhatsapp, IconCheck, IconClose } from '@/components/ui/Icon'
import {
  TEMPLATE_VARIABLES,
  renderTemplate,
  DEFAULT_CONFIRMATION_TEMPLATE,
  DEFAULT_REMINDER_TEMPLATE,
  type TemplateVars,
} from '@/lib/message-templates'

type Props = { businessName: string }

const PREVIEW_VARS = (negocio: string): TemplateVars => ({
  cliente: 'Maria Silva',
  servico: 'Corte + Escova',
  data: '19/06/2026',
  hora: '14:30',
  negocio: negocio || 'Seu Negócio',
  profissional: 'Ana',
})

type Kind = 'confirmation' | 'reminder'

export default function MensagensTab({ businessName }: Props) {
  const [confirmation, setConfirmation] = useState('')
  const [reminder, setReminder] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmRef = useRef<HTMLTextAreaElement>(null)
  const reminderRef = useRef<HTMLTextAreaElement>(null)

  // Dica de onboarding: mostra uma vez, o adm lê, fecha no X e não volta mais.
  const [showTip, setShowTip] = useState(false)
  useEffect(() => {
    try { if (localStorage.getItem('ap_msg_tip_dismissed') !== '1') setShowTip(true) } catch { setShowTip(true) }
  }, [])
  function dismissTip() {
    setShowTip(false)
    try { localStorage.setItem('ap_msg_tip_dismissed', '1') } catch { /* ok */ }
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/messages')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        setConfirmation(d.confirmation || d.defaults?.confirmation || DEFAULT_CONFIRMATION_TEMPLATE)
        setReminder(d.reminder || d.defaults?.reminder || DEFAULT_REMINDER_TEMPLATE)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) { setError('Erro ao carregar mensagens.'); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [])

  function insertVar(kind: Kind, token: string) {
    const ref = kind === 'confirmation' ? confirmRef : reminderRef
    const val = kind === 'confirmation' ? confirmation : reminder
    const set = kind === 'confirmation' ? setConfirmation : setReminder
    const el = ref.current
    const start = el?.selectionStart ?? val.length
    const end = el?.selectionEnd ?? val.length
    const needsSpace = start > 0 && !/\s$/.test(val.slice(0, start))
    const insert = (needsSpace ? ' ' : '') + token
    const next = val.slice(0, start) + insert + val.slice(end)
    set(next)
    requestAnimationFrame(() => {
      if (el) {
        el.focus()
        const pos = start + insert.length
        el.setSelectionRange(pos, pos)
      }
    })
  }

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirmation, reminder }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Erro ao salvar.'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Erro de conexão.')
    } finally {
      setSaving(false)
    }
  }

  const pv = PREVIEW_VARS(businessName)

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="admin-card rounded-2xl p-5 animate-pulse">
            <div className="h-4 w-40 rounded mb-4" style={{ background: 'var(--admin-input-bg)' }} />
            <div className="h-24 rounded-xl" style={{ background: 'var(--admin-input-bg)' }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-start gap-3">
        <span
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(180deg, #25D366 0%, #1A8C45 100%)', color: '#fff', boxShadow: '0 8px 20px -8px rgba(26,140,69,0.6)' }}
        >
          <IconWhatsapp size={22} />
        </span>
        <div>
          <h2 className="text-lg font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>Mensagens de WhatsApp</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
            Escreva como você fala com o cliente. No atendimento, o WhatsApp abre com a mensagem pronta — é só enviar.
          </p>
        </div>
      </div>

      {/* Dica das variáveis · dispensável (mostra uma vez) */}
      {showTip && (
        <div
          className="rounded-2xl p-3.5 flex gap-2.5 text-sm"
          style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)', color: 'var(--admin-text-2)' }}
        >
          <span className="text-base leading-none">💡</span>
          <p className="leading-snug flex-1">
            Toque nas <strong>etiquetas azuis</strong> pra inserir os dados do cliente. O sistema preenche sozinho na
            hora de enviar — <strong>Nome do cliente</strong> vira o nome real de quem agendou.
          </p>
          <button
            type="button"
            onClick={dismissTip}
            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[rgba(59,130,246,0.12)]"
            style={{ color: 'var(--admin-text-mute)' }}
            aria-label="Fechar dica"
          >
            <IconClose size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl px-3 py-2.5 text-sm" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}>
          {error}
        </div>
      )}

      <MessageEditor
        title="Mensagem de lembrete"
        badge="Você envia na mão"
        hint="A que abre quando você toca em Enviar WhatsApp / Lembrete."
        value={reminder}
        onChange={setReminder}
        textareaRef={reminderRef}
        onInsert={(t) => insertVar('reminder', t)}
        onReset={() => setReminder(DEFAULT_REMINDER_TEMPLATE)}
        preview={renderTemplate(reminder || DEFAULT_REMINDER_TEMPLATE, pv)}
        businessName={businessName}
      />

      <MessageEditor
        title="Mensagem de confirmação"
        badge="Envio automático (em breve)"
        hint="Vai ser enviada sozinha quando o WhatsApp automático estiver ligado."
        value={confirmation}
        onChange={setConfirmation}
        textareaRef={confirmRef}
        onInsert={(t) => insertVar('confirmation', t)}
        onReset={() => setConfirmation(DEFAULT_CONFIRMATION_TEMPLATE)}
        preview={renderTemplate(confirmation || DEFAULT_CONFIRMATION_TEMPLATE, pv)}
        businessName={businessName}
      />

      {/* Salvar */}
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50 transition-transform active:scale-[0.98]"
        style={{ background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)', color: '#fff', boxShadow: '0 10px 24px -10px rgba(5,150,105,0.6)' }}
      >
        {saved ? <><IconCheck size={16} /> Salvo!</> : saving ? 'Salvando…' : 'Salvar mensagens'}
      </button>
    </div>
  )
}

function MessageEditor({
  title, badge, hint, value, onChange, textareaRef, onInsert, onReset, preview, businessName,
}: {
  title: string
  badge: string
  hint: string
  value: string
  onChange: (v: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onInsert: (token: string) => void
  onReset: () => void
  preview: string
  businessName: string
}) {
  return (
    <div className="admin-card rounded-2xl overflow-hidden">
      {/* Header do card */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[15px] font-bold" style={{ color: 'var(--admin-text)' }}>{title}</h3>
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }}>
              {badge}
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-faded)' }}>{hint}</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg flex-shrink-0 transition-colors hover:bg-[var(--admin-input-bg)]"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          Padrão
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Campo de texto */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>
            Texto da mensagem
          </label>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Escreva a mensagem…"
            className="w-full rounded-xl px-3.5 py-3 text-sm leading-relaxed resize-y outline-none transition-shadow focus:ring-2"
            style={{ background: 'var(--admin-input-bg)', border: '1.5px solid var(--admin-border)', color: 'var(--admin-text)', minHeight: 92 }}
          />
        </div>

        {/* Etiquetas */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>Inserir dados do cliente</p>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATE_VARIABLES.map((v) => (
              <button
                key={v.token}
                type="button"
                onClick={() => onInsert(v.token)}
                className="text-[12px] font-semibold px-2.5 py-1.5 rounded-lg transition-transform active:scale-[0.96]"
                style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.28)', color: '#2563EB' }}
              >
                + {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preview · balão de WhatsApp */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 inline-flex items-center gap-1.5" style={{ color: 'var(--admin-text-faded)' }}>
            <IconWhatsapp size={12} /> Como o cliente recebe
          </p>
          <div
            className="rounded-xl p-3"
            style={{
              background: '#E7DED4',
              backgroundImage: 'radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px)',
              backgroundSize: '14px 14px',
            }}
          >
            <div
              className="inline-block max-w-[90%] px-3 py-2 text-sm leading-relaxed"
              style={{
                background: '#FFFFFF',
                color: '#111B21',
                borderRadius: '12px',
                borderTopLeftRadius: '4px',
                boxShadow: '0 1px 1.5px rgba(0,0,0,0.15)',
              }}
            >
              <span className="text-[11px] font-bold block mb-0.5" style={{ color: '#1A8C45' }}>{businessName}</span>
              <span className="whitespace-pre-wrap">{preview}</span>
              <span className="block text-right text-[10px] mt-1" style={{ color: '#8696A0' }}>agora ✓✓</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
