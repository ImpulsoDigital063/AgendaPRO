'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose, IconPlus, IconTrash } from '@/components/ui/Icon'
import type { PackageRow } from './PacotesView'

type Service = { id: string; name: string; price: number | null; active: boolean }
type Product = {
  id: string
  name: string
  price: number | null
  track_stock?: boolean | null
  quantity?: number | null
  unit?: string | null
}

type ItemForm = {
  uid: string
  kind: 'service' | 'product'
  entity_id: string // service_id OU product_id conforme kind
  quantity: string
  unit_price: string // vazio = usa preço padrão
  /**
   * v120 · itens com o mesmo grupo são ALTERNATIVAS do mesmo material — o
   * cabelo em 3 cores, por exemplo. Quem atende escolhe 1 ao aplicar o combo.
   * A quantidade e o preço valem pro grupo inteiro (meio pacote é meio pacote,
   * seja qual for a cor), então ficam na primeira linha e são propagados.
   */
  option_group?: string
}

export type PackageFormValue = {
  name: string
  price: number
  validity_kind: 'none' | 'days' | 'weeks' | 'months' | 'years'
  validity_value: number | null
  description: string | null
  items: { service_id: string | null; product_id: string | null; quantity: number; unit_price: number | null; option_group?: string | null }[]
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
        option_group: it.option_group ?? undefined,
      }))
    }
    return [{ uid: newUid(), kind: 'service', entity_id: '', quantity: '1', unit_price: '' }]
  })
  const [localError, setLocalError] = useState<string | null>(null)

  // Estoque do material dentro do combo. `products` vem do server e não
  // recarrega com o modal aberto, então o que for ligado aqui fica em estado
  // local pro aviso sumir na hora.
  const [saldoLocal, setSaldoLocal] = useState<Record<string, number>>({})
  const [contagem, setContagem] = useState<Record<string, string>>({})
  const [ligandoId, setLigandoId] = useState<string | null>(null)
  const [estoqueErro, setEstoqueErro] = useState<string | null>(null)

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
    setItems((prev) => {
      const alvo = prev.find((i) => i.uid === uid)
      const grupo = alvo?.option_group
      return prev.map((i) => {
        if (i.uid === uid) return { ...i, ...patch }
        // Quantidade e preço valem pro grupo inteiro: meio pacote é meio pacote
        // em qualquer cor. Só o produto escolhido difere entre as opções.
        if (grupo && i.option_group === grupo) {
          const compartilhado: Partial<ItemForm> = {}
          if ('quantity' in patch) compartilhado.quantity = patch.quantity
          if ('unit_price' in patch) compartilhado.unit_price = patch.unit_price
          return Object.keys(compartilhado).length ? { ...i, ...compartilhado } : i
        }
        return i
      })
    })
  }

  /** Adiciona outra cor/opção ao MESMO material (mesmo option_group). */
  function addOption(uid: string) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.uid === uid)
      if (idx < 0) return prev
      const base = prev[idx]
      const grupo = base.option_group ?? newUid()
      const nova: ItemForm = {
        uid: newUid(),
        kind: 'product',
        entity_id: '',
        quantity: base.quantity,
        unit_price: base.unit_price,
        option_group: grupo,
      }
      // Entra logo depois da última linha do grupo, pra ficar tudo junto na tela
      let fim = idx
      while (fim + 1 < prev.length && prev[fim + 1].option_group === grupo) fim++
      const out = [...prev]
      out[idx] = { ...base, option_group: grupo }
      out.splice(fim + 1, 0, nova)
      return out
    })
  }

  /** true quando a linha é a PRIMEIRA do seu grupo (ou não tem grupo). */
  function ehPrimeiraDoGrupo(idx: number): boolean {
    const it = items[idx]
    if (!it.option_group) return true
    return idx === 0 || items[idx - 1].option_group !== it.option_group
  }

  /** Quantas opções existem no grupo desta linha. */
  function tamanhoDoGrupo(it: ItemForm): number {
    if (!it.option_group) return 1
    return items.filter((i) => i.option_group === it.option_group).length
  }

  /** true na ÚLTIMA linha do grupo — é onde mora o botão de adicionar cor. */
  function ehUltimaDoGrupo(idx: number): boolean {
    const it = items[idx]
    if (!it.option_group) return true
    return idx === items.length - 1 || items[idx + 1].option_group !== it.option_group
  }

  /**
   * Estado do material escolhido, do ponto de vista do combo:
   *  - 'sem-controle' → o 0,5 não sai do estoque (o combo promete e não cumpre)
   *  - 'zerado'       → controla mas está sem saldo; a comanda recusa o
   *                     lançamento com insufficient_stock
   *  - 'ok'           → nada a avisar
   */
  function estadoEstoque(p: Product): 'sem-controle' | 'zerado' | 'ok' {
    const saldo = saldoLocal[p.id] ?? Number(p.quantity ?? 0)
    const controla = p.id in saldoLocal ? true : p.track_stock === true
    if (!controla) return 'sem-controle'
    if (saldo <= 0) return 'zerado'
    return 'ok'
  }

  /**
   * Lança a contagem informada e liga o controle de estoque do material.
   *
   * A ORDEM IMPORTA: primeiro entra o saldo, depois liga o controle. O inverso
   * deixa o material controlado com saldo 0 — e aí `/api/admin/invoices` e
   * `/invoices/[id]/items` passam a recusar o lançamento (insufficient_stock),
   * travando o balcão de quem antes lançava normal.
   */
  async function ligarControle(p: Product) {
    const bruto = String(contagem[p.id] ?? '').replace(',', '.')
    const qtd = Number(bruto)
    if (!bruto || !isFinite(qtd) || qtd <= 0) {
      setEstoqueErro('Informe quantos você tem hoje (maior que zero).')
      return
    }
    setLigandoId(p.id)
    setEstoqueErro(null)
    try {
      const mov = await fetch(`/api/admin/products/${p.id}/movement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'entry', quantity: qtd, reason: 'Contagem inicial · cadastro de combo' }),
      })
      if (!mov.ok) {
        const j = await mov.json().catch(() => ({}))
        throw new Error(j.error ?? 'não deu pra lançar a contagem')
      }
      if (p.track_stock !== true) {
        const patch = await fetch(`/api/admin/products/${p.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ track_stock: true }),
        })
        if (!patch.ok) {
          const j = await patch.json().catch(() => ({}))
          throw new Error(j.error ?? 'não deu pra ligar o controle')
        }
      }
      const anterior = saldoLocal[p.id] ?? Number(p.quantity ?? 0)
      setSaldoLocal((prev) => ({ ...prev, [p.id]: anterior + qtd }))
      setContagem((prev) => ({ ...prev, [p.id]: '' }))
    } catch (e) {
      setEstoqueErro(e instanceof Error ? e.message : 'não deu pra ligar o controle')
    } finally {
      setLigandoId(null)
    }
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
        option_group: it.kind === 'product' ? it.option_group ?? null : null,
      })
    }

    // Mesma cor duas vezes no mesmo grupo: a escolha ficaria ambígua na hora
    // de aplicar e o estoque baixaria da linha errada.
    const porGrupo: Record<string, string[]> = {}
    for (const it of items) {
      if (!it.option_group || it.kind !== 'product') continue
      ;(porGrupo[it.option_group] ??= []).push(it.entity_id)
    }
    for (const ids of Object.values(porGrupo)) {
      if (new Set(ids).size !== ids.length) {
        setLocalError('Tem material repetido nas opções. Cada opção precisa ser um produto diferente.')
        return
      }
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
                // v120 · linhas do mesmo option_group são a MESMA escolha de
                // material. A primeira carrega quantidade e preço; as demais
                // mostram só o produto, pra não repetir "0,5" três vezes.
                const primeira = ehPrimeiraDoGrupo(idx)
                const opcoesNoGrupo = tamanhoDoGrupo(it)
                const ehOpcao = !!it.option_group && opcoesNoGrupo > 1
                return (
                <div key={it.uid}
                  className={`rounded-xl p-3 grid gap-2 items-end ${primeira ? 'grid-cols-[1fr_88px_92px_auto]' : 'grid-cols-[1fr_auto]'}`}
                  style={{
                    background: 'var(--admin-surface-hi)',
                    border: '1px solid var(--admin-border)',
                    ...(primeira ? {} : { marginTop: -6, borderTopLeftRadius: 0, borderTopRightRadius: 0 }),
                  }}
                >
                  <div>
                    <span
                      className="inline-block text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded mb-1"
                      style={{
                        color: isProduct ? '#9333EA' : 'var(--admin-accent)',
                        background: isProduct ? 'rgba(147,51,234,0.10)' : 'var(--admin-accent-bg)',
                      }}
                    >
                      {!isProduct
                        ? 'Serviço'
                        : ehOpcao
                          ? (primeira ? 'Material · a cliente escolhe' : 'ou')
                          : 'Produto'}
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
                  {primeira && (
                  <div>
                    {/* Rótulo por LINHA · QTD significa coisas diferentes:
                        produto = quanto sai do estoque (aceita 0,5 = meio pacote);
                        serviço combo = quantas vezes (normalmente 1);
                        serviço pacote = nº de sessões. min=0.001/step=any pra
                        aceitar fração (Izanara usa 0,5 pacote de cabelo). */}
                    <span className="text-[10px] font-bold uppercase tracking-wider block leading-tight"
                      style={{ color: isProduct ? '#9333EA' : 'var(--admin-accent)' }}>
                      {isProduct ? 'Qtd (estoque)' : isCombo ? 'Vezes' : 'Sessões'}
                    </span>
                    <input
                      type="number"
                      min={0.001}
                      step="any"
                      value={it.quantity}
                      onChange={(e) => updateItem(it.uid, { quantity: e.target.value })}
                      className="admin-input w-full px-2 py-1.5 rounded-lg text-sm tabular-nums mt-0.5"
                    />
                    <span className="text-[9px] leading-tight block mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>
                      {isProduct ? '0,5 = meio pacote' : isCombo ? 'ger. 1' : ''}
                    </span>
                  </div>
                  )}
                  {primeira && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block leading-tight" style={{ color: 'var(--admin-text-faded)' }}>R$/un</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={it.unit_price}
                      onChange={(e) => updateItem(it.uid, { unit_price: e.target.value })}
                      placeholder="padrão"
                      className="admin-input w-full px-2 py-1.5 rounded-lg text-sm tabular-nums mt-0.5"
                    />
                  </div>
                  )}
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

                  {/* v120 · adicionar outra cor/opção ao mesmo material. Só no
                      combo e só em produto — serviço não é escolha de balcão. */}
                  {isCombo && isProduct && ehUltimaDoGrupo(idx) && (
                    <button
                      type="button"
                      onClick={() => addOption(it.uid)}
                      className="col-span-full text-[11px] font-bold inline-flex items-center justify-center gap-1 py-1.5 rounded-lg"
                      style={{
                        color: '#9333EA',
                        background: 'rgba(147,51,234,0.08)',
                        border: '1px dashed rgba(147,51,234,0.4)',
                      }}
                    >
                      <IconPlus size={11} /> {ehOpcao ? 'Outra cor / opção' : 'Esse material tem mais de uma cor?'}
                    </button>
                  )}

                  {/* Aviso de estoque do material · só no combo, e só depois de
                      escolher o produto. Sem isso a tela promete "sai do
                      estoque" e o material sai sem nunca baixar. */}
                  {isCombo && isProduct && (() => {
                    const prod = products.find((p) => p.id === it.entity_id)
                    if (!prod) return null
                    const estado = estadoEstoque(prod)
                    if (estado === 'ok') return null
                    const semControle = estado === 'sem-controle'
                    const un = prod.unit ?? 'un'
                    return (
                      <div
                        className="col-span-full rounded-lg px-2.5 py-2 space-y-2"
                        style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.35)' }}
                      >
                        <p className="text-[11px] leading-snug" style={{ color: '#B45309' }}>
                          {semControle ? (
                            <>
                              <strong>Esse material não controla estoque.</strong> O combo vai funcionar,
                              mas os {Number(it.quantity || 0).toLocaleString('pt-BR')} {un} não vão baixar da sua prateleira.
                            </>
                          ) : (
                            <>
                              <strong>Esse material está zerado.</strong> Como ele controla estoque,
                              lançar o combo na comanda vai ser recusado por falta de saldo.
                            </>
                          )}
                        </p>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider block leading-tight" style={{ color: '#B45309' }}>
                              Quantos você tem hoje?
                            </span>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={contagem[prod.id] ?? ''}
                              onChange={(e) => setContagem((prev) => ({ ...prev, [prod.id]: e.target.value }))}
                              placeholder={`Ex: 10 ${un}`}
                              className="admin-input w-full px-2 py-1.5 rounded-lg text-sm tabular-nums mt-0.5"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => ligarControle(prod)}
                            disabled={ligandoId === prod.id}
                            className="px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50"
                            style={{ background: '#B45309', color: '#fff' }}
                          >
                            {ligandoId === prod.id
                              ? 'Salvando...'
                              : semControle ? 'Ligar controle' : 'Lançar entrada'}
                          </button>
                        </div>
                        {estoqueErro && (
                          <p className="text-[11px]" style={{ color: '#DC2626' }}>{estoqueErro}</p>
                        )}
                      </div>
                    )
                  })()}
                </div>
                )
              })}
            </div>

            <p className="text-[11px] mt-2" style={{ color: 'var(--admin-text-mute)' }}>
              {isCombo ? (
                <>
                  <strong style={{ color: '#9333EA' }}>Produto</strong> · <strong>Qtd</strong> = quanto do material sai do estoque por venda. Use <strong>0,5</strong> se gasta meio pacote (ex: meio pacote de cabelo por trança).<br />
                  <strong style={{ color: 'var(--admin-accent)' }}>Serviço</strong> · <strong>Vezes</strong> = quantas vezes entra no combo (quase sempre <strong>1</strong>).<br />
                  R$/un em branco = usa o preço padrão do item.
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
