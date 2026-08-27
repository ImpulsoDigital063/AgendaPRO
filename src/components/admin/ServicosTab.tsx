'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Service } from '@/lib/types'
import { sugestoesDeServico } from '@/lib/segmento'
import {
  IconCheck,
  IconClose,
  IconEye,
  IconEyeOff,
  IconInbox,
  IconPencil,
  IconPlus,
  IconSearch,
  IconTrash,
} from '@/components/ui/Icon'
import ConfirmActionModal from '@/components/admin/ConfirmActionModal'
import MoreActionsMenu, { type MoreAction } from '@/components/admin/MoreActionsMenu'
import ServicoUsoProdutosModal from '@/components/admin/produtos/ServicoUsoProdutosModal'

type Props = {
  businessId: string
  initialServices: Service[]
  /**
   * Categoria do negócio (de business.description, escolhida no
   * cadastro). Define quais sugestões pré-prontas aparecem no empty
   * state — barbearia mostra cortes/barba, salão mostra escova/coloração,
   * etc. Se null/vazio/desconhecido, mostra sugestões genéricas.
   */
  category: string | null
  /** businesses.comissao_valor_fixo · mostra os campos de comissão em R$ */
  comissaoFixa?: boolean
  /** v134 · businesses.comissao_por_servico · % da profissional NESTE serviço */
  comissaoPorServico?: boolean
  /** businesses.convenios_enabled · mostra o preço de convênio */
  convenios?: boolean
}

const DURATIONS = [15, 20, 30, 40, 45, 60, 75, 90, 120]

/* Sugestões de serviço por nicho vivem em `src/lib/segmento.ts` — uma fonte só
   pra serviços, fidelidade e telas de preview. Sem nicho definido, as sugestões
   são NEUTRAS: clínica não pode abrir o painel e ler "Corte masculino". */

