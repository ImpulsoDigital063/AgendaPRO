'use client'

/**
 * FichaDedicada · renderiza uma ficha de nicho (config em src/lib/fichas) no
 * LAYOUT FIXO estilo papel. O conteúdo (perguntas/opções/termo) vem da config;
 * a estrutura é cravada aqui.
 *
 * Responsivo (AGENTS.md · isolamento mobile/desktop via breakpoint):
 *  - Saúde: grade 2 colunas nos dois.
 *  - Mapping: empilha no mobile (olhos em cima, params embaixo) e fica lado a
 *    lado no desktop (lg:flex-row).
 *
 * Saúde é "marcar o que se aplica" (marca só os Sim) — mesma info do Sim/Não do
 * papel, bem mais rápido de tocar. Trocável se o Eduardo quiser Sim/Não.
 */

import { useState } from 'react'
import type { NicheFicha, FichaParam } from '@/lib/fichas/types'
import DrawCanvas from './DrawCanvas'
import { IconCheck } from '@/components/ui/Icon'

export type FichaValues = Record<string, string | string[] | boolean>

type Props = {
  ficha: NicheFicha
  customer: { name: string; phone: string | null; birthday: string | null } | null
  initialValues?: FichaValues
  saving?: boolean
  onSave: (values: FichaValues) => void | Promise<void>
  onCancel: () => void
}

const SECTION_TITLE = 'text-[11px] font-bold uppercase tracking-wider pb-1 mb-3'
const FIELD_LABEL = 'text-[10px] font-bold uppercase tracking-wider block mb-1'

