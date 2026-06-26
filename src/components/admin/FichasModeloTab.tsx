'use client'

/**
 * FichasModeloTab · Palace V2 (29/05/2026)
 *
 * Tab "Fichas Modelo" do Marko/Luana em /admin/configuracoes.
 * Templates de anamnese / atendimento / termo / avaliação que ficam
 * disponíveis pra anexar no perfil de cada cliente no drawer.
 *
 * V2 cravado por Eduardo "surpreenda" enquanto ele estava fora:
 *   · 6 presets premium curados pra esmalteria/spa Macaé (era 2 simples)
 *   · CRUD completo: editar template existente (era só criar + deletar)
 *   · Duplicar template (cópia editável)
 *   · Reordenar campos (botões ↑↓)
 *   · Helper text opcional por campo (instrução pra quem preenche)
 *   · Visual SaaS premium · empty state · ícones inline · estado salvo
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconPlus, IconTrash, IconPencil, IconCheck, IconClose, IconChevronDown } from '@/components/ui/Icon'

type FieldDef = {
  name: string
  label: string
  type: 'text' | 'textarea' | 'freetext' | 'number' | 'date' | 'select' | 'checkbox' | 'draw'
  required?: boolean
  options?: string[]
  helper?: string
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
  freetext: 'Folha em branco (escrever solto)',
  number: 'Número',
  date: 'Data',
  select: 'Lista (1 opção)',
  checkbox: 'Sim/Não',
  draw: 'Mapeamento (desenho)',
}

// ═════════════════════════════════════════════════════════════════════
// 6 PRESETS PREMIUM CURADOS PRA ESMALTERIA/SPA · PALACE
// Substitui os 2 simples antigos. Eduardo cravou "surpreenda".
// ═════════════════════════════════════════════════════════════════════
type Preset = {
  category: 'Anamnese' | 'Spa' | 'Termo' | 'VIP' | 'Sessão' | 'Avaliação' | 'Design'
  name: string
  description: string
  fields: FieldDef[]
}

const PRESETS: Preset[] = [
  {
    category: 'Design',
    name: 'Lash Design · Mapeamento de Cílios',
    description: 'Design de cílios · mapeamento fio a fio no desenho + curvatura, espessura e comprimento · larga o caderno de papel',
    fields: [
      { name: 'efeito', label: 'Efeito / técnica', type: 'select', options: ['Clássico (fio a fio)', 'Volume Brasileiro', 'Volume Russo', 'Egípcio / Gatinho', 'Híbrido', 'Fox Eyes', 'Outro'] },
      { name: 'curvatura', label: 'Curvatura', type: 'text', helper: 'Ex: C · D · L · M · CC' },
      { name: 'espessura', label: 'Espessura', type: 'text', helper: 'Ex: 0.05 · 0.07 · 0.10 · 0.15' },
      { name: 'comprimento', label: 'Comprimento (mm)', type: 'text', helper: 'Faixa usada · ex: 8 a 12mm' },
      { name: 'mapeamento', label: 'Mapeamento dos cílios', type: 'draw', helper: 'Risque o mapa fio a fio · curvatura e tamanho por zona do olho' },
      { name: 'cola_lote', label: 'Cola / lote usado', type: 'text', helper: 'Marca e lote · rastreio em caso de reação' },
      { name: 'sensibilidade', label: 'Sensibilidade / alergia / olho sensível', type: 'textarea', helper: 'Histórico de reação · usa lente de contato · etc' },
      { name: 'observacoes', label: 'Observações livres', type: 'freetext' },
      { name: 'termo_ciencia', label: 'Cliente ciente dos cuidados pós e possíveis reações', type: 'checkbox', required: true },
    ],
  },
  {
    category: 'Anamnese',
    name: 'Anamnese Completa · Esmalteria',
    description: 'Ficha de saúde inicial · primeira visita da cliente · obrigatória pra procedimentos invasivos',
    fields: [
      { name: 'data_nascimento', label: 'Data de nascimento', type: 'date' },
      { name: 'telefone_emergencia', label: 'Telefone de emergência', type: 'text', helper: 'Contato pra acionar em caso de reação' },
      { name: 'diabetes', label: 'Diabética?', type: 'checkbox', helper: 'Cicatrização diferenciada · cuidado redobrado' },
      { name: 'gravida', label: 'Grávida ou amamentando?', type: 'checkbox', helper: 'Restringe certos produtos' },
      { name: 'anticoagulante', label: 'Faz uso de anticoagulante?', type: 'checkbox' },
      { name: 'alergias_produto', label: 'Alergias a produto / esmalte / acetona', type: 'textarea', helper: 'Anote marcas e reações específicas' },
      { name: 'doencas_pele', label: 'Doenças de pele (micose · psoríase · dermatite)', type: 'textarea' },
      { name: 'cirurgias_recentes', label: 'Cirurgias recentes (últimos 6 meses)', type: 'textarea' },
      { name: 'roi_unhas', label: 'Rói as unhas?', type: 'checkbox' },
      { name: 'frequencia_ideal', label: 'Frequência ideal de manutenção', type: 'select', options: ['Semanal', 'Quinzenal', '3 em 3 semanas', 'Mensal', 'Eventual'] },
      { name: 'observacoes', label: 'Observações gerais', type: 'textarea' },
      { name: 'termo_ciencia', label: 'Cliente declara estar ciente das informações prestadas', type: 'checkbox', required: true },
    ],
  },
  {
    category: 'Spa',
    name: 'Ficha Spa dos Pés Premium',
    description: 'Avaliação podal · diagnóstico inicial + tratamento + recomendações',
    fields: [
      { name: 'diabetes', label: 'Diabética?', type: 'checkbox', helper: 'Atenção redobrada com cortes e cutícula' },
      { name: 'hipertensao', label: 'Hipertensa?', type: 'checkbox' },
      { name: 'circulacao', label: 'Problemas de circulação', type: 'textarea', helper: 'Varizes · inchaço · formigamento' },
      { name: 'joanete', label: 'Tem joanete?', type: 'checkbox' },
      { name: 'unha_encravada', label: 'Unha encravada?', type: 'checkbox' },
      { name: 'calos_calosidades', label: 'Calos e calosidades', type: 'textarea' },
      { name: 'micose', label: 'Suspeita de micose?', type: 'textarea', helper: 'Localização · descrição visual' },
      { name: 'tratamentos_indicados', label: 'Tratamentos a realizar hoje', type: 'textarea' },
      { name: 'recomendacoes_pos', label: 'Recomendações pós-atendimento', type: 'textarea', helper: 'Hidratação · uso de calçado · retorno' },
    ],
  },
  {
    category: 'Termo',
    name: 'Termo de Consentimento · Procedimento',
    description: 'Termo obrigatório pra gel · sistema russo · alongamento · acrigel · procedimento podal invasivo',
    fields: [
      { name: 'procedimento', label: 'Procedimento a realizar', type: 'select', options: ['Esmaltação em gel', 'Sistema russo', 'Alongamento (fibra/gel)', 'Acrigel', 'Remoção podológica', 'Outro'], required: true },
      { name: 'profissional', label: 'Profissional responsável', type: 'text', required: true },
      { name: 'cliente_ciente', label: 'Cliente declara estar ciente dos cuidados e possíveis reações', type: 'checkbox', required: true, helper: 'Sem este aceite, não realizar o procedimento' },
      { name: 'recomendacoes_pos', label: 'Recomendações pós-procedimento', type: 'textarea', helper: 'Não pôr a mão na água por X horas · evitar produto Y · etc' },
      { name: 'assinatura_nome', label: 'Confirmação do cliente (digitar nome completo)', type: 'text', required: true, helper: 'Cliente digita o próprio nome confirmando ciência' },
      { name: 'data_termo', label: 'Data do termo', type: 'date', required: true },
    ],
  },
  {
    category: 'VIP',
    name: 'Ficha VIP · Preferências',
    description: 'Registro de preferências da cliente fidelizada · agiliza atendimentos futuros',
    fields: [
      { name: 'marca_esmalte', label: 'Marca de esmalte preferida', type: 'text', helper: 'Risqué · OPI · Vult · Dailus · etc' },
      { name: 'cor_favorita', label: 'Cor / tom favorito', type: 'text' },
      { name: 'aceita_gel', label: 'Aceita esmaltação em gel?', type: 'checkbox' },
      { name: 'comprimento', label: 'Comprimento ideal', type: 'select', options: ['Curtas', 'Médias', 'Longas'] },
      { name: 'formato', label: 'Formato preferido', type: 'select', options: ['Quadrado', 'Quadrado oval', 'Oval', 'Amêndoa', 'Stiletto', 'Coffin'] },
      { name: 'frequencia_visita', label: 'Frequência de visita', type: 'select', options: ['Semanal', 'Quinzenal', 'Mensal', 'Sob demanda'] },
      { name: 'lembrete_whatsapp', label: 'Pode receber lembrete por WhatsApp?', type: 'checkbox' },
      { name: 'observacoes_especiais', label: 'Preferências especiais', type: 'textarea', helper: 'Bebida favorita · prefere conversar/silêncio · horário ideal · etc' },
    ],
  },
  {
    category: 'Sessão',
    name: 'Ficha de Atendimento · Sessão',
    description: 'Registro por sessão · profissional anota produtos usados e observações pra próximo atendimento',
    fields: [
      { name: 'profissional', label: 'Profissional do dia', type: 'text', required: true },
      { name: 'servico_realizado', label: 'Serviço realizado', type: 'text', required: true },
      { name: 'esmalte_maos', label: 'Esmalte mãos · marca e cor', type: 'text' },
      { name: 'esmalte_pes', label: 'Esmalte pés · marca e cor', type: 'text' },
      { name: 'produtos_extras', label: 'Produtos extras usados', type: 'textarea', helper: 'Base · top coat · hidratante · óleo · etc' },
      { name: 'duracao_real', label: 'Duração real (min)', type: 'number' },
      { name: 'observacoes_sessao', label: 'Observações do atendimento', type: 'textarea', helper: 'Sensibilidade · reação · pedido especial · etc' },
      { name: 'retorno_em_dias', label: 'Indicar retorno em X dias', type: 'number', helper: 'Quanto tempo até manutenção' },
    ],
  },
  {
    category: 'Avaliação',
    name: 'Avaliação Pós-Atendimento',
    description: 'Feedback da cliente · NPS interno · base pra melhoria contínua',
    fields: [
      { name: 'nota_geral', label: 'Nota geral (1 a 5)', type: 'number', required: true, helper: '1 = péssimo · 5 = excelente' },
      { name: 'gostou_mais', label: 'O que mais gostou', type: 'textarea' },
      { name: 'sugestao_melhoria', label: 'Sugestão de melhoria', type: 'textarea', helper: 'Sem julgar · espaço pra cliente abrir' },
      { name: 'recomendaria', label: 'Recomendaria pra amigos?', type: 'checkbox' },
      { name: 'pode_usar_depoimento', label: 'Autoriza usar como depoimento (com primeiro nome)?', type: 'checkbox', helper: 'Privacidade respeitada · só se OK' },
    ],
  },
]

const CATEGORY_COLORS: Record<Preset['category'], string> = {
  Design: '#06B6D4',
  Anamnese: '#3B82F6',
  Spa: '#10B981',
  Termo: '#EF4444',
  VIP: '#A855F7',
  Sessão: '#F59E0B',
  Avaliação: '#EC4899',
}

export default function FichasModeloTab() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
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

  function resetForm() {
    setEditingId(null)
    setFormName('')
    setFormDesc('')
    setFormFields([])
    setError(null)
  }

  function startNew() {
    resetForm()
    setFormFields([{ name: '', label: '', type: 'text', required: false }])
    setCreating(true)
  }

  function loadPreset(preset: Preset) {
    resetForm()
    setFormName(preset.name)
    setFormDesc(preset.description)
    setFormFields(preset.fields.map((f) => ({ ...f })))
    setCreating(true)
  }

  function startEdit(t: Template) {
    resetForm()
    setEditingId(t.id)
    setFormName(t.name)
    setFormDesc(t.description ?? '')
    setFormFields(t.fields.map((f) => ({ ...f })))
    setCreating(true)
  }

  function startDuplicate(t: Template) {
    resetForm()
    setFormName(`${t.name} (cópia)`)
    setFormDesc(t.description ?? '')
    setFormFields(t.fields.map((f) => ({ ...f })))
    setCreating(true)
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

  function moveField(idx: number, dir: -1 | 1) {
    setFormFields((p) => {
      const next = [...p]
      const target = idx + dir
      if (target < 0 || target >= next.length) return p
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
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

    const url = editingId
      ? `/api/admin/form-templates?templateId=${editingId}`
      : '/api/admin/form-templates'
    const method = editingId ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
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
    resetForm()
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

  // ═══════════════════════════════════════════════════════════════════
  // MODO EDITAR/CRIAR
  // ═══════════════════════════════════════════════════════════════════
  if (creating) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
              Configurações
            </p>
            <h3 className="text-lg font-bold" style={{ color: 'var(--admin-text)' }}>
              {editingId ? 'Editar Ficha Modelo' : 'Nova Ficha Modelo'}
            </h3>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => { setCreating(false); resetForm() }}
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
              className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50 inline-flex items-center gap-1.5"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              {submitting ? 'Salvando…' : (editingId ? 'Salvar alterações' : 'Criar modelo')}
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

        {/* Dados básicos */}
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
              placeholder="Ex: Anamnese · Ficha Técnica · Termo"
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

        {/* Campos */}
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
                {/* Linha 1: ↑↓ + rótulo + remover */}
                <div className="flex items-start gap-2">
                  <div className="flex flex-col flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => moveField(idx, -1)}
                      disabled={idx === 0 || submitting}
                      aria-label="Mover pra cima"
                      className="p-1 rounded disabled:opacity-30"
                      style={{ color: 'var(--admin-text-mute)' }}
                    >
                      <IconChevronDown size={12} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveField(idx, 1)}
                      disabled={idx === formFields.length - 1 || submitting}
                      aria-label="Mover pra baixo"
                      className="p-1 rounded disabled:opacity-30"
                      style={{ color: 'var(--admin-text-mute)' }}
                    >
                      <IconChevronDown size={12} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={f.label}
                    onChange={(e) => updateField(idx, { label: e.target.value })}
                    placeholder="Rótulo do campo (ex: Tem alergia?)"
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

                {/* Linha 2: tipo + obrigatório */}
                <div className="grid grid-cols-2 gap-2 pl-7">
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

                {/* Linha 3: opções (só se select) */}
                {f.type === 'select' && (
                  <div className="pl-7">
                    <input
                      type="text"
                      value={(f.options ?? []).join(', ')}
                      onChange={(e) => updateField(idx, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                      placeholder="Opções separadas por vírgula (ex: Curto, Médio, Longo)"
                      className="admin-input w-full px-3 py-2 text-sm"
                      disabled={submitting}
                    />
                  </div>
                )}

                {/* Linha 4: helper text (instrução opcional) */}
                <div className="pl-7">
                  <input
                    type="text"
                    value={f.helper ?? ''}
                    onChange={(e) => updateField(idx, { helper: e.target.value })}
                    placeholder="Instrução pra quem preenche (opcional)"
                    className="admin-input w-full px-3 py-1.5 text-xs"
                    style={{ color: 'var(--admin-text-mute)' }}
                    disabled={submitting}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════
  // MODO LISTA
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
          {loading ? 'Carregando…' : `${templates.length} ${templates.length === 1 ? 'modelo cadastrado' : 'modelos cadastrados'}`}
        </p>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider"
          style={{ background: 'var(--admin-accent)', color: '#fff' }}
        >
          <IconPlus size={14} /> Nova ficha
        </button>
      </div>

      {/* Empty state · 6 presets premium em grid */}
      {!loading && templates.length === 0 && (
        <div className="space-y-3">
          <div className="rounded-2xl p-4" style={{
            background: 'color-mix(in srgb, var(--admin-accent) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--admin-accent) 20%, transparent)',
          }}>
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--admin-text)' }}>
              Comece com um modelo pronto
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
              6 modelos curados pra esmalteria e spa premium. Clique pra abrir, ajustar e salvar.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => loadPreset(p)}
                className="text-left p-4 rounded-2xl transition-all hover:-translate-y-px hover:shadow-md"
                style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      background: `color-mix(in srgb, ${CATEGORY_COLORS[p.category]} 16%, transparent)`,
                      color: CATEGORY_COLORS[p.category],
                    }}
                  >
                    {p.category}
                  </span>
                  <span className="text-[10px] tabular-nums" style={{ color: 'var(--admin-text-faded)' }}>
                    {p.fields.length} campos
                  </span>
                </div>
                <p className="text-sm font-bold mb-1" style={{ color: 'var(--admin-text)' }}>
                  {p.name}
                </p>
                <p className="text-xs leading-snug" style={{ color: 'var(--admin-text-mute)' }}>
                  {p.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl h-20 animate-pulse"
              style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}
            />
          ))}
        </div>
      )}

      {/* Lista de templates cadastrados */}
      {!loading && templates.length > 0 && (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="rounded-2xl p-4 flex items-center gap-3" style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
            }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{t.name}</p>
                {t.description && (
                  <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--admin-text-mute)' }}>{t.description}</p>
                )}
                <p className="text-[10px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
                  {t.fields.length} {t.fields.length === 1 ? 'campo' : 'campos'}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => startEdit(t)}
                  aria-label="Editar"
                  title="Editar modelo"
                  className="p-2 rounded-lg transition-colors hover:bg-[color:var(--admin-surface-hi)]"
                  style={{ color: 'var(--admin-text-mute)' }}
                >
                  <IconPencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => startDuplicate(t)}
                  aria-label="Duplicar"
                  title="Duplicar modelo"
                  className="p-2 rounded-lg transition-colors hover:bg-[color:var(--admin-surface-hi)]"
                  style={{ color: 'var(--admin-text-mute)' }}
                >
                  <IconCheck size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteTemplate(t.id)}
                  aria-label="Desativar"
                  title="Desativar modelo"
                  className="p-2 rounded-lg transition-colors hover:bg-[color:var(--admin-surface-hi)]"
                  style={{ color: 'var(--admin-danger,#EF4444)' }}
                >
                  <IconClose size={14} />
                </button>
              </div>
            </div>
          ))}

          {/* Botão "Ver modelos prontos" sempre disponível quando já tem templates */}
          <details className="mt-4">
            <summary
              className="cursor-pointer text-xs font-semibold py-2 px-3 rounded-lg inline-flex items-center gap-1.5"
              style={{ color: 'var(--admin-accent)' }}
            >
              <IconPlus size={12} /> Adicionar modelo pronto a partir de presets
            </summary>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => loadPreset(p)}
                  className="text-left p-3 rounded-xl transition-colors hover:opacity-90"
                  style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-divider)' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                      style={{
                        background: `color-mix(in srgb, ${CATEGORY_COLORS[p.category]} 16%, transparent)`,
                        color: CATEGORY_COLORS[p.category],
                      }}
                    >
                      {p.category}
                    </span>
                  </div>
                  <p className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>{p.name}</p>
                  <p className="text-[10px] mt-0.5 line-clamp-1" style={{ color: 'var(--admin-text-mute)' }}>{p.description}</p>
                </button>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
