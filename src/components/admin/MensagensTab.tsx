'use client'

import { useEffect, useRef, useState } from 'react'
import { IconWhatsapp, IconCheck } from '@/components/ui/Icon'
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

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/messages')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        setConfirmation(d.confirmation || '')
        setReminder(d.reminder || '')
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
    const next = val.slice(0, start) + token + val.slice(end)
    set(next)
    // recoloca o cursor depois do token inserido
    requestAnimationFrame(() => {
      if (el) {
        el.focus()
        const pos = start + token.length
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
      setConfirmation(d.confirmation || '')
      setReminder(d.reminder || '')
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
      <div className="admin-card rounded-2xl p-6 animate-pulse">
        <div className="h-5 w-40 rounded mb-4" style={{ background: 'var(--admin-input-bg)' }} />
        <div className="h-28 rounded" style={{ background: 'var(--admin-input-bg)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--admin-text)' }}>Mensagens de WhatsApp</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--admin-text-mute)' }}>
          Edite o texto que aparece quando você toca em <strong>Confirmar</strong> ou <strong>Lembrete</strong> no
          atendimento. O WhatsApp abre com a mensagem pronta — você só envia.
        </p>
      </div>

      {error && (
        <div className="rounded-xl px-3 py-2 text-sm" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}>
          {error}
        </div>
      )}

      <MessageEditor
        title="Mensagem de confirmação"
        hint="Enviada quando você confirma o agendamento com o cliente."
        value={confirmation}
        onChange={setConfirmation}
        textareaRef={confirmRef}
        onInsert={(t) => insertVar('confirmation', t)}
        onReset={() => setConfirmation(DEFAULT_CONFIRMATION_TEMPLATE)}
        preview={renderTemplate(confirmation || DEFAULT_CONFIRMATION_TEMPLATE, pv)}
      />

      <MessageEditor
        title="Mensagem de lembrete"
        hint="Enviada pra lembrar o cliente do horário (botão de WhatsApp no card)."
        value={reminder}
        onChange={setReminder}
        textareaRef={reminderRef}
        onInsert={(t) => insertVar('reminder', t)}
        onReset={() => setReminder(DEFAULT_REMINDER_TEMPLATE)}
        preview={renderTemplate(reminder || DEFAULT_REMINDER_TEMPLATE, pv)}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 disabled:opacity-50"
          style={{ background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)', color: '#fff' }}
        >
          {saved ? <><IconCheck size={16} /> Salvo</> : saving ? 'Salvando…' : 'Salvar mensagens'}
        </button>
        {saved && <span className="text-sm" style={{ color: '#059669' }}>Mensagens atualizadas.</span>}
      </div>
    </div>
  )
}

function MessageEditor({
  title, hint, value, onChange, textareaRef, onInsert, onReset, preview,
}: {
  title: string
  hint: string
  value: string
  onChange: (v: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onInsert: (token: string) => void
  onReset: () => void
  preview: string
}) {
  return (
    <div className="admin-card rounded-2xl p-4 sm:p-5 space-y-3">
      <div>
        <h3 className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{title}</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>{hint}</p>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Escreva a mensagem… use as variáveis abaixo."
        className="w-full rounded-xl p-3 text-sm resize-y"
        style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] mr-1" style={{ color: 'var(--admin-text-faded)' }}>Inserir:</span>
        {TEMPLATE_VARIABLES.map((v) => (
          <button
            key={v.token}
            type="button"
            onClick={() => onInsert(v.token)}
            title={v.label}
            className="text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors"
            style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.30)', color: '#2563EB' }}
          >
            {v.token}
          </button>
        ))}
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] font-semibold px-2 py-1 rounded-lg ml-auto"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          Restaurar padrão
        </button>
      </div>

      {/* Preview */}
      <div className="rounded-xl p-3" style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.25)' }}>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 inline-flex items-center gap-1" style={{ color: '#1A8C45' }}>
          <IconWhatsapp size={12} /> Prévia
        </p>
        <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--admin-text-2)' }}>{preview}</p>
      </div>
    </div>
  )
}
