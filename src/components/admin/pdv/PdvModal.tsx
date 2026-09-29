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
import { todayBR } from '@/lib/date-br'
import NovoProdutoModal from '@/components/admin/produtos/NovoProdutoModal'
import { ratearCombo, type ComboItemInput } from '@/lib/combo-rateio'

type Aba = 'servicos' | 'produtos' | 'combos'
type Servico = { id: string; name: string; price: number | null }
type Produto = { id: string; name: string; variant: string | null; price: number | null; quantity: number; track_stock: boolean | null; unit: string }
type Prof = { id: string; name: string }
type Cliente = { id: string; name: string; phone: string | null }
/* Combo (serviço + fração de material, v120 com cores alternativas). No
   carrinho é UMA linha pelo preço do combo; na hora de cobrar abre em
   serviço(s) pelo valor cheio + material com o resto, pela mesma regra do
   agendamento (ratearCombo) · comissão e baixa de estoque saem iguais. */
type ComboItem = ComboItemInput & {
  option_group: string | null
  products?: (NonNullable<ComboItemInput['products']> & { quantity: number | null; track_stock: boolean | null }) | null
}
type Combo = { id: string; name: string; price: number | null; package_items: ComboItem[] | null }
type ParteProduto = { product_id: string; nome: string; quantity: number; unit_price: number; estoque: number | null }
type PartesCombo = { servicos: { service_id: string; price: number }[]; produtos: ParteProduto[] }
type Linha = { key: string; tipo: 'servico' | 'produto' | 'combo'; id: string; nome: string; preco: number; qtd: number; estoque: number | null; partes?: PartesCombo }

/** Um material por grupo de cor: o escolhido, senão o primeiro com saldo, senão o primeiro. */
function resolverItens(combo: Combo, escolhas: Record<string, string>): ComboItem[] {
  const itens = combo.package_items ?? []
  const out: ComboItem[] = []
  const vistos = new Set<string>()
  for (const it of itens) {
    const g = it.option_group
    if (!g) { out.push(it); continue }
    if (vistos.has(g)) continue
    vistos.add(g)
    const opcoes = itens.filter((x) => x.option_group === g)
    const escolhido = escolhas[g] ? opcoes.find((x) => x.product_id === escolhas[g]) : undefined
    const comSaldo = opcoes.find((x) => x.products?.track_stock === false || Number(x.products?.quantity ?? 0) > 0)
    out.push(escolhido ?? comSaldo ?? opcoes[0])
  }
  return out
}

function gruposDeCor(combo: Combo): { group: string; opcoes: ComboItem[] }[] {
  const itens = combo.package_items ?? []
  const ordem: string[] = []
  for (const it of itens) if (it.option_group && !ordem.includes(it.option_group)) ordem.push(it.option_group)
  return ordem.map((g) => ({ group: g, opcoes: itens.filter((x) => x.option_group === g) })).filter((x) => x.opcoes.length > 1)
}

function nomeProduto(p: { name: string; variant: string | null } | null | undefined) {
  return p ? (p.variant ? `${p.name} · ${p.variant}` : p.name) : ''
}

