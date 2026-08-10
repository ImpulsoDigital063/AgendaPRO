'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IconPlus, IconTrash, IconCheck } from '@/components/ui/Icon'
import DrawCanvas from './DrawCanvas'
import FichaDedicada, { type FichaValues } from './FichaDedicada'
import type { MarcaPdf } from './useFichaPdf'
import { NICHE_FICHAS } from '@/lib/fichas/registry'
import { fichasDisponiveis } from '@/lib/fichas/disponiveis'
import type { NicheFicha } from '@/lib/fichas/types'

type FieldDef = {
  name: string
  label: string
  type: 'text' | 'textarea' | 'freetext' | 'number' | 'date' | 'select' | 'checkbox' | 'checklist' | 'draw'
  required?: boolean
  options?: string[]
}

type Template = {
  id: string
  name: string
  description: string | null
  fields: FieldDef[]
}

type Response = {
  id: string
  template_id: string | null
  data: Record<string, unknown>
  created_at: string
  niche_slug?: string | null
  template?: Template
}

type Props = {
  customerId: string
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
}

export default function FichasTab({ customerId }: Props) {
  const router = useRouter()
  // A aba de fichas abre dentro do drawer do atendimento, que a profissional
  // usa. Os links pra Configurações → Fichas Modelo são rota de dona: pra ela
  // viram texto simples, senão é convite pra sair da própria área (30/07).
  const ehAreaProfissional = usePathname().startsWith('/profissional')
  const [templates, setTemplates] = useState<Template[]>([])
  const [responses, setResponses] = useState<Response[]>([])
  const [customer, setCustomer] = useState<{ name: string; phone: string | null; birthday: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [formData, setFormData] = useState<Record<string, string | boolean | number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nicheState, setNicheState] = useState<{ ficha: NicheFicha; responseId: string | null; initialValues?: FichaValues } | null>(null)
  const [businessCategory, setBusinessCategory] = useState<string | null>(null)
  const [businessSlug, setBusinessSlug] = useState<string | null>(null)
  const [marca, setMarca] = useState<MarcaPdf | undefined>(undefined)
  const [nicheEnabled, setNicheEnabled] = useState<string[] | null>(null) // null = todas
  const [fichaImagens, setFichaImagens] = useState<Record<string, string> | null>(null)

  async function load() {
    setLoading(true)
    const sb = createClient()
    const [tplRes, respRes, custRes] = await Promise.all([
      sb.from('client_form_templates').select('*').eq('active', true).order('name'),
      sb
        .from('client_form_responses')
        .select('id, template_id, data, created_at, niche_slug, template:client_form_templates(id, name, fields)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false }),
      sb.from('customers').select('name, phone, birthday, business:businesses(slug, name, phone, address, brand_primary, brand_logo_url, ficha_rodape, description, category, enabled_niche_fichas, ficha_imagens)').eq('id', customerId).maybeSingle(),
    ])
    type BizRow = { slug: string | null; name: string | null; phone: string | null; address: string | null; brand_primary: string | null; brand_logo_url: string | null; ficha_rodape: { linha?: string; nota?: string } | null; description: string | null; category: string | null; enabled_niche_fichas: string[] | null; ficha_imagens: Record<string, string> | null }
    const custRow = custRes.data as { name: string; phone: string | null; birthday: string | null; business?: BizRow | BizRow[] | null } | null
    setCustomer(custRow ? { name: custRow.name, phone: custRow.phone, birthday: custRow.birthday } : null)
    const biz = Array.isArray(custRow?.business) ? custRow?.business[0] : custRow?.business
    setBusinessCategory(biz?.category ?? biz?.description ?? null)
    setBusinessSlug(biz?.slug ?? null)
    setMarca({
      nome: biz?.name ?? null,
      logoUrl: biz?.brand_logo_url ?? null,
      corPrimaria: biz?.brand_primary ?? null,
      telefone: biz?.phone ?? null,
      endereco: biz?.address ?? null,
      rodapeLinha: biz?.ficha_rodape?.linha ?? null,
      rodapeNota: biz?.ficha_rodape?.nota ?? null,
    })
    setNicheEnabled(biz?.enabled_niche_fichas ?? null)
    setFichaImagens(biz?.ficha_imagens ?? null)
    setTemplates((tplRes.data ?? []) as Template[])
    setResponses(
      ((respRes.data ?? []) as unknown as Array<{
        id: string
        template_id: string | null
        data: Record<string, unknown>
        created_at: string
        niche_slug: string | null
        template: Template | Template[] | null
      }>).map((r) => ({
        ...r,
        template: Array.isArray(r.template) ? r.template[0] : r.template ?? undefined,
      })),
    )
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  function openTemplate(t: Template) {
    setEditingTemplate(t)
    setFormData({})
    setPickerOpen(false)
  }

  async function saveResponse() {
    if (!editingTemplate) return
    // Valida required
    for (const f of editingTemplate.fields) {
      if (f.required) {
        const v = formData[f.name]
        if (v === undefined || v === null || v === '' || (typeof v === 'boolean' && f.type === 'checkbox' && !v && false)) {
          // só bloqueia se for de fato vazio (checkbox false é válido)
          if (f.type !== 'checkbox') {
            setError(`O campo "${f.label}" é obrigatório`)
            return
          }
        }
      }
    }
    setSubmitting(true)
    setError(null)
    const res = await fetch(`/api/admin/customers/${customerId}/form-responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: editingTemplate.id,
        data: formData,
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'falha')
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    setEditingTemplate(null)
    setFormData({})
    await load()
    router.refresh()
  }

  async function removeResponse(responseId: string) {
    if (!confirm('Remover essa ficha preenchida?')) return
    const res = await fetch(`/api/admin/customers/${customerId}/form-responses?responseId=${responseId}`, { method: 'DELETE' })
    if (res.ok) {
      await load()
      router.refresh()
    }
  }

  // ── Fichas de nicho (dedicadas · ex.: cílios) ──────────────────────
  async function saveNiche(values: FichaValues, opts?: { assinar?: boolean }) {
    if (!nicheState) return
    setSubmitting(true)
    setError(null)
    const res = await fetch(`/api/admin/customers/${customerId}/niche-ficha`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nicheSlug: nicheState.ficha.slug, values, responseId: nicheState.responseId, assinar: opts?.assinar === true }),
    })
    setSubmitting(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'falha ao salvar')
      return
    }
    setNicheState(null)
    await load()
    router.refresh()
  }

  async function removeNiche(responseId: string) {
    if (!confirm('Remover essa ficha preenchida?')) return
    const res = await fetch(`/api/admin/customers/${customerId}/niche-ficha?responseId=${responseId}`, { method: 'DELETE' })
    if (res.ok) {
      await load()
      router.refresh()
    }
  }

  // Ficha de nicho aberta (preencher/editar) — tela dedicada
  if (nicheState) {
    return (
      <FichaDedicada
        fichaImagens={fichaImagens}
        marca={marca}
        ficha={nicheState.ficha}
        customer={customer}
        initialValues={nicheState.initialValues}
        saving={submitting}
        error={error}
        onSave={saveNiche}
        onCancel={() => { setNicheState(null); setError(null) }}
      />
    )
  }

  const identHeader = customer ? (
    <div className="rounded-xl px-3 py-2 flex items-center gap-2 flex-wrap" style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}>
      <span className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{customer.name}</span>
      {customer.phone && <span className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>{customer.phone}</span>}
      {customer.birthday && <span className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>· nasc. {new Date(customer.birthday + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
    </div>
  ) : null

  /* Fichas de nicho disponíveis pra ESTE negócio. A regra de visibilidade
     (segmento + exclusividade por negócio) vive em lib/fichas/disponiveis.ts
     e é a MESMA que a rota usa — antes estava duplicada aqui, e regra de
     visibilidade duplicada é ficha aparecendo num lugar e sumindo no outro.
     Aqui sobra só o filtro do que o dono ligou:
     nicheEnabled null = todas as disponíveis; array = só as escolhidas. */
  const availableNiches = fichasDisponiveis({ categoria: businessCategory, slug: businessSlug })
    .filter((nf) => nicheEnabled === null || nicheEnabled.includes(nf.slug))

  // FORM ATIVO
  if (editingTemplate) {
    return (
      <div className="space-y-4">
        {identHeader}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
              {editingTemplate.name}
            </h3>
            {editingTemplate.description && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                {editingTemplate.description}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingTemplate(null)
                setFormData({})
                setError(null)
              }}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={saveResponse}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              {submitting ? 'Salvando…' : 'Salvar Ficha'}
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

        <div className="rounded-2xl p-5 space-y-4" style={{
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
        }}>
          {editingTemplate.fields.map((f) => (
            <FieldInput
              key={f.name}
              field={f}
              value={formData[f.name]}
              onChange={(v) => setFormData((p) => ({ ...p, [f.name]: v }))}
              disabled={submitting}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {identHeader}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
          {responses.length} {responses.length === 1 ? 'ficha' : 'fichas'} preenchida{responses.length === 1 ? '' : 's'}
        </p>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider"
          style={{ background: 'var(--admin-accent)', color: '#fff' }}
        >
          <IconPlus size={14} /> Adicionar Ficha
        </button>
      </div>

      {loading ? (
        <p className="text-center text-sm py-10" style={{ color: 'var(--admin-text-mute)' }}>
          Carregando…
        </p>
      ) : responses.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: 'var(--admin-surface)', border: '1px dashed var(--admin-border)' }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
            Nenhuma ficha foi adicionada
          </p>
          <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
            Fichas são modelos cadastrados em{' '}
            {ehAreaProfissional ? (
              <strong style={{ color: 'var(--admin-text-2)' }}>Configurações → Fichas Modelo</strong>
            ) : (
              <Link href="/admin/configuracoes?tab=fichas-modelo" className="underline" style={{ color: 'var(--admin-accent)' }}>Configurações → Fichas Modelo</Link>
            )}{' '}
            (anamnese · ficha técnica · etc) que você aplica no cliente e preenche aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {responses.map((r) => r.niche_slug && NICHE_FICHAS[r.niche_slug] ? (
            <div
              key={r.id}
              className="rounded-2xl p-4 flex items-center justify-between gap-3"
              style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
            >
              <div className="min-w-0">
                <h4 className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{NICHE_FICHAS[r.niche_slug].name}</h4>
                <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>Preenchida em {formatDate(r.created_at)}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button type="button" onClick={() => setNicheState({ ficha: NICHE_FICHAS[r.niche_slug!], responseId: r.id, initialValues: r.data as FichaValues })} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'var(--admin-surface-hi)', color: 'var(--admin-accent)', border: '1px solid var(--admin-border)' }}>Abrir / Editar</button>
                <button type="button" onClick={() => removeNiche(r.id)} aria-label="Remover" className="p-1.5 rounded-lg" style={{ color: 'var(--admin-danger,#EF4444)' }}><IconTrash size={14} /></button>
              </div>
            </div>
          ) : (
            <div
              key={r.id}
              className="rounded-2xl p-4"
              style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
                    {r.template?.name ?? 'Ficha'}
                  </h4>
                  <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
                    Preenchida em {formatDate(r.created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeResponse(r.id)}
                  aria-label="Remover"
                  className="p-1.5 rounded-lg"
                  style={{ color: 'var(--admin-danger,#EF4444)' }}
                >
                  <IconTrash size={14} />
                </button>
              </div>
              <dl className="space-y-2">
                {r.template?.fields.map((f) => {
                  const v = r.data[f.name]
                  if (v === undefined || v === null || v === '') return null
                  return (
                    <div key={f.name}>
                      <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                        {f.label}
                      </dt>
                      {f.type === 'draw' && typeof v === 'string' && v.startsWith('data:image') ? (
                        <dd className="mt-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={v}
                            alt={f.label}
                            className="w-full rounded-xl"
                            style={{ border: '1px solid var(--admin-border)', background: '#fff' }}
                          />
                        </dd>
                      ) : (
                        <dd
                          className="text-sm"
                          style={{ color: 'var(--admin-text)', whiteSpace: f.type === 'freetext' ? 'pre-wrap' : 'normal' }}
                        >
                          {f.type === 'checklist'
                            ? String(v).split('||').filter(Boolean).join(' · ')
                            : typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : String(v)}
                        </dd>
                      )}
                    </div>
                  )
                })}
              </dl>
            </div>
          ))}
        </div>
      )}

      {/* Picker de templates */}
      {pickerOpen && createPortal(
        <div className="fixed inset-0 z-[150]" role="dialog" aria-modal="true">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setPickerOpen(false)} />
          <div
            className="absolute rounded-2xl p-5"
            style={{
              top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              background: 'var(--admin-popover-bg, #FFFFFF)', border: '1px solid var(--admin-popover-border, #E2E8F0)',
              minWidth: 360, maxWidth: 480, maxHeight: '80vh', overflowY: 'auto',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            }}
          >
            <h3 className="text-base font-bold mb-3" style={{ color: 'var(--admin-text)' }}>
              Selecione uma ficha
            </h3>
            {availableNiches.length > 0 && (
              <div className="space-y-2 mb-3">
                {availableNiches.map((nf) => (
                  <button
                    key={nf.slug}
                    type="button"
                    onClick={() => { setNicheState({ ficha: nf, responseId: null }); setPickerOpen(false); setError(null) }}
                    className="w-full text-left p-3 rounded-xl"
                    style={{ background: 'color-mix(in srgb, var(--admin-accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--admin-accent) 30%, transparent)' }}
                  >
                    <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{nf.name}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>Ficha dedicada · layout próprio (mapeamento + assinatura)</p>
                  </button>
                ))}
              </div>
            )}
            {templates.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
                {ehAreaProfissional ? (
                  <>Nenhuma ficha pré-cadastrada foi encontrada. Peça pra administração cadastrar em Configurações → Fichas Modelo.</>
                ) : (
                  <>Nenhuma ficha pré-cadastrada foi encontrada. Entre em <Link href="/admin/configuracoes?tab=fichas-modelo" className="underline" style={{ color: 'var(--admin-accent)' }}>Configurações → Fichas Modelo</Link> e cadastre uma.</>
                )}
              </p>
            ) : (
              <div className="space-y-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openTemplate(t)}
                    className="w-full text-left p-3 rounded-xl"
                    style={{
                      background: 'var(--admin-surface-hi)',
                      border: '1px solid var(--admin-divider)',
                    }}
                  >
                    <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{t.name}</p>
                    {t.description && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                        {t.description}
                      </p>
                    )}
                    <p className="text-[10px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
                      {t.fields.length} {t.fields.length === 1 ? 'campo' : 'campos'}
                    </p>
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="w-full mt-3 py-2 text-xs font-semibold"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              Cancelar
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function FieldInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FieldDef
  value: string | boolean | number | undefined
  onChange: (v: string | boolean | number) => void
  disabled?: boolean
}) {
  const id = `f-${field.name}`
  return (
    <div>
      <label htmlFor={id} className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
        {field.label}
        {field.required && <span style={{ color: 'var(--admin-danger,#EF4444)' }}> *</span>}
      </label>
      {field.type === 'textarea' && (
        <textarea
          id={id}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={3}
          className="admin-input w-full px-3 py-2 text-sm"
        />
      )}
      {field.type === 'freetext' && (
        <textarea
          id={id}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={8}
          placeholder="Escreva à vontade…"
          className="admin-input w-full px-3 py-2 text-sm"
        />
      )}
      {field.type === 'draw' && (
        <DrawCanvas
          value={typeof value === 'string' ? value : undefined}
          onChange={onChange}
          disabled={disabled}
          background={field.name === 'mapeamento' || /mapeamento/i.test(field.label) ? 'eyes' : 'blank'}
        />
      )}
      {field.type === 'checklist' && (
        <div className="grid grid-cols-2 gap-1.5">
          {(field.options ?? []).map((opt) => {
            const sel = String((value as string) ?? '').split('||').filter(Boolean)
            const on = sel.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                disabled={disabled}
                onClick={() => onChange((on ? sel.filter((s) => s !== opt) : [...sel, opt]).join('||'))}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-colors"
                style={{
                  background: on ? 'color-mix(in srgb, var(--admin-accent) 14%, transparent)' : 'var(--admin-surface)',
                  border: `1px solid ${on ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                  color: 'var(--admin-text)',
                }}
              >
                <span
                  className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                  style={{ border: `1.5px solid ${on ? 'var(--admin-accent)' : 'var(--admin-border)'}`, background: on ? 'var(--admin-accent)' : 'transparent', color: '#fff' }}
                >
                  {on && <IconCheck size={11} />}
                </span>
                <span className="leading-tight">{opt}</span>
              </button>
            )
          })}
        </div>
      )}
      {(field.type === 'text' || field.type === 'number') && (
        <input
          id={id}
          type={field.type === 'number' ? 'number' : 'text'}
          value={(value as string | number) ?? ''}
          onChange={(e) => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
          disabled={disabled}
          className="admin-input w-full px-3 py-2 text-sm"
        />
      )}
      {field.type === 'date' && (
        <input
          id={id}
          type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="admin-input w-full px-3 py-2 text-sm tabular-nums"
        />
      )}
      {field.type === 'select' && (
        <select
          id={id}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="admin-input w-full px-3 py-2 text-sm"
        >
          <option value="">—</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      )}
      {field.type === 'checkbox' && (
        <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--admin-text)' }}>
          <input
            id={id}
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
          />
          Sim
        </label>
      )}
    </div>
  )
}
