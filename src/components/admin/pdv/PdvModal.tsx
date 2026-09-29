'use client'

/* PDV · "Registrar venda" (Eduardo 28/09/2026): "tem que se tornar um PDV,
   inclusive mais simples, que ajude a registrar a venda com poucos cliques".

   Uma tela: toca no serviço/produto → vai pro carrinho · quem atendeu (só se
   tiver serviço) · cliente opcional · Cobrar. Venda comum = 3 toques.

   Motor: POST /api/admin/invoices — o mesmo do Faturar. Cria a comanda, lança
   o serviço como atendimento concluído (horário de agora, fuso BR), baixa o
   estoque do produto, grava o pagamento, o desconto e de onde ele sai. Nada
   de caminho paralelo pro dinheiro.

   Substitui o AgendarModal em modo balcão (agenda) e o VenderProdutoView
   (Produtos → Vender). Mobile e desktop: bottom sheet no celular, modal
   centralizado no sm+. */

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { IconClose } from '@/components/ui/Icon'
import PaymentMethodModal, { type PaymentMethodChoice, type CardPaymentDetails } from '@/components/admin/PaymentMethodModal'
import type { AlvoDesconto } from '@/lib/desconto-geral'
import { parseValorBR, valorParaCampo } from '@/lib/valor-br'

type Aba = 'servicos' | 'produtos'
type Servico = { id: string; name: string; price: number | null }
type Produto = { id: string; name: string; variant: string | null; price: number | null; quantity: number; track_stock: boolean | null; unit: string }
type Prof = { id: string; name: string }
type Cliente = { id: string; name: string; phone: string | null }
type Linha = { key: string; tipo: 'servico' | 'produto'; id: string; nome: string; preco: number; qtd: number; estoque: number | null }

