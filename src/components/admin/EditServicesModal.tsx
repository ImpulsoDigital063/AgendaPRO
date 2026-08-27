'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { IconClose, IconCheck } from '@/components/ui/Icon'

type Service = {
  id: string
  name: string
  price: number | null
  duration_minutes: number
  points: number | null
}

type Props = {
  appointmentId: string
  startTime: string
  /** Status atual · mantido por compat com chamadores · o bloqueio de comanda
   *  paga vem do backend (locked) via GET, não mais do status. */
  currentStatus?: string
  onClose: () => void
}

function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function calcEndTime(startTime: string, durationMin: number): string {
  const [sh, sm] = startTime.split(':').map(Number)
  const total = sh * 60 + sm + durationMin
  const eh = Math.floor(total / 60).toString().padStart(2, '0')
  const em = (total % 60).toString().padStart(2, '0')
  return `${eh}:${em}`
}

export default function EditServicesModal({
  appointmentId,
  startTime,
  onClose,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  // Edição completa: data, horário, profissional e observação.
  const [professionals, setProfessionals] = useState<{ id: string; name: string }[]>([])
  const [date, setDate] = useState('')
  const [time, setTime] = useState(startTime.slice(0, 5))
  const [professionalId, setProfessionalId] = useState('')
  const [notes, setNotes] = useState('')
  // Produto na comanda · exclusivo do plano Equipe. Só aparece se houver
  // comanda aberta (invoiceId) pra receber o produto.
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [canSellProducts, setCanSellProducts] = useState(false)
  const [products, setProducts] = useState<{ id: string; name: string; variant: string | null; price: number | null }[]>([])
  const [productCart, setProductCart] = useState<{ product_id: string; name: string; unit_price: number }[]>([])
  // Produtos JÁ lançados na comanda aberta (carregados do GET). Sem isso, produto
  // adicionado antes sumia da área de edição e só aparecia na comanda.
  const [comandaProducts, setComandaProducts] = useState<{ item_id: string; name: string; unit_price: number; quantity: number }[]>([])
  const [removingItem, setRemovingItem] = useState<string | null>(null)
  const [prodPickerOpen, setProdPickerOpen] = useState(false)
  const [prodSearch, setProdSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  // locked = comanda já paga (invoice fechada). Editar serviço aqui descasaria
  // o financeiro · backend bloqueia 409 e a UI mostra o caminho (reabrir).
  const [locked, setLocked] = useState(false)
  // Conflict state: quando API retorna 409 com canForce=true, mostra warning
  // amarelo + botao "Salvar mesmo assim" · profissional decide.
  const [conflict, setConflict] = useState<string | null>(null)
  // Flag pra evitar setState após unmount em fluxos async (cancelar
  // durante fetch, fechar antes de salvar concluir). React 18 não loga
  // mais o warning, mas continua boa prática evitar memory leaks.
  const mountedRef = useRef(true)
  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  // Portal-mount guard: createPortal precisa de document, que só existe
  // no client. Sem essa flag, SSR explode. Setado após primeiro mount.
  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => { setPortalReady(true) }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/admin/appointments/${appointmentId}/services`, {
          cache: 'no-store',
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          if (!cancelled) setError(data.error || 'Erro ao carregar serviços')
          return
        }
        const data = await res.json()
        if (cancelled) return
        setServices(data.services || [])
        setSelectedIds(new Set(data.currentServiceIds || []))
        setProfessionals(data.professionals || [])
        const appt = data.appointment || {}
        if (appt.appointment_date) setDate(appt.appointment_date)
        if (appt.start_time) setTime(String(appt.start_time).slice(0, 5))
        if (appt.professional_id) setProfessionalId(appt.professional_id)
        setNotes(appt.notes || '')
        setInvoiceId(data.invoice_id ?? null)
        setComandaProducts(data.comanda_products ?? [])
        setLocked(data.appointment?.locked === true)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [appointmentId])

  // Carrega produtos + flag do plano (Equipe). Picker só aparece se Equipe.
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/products')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        setCanSellProducts(d.canSellProducts === true)
        setProducts((d.products ?? [])
          .filter((p: { sale_active?: boolean }) => p.sale_active !== false)
          .map((p: { id: string; name: string; variant: string | null; price: number | null }) => ({
            id: p.id, name: p.name, variant: p.variant ?? null, price: p.price == null ? null : Number(p.price),
          })))
      })
      .catch(() => { /* sem produtos · picker some */ })
    return () => { cancelled = true }
  }, [])

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function addProduct(p: { id: string; name: string; variant: string | null; price: number | null }) {
    setProductCart((prev) => [...prev, {
      product_id: p.id,
      name: p.variant ? `${p.name} · ${p.variant}` : p.name,
      unit_price: p.price ?? 0,
    }])
    setProdSearch('')
    setProdPickerOpen(false)
  }
  function removeProduct(idx: number) {
    setProductCart((prev) => prev.filter((_, i) => i !== idx))
  }
  // Remove um produto JÁ na comanda · efeito imediato (item já persistido).
  // A rota DELETE recalcula o total da comanda. Erro deixa o item na lista.
  async function removeComandaProduct(itemId: string) {
    if (!invoiceId || removingItem) return
    setRemovingItem(itemId)
    setError(null)
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}/items/${itemId}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        if (mountedRef.current) setError(d.error || 'Erro ao remover produto da comanda')
        return
      }
      if (mountedRef.current) setComandaProducts((prev) => prev.filter((p) => p.item_id !== itemId))
      router.refresh()
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      if (mountedRef.current) setRemovingItem(null)
    }
  }
  const prodResults = (() => {
    const q = prodSearch.trim().toLowerCase()
    const list = q ? products.filter((p) => p.name.toLowerCase().includes(q) || (p.variant ?? '').toLowerCase().includes(q)) : products
    return list.slice(0, 30)
  })()

  const selectedServices = services.filter((s) => selectedIds.has(s.id))
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0)
  const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price ?? 0), 0)
  const productsSubtotal = productCart.reduce((sum, p) => sum + (p.unit_price ?? 0), 0)
  const comandaProdSubtotal = comandaProducts.reduce((sum, p) => sum + (p.unit_price ?? 0) * (p.quantity ?? 1), 0)
  const grandTotal = totalPrice + productsSubtotal + comandaProdSubtotal
  const newEndTime = totalDuration > 0 ? calcEndTime(time || startTime, totalDuration) : null

  async function salvar(force = false) {
    if (selectedIds.size === 0) {
      setError('Selecione pelo menos 1 serviço')
      return
    }
    setSaving(true)
    setError(null)
    if (force) setConflict(null)
    try {
      const res = await fetch(`/api/admin/appointments/${appointmentId}/services`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          serviceIds: Array.from(selectedIds),
          force,
          start_time: time,
          appointment_date: date || undefined,
          professional_id: professionalId || undefined,
          notes,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (mountedRef.current) {
          // 409 com canForce=true: conflito de horario · profissional decide
          if (res.status === 409 && data.canForce === true) {
            setConflict(data.error || 'Conflito de horário')
          } else {
            setError(data.error || 'Erro ao salvar')
          }
        }
        return
      }
      // Produtos (Equipe): grava na comanda aberta do atendimento. Erro num
      // produto avisa mas não desfaz a edição já salva.
      if (productCart.length > 0 && invoiceId) {
        for (const p of productCart) {
          const pr = await fetch(`/api/admin/invoices/${invoiceId}/items`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ product_id: p.product_id, quantity: 1, unit_price: p.unit_price }),
          })
          if (!pr.ok) {
            const pd = await pr.json().catch(() => ({}))
            if (mountedRef.current) setError(`Atendimento salvo, mas falhou ao adicionar "${p.name}": ${pd.detail || pd.error || 'erro'}`)
            router.refresh()
            return
          }
        }
      }
      router.refresh()
      onClose()
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : 'Erro')
      }
    } finally {
      // Garante que botão "Salvando..." nunca trava — vale pra sucesso
      // (modal vai desmontar mas defensive), erro tratado e exceção.
      if (mountedRef.current) {
        setSaving(false)
      }
    }
  }

  if (!portalReady) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="admin-card w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl flex flex-col"
        style={{
          maxHeight: 'calc(100svh - 16px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px) + 1rem, 1rem)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header sticky */}
        <div
          className="flex items-center justify-between p-4 sticky top-0 bg-inherit rounded-t-3xl"
          style={{ borderBottom: '1px solid var(--admin-divider)' }}
        >
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
              Editar atendimento
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>
              Mude horário, data, profissional e serviços
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--admin-text-mute)' }}
            aria-label="Fechar"
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Comanda paga · serviços travados. Editar aqui descasaria o
            financeiro (a cliente já pagou o valor antigo). Caminho: reabrir. */}
        {locked && !loading && (
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <div
              className="rounded-xl p-4 text-sm space-y-2"
              style={{
                background: 'rgba(245,158,11,0.10)',
                border: '1px solid rgba(245,158,11,0.35)',
                color: 'var(--admin-text)',
              }}
            >
              <p className="font-bold" style={{ color: '#D97706' }}>
                Comanda já paga
              </p>
              <p>
                Não dá pra mudar os serviços de uma comanda que já foi paga — os
                valores não bateriam com o que o cliente pagou.
              </p>
              <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
                Pra ajustar: abra a comanda em <strong>Comandas</strong> e toque em{' '}
                <strong>Reabrir</strong>, edite e fature de novo. Ou lance um novo
                atendimento pro serviço extra.
              </p>
            </div>
          </div>
        )}

        {/* Conteúdo */}
        {!locked && (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl"
                  style={{ background: 'var(--admin-input-bg)' }}
                />
              ))}
            </div>
          ) : (
            <>
              {/* Data + Horário */}
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>Data</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="admin-input w-full mt-1 px-3 py-2 rounded-xl text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>Horário de início</span>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="admin-input w-full mt-1 px-3 py-2 rounded-xl text-sm"
                  />
                </label>
              </div>

              {/* Profissional */}
              {professionals.length > 0 && (
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>Profissional</span>
                  <select
                    value={professionalId}
                    onChange={(e) => setProfessionalId(e.target.value)}
                    className="admin-input w-full mt-1 px-3 py-2 rounded-xl text-sm"
                  >
                    {professionals.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </label>
              )}

              {/* Serviços */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>Serviços</span>
                {services.length === 0 ? (
                  <p className="text-sm text-center py-6" style={{ color: 'var(--admin-text-faded)' }}>
                    Nenhum serviço ativo cadastrado.
                  </p>
                ) : (
                  <div className="space-y-2 mt-1.5">
                    {services.map((s) => {
                      const checked = selectedIds.has(s.id)
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggle(s.id)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-transform active:scale-[0.99]"
                          style={{
                            background: checked ? 'rgba(59,130,246,0.10)' : 'var(--admin-input-bg)',
                            border: `1px solid ${checked ? 'rgba(59,130,246,0.40)' : 'var(--admin-border)'}`,
                          }}
                        >
                          <span
                            className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center"
                            style={{
                              background: checked ? '#3B82F6' : 'transparent',
                              border: `1.5px solid ${checked ? '#3B82F6' : 'var(--admin-border)'}`,
                            }}
                          >
                            {checked && <IconCheck size={12} />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>{s.name}</p>
                            <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
                              {s.duration_minutes}min · {s.price != null ? formatPrice(s.price) : '—'}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Produtos · aparece se há comanda aberta e (plano Equipe pode
                  adicionar OU já existem produtos lançados pra listar/remover). */}
              {invoiceId && (canSellProducts || comandaProducts.length > 0) && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>Produtos (vender junto)</span>

                  {/* Já na comanda · produtos lançados antes (removíveis) */}
                  {comandaProducts.length > 0 && (
                    <div className="space-y-1.5 mt-1.5">
                      {comandaProducts.map((p) => (
                        <div key={p.item_id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.30)' }}>
                          <span className="min-w-0">
                            <span className="text-sm truncate block" style={{ color: 'var(--admin-text)' }}>{p.name}{p.quantity > 1 ? ` ×${p.quantity}` : ''}</span>
                            <span className="text-[10px]" style={{ color: '#16A34A' }}>já na comanda</span>
                          </span>
                          <span className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>{formatPrice(p.unit_price * p.quantity)}</span>
                            <button type="button" onClick={() => removeComandaProduct(p.item_id)} disabled={removingItem === p.item_id} className="w-6 h-6 rounded-full flex items-center justify-center disabled:opacity-40" style={{ color: '#DC2626' }} aria-label={`Remover ${p.name} da comanda`}>
                              <IconClose size={12} />
                            </button>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Novos produtos desta edição (gravam ao Salvar) */}
                  {productCart.length > 0 && (
                    <div className="space-y-1.5 mt-1.5">
                      {productCart.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 p-2.5 rounded-xl" style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}>
                          <span className="text-sm truncate" style={{ color: 'var(--admin-text)' }}>{p.name}</span>
                          <span className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>{formatPrice(p.unit_price)}</span>
                            <button type="button" onClick={() => removeProduct(idx)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ color: '#DC2626' }} aria-label={`Remover ${p.name}`}>
                              <IconClose size={12} />
                            </button>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {canSellProducts && (
                  <div className="mt-1.5">
                    {!prodPickerOpen ? (
                      <button
                        type="button"
                        onClick={() => setProdPickerOpen(true)}
                        className="w-full py-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2"
                        style={{ background: 'color-mix(in srgb, var(--admin-accent) 10%, transparent)', color: 'var(--admin-accent)', border: '1px dashed color-mix(in srgb, var(--admin-accent) 45%, transparent)' }}
                      >
                        + Adicionar produto
                      </button>
                    ) : (
                      <div className="rounded-xl p-2.5 space-y-2" style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}>
                        <input
                          autoFocus
                          type="search"
                          value={prodSearch}
                          onChange={(e) => setProdSearch(e.target.value)}
                          placeholder="Buscar produto..."
                          className="admin-input w-full px-3 py-2 rounded-lg text-sm"
                        />
                        {prodResults.length === 0 ? (
                          <p className="text-xs text-center py-2" style={{ color: 'var(--admin-text-faded)' }}>
                            {prodSearch ? 'Nenhum produto bate com a busca' : 'Cadastre produtos em Produtos'}
                          </p>
                        ) : (
                          <ul className="space-y-1 max-h-48 overflow-y-auto">
                            {prodResults.map((p) => (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  onClick={() => addProduct(p)}
                                  className="w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-3"
                                  style={{ background: 'var(--admin-surface)' }}
                                >
                                  <span className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
                                    {p.name}{p.variant ? <span style={{ color: 'var(--admin-text-mute)' }}> · {p.variant}</span> : null}
                                  </span>
                                  <span className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: 'var(--admin-text)' }}>{p.price != null ? formatPrice(p.price) : '—'}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <button type="button" onClick={() => setProdPickerOpen(false)} className="text-xs underline" style={{ color: 'var(--admin-text-mute)' }}>fechar busca</button>
                      </div>
                    )}
                  </div>
                  )}
                </div>
              )}

              {/* Observação */}
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>Observação</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={2000}
                  placeholder="Anotação interna do atendimento (opcional)"
                  className="admin-input w-full mt-1 px-3 py-2 rounded-xl text-sm resize-y"
                />
              </label>
            </>
          )}
        </div>
        )}

        {/* Footer travado · comanda paga · só fechar */}
        {locked && !loading && (
          <div
            className="p-4"
            style={{ borderTop: '1px solid var(--admin-divider)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              Entendi
            </button>
          </div>
        )}

        {/* Footer com preview e ações */}
        {!locked && !loading && services.length > 0 && (
          <div
            className="p-4 space-y-3"
            style={{ borderTop: '1px solid var(--admin-divider)' }}
          >
            {/* Preview */}
            <div
              className="rounded-xl p-3 text-xs grid grid-cols-3 gap-2"
              style={{
                background: 'var(--admin-input-bg)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <div>
                <p style={{ color: 'var(--admin-text-faded)' }}>Duração</p>
                <p className="font-bold mt-0.5" style={{ color: 'var(--admin-text)' }}>
                  {totalDuration > 0 ? `${totalDuration}min` : '—'}
                </p>
              </div>
              <div>
                <p style={{ color: 'var(--admin-text-faded)' }}>Termina</p>
                <p className="font-bold mt-0.5" style={{ color: 'var(--admin-text)' }}>
                  {newEndTime || '—'}
                </p>
              </div>
              <div>
                <p style={{ color: 'var(--admin-text-faded)' }}>Total</p>
                <p className="font-bold mt-0.5" style={{ color: 'var(--admin-text)' }}>
                  {grandTotal > 0 ? formatPrice(grandTotal) : '—'}
                </p>
                {(productsSubtotal > 0 || comandaProdSubtotal > 0) && (
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>
                    serviços {formatPrice(totalPrice)} + produtos {formatPrice(productsSubtotal + comandaProdSubtotal)}
                  </p>
                )}
              </div>
            </div>

            {error && (
              <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>
            )}

            {conflict && (
              <div
                className="rounded-xl p-3 text-xs space-y-2"
                style={{
                  background: 'rgba(245,158,11,0.10)',
                  border: '1px solid rgba(245,158,11,0.35)',
                  color: 'var(--admin-text)',
                }}
              >
                <p className="font-semibold" style={{ color: '#D97706' }}>Conflito de horário</p>
                <p>{conflict}</p>
                <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
                  Você pode salvar mesmo assim · você é responsável por organizar a agenda com os próximos clientes.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={conflict ? () => setConflict(null) : onClose}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{
                  background: 'var(--admin-accent-bg)',
                  color: 'var(--admin-text)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                {conflict ? 'Voltar' : 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => salvar(conflict !== null)}
                disabled={saving || selectedIds.size === 0}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{
                  background: conflict ? '#D97706' : 'var(--admin-accent)',
                  color: '#fff',
                }}
              >
                {saving ? 'Salvando...' : conflict ? 'Salvar mesmo assim' : 'Salvar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