function formatDuration(min: number) {
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

/* DN Diogo Nogueira (04/08/2026): instalação de papel de parede é orçada por
   metragem, então ele cadastrou o serviço sem preço — e a tela dizia
   "Gratuito". Serviço orçado na hora não é serviço de graça, e o dono lê isso
   como erro do sistema.

   Preço vazio e preço zero eram tratados igual (`if (!price)`). Agora:
     null  → nunca teve preço definido    → "Sob consulta"
     0     → o dono digitou zero          → "Gratuito"
   "Sob consulta" é a mesma palavra que a página pública já usa pro cliente
   final, então o dono vê na gestão o que a cliente dele vê. */
function formatPrice(price: number | null) {
  if (price == null) return 'Sob consulta'
  if (price === 0) return 'Gratuito'
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function isCustomDuration(min: number) {
  return !DURATIONS.includes(min)
}

type FormState = {
  name: string
  description: string
  price: string
  duration_minutes: number
  points: string
  retorno_dias: string
  /* CAF · 21/08. Só aparecem com as chaves do negócio ligadas:
     comissaoFixa → quanto o profissional recebe (R$, não %)
     convenio     → preço praticado no convênio + a comissão daquele atendimento
     (que costuma ser IGUAL à do público: o dono absorve o desconto). */
  commission_amount: string
  commission_percent: string
  convenio_price: string
  convenio_commission_amount: string
}

const emptyForm: FormState = { name: '', description: '', price: '', duration_minutes: 30, points: '', retorno_dias: '', commission_amount: '', commission_percent: '', convenio_price: '', convenio_commission_amount: '' }

const DESCRIPTION_MAX = 400

type Filter = 'active' | 'inactive' | 'all'

export default function ServicosTab({ businessId, initialServices, category, comissaoFixa = false, comissaoPorServico = false, convenios = false }: Props) {
  /** "12,50" → 12.5 · vazio → null (campo não preenchido ≠ zero) */
  const num = (v: string) => (v.trim() ? parseFloat(v.replace(',', '.')) : null)
  const suggestions = useMemo(() => sugestoesDeServico(category), [category])
  // Placeholder do input — usa primeira sugestão da categoria pra dar
  // exemplo casado com o nicho do cliente
  const placeholderExample = suggestions[0] ?? 'Atendimento'
  const [services, setServices] = useState(initialServices)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [showCustomDuration, setShowCustomDuration] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>(emptyForm)
  const [editShowCustom, setEditShowCustom] = useState(false)

  const [saving, setSaving] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const [filter, setFilter] = useState<Filter>('active')
  const [search, setSearch] = useState('')

  const [confirmDelete, setConfirmDelete] = useState<Service | null>(null)

  // v68 · Uso de produtos por serviço (consumo automático)
  const [usoProdutosFor, setUsoProdutosFor] = useState<Service | null>(null)
  const [availableProducts, setAvailableProducts] = useState<Array<{
    id: string; name: string; variant: string | null; unit: string; quantity: number
  }>>([])
  useEffect(() => {
    const sb = createClient()
    sb.from('products')
      .select('id, name, variant, unit, quantity')
      .eq('business_id', businessId)
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        setAvailableProducts((data ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          variant: p.variant ?? null,
          unit: p.unit,
          quantity: Number(p.quantity ?? 0),
        })))
      })
  }, [businessId])

  const addFormRef = useRef<HTMLDivElement | null>(null)
  const supabase = createClient()

  const total = services.length
  const activeCount = services.filter((s) => s.active).length
  const inactiveCount = total - activeCount

  // KPIs
  const withPrice = services.filter((s) => s.price && s.price > 0)
  const ticketMedio =
    withPrice.length > 0
      ? withPrice.reduce((sum, s) => sum + (s.price || 0), 0) / withPrice.length
      : 0
  const duracaoMedia =
    total > 0 ? Math.round(services.reduce((sum, s) => sum + s.duration_minutes, 0) / total) : 0

  const filtered = useMemo(() => {
    let result = [...services]
    if (filter === 'active') result = result.filter((s) => s.active)
    else if (filter === 'inactive') result = result.filter((s) => !s.active)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((s) => s.name.toLowerCase().includes(q))
    }
    // ativos primeiro, depois alfabetico
    result.sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1
      return a.name.localeCompare(b.name, 'pt-BR')
    })
    return result
  }, [services, filter, search])

  function scrollToAddForm(prefillName?: string) {
    if (prefillName) setForm({ ...emptyForm, name: prefillName })
    addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  async function handleAdd() {
    if (!form.name.trim()) return
    if (!form.duration_minutes || form.duration_minutes < 5) return
    setSaving(true)

    const priceValue = form.price ? parseFloat(form.price.replace(',', '.')) : null

    const { data, error } = await supabase
      .from('services')
      .insert({
        business_id: businessId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: priceValue,
        commission_amount: comissaoFixa ? num(form.commission_amount) : null,
        commission_percent: comissaoPorServico ? num(form.commission_percent) : null,
        convenio_price: convenios ? num(form.convenio_price) : null,
        convenio_commission_amount: convenios && comissaoFixa ? num(form.convenio_commission_amount) : null,
        duration_minutes: form.duration_minutes,
        points: form.points ? parseInt(form.points) : 0,
        /* vazio = sem aviso de retorno. Zero nao serve como "desligado":
           zero dia significaria avisar no mesmo dia do atendimento. */
        retorno_dias: form.retorno_dias ? parseInt(form.retorno_dias) : null,
        active: true,
      })
      .select()
      .single()

    if (!error && data) {
      setServices([...services, data])
      setForm(emptyForm)
      setShowCustomDuration(false)
    }
    setSaving(false)
  }

  function startEdit(service: Service) {
    setEditingId(service.id)
    setEditForm({
      name: service.name,
      description: service.description ?? '',
      price: service.price ? String(service.price) : '',
      commission_amount: service.commission_amount != null ? String(service.commission_amount) : '',
      commission_percent: service.commission_percent != null ? String(service.commission_percent) : '',
      convenio_price: service.convenio_price != null ? String(service.convenio_price) : '',
      convenio_commission_amount: service.convenio_commission_amount != null ? String(service.convenio_commission_amount) : '',
      duration_minutes: service.duration_minutes,
      points: service.points ? String(service.points) : '',
      retorno_dias: service.retorno_dias ? String(service.retorno_dias) : '',
    })
    setEditShowCustom(isCustomDuration(service.duration_minutes))
  }

  async function handleSaveEdit(id: string) {
    if (!editForm.name.trim() || !editForm.duration_minutes) return
    setLoadingId(id)
    const priceValue = editForm.price ? parseFloat(editForm.price.replace(',', '.')) : null

    const description = editForm.description.trim() || null

    const { error } = await supabase
      .from('services')
      .update({
        name: editForm.name.trim(),
        description,
        price: priceValue,
        commission_amount: comissaoFixa ? num(editForm.commission_amount) : null,
        commission_percent: comissaoPorServico ? num(editForm.commission_percent) : null,
        convenio_price: convenios ? num(editForm.convenio_price) : null,
        convenio_commission_amount: convenios && comissaoFixa ? num(editForm.convenio_commission_amount) : null,
        duration_minutes: editForm.duration_minutes,
        points: editForm.points ? parseInt(editForm.points) : 0,
        retorno_dias: editForm.retorno_dias ? parseInt(editForm.retorno_dias) : null,
      })
      .eq('id', id)

    if (!error) {
      setServices(
        services.map((s) =>
          s.id === id
            ? {
                ...s,
                name: editForm.name.trim(),
                description,
                price: priceValue,
                duration_minutes: editForm.duration_minutes,
                points: editForm.points ? parseInt(editForm.points) : 0,
                retorno_dias: editForm.retorno_dias ? parseInt(editForm.retorno_dias) : null,
              }
            : s
        )
      )
      setEditingId(null)
    }
    setLoadingId(null)
  }

  async function handleDelete(id: string) {
    setLoadingId(id)
    const { error } = await supabase.from('services').delete().eq('id', id)
    if (!error) setServices(services.filter((s) => s.id !== id))
    setLoadingId(null)
  }

  async function toggleActive(service: Service) {
    setLoadingId(service.id)
    const { error } = await supabase
      .from('services')
      .update({ active: !service.active })
      .eq('id', service.id)

    if (!error) {
      setServices(services.map((s) => (s.id === service.id ? { ...s, active: !s.active } : s)))
    }
    setLoadingId(null)
  }

  /* v107 · vitrine separada do uso. Nasceu do "Agenda pessoal" de R$ 0 da Viva
     Cacheada: serviço ativo aparece na página pública, então qualquer pessoa
     com o link dela podia marcar 60 minutos de graça. Ela nunca percebeu.
     `active` = posso usar · `public_visible` = a cliente vê e pode marcar. */
  async function toggleVisivel(service: Service) {
    const novo = service.public_visible === false
    setLoadingId(service.id)
    const { error } = await supabase
      .from('services')
      .update({ public_visible: novo })
      .eq('id', service.id)
    if (!error) {
      setServices(services.map((s) => (s.id === service.id ? { ...s, public_visible: novo } : s)))
    }
    setLoadingId(null)
  }

  return (
    <div className="space-y-3 pb-24 relative">
      {/* KPI strip */}
      {total > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <Kpi label="Total" value={String(total)} sub={`${activeCount} ativo${activeCount === 1 ? '' : 's'}`} />
          <Kpi
            label="Preço médio"
            value={ticketMedio > 0 ? formatPrice(ticketMedio) : '—'}
            sub={withPrice.length > 0 ? `${withPrice.length} no menu` : 'sem precificação'}
          />
          <Kpi label="Duração média" value={formatDuration(duracaoMedia)} sub="por serviço" />
        </div>
      )}

      {/* Toolbar */}
      {total > 0 && (
        <div className="space-y-2.5">
          {total >= 3 && (
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--admin-text-faded)' }}
              >
                <IconSearch size={14} />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar serviço..."
                className="admin-input w-full pl-9 pr-3 py-2 text-sm"
              />
            </div>
          )}

          <div className="flex gap-1.5">
            {(
              [
                { value: 'active', label: 'Ativos', count: activeCount },
                { value: 'inactive', label: 'Ocultos', count: inactiveCount },
                { value: 'all', label: 'Todos', count: total },
              ] as const
            ).map((chip) => {
              const isActive = filter === chip.value
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setFilter(chip.value)}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-full transition-all"
                  style={
                    isActive
                      ? {
                          background:
                            'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
                          color: '#fff',
                          boxShadow:
                            '0 4px 12px -4px color-mix(in srgb, var(--admin-accent) 50%, transparent)',
                        }
                      : {
                          background: 'var(--admin-input-bg)',
                          color: 'var(--admin-text-mute)',
                          border: '1px solid var(--admin-border)',
                        }
                  }
                >
                  {chip.label}
                  <span className="ml-1.5 text-[10px] tabular-nums" style={{ opacity: 0.85 }}>
                    {chip.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Lista ou empty state */}
      {filtered.length === 0 ? (
        total === 0 ? (
          <div className="admin-card-deep p-6 text-center space-y-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
              Nenhum serviço cadastrado ainda
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
              Comece pelos mais comuns ou cadastre o seu logo abaixo:
            </p>
            <div className="flex flex-wrap justify-center gap-1.5 pt-1">
              {suggestions.map(
                (name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => scrollToAddForm(name)}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-full transition-all hover:opacity-90"
                    style={{
                      background: 'var(--admin-accent-bg)',
                      color: 'var(--admin-accent)',
                      border: '1px solid var(--admin-accent-border)',
                    }}
                  >
                    + {name}
                  </button>
                )
              )}
            </div>
          </div>
        ) : (
          <div className="admin-card-deep p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
              {search.trim()
                ? `Nenhum serviço bate com "${search}".`
                : filter === 'active'
                  ? 'Nenhum serviço ativo.'
                  : 'Nenhum serviço oculto.'}
            </p>
          </div>
        )
      ) : (
        filtered.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            isEditing={editingId === service.id}
            editForm={editForm}
            setEditForm={setEditForm}
            editShowCustom={editShowCustom}
            setEditShowCustom={setEditShowCustom}
            loadingId={loadingId}
            onStartEdit={() => startEdit(service)}
            onCancelEdit={() => setEditingId(null)}
            onSaveEdit={() => handleSaveEdit(service.id)}
            onToggle={() => toggleActive(service)}
            onToggleVisivel={() => toggleVisivel(service)}
            onAskDelete={() => setConfirmDelete(service)}
            comissaoFixa={comissaoFixa}
            comissaoPorServico={comissaoPorServico}
            convenios={convenios}
            onUsoProdutos={() => setUsoProdutosFor(service)}
          />
        ))
      )}

      {/* Adicionar serviço */}
      <div
        ref={addFormRef}
        className="rounded-2xl p-4 space-y-3"
        style={{
          background: 'var(--admin-surface)',
          border: '1px dashed var(--admin-border-hi)',
        }}
      >
        <p className="admin-label flex items-center gap-1.5">
          <IconPlus size={14} />
          Adicionar serviço
        </p>

        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={`Nome do serviço (ex: ${placeholderExample})`}
          className="admin-input w-full px-3 py-2.5 text-sm"
        />

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="admin-label !mb-0">Descrição (opcional)</label>
            <span
              className="text-[10px] tabular-nums"
              style={{
                color:
                  form.description.length > DESCRIPTION_MAX
                    ? 'var(--admin-danger)'
                    : 'var(--admin-text-faded)',
              }}
            >
              {form.description.length}/{DESCRIPTION_MAX}
            </span>
          </div>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value.slice(0, DESCRIPTION_MAX) })
            }
            placeholder="Ex: Inclui hidratação e finalização. Recomendado para cabelos secos."
            rows={2}
            className="admin-input w-full px-3 py-2.5 text-sm resize-none"
          />
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-mute)' }}>
            Aparece pro cliente abaixo do nome no momento de escolher.
          </p>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="admin-label">Preço (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="Ex: 30,00"
              className="admin-input w-full px-3 py-2.5 text-sm"
            />
            {/* Regra cravada em 04/08: serviço sem preço tem o valor definido no
                fechamento da comanda. Sem esta linha a opção existe e ninguém
                descobre — o Diogo chegou nela sozinho, tentando resolver o
                problema dele, e ainda assim ficou com 6 atendimentos zerados. */}
            <p className="text-[11px] mt-1.5 leading-snug" style={{ color: 'var(--admin-text-faded)' }}>
              {form.price.trim()
                ? 'A cliente vê este valor na página de agendamento.'
                : 'Deixe vazio se o valor depende do atendimento. A cliente vê “sob consulta” e você informa quanto foi ao fechar a comanda.'}
            </p>
          </div>
          <div className="flex-1">
            <label className="admin-label">Duração</label>
            <select
              value={showCustomDuration ? 'custom' : form.duration_minutes}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setShowCustomDuration(true)
                } else {
                  setShowCustomDuration(false)
                  setForm({ ...form, duration_minutes: Number(e.target.value) })
                }
              }}
              className="admin-input w-full px-3 py-2.5 text-sm"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {formatDuration(d)}
                </option>
              ))}
              <option value="custom">Personalizado…</option>
            </select>
          </div>
        </div>

        {/* COMISSÃO e CONVÊNIO em blocos separados (Eduardo, 27/08). Estavam
            juntos sob o título "Convênio e comissão", o que fazia a comissão
            parecer coisa de convênio — e ela vale pra todo atendimento, do
            particular ao conveniado. */}
        {(comissaoFixa || comissaoPorServico) && (
          <div
            className="rounded-xl p-3 space-y-2.5"
            style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
              Comissão do profissional
            </p>
            <div className="flex gap-2">
              {comissaoPorServico && (
                <div className="flex-1">
                  <label className="admin-label">Comissão (%)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.commission_percent}
                    onChange={(e) => setForm({ ...form, commission_percent: e.target.value })}
                    placeholder="Ex: 50"
                    className="admin-input w-full px-3 py-2.5 text-sm"
                  />
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-faded)' }}>
                    Porcentagem da profissional neste serviço. Em branco, vale a porcentagem do cadastro dela.
                  </p>
                </div>
              )}
              {comissaoFixa && (
                <div className="flex-1">
                  <label className="admin-label">Comissão (R$)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.commission_amount}
                    onChange={(e) => setForm({ ...form, commission_amount: e.target.value })}
                    placeholder="Ex: 40,00"
                    className="admin-input w-full px-3 py-2.5 text-sm"
                  />
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-faded)' }}>
                    Vale pra qualquer atendimento deste serviço, particular ou de convênio.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {convenios && (
          <div
            className="rounded-xl p-3 space-y-2.5"
            style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
              Convênio
            </p>
            <div className="flex gap-2">
              {convenios && (
                <div className="flex-1">
                  <label className="admin-label">Preço convênio (R$)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.convenio_price}
                    onChange={(e) => setForm({ ...form, convenio_price: e.target.value })}
                    placeholder="Ex: 90,00"
                    className="admin-input w-full px-3 py-2.5 text-sm"
                  />
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-faded)' }}>
                    Vazio = convênio paga o preço normal.
                  </p>
                </div>
              )}
            </div>
            {convenios && comissaoFixa && (
              <div>
                <label className="admin-label">Comissão no convênio (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.convenio_commission_amount}
                  onChange={(e) => setForm({ ...form, convenio_commission_amount: e.target.value })}
                  placeholder="Normalmente igual à comissão normal"
                  className="admin-input w-full px-3 py-2.5 text-sm"
                />
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-faded)' }}>
                  O desconto do convênio é seu, não do profissional: deixe o mesmo valor pra ele
                  receber cheio. Vazio = usa a comissão normal.
                </p>
              </div>
            )}
          </div>
        )}

        {showCustomDuration && (
          <div>
            <label className="admin-label">Minutos personalizados</label>
            <input
              type="number"
              inputMode="numeric"
              value={form.duration_minutes || ''}
              onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })}
              min="5"
              max="600"
              placeholder="Ex: 180"
              className="admin-input w-full px-3 py-2.5 text-sm"
            />
          </div>
        )}

        <div>
          <label className="admin-label">Pontos de fidelidade</label>
          <input
            type="number"
            value={form.points}
            onChange={(e) => setForm({ ...form, points: e.target.value })}
            placeholder="0"
            min="0"
            className="admin-input w-full px-3 py-2.5 text-sm"
          />
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-mute)' }}>
            Cliente ganha esses pontos ao concluir o serviço.
          </p>
        </div>

        {/* QUANDO O CLIENTE PODE REPETIR ESTE SERVICO.
            Nasceu de uma clinica de estetica, onde o intervalo e clinico:
            toxina so depois de 4 meses, peeling depois de 21 dias. Mas serve
            igual pra barbearia (corte a cada 21 dias) e pra salao (retoque de
            cilios a cada 20) - por isso o campo e do sistema, nao dela. */}
        <div>
          <label className="admin-label flex items-center gap-2">
            Dias para poder repetir
            {/* O prazo JA e guardado e a varredura ja funciona (testada), mas o
                canal de WhatsApp ainda esta na instancia de teste da W-API.
                Sem este aviso a dona configura, espera o disparo e conclui que
                o sistema falhou. Ja temos LP prometendo WhatsApp inexistente -
                nao repetir isso dentro do produto. */}
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: 'var(--admin-surface-hi)', color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }}
            >
              em breve
            </span>
          </label>
          <input
            type="number"
            value={form.retorno_dias}
            onChange={(e) => setForm({ ...form, retorno_dias: e.target.value })}
            placeholder="deixe vazio para nao avisar"
            min="1"
            max="1095"
            className="admin-input w-full px-3 py-2.5 text-sm"
          />
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-mute)' }}>
            Passado esse tempo, o cliente recebe um aviso de que já pode fazer de novo. Vazio = sem aviso.
            <br />
            O disparo automático está em teste final — por enquanto o prazo fica guardado e nada é enviado.
          </p>
        </div>

        {/*
          Validacao de preco — bloqueia se preco estiver VAZIO. Permite
          digitar 0 explicitamente caso o serviço seja gratuito (ex:
          "Avaliacao inicial gratuita" pra clinica/personal). Hint
          sugere preencher pra evitar cadastro acidental sem preco.
        */}
        {form.price.trim() === '' && form.name.trim() && (
          <p
            className="text-[11px] px-3 py-2 rounded-lg"
            style={{
              background: 'color-mix(in srgb, var(--admin-warn, #FBBF24) 12%, transparent)',
              color: 'var(--admin-warn, #FBBF24)',
              border: '1px solid color-mix(in srgb, var(--admin-warn, #FBBF24) 30%, transparent)',
            }}
          >
            Defina um preço pro serviço. Se for grátis, digite <strong>0</strong>.
          </p>
        )}

        <button
          onClick={handleAdd}
          disabled={
            saving ||
            !form.name.trim() ||
            !form.duration_minutes ||
            form.price.trim() === ''
          }
          className="w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
          style={{
            background:
              'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
            color: '#FFFFFF',
            boxShadow: '0 8px 20px -6px color-mix(in srgb, var(--admin-accent) 45%, transparent)',
          }}
        >
          {saving ? 'Adicionando...' : 'Adicionar serviço'}
        </button>
      </div>

      {/* Floating + button */}
      {total >= 3 && (
        <button
          type="button"
          onClick={() => scrollToAddForm()}
          aria-label="Adicionar serviço"
          className="fixed right-4 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          style={{
            bottom: 'calc(80px + env(safe-area-inset-bottom))',
            background:
              'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
            color: '#fff',
            boxShadow: '0 12px 28px -8px color-mix(in srgb, var(--admin-accent) 60%, transparent)',
          }}
        >
          <IconPlus size={22} strokeWidth={2.5} />
        </button>
      )}

      <ConfirmActionModal
        open={!!confirmDelete}
        title={`Remover ${confirmDelete?.name || 'serviço'}?`}
        message="Os agendamentos existentes desse serviço não são apagados, mas ele some da lista de oferta. Essa ação não pode ser desfeita."
        confirmLabel="Sim, remover"
        cancelLabel="Voltar"
        tone="danger"
        loading={!!confirmDelete && loadingId === confirmDelete.id}
        onConfirm={async () => {
          if (!confirmDelete) return
          await handleDelete(confirmDelete.id)
          setConfirmDelete(null)
        }}
        onClose={() => setConfirmDelete(null)}
      />

      {/* v68 · Modal "Uso de produtos" por serviço · consumo automático no fechamento */}
      {usoProdutosFor && (
        <ServicoUsoProdutosModal
          serviceId={usoProdutosFor.id}
          serviceName={usoProdutosFor.name}
          availableProducts={availableProducts}
          onClose={() => setUsoProdutosFor(null)}
        />
      )}
    </div>
  )
}

