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
        // Pré-preenche com o texto que está valendo (o personalizado, ou o
        // padrão). Assim o campo nunca abre vazio · a pessoa vê e edita o
        // texto real em vez de começar do zero.
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
    // Garante um espaço antes do trecho inserido se o cursor cola numa palavra.
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
      <div className="admin-card rounded-2xl p-6 animate-pulse max-w-2xl">
        <div className="h-5 w-40 rounded mb-4" style={{ background: 'var(--admin-input-bg)' }} />
        <div className="h-28 rounded" style={{ background: 'var(--admin-input-bg)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--admin-text)' }}>Mensagens de WhatsApp</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--admin-text-mute)' }}>
          Escreva como você quer falar com o cliente. Quando tocar em <strong>Confirmar</strong> ou{' '}
          <strong>Lembrete</strong> no atendimento, o WhatsApp abre com essa mensagem já pronta — é só enviar.
        </p>
      </div>

      {/* Explicação das "chavinhas" · em linguagem simples */}
      <div
        className="rounded-xl p-3 text-sm flex gap-2"
        style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.20)', color: 'var(--admin-text-2)' }}
      >
        <span>💡</span>
        <p>
          Toque nas etiquetas pra inserir os dados do cliente no texto. O sistema troca sozinho na hora de
          enviar — por exemplo, <strong>Nome do cliente</strong> vira o nome real de quem agendou.
        </p>
      </div>

      {error && (
        <div className="rounded-xl px-3 py-2 text-sm" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}>
          {error}
        </div>
      )}

      <MessageEditor
        title="Mensagem de confirmação"
        hint="Pra confirmar o horário com o cliente."
        value={confirmation}
        onChange={setConfirmation}
        textareaRef={confirmRef}
        onInsert={(t) => insertVar('confirmation', t)}
        onReset={() => setConfirmation(DEFAULT_CONFIRMATION_TEMPLATE)}
        preview={renderTemplate(confirmation || DEFAULT_CONFIRMATION_TEMPLATE, pv)}
      />

      <MessageEditor
        title="Mensagem de lembrete"
        hint="Pra lembrar o cliente perto do dia do atendimento."
        value={reminder}
        onChange={setReminder}
        textareaRef={reminderRef}
        onInsert={(t) => insertVar('reminder', t)}
        onReset={() => setReminder(DEFAULT_REMINDER_TEMPLATE)}
        preview={renderTemplate(reminder || DEFAULT_REMINDER_TEMPLATE, pv)}
      />

      <div className="sticky bottom-0 py-3 -mx-1 px-1 flex items-center gap-3" style={{ background: 'linear-gradient(to top, var(--admin-bg) 60%, transparent)' }}>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-5 py-3 rounded-xl text-sm font-bold inline-flex items-center gap-2 disabled:opacity-50"
          style={{ background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)', color: '#fff' }}
        >
          {saved ? <><IconCheck size={16} /> Salvo</> : saving ? 'Salvando…' : 'Salvar mensagens'}
        </button>
        {saved && <span className="text-sm font-medium" style={{ color: '#059669' }}>Tudo certo, mensagens atualizadas.</span>}
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
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{title}</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>{hint}</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] font-semibold px-2 py-1 rounded-lg flex-shrink-0"
          style={{ color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }}
        >
          Voltar ao texto padrão
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Escreva a mensagem…"
        className="w-full rounded-xl p-3 text-sm resize-y leading-relaxed"
        style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
      />

      <div>
        <p className="text-[11px] mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>Toque pra inserir no texto:</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {TEMPLATE_VARIABLES.map((v) => (
            <button
              key={v.token}
              type="button"
              onClick={() => onInsert(v.token)}
              className="text-[12px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors active:scale-[0.97]"
              style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.30)', color: '#2563EB' }}
            >
              + {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preview · como o cliente recebe */}
      <div className="rounded-xl p-3" style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.25)' }}>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 inline-flex items-center gap-1" style={{ color: '#1A8C45' }}>
          <IconWhatsapp size={12} /> Como o cliente recebe
        </p>
        <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>{preview}</p>
      </div>
    </div>
  )
}
