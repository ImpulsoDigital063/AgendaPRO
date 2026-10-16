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

import { useMemo, useState } from 'react'
import type { NicheFicha, FichaParam } from '@/lib/fichas/types'
import DrawCanvas from './DrawCanvas'
import { IconCheck, IconWhatsapp } from '@/components/ui/Icon'
import { downloadFichaPdf, shareFichaPdf, imprimirFichaPdf, type MarcaPdf } from './useFichaPdf'
import { chaveDetalheSaude } from '@/lib/fichas/chaves'
import { maskPhone } from '@/lib/client-display'

export type FichaValues = Record<string, string | string[] | boolean>

type Props = {
  ficha: NicheFicha
  customer: { name: string; phone: string | null; birthday: string | null } | null
  initialValues?: FichaValues
  saving?: boolean
  error?: string | null
  /* `assinar` separa rascunho de ato assinado: o servidor só carimba hash e
     data quando vem true, e a partir daí o banco recusa alteração. */
  onSave: (values: FichaValues, opts?: { assinar?: boolean }) => void | Promise<void>
  onCancel: () => void
  /* Marca do negócio pro PDF/impressão (logo, cor, rodapé). Vem do cadastro
     dele — a tela não decide nada de identidade visual. */
  marca?: MarcaPdf
  /* Prévia do modelo (Configurações → Fichas Modelo): dá pra preencher e
     gerar PDF pra ver como sai, mas nada é salvo nem assinado. */
  modelo?: boolean
  /* A própria cliente preenchendo pelo link (v157, página /ficha/[token]):
     só o botão de assinar e enviar — sem PDF, sem rascunho, sem cancelar. */
  cliente?: boolean
  /* Diagramas do proprio negocio (businesses.ficha_imagens), por chave. Quando
     existe um pra este mapeamento, ele vence o desenho embutido: e o mesmo
     desenho que a clinica ja usa no papel, nao uma imitacao nossa. */
  fichaImagens?: Record<string, string> | null
}

const SECTION_TITLE = 'text-[11px] font-bold uppercase tracking-wider pb-1 mb-3'
const FIELD_LABEL = 'text-[10px] font-bold uppercase tracking-wider block mb-1'
/* Na página da CLIENTE (/ficha/[token]) a pergunta é o conteúdo, não um
   rótulo: em 10px maiúsculo e cinza claro ela era difícil de ler no celular
   (auditoria visual 15/10). Lá vira texto normal, maior e escuro. */
const FIELD_LABEL_CLIENTE = 'text-[15px] leading-snug font-medium block mb-1.5'

