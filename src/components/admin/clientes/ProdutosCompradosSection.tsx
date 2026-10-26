'use client'

/* Produtos comprados pela cliente · Wanessa 23/10/2026: "às vezes eu não
   atendi, mas ele comprou um produto (...) pra mim é importante saber pra
   pegar feedback, dar continuidade no tratamento, vender o mesmo produto".

   Fonte: sales type=product_sale (a mesma da tela Vendas) · total já é o
   líquido (desconto geral rateado em acertarValorDosProdutosDaComanda).
   Cancelada não entra. "+ Vender" abre o PDV de sempre com a cliente já
   escolhida: a venda entra no caixa e no histórico dela de uma vez.

   Usado pelos DOIS fronts: ClienteDrawer (aba Produtos) e ClienteDetailModal. */

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PdvModal from '@/components/admin/pdv/PdvModal'

type Venda = {
  id: string
  sale_date: string
  total: number | null
  status: string
  sale_items: { product_name: string | null; quantity: number | null }[] | null
}

type Props = {
  customerId: string
  customerName: string
  customerPhone: string | null
  businessId: string
  /** Avisa quem chamou que uma venda nova entrou (contador do topo da ficha). */
  onVendido?: () => void
}

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function dataBR(d: string) {
  return new Date(d.slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function qtdTexto(q: number | null) {
  const n = Number(q ?? 1)
  return n === 1 ? '' : ` × ${String(n).replace('.', ',')}`
}

export default function ProdutosCompradosSection({ customerId, customerName, customerPhone, businessId, onVendido }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [vendas, setVendas] = useState<Venda[] | null>(null)
  const [erro, setErro] = useState(false)
  const [pdvAberto, setPdvAberto] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('id, sale_date, total, status, sale_items(product_name, quantity)')
        .eq('business_id', businessId)
        .eq('customer_id', customerId)
        .eq('type', 'product_sale')
        .neq('status', 'cancelled')
        .order('sale_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100)
      if (!vivo) return
      setErro(!!error)
      setVendas((data ?? []) as Venda[])
    })()
    return () => { vivo = false }
  }, [supabase, businessId, customerId, reload])

  const totalGasto = (vendas ?? []).reduce((s, v) => s + Number(v.total ?? 0), 0)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
          Produtos comprados
        </p>
        <div className="flex items-center gap-2">
          {vendas && vendas.length > 0 && (
            <span className="text-[10px]" style={{ color: 'var(--admin-text-faded)' }}>
              {vendas.length} compra{vendas.length !== 1 ? 's' : ''} · {brl(totalGasto)}
            </span>
          )}
          <button
            type="button"
            onClick={() => setPdvAberto(true)}
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg"
            style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
          >
            + Vender
          </button>
        </div>
      </div>

      {vendas === null ? (
        <p className="text-xs text-center py-6 rounded-xl" style={{ color: 'var(--admin-text-faded)', background: 'var(--admin-input-bg)' }}>
          Carregando…
        </p>
      ) : erro ? (
        <p className="text-xs text-center py-6 rounded-xl" style={{ color: 'var(--admin-danger, #EF4444)', background: 'var(--admin-input-bg)' }}>
          Não foi possível carregar os produtos
        </p>
      ) : vendas.length === 0 ? (
        <p className="text-xs text-center py-6 px-4 rounded-xl" style={{ color: 'var(--admin-text-faded)', background: 'var(--admin-input-bg)' }}>
          Nenhum produto comprado ainda. Vendeu sem atendimento? Toque em + Vender e o produto fica no histórico dela.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {vendas.map((v) => {
            const itens = v.sale_items ?? []
            return (
              <li
                key={v.id}
                className="p-3 rounded-xl flex items-center gap-3"
                style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}
              >
                <p className="text-[10px] uppercase font-semibold flex-shrink-0 w-14" style={{ color: 'var(--admin-text-mute)' }}>
                  {dataBR(v.sale_date)}
                </p>
                <div className="flex-1 min-w-0">
                  {itens.length === 0 ? (
                    <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Produto</p>
                  ) : (
                    itens.map((i, idx) => (
                      <p key={idx} className="text-sm font-semibold break-words" style={{ color: 'var(--admin-text)' }}>
                        {i.product_name || 'Produto'}{qtdTexto(i.quantity)}
                      </p>
                    ))
                  )}
                  {v.status !== 'paid' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ background: '#F59E0B20', color: '#B45309' }}>
                      Pendente
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--admin-text)' }}>
                  {brl(Number(v.total ?? 0))}
                </p>
              </li>
            )
          })}
        </ul>
      )}

      <PdvModal
        open={pdvAberto}
        businessId={businessId}
        abaInicial="produtos"
        prefillCliente={{ id: customerId, name: customerName, phone: customerPhone }}
        onClose={() => setPdvAberto(false)}
        onVendido={() => {
          setReload((k) => k + 1)
          onVendido?.()
        }}
      />
    </div>
  )
}