function ParamInput({
  param,
  value,
  onChange,
  disabled,
}: {
  param: FichaParam
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div>
      <label className={FIELD_LABEL} style={{ color: 'var(--admin-text-faded)' }}>{param.label}</label>
      {param.type === 'select' ? (
        <select className="admin-input w-full px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
          <option value="">—</option>
          {(param.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : param.type === 'textarea' ? (
        <textarea className="admin-input w-full px-3 py-2 text-sm" rows={3} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      ) : (
        <input type="text" className="admin-input w-full px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      )}
    </div>
  )
}

export default function FichaDedicada({ ficha, customer, initialValues, saving, onSave, onCancel }: Props) {
  const [values, setValues] = useState<FichaValues>(initialValues ?? {})
  const setVal = (k: string, v: FichaValues[string]) => setValues((p) => ({ ...p, [k]: v }))
  const str = (k: string) => (typeof values[k] === 'string' ? (values[k] as string) : '')

  return (
    <div className="space-y-4">
      {/* Ações */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>{ficha.name}</h3>
        <div className="flex gap-2 flex-shrink-0">
          <button type="button" onClick={onCancel} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Cancelar</button>
          <button type="button" onClick={() => onSave(values)} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50" style={{ background: 'var(--admin-accent)', color: '#fff' }}>{saving ? 'Salvando…' : 'Salvar Ficha'}</button>
        </div>
      </div>

      {/* Identificação (do cadastro) */}
      {customer && (
        <div className="rounded-xl px-3 py-2 flex items-center gap-2 flex-wrap" style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}>
          <span className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{customer.name}</span>
          {customer.phone && <span className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>{customer.phone}</span>}
          {customer.birthday && <span className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>· nasc. {new Date(customer.birthday + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
        </div>
      )}

      {/* Folha */}
      <div className="rounded-2xl p-4 lg:p-6 space-y-6" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
        {ficha.sections.map((section, idx) => {
          if (section.kind === 'health') {
            const marked = Array.isArray(values[section.title]) ? (values[section.title] as string[]) : []
            return (
              <section key={idx}>
                <h4 className={SECTION_TITLE} style={{ color: 'var(--admin-text)', borderBottom: '1px solid var(--admin-border)' }}>{section.title}</h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {section.items.map((item) => {
                    const on = marked.includes(item)
                    return (
                      <button key={item} type="button" disabled={saving}
                        onClick={() => setVal(section.title, on ? marked.filter((m) => m !== item) : [...marked, item])}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[11px] leading-tight transition-colors"
                        style={{ background: on ? 'color-mix(in srgb, var(--admin-accent) 14%, transparent)' : 'var(--admin-surface-hi)', border: `1px solid ${on ? 'var(--admin-accent)' : 'var(--admin-border)'}`, color: 'var(--admin-text)' }}>
                        <span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0" style={{ border: `1.5px solid ${on ? 'var(--admin-accent)' : 'var(--admin-border)'}`, background: on ? 'var(--admin-accent)' : 'transparent', color: '#fff' }}>{on && <IconCheck size={11} />}</span>
                        <span>{item}</span>
                      </button>
                    )
                  })}
                </div>
                {section.detailLabel && (
                  <div className="mt-3">
                    <label className={FIELD_LABEL} style={{ color: 'var(--admin-text-faded)' }}>{section.detailLabel}</label>
                    <textarea className="admin-input w-full px-3 py-2 text-sm" rows={2} value={str('saude_detalhe')} onChange={(e) => setVal('saude_detalhe', e.target.value)} disabled={saving} />
                  </div>
                )}
              </section>
            )
          }
          if (section.kind === 'mapping') {
            return (
              <section key={idx}>
                <h4 className={SECTION_TITLE} style={{ color: 'var(--admin-text)', borderBottom: '1px solid var(--admin-border)' }}>{section.title}</h4>
                {/* mobile: empilha · desktop: olhos + params lado a lado */}
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="lg:flex-[1.4] min-w-0">
                    <DrawCanvas background="eyes" value={str(section.drawName)} onChange={(v) => setVal(section.drawName, v)} disabled={saving} />
                  </div>
                  <div className="lg:flex-1 space-y-3">
                    {section.params.map((p) => (
                      <ParamInput key={p.name} param={p} value={str(p.name)} onChange={(v) => setVal(p.name, v)} disabled={saving} />
                    ))}
                  </div>
                </div>
              </section>
            )
          }
          if (section.kind === 'fields') {
            return (
              <section key={idx}>
                <h4 className={SECTION_TITLE} style={{ color: 'var(--admin-text)', borderBottom: '1px solid var(--admin-border)' }}>{section.title}</h4>
                <div className="space-y-3">
                  {section.fields.map((p) => (
                    <ParamInput key={p.name} param={p} value={str(p.name)} onChange={(v) => setVal(p.name, v)} disabled={saving} />
                  ))}
                </div>
              </section>
            )
          }
          if (section.kind === 'term') {
            return (
              <section key={idx}>
                <h4 className={SECTION_TITLE} style={{ color: 'var(--admin-text)', borderBottom: '1px solid var(--admin-border)' }}>{section.title}</h4>
                <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--admin-text-mute)' }}>{section.text}</p>
                <div className="space-y-2">
                  {section.consents.map((c) => (
                    <label key={c.name} className="flex items-start gap-2 cursor-pointer text-sm" style={{ color: 'var(--admin-text)' }}>
                      <input type="checkbox" className="mt-0.5" checked={values[c.name] === true} onChange={(e) => setVal(c.name, e.target.checked)} disabled={saving} />
                      <span>{c.label}{c.required && <span style={{ color: 'var(--admin-danger,#EF4444)' }}> *</span>}</span>
                    </label>
                  ))}
                </div>
              </section>
            )
          }
          // signature
          return (
            <section key={idx}>
              <h4 className={SECTION_TITLE} style={{ color: 'var(--admin-text)', borderBottom: '1px solid var(--admin-border)' }}>{section.label}</h4>
              <div className="max-w-sm">
                <DrawCanvas value={str(section.name)} onChange={(v) => setVal(section.name, v)} disabled={saving} />
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
