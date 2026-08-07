'use client'

import { useEffect, useRef, useState } from 'react'
import { IconWhatsapp, IconCheck, IconClose } from '@/components/ui/Icon'
import MensagensAutomaticasCard from './MensagensAutomaticasCard'
import {
  TEMPLATE_VARIABLES,
  renderTemplate,
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

export default function MensagensTab({ businessName }: Props) {
  const [reminder, setReminder] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        setReminder(d.reminder || d.defaults?.reminder || DEFAULT_REMINDER_TEMPLATE)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) { setError('Erro ao carregar a mensagem.'); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [])

  function insertVar(token: string) {
    const el = reminderRef.current
    // Só usa o cursor se o campo estiver REALMENTE focado. Sem isso, clicar um
    // chip com o campo desfocado caía em selectionStart=0 → variável grudava no
    // COMEÇO da mensagem (template corrompido "{cliente}{negocio}...Oi..." ·
    // Barbearia Guia Lopes 07/07). Desfocado = insere no fim.
    const focused = !!el && typeof document !== 'undefined' && document.activeElement === el
    const start = focused ? (el!.selectionStart ?? reminder.length) : reminder.length
    const end = focused ? (el!.selectionEnd ?? reminder.length) : reminder.length
    const needsSpace = start > 0 && !/\s$/.test(reminder.slice(0, start))
    const insert = (needsSpace ? ' ' : '') + token
    const next = reminder.slice(0, start) + insert + reminder.slice(end)
    setReminder(next)
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
        body: JSON.stringify({ reminder }),
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
  const preview = renderTemplate(reminder || DEFAULT_REMINDER_TEMPLATE, pv)

  if (loading) {
    return (
      <div className="max-w-2xl">
        <div className="admin-card rounded-2xl p-5 animate-pulse">
          <div className="h-4 w-40 rounded mb-4" style={{ background: 'var(--admin-input-bg)' }} />
          <div className="h-24 rounded-xl" style={{ background: 'var(--admin-input-bg)' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* O que o sistema manda SOZINHO vem primeiro: e a novidade e o que a
          dona liga uma vez e esquece. O editor de texto abaixo continua
          servindo pro que ela manda na mao. */}
      <MensagensAutomaticasCard />

      <div className="h-px" style={{ background: 'var(--admin-border)' }} />

      {/* Cabeçalho */}
      <div className="flex items-start gap-3">
        <span
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(180deg, #25D366 0%, #1A8C45 100%)', color: '#fff', boxShadow: '0 8px 20px -8px rgba(26,140,69,0.6)' }}
        >
          <IconWhatsapp size={22} />
        </span>
        <div>
          <h2 className="text-lg font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>Mensagem de WhatsApp</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
            Quando você tocar em <strong>Enviar WhatsApp</strong> (ou <strong>Lembrete</strong> no card), o WhatsApp abre com essa mensagem pronta — é só enviar.
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

      {/* Editor */}
      <div className="admin-card rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
          <h3 className="text-[15px] font-bold" style={{ color: 'var(--admin-text)' }}>Texto da mensagem</h3>
          <button
            type="button"
            onClick={() => setReminder(DEFAULT_REMINDER_TEMPLATE)}
            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg flex-shrink-0 transition-colors hover:bg-[var(--admin-input-bg)]"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            Voltar ao padrão
          </button>
        </div>

        <div className="p-4 space-y-3">
          <textarea
            ref={reminderRef}
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Escreva a mensagem…"
            className="w-full rounded-xl px-3.5 py-3 text-sm leading-relaxed resize-y outline-none transition-shadow focus:ring-2"
            style={{ background: 'var(--admin-input-bg)', border: '1.5px solid var(--admin-border)', color: 'var(--admin-text)', minHeight: 92 }}
          />

          {/* Etiquetas */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>Inserir dados do cliente</p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.token}
                  type="button"
                  onClick={() => insertVar(v.token)}
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

      {/* Salvar */}
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50 transition-transform active:scale-[0.98]"
        style={{ background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)', color: '#fff', boxShadow: '0 10px 24px -10px rgba(5,150,105,0.6)' }}
      >
        {saved ? <><IconCheck size={16} /> Salvo!</> : saving ? 'Salvando…' : 'Salvar mensagem'}
      </button>
    </div>
  )
}
