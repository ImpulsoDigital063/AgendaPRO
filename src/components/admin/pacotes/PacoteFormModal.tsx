'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose, IconPlus, IconTrash } from '@/components/ui/Icon'
import type { PackageRow } from './PacotesView'

type Service = { id: string; name: string; price: number | null; active: boolean }
type Product = { id: string; name: string; price: number | null }

type ItemForm = {
  uid: string
  kind: 'service' | 'product'
  entity_id: string // service_id OU product_id conforme kind
  quantity: string
  unit_price: string // vazio = usa preço padrão
}

export type PackageFormValue = {
  name: string
  price: number
  validity_kind: 'none' | 'days' | 'weeks' | 'months' | 'years'
  validity_value: number | null
  description: string | null
  items: { service_id: string | null; product_id: string | null; quantity: number; unit_price: number | null }[]
}

type Props = {
  initial: PackageRow | null
  services: Service[]
  products: Product[]
  loading: boolean
  onClose: () => void
  onSubmit: (value: PackageFormValue) => void
  /** 'combo' = serviço+produto · 'pacote' = só serviço (resgatável). Default 'pacote'. */
  kind?: 'combo' | 'pacote'
}

const VALIDITY_OPTIONS: { value: PackageFormValue['validity_kind']; label: string }[] = [
  { value: 'none', label: 'Sem prazo de validade' },
  { value: 'days', label: 'Definir prazo em dias' },
  { value: 'weeks', label: 'Definir prazo em semanas' },
  { value: 'months', label: 'Definir prazo em meses' },
  { value: 'years', label: 'Definir prazo em anos' },
]