// =============================================================================
// Card individual
// =============================================================================

function ServiceCard({
  service,
  isEditing,
  editForm,
  setEditForm,
  editShowCustom,
  setEditShowCustom,
  loadingId,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onToggle,
  onToggleVisivel,
  onAskDelete,
  onUsoProdutos,
  comissaoFixa = false,
  comissaoPorServico = false,
  convenios = false,
}: {
  service: Service
  isEditing: boolean
  editForm: FormState
  setEditForm: (f: FormState) => void
  editShowCustom: boolean
  setEditShowCustom: (v: boolean) => void
  loadingId: string | null
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onToggle: () => void
  onToggleVisivel: () => void
  onAskDelete: () => void
  onUsoProdutos: () => void
  comissaoFixa?: boolean
  comissaoPorServico?: boolean
  convenios?: boolean
}) {
  const isLoading = loadingId === service.id

  if (isEditing) {
    return (
      <div className="admin-card-deep overflow-hidden p-4 space-y-3">
        <input
          type="text"
          value={editForm.name}
          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          className="admin-input w-full px-3 py-2.5 text-sm"
          placeholder="Nome do serviço"
        />
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="admin-label !mb-0">Descrição (opcional)</label>
            <span
              className="text-[10px] tabular-nums"
              style={{
                color:
                  editForm.description.length > DESCRIPTION_MAX
                    ? 'var(--admin-danger)'
                    : 'var(--admin-text-faded)',
              }}
            >
              {editForm.description.length}/{DESCRIPTION_MAX}
            </span>
          </div>
          <textarea
            value={editForm.description}
            onChange={(e) =>
              setEditForm({ ...editForm, description: e.target.value.slice(0, DESCRIPTION_MAX) })
            }
            placeholder="Ex: Inclui hidratação e finalização."
            rows={2}
            className="admin-input w-full px-3 py-2.5 text-sm resize-none"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="admin-label">Preço (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              value={editForm.price}
              onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
              placeholder="0,00"
              className="admin-input w-full px-3 py-2.5 text-sm"
            />
            <p className="text-[11px] mt-1.5 leading-snug" style={{ color: 'var(--admin-text-faded)' }}>
              {editForm.price.trim()
                ? 'A cliente vê este valor na página de agendamento.'
                : 'Deixe vazio se o valor depende do atendimento. A cliente vê “sob consulta” e você informa quanto foi ao fechar a comanda.'}
            </p>
          </div>
          <div className="flex-1">
            <label className="admin-label">Duração</label>
            <select
              value={editShowCustom ? 'custom' : editForm.duration_minutes}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setEditShowCustom(true)
                } else {
                  setEditShowCustom(false)
                  setEditForm({ ...editForm, duration_minutes: Number(e.target.value) })
                }
              }}
              className="admin-input w-full px-3 py-2.5 text-sm"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {formatDuration(d)}
                </option>
              ))}
              <option value="custom">Personalizado…</option>
            </select>
          </div>
        </div>

        {/* Mesma separação da criação: comissão vale pra todo atendimento,
            convênio é outro assunto. */}
        {(comissaoFixa || comissaoPorServico) && (
          <div
            className="rounded-xl p-3 space-y-2.5"
            style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
              Comissão do profissional
            </p>
            <div className="flex gap-2">
              {/* A edição salvava commission_percent mas não tinha campo pra
                  ele: dava pra definir a porcentagem no cadastro e nunca mais
                  mudar. Achado ao separar os blocos (27/08). */}
              {comissaoPorServico && (
                <div className="flex-1">
                  <label className="admin-label">Comissão (%)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editForm.commission_percent}
                    onChange={(e) => setEditForm({ ...editForm, commission_percent: e.target.value })}
                    placeholder="Ex: 50"
                    className="admin-input w-full px-3 py-2.5 text-sm"
                  />
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-faded)' }}>
                    Porcentagem da profissional neste serviço. Em branco, vale a do cadastro dela.
                  </p>
                </div>
              )}
              {comissaoFixa && (
                <div className="flex-1">
                  <label className="admin-label">Comissão (R$)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editForm.commission_amount}
                    onChange={(e) => setEditForm({ ...editForm, commission_amount: e.target.value })}
                    placeholder="Ex: 40,00"
                    className="admin-input w-full px-3 py-2.5 text-sm"
                  />
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-faded)' }}>
                    Vale pra qualquer atendimento deste serviço, particular ou de convênio.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {convenios && (
          <div
            className="rounded-xl p-3 space-y-2.5"
            style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
              Convênio
            </p>
            <div className="flex gap-2">
              {convenios && (
                <div className="flex-1">
                  <label className="admin-label">Preço convênio (R$)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editForm.convenio_price}
                    onChange={(e) => setEditForm({ ...editForm, convenio_price: e.target.value })}
                    placeholder="Ex: 90,00"
                    className="admin-input w-full px-3 py-2.5 text-sm"
                  />
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-faded)' }}>
                    Vazio = convênio paga o preço normal.
                  </p>
                </div>
              )}
            </div>
            {convenios && comissaoFixa && (
              <div>
                <label className="admin-label">Comissão no convênio (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={editForm.convenio_commission_amount}
                  onChange={(e) => setEditForm({ ...editForm, convenio_commission_amount: e.target.value })}
                  placeholder="Normalmente igual à comissão normal"
                  className="admin-input w-full px-3 py-2.5 text-sm"
                />
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-faded)' }}>
                  O desconto do convênio é seu, não do profissional: deixe o mesmo valor pra ele
                  receber cheio. Vazio = usa a comissão normal.
                </p>
              </div>
            )}
          </div>
        )}
        {editShowCustom && (
          <div>
            <label className="admin-label">Minutos personalizados</label>
            <input
              type="number"
              inputMode="numeric"
              value={editForm.duration_minutes || ''}
              onChange={(e) =>
                setEditForm({ ...editForm, duration_minutes: parseInt(e.target.value) || 0 })
              }
              min="5"
              max="600"
              placeholder="Ex: 180"
              className="admin-input w-full px-3 py-2.5 text-sm"
            />
          </div>
        )}
        <div>
          <label className="admin-label">Pontos de fidelidade</label>
          <input
            type="number"
            value={editForm.points}
            onChange={(e) => setEditForm({ ...editForm, points: e.target.value })}
            placeholder="0"
            min="0"
            className="admin-input w-full px-3 py-2.5 text-sm"
          />
        </div>

        {/* QUANDO O CLIENTE PODE REPETIR ESTE SERVICO.
            Nasceu de uma clinica de estetica, onde o intervalo e clinico:
            toxina so depois de 4 meses, peeling depois de 21 dias. Mas serve
            igual pra barbearia (corte a cada 21 dias) e pra salao (retoque de
            cilios a cada 20) - por isso o campo e do sistema, nao dela. */}
        <div>
          <label className="admin-label flex items-center gap-2">
            Dias para poder repetir
            {/* O prazo JA e guardado e a varredura ja funciona (testada), mas o
                canal de WhatsApp ainda esta na instancia de teste da W-API.
                Sem este aviso a dona configura, espera o disparo e conclui que
                o sistema falhou. Ja temos LP prometendo WhatsApp inexistente -
                nao repetir isso dentro do produto. */}
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: 'var(--admin-surface-hi)', color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }}
            >
              em breve
            </span>
          </label>
          <input
            type="number"
            value={editForm.retorno_dias}
            onChange={(e) => setEditForm({ ...editForm, retorno_dias: e.target.value })}
            placeholder="deixe vazio para nao avisar"
            min="1"
            max="1095"
            className="admin-input w-full px-3 py-2.5 text-sm"
          />
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-mute)' }}>
            Passado esse tempo, o cliente recebe um aviso de que já pode fazer de novo. Vazio = sem aviso.
            <br />
            O disparo automático está em teste final — por enquanto o prazo fica guardado e nada é enviado.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSaveEdit}
            disabled={isLoading || !editForm.name.trim() || !editForm.duration_minutes}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 transition-colors"
            style={{ background: 'var(--admin-accent)', color: '#fff' }}
          >
            {isLoading ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            onClick={onCancelEdit}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: 'var(--admin-input-bg)',
              color: 'var(--admin-text-mute)',
              border: '1px solid var(--admin-border)',
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  const actions: MoreAction[] = [
    {
      label: 'Editar',
      icon: <IconPencil size={15} />,
      onClick: onStartEdit,
    },
    {
      label: 'Uso de produtos',
      icon: <IconInbox size={15} />,
      onClick: onUsoProdutos,
    },
    {
      label: service.active ? 'Ocultar' : 'Mostrar',
      icon: service.active ? <IconEyeOff size={15} /> : <IconEye size={15} />,
      onClick: onToggle,
    },
    /* v107 · separado do Ocultar de propósito: aqui o serviço continua vivo
       pra você marcar, só some da página que a cliente abre. */
    {
      label: service.public_visible === false ? 'Mostrar pra cliente' : 'Só uso interno',
      icon: service.public_visible === false ? <IconEye size={15} /> : <IconEyeOff size={15} />,
      onClick: onToggleVisivel,
    },
    {
      label: 'Remover',
      icon: <IconTrash size={15} />,
      onClick: onAskDelete,
      destructive: true,
      separatorAbove: true,
    },
  ]

  return (
    <div
      className="admin-card-deep px-4 py-3 flex items-center gap-3"
      style={!service.active ? { opacity: 0.65 } : undefined}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{
          background: service.active ? 'var(--admin-success)' : 'var(--admin-text-faded)',
          boxShadow: service.active ? '0 0 8px color-mix(in srgb, var(--admin-success) 70%, transparent)' : undefined,
        }}
      />
      <div className="flex-1 min-w-0">
        <p
          className="font-semibold text-sm truncate"
          style={{ color: service.active ? 'var(--admin-text)' : 'var(--admin-text-mute)' }}
        >
          {service.name}
        </p>
        <p
          className="text-xs mt-0.5 flex items-center gap-1.5 flex-wrap"
          style={{ color: 'var(--admin-text-faded)' }}
        >
          <span
            className="font-semibold tabular-nums"
            style={{ color: service.active ? 'var(--admin-text-2)' : 'var(--admin-text-faded)' }}
          >
            {formatPrice(service.price)}
          </span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">{formatDuration(service.duration_minutes)}</span>
          {/* Sem isso ele configurava preço de convênio e comissão e não via em
              lugar nenhum da lista se tinha ficado gravado. */}
          {convenios && service.convenio_price != null && (
            <>
              <span aria-hidden>·</span>
              <span className="tabular-nums">convênio {formatPrice(service.convenio_price)}</span>
            </>
          )}
          {comissaoFixa && service.commission_amount != null && (
            <>
              <span aria-hidden>·</span>
              <span className="tabular-nums">comissão {formatPrice(service.commission_amount)}</span>
            </>
          )}
          {comissaoPorServico && service.commission_percent != null && (
            <>
              <span aria-hidden>·</span>
              <span className="tabular-nums">comissão {service.commission_percent}%</span>
            </>
          )}
          {/* v107 · estado que muda o que a CLIENTE vê não pode ficar escondido
              dentro do menu. Sem o selo, o dono não descobre que tirou o
              serviço do ar — foi assim que a Viva Cacheada ficou com 60min
              grátis abertos sem saber. */}
          {service.public_visible === false && (
            <>
              <span aria-hidden>·</span>
              <span
                className="px-1.5 py-0.5 rounded font-semibold"
                style={{ background: 'var(--admin-surface-hi)', color: 'var(--admin-text-mute)', fontSize: 10 }}
              >
                só uso interno
              </span>
            </>
          )}
          {service.points > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="tabular-nums" style={{ color: 'var(--admin-warn)' }}>
                {service.points}pts
              </span>
            </>
          )}
          {/* Sem isto o prazo so existiria no banco: a dona configura e nunca
              mais consegue conferir o que configurou. */}
          {service.retorno_dias ? (
            <>
              <span aria-hidden>·</span>
              <span className="tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>
                repete em {service.retorno_dias}d
              </span>
            </>
          ) : null}
          {!service.active && (
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{
                background: 'color-mix(in srgb, var(--admin-warn) 16%, transparent)',
                color: 'var(--admin-warn)',
              }}
            >
              Oculto
            </span>
          )}
        </p>
        {service.description && (
          <p
            className="text-[11px] mt-1 line-clamp-2 leading-snug"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            {service.description}
          </p>
        )}
      </div>
      <MoreActionsMenu actions={actions} />
    </div>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="admin-card p-2.5">
      <p
        className="text-[10px] font-semibold uppercase tracking-wider truncate"
        style={{ color: 'var(--admin-text-faded)' }}
      >
        {label}
      </p>
      <p
        className="text-sm font-bold leading-tight tabular-nums truncate mt-0.5"
        style={{ color: 'var(--admin-text)' }}
      >
        {value}
      </p>
      <p className="text-[10px] mt-1 truncate" style={{ color: 'var(--admin-text-faded)' }}>
        {sub}
      </p>
    </div>
  )
}