function ParamInput({
  param,
  value,
  onChange,
  disabled,
  leitura,
}: {
  param: FichaParam
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  /** Página da cliente: pergunta em texto legível. */
  leitura?: boolean
}) {
  return (
    <div>
      <label className={leitura ? FIELD_LABEL_CLIENTE : FIELD_LABEL} style={{ color: leitura ? 'var(--admin-text)' : 'var(--admin-text-faded)' }}>{param.label}</label>
      {param.type === 'select' ? (
        <select className="admin-input w-full px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
          <option value="">{leitura ? 'Selecione' : '—'}</option>
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

export default function FichaDedicada({ ficha, customer, initialValues, saving, error, onSave, onCancel, fichaImagens, marca, modelo, cliente }: Props) {
  const [values, setValues] = useState<FichaValues>(initialValues ?? {})
  const [pdfBusy, setPdfBusy] = useState(false)
  const setVal = (k: string, v: FichaValues[string]) => setValues((p) => ({ ...p, [k]: v }))
  const str = (k: string) => (typeof values[k] === 'string' ? (values[k] as string) : '')

  async function onExport() {
    setPdfBusy(true)
    try { await downloadFichaPdf({ ficha, values, customer, marca }) } finally { setPdfBusy(false) }
  }
  async function onImprimir() {
    setPdfBusy(true)
    try { await imprimirFichaPdf({ ficha, values, customer, marca }) } finally { setPdfBusy(false) }
  }
  async function onSend() {
    setPdfBusy(true)
    const text = `Olá ${customer?.name ?? ''}, segue a sua ficha. Qualquer dúvida, estou à disposição.`
    try { await shareFichaPdf({ ficha, values, customer, text, marca }) } finally { setPdfBusy(false) }
  }

  /* O que a ficha exige pra poder ser assinada: os aceites marcados como
     obrigatórios na config e o campo de assinatura preenchido. Sai da própria
     ficha em vez de ficar hard-coded aqui — cada protocolo tem os seus. */
  const exigencias = useMemo(() => {
    const consents: { name: string; label: string }[] = []
    let assinaturaNome: string | null = null
    for (const s of ficha.sections) {
      if (s.kind === 'term') for (const c of s.consents) if (c.required) consents.push(c)
      if (s.kind === 'signature') assinaturaNome = s.name
    }
    return { consents, assinaturaNome }
  }, [ficha])

  const [aviso, setAviso] = useState<string | null>(null)

  function onAssinar() {
    const faltando = exigencias.consents.filter((c) => values[c.name] !== true)
    if (faltando.length) {
      setAviso(`Falta marcar: ${faltando.map((c) => c.label).join(' · ')}`)
      return
    }
    if (exigencias.assinaturaNome && !str(exigencias.assinaturaNome)) {
      setAviso(cliente ? 'Falta a sua assinatura, no final da ficha.' : 'A assinatura do paciente ainda está em branco.')
      return
    }
    /* Confirmação explícita porque é o ponto sem volta: daqui pra frente uma
       correção não edita, cria versão nova apontando pra esta. */
    if (!confirm(cliente
      ? 'Confere se está tudo certo? Depois de enviar, a ficha não pode mais ser alterada por aqui.\n\nAssinar e enviar?'
      : 'Depois de assinada, esta ficha não pode mais ser alterada. Uma correção vira uma versão nova, e as duas ficam no histórico.\n\nConfirma a assinatura?')) return
    setAviso(null)
    onSave(values, { assinar: true })
  }

  return (
    <div className="space-y-4">
      {/* Ações */}
      {/* flex-wrap: no celular o nome da ficha quebrava em duas linhas
          espremido entre Cancelar e Salvar (auditoria 15/10). Agora, se não
          couber, os botões descem pra linha de baixo. */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <h3 className="text-base font-bold min-w-0" style={{ color: 'var(--admin-text)' }}>{ficha.name}</h3>
        {!cliente && <div className="flex gap-2 flex-shrink-0">
          <button type="button" onClick={onCancel} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>{modelo ? 'Fechar' : 'Cancelar'}</button>
          {!modelo && <button type="button" onClick={() => onSave(values)} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50" style={{ background: 'var(--admin-accent)', color: '#fff' }}>{saving ? 'Salvando…' : 'Salvar Ficha'}</button>}
        </div>}
      </div>

      {/* Identificação (do cadastro) */}
      {customer && (
        <div className="rounded-xl px-3 py-2 flex items-center gap-2 flex-wrap" style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}>
          <span className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{customer.name}</span>
          {customer.phone && <span className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>{maskPhone(customer.phone)}</span>}
          {customer.birthday && <span className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>· nasc. {new Date(customer.birthday + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
        </div>
      )}

      {error && (
        <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'color-mix(in srgb, var(--admin-danger,#EF4444) 12%, transparent)', color: 'var(--admin-danger,#EF4444)' }}>{error}</div>
      )}

      {/* Folha */}
      <div className="rounded-2xl p-4 lg:p-6 space-y-6" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
        {ficha.sections.map((section, idx) => {
          if (section.kind === 'health') {
            const marked = Array.isArray(values[section.title]) ? (values[section.title] as string[]) : []
            return (
              <section key={idx}>
                <h4 className={SECTION_TITLE} style={{ color: 'var(--admin-text)', borderBottom: '1px solid var(--admin-border)' }}>{section.title}</h4>
                {/* 2 colunas no mobile (não mexer) · 3 de tablet pra cima:
                    checklist de saúde com 30 itens em 2 colunas vira rolagem
                    longa numa tela larga, com metade da linha vazia. */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
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
                    <label className={cliente ? FIELD_LABEL_CLIENTE : FIELD_LABEL} style={{ color: cliente ? 'var(--admin-text)' : 'var(--admin-text-faded)' }}>{section.detailLabel}</label>
                    <textarea className="admin-input w-full px-3 py-2 text-sm" rows={2} value={str(chaveDetalheSaude(ficha, section))} onChange={(e) => setVal(chaveDetalheSaude(ficha, section), e.target.value)} disabled={saving} />
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
                    <DrawCanvas
                      background={section.background ?? 'eyes'}
                      backgroundUrl={section.imagemChave ? fichaImagens?.[section.imagemChave] ?? null : null}
                      value={str(section.drawName)} onChange={(v) => setVal(section.drawName, v)} disabled={saving} />
                  </div>
                  {/* Muitos parametros CURTOS viram grade, nao coluna. A ficha de
                      toxina tem 16 musculos com uma unidade cada; empilhados em
                      coluna unica davam um corredor de rolagem do tamanho da
                      tela inteira, com um campo de 4 caracteres por linha
                      (visto no print de 08/08). Ate 6 parametros segue em
                      coluna, que e o caso das fichas antigas de cilios. */}
                  <div
                    className={
                      section.params.length > 6
                        ? 'lg:flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-x-3 gap-y-2'
                        : 'lg:flex-1 space-y-3'
                    }
                  >
                    {section.params.map((p) => (
                      <ParamInput leitura={cliente} key={p.name} param={p} value={str(p.name)} onChange={(v) => setVal(p.name, v)} disabled={saving} />
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
                {/* Mobile empilha (não mexer). De tablet pra cima vira grade —
                    mas SÓ quando não há textarea no bloco: campo de texto longo
                    espremido em meia largura é pior que empilhado. Blocos de
                    perimetria e unidades, que são vários campos curtos, é onde
                    a grade paga. */}
                <div
                  className={
                    section.fields.length > 3 && section.fields.every((f) => f.type !== 'textarea')
                      ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-3'
                      : 'space-y-3'
                  }
                >
                  {section.fields.map((p) => (
                    <ParamInput leitura={cliente} key={p.name} param={p} value={str(p.name)} onChange={(v) => setVal(p.name, v)} disabled={saving} />
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
              {/* Assinatura acompanha a largura disponível: no desktop a
                  pessoa assina com o mouse ou caneta, e um campo de 384px é
                  apertado pra isso. No mobile segue igual. */}
              <div className="max-w-sm md:max-w-md xl:max-w-lg">
                <DrawCanvas value={str(section.name)} onChange={(v) => setVal(section.name, v)} disabled={saving} />
              </div>
            </section>
          )
        })}
      </div>

      {aviso && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ color: 'var(--admin-danger,#EF4444)', background: 'rgba(239,68,68,.08)' }}>{aviso}</p>
      )}

      {/* Ações no rodapé · pra não precisar rolar de volta pro topo depois de assinar.
          Separado em dois grupos: à esquerda o que gera documento (PDF/envio),
          à direita o que decide o destino da ficha. Sem a separação vira uma
          fileira de cinco botões iguais e a profissional erra no toque. */}
      {cliente ? (
        <button type="button" onClick={onAssinar} disabled={saving} className="w-full py-3.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: 'var(--admin-accent)', color: '#fff' }}>
          <IconCheck size={16} /> {saving ? 'Enviando…' : 'Assinar e enviar'}
        </button>
      ) : (
      <div className="flex items-center justify-between gap-2 pb-2 flex-wrap">
        <div className="flex gap-2">
          <button type="button" onClick={onImprimir} disabled={pdfBusy} className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50" style={{ color: 'var(--admin-text)', border: '1px solid var(--admin-border)' }}>{pdfBusy ? '…' : 'Imprimir'}</button>
          <button type="button" onClick={onExport} disabled={pdfBusy} className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50" style={{ color: 'var(--admin-text)', border: '1px solid var(--admin-border)' }}>{pdfBusy ? '…' : 'PDF'}</button>
          {!modelo && <button type="button" onClick={onSend} disabled={pdfBusy} className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 disabled:opacity-50" style={{ background: '#25D366', color: '#fff' }}><IconWhatsapp size={14} /> Enviar</button>}
        </div>
        <div className="flex gap-2 items-center">
          <button type="button" onClick={onCancel} disabled={saving} className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>{modelo ? 'Fechar' : 'Cancelar'}</button>
          {/* Só ficha com campo de assinatura pode ser fechada. As outras (ex.:
              evolução livre) continuam só salvando. */}
          {modelo ? null : exigencias.assinaturaNome ? (
            <>
              <button type="button" onClick={() => onSave(values)} disabled={saving} className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50" style={{ color: 'var(--admin-text)', border: '1px solid var(--admin-border)' }}>{saving ? '…' : 'Salvar'}</button>
              <button type="button" onClick={onAssinar} disabled={saving} className="px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 disabled:opacity-50" style={{ background: 'var(--admin-accent)', color: '#fff' }}><IconCheck size={14} /> {saving ? 'Salvando…' : 'Assinar e fechar'}</button>
            </>
          ) : (
            <button type="button" onClick={() => onSave(values)} disabled={saving} className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50" style={{ background: 'var(--admin-accent)', color: '#fff' }}>{saving ? 'Salvando…' : 'Salvar Ficha'}</button>
          )}
        </div>
      </div>
      )}
    </div>
  )
}