type Props = {
  open: boolean
  businessId: string
  abaInicial?: Aba
  /** Já abre com este produto no carrinho ("Vender agora" da ficha do produto). */
  prefillProdutoId?: string | null
  onClose: () => void
  /** Chamado depois de uma venda registrada (pra quem chamou atualizar a tela). */
  onVendido?: () => void
}

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function PdvModal({ open, businessId, abaInicial = 'servicos', prefillProdutoId = null, onClose, onVendido }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => { setPortalReady(true) }, [])

  const [aba, setAba] = useState<Aba>(abaInicial)
  const [busca, setBusca] = useState('')
  const [servicos, setServicos] = useState<Servico[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [profs, setProfs] = useState<Prof[]>([])
  const [carregando, setCarregando] = useState(false)

  const [carrinho, setCarrinho] = useState<Linha[]>([])
  const [profId, setProfId] = useState<string | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [buscandoCliente, setBuscandoCliente] = useState(false)
  const [termoCliente, setTermoCliente] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [editandoPreco, setEditandoPreco] = useState<string | null>(null)
  const [precoTexto, setPrecoTexto] = useState('')

  const [pagando, setPagando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [feito, setFeito] = useState<number | null>(null)
  const enviandoRef = useRef(false)

  function zerar() {
    setCarrinho([]); setCliente(null); setBusca(''); setErro(null); setAviso(null)
    setFeito(null); setBuscandoCliente(false); setTermoCliente(''); setEditandoPreco(null)
    setProfId(profs.length === 1 ? profs[0].id : null)
  }

  // Carrega catálogo ao abrir (RLS do usuário: dono ou recepção)
  useEffect(() => {
    if (!open) return
    setAba(abaInicial)
    zerar()
    let vivo = true
    setCarregando(true)
    ;(async () => {
      const [{ data: s }, { data: p }, { data: pr }] = await Promise.all([
        supabase.from('services').select('id, name, price').eq('business_id', businessId).eq('active', true).order('name'),
        supabase.from('products').select('id, name, variant, price, quantity, track_stock, unit').eq('business_id', businessId).eq('active', true).eq('sale_active', true).order('name'),
        supabase.from('professionals').select('id, name, does_appointments').eq('business_id', businessId).eq('active', true).order('name'),
      ])
      if (!vivo) return
      setServicos((s ?? []) as Servico[])
      setProdutos((p ?? []) as Produto[])
      const atendem = ((pr ?? []) as (Prof & { does_appointments: boolean | null })[]).filter((x) => x.does_appointments !== false)
      setProfs(atendem)
      setProfId(atendem.length === 1 ? atendem[0].id : null)
      const pre = prefillProdutoId ? ((p ?? []) as Produto[]).find((x) => x.id === prefillProdutoId) : null
      if (pre && (pre.track_stock === false || Number(pre.quantity) > 0)) {
        const nome = pre.variant ? `${pre.name} · ${pre.variant}` : pre.name
        setCarrinho([{ key: `produto-${pre.id}`, tipo: 'produto', id: pre.id, nome, preco: Number(pre.price ?? 0), qtd: 1, estoque: pre.track_stock === false ? null : Number(pre.quantity) }])
      }
      setCarregando(false)
    })()
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, businessId])

  // Busca de cliente (nome ou telefone)
  useEffect(() => {
    if (!buscandoCliente) return
    const t = termoCliente.trim()
    if (t.length < 2) { setClientes([]); return }
    let vivo = true
    const id = setTimeout(async () => {
      const dig = t.replace(/\D/g, '')
      let q = supabase.from('customers').select('id, name, phone').eq('business_id', businessId).limit(8)
      q = dig.length >= 3 ? q.ilike('phone', `%${dig}%`) : q.ilike('name', `%${t}%`)
      const { data } = await q.order('name')
      if (vivo) setClientes((data ?? []) as Cliente[])
    }, 250)
    return () => { vivo = false; clearTimeout(id) }
  }, [termoCliente, buscandoCliente, businessId, supabase])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && !salvando && !pagando) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, salvando, pagando, onClose])

  const termo = busca.trim().toLowerCase()
  const listaServicos = servicos.filter((s) => !termo || s.name.toLowerCase().includes(termo))
  const listaProdutos = produtos.filter((p) => !termo || `${p.name} ${p.variant ?? ''}`.toLowerCase().includes(termo))

  const temServico = carrinho.some((l) => l.tipo === 'servico')
  const temProduto = carrinho.some((l) => l.tipo === 'produto')
  const total = Math.round(carrinho.reduce((s, l) => s + l.preco * l.qtd, 0) * 100) / 100

  function adicionar(l: Omit<Linha, 'key' | 'qtd'>) {
    setAviso(null)
    setCarrinho((c) => {
      const ja = c.find((x) => x.tipo === l.tipo && x.id === l.id)
      if (ja) {
        if (ja.estoque != null && ja.qtd + 1 > ja.estoque) { setAviso(`${l.nome}: só tem ${ja.estoque} em estoque`); return c }
        return c.map((x) => (x === ja ? { ...x, qtd: x.qtd + 1 } : x))
      }
      if (l.estoque != null && l.estoque < 1) { setAviso(`${l.nome}: sem estoque`); return c }
      return [...c, { ...l, key: `${l.tipo}-${l.id}`, qtd: 1 }]
    })
  }

  function mudarQtd(key: string, delta: number) {
    setAviso(null)
    setCarrinho((c) => c.flatMap((x) => {
      if (x.key !== key) return [x]
      const q = x.qtd + delta
      if (q <= 0) return []
      if (x.estoque != null && q > x.estoque) { setAviso(`${x.nome}: só tem ${x.estoque} em estoque`); return [x] }
      return [{ ...x, qtd: q }]
    }))
  }

  function salvarPreco(key: string) {
    const v = parseValorBR(precoTexto)
    if (v == null || Number.isNaN(v)) { setAviso('Preço inválido. Use o formato 150,00'); return }
    setCarrinho((c) => c.map((x) => (x.key === key ? { ...x, preco: v } : x)))
    setEditandoPreco(null)
  }

  function cobrar() {
    setErro(null)
    if (carrinho.length === 0) { setErro('Adicione pelo menos um item'); return }
    if (temServico && !profId) { setErro('Escolha quem atendeu'); return }
    setPagando(true)
  }

  async function registrar(method: PaymentMethodChoice, card?: CardPaymentDetails, desconto?: number, origem?: AlvoDesconto) {
    // Toque duplo criava 2 vendas (2 comandas) · a ref barra na hora (M5)
    if (enviandoRef.current) return
    enviandoRef.current = true
    try {
      await registrarVenda(method, card, desconto, origem)
    } finally {
      enviandoRef.current = false
    }
  }

  async function registrarVenda(method: PaymentMethodChoice, card?: CardPaymentDetails, desconto?: number, origem?: AlvoDesconto) {
    setSalvando(true)
    setErro(null)
    const body: Record<string, unknown> = {
      customerId: cliente?.id ?? null,
      client_name: cliente ? undefined : 'Cliente avulso',
      appointmentIds: [],
      productSales: carrinho.filter((l) => l.tipo === 'produto').map((l) => ({
        product_id: l.id, product_name: l.nome, quantity: l.qtd, unit_price: l.preco,
        // Comissão de produto só com alguém escolhido de propósito (T8 · 28/09)
        professional_id: profId,
      })),
      extraServices: carrinho.filter((l) => l.tipo === 'servico').map((l) => ({
        service_id: l.id, unit_price: l.preco, quantity: l.qtd, professional_id: profId,
      })),
    }
    if (method) {
      const pay: Record<string, unknown> = { method }
      if (method === 'card' && card) {
        pay.device_id = card.device_id; pay.card_brand = card.card_brand; pay.card_type = card.card_type
        pay.fee_percent = card.fee_percent; pay.installments = card.installments
      }
      body.payment = pay
      if (typeof desconto === 'number' && desconto > 0) {
        body.manual_discount = desconto
        if (origem) body.discount_target = origem
      }
    }
    const r = await fetch('/api/admin/invoices', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const d = await r.json().catch(() => ({}))
    setSalvando(false)
    setPagando(false)
    if (!r.ok) {
      setErro(d.detail ?? (d.error === 'insufficient_stock' ? 'Estoque insuficiente pra um dos produtos.' : d.error) ?? 'Não foi possível registrar a venda')
      return
    }
    setFeito(Number(d?.invoice?.total ?? total))
    onVendido?.()
  }

  if (!open || !portalReady) return null

  const botaoAba = (v: Aba, rot: string) => (
    <button
      type="button"
      onClick={() => setAba(v)}
      className="flex-1 py-2 rounded-lg text-sm font-bold"
      style={aba === v
        ? { background: 'var(--admin-accent, #7C3AED)', color: '#fff' }
        : { background: 'var(--admin-surface)', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}
    >
      {rot}
    </button>
  )

  return createPortal(
    <>
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Registrar venda"
      className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={() => !salvando && !pagando && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        /* Altura FIXA enquanto monta a venda: a janela crescia a cada item e as
           abas/itens mudavam de lugar debaixo do dedo (no teste, o toque em
           "Produtos" caiu num serviço). Carrinho rola por dentro. */
        className={`w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col ${feito === null ? 'h-[88svh] sm:h-[640px]' : ''}`}
        style={{ background: 'var(--admin-popover-bg, #FFFFFF)', border: '1px solid var(--admin-popover-border, #E2E8F0)', maxHeight: '92svh' }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
          <p className="text-lg font-bold" style={{ color: 'var(--admin-text)' }}>Registrar venda</p>
          <button type="button" onClick={onClose} disabled={salvando} aria-label="Fechar" className="p-1" style={{ color: 'var(--admin-text-mute)' }}>
            <IconClose size={18} />
          </button>
        </div>

        {feito !== null ? (
          <div className="p-6 text-center space-y-4">
            <p className="text-base font-bold" style={{ color: '#059669' }}>Venda registrada · {brl(feito)}</p>
            <div className="flex gap-2">
              <button type="button" onClick={zerar} className="flex-1 py-3 rounded-xl text-sm font-bold" style={{ background: 'var(--admin-accent, #7C3AED)', color: '#fff' }}>
                Nova venda
              </button>
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: 'var(--admin-surface)', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}>
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
              <div className="flex gap-2">
                {botaoAba('servicos', 'Serviços')}
                {botaoAba('produtos', 'Produtos')}
              </div>
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={aba === 'servicos' ? 'Buscar serviço' : 'Buscar produto'}
                className="admin-input w-full px-3 py-2 rounded-lg text-sm"
              />

              {carregando ? (
                <p className="text-xs py-4 text-center" style={{ color: 'var(--admin-text-mute)' }}>Carregando…</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto">
                  {aba === 'servicos' && listaServicos.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => adicionar({ tipo: 'servico', id: s.id, nome: s.name, preco: Number(s.price ?? 0), estoque: null })}
                      className="text-left rounded-xl p-2.5 active:scale-[0.98]"
                      style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
                    >
                      <p className="text-sm font-semibold leading-tight line-clamp-2" style={{ color: 'var(--admin-text)' }}>{s.name}</p>
                      <p className="text-xs mt-1 tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>{brl(Number(s.price ?? 0))}</p>
                    </button>
                  ))}
                  {aba === 'produtos' && listaProdutos.map((p) => {
                    const nome = p.variant ? `${p.name} · ${p.variant}` : p.name
                    const controla = p.track_stock !== false
                    const semEstoque = controla && Number(p.quantity) <= 0
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={semEstoque}
                        onClick={() => adicionar({ tipo: 'produto', id: p.id, nome, preco: Number(p.price ?? 0), estoque: controla ? Number(p.quantity) : null })}
                        className="text-left rounded-xl p-2.5 active:scale-[0.98] disabled:opacity-40"
                        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
                      >
                        <p className="text-sm font-semibold leading-tight line-clamp-2" style={{ color: 'var(--admin-text)' }}>{nome}</p>
                        <p className="text-xs mt-1 tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>
                          {brl(Number(p.price ?? 0))}{controla ? ` · ${semEstoque ? 'sem estoque' : `${Number(p.quantity)} ${p.unit}`}` : ''}
                        </p>
                      </button>
                    )
                  })}
                  {((aba === 'servicos' && listaServicos.length === 0) || (aba === 'produtos' && listaProdutos.length === 0)) && (
                    <p className="col-span-full text-xs py-3 text-center" style={{ color: 'var(--admin-text-mute)' }}>Nada encontrado</p>
                  )}
                </div>
              )}

              {/* Carrinho */}
              {carrinho.length > 0 && (
                <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
                  {carrinho.map((l) => (
                    <div key={l.key} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 min-w-0 truncate" style={{ color: 'var(--admin-text)' }}>{l.nome}</span>
                      <button type="button" onClick={() => mudarQtd(l.key, -1)} aria-label="Menos" className="w-7 h-7 rounded-md font-bold" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-2)' }}>−</button>
                      <span className="w-6 text-center tabular-nums font-semibold" style={{ color: 'var(--admin-text)' }}>{l.qtd}</span>
                      <button type="button" onClick={() => mudarQtd(l.key, 1)} aria-label="Mais" className="w-7 h-7 rounded-md font-bold" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-2)' }}>+</button>
                      {editandoPreco === l.key ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          autoFocus
                          value={precoTexto}
                          onChange={(e) => setPrecoTexto(e.target.value.replace(/[^\d.,]/g, ''))}
                          onBlur={() => salvarPreco(l.key)}
                          onKeyDown={(e) => { if (e.key === 'Enter') salvarPreco(l.key) }}
                          className="admin-input w-20 px-2 py-1 rounded-md text-sm tabular-nums text-right"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setEditandoPreco(l.key); setPrecoTexto(valorParaCampo(l.preco)) }}
                          title="Tocar pra mudar o preço"
                          className="w-20 text-right tabular-nums font-semibold underline decoration-dotted"
                          style={{ color: 'var(--admin-text)' }}
                        >
                          {brl(l.preco * l.qtd)}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {aviso && <p className="text-xs font-semibold" style={{ color: '#b45309' }}>{aviso}</p>}

              {/* Quem atendeu · só com serviço no carrinho (obrigatório) ou
                  opcional com produto (define a comissão do produto). */}
              {carrinho.length > 0 && profs.length > 0 && (temServico || temProduto) && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>
                    {temServico ? 'Quem atendeu' : 'Quem vendeu (opcional · define a comissão)'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {profs.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProfId(profId === p.id && !temServico ? null : p.id)}
                        className="px-3 py-1.5 rounded-full text-xs font-bold"
                        style={profId === p.id
                          ? { background: 'var(--admin-accent, #7C3AED)', color: '#fff' }
                          : { background: 'var(--admin-surface)', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Cliente · opcional */}
              {carrinho.length > 0 && (
                <div className="text-sm">
                  {!buscandoCliente ? (
                    <div className="flex items-center justify-between gap-2">
                      <span style={{ color: 'var(--admin-text-2)' }}>
                        Cliente: <strong style={{ color: 'var(--admin-text)' }}>{cliente?.name ?? 'Avulso'}</strong>
                      </span>
                      <span className="flex gap-3">
                        {cliente && (
                          <button type="button" onClick={() => setCliente(null)} className="text-xs font-semibold" style={{ color: 'var(--admin-text-mute)' }}>Avulso</button>
                        )}
                        <button type="button" onClick={() => { setBuscandoCliente(true); setTermoCliente('') }} className="text-xs font-semibold" style={{ color: 'var(--admin-accent, #7C3AED)' }}>
                          {cliente ? 'Trocar' : 'Escolher cliente'}
                        </button>
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <input
                        type="search"
                        autoFocus
                        value={termoCliente}
                        onChange={(e) => setTermoCliente(e.target.value)}
                        placeholder="Nome ou telefone"
                        className="admin-input w-full px-3 py-2 rounded-lg text-sm"
                      />
                      {clientes.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setCliente(c); setBuscandoCliente(false) }}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm"
                          style={{ background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
                        >
                          {c.name} <span className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>{c.phone ?? ''}</span>
                        </button>
                      ))}
                      <button type="button" onClick={() => setBuscandoCliente(false)} className="text-xs font-semibold" style={{ color: 'var(--admin-text-mute)' }}>
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 py-4" style={{ borderTop: '1px solid var(--admin-divider)' }}>
              {erro && <p className="mb-2 text-xs font-semibold" role="alert" style={{ color: '#DC2626' }}>{erro}</p>}
              <button
                type="button"
                onClick={cobrar}
                disabled={carrinho.length === 0 || salvando}
                className="w-full py-3.5 rounded-xl text-base font-bold disabled:opacity-40"
                style={{ background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)', color: '#fff' }}
              >
                {carrinho.length === 0 ? 'Toque nos itens pra montar a venda' : `Cobrar ${brl(total)}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>

      <PaymentMethodModal
        open={pagando}
        clientName={cliente?.name ?? 'Cliente avulso'}
        totalPrice={total}
        businessId={businessId}
        loading={salvando}
        permiteDesconto
        perguntarOrigemDesconto={temServico && temProduto}
        semPontos
        erro={erro}
        deferLabel="Deixar em aberto"
        heading="Como vai pagar?"
        eyebrow="Registrar venda"
        onChoose={(method, card, _v, desconto, origem) => registrar(method, card, desconto, origem)}
        onClose={() => setPagando(false)}
      />
    </>,
    document.body,
  )
}