/** Material sem saldo pra mais uma unidade do combo (controle ligado). */
function faltaMaterial(partes: PartesCombo, vezes: number): ParteProduto | null {
  return partes.produtos.find((p) => p.estoque != null && p.quantity * vezes > p.estoque) ?? null
}

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
  const [combos, setCombos] = useState<Combo[]>([])
  const [comboAberto, setComboAberto] = useState<Combo | null>(null)
  const [escolhas, setEscolhas] = useState<Record<string, string>>({})
  const [carregando, setCarregando] = useState(false)

  const [carrinho, setCarrinho] = useState<Linha[]>([])
  const [profId, setProfId] = useState<string | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [buscandoCliente, setBuscandoCliente] = useState(false)
  const [termoCliente, setTermoCliente] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [editandoPreco, setEditandoPreco] = useState<string | null>(null)
  // Venda que já aconteceu (pagamento que passou) · hoje por padrão
  const [dataVenda, setDataVenda] = useState(todayBR())
  // Cadastro sem sair da venda (Eduardo 29/09): produto abre o cadastro
  // completo por cima; serviço é um formulário curto aqui mesmo.
  const [novoProdutoAberto, setNovoProdutoAberto] = useState(false)
  const [novoServico, setNovoServico] = useState<{ nome: string; preco: string; duracao: string } | null>(null)
  const [salvandoServico, setSalvandoServico] = useState(false)
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
    setComboAberto(null); setEscolhas({}); setDataVenda(todayBR()); setNovoServico(null)
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
      const [{ data: s }, { data: p }, { data: pr }, { data: cb }] = await Promise.all([
        supabase.from('services').select('id, name, price').eq('business_id', businessId).eq('active', true).order('name'),
        supabase.from('products').select('id, name, variant, price, quantity, track_stock, unit').eq('business_id', businessId).eq('active', true).eq('sale_active', true).order('name'),
        supabase.from('professionals').select('id, name, does_appointments').eq('business_id', businessId).eq('active', true).order('name'),
        // Material vem pelo JOIN: o do combo nem sempre está à venda avulsa (sale_active)
        supabase.from('packages').select('id, name, price, package_items (service_id, product_id, quantity, unit_price, option_group, services (id, name, price, duration_minutes), products (id, name, variant, price, quantity, track_stock, commission_type, commission_value))').eq('business_id', businessId).eq('active', true).eq('kind', 'combo').order('name'),
      ])
      if (!vivo) return
      setServicos((s ?? []) as Servico[])
      setProdutos((p ?? []) as Produto[])
      // Combo sem serviço não entra: só produto já se vende na aba Produtos
      setCombos(((cb ?? []) as unknown as Combo[]).filter((c) => (c.package_items ?? []).some((i) => i.service_id)))
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
  const listaCombos = combos.filter((c) => !termo || c.name.toLowerCase().includes(termo))

  const temServico = carrinho.some((l) => l.tipo === 'servico' || l.tipo === 'combo')
  const temProduto = carrinho.some((l) => l.tipo === 'produto' || (l.tipo === 'combo' && (l.partes?.produtos.length ?? 0) > 0))
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

  async function recarregarProdutos() {
    const { data } = await supabase.from('products').select('id, name, variant, price, quantity, track_stock, unit').eq('business_id', businessId).eq('active', true).eq('sale_active', true).order('name')
    setProdutos((data ?? []) as Produto[])
  }

  async function criarServico() {
    if (!novoServico) return
    const nome = novoServico.nome.trim()
    const preco = novoServico.preco.trim() ? parseValorBR(novoServico.preco) : 0
    const duracao = parseInt(novoServico.duracao, 10)
    if (!nome) { setAviso('Dê um nome ao serviço'); return }
    if (preco == null || Number.isNaN(preco) || preco < 0) { setAviso('Preço inválido. Use o formato 150,00'); return }
    if (!duracao || duracao < 5) { setAviso('Duração mínima de 5 minutos'); return }
    setSalvandoServico(true)
    const { data, error } = await supabase
      .from('services')
      .insert({ business_id: businessId, name: nome, price: preco, duration_minutes: duracao, points: 0, active: true })
      .select('id, name, price')
      .single()
    setSalvandoServico(false)
    if (error || !data) { setAviso('Não foi possível cadastrar o serviço' + (error?.message ? ` (${error.message})` : '')); return }
    const novo = data as Servico
    setServicos((lista) => [...lista, novo].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
    setNovoServico(null)
    adicionar({ tipo: 'servico', id: novo.id, nome: novo.name, preco: Number(novo.price ?? 0), estoque: null })
  }

  function montarCombo(combo: Combo, esc: Record<string, string>): { nome: string; partes: PartesCombo; preco: number } {
    const itens = resolverItens(combo, esc)
    const { servicos, produtos: prods } = ratearCombo(Number(combo.price ?? 0), itens)
    const porId = new Map(itens.filter((i) => i.products).map((i) => [i.product_id as string, i.products!]))
    const partes: PartesCombo = {
      servicos: servicos.map((x) => ({ service_id: x.service_id, price: x.price })),
      produtos: prods.map((x) => {
        const pr = porId.get(x.product_id)
        return { product_id: x.product_id, nome: x.product_name, quantity: x.quantity, unit_price: x.unit_price, estoque: pr?.track_stock === false ? null : Number(pr?.quantity ?? 0) }
      }),
    }
    // Preço da linha = soma do que a comanda vai gravar (sem 1 centavo de diferença do arredondamento)
    const preco = Math.round((partes.servicos.reduce((t, x) => t + x.price, 0) + partes.produtos.reduce((t, x) => t + x.quantity * x.unit_price, 0)) * 100) / 100
    const cores = gruposDeCor(combo).length > 0 ? partes.produtos.map((x) => x.nome).join(' + ') : ''
    return { nome: cores ? `${combo.name} · ${cores}` : combo.name, partes, preco }
  }

  function tocarCombo(combo: Combo) {
    setAviso(null)
    if (gruposDeCor(combo).length > 0) {
      // Tem cor alternativa: abre a escolha já marcando a que entraria por padrão
      const efetivas: Record<string, string> = {}
      for (const it of resolverItens(combo, {})) if (it.option_group && it.product_id) efetivas[it.option_group] = it.product_id
      setEscolhas(efetivas)
      setComboAberto(combo)
      return
    }
    adicionarCombo(combo, {})
  }

  function adicionarCombo(combo: Combo, esc: Record<string, string>) {
    const { nome, partes, preco } = montarCombo(combo, esc)
    const key = `combo-${combo.id}-${partes.produtos.map((x) => x.product_id).join('-')}`
    setAviso(null)
    setCarrinho((c) => {
      const ja = c.find((x) => x.key === key)
      const vezes = (ja?.qtd ?? 0) + 1
      const falta = faltaMaterial(partes, vezes)
      if (falta) { setAviso(`${falta.nome}: só tem ${falta.estoque} em estoque`); return c }
      if (ja) return c.map((x) => (x === ja ? { ...x, qtd: vezes } : x))
      return [...c, { key, tipo: 'combo', id: combo.id, nome, preco, qtd: 1, estoque: null, partes }]
    })
    setComboAberto(null)
  }

  function mudarQtd(key: string, delta: number) {
    setAviso(null)
    setCarrinho((c) => c.flatMap((x) => {
      if (x.key !== key) return [x]
      const q = x.qtd + delta
      if (q <= 0) return []
      if (x.partes && delta > 0) {
        const falta = faltaMaterial(x.partes, q)
        if (falta) { setAviso(`${falta.nome}: só tem ${falta.estoque} em estoque`); return [x] }
      }
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
    if (dataVenda > todayBR()) { setErro('A data não pode ser depois de hoje'); return }
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
      data_venda: dataVenda,
      client_name: cliente ? undefined : 'Cliente avulso',
      appointmentIds: [],
      productSales: [
        ...carrinho.filter((l) => l.tipo === 'produto').map((l) => ({
          product_id: l.id, product_name: l.nome, quantity: l.qtd, unit_price: l.preco,
          // Comissão de produto só com alguém escolhido de propósito (T8 · 28/09)
          professional_id: profId,
        })),
        // Material do combo: fração × vezes, pelo preço do rateio (baixa o estoque)
        ...carrinho.filter((l) => l.tipo === 'combo').flatMap((l) => (l.partes?.produtos ?? []).map((p) => ({
          product_id: p.product_id, product_name: p.nome, quantity: p.quantity * l.qtd, unit_price: p.unit_price, professional_id: profId,
        }))),
      ],
      extraServices: [
        ...carrinho.filter((l) => l.tipo === 'servico').map((l) => ({
          service_id: l.id, unit_price: l.preco, quantity: l.qtd, professional_id: profId,
        })),
        // Serviço do combo pelo valor cheio · base da comissão
        ...carrinho.filter((l) => l.tipo === 'combo').flatMap((l) => (l.partes?.servicos ?? []).map((x) => ({
          service_id: x.service_id, unit_price: x.price, quantity: l.qtd, professional_id: profId,
        }))),
      ],
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
                {combos.length > 0 && botaoAba('combos', 'Combos')}
              </div>
              <div className="flex gap-2">
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder={aba === 'servicos' ? 'Buscar serviço' : aba === 'combos' ? 'Buscar combo' : 'Buscar produto'}
                  className="admin-input flex-1 min-w-0 px-3 py-2 rounded-lg text-sm"
                />
                {aba !== 'combos' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAviso(null)
                      if (aba === 'produtos') setNovoProdutoAberto(true)
                      else setNovoServico({ nome: busca.trim(), preco: '', duracao: '60' })
                    }}
                    className="px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap"
                    style={{ background: 'var(--admin-surface)', color: 'var(--admin-accent, #7C3AED)', border: '1px solid var(--admin-border)' }}
                  >
                    + Novo
                  </button>
                )}
              </div>

              {aba === 'servicos' && novoServico && (
                <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-accent, #7C3AED)' }}>Novo serviço</p>
                  <input
                    type="text"
                    autoFocus
                    value={novoServico.nome}
                    onChange={(e) => setNovoServico({ ...novoServico, nome: e.target.value })}
                    placeholder="Nome do serviço"
                    className="admin-input w-full px-3 py-2 rounded-lg text-sm"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={novoServico.preco}
                      onChange={(e) => setNovoServico({ ...novoServico, preco: e.target.value.replace(/[^\d.,]/g, '') })}
                      placeholder="Preço (ex: 150,00)"
                      className="admin-input flex-1 min-w-0 px-3 py-2 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      min={5}
                      step={5}
                      value={novoServico.duracao}
                      onChange={(e) => setNovoServico({ ...novoServico, duracao: e.target.value })}
                      aria-label="Duração em minutos"
                      className="admin-input w-20 px-3 py-2 rounded-lg text-sm"
                    />
                    <span className="self-center text-xs" style={{ color: 'var(--admin-text-mute)' }}>min</span>
                  </div>
                  <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>Comissão, pontos e descrição você ajusta depois em Serviços.</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={criarServico} disabled={salvandoServico} className="flex-1 py-2 rounded-lg text-sm font-bold disabled:opacity-50" style={{ background: 'var(--admin-accent, #7C3AED)', color: '#fff' }}>
                      {salvandoServico ? 'Salvando…' : 'Cadastrar e adicionar'}
                    </button>
                    <button type="button" onClick={() => setNovoServico(null)} className="px-3 py-2 rounded-lg text-sm font-semibold" style={{ color: 'var(--admin-text-mute)' }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

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
                  {aba === 'combos' && listaCombos.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => tocarCombo(c)}
                      className="text-left rounded-xl p-2.5 active:scale-[0.98]"
                      style={{ background: 'var(--admin-surface)', border: comboAberto?.id === c.id ? '2px solid var(--admin-accent, #7C3AED)' : '1px solid var(--admin-border)' }}
                    >
                      <p className="text-sm font-semibold leading-tight line-clamp-2" style={{ color: 'var(--admin-text)' }}>{c.name}</p>
                      <p className="text-xs mt-1 tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>
                        {brl(Number(c.price ?? 0))}{gruposDeCor(c).length > 0 ? ' · escolher cor' : ''}
                      </p>
                    </button>
                  ))}
                  {((aba === 'servicos' && listaServicos.length === 0) || (aba === 'produtos' && listaProdutos.length === 0) || (aba === 'combos' && listaCombos.length === 0)) && (
                    <p className="col-span-full text-xs py-3 text-center" style={{ color: 'var(--admin-text-mute)' }}>Nada encontrado</p>
                  )}
                </div>
              )}

              {/* Combo com cor alternativa: qual material vai sair */}
              {aba === 'combos' && comboAberto && (
                <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-accent, #7C3AED)' }}>
                    {comboAberto.name} · qual material saiu?
                  </p>
                  {gruposDeCor(comboAberto).map((g) => (
                    <div key={g.group} className="flex flex-wrap gap-1.5">
                      {g.opcoes.map((o) => {
                        const p = o.products
                        const controla = p?.track_stock !== false
                        const saldo = Number(p?.quantity ?? 0)
                        const semSaldo = controla && saldo < Number(o.quantity ?? 0)
                        const marcado = escolhas[g.group] === o.product_id
                        return (
                          <button
                            key={o.product_id}
                            type="button"
                            disabled={semSaldo}
                            onClick={() => setEscolhas((e) => ({ ...e, [g.group]: o.product_id as string }))}
                            className="px-3 py-1.5 rounded-full text-xs font-bold disabled:opacity-40"
                            style={marcado
                              ? { background: 'var(--admin-accent, #7C3AED)', color: '#fff' }
                              : { background: 'var(--admin-popover-bg, #fff)', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}
                          >
                            {nomeProduto(p)}{controla ? ` · ${semSaldo ? 'sem estoque' : saldo}` : ''}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => adicionarCombo(comboAberto, escolhas)} className="flex-1 py-2 rounded-lg text-sm font-bold" style={{ background: 'var(--admin-accent, #7C3AED)', color: '#fff' }}>
                      Adicionar {brl(montarCombo(comboAberto, escolhas).preco)}
                    </button>
                    <button type="button" onClick={() => setComboAberto(null)} className="px-3 py-2 rounded-lg text-sm font-semibold" style={{ color: 'var(--admin-text-mute)' }}>
                      Cancelar
                    </button>
                  </div>
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
                      {l.tipo === 'combo' ? (
                        // Preço do combo não se edita aqui: mexeria no rateio serviço × material
                        <span className="w-20 text-right tabular-nums font-semibold" style={{ color: 'var(--admin-text)' }}>{brl(l.preco * l.qtd)}</span>
                      ) : editandoPreco === l.key ? (
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

              {/* Data · hoje por padrão; dia passado lança venda/pagamento que já aconteceu */}
              {carrinho.length > 0 && (
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span style={{ color: 'var(--admin-text-2)' }}>
                    Data: <strong style={{ color: dataVenda === todayBR() ? 'var(--admin-text)' : '#b45309' }}>{dataVenda === todayBR() ? 'Hoje' : dataVenda.split('-').reverse().join('/')}</strong>
                  </span>
                  <input
                    type="date"
                    value={dataVenda}
                    max={todayBR()}
                    onChange={(e) => setDataVenda(e.target.value && e.target.value <= todayBR() ? e.target.value : todayBR())}
                    aria-label="Data da venda"
                    className="admin-input px-2 py-1 rounded-md text-xs"
                  />
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

      {novoProdutoAberto && (
        <NovoProdutoModal
          businessId={businessId}
          onClose={() => setNovoProdutoAberto(false)}
          onSuccess={() => { setNovoProdutoAberto(false); setAba('produtos'); recarregarProdutos() }}
        />
      )}

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