function newUid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}${Math.random()}`
}

export default function PacoteFormModal({ initial, services, products, loading, onClose, onSubmit, kind = 'pacote' }: Props) {
  const isCombo = kind === 'combo'
  const noun = isCombo ? 'combo' : 'pacote'
  const [portalReady, setPortalReady] = useState(false)
  const [name, setName] = useState(initial?.name ?? '')
  const [price, setPrice] = useState(initial?.price?.toString() ?? '')
  const [validityKind, setValidityKind] = useState<PackageFormValue['validity_kind']>(initial?.validity_kind ?? 'none')
  const [validityValue, setValidityValue] = useState(initial?.validity_value?.toString() ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [items, setItems] = useState<ItemForm[]>(() => {
    if (initial?.package_items?.length) {
      return initial.package_items.map((it) => ({
        uid: newUid(),
        kind: it.product_id ? 'product' : 'service',
        entity_id: it.product_id ?? it.service_id ?? '',
        quantity: String(it.quantity),
        unit_price: it.unit_price?.toString() ?? '',
      }))
    }
    return [{ uid: newUid(), kind: 'service', entity_id: '', quantity: '1', unit_price: '' }]
  })
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => { setPortalReady(true) }, [])
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!portalReady) return null

  function addItem(kind: 'service' | 'product') {
    setItems((prev) => [...prev, { uid: newUid(), kind, entity_id: '', quantity: '1', unit_price: '' }])
  }
  function removeItem(uid: string) {
    setItems((prev) => prev.length > 1 ? prev.filter((i) => i.uid !== uid) : prev)
  }
  function updateItem(uid: string, patch: Partial<ItemForm>) {
    setItems((prev) => prev.map((i) => i.uid === uid ? { ...i, ...patch } : i))
  }

  function submit() {
    setLocalError(null)
    const n = name.trim()
    if (!n) { setLocalError('Nome obrigatório'); return }
    // Preço em branco = cobra a soma dos itens (sem desconto). Antes virava
    // Number('') = 0 e criava um combo de R$0,00 — que cobraria zero da cliente
    // E baixaria o estoque do material (Eduardo 22/07).
    const p = price.trim() === '' ? itemsTotal : Number(price)
    if (!Number.isFinite(p) || p < 0) { setLocalError('Preço inválido'); return }
    if (p === 0) {
      setLocalError(`O ${noun} ficaria R$ 0,00. Informe o preço, ou preencha o valor dos itens pra ele calcular sozinho.`)
      return
    }
    if (validityKind !== 'none') {
      const v = Number(validityValue)
      if (!Number.isFinite(v) || v <= 0) { setLocalError('Informe a duração da validade'); return }
    }
    if (items.length === 0) { setLocalError('Adicione ao menos 1 item'); return }
    const cleaned: PackageFormValue['items'] = []
    for (const it of items) {
      if (!it.entity_id) { setLocalError(`Selecione o ${it.kind === 'product' ? 'produto' : 'serviço'} em todos os itens`); return }
      const q = Number(it.quantity)
      if (!Number.isFinite(q) || q <= 0) { setLocalError('Quantidade deve ser > 0'); return }
      let unit: number | null = null
      if (it.unit_price.trim() !== '') {
        const u = Number(it.unit_price)
        if (!Number.isFinite(u) || u < 0) { setLocalError('Valor unitário inválido'); return }
        unit = u
      }
      cleaned.push({
        service_id: it.kind === 'service' ? it.entity_id : null,
        product_id: it.kind === 'product' ? it.entity_id : null,
        quantity: q,
        unit_price: unit,
      })
    }

    onSubmit({
      name: n,
      price: p,
      validity_kind: validityKind,
      validity_value: validityKind === 'none' ? null : Number(validityValue),
      description: description.trim() || null,
      items: cleaned,
    })
  }

  // Resumo: soma do valor cheio (unit override OR preço padrão do serviço/produto)
  const itemsTotal = items.reduce((sum, it) => {
    if (!it.entity_id) return sum
    const ent = it.kind === 'product'
      ? products.find((p) => p.id === it.entity_id)
      : services.find((s) => s.id === it.entity_id)
    const unit = it.unit_price.trim() !== '' ? Number(it.unit_price) : Number(ent?.price ?? 0)
    const q = Number(it.quantity) || 0
    return sum + (Number.isFinite(unit) ? unit : 0) * q
  }, 0)
  // Preço efetivo = o que a cliente vai pagar. Em branco → soma dos itens
  // (mesma regra do submit), senão o resumo mostrava "desconto de 100%".
  const precoEfetivo = price.trim() === '' ? itemsTotal : (Number(price) || 0)
  const desconto = Math.max(0, itemsTotal - precoEfetivo)
  // Combo mais caro que a soma dos itens (ex: material vale mais dentro do
  // combo). Não é desconto — é acréscimo, e o resumo precisa dizer isso.
  const acrescimo = Math.max(0, precoEfetivo - itemsTotal)

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
          maxHeight: '92vh',
        }}
      >
        <header className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--admin-divider)' }}
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--admin-text-faded)' }}>
              {initial ? `Editar ${noun}` : `Novo ${noun}`}
            </p>
            <p className="text-lg font-bold" style={{ color: 'var(--admin-text)' }}>
              {isCombo ? 'Combo de serviços e produtos' : 'Pacote de serviços'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--admin-input-bg)] disabled:opacity-50"
            style={{ color: 'var(--admin-text-mute)' }}
            aria-label="Fechar"
          >
            <IconClose size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Nome */}
          <div>
            <label className="admin-label">Nome do {noun}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isCombo ? 'Ex: Trança + Cabelo' : 'Ex: Pacote 4 Manutenções'}
              className="admin-input w-full px-3 py-2.5 rounded-xl text-sm"
            />
          </div>

          {/* Preço */}
          <div>
            <label className="admin-label">Preço do {noun} (R$)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={itemsTotal > 0 ? `Em branco = ${itemsTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (soma dos itens)` : '0,00'}
              className="admin-input w-full px-3 py-2.5 rounded-xl text-sm tabular-nums"
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-mute)' }}>
              É o que a cliente paga. Deixe em branco pra cobrar a soma dos itens, ou coloque um valor menor pra dar desconto.
            </p>
          </div>

          {/* Validade */}
          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <div>
              <label className="admin-label">Prazo de validade</label>
              <select
                value={validityKind}
                onChange={(e) => setValidityKind(e.target.value as PackageFormValue['validity_kind'])}
                className="admin-input w-full px-3 py-2.5 rounded-xl text-sm"
              >
                {VALIDITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {validityKind !== 'none' && (
              <div>
                <label className="admin-label">Duração</label>
                <input
                  type="number"
                  min={1}
                  value={validityValue}
                  onChange={(e) => setValidityValue(e.target.value)}
                  placeholder="90"
                  className="admin-input w-24 px-3 py-2.5 rounded-xl text-sm tabular-nums"
                />
              </div>
            )}
          </div>
          {validityKind !== 'none' && (
            <p className="text-[11px] -mt-2" style={{ color: 'var(--admin-text-mute)' }}>
              Cliente tem essa quantidade pra usar todas as sessões após a compra.
            </p>
          )}

          {/* Descrição opcional */}
          <div>
            <label className="admin-label">Descrição (opcional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Ideal pra clientes que fazem manutenção mensal"
              className="admin-input w-full px-3 py-2.5 rounded-xl text-sm"
            />
          </div>

          {/* Itens do pacote */}
          <div>
            <label className="admin-label flex items-center justify-between gap-2">
              <span>Itens do {noun}</span>
              <span className="inline-flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => addItem('service')}
                  className="text-[11px] font-bold inline-flex items-center gap-1"
                  style={{ color: 'var(--admin-accent)' }}
                >
                  <IconPlus size={11} /> Serviço
                </button>
                {/* Produto só no COMBO · pacote é só serviço (resgatável). */}
                {isCombo && (
                  <button
                    type="button"
                    onClick={() => addItem('product')}
                    disabled={products.length === 0}
                    className="text-[11px] font-bold inline-flex items-center gap-1 disabled:opacity-40"
                    style={{ color: '#9333EA' }}
                    title={products.length === 0 ? 'Cadastre produtos primeiro' : undefined}
                  >
                    <IconPlus size={11} /> Produto
                  </button>
                )}
              </span>
            </label>

            <div className="space-y-2 mt-1">
              {items.map((it, idx) => {
                const isProduct = it.kind === 'product'
                const options = isProduct ? products : services
                return (
                <div key={it.uid}
                  className="rounded-xl p-3 grid grid-cols-[1fr_70px_100px_auto] gap-2 items-end"
                  style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}
                >
                  <div>
                    <span
                      className="inline-block text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded mb-1"
                      style={{
                        color: isProduct ? '#9333EA' : 'var(--admin-accent)',
                        background: isProduct ? 'rgba(147,51,234,0.10)' : 'var(--admin-accent-bg)',
                      }}
                    >
                      {isProduct ? 'Produto' : 'Serviço'}
                    </span>
                    <select
                      value={it.entity_id}
                      onChange={(e) => updateItem(it.uid, { entity_id: e.target.value })}
                      className="admin-input w-full px-2 py-1.5 rounded-lg text-sm"
                    >
                      <option value="">Selecione...</option>
                      {options.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    {idx === 0 && <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>Qtd</span>}
                    {/* min=1 + step inteiro (padrão) bloqueavam FRAÇÃO — o combo
                        da Izanara consome 0,5 pacote de cabelo e não podia nem
                        ser cadastrado (Eduardo 22/07). */}
                    <input
                      type="number"
                      min={0.001}
                      step="any"
                      value={it.quantity}
                      onChange={(e) => updateItem(it.uid, { quantity: e.target.value })}
                      title={isProduct ? 'Quanto desse produto sai do estoque por atendimento. Aceita fração: 0,5 = meio pacote' : 'Quantas vezes esse serviço entra no combo'}
                      className="admin-input w-full px-2 py-1.5 rounded-lg text-sm tabular-nums mt-1"
                    />
                  </div>
                  <div>
                    {idx === 0 && <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>R$/un (opc.)</span>}
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={it.unit_price}
                      onChange={(e) => updateItem(it.uid, { unit_price: e.target.value })}
                      placeholder="padrão"
                      className="admin-input w-full px-2 py-1.5 rounded-lg text-sm tabular-nums mt-1"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(it.uid)}
                    disabled={items.length <= 1}
                    className="w-7 h-7 rounded-full inline-flex items-center justify-center disabled:opacity-30"
                    style={{ color: '#DC2626' }}
                    aria-label="Remover item"
                  >
                    <IconTrash size={12} />
                  </button>
                </div>
                )
              })}
            </div>

            <p className="text-[11px] mt-2" style={{ color: 'var(--admin-text-mute)' }}>
              {isCombo ? (
                <>
                  <strong>Qtd aceita fração</strong> — se o atendimento gasta meio pacote de material, escreva <strong>0,5</strong>. É essa quantidade que sai do estoque a cada venda.
                  <br />
                  R$/un em branco = usa o preço padrão do item. O produto do combo baixa do estoque na hora da venda.
                </>
              ) : (
                <>
                  <strong>Qtd = nº de sessões</strong> daquele serviço no pacote. Ex: <strong>4</strong> manutenções. A cliente resgata uma por vez, respeitando a validade.
                  <br />
                  R$/un em branco = usa o preço padrão do serviço. O valor entra no caixa na venda; o resgate não re-entra, só registra a comissão.
                </>
              )}
            </p>
          </div>

          {/* Resumo do desconto */}
          {itemsTotal > 0 && precoEfetivo > 0 && (
            <div className="rounded-xl p-3 text-sm space-y-1" style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-divider)' }}>
              <div className="flex justify-between" style={{ color: 'var(--admin-text-mute)' }}>
                <span>Soma cheia dos itens</span>
                <span className="tabular-nums">{itemsTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              <div className="flex justify-between font-semibold" style={{ color: desconto > 0 ? '#059669' : 'var(--admin-text)' }}>
                <span>{isCombo ? 'Combo' : 'Pacote'}{price.trim() === '' && <span className="font-normal" style={{ color: 'var(--admin-text-faded)' }}> (calculado)</span>}</span>
                <span className="tabular-nums">{precoEfetivo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              {desconto > 0 && (
                <div className="flex justify-between text-[12px]" style={{ color: '#059669' }}>
                  <span>Desconto pro cliente</span>
                  <span className="tabular-nums">− {desconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({((desconto / itemsTotal) * 100).toFixed(0)}%)</span>
                </div>
              )}
              {acrescimo > 0 && (
                <div className="flex justify-between text-[12px]" style={{ color: 'var(--admin-warn, #B45309)' }}>
                  <span>Acima da soma dos itens</span>
                  <span className="tabular-nums">+ {acrescimo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({((acrescimo / itemsTotal) * 100).toFixed(0)}%)</span>
                </div>
              )}
            </div>
          )}

          {localError && (
            <div className="rounded-lg px-3 py-2 text-xs"
              style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}
            >
              {localError}
            </div>
          )}
        </div>

        <footer className="flex-shrink-0 px-5 py-4 flex gap-2 justify-end" style={{ borderTop: '1px solid var(--admin-divider)', background: 'var(--admin-surface)' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="px-5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
              color: '#fff',
            }}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
