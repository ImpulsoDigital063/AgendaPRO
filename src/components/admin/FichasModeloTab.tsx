'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconPlus, IconTrash } from '@/components/ui/Icon'

type FieldDef = {
  name: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox'
  required?: boolean
  options?: string[]
}

type Template = {
  id: string
  name: string
  description: string | null
  fields: FieldDef[]
  created_at: string
}

const TYPE_LABELS: Record<string, string> = {
  text: 'Texto curto',
  textarea: 'Texto longo',
  number: 'Número',
  date: 'Data',
  select: 'Lista (selecione 1)',
  checkbox: 'Sim/Não',
}

const PRESETS = [
  {
    name: 'Anamnese · Esmalteria',
    description: 'Histórico de saúde das unhas',
    fields: [
      { name: 'alergias', label: 'Tem alergia a algum produto?', type: 'textarea' as const, required: false },
      { name: 'problemas', label: 'Problemas nas unhas (micose, ressecamento, fragilidade)', type: 'textarea' as const },
      { name: 'frequencia', label: 'Frequência ideal de manutenção', type: 'select' as const, options: ['Semanal', 'Quinzenal', 'Mensal', 'Eventual'] },
      { name: 'preferencia_comprimento', label: 'Preferência de comprimento', type: 'select' as const, options: ['Curtas', 'Médias', 'Longas'] },
      { name: 'usa_esmalte_em_gel', label: 'Aceita esmalte em gel?', type: 'checkbox' as const },
    ],
  },
  {
    name: 'Ficha de Spa dos Pés',
    description: 'Avaliação inicial dos pés',
    fields: [
      { name: 'diabetes', label: 'Diabético?', type: 'checkbox' as const },
      { name: 'circulacao', label: 'Problemas de circulação?', type: 'textarea' as const },
      { name: 'observacoes', label: 'Observações gerais', type: 'textarea' as const },
    ],
  },
]

export default function FichasModeloTab() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formFields, setFormFields] = useState<FieldDef[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/form-templates')
    if (res.ok) {
      const j = await res.json()
      setTemplates(j.templates ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function startNew() {
    setFormName('')
    setFormDesc('')
    setFormFields([{ name: '', label: '', type: 'text', required: false }])
    setCreating(true)
    setError(null)
  }

  function loadPreset(idx: number) {
    const p = PRESETS[idx]
    setFormName(p.name)
    setFormDesc(p.description)
    setFormFields(p.fields.map((f) => ({ ...f })))
    setCreating(true)
    setError(null)
  }

  function addField() {
    setFormFields((p) => [...p, { name: '', label: '', type: 'text', required: false }])
  }

  function updateField(idx: number, patch: Partial<FieldDef>) {
    setFormFields((p) => p.map((f, i) => (i === idx ? { ...f, ...patch } : f)))
  }

  function removeField(idx: number) {
    setFormFields((p) => p.filter((_, i) => i !== idx))
  }

  async function save() {
    if (!formName.trim() || formFields.length === 0) {
      setError('Nome e ao menos 1 campo são obrigatórios')
      return
    }
    if (formFields.some((f) => !f.label.trim())) {
      setError('Todo campo precisa de rótulo')
      return
    }
    setSubmitting(true)
    setError(null)
    const res = await fetch('/api/admin/form-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formName.trim(),
        description: formDesc.trim() || null,
        fields: formFields,
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'falha')
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    setCreating(false)
    await load()
    router.refresh()
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Desativar essa ficha modelo? Respostas anteriores ficam preservadas.')) return
    const res = await fetch(`/api/admin/form-templates?templateId=${id}`, { method: 'DELETE' })
    if (res.ok) {
      await load()
      router.refresh()
    }
  }

  if (creating) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
            Nova Ficha Modelo
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={save}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              {submitting ? 'Salvando…' : 'Salvar Modelo'}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-xs px-3 py-2 rounded-lg" style={{
            background: 'color-mix(in srgb, var(--admin-danger,#EF4444) 14%, transparent)',
            color: 'var(--admin-danger,#EF4444)',
          }}>
            {error}
          </p>
        )}

        <div className="rounded-2xl p-5 space-y-3" style={{
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
        }}>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
              Nome do modelo *
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ex: Anamnese · Ficha Técnica · Cadastro de Reação"
              className="admin-input w-full px-3 py-2 text-sm"
              disabled={submitting}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
              Descrição (opcional)
            </label>
            <input
              type="text"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Pra quê serve essa ficha"
              className="admin-input w-full px-3 py-2 text-sm"
              disabled={submitting}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
              Campos ({formFields.length})
            </h4>
            <button
              type="button"
              onClick={addField}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider"
              style={{
                background: 'var(--admin-surface)',
                color: 'var(--admin-accent)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <IconPlus size={12} /> Campo
            </button>
          </div>

          <div className="space-y-2">
            {formFields.map((f, idx) => (
              <div key={idx} className="rounded-xl p-4 space-y-2" style={{
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
              }}>
                <div className="flex items-start gap-2">
                  <input
                    type="text"
                    value={f.label}
                    onChange={(e) => updateField(idx, { label: e.target.value })}
                    placeholder="Rótulo do campo"
                    className="admin-input flex-1 px-3 py-2 text-sm"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => removeField(idx)}
                    aria-label="Remover"
                    className="p-2 rounded-lg"
                    style={{ color: 'var(--admin-danger,#EF4444)' }}
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={f.type}
                    onChange={(e) => updateField(idx, { type: e.target.value as FieldDef['type'] })}
                    className="admin-input px-3 py-2 text-sm"
                    disabled={submitting}
                  >
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--admin-text)' }}>
                    <input
                      type="checkbox"
                      checked={!!f.required}
                      onChange={(e) => updateField(idx, { required: e.target.checked })}
                      disabled={submitting}
                    />
                    Obrigatório
                  </label>
                </div>
                {f.type === 'select' && (
                  <input
                    type="text"
                    value={(f.options ?? []).join(', ')}
                    onChange={(e) => updateField(idx, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                    placeholder="Opções separadas por vírgula (ex: Curto, Médio, Longo)"
                    className="admin-input w-full px-3 py-2 text-sm"
                    disabled={submitting}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
          {templates.length} {templates.length === 1 ? 'modelo cadastrado' : 'modelos cadastrados'}
        </p>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider"
          style={{ background: 'var(--admin-accent)', color: '#fff' }}
        >
          <IconPlus size={14} /> Nova Ficha Modelo
        </button>
      </div>

      {/* Presets sugeridos */}
      {templates.length === 0 && !loading && (
        <div className="rounded-2xl p-5" style={{
          background: 'var(--admin-surface)',
          border: '1px dashed var(--admin-border)',
        }}>
          <p className="text-sm font-bold mb-2" style={{ color: 'var(--admin-text)' }}>
            Comece rápido com um modelo pronto
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {PRESETS.map((p, idx) => (
              <button
                key={p.name}
                type="button"
                onClick={() => loadPreset(idx)}
                className="text-left p-3 rounded-xl"
                style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-divider)' }}
              >
                <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{p.name}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>{p.description}</p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
                  {p.fields.length} campos · click pra abrir
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-sm py-10" style={{ color: 'var(--admin-text-mute)' }}>
          Carregando…
        </p>
      ) : templates.length === 0 ? null : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="rounded-2xl p-4 flex items-center gap-3" style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
            }}>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{t.name}</p>
                {t.description && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>{t.description}</p>
                )}
                <p className="text-[10px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
                  {t.fields.length} {t.fields.length === 1 ? 'campo' : 'campos'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => deleteTemplate(t.id)}
                aria-label="Desativar"
                className="p-1.5 rounded-lg"
                style={{ color: 'var(--admin-danger,#EF4444)' }}
              >
                <IconTrash size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
